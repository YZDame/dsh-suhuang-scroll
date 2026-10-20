import React from "react";

import { Button, Modal, StateDot, writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";

import { NS } from "../i18n.js";

/** Subscribe to the locale revision and return a translate function. */
export function useT(locale) {
  const subscribe = React.useCallback((listener) => locale.subscribe(listener), [locale]);
  const getRevision = React.useCallback(() => locale.getSnapshot().revision, [locale]);
  React.useSyncExternalStore(subscribe, getRevision, getRevision);
  return locale.bind(NS);
}

const PHASE_BADGE = {
  offline: { key: "badgeOffline", tone: "neutral" },
  setup: { key: "badgeSetup", tone: "attention" },
  ready: { key: "badgeReady", tone: "success" },
  starting: { key: "badgeStarting", tone: "attention" },
  running: { key: "badgeRunning", tone: "attention" },
  pausing: { key: "badgePausing", tone: "attention" },
  paused: { key: "badgePaused", tone: "attention" },
  awaiting: { key: "badgeAwaiting", tone: "attention" },
  error: { key: "badgeError", tone: "error" },
  completed: { key: "badgeCompleted", tone: "success" },
  ended: { key: "badgeEnded", tone: "neutral" },
  loading: { key: "loading", tone: "neutral" },
};

export function phaseBadge(phase) {
  return PHASE_BADGE[phase] ?? PHASE_BADGE.offline;
}

export function StatusPill({ phase, t }) {
  const badge = phaseBadge(phase);
  const state =
    badge.tone === "success"
      ? "done"
      : badge.tone === "error"
        ? "error"
        : badge.tone === "attention"
          ? "warning"
          : "idle";
  return React.createElement(
    "span",
    { className: "ss-status", "data-tone": badge.tone, role: "status", "aria-live": "polite" },
    React.createElement(StateDot, { state, size: 8 }),
    t(badge.key),
  );
}

export function Section({ title, hint, actions, children }) {
  return React.createElement(
    "section",
    { className: "ss-section" },
    title || actions
      ? React.createElement(
          "div",
          { className: "ss-section__head" },
          React.createElement(
            "div",
            null,
            title ? React.createElement("h2", { className: "ss-section__title" }, title) : null,
            hint ? React.createElement("p", { className: "ss-section__hint" }, hint) : null,
          ),
          actions ? React.createElement("div", { className: "ss-actions ss-actions--end" }, actions) : null,
        )
      : null,
    children,
  );
}

export function FieldRow({ label, value, muted = false, title }) {
  return React.createElement(
    "div",
    { className: "ss-field-row" },
    React.createElement("span", { className: "ss-field-row__label" }, label),
    React.createElement(
      "span",
      {
        className: `ss-field-row__value${muted ? " ss-field-row__value--muted" : ""}`,
        title: title ?? (typeof value === "string" ? value : undefined),
      },
      value,
    ),
  );
}

export function InlineNote({ children, tone = "muted" }) {
  if (!children) return null;
  const className =
    tone === "error" ? "ss-note ss-note--error" : tone === "success" ? "ss-note ss-note--success" : "ss-note";
  return React.createElement("p", { className, role: tone === "error" ? "alert" : undefined }, children);
}

export function FormRow({ label, hint, children, htmlFor }) {
  return React.createElement(
    "div",
    { className: "ss-form__row" },
    label ? React.createElement("label", { className: "ss-form__label", htmlFor }, label) : null,
    children,
    hint ? React.createElement("p", { className: "ss-form__hint" }, hint) : null,
  );
}

export function SelectField({ id, label, hint, value, options, onChange, disabled }) {
  return React.createElement(
    FormRow,
    { label, hint, htmlFor: id },
    React.createElement(
      "div",
      { className: "ss-select-wrap" },
      React.createElement(
        "select",
        { id, className: "ss-select", value, disabled, onChange },
        ...options.map((option, index) =>
          React.createElement(
            "option",
            { key: `${id}-${option.value || "empty"}-${index}`, value: option.value },
            option.label,
          ),
        ),
      ),
    ),
  );
}

export function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  autoComplete,
}) {
  return React.createElement(
    FormRow,
    { label, hint, htmlFor: id },
    React.createElement("input", {
      id,
      className: "ss-input",
      value,
      type,
      placeholder,
      autoComplete,
      spellCheck: false,
      disabled,
      onChange,
    }),
  );
}

export function NoticeBar({ notice }) {
  if (!notice?.text) return null;
  return React.createElement(
    "div",
    {
      className: "ss-surface",
      "data-tone": notice.tone,
      role: notice.tone === "error" ? "alert" : "status",
      style: { padding: "10px 12px", gap: 0 },
    },
    React.createElement("p", { className: "ss-surface__body", style: { margin: 0 } }, notice.text),
  );
}

/** Local toast/notice hook: one per mounted surface, auto-dismissed. */
export function useNotice() {
  const [notice, setNotice] = React.useState(null);
  const timer = React.useRef(null);
  const show = React.useCallback((text, tone = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setNotice({ text, tone, id: Date.now() });
    timer.current = setTimeout(() => setNotice(null), 4200);
  }, []);
  const clear = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setNotice(null);
  }, []);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return { notice, show, clear };
}

/** A stop glyph: the host icon set has no square, and text-only would be weaker. */
export function StopIcon({ size = 14 }) {
  return React.createElement(
    "svg",
    { width: size, height: size, viewBox: "0 0 16 16", "aria-hidden": "true", focusable: "false" },
    React.createElement("rect", { x: 3.5, y: 3.5, width: 9, height: 9, rx: 1.5, fill: "currentColor" }),
  );
}

/** Copy text and report the outcome through the caller's notice hook. */
export async function copyText(text, show, t) {
  try {
    const written = await writeClipboard(String(text ?? ""));
    if (written === false) {
      show(t("toastCopyFailed"), "error");
      return;
    }
    show(t("toastCopied"));
  } catch {
    show(t("toastCopyFailed"), "error");
  }
}

const DOC_LINKS = [
  {
    key: "docsRuntime",
    url: "https://github.com/YZDame/SuhuangScroll/blob/main/docs/install-upgrade-uninstall.md",
  },
  {
    key: "docsExtension",
    url: "https://github.com/YZDame/SuhuangScroll#%E5%AE%89%E8%A3%85%E6%8C%87%E5%8D%97",
  },
  {
    key: "docsSite",
    url: "https://github.com/YZDame/SuhuangScroll/blob/main/docs/site-adapter-sdk.md",
  },
];

export function DocsLinks({ t, show }) {
  return React.createElement(
    "div",
    { className: "ss-form" },
    ...DOC_LINKS.map((doc) =>
      React.createElement(
        "div",
        { key: doc.key, className: "ss-form__inline" },
        React.createElement(
          "a",
          {
            className: "ss-link",
            href: doc.url,
            target: "_blank",
            rel: "noreferrer noopener",
          },
          t(doc.key),
        ),
        React.createElement(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => void copyText(doc.url, show, t),
          },
          t("copy"),
        ),
      ),
    ),
  );
}

const GUIDANCE = {
  install_extension: { title: "guidanceInstallTitle", body: "extensionInstallSteps" },
  reload_extension: { title: "guidanceReloadTitle", body: "extensionReloadSteps" },
  upgrade_extension: { title: "guidanceUpgradeTitle", body: "extensionUpgradeSteps" },
  open_extension_consent: { title: "guidanceConsentTitle", body: "extensionConsentSteps" },
  open_model_settings: { title: "guidanceModelTitle", body: "guidanceModelBody" },
  open_grading_site: { title: "guidanceSiteTitle", body: "guidanceSiteBody" },
  set_backend_dir: { title: "guidanceBackendTitle", body: "guidanceBackendBody" },
  protocol_mismatch: { title: "guidanceProtocolTitle", body: "guidanceProtocolBody" },
  upgrade_runtime: { title: "guidanceUpgradeRuntimeTitle", body: "guidanceUpgradeRuntimeBody" },
  manual_unsupported: { title: "guidanceManualTitle", body: "guidanceManualBody" },
  docs: { title: "guidanceDocsTitle", body: "docsConsoleHint" },
};

export function GuidanceModal({ dialog, onClose, t, show }) {
  if (!dialog) return null;
  const entry = GUIDANCE[dialog.kind] ?? GUIDANCE.docs;
  return React.createElement(
    Modal,
    {
      open: true,
      onClose,
      title: t(entry.title),
      closeLabel: t("close"),
      className: "ss-modal",
      footer: React.createElement(
        Button,
        { variant: "primary", size: "sm", onClick: onClose },
        t("guidanceClose"),
      ),
    },
    React.createElement(
      "div",
      { className: "ss-sheet" },
      React.createElement("p", { className: "ss-surface__body" }, t(entry.body)),
      dialog.kind === "docs" || dialog.showDocs !== false
        ? React.createElement(DocsLinks, { t, show })
        : null,
    ),
  );
}
