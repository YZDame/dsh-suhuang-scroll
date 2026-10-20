import React from "react";

import { Button, StateDot } from "@deepseek-ai/dsh-client-ui-primitives";

const DOT_STATE = {
  ok: "done",
  warn: "warning",
  fail: "error",
  unknown: "idle",
  info: "ongoing",
};

/**
 * The readiness checklist: one row per prerequisite, one action per row.
 * A failing row is tinted, not outlined; tone steps instead of card chrome.
 */
export function ReadinessList({ rows, t, describe, fixLabel, onFix, disabled = false }) {
  return React.createElement(
    "ul",
    { className: "ss-readiness", "aria-label": t("checklistTitle") },
    ...rows.map((row) => {
      const fix = row.status === "ok" ? null : row.fixes[0] ?? null;
      return React.createElement(
        "li",
        {
          key: row.id,
          className: "ss-ready-row",
          "data-status": row.status,
          "data-blocking": row.blocking ? "true" : "false",
        },
        React.createElement(
          "span",
          { className: "ss-ready-row__dot" },
          React.createElement(StateDot, { state: DOT_STATE[row.status] ?? "idle", size: 8 }),
        ),
        React.createElement(
          "div",
          { className: "ss-ready-row__text" },
          React.createElement("span", { className: "ss-ready-row__label" }, t(row.labelKey)),
          React.createElement("span", { className: "ss-ready-row__detail", title: describe(row) }, describe(row)),
        ),
        fix
          ? React.createElement(
              "span",
              { className: "ss-ready-row__action" },
              React.createElement(
                Button,
                {
                  size: "sm",
                  variant: row.blocking ? "outline" : "ghost",
                  disabled,
                  onClick: () => void onFix(fix),
                },
                fixLabel(fix),
              ),
            )
          : null,
      );
    }),
  );
}
