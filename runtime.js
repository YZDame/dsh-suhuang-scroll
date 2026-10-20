import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;

// Protocol contract version expected from the local Runtime. Equality with the
// backend's `/api/health` `protocol_version` is blocking; program versions are
// informational only (see docs/protocol-version.md).
export const EXPECTED_PROTOCOL_VERSION = 1;

// Manual-confirmation actions accepted by the Runtime's
// `POST /api/automation/manual-action` (`ManualActionRequest`). Mirrored here
// so the host bridge can validate before forwarding.
export const MANUAL_ACTIONS = Object.freeze(["submit", "pause", "stop", "retry"]);
const MANUAL_ACTION_SET = new Set(MANUAL_ACTIONS);

// How many managed-backend log lines the host facts keep.
export const BACKEND_OUTPUT_LINE_LIMIT = 20;

// Runtime endpoints the same-origin bridge may forward. The list is
// deliberately anchored (a sibling path never matches): `/readiness`,
// `/extension/status`, `/doctor` and `/automation/validate-spec` are additive
// backend routes, while `/specs/content` and `/automation/manual-action` exist
// already. A route the running backend does not implement yet answers 404 and
// every bridge caller must degrade instead of failing.
export const RUNTIME_API_PATHS = Object.freeze([
  /^\/health$/,
  /^\/doctor$/,
  /^\/readiness$/,
  /^\/extension\/status$/,
  /^\/automation\/(?:status|start|pause|resume|stop|manual-action)$/,
  /^\/automation\/validate-spec$/,
  /^\/resources$/,
  /^\/specs$/,
  /^\/specs\/content$/,
  /^\/specs\/import$/,
  /^\/provider\/(?:status|test|config)$/,
]);

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

/** Query fields `GET /api/readiness` accepts (all optional). */
const READINESS_QUERY_FIELDS = Object.freeze(["spec", "adapter", "site_host"]);

/** Build the `/readiness` request path, omitting blank query fields. */
export function buildReadinessPath(query = {}) {
  const params = new URLSearchParams();
  for (const field of READINESS_QUERY_FIELDS) {
    const value = String(query?.[field] ?? "").trim();
    if (value) params.set(field, value);
  }
  const search = params.toString();
  return search ? `/readiness?${search}` : "/readiness";
}

/**
 * Minimal structural check for `ReadinessResponse`. The plugin never parses
 * check summaries; it only needs the envelope the frozen contract guarantees.
 */
function isReadinessResponse(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof value.ready === "boolean"
    && Array.isArray(value.checks);
}

/**
 * Read the Runtime's consolidated readiness answer.
 *
 * Never throws: a backend that predates `/api/readiness` answers 404 (or 405 on
 * a method mismatch) and is reported as `supported:false` with no error, while
 * a transport failure or a malformed body is reported as `supported:false`
 * with an explanatory error so the host bridge can keep rendering host facts.
 */
export async function readRuntimeReadiness(apiBaseUrl, query = {}) {
  let body;
  try {
    body = await requestJson(apiBaseUrl, buildReadinessPath(query));
  } catch (error) {
    const status = Number(error?.status);
    if (status === 404 || status === 405) {
      return { supported: false, data: null, error: null };
    }
    return { supported: false, data: null, error: errorMessage(error) };
  }
  if (!isReadinessResponse(body)) {
    return {
      supported: false,
      data: null,
      error: "Runtime readiness response did not match the expected ReadinessResponse shape.",
    };
  }
  return { supported: true, data: body, error: null };
}

/**
 * Normalize the host-only facts the DSH plugin contributes on top of the
 * backend's readiness answer. Pure and total: missing or mistyped inputs fall
 * back to neutral values instead of throwing, because this runs on every
 * status poll even while the backend is down.
 *
 * @param {object} input - raw host facts.
 * @param {object} [input.process] - managed child snapshot (`managed`, `running`, `pid`, `error`, `output`).
 * @param {object|null} [input.launch] - resolved install (`kind`, `backendDir`, `executable`, `python`).
 * @param {object|null} [input.cors] - page-origin allowance probe (`origin`, `allowed`).
 * @param {string} [input.apiBaseUrl] - resolved Runtime API base URL.
 * @param {number} [input.port] - Runtime API port.
 * @param {string} [input.pluginVersion] - this plugin's package version.
 * @param {number} [input.expectedProtocol] - expected Runtime protocol version.
 * @param {string} [input.dshVersion] - host shell version, when known.
 */
export function buildHostFacts(input = {}) {
  const source = input !== null && typeof input === "object" ? input : {};
  const processSource = source.process !== null && typeof source.process === "object"
    ? source.process
    : {};
  const launchSource = source.launch !== null && typeof source.launch === "object"
    ? source.launch
    : null;
  const corsSource = source.cors !== null && typeof source.cors === "object"
    ? source.cors
    : null;
  const managed = processSource.managed === true;
  const pid = Number.isInteger(processSource.pid) && processSource.pid > 0
    ? processSource.pid
    : null;
  const output = Array.isArray(processSource.output)
    ? processSource.output
      .filter((line) => typeof line === "string")
      .slice(-BACKEND_OUTPUT_LINE_LIMIT)
    : [];
  const port = Number.isInteger(source.port) && source.port > 0 ? source.port : null;

  return {
    process: {
      managed,
      running: managed || processSource.running === true,
      pid,
      error: typeof processSource.error === "string" && processSource.error
        ? processSource.error
        : null,
      output: output.length > 0 ? output : null,
    },
    launch: launchSource
      ? {
        kind: launchSource.kind === "binary" ? "binary" : "python",
        backendDir: typeof launchSource.backendDir === "string" ? launchSource.backendDir : null,
        executable: typeof launchSource.executable === "string" ? launchSource.executable : null,
        python: typeof launchSource.python === "string" ? launchSource.python : null,
      }
      : null,
    cors: corsSource
      ? {
        origin: typeof corsSource.origin === "string" ? corsSource.origin : null,
        allowed: corsSource.allowed === true,
      }
      : null,
    apiBaseUrl: typeof source.apiBaseUrl === "string" && source.apiBaseUrl
      ? source.apiBaseUrl
      : null,
    port,
    host: {
      pluginVersion: typeof source.pluginVersion === "string" && source.pluginVersion
        ? source.pluginVersion
        : null,
      expectedProtocol: Number.isInteger(source.expectedProtocol)
        ? source.expectedProtocol
        : EXPECTED_PROTOCOL_VERSION,
      dshVersion: typeof source.dshVersion === "string" && source.dshVersion
        ? source.dshVersion
        : null,
    },
  };
}

// Host-only actions appended to the backend's `runtime_health` check when the
// plugin itself manages the backend process. The backend cannot know this.
const HOST_MANAGED_RUNTIME_FIXES = Object.freeze([
  { intent: "restart_runtime", label: "", params: {}, destructive: false, requires_confirmation: false },
  { intent: "stop_runtime", label: "", params: {}, destructive: true, requires_confirmation: false },
]);

function mergeRuntimeHealthCheck(check, host) {
  if (check === null || typeof check !== "object" || check.id !== "runtime_health") {
    return check;
  }
  const merged = { ...check };
  const details = check.details !== null && typeof check.details === "object" && !Array.isArray(check.details)
    ? { ...check.details }
    : {};
  details.host = { process: host.process, launch: host.launch };
  merged.details = details;
  if (host.process.managed) {
    const fixes = Array.isArray(check.fixes) ? [...check.fixes] : [];
    for (const fix of HOST_MANAGED_RUNTIME_FIXES) {
      const present = fixes.some((candidate) => candidate !== null
        && typeof candidate === "object"
        && candidate.intent === fix.intent);
      if (!present) fixes.push({ ...fix });
    }
    merged.fixes = fixes;
  }
  return merged;
}

/**
 * Merge a `readRuntimeReadiness` transport result with host facts.
 *
 * Pure and total: the result always has the frozen
 * `{supported, data|null, error|null}` shape, and a backend that is down, old,
 * or malformed only produces `data:null` — it never throws. On success `data`
 * is the backend `ReadinessResponse` plus a `host` section and the host-only
 * `runtime_health` fixes/details.
 */
export function mergeReadiness(readiness, hostFacts = {}) {
  const host = buildHostFacts(hostFacts);
  const result = readiness !== null && typeof readiness === "object" ? readiness : {};
  const payload = result.data;
  if (result.supported !== true || !isReadinessResponse(payload)) {
    const error = typeof result.error === "string" && result.error
      ? result.error
      : result.supported === true
        ? "Runtime readiness response did not match the expected ReadinessResponse shape."
        : null;
    return { supported: false, data: null, error };
  }
  return {
    supported: true,
    error: null,
    data: {
      ...payload,
      host,
      checks: payload.checks.map((check) => mergeRuntimeHealthCheck(check, host)),
    },
  };
}

/**
 * Validate one manual-confirmation action against the Runtime's allow-list.
 * Case-sensitive on purpose: the backend's `ManualActionRequest.action` is a
 * `Literal`, so forwarding anything else would only fail upstream.
 */
export function normalizeManualAction(value) {
  const action = String(value ?? "").trim();
  if (!MANUAL_ACTION_SET.has(action)) {
    throw new Error(
      `Unsupported manual action: ${action || "(empty)"}. Expected one of: ${MANUAL_ACTIONS.join(", ")}.`,
    );
  }
  return action;
}

/** Whether a Runtime path may be forwarded through the same-origin bridge. */
export function isAllowedRuntimeApiPath(pathname) {
  const value = String(pathname ?? "");
  return RUNTIME_API_PATHS.some((pattern) => pattern.test(value));
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
    // `auto_submit` is the default (matches the backend's `dev:false`); only an
    // explicit manual selection flips the start payload into confirmation mode.
    submitMode: value.submitMode === "manual_confirm" ? "manual_confirm" : "auto_submit",
  };
}

export function effectiveDefaultSpec(settings, specs = []) {
  return settings.defaultSpec || specs[0]?.value || "";
}

export function createStartPayload(settings, specs = []) {
  const normalized = normalizeSettings(settings);
  // Keep the payload builder loopback-only even when it is called outside the
  // settings bridge (CLI command path).
  resolveApiBaseUrl(normalized.apiBaseUrl);
  const specPath = effectiveDefaultSpec(normalized, specs);
  if (!specPath) {
    throw new Error("没有可用的评分标准，请先在设置里选择。");
  }
  const payload = {
    spec_path: specPath,
    // Backend contract: `dev:true` = manual confirmation before submit.
    dev: normalized.submitMode === "manual_confirm",
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
