import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function pythonBackend(directory, exists) {
  return exists(join(directory, "main.py"))
    ? { kind: "python", backendDir: directory }
    : null;
}

function packagedBackend(root, exists, platform) {
  const filename = platform === "win32" ? "suhuang-backend.exe" : "suhuang-backend";
  const executable = join(root, "bin", filename);
  return exists(executable)
    ? { kind: "binary", backendDir: root, executable }
    : null;
}

/**
 * Locate a runnable Suhuang backend without assuming that this DSH package is
 * still inside the source monorepo. Explicit configuration wins, followed by
 * the source checkout and the ordinary per-user Runtime installation.
 */
export function resolveBackendLaunch(value, options = {}) {
  const pluginDir = options.pluginDir ?? process.cwd();
  const userHome = options.homeDir ?? homedir();
  const exists = options.exists ?? existsSync;
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const configured = String(value ?? "").trim();

  if (configured) {
    const target = isAbsolute(configured) ? configured : resolve(pluginDir, configured);
    return pythonBackend(target, exists)
      ?? pythonBackend(join(target, "core", "python"), exists)
      ?? packagedBackend(target, exists, platform);
  }

  const repoRoot = resolve(pluginDir, "..", "..");
  const sourceBackend = pythonBackend(join(repoRoot, "core", "python"), exists);
  if (sourceBackend) return sourceBackend;

  if (platform === "win32" && env.LOCALAPPDATA) {
    const windowsBackend = packagedBackend(join(env.LOCALAPPDATA, "Suhuang Scroll"), exists, platform);
    if (windowsBackend) return windowsBackend;
  }

  const installRoot = join(userHome, ".local", "suhuang-scroll");
  return packagedBackend(installRoot, exists, platform)
    ?? pythonBackend(join(installRoot, "core", "python"), exists);
}

export function backendLaunchLabel(launch) {
  if (!launch) return "";
  return launch.kind === "binary" ? launch.executable : launch.backendDir;
}

export function resolveApiBaseUrl(value) {
  const candidate = String(value ?? DEFAULT_API_BASE_URL).trim() || DEFAULT_API_BASE_URL;
  const url = new URL(candidate);
  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    throw new Error("Suhuang Scroll API must use http or https.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Suhuang Scroll API URL must not contain credentials, query, or hash data.");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("Suhuang Scroll API must point to a loopback host.");
  }
  return url.toString().replace(/\/$/, "");
}

export function resolveApiPort(value) {
  try {
    const port = Number(new URL(resolveApiBaseUrl(value)).port);
    return Number.isInteger(port) && port > 0 ? port : 8000;
  } catch {
    return 8000;
  }
}

function timeoutSignal() {
  return globalThis.AbortSignal?.timeout?.(5000);
}

export async function requestJson(apiBaseUrl, path, init = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? timeoutSignal(),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === "string" ? body.detail : `HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function readRuntimeStatus(apiBaseUrl) {
  const [health, automation] = await Promise.all([
    requestJson(apiBaseUrl, "/health"),
    requestJson(apiBaseUrl, "/automation/status"),
  ]);
  return { health, automation };
}

export async function readRuntimeResources(apiBaseUrl) {
  return requestJson(apiBaseUrl, "/resources");
}

export async function readRuntimeSpecs(apiBaseUrl) {
  return requestJson(apiBaseUrl, "/specs");
}

export async function readRuntimeCatalog(apiBaseUrl) {
  const [resources, specs] = await Promise.all([
    readRuntimeResources(apiBaseUrl),
    readRuntimeSpecs(apiBaseUrl),
  ]);
  return { resources, specs };
}

export function normalizeSettings(value = {}) {
  const threshold = Number(value.confidenceThreshold);
  return {
    apiBaseUrl: String(value.apiBaseUrl ?? DEFAULT_API_BASE_URL).trim() || DEFAULT_API_BASE_URL,
    backendDir: String(value.backendDir ?? "").trim(),
    defaultSpec: String(value.defaultSpec ?? "").trim(),
    adapter: String(value.adapter ?? "").trim(),
    provider: String(value.provider ?? "").trim(),
    model: String(value.model ?? "").trim(),
    confidenceThreshold: Number.isFinite(threshold)
      ? Math.min(1, Math.max(0, threshold))
      : DEFAULT_CONFIDENCE_THRESHOLD,
  };
}

export function effectiveDefaultSpec(settings, specs = []) {
  return settings.defaultSpec || specs[0]?.value || "";
}

export function createStartPayload(settings, specs = []) {
  const normalized = normalizeSettings(settings);
  const specPath = effectiveDefaultSpec(normalized, specs);
  if (!specPath) {
    throw new Error("没有可用的评分标准，请先在设置里选择。");
  }
  const payload = {
    spec_path: specPath,
    dev: false,
    confidence_threshold: normalized.confidenceThreshold,
  };
  if (normalized.adapter) payload.adapter = normalized.adapter;
  if (normalized.provider) payload.provider = normalized.provider;
  if (normalized.model) payload.model = normalized.model;
  return payload;
}

export function safeBasename(value) {
  const pieces = String(value ?? "").split(/[\\/]/);
  return pieces.at(-1) || "未指定";
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function formatStatusText(health, automation) {
  const run = automation?.run;
  const lines = [
    `Runtime: ${health?.status ?? "unknown"} (protocol ${health?.protocol_version ?? "?"})`,
    `Automation: ${run?.state ?? "idle"}`,
  ];
  if (run) {
    lines.push(`Adapter: ${run.adapter}`, `Completed: ${run.completed_count}`);
    if (run.pending_decision) lines.push("Pending decision: operator confirmation required");
  }
  return lines.join(" | ");
}
