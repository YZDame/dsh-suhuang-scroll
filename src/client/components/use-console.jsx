import React from "react";

import {
  controlRunAction,
  getState,
  importSpec,
  manualDecision,
  refreshAll,
  retain,
  runtimeProcessAction,
  saveModel,
  startGrading,
  subscribe,
  testModel,
  updateSettings,
} from "../store.js";
import {
  effectiveDefaultSpec,
  friendlyErrorMessage,
  friendlyProviderMessage,
  resolveApiBaseUrl,
  safeBasename,
} from "../model.js";
import { deriveRunView, firstBlockingFix } from "../describe.js";
import { copyText, useNotice, useT } from "./common.jsx";

const ERROR_KEY_BY_CODE = {
  NO_SPEC: "noSpec",
  SPEC_FILE_TYPE: "specFileTypeError",
  SPEC_FILE_SIZE: "specFileSizeError",
  API_INVALID_PROTOCOL: "apiInvalidProtocol",
  API_INVALID_CREDENTIALS: "apiInvalidCredentials",
  API_INVALID_LOOPBACK: "apiInvalidLoopback",
};

/** Localize machine error codes thrown by the pure model/store helpers. */
export function errorText(cause, t) {
  const message = cause instanceof Error ? cause.message : String(cause);
  const key = ERROR_KEY_BY_CODE[message];
  if (key) return t(key);
  return friendlyErrorMessage(cause, t);
}

function fixLabel(t, fix) {
  const key = `fix_${fix.intent}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return fix.label || t("fix_generic");
}

/**
 * Shared console controller: one store subscription, one notice slot and one
 * confirmation surface per mounted console. Both the wide main panel and the
 * narrow right tab use it, so their behavior cannot drift.
 */
export function useConsole(locale) {
  const state = React.useSyncExternalStore(subscribe, getState, getState);
  React.useEffect(() => retain(), []);

  const t = useT(locale);
  const { notice, show, clear } = useNotice();
  const [dialog, setDialog] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  const { settings, catalog, host, connection, phase, readiness, busy } = state;
  const runView = deriveRunView(host, phase);
  const hasSpec = Boolean(effectiveDefaultSpec(settings.value, catalog.specs ?? []));
  const runtimeRunning = Boolean(host?.health);
  const runtimeManaged = Boolean(host?.process?.managed);
  const adapterOptions = catalog.resources?.adapters ?? [];
  const adapterLabel =
    adapterOptions.find((adapter) => adapter.value === (runView.run?.adapter || settings.value.adapter))?.label ??
    (runView.run?.adapter || settings.value.adapter || "");

  const reportError = React.useCallback(
    (cause) => show(t("operationFailed", { error: errorText(cause, t) }), "error"),
    [show, t],
  );

  const askConfirm = React.useCallback((request) => setConfirm(request), []);
  const closeConfirm = React.useCallback(() => setConfirm(null), []);

  const refresh = React.useCallback(async () => {
    try {
      await refreshAll();
    } catch (cause) {
      reportError(cause);
    }
  }, [reportError]);

  const startBackend = React.useCallback(async () => {
    try {
      const result = await runtimeProcessAction("start");
      if (result?.alreadyExternal) {
        show(t("externalServiceHint"), "error");
      } else {
        show(t("toastRuntimeStarted"));
      }
    } catch (cause) {
      reportError(cause);
    }
  }, [reportError, show, t]);

  const stopBackend = React.useCallback(
    () =>
      askConfirm({
        title: t("stopService"),
        body: t("stopServiceConfirm"),
        confirmLabel: t("stopService"),
        action: async () => {
          try {
            await runtimeProcessAction("stop");
            show(t("toastRuntimeStopped"));
          } catch (cause) {
            reportError(cause);
          }
        },
      }),
    [askConfirm, reportError, show, t],
  );

  const restartBackend = React.useCallback(
    () =>
      askConfirm({
        title: t("restartService"),
        body: t("restartServiceConfirm"),
        confirmLabel: t("restartService"),
        action: async () => {
          try {
            await runtimeProcessAction("restart");
            show(t("toastRuntimeRestarted"));
          } catch (cause) {
            reportError(cause);
          }
        },
      }),
    [askConfirm, reportError, show, t],
  );

  const startGradingFlow = React.useCallback(() => {
    const spec = effectiveDefaultSpec(settings.value, catalog.specs ?? []);
    const modeLabel = t(settings.value.submitMode === "manual_confirm" ? "manualConfirm" : "autoSubmit");
    const body = [
      t("startConfirmBody", {
        spec: spec ? safeBasename(spec) : "—",
        adapter: adapterLabel || t("followRuntimeUnknown"),
        mode: modeLabel,
        confidence: Number(settings.value.confidenceThreshold).toFixed(2),
      }),
      "",
      t(settings.value.submitMode === "manual_confirm" ? "startConfirmManual" : "startConfirmAuto"),
    ].join("\n");
    askConfirm({
      title: t("startConfirmTitle"),
      body,
      confirmLabel: t("startGrading"),
      action: async () => {
        try {
          await startGrading();
          show(t("toastGradingStarted"));
        } catch (cause) {
          reportError(cause);
        }
      },
    });
  }, [adapterLabel, askConfirm, catalog.specs, reportError, settings.value, show, t]);

  const pause = React.useCallback(async () => {
    try {
      await controlRunAction("pause");
      show(t("toastPauseSent"));
    } catch (cause) {
      reportError(cause);
    }
  }, [reportError, show, t]);

  const cancelPause = React.useCallback(async () => {
    try {
      await controlRunAction("resume");
      show(t("toastPauseCancelled"));
    } catch (cause) {
      reportError(cause);
    }
  }, [reportError, show, t]);

  const resume = React.useCallback(async () => {
    try {
      await controlRunAction("resume");
      show(t("toastResumeSent"));
    } catch (cause) {
      reportError(cause);
    }
  }, [reportError, show, t]);

  const endGrading = React.useCallback(
    () =>
      askConfirm({
        title: t("endGrading"),
        body: t("endGradingConfirm"),
        confirmLabel: t("endGrading"),
        action: async () => {
          try {
            await controlRunAction("stop");
            show(t("toastStopSent"));
          } catch (cause) {
            reportError(cause);
          }
        },
      }),
    [askConfirm, reportError, show, t],
  );

  const doManual = React.useCallback(
    async (action) => {
      try {
        await manualDecision(action);
        show(action === "submit" ? t("toastSubmitted") : t("actionSent", { action }));
      } catch (cause) {
        if (cause?.status === 404) setDialog({ kind: "manual_unsupported" });
        else reportError(cause);
      }
    },
    [reportError, show, t],
  );

  const importFile = React.useCallback(
    async (file) => {
      try {
        const imported = await importSpec(file);
        return imported;
      } catch (cause) {
        throw new Error(errorText(cause, t));
      }
    },
    [t],
  );

  const testModelForm = React.useCallback(
    async (payload = {}) => {
      const provider = catalog.provider ?? {};
      try {
        return await testModel({
          provider: payload.provider ?? provider.provider ?? "",
          model: payload.model ?? provider.model ?? "",
          base_url: payload.base_url ?? provider.base_url ?? "",
          ...(payload.api_key ? { api_key: payload.api_key } : {}),
        });
      } catch (cause) {
        throw new Error(friendlyProviderMessage(friendlyErrorMessage(cause, t), t));
      }
    },
    [catalog.provider, t],
  );

  const saveModelForm = React.useCallback(
    async (payload) => {
      try {
        const result = await saveModel(payload);
        show(t("modelSaveSuccess"));
        return result;
      } catch (cause) {
        if (cause?.status === 404) throw new Error(t("modelSaveNeedsRestart"));
        throw new Error(friendlyProviderMessage(friendlyErrorMessage(cause, t), t));
      }
    },
    [show, t],
  );

  const updateSetting = React.useCallback(
    async (patch) => {
      try {
        await updateSettings(patch);
      } catch (cause) {
        reportError(cause);
        throw cause;
      }
    },
    [reportError],
  );

  const runFix = React.useCallback(
    async (fix) => {
      if (!fix) return;
      switch (fix.intent) {
        case "start_runtime":
          await startBackend();
          return;
        case "restart_runtime":
          restartBackend();
          return;
        case "stop_runtime":
          stopBackend();
          return;
        case "refresh_readiness":
          await refresh();
          return;
        case "import_spec":
          setImportOpen(true);
          return;
        case "open_spec_settings":
        case "open_adapter_settings":
          setConfigOpen(true);
          return;
        case "open_model_settings":
          setDialog({ kind: "open_model_settings" });
          return;
        case "test_model_connection": {
          try {
            const provider = catalog.provider ?? {};
            const result = await testModel({
              provider: provider.provider ?? "",
              model: provider.model ?? "",
              base_url: provider.base_url ?? "",
            });
            const ok = result?.connection_test?.ok === true;
            show(ok ? t("testSuccess") : t("testFailed", { error: result?.connection_test?.message ?? "" }), ok ? "success" : "error");
          } catch (cause) {
            show(t("testFailed", { error: friendlyProviderMessage(friendlyErrorMessage(cause, t), t) }), "error");
          }
          return;
        }
        case "install_extension":
          setDialog({ kind: "install_extension" });
          return;
        case "upgrade_extension":
          setDialog({ kind: "upgrade_extension" });
          return;
        case "upgrade_runtime":
          setDialog({ kind: "upgrade_runtime" });
          return;
        case "reload_extension":
          setDialog({ kind: "reload_extension" });
          return;
        case "open_extension_consent":
          setDialog({ kind: "open_extension_consent" });
          return;
        case "open_grading_site":
          setDialog({ kind: "open_grading_site" });
          return;
        case "open_docs":
          setDialog({ kind: "docs" });
          return;
        case "copy_adapter_command":
          await copyText(fix.params?.command ?? t("adapterPrompt"), show, t);
          return;
        case "set_backend_dir":
          setDialog({ kind: "set_backend_dir" });
          return;
        default:
          setDialog({ kind: "docs" });
      }
    },
    [
      catalog.provider,
      refresh,
      reportError,
      restartBackend,
      show,
      startBackend,
      stopBackend,
      t,
    ],
  );

  const primaryAction = React.useMemo(() => {
    const busyStart = Boolean(busy.start);
    if (phase === "offline") {
      return {
        label: busy.runtime ? t("startProductPending") : t("startProduct"),
        onClick: startBackend,
        disabled: Boolean(busy.runtime),
        pending: Boolean(busy.runtime),
        hint: isReconnecting(connection) ? t("reconnectingDescription") : null,
      };
    }
    if (phase === "setup") {
      const first = firstBlockingFix(readiness.rows);
      if (first) {
        return {
          label: fixLabel(t, first.fix),
          onClick: () => void runFix(first.fix),
          disabled: Boolean(busy.runtime),
          hint: t("startBlockedReason"),
        };
      }
      return { label: t("startGrading"), onClick: startGradingFlow, disabled: true, hint: t("startBlockedReason") };
    }
    if (phase === "ready") {
      return {
        label: t("startGrading"),
        onClick: startGradingFlow,
        disabled: busyStart || !hasSpec || !readiness.ready,
        pending: busyStart,
        hint: !hasSpec ? t("noSpec") : !readiness.ready ? t("startBlockedReason") : null,
      };
    }
    if (phase === "starting") return { label: t("startProductPending"), disabled: true };
    if (phase === "running") return { label: t("pauseGrading"), onClick: pause, disabled: Boolean(busy.control) };
    if (phase === "pausing") return { label: t("cancelPause"), onClick: cancelPause, disabled: Boolean(busy.control) };
    if (phase === "paused") return { label: t("resumeGrading"), onClick: resume, disabled: Boolean(busy.control) };
    if (phase === "awaiting") {
      return { label: t("confirmSubmit"), onClick: () => void doManual("submit"), disabled: Boolean(busy.control) };
    }
    if (phase === "error") return { label: t("retryGrading"), onClick: resume, disabled: Boolean(busy.control) };
    if (phase === "completed" || phase === "ended") {
      return {
        label: t("startNewRound"),
        onClick: startGradingFlow,
        disabled: busyStart || !hasSpec || !readiness.ready,
        hint: readiness.ready ? null : t("startBlockedReason"),
      };
    }
    return { label: t("startGrading"), onClick: startGradingFlow, disabled: true };
  }, [
    busy.control,
    busy.runtime,
    busy.start,
    cancelPause,
    connection,
    doManual,
    hasSpec,
    pause,
    phase,
    readiness.ready,
    readiness.rows,
    resume,
    runFix,
    startBackend,
    startGradingFlow,
    t,
  ]);

  const saveConnectionSetting = React.useCallback(
    async (patch) => {
      try {
        resolveApiBaseUrl(patch.apiBaseUrl ?? settings.value.apiBaseUrl);
        await updateSetting(patch);
        show(t("toastSettingsSaved"));
        return true;
      } catch (cause) {
        show(t("toastSettingsFailed", { error: errorText(cause, t) }), "error");
        throw cause;
      }
    },
    [settings.value.apiBaseUrl, show, t, updateSetting],
  );

  return {
    state,
    t,
    notice,
    show,
    clear,
    dialog,
    setDialog,
    confirm,
    askConfirm,
    closeConfirm,
    configOpen,
    setConfigOpen,
    importOpen,
    setImportOpen,
    settings: settings.value,
    settingsStatus: settings.status,
    settingsWritable: settings.writable,
    catalog,
    host,
    connection,
    phase,
    readiness,
    runView,
    hasSpec,
    busy,
    runtimeRunning,
    runtimeManaged,
    adapterLabel,
    primaryAction,
    startGradingFlow,
    pause,
    cancelPause,
    resume,
    endGrading,
    doManual,
    startBackend,
    restartBackend,
    stopBackend,
    runFix,
    importFile,
    refresh,
    updateSetting,
    saveConnectionSetting,
    saveModelForm,
    testModelForm,
    fixLabel: (fix) => fixLabel(t, fix),
  };
}

function isReconnecting(connection) {
  return connection === "reconnecting";
}
