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
} from "./runtime.js";

const SETTINGS_NAMESPACE = settingsNamespace("suhuang-scroll");
const SETTINGS_SCHEMA = z.object({
  apiBaseUrl: z.string().default(DEFAULT_API_BASE_URL),
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
  "defaultSpec",
  "adapter",
  "provider",
  "model",
  "confidenceThreshold",
]);

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

  const currentSettings = () => normalizeSettings(settingsScope?.get() ?? config);
  const currentApiBaseUrl = () => resolveApiBaseUrl(currentSettings().apiBaseUrl);

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
