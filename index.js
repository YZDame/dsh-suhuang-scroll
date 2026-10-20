import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import z from "@deepseek-ai/schemastery";

import {
  DEFAULT_API_BASE_URL,
  DEFAULT_CONFIDENCE_THRESHOLD,
  EXPECTED_PROTOCOL_VERSION,
  buildHostFacts,
  createStartPayload,
  errorMessage,
  formatStatusText,
  isAllowedRuntimeApiPath,
  mergeReadiness,
  normalizeManualAction,
  normalizeSettings,
  readRuntimeReadiness,
  readRuntimeSpecs,
  readRuntimeStatus,
  requestJson,
  resolveBackendLaunch,
  resolveApiBaseUrl,
  resolveApiPort,
} from "./runtime.js";

// DSH identifies an editable settings form by the profile entry id, so the id
// declared in cordis.patch.yml is the settings key.
const SETTINGS_NAMESPACE = "suhuang-scroll";

// Fields the settings page may edit. `.volatile()` marks each field as a live
// configuration reference: `config.<field>.get()` always returns the current
// value, and the DSH settings service can persist edits into the profile patch.
export const Config = z.object({
  apiBaseUrl: z.string().default(DEFAULT_API_BASE_URL).volatile(),
  backendDir: z.string().default("").volatile(),
  defaultSpec: z.string().default("").volatile(),
  adapter: z.string().default("").volatile(),
  provider: z.string().default("").volatile(),
  model: z.string().default("").volatile(),
  confidenceThreshold: z.number().step(0.01).min(0).max(1).default(DEFAULT_CONFIDENCE_THRESHOLD).volatile(),
  // Auto-submit by default; `manual_confirm` makes the start payload set
  // `dev:true` so the Runtime asks the operator before writing a score.
  submitMode: z.union([z.const("auto_submit"), z.const("manual_confirm")]).default("auto_submit").volatile(),
});

export const name = "suhuang-scroll";
export const inject = ["commands", "webServer"];

const SETTINGS_FIELDS = new Set([
  "apiBaseUrl",
  "backendDir",
  "defaultSpec",
  "adapter",
  "provider",
  "model",
  "confidenceThreshold",
  "submitMode",
]);

/**
 * Read one live configuration field. Volatile fields arrive as reference
 * objects; a static row config still arrives as a plain value.
 */
function fieldValue(field) {
  if (field !== null && typeof field === "object" && typeof field.get === "function") {
    return field.get();
  }
  return field;
}

/** Project the live plugin config onto the plain settings shape. */
function readConfigSettings(config = {}) {
  const plain = {};
  for (const field of SETTINGS_FIELDS) plain[field] = fieldValue(config[field]);
  return normalizeSettings(plain);
}

// Directory of this plugin source (index.js), used to locate both source
// checkouts and explicitly configured relative backend paths.
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));

// Version of this plugin package, reported as a host fact so the console can
// show the installed build. A missing/unparsable manifest must not break the
// plugin, so the fallback is `null` rather than an exception.
function readPluginVersion() {
  try {
    const manifest = JSON.parse(readFileSync(join(PLUGIN_DIR, "package.json"), "utf8"));
    return typeof manifest.version === "string" && manifest.version ? manifest.version : null;
  } catch {
    return null;
  }
}

const PLUGIN_VERSION = readPluginVersion();

// The desktop shell exports its build version; ordinary `dsh web` may not.
const DSH_VERSION = typeof process.env.DSH_CLIENT_VERSION === "string" && process.env.DSH_CLIENT_VERSION
  ? process.env.DSH_CLIENT_VERSION
  : null;

// Base CORS allow-list applied to a backend we spawn ourselves. This must stay
// in sync with core/python/utils/config.py defaults so the DSH Web origin is
// always allowed regardless of the harness port. The requesting Origin is
// appended on top at start time.
const BASE_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3080",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:43120",
  "http://localhost:43120",
  "http://tauri.localhost",
  "tauri://localhost",
];

let backendChild = null;
let backendLastError = null;
// Last lines the managed backend printed, kept for the connection-details view.
const backendOutput = [];
const BACKEND_OUTPUT_LINES = 20;

function rememberBackendOutput(chunk) {
  for (const line of String(chunk).split(/\r?\n/)) {
    const text = line.trim();
    if (text) backendOutput.push(text);
  }
  if (backendOutput.length > BACKEND_OUTPUT_LINES) {
    backendOutput.splice(0, backendOutput.length - BACKEND_OUTPUT_LINES);
  }
}

function resolvePythonInterpreter(backendDir) {
  const venv = join(backendDir, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return process.env.SUHUANG_PYTHON || "python3";
}

function isChildAlive() {
  return backendChild !== null && backendChild.exitCode === null && backendChild.signalCode === null;
}

/**
 * Build the backend's CORS allow-list. The DSH web server's own origin is
 * derived from the live server rather than from a request header: a start
 * request may arrive without an Origin, and a missing entry silently breaks
 * every browser call to the Runtime API.
 */
function buildAllowedOrigins(webServer, origin) {
  const seen = new Set(BASE_ALLOWED_ORIGINS);
  const port = Number(webServer?.port);
  if (Number.isInteger(port) && port > 0) {
    seen.add(`http://127.0.0.1:${port}`);
    seen.add(`http://localhost:${port}`);
  }
  if (origin) seen.add(origin);
  return [...seen].join(",");
}

/** Check whether the running backend answers this page's origin with CORS headers. */
async function probeOriginAllowance(apiBaseUrl, origin) {
  if (!origin) return undefined;
  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      headers: { origin, accept: "application/json" },
      signal: globalThis.AbortSignal?.timeout?.(4000),
    });
    const allowed = response.headers.get("access-control-allow-origin");
    return { origin, allowed: allowed === origin || allowed === "*" };
  } catch {
    return { origin, allowed: false };
  }
}

async function probeHealth(apiBaseUrl) {
  try {
    const { health, automation } = await readRuntimeStatus(apiBaseUrl);
    return { health, automation };
  } catch {
    return null;
  }
}

async function waitForHealth(apiBaseUrl, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const probe = await probeHealth(apiBaseUrl);
    if (probe) return probe;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  return null;
}

function runtimeProcessStatus() {
  const managed = isChildAlive();
  return {
    managed,
    running: managed,
    pid: managed && backendChild.pid ? backendChild.pid : null,
    error: backendLastError || undefined,
    output: backendOutput.length > 0 ? [...backendOutput] : undefined,
  };
}

async function startRuntimeProcess(currentSettings, origin, webServer) {
  backendLastError = null;
  if (isChildAlive()) return { started: true, alreadyManaged: true };
  const apiBaseUrl = resolveApiBaseUrl(currentSettings.apiBaseUrl);
  const existing = await probeHealth(apiBaseUrl);
  if (existing) {
    return { started: false, alreadyExternal: true, ...existing };
  }
  const launch = resolveBackendLaunch(currentSettings.backendDir, { pluginDir: PLUGIN_DIR });
  if (!launch) {
    throw new Error("未找到苏黄共阅 Runtime。请先安装 Runtime，或在设置中配置“后端所在文件夹”。");
  }
  const port = resolveApiPort(currentSettings.apiBaseUrl);
  const env = {
    ...process.env,
    API_PORT: String(port),
    SUHUANG_API_HOST: "127.0.0.1",
    ALLOWED_ORIGINS: buildAllowedOrigins(webServer, origin),
  };
  const command = launch.kind === "binary" ? launch.executable : resolvePythonInterpreter(launch.backendDir);
  const args = launch.kind === "binary" ? [] : ["backend_launcher.py"];
  backendOutput.length = 0;
  const child = spawn(command, args, {
    cwd: launch.kind === "binary" ? dirname(launch.executable) : launch.backendDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Read both pipes: an unread pipe can fill and wedge the backend.
  child.stdout?.on("data", rememberBackendOutput);
  child.stderr?.on("data", rememberBackendOutput);
  child.on("error", (cause) => {
    backendLastError = errorMessage(cause);
    backendChild = null;
  });
  child.on("spawn", () => {
    backendLastError = null;
  });
  child.on("exit", () => {
    backendChild = null;
  });
  backendChild = child;
  const probe = await waitForHealth(apiBaseUrl);
  if (!probe) {
    backendLastError = "后端进程已启动，但健康检查超时。请检查 Runtime 安装与端口占用。";
    return { started: true, health: null };
  }
  return { started: true, ...probe };
}

async function stopRuntimeProcess() {
  if (!isChildAlive()) {
    return { stopped: true, alreadyStopped: true };
  }
  const child = backendChild;
  const timeout = new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
  child.kill("SIGTERM");
  await timeout;
  if (isChildAlive()) {
    child.kill("SIGKILL");
  }
  backendChild = null;
  return { stopped: true };
}

/** Read the optional readiness query overrides off the bridge request URL. */
function readinessQuery(request, current) {
  let spec = current.defaultSpec;
  let adapter = current.adapter;
  let siteHost = "";
  try {
    const url = new URL(String(request.url ?? ""), "http://bridge.invalid");
    spec = url.searchParams.get("spec") ?? spec;
    adapter = url.searchParams.get("adapter") ?? adapter;
    siteHost = url.searchParams.get("site_host") ?? siteHost;
  } catch {
    // A malformed bridge URL only means "no query overrides".
  }
  return { spec, adapter, site_host: siteHost };
}

/**
 * One consolidated host answer for the console. Host-only facts are always
 * present, even while the Runtime is unreachable; the readiness field degrades
 * to `{supported:false,data:null,error:null}` instead of failing the request,
 * so a down/old backend can never turn this bridge into a 500.
 */
async function runtimeBridgeState(getCurrentSettings, request) {
  const current = getCurrentSettings();
  const apiBaseUrl = resolveApiBaseUrl(current.apiBaseUrl);
  const origin = String(request.headers?.origin ?? "").trim() || undefined;
  // Health/automation and the consolidated readiness answer ride one round
  // trip: the console polls this bridge every few seconds and a down backend
  // must not stack timeouts serially.
  const [probe, readinessTransport] = await Promise.all([
    probeHealth(apiBaseUrl),
    readRuntimeReadiness(apiBaseUrl, readinessQuery(request, current)),
  ]);
  const launch = resolveBackendLaunch(current.backendDir, { pluginDir: PLUGIN_DIR });
  const python = launch?.kind === "python" ? resolvePythonInterpreter(launch.backendDir) : null;
  const hostFacts = buildHostFacts({
    process: runtimeProcessStatus(),
    launch: launch ? { ...launch, python } : null,
    cors: probe ? await probeOriginAllowance(apiBaseUrl, origin) : null,
    apiBaseUrl,
    port: resolveApiPort(current.apiBaseUrl),
    pluginVersion: PLUGIN_VERSION,
    expectedProtocol: EXPECTED_PROTOCOL_VERSION,
    dshVersion: DSH_VERSION,
  });
  const readiness = mergeReadiness(readinessTransport, hostFacts);
  return {
    ok: true,
    apiBaseUrl,
    port: hostFacts.port,
    origin,
    process: hostFacts.process,
    launch: hostFacts.launch,
    cors: hostFacts.cors,
    host: hostFacts.host,
    readiness,
    health: probe?.health ?? null,
    automation: probe?.automation ?? null,
  };
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("Settings request is too large.");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  const value = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Settings request must be a JSON object.");
  }
  return value;
}

// Runtime endpoints this plugin forwards for the page. The canonical
// allow-list lives in runtime.js (`RUNTIME_API_PATHS`) so it is unit-testable
// without loading this host module; a route the running backend does not
// implement yet simply relays an upstream 404. The Runtime API is a different
// origin from the DSH client, so the browser enforces CORS on every direct
// call; forwarding through this same-origin bridge keeps the console working
// even when the running backend was started with an older allow-list.

async function handleRuntimeApiBridge(request, response, currentSettings) {
  if (!isLoopbackRequest(request)) {
    writeJson(response, 403, { ok: false, error: "Runtime API bridge is loopback-only." });
    return;
  }
  if (request.method !== "POST") {
    writeJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }
  try {
    const body = await readJsonBody(request);
    const requested = new URL(String(body.path ?? ""), "http://runtime.invalid");
    if (!isAllowedRuntimeApiPath(requested.pathname)) {
      throw new Error(`Unsupported runtime path: ${requested.pathname}`);
    }
    const method = String(body.method ?? "GET").toUpperCase();
    if (!["GET", "POST", "PUT"].includes(method)) throw new Error(`Unsupported method: ${method}`);
    const base = resolveApiBaseUrl(body.apiBaseUrl ?? currentSettings().apiBaseUrl);
    const upstream = await fetch(`${base}${requested.pathname}${requested.search}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body.body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body.body === undefined ? undefined : JSON.stringify(body.body),
      signal: globalThis.AbortSignal?.timeout?.(30000),
    });
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!upstream.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : `HTTP ${upstream.status}`;
      writeJson(response, 200, { ok: false, status: upstream.status, error: detail });
      return;
    }
    writeJson(response, 200, { ok: true, data });
  } catch (error) {
    writeJson(response, 400, { ok: false, error: errorMessage(error) });
  }
}

function isLoopbackRequest(request) {
  const authority = String(request.headers?.host ?? "").trim().toLowerCase();
  if (authority.startsWith("[")) {
    return authority.startsWith("[::1]") && (/^\[::1\](?::\d+)?$/.test(authority));
  }
  const host = authority.replace(/:\d+$/, "");
  return host === "localhost" || host === "127.0.0.1";
}

function settingsView(settingsContext, fallbackValue) {
  if (settingsContext === undefined) {
    return {
      status: "unavailable",
      value: fallbackValue,
      base: {},
      user: {},
      revision: undefined,
      writable: false,
    };
  }
  try {
    const descriptor = settingsContext.settings
      .describe({ redactSecrets: true })
      .find((candidate) => String(candidate.ns) === String(SETTINGS_NAMESPACE));
    if (descriptor === undefined) {
      return {
        status: "unavailable",
        value: fallbackValue,
        base: {},
        user: {},
        revision: undefined,
        writable: Boolean(settingsContext.settings.writable),
      };
    }
    return {
      status: "ready",
      value: normalizeSettings(descriptor.value),
      base: descriptor.base ?? {},
      user: descriptor.user ?? {},
      revision: descriptor.revision,
      writable: Boolean(settingsContext.settings.writable),
    };
  } catch (error) {
    return {
      status: "unavailable",
      value: fallbackValue,
      base: {},
      user: {},
      revision: undefined,
      writable: false,
      error: errorMessage(error),
    };
  }
}

function settingPatch(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Settings patch must be a JSON object.");
  }
  const patch = {};
  for (const [field, fieldValue] of Object.entries(value)) {
    if (SETTINGS_FIELDS.has(field)) patch[field] = fieldValue;
  }
  return patch;
}

async function handleSettingsBridge(request, response, state) {
  if (!isLoopbackRequest(request)) {
    writeJson(response, 403, { ok: false, error: "Settings bridge is loopback-only." });
    return;
  }
  if (request.method === "GET") {
    writeJson(response, 200, state.view());
    return;
  }
  if (request.method !== "POST") {
    writeJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }
  try {
    if (state.settingsContext === undefined) {
      writeJson(response, 503, { ok: false, error: "DSH settings service is unavailable." });
      return;
    }
    const body = await readJsonBody(request);
    const expectedRevision = Number.isInteger(body.expectedRevision) ? body.expectedRevision : undefined;
    if (body.operation === "reset") {
      await state.settingsContext.settings.replace(SETTINGS_NAMESPACE, {}, expectedRevision);
    } else {
      const patch = settingPatch(body.patch ?? {});
      validateSettings({ ...state.current(), ...patch });
      await state.settingsContext.settings.update(SETTINGS_NAMESPACE, patch, expectedRevision);
    }
    writeJson(response, 200, state.view());
  } catch (error) {
    writeJson(response, 400, { ok: false, error: errorMessage(error) });
  }
}

function requireConfirmation(rawInput, action) {
  if (String(rawInput ?? "").trim() !== "confirm") {
    return {
      kind: "error",
      text: `/${action} changes the local grading workflow. Type '/${action} confirm' to confirm the action.`,
    };
  }
  return undefined;
}

function validateSettings(value) {
  resolveApiBaseUrl(value.apiBaseUrl);
  if (!Number.isFinite(value.confidenceThreshold) || value.confidenceThreshold < 0 || value.confidenceThreshold > 1) {
    throw new Error("Suhuang Scroll confidence threshold must be between 0 and 1.");
  }
  if (value.submitMode !== "auto_submit" && value.submitMode !== "manual_confirm") {
    throw new Error('Suhuang Scroll submit mode must be "auto_submit" or "manual_confirm".');
  }
}

function registerCommand(ctx, command, description, handler) {
  ctx.effect(
    () => ctx.commands.register({ name: command, description, handler }),
    `suhuang-scroll: ${command} command`,
  );
}

export function apply(ctx, config = {}) {
  let settingsContext;

  const settingsState = {
    get settingsContext() {
      return settingsContext;
    },
    current: () => readConfigSettings(config),
    view: () => settingsView(settingsContext, readConfigSettings(config)),
  };

  ctx.inject(["settings"], (settingsCtx) => {
    settingsContext = settingsCtx;
    // This plugin renders its own settings section, so the generated form for
    // the plugin entry stays off; the entry's Config fields remain editable
    // through the settings service used by the bridge below.
    settingsCtx.effect(
      () => settingsCtx.settings.configure({ auto: false }, ctx.fiber),
      "suhuang-scroll: settings presentation",
    );
  });

  ctx.effect(
    () => ctx.webServer.register({
      kind: "exact",
      path: "/suhuang-scroll/settings",
      handler: (request, response) => handleSettingsBridge(request, response, settingsState),
    }),
    "suhuang-scroll: settings bridge",
  );

  ctx.effect(
    () => ctx.webServer.register({
      kind: "exact",
      path: "/suhuang-scroll/runtime",
      handler: (request, response) => handleRuntimeBridge(request, response),
    }),
    "suhuang-scroll: runtime process bridge",
  );

  const currentSettings = () => readConfigSettings(config);
  const currentApiBaseUrl = () => resolveApiBaseUrl(currentSettings().apiBaseUrl);

  ctx.effect(
    () => ctx.webServer.register({
      kind: "exact",
      path: "/suhuang-scroll/runtime-api",
      handler: (request, response) => handleRuntimeApiBridge(request, response, currentSettings),
    }),
    "suhuang-scroll: runtime API bridge",
  );

  async function handleRuntimeBridge(request, response) {
    if (!isLoopbackRequest(request)) {
      writeJson(response, 403, { ok: false, error: "Runtime bridge is loopback-only." });
      return;
    }
    try {
      const origin = String(request.headers?.origin ?? "").trim() || undefined;
      if (request.method === "GET") {
        writeJson(response, 200, await runtimeBridgeState(currentSettings, request));
        return;
      }
      if (request.method !== "POST") {
        writeJson(response, 405, { ok: false, error: "Method not allowed." });
        return;
      }
      const body = await readJsonBody(request);
      const action = String(body.action ?? "");
      if (action === "start") {
        const result = await startRuntimeProcess(currentSettings(), origin, ctx.webServer);
        writeJson(response, 200, { ok: true, ...result, ...(await runtimeBridgeState(currentSettings, request)) });
        return;
      }
      if (action === "restart") {
        if (backendChild === null) {
          writeJson(response, 409, {
            ok: false,
            error: "当前后端不是由本插件启动，插件无法重启它。请先结束该进程，再点击“启动苏黄共阅”。",
          });
          return;
        }
        await stopRuntimeProcess();
        const result = await startRuntimeProcess(currentSettings(), origin, ctx.webServer);
        writeJson(response, 200, { ok: true, ...result, ...(await runtimeBridgeState(currentSettings, request)) });
        return;
      }
      if (action === "stop") {
        const result = await stopRuntimeProcess();
        writeJson(response, 200, { ok: true, ...result, ...(await runtimeBridgeState(currentSettings, request)) });
        return;
      }
      if (action === "manual_action") {
        // The outer body `action` names this bridge command, so the manual
        // action rides a sibling field. Accept the plausible client shapes;
        // `normalizeManualAction` is the single allow-list authority.
        const requested = body.manualAction
          ?? body.manual_action
          ?? body.value
          ?? body.payload?.action;
        let manualAction;
        try {
          manualAction = normalizeManualAction(requested);
        } catch (error) {
          writeJson(response, 400, { ok: false, error: errorMessage(error) });
          return;
        }
        try {
          const data = await requestJson(currentApiBaseUrl(), "/automation/manual-action", {
            method: "POST",
            body: JSON.stringify({ action: manualAction }),
          });
          writeJson(response, 200, { ok: true, action: manualAction, data });
        } catch (error) {
          const status = Number(error?.status);
          if (status === 404 || status === 405) {
            // Older Runtime without the manual-action route: report the
            // missing capability instead of failing the whole bridge.
            writeJson(response, 200, {
              ok: false,
              supported: false,
              status,
              error: "当前 Runtime 版本不支持人工确认操作，请升级 Runtime。",
            });
            return;
          }
          // Preserve the console: upstream/transport failures are reported in
          // the body, never as an unhandled bridge error.
          writeJson(response, 200, {
            ok: false,
            supported: true,
            status: Number.isInteger(status) ? status : null,
            error: errorMessage(error),
          });
        }
        return;
      }
      writeJson(response, 400, { ok: false, error: `Unknown runtime action: ${action}` });
    } catch (error) {
      writeJson(response, 400, { ok: false, error: errorMessage(error) });
    }
  }

  registerCommand(
    ctx,
    "suhuang-status",
    "Read the local Suhuang Scroll Runtime and grading status",
    async () => {
      try {
        const { health, automation } = await readRuntimeStatus(currentApiBaseUrl());
        return { kind: "success", text: formatStatusText(health, automation) };
      } catch (error) {
        return {
          kind: "error",
          text: `Suhuang Scroll Runtime unavailable: ${errorMessage(error)}`,
        };
      }
    },
  );

  registerCommand(
    ctx,
    "suhuang-start",
    "Start a manual-confirmation Suhuang Scroll grading workflow after confirmation",
    async (invocation) => {
      const refusal = requireConfirmation(invocation.rawInput, "suhuang-start");
      if (refusal) return refusal;
      try {
        const apiBaseUrl = currentApiBaseUrl();
        const specs = (await readRuntimeSpecs(apiBaseUrl)).specs ?? [];
        const payload = createStartPayload(currentSettings(), specs);
        const result = await requestJson(apiBaseUrl, "/automation/start", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        return { kind: "success", text: `Suhuang Scroll automation is now ${result.state}.` };
      } catch (error) {
        return {
          kind: "error",
          text: `Suhuang Scroll Runtime unavailable: ${errorMessage(error)}`,
        };
      }
    },
  );

  registerCommand(
    ctx,
    "suhuang-backend-start",
    "Start the local Suhuang Scroll backend process from this plugin",
    async (invocation) => {
      const refusal = requireConfirmation(invocation.rawInput, "suhuang-backend-start");
      if (refusal) return refusal;
      try {
        const result = await startRuntimeProcess(currentSettings(), undefined, ctx.webServer);
        if (result.alreadyManaged) {
          return { kind: "success", text: "Suhuang Scroll backend is already running." };
        }
        return { kind: "success", text: result.health ? "Suhuang Scroll backend started and healthy." : "Suhuang Scroll backend started; health still pending." };
      } catch (error) {
        return { kind: "error", text: `Suhuang Scroll backend could not be started: ${errorMessage(error)}` };
      }
    },
  );

  registerCommand(
    ctx,
    "suhuang-backend-stop",
    "Stop the Suhuang Scroll backend process managed by this plugin",
    async (invocation) => {
      const refusal = requireConfirmation(invocation.rawInput, "suhuang-backend-stop");
      if (refusal) return refusal;
      try {
        const result = await stopRuntimeProcess();
        return { kind: "success", text: result.alreadyStopped ? "Suhuang Scroll backend is not running." : "Suhuang Scroll backend stopped." };
      } catch (error) {
        return { kind: "error", text: `Suhuang Scroll backend could not be stopped: ${errorMessage(error)}` };
      }
    },
  );

  for (const action of ["pause", "resume", "stop"]) {
    registerCommand(
      ctx,
      `suhuang-${action}`,
      `${action[0].toUpperCase()}${action.slice(1)} the local Suhuang Scroll grading workflow after confirmation`,
      async (invocation) => {
        const refusal = requireConfirmation(invocation.rawInput, `suhuang-${action}`);
        if (refusal) return refusal;
        try {
          const result = await requestJson(currentApiBaseUrl(), `/automation/${action}`, { method: "POST" });
          return { kind: "success", text: `Suhuang Scroll automation is now ${result.state}.` };
        } catch (error) {
          return {
            kind: "error",
              text: `Suhuang Scroll Runtime unavailable: ${errorMessage(error)}`,
          };
        }
      },
    );
  }
}
