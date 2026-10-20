// The console's single data store.
//
// Main panel, right-tab console and settings section all subscribe to this one
// store, so there is exactly one poller, one settings revision and one Runtime
// snapshot. Duplicating state per mounted surface is what made the previous
// console poll twice, flicker on one failed request and go stale after a save.

import {
  createStartPayload,
  derivePhase,
  deriveReadiness,
  errorMessage,
  isRunActive,
  normalizeSettings,
  resolveApiBaseUrl,
} from "./model.js";
import {
  importSpecFile,
  manualAction as manualActionRequest,
  controlRun,
  readHostState,
  readProviderStatus,
  readResources,
  readSettings,
  readSpecs,
  requestRuntimeAction,
  resetSettingsBridge,
  saveProviderConfig,
  startRun,
  testProvider,
  updateSettingsBridge,
} from "./bridge.js";

const IDLE_POLL_MS = 8000;
const ACTIVE_POLL_MS = 2000;
const CATALOG_TTL_MS = 15000;

function initialState() {
  return {
    booted: false,
    booting: false,
    loading: true,
    connection: "connecting",
    host: null,
    settings: {
      status: "loading",
      value: normalizeSettings(),
      revision: undefined,
      writable: false,
      error: "",
    },
    catalog: { state: "idle", specs: [], resources: null, provider: null, error: "", fetchedAt: 0 },
    readiness: deriveReadiness(null),
    phase: "offline",
    lastError: "",
    busy: {},
  };
}

let state = initialState();
const listeners = new Set();
let retainCount = 0;
let pollTimer = null;
let settingsLoaded = false;
let hostInFlight = null;
let catalogInFlight = null;
let bootPromise = null;
let polling = false;

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setBusy(key, value) {
  setState({ busy: { ...state.busy, [key]: value } });
}

function settingsSnapshot(payload) {
  return {
    status: payload?.status === "ready" ? "ready" : "unavailable",
    value: normalizeSettings(payload?.value ?? {}),
    revision: payload?.revision,
    writable: Boolean(payload?.writable),
    error: typeof payload?.error === "string" ? payload.error : "",
  };
}

function applySettings(payload) {
  setState({ settings: settingsSnapshot(payload) });
}

function recomputeReadiness(host = state.host, catalog = state.catalog) {
  return deriveReadiness(host ? { ...host, fallbackCatalog: catalog } : null);
}

/** Load the DSH settings namespace. Works even when the Runtime is stopped. */
export async function refreshSettings() {
  try {
    const payload = await readSettings();
    applySettings(payload);
    settingsLoaded = true;
    return payload;
  } catch (error) {
    if (!settingsLoaded) {
      setState({
        settings: {
          status: "unavailable",
          value: normalizeSettings(),
          revision: undefined,
          writable: false,
          error: errorMessage(error),
        },
      });
    }
    throw error;
  }
}

async function refreshHostOnce() {
  try {
    const host = await readHostState();
    const readiness = recomputeReadiness(host);
    const phase = derivePhase(host, readiness);
    setState({
      host,
      readiness,
      phase,
      connection: "ok",
      lastError: "",
      loading: false,
    });
    if (!isRunActive(phase) && Date.now() - state.catalog.fetchedAt > CATALOG_TTL_MS) {
      void refreshCatalog();
    }
    return host;
  } catch (error) {
    const message = errorMessage(error);
    const hadHost = Boolean(state.host);
    setState({
      connection: hadHost ? "reconnecting" : "offline",
      lastError: message,
      loading: false,
    });
    if (!hadHost) {
      const readiness = deriveReadiness(null);
      setState({ readiness, phase: "offline" });
    }
    throw error;
  }
}

/** Refresh Runtime + readiness through the plugin's host bridge. */
export function refreshHost() {
  if (hostInFlight) return hostInFlight;
  hostInFlight = refreshHostOnce().finally(() => {
    hostInFlight = null;
  });
  return hostInFlight;
}

/** Refresh grading specs, adapter registry and provider status. */
export function refreshCatalog() {
  if (catalogInFlight) return catalogInFlight;
  catalogInFlight = (async () => {
    const settings = state.settings.value;
    let apiBaseUrl;
    try {
      apiBaseUrl = resolveApiBaseUrl(settings.apiBaseUrl);
    } catch (error) {
      setState({ catalog: { ...state.catalog, state: "error", error: errorMessage(error) } });
      return null;
    }
    try {
      const [specsPayload, resources, provider] = await Promise.all([
        readSpecs(apiBaseUrl),
        readResources(apiBaseUrl),
        readProviderStatus(apiBaseUrl),
      ]);
      const catalog = {
        state: "ready",
        specs: Array.isArray(specsPayload?.specs) ? specsPayload.specs : [],
        resources: resources ?? null,
        provider: provider ?? null,
        error: "",
        fetchedAt: Date.now(),
      };
      const readiness = recomputeReadiness(state.host, catalog);
      setState({ catalog, readiness, phase: derivePhase(state.host, readiness) });
      return catalog;
    } catch (error) {
      const catalog = { ...state.catalog, state: "error", error: errorMessage(error) };
      setState({ catalog });
      return null;
    } finally {
      catalogInFlight = null;
    }
  })();
  return catalogInFlight;
}

function scheduleNext() {
  if (!polling) return;
  if (pollTimer !== null) clearTimeout(pollTimer);
  const active = isRunActive(state.phase);
  pollTimer = setTimeout(async () => {
    pollTimer = null;
    if (!polling) return;
    if (typeof document !== "undefined" && document.hidden) {
      scheduleNext();
      return;
    }
    try {
      await refreshHost();
    } catch {
      // The connection state is already recorded; keep polling.
    }
    scheduleNext();
  }, active ? ACTIVE_POLL_MS : IDLE_POLL_MS);
}

function onVisibilityChange() {
  if (typeof document === "undefined") return;
  if (!document.hidden) {
    void refreshHost().catch(() => {});
    scheduleNext();
  }
}

/** Bootstrap the store once, then poll at a rate derived from the run phase. */
export function boot() {
  if (bootPromise) return bootPromise;
  polling = true;
  bootPromise = (async () => {
    setState({ booting: true });
    let settingsOk = false;
    try {
      await refreshSettings();
      settingsOk = true;
    } catch {
      // Settings unavailable: keep defaults and let the console explain.
    }
    try {
      await refreshHost();
    } catch {
      // Offline is a rendered state.
    }
    if (settingsOk) await refreshCatalog();
    setState({ booted: true, booting: false, loading: false });
    if (polling && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    scheduleNext();
  })().finally(() => {
    bootPromise = null;
  });
  return bootPromise;
}

export function shutdown() {
  polling = false;
  if (pollTimer !== null) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
}

/** Reference-count mounted surfaces so the first mount boots and the last unmount stops. */
export function retain() {
  retainCount += 1;
  if (retainCount === 1) void boot();
  return () => {
    retainCount -= 1;
    if (retainCount === 0) shutdown();
  };
}

/** Manual refresh used by the console's refresh action. */
export async function refreshAll() {
  await refreshSettings().catch(() => {});
  await refreshHost();
  await refreshCatalog();
}

// ---- Run controls --------------------------------------------------------

export async function startGrading() {
  setBusy("start", true);
  try {
    const settings = state.settings.value;
    const apiBaseUrl = resolveApiBaseUrl(settings.apiBaseUrl);
    const payload = createStartPayload(settings, state.catalog.specs ?? []);
    const run = await startRun(apiBaseUrl, payload);
    await refreshHost().catch(() => {});
    return run;
  } finally {
    setBusy("start", false);
  }
}

export async function controlRunAction(action) {
  setBusy("control", true);
  try {
    const apiBaseUrl = resolveApiBaseUrl(state.settings.value.apiBaseUrl);
    const result = await controlRun(apiBaseUrl, action);
    await refreshHost().catch(() => {});
    return result;
  } finally {
    setBusy("control", false);
  }
}

export async function manualDecision(action) {
  setBusy("control", true);
  try {
    const apiBaseUrl = resolveApiBaseUrl(state.settings.value.apiBaseUrl);
    const result = await manualActionRequest(apiBaseUrl, action);
    await refreshHost().catch(() => {});
    return result;
  } finally {
    setBusy("control", false);
  }
}

export async function runtimeProcessAction(action) {
  setBusy("runtime", true);
  try {
    const result = await requestRuntimeAction(action);
    // The bridge already probes health after start/restart; refreshing the host
    // state keeps every surface on the same snapshot either way.
    await refreshHost().catch(() => {});
    return result;
  } finally {
    setBusy("runtime", false);
  }
}

// ---- Settings ------------------------------------------------------------

export async function updateSettings(patch) {
  setBusy("save", true);
  try {
    const next = await updateSettingsBridge(patch, state.settings.revision);
    applySettings(next);
    await refreshHost().catch(() => {});
    return next;
  } finally {
    setBusy("save", false);
  }
}

export async function resetSettings() {
  setBusy("save", true);
  try {
    const next = await resetSettingsBridge(state.settings.revision);
    applySettings(next);
    await refreshHost().catch(() => {});
    return next;
  } finally {
    setBusy("save", false);
  }
}

export async function saveModel(payload) {
  setBusy("save", true);
  try {
    const apiBaseUrl = resolveApiBaseUrl(state.settings.value.apiBaseUrl);
    const result = await saveProviderConfig(apiBaseUrl, payload);
    const patch = {};
    if (typeof result?.provider === "string") patch.provider = result.provider;
    if (typeof result?.model === "string") patch.model = result.model;
    if (Object.keys(patch).length > 0) {
      const next = await updateSettingsBridge(patch, state.settings.revision);
      applySettings(next);
    }
    await refreshCatalog().catch(() => {});
    await refreshHost().catch(() => {});
    return result;
  } finally {
    setBusy("save", false);
  }
}

export async function testModel(payload) {
  setBusy("modelTest", true);
  try {
    const apiBaseUrl = resolveApiBaseUrl(state.settings.value.apiBaseUrl);
    return await testProvider(apiBaseUrl, payload);
  } finally {
    setBusy("modelTest", false);
  }
}

export async function importSpec(file) {
  setBusy("import", true);
  try {
    if (!file?.name?.endsWith(".md")) throw new Error("SPEC_FILE_TYPE");
    if (file.size > 48 * 1024) throw new Error("SPEC_FILE_SIZE");
    const content = await file.text();
    const apiBaseUrl = resolveApiBaseUrl(state.settings.value.apiBaseUrl);
    const imported = await importSpecFile(apiBaseUrl, file.name, content);
    await refreshCatalog().catch(() => {});
    if (imported?.value) {
      const next = await updateSettingsBridge({ defaultSpec: imported.value }, state.settings.revision);
      applySettings(next);
    }
    return imported;
  } finally {
    setBusy("import", false);
  }
}

/** Test-only reset. */
export function __resetForTests() {
  shutdown();
  state = initialState();
  listeners.clear();
  retainCount = 0;
  settingsLoaded = false;
  hostInFlight = null;
  catalogInFlight = null;
  bootPromise = null;
}
