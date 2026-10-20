import React from "react";

import { Button, Modal, SegmentedControl, StateDot } from "@deepseek-ai/dsh-client-ui-primitives";

import { InlineNote } from "./common.jsx";
import { effectiveDefaultSpec, friendlyProviderMessage, isRunActive, safeBasename } from "../model.js";

/**
 * The console's configuration sheet. It edits only the fields the console owns
 * (spec, site, submit mode, confidence). Model credentials and the backend
 * address have a single editor in the DSH settings section, so the two surfaces
 * can never disagree about the same value.
 */
export function ConfigSheet({ open, onClose, console: c }) {
  const { t, settings, catalog, busy, updateSetting, importFile, testModelForm, phase } = c;
  const locked = isRunActive(phase);
  const [importing, setImporting] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [modelTest, setModelTest] = React.useState({ state: "idle", ok: null, message: "" });
  const [confidence, setConfidence] = React.useState(settings.confidenceThreshold);
  const committedConfidence = React.useRef(settings.confidenceThreshold);
  const confidenceTimer = React.useRef(null);
  const draggingConfidence = React.useRef(false);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (draggingConfidence.current) return;
    setConfidence(settings.confidenceThreshold);
    committedConfidence.current = settings.confidenceThreshold;
  }, [settings.confidenceThreshold]);

  React.useEffect(
    () => () => {
      if (confidenceTimer.current) clearTimeout(confidenceTimer.current);
    },
    [],
  );

  const flushConfidence = (value) => {
    if (confidenceTimer.current) clearTimeout(confidenceTimer.current);
    if (value === committedConfidence.current) return;
    committedConfidence.current = value;
    void change({ confidenceThreshold: value });
  };

  const changeConfidence = (value) => {
    setConfidence(value);
    draggingConfidence.current = true;
    if (confidenceTimer.current) clearTimeout(confidenceTimer.current);
    confidenceTimer.current = setTimeout(() => {
      draggingConfidence.current = false;
      flushConfidence(value);
    }, 400);
  };

  React.useEffect(() => {
    if (!open) {
      setMessage("");
      setError("");
      setModelTest({ state: "idle", ok: null, message: "" });
    }
  }, [open]);

  if (!open) return null;

  const specs = catalog.specs ?? [];
  const adapters = catalog.resources?.adapters ?? [];
  const specOptions = specs.length
    ? specs.map((spec) => ({ value: spec.value, label: spec.label || safeBasename(spec.value) }))
    : [{ value: "", label: t("specEmpty") }];
  const defaultAdapterLabel =
    adapters.find((adapter) => adapter.value === catalog.resources?.defaultAdapter)?.label ??
    catalog.resources?.defaultAdapter ??
    "";
  const adapterOptions = [
    {
      value: "",
      label: defaultAdapterLabel
        ? t("followRuntime", { value: defaultAdapterLabel })
        : t("followRuntimeUnknown"),
    },
    ...adapters.map((adapter) => ({ value: adapter.value, label: adapter.label || adapter.value })),
  ];
  const specValue = effectiveDefaultSpec(settings, specs);

  const change = async (patch) => {
    setError("");
    try {
      await updateSetting(patch);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const imported = await importFile(file);
      setMessage(t("importSuccess", { name: imported?.label ?? file.name }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setImporting(false);
    }
  };

  const runModelTest = async () => {
    setModelTest({ state: "loading", ok: null, message: "" });
    try {
      const result = await testModelForm({});
      const ok = result?.connection_test?.ok === true;
      setModelTest({
        state: "ready",
        ok,
        message: ok ? "" : friendlyProviderMessage(result?.connection_test?.message ?? "", t),
      });
    } catch (cause) {
      setModelTest({ state: "error", ok: false, message: cause instanceof Error ? cause.message : String(cause) });
    }
  };

  return React.createElement(
    Modal,
    {
      open: true,
      onClose,
      title: t("configTitle"),
      closeLabel: t("close"),
      className: "ss-modal",
      footer: React.createElement(
        Button,
        { size: "sm", variant: "primary", onClick: onClose },
        t("configDone"),
      ),
    },
    React.createElement(
      "div",
      { className: "ss-sheet" },
      React.createElement("p", { className: "ss-form__hint" }, t("configDescription")),
      locked ? React.createElement(InlineNote, null, t("configLockedDuringRun")) : null,

      React.createElement(
        "div",
        { className: "ss-sheet__group" },
        React.createElement("h3", { className: "ss-sheet__title" }, t("specSelectLabel")),
        React.createElement(
          "div",
          { className: "ss-select-wrap" },
          React.createElement(
            "select",
            {
              className: "ss-select",
              value: specValue,
              "aria-label": t("specSelectLabel"),
              "data-modal-autofocus": true,
              disabled: locked || busy.save || specs.length === 0,
              onChange: (event) => void change({ defaultSpec: event.target.value }),
            },
            ...specOptions.map((option, index) =>
              React.createElement(
                "option",
                { key: `spec-${index}`, value: option.value },
                option.label,
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "ss-form__inline" },
          React.createElement(
            Button,
            { size: "sm", variant: "outline", onClick: () => fileRef.current?.click(), disabled: importing },
            importing ? t("importingSpec") : t("importSpec"),
          ),
          React.createElement("input", {
            ref: fileRef,
            type: "file",
            accept: ".md,text/markdown",
            hidden: true,
            onChange: handleImport,
          }),
          React.createElement("span", { className: "ss-form__hint", style: { margin: 0 } }, t("importHint")),
        ),
        message ? React.createElement(InlineNote, { tone: "success" }, message) : null,
      ),

      React.createElement(
        "div",
        { className: "ss-sheet__group" },
        React.createElement("h3", { className: "ss-sheet__title" }, t("adapterSelectLabel")),
        React.createElement(
          "div",
          { className: "ss-select-wrap" },
          React.createElement(
            "select",
            {
              className: "ss-select",
              value: settings.adapter,
              "aria-label": t("adapterSelectLabel"),
              disabled: locked || busy.save,
              onChange: (event) => void change({ adapter: event.target.value }),
            },
            ...adapterOptions.map((option, index) =>
              React.createElement(
                "option",
                { key: `adapter-${index}`, value: option.value },
                option.label,
              ),
            ),
          ),
        ),
        adapters.length === 0 ? React.createElement("p", { className: "ss-form__hint" }, t("adapterEmpty")) : null,
      ),

      React.createElement(
        "div",
        { className: "ss-sheet__group" },
        React.createElement("h3", { className: "ss-sheet__title" }, t("submitModeLabel")),
        React.createElement(SegmentedControl, {
          id: "suhuang-submit-mode",
          label: t("submitModeLabel"),
          value: settings.submitMode,
          disabled: locked || busy.save,
          options: [
            { value: "auto_submit", label: t("autoSubmit") },
            { value: "manual_confirm", label: t("manualConfirm") },
          ],
          onChange: (value) => void change({ submitMode: value }),
        }),
        React.createElement(
          "p",
          { className: "ss-form__hint" },
          settings.submitMode === "manual_confirm" ? t("manualConfirmHint") : t("autoSubmitHint"),
        ),
      ),

      React.createElement(
        "div",
        { className: "ss-sheet__group" },
        React.createElement(
          "div",
          { className: "ss-switch-row" },
          React.createElement("h3", { className: "ss-sheet__title" }, t("confidenceLabel")),
          React.createElement(
            "span",
            { className: "ss-tabular", style: { fontSize: 14 } },
            Number(confidence).toFixed(2),
          ),
        ),
        React.createElement("input", {
          className: "ss-range",
          type: "range",
          min: 0,
          max: 1,
          step: 0.01,
          value: confidence,
          disabled: locked || busy.save,
          "aria-label": t("confidenceLabel"),
          onChange: (event) => changeConfidence(Number(event.target.value)),
          onPointerUp: () => {
            draggingConfidence.current = false;
            flushConfidence(confidence);
          },
          onKeyUp: () => {
            draggingConfidence.current = false;
            flushConfidence(confidence);
          },
          onBlur: () => {
            draggingConfidence.current = false;
            flushConfidence(confidence);
          },
        }),
        React.createElement("p", { className: "ss-form__hint" }, t("confidenceHint")),
      ),

      React.createElement(
        "div",
        { className: "ss-sheet__group" },
        React.createElement("h3", { className: "ss-sheet__title" }, t("configModelReadonly")),
        React.createElement(
          "p",
          { className: "ss-form__hint" },
          catalog.provider?.api_key_configured ? t("configModelEditInSettings") : t("modelDetailNoKey"),
        ),
        React.createElement(
          "div",
          { className: "ss-form__inline" },
          React.createElement(
            Button,
            {
              size: "sm",
              variant: "outline",
              onClick: () => void runModelTest(),
              disabled: modelTest.state === "loading" || busy.modelTest,
            },
            modelTest.state === "loading" ? t("testing") : t("testConnection"),
          ),
          modelTest.state === "ready" && modelTest.ok
            ? React.createElement(
                "span",
                { className: "ss-status", "data-tone": "success" },
                React.createElement(StateDot, { state: "done", size: 8 }),
                t("testSuccess"),
              )
            : null,
        ),
        modelTest.state === "ready" && !modelTest.ok
          ? React.createElement(InlineNote, { tone: "error" }, t("testFailed", { error: modelTest.message }))
          : modelTest.state === "error"
            ? React.createElement(InlineNote, { tone: "error" }, t("testFailed", { error: modelTest.message }))
            : null,
      ),

      error ? React.createElement(InlineNote, { tone: "error" }, error) : null,
      React.createElement("p", { className: "ss-form__hint" }, t("autoSaveHint")),
    ),
  );
}
