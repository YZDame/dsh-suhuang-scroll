import React from "react";

import { Button, StateDot } from "@deepseek-ai/dsh-client-ui-primitives";

/**
 * Diagnostic disclosure shared by every console size. Kept behind a summary so
 * the normal screen stays calm, but always one click away when something fails.
 */
export function ConnectionDetails({ c }) {
  const { t, host, connection, runtimeRunning, runtimeManaged, busy, restartBackend, stopBackend, refresh } = c;
  const process = host?.process ?? null;
  const cors = host?.cors ?? null;
  const hostInfo = host?.host ?? null;
  const launch = host?.launch ?? null;
  const output = Array.isArray(process?.output) ? process.output.slice(-6) : [];

  return React.createElement(
    "details",
    { className: "ss-details" },
    React.createElement("summary", null, t("connectionDetails")),
    React.createElement(
      "div",
      { className: "ss-details__body" },
      React.createElement(
        "dl",
        { className: "ss-detail-grid" },
        React.createElement("dt", null, t("runtimeProcess")),
        React.createElement(
          "dd",
          null,
          runtimeRunning
            ? t("runtimeRunning")
            : process?.running
              ? t("runtimeStarting")
              : t("runtimeStopped"),
          " · ",
          runtimeManaged ? t("runtimeManaged") : t("runtimeExternal"),
        ),
        React.createElement("dt", null, t("portLabel")),
        React.createElement("dd", null, String(host?.port ?? "—")),
        React.createElement("dt", null, t("pidLabel")),
        React.createElement("dd", null, String(process?.pid ?? "—")),
        React.createElement("dt", null, t("apiAddress")),
        React.createElement("dd", null, String(host?.apiBaseUrl ?? "—")),
        launch?.backendDir
          ? [
              React.createElement("dt", { key: "backend-dir-label" }, t("backendDir")),
              React.createElement("dd", { key: "backend-dir-value" }, String(launch.backendDir)),
            ]
          : null,
        cors
          ? [
              React.createElement("dt", { key: "origin-label" }, t("pageOrigin")),
              React.createElement(
                "dd",
                { key: "origin-value" },
                cors.allowed ? t("pageOriginAllowed") : t("pageOriginDenied"),
              ),
            ]
          : null,
        hostInfo
          ? [
              React.createElement("dt", { key: "plugin-version-label" }, t("pluginVersionLabel")),
              React.createElement("dd", { key: "plugin-version-value" }, String(hostInfo.pluginVersion ?? "—")),
              React.createElement("dt", { key: "protocol-label" }, t("protocolExpectedLabel")),
              React.createElement("dd", { key: "protocol-value" }, String(hostInfo.expectedProtocol ?? "—")),
            ]
          : null,
      ),
      connection === "reconnecting" || connection === "offline"
        ? React.createElement(
            "p",
            { className: "ss-note ss-note--error" },
            c.state?.lastError || t("offlineDescription"),
          )
        : null,
      output.length > 0
        ? React.createElement(
            "details",
            { className: "ss-details" },
            React.createElement("summary", null, t("recentOutput")),
            React.createElement("pre", { className: "ss-ocr" }, output.join("\n")),
          )
        : null,
      React.createElement(
        "div",
        { className: "ss-actions" },
        React.createElement(Button, { size: "sm", variant: "outline", onClick: () => void refresh() }, t("refresh")),
        runtimeManaged
          ? React.createElement(
              Button,
              {
                size: "sm",
                variant: "outline",
                disabled: Boolean(busy.runtime),
                onClick: () => restartBackend(),
              },
              t("restartService"),
            )
          : null,
        runtimeManaged
          ? React.createElement(
              Button,
              {
                size: "sm",
                variant: "ghost",
                disabled: Boolean(busy.runtime),
                onClick: () => stopBackend(),
              },
              t("stopService"),
            )
          : null,
      ),
      !runtimeManaged && runtimeRunning
        ? React.createElement("p", { className: "ss-note" }, t("externalServiceHint"))
        : null,
    ),
  );
}
