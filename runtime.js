export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

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
