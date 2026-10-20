import React from "react";

import { Button, Modal } from "@deepseek-ai/dsh-client-ui-primitives";

import { copyText, InlineNote } from "./common.jsx";

export function ConfirmModal({ confirm, onClose, t }) {
  if (!confirm) return null;
  return React.createElement(
    Modal,
    {
      open: true,
      onClose,
      title: confirm.title,
      closeLabel: t("cancel"),
      className: "ss-modal",
      footer: React.createElement(
        "div",
        { className: "ss-sheet__footer" },
        React.createElement(Button, { size: "sm", variant: "outline", onClick: onClose }, t("cancel")),
        React.createElement(
          Button,
          {
            size: "sm",
            variant: "primary",
            "data-modal-autofocus": true,
            onClick: async () => {
              onClose();
              await confirm.action();
            },
          },
          confirm.confirmLabel ?? t("save"),
        ),
      ),
    },
    React.createElement(
      "div",
      { className: "ss-sheet" },
      React.createElement("p", { className: "ss-surface__body" }, confirm.body ?? ""),
    ),
  );
}

export function ImportSpecDialog({ open, onClose, onImport, t, busy = false }) {
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) {
      setMessage("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    setError("");
    try {
      const imported = await onImport(file);
      setMessage(t("importSuccess", { name: imported?.label ?? file.name }));
    } catch (cause) {
      setError(t("importFailed", { error: cause instanceof Error ? cause.message : String(cause) }));
    }
  };

  return React.createElement(
    Modal,
    {
      open: true,
      onClose,
      title: t("specImportTitle"),
      closeLabel: t("close"),
      className: "ss-modal",
      footer: React.createElement(
        Button,
        { size: "sm", variant: "primary", onClick: onClose },
        t("guidanceClose"),
      ),
    },
    React.createElement(
      "div",
      { className: "ss-sheet" },
      React.createElement(
        "div",
        { className: "ss-form__row" },
        React.createElement(
          "button",
          {
            type: "button",
            className: "ss-input",
            "data-modal-autofocus": true,
            style: { cursor: busy ? "progress" : "pointer", textAlign: "left" },
            disabled: busy,
            onClick: () => inputRef.current?.click(),
          },
          busy ? t("importingSpec") : t("importSpec"),
        ),
        React.createElement("input", {
          ref: inputRef,
          type: "file",
          accept: ".md,text/markdown",
          hidden: true,
          onChange: handleFile,
        }),
        React.createElement("p", { className: "ss-form__hint" }, t("importHint")),
      ),
      message ? React.createElement(InlineNote, { tone: "success" }, message) : null,
      error ? React.createElement(InlineNote, { tone: "error" }, error) : null,
    ),
  );
}

export function NewSiteHelp({ t, show }) {
  return React.createElement(
    "details",
    { className: "ss-details" },
    React.createElement("summary", null, t("newSite")),
    React.createElement(
      "div",
      { className: "ss-details__body" },
      React.createElement("p", { className: "ss-note" }, t("newSiteHint")),
      React.createElement(
        "label",
        { className: "ss-form__label", htmlFor: "suhuang-adapter-prompt" },
        t("agentPrompt"),
      ),
      React.createElement("textarea", {
        id: "suhuang-adapter-prompt",
        className: "ss-prompt",
        readOnly: true,
        value: t("adapterPrompt"),
        rows: 6,
        onFocus: (event) => event.target.select(),
      }),
      React.createElement(
        Button,
        {
          size: "sm",
          variant: "outline",
          onClick: () => void copyText(t("adapterPrompt"), show, t),
        },
        t("copy"),
      ),
    ),
  );
}
