import React from "react";

import {
  Button,
  IconRefreshOutlineRegular,
  IconSlidersTwoOutlineRegular,
} from "@deepseek-ai/dsh-client-ui-primitives";

import { useConsole } from "./use-console.jsx";
import { ConnectionDetails } from "./ConnectionDetails.jsx";
import { InlineNote, StatusPill } from "./common.jsx";
import { OfflinePanel, ReadyPanel, SetupPanel, SummaryPanel } from "./panels.jsx";
import { RunPanel } from "./RunPanel.jsx";
import { ConsoleSurfaces } from "./surfaces.jsx";

function Subtitle({ c }) {
  const { t, phase, readiness } = c;
  if (phase === "offline") return t("subtitle");
  if (phase === "setup") return t("setupDescription", { count: readiness.blockingCount });
  if (phase === "ready") return t("readyDescription");
  return t("subtitle");
}

/**
 * The console, one component in two containers: the full-width center panel
 * (`variant="main"`) and the session-scoped right tab (`variant="compact"`).
 * Container queries in styles.css make the layout adapt to its own width.
 */
export function ConsolePage({ locale, variant = "main", onOpenRightTab }) {
  const c = useConsole(locale);
  const compact = variant === "compact";
  const onConfigure = () => c.setConfigOpen(true);

  let body;
  if (c.phase === "offline") body = React.createElement(OfflinePanel, { c, onConfigure });
  else if (c.phase === "setup") body = React.createElement(SetupPanel, { c, onConfigure });
  else if (c.phase === "ready") body = React.createElement(ReadyPanel, { c, onConfigure });
  else if (c.phase === "completed" || c.phase === "ended") {
    body = React.createElement(SummaryPanel, { c, onConfigure });
  } else body = React.createElement(RunPanel, { c });

  return React.createElement(
    "div",
    {
      className: `ss-console${compact ? " ss-console--compact" : " ss-console--framed"}`,
      "data-testid": compact ? "suhuang-scroll-console-compact" : "suhuang-scroll-console",
      "data-phase": c.phase,
    },
    React.createElement(
      "div",
      { className: "ss-console__inner" },
      React.createElement(
        "header",
        { className: "ss-head" },
        React.createElement(
          "div",
          { className: "ss-head__text" },
          React.createElement("h1", { className: "ss-head__title" }, c.t("title")),
          React.createElement("p", { className: "ss-head__subtitle" }, React.createElement(Subtitle, { c })),
        ),
        React.createElement(
          "div",
          { className: "ss-head__actions" },
          React.createElement(StatusPill, { phase: c.state.loading && !c.state.host ? "loading" : c.phase, t: c.t }),
          React.createElement(
            Button,
            {
              size: "sm",
              variant: "ghost",
              icon: React.createElement(IconRefreshOutlineRegular, { size: 14 }),
              "aria-label": c.t("refresh"),
              title: c.t("refresh"),
              onClick: () => void c.refresh(),
            },
            null,
          ),
          React.createElement(
            Button,
            {
              size: "sm",
              variant: "ghost",
              icon: React.createElement(IconSlidersTwoOutlineRegular, { size: 14 }),
              "aria-label": c.t("configure"),
              title: c.t("configure"),
              onClick: onConfigure,
            },
            null,
          ),
          !compact && onOpenRightTab
            ? React.createElement(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  onClick: async () => {
                    try {
                      await onOpenRightTab();
                    } catch (cause) {
                      c.show(cause instanceof Error ? cause.message : c.t("rightPanelHint"), "error");
                    }
                  },
                },
                c.t("openInRightPanel"),
              )
            : null,
        ),
      ),
      c.connection === "reconnecting"
        ? React.createElement(InlineNote, null, c.t("reconnectingDescription"))
        : null,
      body,
      React.createElement(ConnectionDetails, { c }),
    ),
    React.createElement(ConsoleSurfaces, { c }),
  );
}
