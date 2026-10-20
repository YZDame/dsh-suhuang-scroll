import React from "react";

import { IconListPenOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives";

import { NS } from "./i18n.js";
import { ConsolePage } from "./components/ConsolePage.jsx";
import { SettingsSection } from "./components/SettingsSection.jsx";

export const PANEL_ID = "suhuang-scroll";
export const RIGHT_TAB_ID = "dsh-suhuang-scroll/runtime";
export const RIGHT_TAB_KIND = "suhuang-scroll";

/** Self-contained tab mark: a list with a pen, matching the product name. */
export function SuhuangTabIcon({ size = 16 }) {
  return React.createElement(IconListPenOutlineRegular, { size });
}

function MainPage({ locale, onOpenRightTab }) {
  return React.createElement(ConsolePage, { locale, variant: "main", onOpenRightTab });
}

function CompactPage({ locale }) {
  return React.createElement(ConsolePage, { locale, variant: "compact" });
}

function SettingsPage({ locale, onOpenConsole, close }) {
  return React.createElement(SettingsSection, { locale, onOpenConsole, close });
}

/**
 * Register the four DSH seats this plugin owns:
 * - `settings.section`: one-time setup and diagnostics
 * - `sidebar.panellist`: the sidebar icon row that opens the console
 * - `main`: the full-width console
 * - right sidebar tab: the compact console beside a conversation
 *
 * Slot ids/keys stay stable so an already-installed client keeps working.
 */
export function registerSurfaces(ctx, { locale, t }) {
  const layoutService = () => {
    try {
      return ctx.get?.("layout") ?? undefined;
    } catch {
      return undefined;
    }
  };
  const openConsole = () => {
    const layout = layoutService();
    if (typeof layout?.selectPanel !== "function") return false;
    layout.selectPanel(PANEL_ID);
    return true;
  };

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: PANEL_ID,
        order: 120,
        label: () => t("tab"),
        locale: NS,
        inject: () => ({ locale, onOpenConsole: openConsole }),
      },
      SettingsPage,
    ),
  );

  // The official sidebar entry: an icon row plus the `main` panel it opens.
  ctx.slots.inject("sidebar.panellist", () =>
    ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 60,
        locale: NS,
        label: () => t("tab"),
      },
      SuhuangTabIcon,
    ),
  );

  // Right Sidebar tab: the registry type is what the add control lists, the
  // keyed body slot renders inside the pane. Both live in optional services, so
  // an older client simply keeps the main panel and settings section.
  let openRightTab;
  const onOpenRightTab = () => {
    if (!openRightTab) throw new Error(t("rightPanelUnavailable"));
    return openRightTab();
  };

  ctx.slots.inject("main", () =>
    ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ locale, onOpenRightTab }),
      },
      MainPage,
    ),
  );

  ctx.inject(["sidebarRightTabs", "sidebarRight", "layout", "uiSession"], (rightCtx) => {
    const registry = rightCtx.get("sidebarRightTabs");
    const sidebarRight = rightCtx.get("sidebarRight");
    if (registry === undefined || sidebarRight === undefined) return;
    const layout = rightCtx.get("layout");
    const uiSession = rightCtx.get("uiSession");

    openRightTab = (options) => {
      if (!uiSession.current.getSnapshot().key) throw new Error(t("rightPanelHint"));
      const previousPanel = layout.panelInfo.getSnapshot().activePanelId;
      // The host clears the on-screen session while a global panel is selected;
      // returning to the conversation synchronously restores it.
      layout.selectPanel(null);
      try {
        sidebarRight.openTab(RIGHT_TAB_KIND, options);
      } catch (cause) {
        layout.selectPanel(previousPanel);
        throw cause;
      }
    };
    rightCtx.effect(() => () => {
      openRightTab = undefined;
    }, "suhuang-scroll: reset right sidebar opener");

    rightCtx.effect(
      () =>
        registry.register({
          id: RIGHT_TAB_ID,
          kind: RIGHT_TAB_KIND,
          title: () => t("tab"),
          guide: [
            {
              id: "runtime",
              order: 20,
              title: () => t("tab"),
              description: () => t("tabHint"),
              icon: SuhuangTabIcon,
            },
          ],
        }),
      "suhuang-scroll: right sidebar tab type",
    );

    rightCtx.effect(
      () =>
        rightCtx.slots.inject("sidebar.right.pane.tab.title", () =>
          rightCtx.slots.register(
            {
              name: "sidebar.right.pane.tab.title",
              key: RIGHT_TAB_ID,
              locale: NS,
              inject: () => ({ locale }),
            },
            ({ locale: tabLocale }) =>
              React.createElement(
                React.Fragment,
                null,
                React.createElement(SuhuangTabIcon, { size: 16 }),
                React.createElement(
                  "span",
                  { style: { marginInlineStart: 6 } },
                  tabLocale.bind(NS)("tab"),
                ),
              ),
          ),
        ),
      "suhuang-scroll: right sidebar tab title",
    );

    rightCtx.effect(
      () =>
        rightCtx.slots.inject("sidebar.right.pane.tab", () =>
          rightCtx.slots.register(
            {
              name: "sidebar.right.pane.tab",
              key: RIGHT_TAB_ID,
              locale: NS,
              inject: () => ({ locale }),
            },
            CompactPage,
          ),
        ),
      "suhuang-scroll: right sidebar tab body",
    );
  });
}
