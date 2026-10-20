// Same-origin transport for the console.
//
// The page never calls the Runtime API directly: the DSH page and the Runtime
// are different origins, and a Runtime started earlier may not have been given
// this page's origin. Every call goes through the plugin's own loopback bridge,
// which re-validates the target path and only talks to loopback Runtime URLs.

export const SETTINGS_BRIDGE_PATH = "/suhuang-scroll/settings";
export const RUNTIME_BRIDGE_PATH = "/suhuang-scroll/runtime";
export const RUNTIME_API_BRIDGE_PATH = "/suhuang-scroll/runtime-api";

function timeoutSignal(milliseconds) {
  return globalThis.AbortSignal?.timeout?.(milliseconds);
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function bridgeError(payload, response) {
  const message = typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`;
  const error = new Error(message);
  error.status = Number.isInteger(payload?.status) ? payload.status : response.status;
  return error;
}

async function postBridge(path, body, timeout = 8000) {
  const response = await fetch(path, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: timeoutSignal(timeout),
  });
  const payload = await readJson(response);
  if (!response.ok || payload?.ok === false) throw bridgeError(payload, response);
  return payload;
}

/** Read the merged host state: process facts, Runtime health/automation, readiness. */
export async function readHostState(timeout = 8000) {
  const response = await fetch(RUNTIME_BRIDGE_PATH, {
    headers: { accept: "application/json" },
    signal: timeoutSignal(timeout),
  });
  const payload = await readJson(response);
  if (!response.ok || payload?.ok === false) throw bridgeError(payload, response);
  return payload;
}

/** Drive the plugin-managed Runtime process: start | restart | stop. */
export async function requestRuntimeAction(action) {
  return postBridge(RUNTIME_BRIDGE_PATH, { action }, 45000);
}

/** Read the DSH settings namespace through the plugin's settings bridge. */
export async function readSettings() {
  const response = await fetch(SETTINGS_BRIDGE_PATH, {
    headers: { accept: "application/json" },
    signal: timeoutSignal(6000),
  });
  const payload = await readJson(response);
  if (!response.ok) throw bridgeError(payload, response);
  return payload;
}

export async function updateSettingsBridge(patch, expectedRevision) {
  const response = await fetch(SETTINGS_BRIDGE_PATH, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ operation: "update", patch, expectedRevision }),
    signal: timeoutSignal(6000),
  });
  const payload = await readJson(response);
  if (!response.ok || payload?.ok === false) throw bridgeError(payload, response);
  return payload;
}

export async function resetSettingsBridge(expectedRevision) {
  const response = await fetch(SETTINGS_BRIDGE_PATH, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ operation: "reset", expectedRevision }),
    signal: timeoutSignal(6000),
  });
  const payload = await readJson(response);
  if (!response.ok || payload?.ok === false) throw bridgeError(payload, response);
  return payload;
}

/**
 * Forward one allow-listed Runtime API call.
 * Unsupported paths fail with `error.status === 404`; callers use that to fall
 * back gracefully on older Runtime versions instead of breaking the console.
 */
export async function requestRuntimeApi(apiBaseUrl, path, init = {}) {
  let forward;
  if (init.body !== undefined && init.body !== null) {
    forward = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
  }
  const timeout = init.timeout ?? 20000;
  const response = await fetch(RUNTIME_API_BRIDGE_PATH, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      apiBaseUrl,
      path,
      method: init.method ?? "GET",
      ...(forward === undefined ? {} : { body: forward }),
    }),
    signal: timeoutSignal(timeout),
  });
  const payload = await readJson(response);
  if (!response.ok || payload?.ok === false) throw bridgeError(payload, response);
  return payload.data ?? {};
}

// ---- Runtime API helpers -------------------------------------------------

export async function readSpecs(apiBaseUrl) {
  return requestRuntimeApi(apiBaseUrl, "/specs");
}

export async function readResources(apiBaseUrl) {
  return requestRuntimeApi(apiBaseUrl, "/resources");
}

export async function readProviderStatus(apiBaseUrl) {
  return requestRuntimeApi(apiBaseUrl, "/provider/status");
}

export async function importSpecFile(apiBaseUrl, name, content) {
  return requestRuntimeApi(apiBaseUrl, "/specs/import", {
    method: "POST",
    body: { name, content },
  });
}

export async function saveProviderConfig(apiBaseUrl, payload) {
  return requestRuntimeApi(apiBaseUrl, "/provider/config", { method: "PUT", body: payload });
}

export async function testProvider(apiBaseUrl, payload) {
  return requestRuntimeApi(apiBaseUrl, "/provider/test", {
    method: "POST",
    body: payload,
    timeout: 25000,
  });
}

export async function controlRun(apiBaseUrl, action) {
  return requestRuntimeApi(apiBaseUrl, `/automation/${action}`, { method: "POST" });
}

export async function startRun(apiBaseUrl, payload) {
  return requestRuntimeApi(apiBaseUrl, "/automation/start", { method: "POST", body: payload });
}

export async function manualAction(apiBaseUrl, action) {
  return requestRuntimeApi(apiBaseUrl, "/automation/manual-action", { method: "POST", body: { action } });
}
