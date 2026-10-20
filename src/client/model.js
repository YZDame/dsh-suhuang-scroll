// Pure view-model helpers for the Suhuang Scroll DSH console.
//
// Nothing here touches React, the DOM, or the network: the components render
// these derived values and the store owns I/O. Keeping the state machine pure is
// what makes `test/console-model.test.js` possible without a live host.

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;
export const EXPECTED_PROTOCOL_VERSION = 1;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

/** States in which the backend is actively working through the queue. */
export const RUNNING_STATES = new Set([
  "starting",
  "capturing",
  "grading",
  "submitting",
  "waiting_next_page",
]);

/** States that keep the run "active" for control purposes. */
export const ACTIVE_STATES = new Set([...RUNNING_STATES, "paused", "awaiting_confirmation", "error"]);

export const END_OF_QUEUE = "end_of_queue";

const CHECK_GROUPS = [
  { id: "runtime", ids: ["runtime_health", "runtime_protocol"], labelKey: "checkRuntime" },
  { id: "extension", ids: ["extension_connected", "extension_version", "extension_consent"], labelKey: "checkExtension" },
  { id: "model", ids: ["model_config"], labelKey: "checkModel" },
  { id: "spec", ids: ["spec_available"], labelKey: "checkSpec" },
  { id: "adapter", ids: ["adapter_registry", "site_adapter"], labelKey: "checkAdapter" },
];

const STATUS_RANK = { ok: 0, info: 1, unknown: 2, warn: 3, fail: 4 };

export function worstStatus(statuses) {
  let worst = "ok";
  for (const status of statuses) {
    if ((STATUS_RANK[status] ?? 0) > (STATUS_RANK[worst] ?? 0)) worst = status;
  }
  return worst;
}

/**
 * Resolve the Runtime API base URL. Only loopback HTTP(S) origins are allowed:
 * the plugin and the runtime live on the same machine, and a remote URL would
 * ship grading traffic to a third party.
 */
export function resolveApiBaseUrl(value) {
  const candidate = String(value ?? DEFAULT_API_BASE_URL).trim() || DEFAULT_API_BASE_URL;
  const url = new URL(candidate);
  if (!HTTP_PROTOCOLS.has(url.protocol)) throw new Error("API_INVALID_PROTOCOL");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API_INVALID_CREDENTIALS");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("API_INVALID_LOOPBACK");
  }
  return url.toString().replace(/\/$/, "");
}

/** Project any settings snapshot onto the complete, typed settings shape. */
export function normalizeSettings(value = {}) {
  const threshold = Number(value.confidenceThreshold);
  return {
    apiBaseUrl: String(value.apiBaseUrl ?? DEFAULT_API_BASE_URL).trim() || DEFAULT_API_BASE_URL,
    backendDir: String(value.backendDir ?? "").trim(),
    defaultSpec: String(value.defaultSpec ?? "").trim(),
    adapter: String(value.adapter ?? "").trim(),
    provider: String(value.provider ?? "").trim(),
    model: String(value.model ?? "").trim(),
    submitMode: value.submitMode === "manual_confirm" ? "manual_confirm" : "auto_submit",
    confidenceThreshold: Number.isFinite(threshold)
      ? Math.min(1, Math.max(0, threshold))
      : DEFAULT_CONFIDENCE_THRESHOLD,
  };
}

export function effectiveDefaultSpec(settings, specs = []) {
  return settings.defaultSpec || specs[0]?.value || "";
}

/** Build the `/api/automation/start` payload from console settings. */
export function createStartPayload(settings, specs = []) {
  const normalized = normalizeSettings(settings);
  const specPath = effectiveDefaultSpec(normalized, specs);
  if (!specPath) throw new Error("NO_SPEC");
  const payload = {
    spec_path: specPath,
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
  return pieces.at(-1) || "—";
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function friendlyErrorMessage(error, t) {
  const message = errorMessage(error);
  if (/failed to fetch|fetch failed|networkerror|load failed/i.test(message)) return t("connectionFailed");
  if (/aborted|timeout|timed out/i.test(message)) return t("requestTimeout");
  return message;
}

export function friendlyProviderMessage(message, t) {
  if (/api key is empty/i.test(message)) return t("modelApiKeyRequired");
  const httpStatus = String(message).match(/HTTP\s+(401|403)/i)?.[1];
  if (httpStatus) return t("modelAuthFailed", { status: httpStatus });
  if (/timed out|timeout/i.test(message)) return t("modelTimeout");
  return message;
}

/** Compact duration used across the console: 0s, 47s, 6m 12s, 1h 04m. */
export function formatDuration(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function runMetrics(run) {
  const completed = Number(run?.completed_count ?? 0);
  const warnings = Number(run?.warning_count ?? 0);
  const elapsed = Number(run?.elapsed_seconds ?? 0);
  const paused = Number(run?.paused_seconds ?? 0);
  const average = completed > 0 && elapsed > 0 ? Math.max(1, Math.round(elapsed / completed)) : null;
  return { completed, warnings, elapsed, paused, average };
}

/**
 * Paper trail for the run panel. The backend exposes no queue total, so the
 * console never claims a percentage: it shows the papers already graded, the
 * paper currently in flight, and an overflow marker instead of a fake total.
 */
export function paperTrail(run, max = 40) {
  const completed = Number(run?.completed_count ?? 0);
  const index = Number.isInteger(run?.current_page_context?.paperIndex)
    ? Number(run.current_page_context.paperIndex)
    : null;
  const segments = [];
  const shown = Math.min(completed, max);
  for (let i = 0; i < shown; i += 1) segments.push({ key: `done-${i}`, state: "done" });
  if (completed > max) segments.push({ key: "overflow", state: "overflow", count: completed - max });
  const active = RUNNING_STATES.has(run?.state) || run?.state === "paused";
  if (active) {
    // The marker always trails the papers already graded: the backend exposes no
    // total, so the strip never positions itself on a guessed queue length.
    segments.push({ key: "active", state: "active" });
  }
  return segments;
}

export function currentPaperNumber(run) {
  const index = run?.current_page_context?.paperIndex;
  if (Number.isInteger(index)) return Number(index) + 1;
  const completed = Number(run?.completed_count ?? 0);
  return completed > 0 ? completed + 1 : null;
}

/**
 * Coarse console phase, shared by every surface.
 * offline: runtime bridge unreachable or runtime process not answering.
 * setup:   runtime answers but at least one blocking prerequisite fails.
 * ready:   runtime answers, no run, every blocking prerequisite passes.
 * running/pausing/paused/awaiting/error/completed/ended mirror the backend run.
 */
export function derivePhase(host, readiness) {
  if (!host || !host.health) return "offline";
  const state = host.automation?.run?.state ?? "idle";
  const run = host.automation?.run;
  if (state === "starting") return "starting";
  if (RUNNING_STATES.has(state)) {
    return host.automation?.run?.pause_requested ? "pausing" : "running";
  }
  if (state === "paused") return "paused";
  if (state === "awaiting_confirmation") return "awaiting";
  if (state === "error") return "error";
  if (state === "stopped") {
    return run?.pause_reason === END_OF_QUEUE ? "completed" : "ended";
  }
  return readiness?.ready === false ? "setup" : "ready";
}

export function isRunActive(phase) {
  return ["starting", "running", "pausing", "paused", "awaiting", "error"].includes(phase);
}

function normalizeFix(fix) {
  return {
    intent: String(fix?.intent ?? ""),
    label: String(fix?.label ?? ""),
    params: fix?.params && typeof fix.params === "object" ? fix.params : {},
    destructive: fix?.destructive === true,
    requiresConfirmation: fix?.requires_confirmation === true,
  };
}

function mergeGroupChecks(checks, group) {
  const matched = checks.filter((check) => group.ids.includes(String(check?.id)));
  if (matched.length === 0) {
    return {
      id: group.id,
      labelKey: group.labelKey,
      status: "unknown",
      blocking: false,
      summary: "",
      details: {},
      fixes: [],
    };
  }
  let status = worstStatus(matched.map((check) => String(check?.status ?? "unknown")));
  if (status === "unknown" && matched.some((check) => check?.status === "ok")) {
    status = "ok";
  }
  const blocking = matched.some((check) => check?.status === "fail" && check?.blocking === true);
  const primary = matched.find((check) => String(check.status) !== "ok") ?? matched[0];
  const fixes = [];
  const seen = new Set();
  for (const check of matched) {
    for (const fix of check?.fixes ?? []) {
      const normalized = normalizeFix(fix);
      if (!normalized.intent || seen.has(normalized.intent)) continue;
      seen.add(normalized.intent);
      fixes.push(normalized);
    }
  }
  const details = {};
  for (const check of matched) {
    if (check?.details && typeof check.details === "object") Object.assign(details, check.details);
  }
  return {
    id: group.id,
    labelKey: group.labelKey,
    status,
    blocking,
    summary: typeof primary?.summary === "string" ? primary.summary : "",
    details,
    fixes,
  };
}

/**
 * Fold the frozen `/api/readiness` checks into the console's five rows.
 * Older runtimes do not answer `/api/readiness` at all: in that case the rows
 * are derived from the data the plugin host already has, and the extension row
 * honestly reports `unknown` instead of pretending to be connected.
 */
export function deriveReadiness(host) {
  const payload = host?.readiness;
  const supported = payload?.supported === true && payload?.data && Array.isArray(payload.data.checks);
  if (supported) {
    const rows = CHECK_GROUPS.map((group) => mergeGroupChecks(payload.data.checks, group));
    const blockingCount = rows.filter((row) => row.blocking).length;
    return {
      supported: true,
      rows,
      blockingCount,
      ready: payload.data.ready === true && blockingCount === 0,
      generatedAt: payload.data.generated_at ?? null,
      error: null,
    };
  }

  const health = host?.health ?? null;
  const automation = host?.automation ?? null;
  const catalog = host?.fallbackCatalog ?? null;
  const specs = Array.isArray(catalog?.specs) ? catalog.specs : [];
  const adapters = Array.isArray(catalog?.resources?.adapters) ? catalog.resources.adapters : [];
  const provider = catalog?.provider ?? null;
  const runtimeRunning = Boolean(health);
  const protocol = health?.protocol_version;
  const protocolCompatible = !Number.isInteger(protocol) || protocol === EXPECTED_PROTOCOL_VERSION;
  const rows = [
    {
      id: "runtime",
      labelKey: "checkRuntime",
      status: runtimeRunning ? (protocolCompatible ? "ok" : "warn") : "fail",
      blocking: !runtimeRunning,
      summary: "",
      details: { version: health?.version, protocol_version: protocol },
      fixes: runtimeRunning ? [] : [{ intent: "start_runtime", label: "", params: {}, destructive: false, requiresConfirmation: false }],
    },
    {
      id: "extension",
      labelKey: "checkExtension",
      status: "unknown",
      blocking: false,
      summary: "",
      details: {},
      fixes: [],
    },
    {
      id: "model",
      labelKey: "checkModel",
      status: provider ? (provider.api_key_configured ? "ok" : "fail") : "unknown",
      blocking: Boolean(provider && !provider.api_key_configured),
      summary: "",
      details: {
        provider: provider?.provider,
        model: provider?.model,
        base_url: provider?.base_url,
        api_key_configured: provider?.api_key_configured,
      },
      fixes: provider && !provider.api_key_configured
        ? [{ intent: "open_model_settings", label: "", params: {}, destructive: false, requiresConfirmation: false }]
        : [],
    },
    {
      id: "spec",
      labelKey: "checkSpec",
      status: specs.length > 0 ? "ok" : "fail",
      blocking: specs.length === 0,
      summary: "",
      details: { count: specs.length, names: specs.map((spec) => spec?.label ?? spec?.value).filter(Boolean) },
      fixes: specs.length > 0
        ? []
        : [{ intent: "import_spec", label: "", params: {}, destructive: false, requiresConfirmation: false }],
    },
    {
      id: "adapter",
      labelKey: "checkAdapter",
      status: adapters.length > 0 ? "ok" : "warn",
      blocking: false,
      summary: "",
      details: { enabled: adapters.map((adapter) => adapter?.label ?? adapter?.value).filter(Boolean) },
      fixes: [],
    },
  ];
  const blockingCount = rows.filter((row) => row.blocking).length;
  return {
    supported: false,
    rows,
    blockingCount,
    ready: runtimeRunning && blockingCount === 0,
    generatedAt: null,
    error: payload?.error ?? null,
    automation,
  };
}

export function rowHasFail(row) {
  return row.status === "fail";
}

function normalizeReviewFlag(flag) {
  if (typeof flag === "string") return { code: flag, message: flag, severity: "warning" };
  if (!flag || typeof flag !== "object") return null;
  const message = typeof flag.message === "string" && flag.message ? flag.message : String(flag.code ?? "");
  return {
    code: typeof flag.code === "string" ? flag.code : "",
    message,
    severity: flag.severity === "info" ? "info" : "warning",
  };
}

/** Latest record summary for the after-run panel. */
export function lastRecordSummary(run) {
  const record = run?.last_record;
  if (!record) return null;
  return {
    score: typeof record.suggested_score === "number" ? record.suggested_score : null,
    confidence: typeof record.confidence === "number" ? record.confidence : null,
    status: typeof record.status === "string" ? record.status : "",
    flags: Array.isArray(record.review_flags) ? record.review_flags.map(normalizeReviewFlag).filter(Boolean) : [],
  };
}

/** Pending manual-confirmation decision (manual_confirm submit mode only). */
export function pendingDecision(run) {
  const pending = run?.pending_decision;
  if (!pending) return null;
  return {
    score: typeof pending.suggested_score === "number" ? pending.suggested_score : null,
    confidence: typeof pending.confidence === "number" ? pending.confidence : null,
    flags: Array.isArray(pending.review_flags) ? pending.review_flags.map(normalizeReviewFlag).filter(Boolean) : [],
    ocrText: typeof pending.ocr_text === "string" ? pending.ocr_text : "",
    batchScores: pending.batch_scores && typeof pending.batch_scores === "object" ? pending.batch_scores : {},
  };
}

/** State copy keys rendered by the run panel. */
export function runCopyKey(phase) {
  switch (phase) {
    case "starting":
      return "serviceConnecting";
    case "running":
      return "gradingTitle";
    case "pausing":
      return "pausingTitle";
    case "paused":
      return "pausedTitle";
    case "awaiting":
      return "awaitingTitle";
    case "error":
      return "errorTitle";
    case "completed":
      return "completedTitle";
    case "ended":
      return "stoppedTitle";
    default:
      return "readyTitle";
  }
}

export function runStageLabel(run, t) {
  const state = run?.state ?? "idle";
  const key = `state_${state}`;
  const translated = t(key);
  return translated && translated !== key ? translated : state;
}

export function settingsFromBridge(snapshot) {
  return normalizeSettings(snapshot?.value ?? {});
}
