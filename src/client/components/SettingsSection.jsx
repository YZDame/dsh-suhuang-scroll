import React from "react";

import { Button, StateDot } from "@deepseek-ai/dsh-client-ui-primitives";

import { DocsLinks, FieldRow, InlineNote, Section } from "./common.jsx";
import { NewSiteHelp } from "./dialogs.jsx";
import { ReadinessList } from "./ReadinessList.jsx";
import { describeRow } from "../describe.js";
import { friendlyProviderMessage, safeBasename } from "../model.js";
import { useConsole } from "./use-console.jsx";
import { ConsoleSurfaces } from "./surfaces.jsx";

function ModelForm({ c, sectionRef }) {
  const { t, catalog, settings } = c;
  const provider = catalog.provider ?? {};
  // Show the effective configuration: an explicit DSH override wins, otherwise
  // the Runtime's current provider settings are the truth the user sees.
  const initial = () => ({
    provider: settings.provider || provider.provider || "",
    model: settings.model || provider.model || "",
    base_url: provider.base_url ?? "",
    api_key: "",
  });
  const [draft, setDraft] = React.useState(initial);
  const [test, setTest] = React.useState({ state: "idle", ok: null, message: "", legacy: false });
  const [save, setSave] = React.useState({ state: "idle", message: "" });
  const dirty = React.useRef(false);

  React.useEffect(() => {
    if (dirty.current) return;
    setDraft({
      provider: settings.provider || provider.provider || "",
      model: settings.model || provider.model || "",
      base_url: provider.base_url ?? "",
      api_key: "",
    });
  }, [settings.provider, settings.model, provider.base_url]);

  const update = (field, value) => {
    dirty.current = true;
    setDraft((current) => ({ ...current, [field]: value }));
    setTest({ state: "idle", ok: null, message: "", legacy: false });
    setSave({ state: "idle", message: "" });
  };

  const providerOptions = [
    {
      value: "",
      label: catalog.resources?.defaultProvider
        ? t("followRuntime", { value: catalog.resources.defaultProvider })
        : t("followRuntimeUnknown"),
    },
    ...(catalog.resources?.providers ?? []).map((option) => ({
      value: option.value,
      label: option.label || option.value,
    })),
  ];

  const runTest = async () => {
    setTest({ state: "loading", ok: null, message: "", legacy: false });
    try {
      const result = await c.testModelForm({
        provider: draft.provider,
        model: draft.model,
        base_url: draft.base_url,
        api_key: draft.api_key || undefined,
      });
      const ok = result?.connection_test?.ok === true;
      setTest({
        state: "ready",
        ok,
        message: ok ? "" : friendlyProviderMessage(result?.connection_test?.message ?? "", t),
        legacy: false,
      });
    } catch (cause) {
      setTest({
        state: "error",
        ok: false,
        message: cause instanceof Error ? cause.message : String(cause),
        legacy: false,
      });
    }
  };

  const saveModel = async () => {
    setSave({ state: "loading", message: "" });
    try {
      await c.saveModelForm({
        provider: draft.provider,
        model: draft.model,
        base_url: draft.base_url,
        api_key: draft.api_key || undefined,
      });
      dirty.current = false;
      setDraft((current) => ({ ...current, api_key: "" }));
      setSave({ state: "saved", message: t("modelSaveSuccess") });
    } catch (cause) {
      setSave({
        state: "error",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    }
  };

  return React.createElement(
    "div",
    { className: "ss-settings__group", ref: sectionRef },
    React.createElement("h2", { className: "ss-settings__group-title" }, t("settingsModelTitle")),
    React.createElement("p", { className: "ss-settings__group-hint" }, t("settingsModelHint")),
    React.createElement(
      "div",
      { className: "ss-form" },
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement("label", { className: "ss-form__label", htmlFor: "suhuang-model-provider" }, t("providerLabel")),
        React.createElement(
          "div",
          { className: "ss-select-wrap" },
          React.createElement(
            "select",
            {
              id: "suhuang-model-provider",
              className: "ss-select",
              value: draft.provider,
              onChange: (event) => update("provider", event.target.value),
            },
            ...providerOptions.map((option, index) =>
              React.createElement("option", { key: `provider-${index}`, value: option.value }, option.label),
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement("label", { className: "ss-form__label", htmlFor: "suhuang-model-id" }, t("modelLabel")),
        React.createElement("input", {
          id: "suhuang-model-id",
          className: "ss-input",
          value: draft.model,
          onChange: (event) => update("model", event.target.value),
          spellCheck: false,
        }),
        React.createElement("p", { className: "ss-form__hint" }, t("modelHint")),
      ),
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement("label", { className: "ss-form__label", htmlFor: "suhuang-model-base-url" }, t("baseUrlLabel")),
        React.createElement("input", {
          id: "suhuang-model-base-url",
          className: "ss-input",
          value: draft.base_url,
          placeholder: "https://api.example.com/v1",
          onChange: (event) => update("base_url", event.target.value),
          spellCheck: false,
        }),
        React.createElement("p", { className: "ss-form__hint" }, t("baseUrlHint")),
      ),
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement("label", { className: "ss-form__label", htmlFor: "suhuang-model-api-key" }, t("apiKeyLabel")),
        React.createElement("input", {
          id: "suhuang-model-api-key",
          className: "ss-input",
          type: "password",
          autoComplete: "new-password",
          placeholder: provider.api_key_configured ? "••••••••••••" : "sk-…",
          value: draft.api_key,
          onChange: (event) => update("api_key", event.target.value),
        }),
        React.createElement(
          "p",
          { className: "ss-form__hint" },
          provider.api_key_configured ? t("apiKeyConfigured") : t("apiKeyMissing"),
          " ",
          t("apiKeyHint"),
        ),
      ),
      React.createElement(
        "div",
        { className: "ss-form__inline" },
        React.createElement(
          Button,
          { size: "sm", variant: "outline", disabled: test.state === "loading", onClick: () => void runTest() },
          test.state === "loading" ? t("testing") : t("testConnection"),
        ),
        React.createElement(
          Button,
          { size: "sm", variant: "primary", disabled: save.state === "loading", onClick: () => void saveModel() },
          t("saveModel"),
        ),
        test.state === "ready" && test.ok
          ? React.createElement(
              "span",
              { className: "ss-status", "data-tone": "success" },
              React.createElement(StateDot, { state: "done", size: 8 }),
              t("testSuccess"),
            )
          : null,
      ),
      test.state === "ready" && !test.ok
        ? React.createElement(InlineNote, { tone: "error" }, t("testFailed", { error: test.message }))
        : null,
      test.state === "error"
        ? React.createElement(InlineNote, { tone: "error" }, t("testFailed", { error: test.message }))
        : null,
      save.state === "saved" ? React.createElement(InlineNote, { tone: "success" }, save.message) : null,
      save.state === "error" ? React.createElement(InlineNote, { tone: "error" }, save.message) : null,
    ),
  );
}

function ConnectionSection({ c }) {
  const { t, settings, host, runtimeRunning, runtimeManaged, busy } = c;
  const [draft, setDraft] = React.useState({ apiBaseUrl: settings.apiBaseUrl, backendDir: settings.backendDir });
  const dirty = React.useRef(false);

  React.useEffect(() => {
    if (dirty.current) return;
    setDraft({ apiBaseUrl: settings.apiBaseUrl, backendDir: settings.backendDir });
  }, [settings.apiBaseUrl, settings.backendDir]);

  const update = (field, value) => {
    dirty.current = true;
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return React.createElement(
    "div",
    { className: "ss-settings__group" },
    React.createElement("h2", { className: "ss-settings__group-title" }, t("settingsConnectionTitle")),
    React.createElement("p", { className: "ss-settings__group-hint" }, t("settingsConnectionHint")),
    React.createElement(
      "div",
      { className: "ss-summary-grid" },
      React.createElement(FieldRow, {
        label: t("runtimeProcess"),
        value: `${runtimeRunning ? t("runtimeRunning") : t("runtimeStopped")} · ${
          runtimeManaged ? t("runtimeManaged") : t("runtimeExternal")
        }`,
      }),
      React.createElement(FieldRow, { label: t("portLabel"), value: String(host?.port ?? "—") }),
    ),
    React.createElement(
      "div",
      { className: "ss-form" },
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement("label", { className: "ss-form__label", htmlFor: "suhuang-api-base-url" }, t("apiAddress")),
        React.createElement("input", {
          id: "suhuang-api-base-url",
          className: "ss-input",
          value: draft.apiBaseUrl,
          onChange: (event) => update("apiBaseUrl", event.target.value),
          spellCheck: false,
        }),
        React.createElement("p", { className: "ss-form__hint" }, t("apiAddressHint")),
      ),
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement("label", { className: "ss-form__label", htmlFor: "suhuang-backend-dir" }, t("backendDir")),
        React.createElement("input", {
          id: "suhuang-backend-dir",
          className: "ss-input",
          value: draft.backendDir,
          placeholder: "~/.local/suhuang-scroll",
          onChange: (event) => update("backendDir", event.target.value),
          spellCheck: false,
        }),
        React.createElement("p", { className: "ss-form__hint" }, t("backendDirHint")),
      ),
      React.createElement(
        "div",
        { className: "ss-actions" },
        React.createElement(
          Button,
          {
            size: "sm",
            variant: "outline",
            disabled: Boolean(busy.save),
            onClick: async () => {
              try {
                await c.saveConnectionSetting({ apiBaseUrl: draft.apiBaseUrl, backendDir: draft.backendDir });
                dirty.current = false;
              } catch {
                // The controller already surfaced the failure inline.
              }
            },
          },
          t("save"),
        ),
        runtimeRunning
          ? React.createElement(
              Button,
              { size: "sm", variant: "ghost", disabled: Boolean(busy.runtime), onClick: () => c.restartBackend() },
              t("restartService"),
            )
          : React.createElement(
              Button,
              {
                size: "sm",
                variant: "primary",
                disabled: Boolean(busy.runtime),
                onClick: () => void c.startBackend(),
              },
              t("startService"),
            ),
        runtimeManaged
          ? React.createElement(
              Button,
              { size: "sm", variant: "ghost", disabled: Boolean(busy.runtime), onClick: () => c.stopBackend() },
              t("stopService"),
            )
          : null,
      ),
      !runtimeManaged && runtimeRunning
        ? React.createElement("p", { className: "ss-form__hint" }, t("externalServiceHint"))
        : null,
    ),
  );
}

function ExtensionSection({ c }) {
  const { t, host } = c;
  const data = host?.readiness?.supported === true ? host.readiness.data : null;
  const extension = data?.extension ?? null;
  const clients = Array.isArray(extension?.clients) ? extension.clients : [];
  const client = clients.find((entry) => entry.state === "connected") ?? clients[0] ?? null;
  const connected = Boolean(extension?.connected);
  const site = client?.active_site ?? null;

  return React.createElement(
    "div",
    { className: "ss-settings__group" },
    React.createElement("h2", { className: "ss-settings__group-title" }, t("extensionSectionTitle")),
    React.createElement("p", { className: "ss-settings__group-hint" }, t("extensionSectionHint")),
    React.createElement(
      "div",
      { className: "ss-summary-grid" },
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement("span", { className: "ss-field-row__label" }, t("extensionSectionTitle")),
        React.createElement(
          "span",
          { className: "ss-status", "data-tone": connected ? "success" : data ? "attention" : "neutral" },
          React.createElement(StateDot, { state: connected ? "done" : "warning", size: 8 }),
          data
            ? connected
              ? t("extensionConnected")
              : t("extensionMissing")
            : t("checkDetailUnknown"),
        ),
      ),
      React.createElement(FieldRow, {
        label: t("extensionVersionLabel"),
        value: client?.version ?? "—",
        muted: !client,
      }),
      React.createElement(FieldRow, {
        label: t("extensionProtocolLabel"),
        value: client ? `${client.protocol_version}${client.protocol_compatible ? "" : ` · ${t("protocolMismatchShort")}`}` : "—",
        muted: !client,
      }),
      React.createElement(FieldRow, {
        label: t("extensionConsentLabel"),
        value:
          client?.data_consent_granted === true
            ? t("extensionConsentOk")
            : client?.data_consent_granted === false
              ? t("extensionConsentMissing")
              : "—",
        muted: client?.data_consent_granted !== true,
      }),
      React.createElement(FieldRow, {
        label: t("extensionSiteLabel"),
        value: site?.host ? `${site.host}${site.matched_adapter_id ? `（${site.matched_adapter_id}）` : ""}` : t("extensionSiteNone"),
        muted: !site?.host,
      }),
    ),
    !data ? React.createElement(InlineNote, null, t("readinessUnsupported")) : null,
    client?.protocol_compatible === false
      ? React.createElement(InlineNote, { tone: "error" }, t("guidanceProtocolBody"))
      : null,
    React.createElement(
      "details",
      { className: "ss-details" },
      React.createElement("summary", null, t("extensionInstallTitle")),
      React.createElement(
        "div",
        { className: "ss-details__body" },
        React.createElement("p", { className: "ss-note" }, t("extensionInstallSteps")),
        React.createElement("p", { className: "ss-note" }, t("extensionReloadSteps")),
        React.createElement("p", { className: "ss-note" }, t("extensionConsentSteps")),
        React.createElement("p", { className: "ss-note" }, t("docsConsoleHint")),
      ),
    ),
  );
}

/**
 * One-time setup page in DSH Settings: readiness, model service, connection,
 * Chrome extension status. Grading controls and spec/site selection live in the
 * console, so there is exactly one editor per field.
 */
export function SettingsSection(props) {
  const { locale } = props;
  const modelRef = React.useRef(null);
  const c = useConsole(locale);

  const handleFix = (fix) => {
    if (fix.intent === "open_model_settings") {
      modelRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      return;
    }
    if (fix.intent === "open_spec_settings" || fix.intent === "open_adapter_settings") {
      openConsole();
      return;
    }
    void c.runFix(fix);
  };

  const openConsole = () => {
    const opened = props.onOpenConsole?.();
    if (opened === false) {
      c.show(c.t("settingsConsoleUnavailable"), "error");
      return;
    }
    props.close?.();
  };

  const unstable = c.settingsStatus !== "ready" || !c.settingsWritable;

  return React.createElement(
    "div",
    { className: "ss-settings", "data-testid": "suhuang-scroll-settings" },
    React.createElement(
      "div",
      { className: "ss-settings__head" },
      React.createElement("h1", { className: "ss-settings__title" }, c.t("settingsTitle")),
      React.createElement("p", { className: "ss-settings__description" }, c.t("settingsDescription")),
    ),
    unstable
      ? React.createElement(
          InlineNote,
          null,
          c.settingsStatus !== "ready" ? c.t("settingsUnavailable") : c.t("settingsReadOnly"),
        )
      : null,
    React.createElement(
      Section,
      { title: c.t("settingsEnvTitle"), hint: c.t("settingsEnvHint") },
      React.createElement(ReadinessList, {
        rows: c.readiness.rows,
        t: c.t,
        describe: (row) =>
          describeRow(row, { host: c.host, catalog: c.catalog, settings: c.settings }, c.t),
        fixLabel: c.fixLabel,
        onFix: handleFix,
        disabled: Boolean(c.busy.runtime),
      }),
      !c.readiness.supported ? React.createElement(InlineNote, null, c.t("readinessUnsupported")) : null,
    ),
    React.createElement(ModelForm, { c, sectionRef: modelRef }),
    React.createElement(ConnectionSection, { c }),
    React.createElement(ExtensionSection, { c }),
    React.createElement(
      "div",
      { className: "ss-settings__group" },
      React.createElement("h2", { className: "ss-settings__group-title" }, c.t("settingsGradingTitle")),
      React.createElement("p", { className: "ss-settings__group-hint" }, c.t("settingsGradingHint")),
      React.createElement(
        "div",
        { className: "ss-summary-grid" },
        React.createElement(FieldRow, {
          label: c.t("defaultSpec"),
          value: c.hasSpec
            ? safeBasename(c.settings.defaultSpec || c.catalog.specs?.[0]?.value || "")
            : c.t("settingsNoSpec"),
          muted: !c.hasSpec,
        }),
        React.createElement(FieldRow, {
          label: c.t("defaultAdapter"),
          value: c.adapterLabel || c.t("followRuntimeUnknown"),
          muted: !c.adapterLabel,
        }),
      ),
      React.createElement(
        Button,
        { size: "sm", variant: "primary", onClick: openConsole },
        c.t("settingsOpenConsole"),
      ),
    ),
    React.createElement(NewSiteHelp, { t: c.t, show: c.show }),
    React.createElement(
      "div",
      { className: "ss-settings__group" },
      React.createElement("h2", { className: "ss-settings__group-title" }, c.t("docsTitle")),
      React.createElement("p", { className: "ss-settings__group-hint" }, c.t("settingsDocsHint")),
      React.createElement(DocsLinks, { t: c.t, show: c.show }),
    ),
    React.createElement(ConsoleSurfaces, { c, withConfigSheet: false }),
    React.createElement(
      "details",
      { className: "ss-details" },
      React.createElement("summary", null, c.t("connectionDetails")),
      React.createElement(
        "div",
        { className: "ss-details__body" },
        React.createElement(
          "dl",
          { className: "ss-detail-grid" },
          React.createElement("dt", null, c.t("apiAddress")),
          React.createElement("dd", null, c.settings.apiBaseUrl),
          React.createElement("dt", null, c.t("pidLabel")),
          React.createElement("dd", null, String(c.host?.process?.pid ?? "—")),
          React.createElement("dt", null, c.t("pluginVersionLabel")),
          React.createElement("dd", null, String(c.host?.host?.pluginVersion ?? "—")),
          React.createElement("dt", null, c.t("protocolExpectedLabel")),
          React.createElement("dd", null, String(c.host?.host?.expectedProtocol ?? "—")),
        ),
      ),
    ),
  );
}
