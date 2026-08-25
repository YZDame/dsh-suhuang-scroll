import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

import {
  DEFAULT_API_BASE_URL,
  DEFAULT_CONFIDENCE_THRESHOLD,
  createStartPayload,
  errorMessage,
  formatStatusText,
  normalizeSettings,
  readRuntimeSpecs,
  readRuntimeStatus,
  requestJson,
  resolveApiBaseUrl,
  resolveApiPort,
} from "./runtime.js";

const SETTINGS_NAMESPACE = settingsNamespace("suhuang-scroll");
const SETTINGS_SCHEMA = z.object({
  apiBaseUrl: z.string().default(DEFAULT_API_BASE_URL),
  backendDir: z.string().default(""),
  defaultSpec: z.string().default(""),
  adapter: z.string().default(""),
  provider: z.string().default(""),
  model: z.string().default(""),
  confidenceThreshold: z.number().step(0.01).min(0).max(1).default(DEFAULT_CONFIDENCE_THRESHOLD),
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
]);

// Directory of this plugin source (index.js), used to locate the Suhuang
// Scroll repo checkout in local development. When installed as a published
// package outside the repo, leave backendDir configured explicitly instead.
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));

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

function pluginBackendDir() {
  const repoRoot = resolve(PLUGIN_DIR, "..", "..");
  const candidate = join(repoRoot, "core", "python");
  return existsSync(join(candidate, "main.py")) ? candidate : "";
}

function resolveBackendDir(value) {
  const configured = String(value ?? "").trim();
  if (configured) return isAbsolute(configured) ? configured : resolve(PLUGIN_DIR, configured);
  return pluginBackendDir();
}

function resolvePythonInterpreter(backendDir) {
  const venv = join(backendDir, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return process.env.SUHUANG_PYTHON || "python3";
}

function isChildAlive() {
  return backendChild !== null && backendChild.exitCode === null && backendChild.signalCode === null;
}

function buildAllowedOrigins(origin) {
  const seen = new Set(BASE_ALLOWED_ORIGINS);
  if (origin) seen.add(origin);
  return [...seen].join(",");
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
  };
}

async function startRuntimeProcess(currentSettings, origin) {
  backendLastError = null;
  if (isChildAlive()) return { started: true, alreadyManaged: true };
  const apiBaseUrl = resolveApiBaseUrl(currentSettings.apiBaseUrl);
  const existing = await probeHealth(apiBaseUrl);
  if (existing) {
    return { started: false, alreadyExternal: true, ...existing };
  }
  const backendDir = resolveBackendDir(currentSettings.backendDir);
  if (!backendDir || !existsSync(join(backendDir, "main.py"))) {
    throw new Error("未找到苏黄共阅后端目录（core/python/main.py）。请在设置中配置“后端目录”。");
  }
  const python = resolvePythonInterpreter(backendDir);
  const port = resolveApiPort(currentSettings.apiBaseUrl);
  const env = {
    ...process.env,
    API_PORT: String(port),
    SUHUANG_API_HOST: "127.0.0.1",
    ALLOWED_ORIGINS: buildAllowedOrigins(origin),
  };
  const child = spawn(python, ["backend_launcher.py"], {
    cwd: backendDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
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
    backendLastError = "后端进程已启动，但健康检查超时。请检查 Python 环境与端口占用。";
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

async function runtimeBridgeState(getCurrentSettings, request) {
  const current = getCurrentSettings();
  const apiBaseUrl = resolveApiBaseUrl(current.apiBaseUrl);
  const origin = String(request.headers?.origin ?? "").trim() || undefined;
  const probe = await probeHealth(apiBaseUrl);
  const backendDir = resolveBackendDir(current.backendDir);
  return {
    ok: true,
    apiBaseUrl,
    port: resolveApiPort(current.apiBaseUrl),
    process: {
      ...runtimeProcessStatus(),
      backendDir: backendDir || undefined,
      python: backendDir ? resolvePythonInterpreter(backendDir) : undefined,
    },
    health: probe?.health ?? null,
    automation: probe?.automation ?? null,
    origin,
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

function isLoopbackRequest(request) {
  const authority = String(request.headers?.host ?? "").trim().toLowerCase();
  if (authority.startsWith("[")) {
    return authority.startsWith("[::1]") && (/^\[::1\](?::\d+)?$/.test(authority));
  }
  const host = authority.replace(/:\d+$/, "");
  return host === "localhost" || host === "127.0.0.1";
}

function settingsView(settingsContext, settingsScope, config) {
  const fallback = normalizeSettings(config);
  if (settingsScope === undefined || settingsContext === undefined) {
    return {
      status: "unavailable",
      value: fallback,
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
        value: normalizeSettings(settingsScope.get()),
        base: {},
        user: {},
        revision: undefined,
        writable: Boolean(settingsContext.settings.writable),
      };
    }
    return {
      status: "ready",
      value: normalizeSettings(settingsScope.get()),
      base: descriptor.base ?? {},
      user: descriptor.user ?? {},
      revision: descriptor.revision,
      writable: Boolean(settingsContext.settings.writable),
    };
  } catch (error) {
    return {
      status: "unavailable",
      value: fallback,
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
      await state.settingsContext.settings.update(
        SETTINGS_NAMESPACE,
        settingPatch(body.patch ?? {}),
        expectedRevision,
      );
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
}

function settingsBase(config) {
  if (config.apiBaseUrl === undefined) return undefined;
  return { apiBaseUrl: config.apiBaseUrl };
}

function registerCommand(ctx, command, description, handler) {
  ctx.effect(
    () => ctx.commands.register({ name: command, description, handler }),
    `suhuang-scroll: ${command} command`,
  );
}

export function apply(ctx, config = {}) {
  let settingsScope;
  let settingsContext;

  const settingsState = {
    get settingsContext() {
      return settingsContext;
    },
    view: () => settingsView(settingsContext, settingsScope, config),
  };

  ctx.inject(["settings"], (settingsCtx) => {
    settingsContext = settingsCtx;
    const base = settingsBase(config);
    settingsScope = settingsCtx.settings.register(SETTINGS_NAMESPACE, SETTINGS_SCHEMA, {
      ...(base ? { base } : {}),
      validate: validateSettings,
    });
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

  const currentSettings = () => normalizeSettings(settingsScope?.get() ?? config);
  const currentApiBaseUrl = () => resolveApiBaseUrl(currentSettings().apiBaseUrl);

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
        const result = await startRuntimeProcess(currentSettings(), origin);
        writeJson(response, 200, { ok: true, ...result, ...(await runtimeBridgeState(currentSettings, request)) });
        return;
      }
      if (action === "stop") {
        const result = await stopRuntimeProcess();
        writeJson(response, 200, { ok: true, ...result, ...(await runtimeBridgeState(currentSettings, request)) });
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
        const result = await startRuntimeProcess(currentSettings(), undefined);
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
