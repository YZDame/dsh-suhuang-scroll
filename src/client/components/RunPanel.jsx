import React from "react";

import { Button, StateDot } from "@deepseek-ai/dsh-client-ui-primitives";

import { InlineNote } from "./common.jsx";
import { Metric } from "./panels.jsx";
import { formatDuration, pendingDecision, runStageLabel } from "../model.js";

const TITLE_KEY = {
  starting: "startingTitle",
  running: "gradingTitle",
  pausing: "pausingTitle",
  paused: "pausedTitle",
  awaiting: "awaitingTitle",
  error: "errorTitle",
};

const DESCRIPTION_KEY = {
  starting: "startingDescription",
  running: "gradingDescription",
  pausing: "pausingDescription",
  paused: "pausedDescription",
  awaiting: "awaitingDescription",
  error: "errorDescription",
};

function PaperTrail({ c }) {
  const { t, runView, run } = c;
  return React.createElement(
    "div",
    { className: "ss-form__row", style: { gap: 6 } },
    React.createElement(
      "div",
      { className: "ss-run__strip-label" },
      React.createElement("span", null, t("runProgressLabel")),
      React.createElement(
        "span",
        { className: "ss-tabular" },
        runView.paper ? t("runCurrentPaper", { n: runView.paper }) : "",
      ),
    ),
    React.createElement(
      "div",
      { className: "ss-trail", role: "img", "aria-label": t("runProgressLabel") },
      ...runView.trail.map((segment) =>
        segment.state === "overflow"
          ? React.createElement(
              "span",
              { key: segment.key, className: "ss-trail__paper ss-trail__paper--overflow" },
              `+${segment.count}`,
            )
          : React.createElement("span", {
              key: segment.key,
              className: `ss-trail__paper${segment.state === "active" ? " ss-trail__paper--active" : ""}`,
            }),
      ),
      runView.trail.length === 0
        ? React.createElement("span", { className: "ss-trail__empty" }, t("runNoTotalHint"))
        : null,
    ),
  );
}

function RunConfigLine({ c }) {
  const { t, runView, settings, catalog } = c;
  const adapterLabel =
    catalog.resources?.adapters?.find((adapter) => adapter.value === runView.adapter)?.label ??
    runView.adapter;
  const items = [
    [t("runSpecLabel"), runView.spec || "—"],
    [t("runAdapterLabel"), adapterLabel || "—"],
    [t("runSubmitLabel"), t(settings.submitMode === "manual_confirm" ? "manualConfirm" : "autoSubmit")],
  ];
  return React.createElement(
    "div",
    { className: "ss-run__config" },
    ...items.map(([label, value]) =>
      React.createElement(
        "span",
        { key: label, className: "ss-run__config-item" },
        React.createElement("span", null, label),
        React.createElement("span", { className: "ss-run__config-value", title: value }, value),
      ),
    ),
  );
}

function AwaitingBody({ c, pending }) {
  const { t } = c;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "ss-inline-facts" },
      pending?.score != null
        ? React.createElement("span", null, t("awaitingSuggested", { score: String(pending.score) }))
        : null,
      pending?.confidence != null
        ? React.createElement("span", null, t("awaitingConfidence", { value: pending.confidence.toFixed(2) }))
        : null,
    ),
    React.createElement(
      "div",
      { className: "ss-flags" },
      ...(pending?.flags?.length
        ? pending.flags.map((flag, index) =>
            React.createElement(
              "span",
              { key: `${index}-${flag.code || flag.message}`, className: "ss-flag" },
              React.createElement(StateDot, { state: flag.severity === "info" ? "ongoing" : "warning", size: 8 }),
              flag.message,
            ),
          )
        : [React.createElement("span", { key: "none", className: "ss-note" }, t("awaitingNoFlags"))]),
    ),
    pending?.ocrText
      ? React.createElement(
          "details",
          { className: "ss-details" },
          React.createElement("summary", null, t("awaitingOcr")),
          React.createElement("pre", { className: "ss-ocr" }, pending.ocrText),
        )
      : null,
  );
}

export function RunPanel({ c }) {
  const { t, phase, runView, busy } = c;
  const run = runView.run;
  const pending = pendingDecision(run);
  const title = t(TITLE_KEY[phase] ?? "gradingTitle");
  const description = t(DESCRIPTION_KEY[phase] ?? "gradingDescription");
  const isAwaiting = phase === "awaiting";
  const canEnd = ["running", "pausing", "paused", "error", "starting"].includes(phase);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: `ss-run${phase === "error" ? " ss-surface--error" : ""}` },
      React.createElement(
        "div",
        { className: "ss-run__headline" },
        React.createElement(
          "h2",
          { className: "ss-run__title" },
          isAwaiting
            ? [
                React.createElement(StateDot, { key: "dot", state: "warning", size: 10 }),
                " ",
                title,
              ]
            : title,
        ),
        React.createElement("p", { className: "ss-run__description" }, description),
      ),
      isAwaiting
        ? React.createElement(AwaitingBody, { c, pending })
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(PaperTrail, { c }),
            React.createElement(
              "div",
              { className: "ss-metrics" },
              React.createElement(Metric, { value: `${runView.metrics.completed}`, label: t("runCompleted") }),
              React.createElement(Metric, { value: `${runView.metrics.warnings}`, label: t("runWarnings") }),
              React.createElement(Metric, { value: formatDuration(runView.metrics.elapsed), label: t("runElapsed") }),
              React.createElement(Metric, {
                value: runView.metrics.paused > 0 ? formatDuration(runView.metrics.paused) : "—",
                label: t("runPaused"),
              }),
              React.createElement(Metric, {
                value: runView.metrics.average ? formatDuration(runView.metrics.average) : "—",
                label: t("runAverage"),
              }),
            ),
            React.createElement(RunConfigLine, { c }),
            phase === "pausing"
              ? React.createElement(InlineNote, null, t("pausingDescription"))
              : null,
            phase === "error" && run?.error_message
              ? React.createElement(InlineNote, { tone: "error" }, run.error_message)
              : null,
            run?.pause_reason && phase !== "running" && phase !== "starting"
              ? React.createElement(
                  "p",
                  { className: "ss-note" },
                  `${t("runStageLabel")}: ${runStageLabel(run, t)}`,
                )
              : null,
          ),
    ),
    React.createElement(
      "div",
      { className: "ss-actionbar" },
      React.createElement(
        Button,
        {
          className: "ss-btn--block",
          size: "md",
          variant: "primary",
          disabled: c.primaryAction.disabled,
          onClick: () => void c.primaryAction.onClick?.(),
        },
        c.primaryAction.label,
      ),
      isAwaiting
        ? React.createElement(
            Button,
            { size: "md", variant: "outline", disabled: Boolean(busy.control), onClick: () => void c.doManual("retry") },
            t("reidentify"),
          )
        : null,
      isAwaiting
        ? React.createElement(
            Button,
            { size: "md", variant: "ghost", disabled: Boolean(busy.control), onClick: () => void c.pause() },
            t("pauseFirst"),
          )
        : null,
      canEnd
        ? React.createElement(
            Button,
            { size: "md", variant: "ghost", disabled: Boolean(busy.control), onClick: () => c.endGrading() },
            t("endGrading"),
          )
        : null,
      !isAwaiting
        ? React.createElement(Button, { size: "md", variant: "ghost", onClick: () => c.setConfigOpen(true) }, t("configure"))
        : null,
    ),
  );
}
