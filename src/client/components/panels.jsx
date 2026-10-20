import React from "react";

import { Button } from "@deepseek-ai/dsh-client-ui-primitives";

import { copyText, FieldRow, InlineNote, Section } from "./common.jsx";
import { NewSiteHelp } from "./dialogs.jsx";
import { ReadinessList } from "./ReadinessList.jsx";
import { formatDuration, safeBasename } from "../model.js";
import { describeRow, firstBlockingFix } from "../describe.js";

function ConfigSummary({ c }) {
  const { t, settings, catalog, runView, adapterLabel } = c;
  const specs = catalog.specs ?? [];
  const spec = c.hasSpec
    ? safeBasename(settings.defaultSpec || specs[0]?.value || "")
    : t("specDetailNone");
  return React.createElement(
    "div",
    { className: "ss-summary-grid" },
    React.createElement(FieldRow, {
      label: t("defaultSpec"),
      value: spec,
      muted: !c.hasSpec,
      title: settings.defaultSpec || specs[0]?.value || "",
    }),
    React.createElement(FieldRow, {
      label: t("defaultAdapter"),
      value: adapterLabel || t("followRuntimeUnknown"),
      muted: !adapterLabel,
    }),
    React.createElement(FieldRow, {
      label: t("submitModeLabel"),
      value: t(settings.submitMode === "manual_confirm" ? "manualConfirm" : "autoSubmit"),
    }),
    React.createElement(FieldRow, {
      label: t("confidenceLabel"),
      value: Number(settings.confidenceThreshold).toFixed(2),
    }),
  );
}

function PrimaryActionBar({ c, onConfigure, secondary = [] }) {
  const { t, primaryAction } = c;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "ss-primary-block" },
      React.createElement(
        Button,
        {
          className: "ss-btn--hero",
          size: "md",
          variant: "primary",
          disabled: primaryAction.disabled,
          onClick: () => void primaryAction.onClick?.(),
        },
        primaryAction.label,
      ),
      React.createElement(
        Button,
        { size: "md", variant: "outline", onClick: onConfigure },
        t("configure"),
      ),
      ...secondary,
    ),
    primaryAction.hint
      ? React.createElement("p", { className: "ss-primary-block__hint" }, primaryAction.hint)
      : null,
  );
}

export function OfflinePanel({ c, onConfigure }) {
  const { t } = c;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "ss-surface" },
      React.createElement(
        "h2",
        { className: "ss-run__title" },
        c.connection === "reconnecting" ? t("reconnectingTitle") : t("serviceTitle"),
      ),
      React.createElement(
        "p",
        { className: "ss-run__description" },
        c.connection === "reconnecting" ? t("reconnectingDescription") : t("serviceDescription"),
      ),
      c.state?.lastError
        ? React.createElement(InlineNote, { tone: "error" }, t("runtimeUnavailable", { error: c.state.lastError }))
        : null,
      React.createElement(
        "div",
        { className: "ss-actions" },
        React.createElement(
          Button,
          {
            size: "md",
            variant: "primary",
            disabled: Boolean(c.busy.runtime),
            onClick: () => void c.startBackend(),
          },
          c.busy.runtime ? t("startProductPending") : t("startProduct"),
        ),
        React.createElement(Button, { size: "md", variant: "outline", onClick: () => void c.refresh() }, t("refresh")),
      ),
    ),
    React.createElement("p", { className: "ss-note" }, t("startProductHint")),
  );
}

export function SetupPanel({ c, onConfigure }) {
  const { t, readiness, readiness: { rows }, show } = c;
  const first = firstBlockingFix(rows);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "ss-run__headline" },
      React.createElement("h2", { className: "ss-run__title" }, t("setupTitle")),
    ),
    React.createElement(
      Section,
      { title: t("checklistTitle") },
      React.createElement(ReadinessList, {
        rows,
        t,
        describe: (row) => describeRow(row, { host: c.host, catalog: c.catalog, settings: c.settings }, t),
        fixLabel: c.fixLabel,
        onFix: c.runFix,
        disabled: Boolean(c.busy.runtime),
      }),
      !readiness.supported ? React.createElement(InlineNote, null, t("readinessUnsupported")) : null,
    ),
    React.createElement(
      Section,
      { title: t("runConfigLabel") },
      React.createElement(ConfigSummary, { c }),
    ),
    React.createElement(PrimaryActionBar, {
      c,
      onConfigure,
      secondary: first && first.fix.intent === "import_spec"
        ? []
        : [
            React.createElement(
              Button,
              { key: "import", size: "md", variant: "ghost", onClick: () => c.setImportOpen(true) },
              t("importSpec"),
            ),
          ],
    }),
    React.createElement(NewSiteHelp, { t, show }),
  );
}

export function ReadyPanel({ c, onConfigure }) {
  const { t, readiness, readiness: { rows } } = c;
  const [expanded, setExpanded] = React.useState(false);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "ss-summary-grid" },
      React.createElement(ConfigSummary, { c }),
    ),
    React.createElement(PrimaryActionBar, { c, onConfigure }),
    React.createElement(
      "details",
      {
        className: "ss-details",
        open: expanded,
        onToggle: (event) => setExpanded(event.currentTarget.open),
      },
      React.createElement(
        "summary",
        null,
        t("checklistTitle"),
        " · ",
        t("badgeReady"),
      ),
      React.createElement(ReadinessList, {
        rows,
        t,
        describe: (row) => describeRow(row, { host: c.host, catalog: c.catalog, settings: c.settings }, t),
        fixLabel: c.fixLabel,
        onFix: c.runFix,
      }),
    ),
    !readiness.supported ? React.createElement(InlineNote, null, t("readinessUnsupported")) : null,
    c.state.host?.automation?.run ? React.createElement("p", { className: "ss-note" }, t("runNoTotalHint")) : null,
  );
}

export function SummaryPanel({ c, onConfigure }) {
  const { t, runView, show, host } = c;
  const { metrics, run } = runView;
  const last = c.runView.run?.last_record ?? null;
  const completed = c.phase === "completed";
  const summaryText = [
    completed ? t("summaryTitleCompleted") : t("summaryTitleEnded"),
    `${t("runCompleted")}: ${metrics.completed} ${t("papersUnit")}`,
    `${t("runWarnings")}: ${metrics.warnings} ${t("papersUnit")}`,
    `${t("runElapsed")}: ${formatDuration(metrics.elapsed)}`,
    metrics.average ? `${t("runAverage")}: ${formatDuration(metrics.average)}` : "",
    run?.spec_path ? `${t("defaultSpec")}: ${safeBasename(run.spec_path)}` : "",
    run?.adapter ? `${t("defaultAdapter")}: ${run.adapter}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "ss-surface" },
      React.createElement(
        "h2",
        { className: "ss-run__title" },
        completed ? t("summaryTitleCompleted") : t("summaryTitleEnded"),
      ),
      React.createElement("p", { className: "ss-run__description" }, t("summaryDescription")),
      React.createElement(
        "div",
        { className: "ss-metrics" },
        React.createElement(Metric, { value: `${metrics.completed}`, label: t("runCompleted") }),
        React.createElement(Metric, { value: `${metrics.warnings}`, label: t("runWarnings") }),
        React.createElement(Metric, { value: formatDuration(metrics.elapsed), label: t("runElapsed") }),
        React.createElement(Metric, {
          value: metrics.average ? formatDuration(metrics.average) : "—",
          label: t("runAverage"),
        }),
      ),
      React.createElement(
        "p",
        { className: "ss-note" },
        last && typeof last.suggested_score === "number"
          ? `${t("summaryLastScore", { score: last.suggested_score })}${
              typeof last.confidence === "number"
                ? ` · ${t("summaryLastConfidence", { value: last.confidence.toFixed(2) })}`
                : ""
            }`
          : t("summaryNoRecord"),
      ),
    ),
    React.createElement(
      "div",
      { className: "ss-actions" },
      React.createElement(
        Button,
        {
          className: "ss-btn--hero",
          size: "md",
          variant: "primary",
          disabled: Boolean(c.busy.start) || !c.hasSpec,
          onClick: () => void c.startGradingFlow(),
        },
        t("startNewRound"),
      ),
      React.createElement(
        Button,
        {
          size: "md",
          variant: "outline",
          onClick: () => void copyText(summaryText, show, t),
        },
        t("summaryCopy"),
      ),
      React.createElement(Button, { size: "md", variant: "ghost", onClick: onConfigure }, t("configure")),
      React.createElement(Button, { size: "md", variant: "ghost", onClick: () => void c.refresh() }, t("refresh")),
    ),
  );
}

function Metric({ value, label }) {
  return React.createElement(
    "div",
    { className: "ss-metric" },
    React.createElement("span", { className: "ss-metric__value" }, value),
    React.createElement("span", { className: "ss-metric__label" }, label),
  );
}

export { Metric, ConfigSummary };
