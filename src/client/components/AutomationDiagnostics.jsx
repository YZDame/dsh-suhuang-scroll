import React from "react";

/** Render only compact error metadata and privacy-preserving answer evidence. */
export function AutomationDiagnostics({ t, run }) {
  const error = run?.last_error ?? null;
  const record = run?.pending_decision ?? run?.last_record ?? null;
  const evidence = error?.audit_evidence ?? record?.audit_evidence ?? null;
  const model = error ?? record?.model_diagnostics ?? null;
  const message = error?.message || run?.error_message || "";
  const rows = [];
  const add = (label, value) => {
    if (value !== undefined && value !== null && value !== "") rows.push([label, String(value)]);
  };

  if (error) {
    add(t("diagnosticsStage"), error.stage);
    add(t("diagnosticsCode"), error.error_code);
    add(t("diagnosticsLocalStatus"), error.local_status);
    add(t("diagnosticsUpstreamStatus"), error.upstream_status);
    add(t("diagnosticsRequestId"), error.request_id);
    if (typeof error.retryable === "boolean") {
      add(t("diagnosticsRetryable"), t(error.retryable ? "diagnosticsRetryableYes" : "diagnosticsRetryableNo"));
    }
  }
  add(t("diagnosticsProvider"), model?.provider_id);
  add(t("diagnosticsModel"), model?.model_id);

  if (evidence) {
    add(t("diagnosticsPaperKey"), evidence.paper_key);
    add(t("diagnosticsPaperKeySource"), evidence.paper_key_source);
    add(t("diagnosticsImageHash"), evidence.image_sha256);
    add(t("diagnosticsImageHashStatus"), evidence.image_hash_status);
    const imageDetails = [
      evidence.image_mime_type,
      Number.isFinite(evidence.image_byte_size) ? `${evidence.image_byte_size} bytes` : "",
      Number.isFinite(evidence.image_width) && Number.isFinite(evidence.image_height)
        ? `${evidence.image_width}×${evidence.image_height}`
        : "",
    ].filter(Boolean).join(" · ");
    add(t("diagnosticsImageDetails"), imageDetails);
    add(t("diagnosticsCaptureSource"), evidence.capture_source);
  }

  if (!error && rows.length === 0) return null;
  return React.createElement(
    "section",
    { className: "ss-diagnostics", "aria-label": t("diagnosticsTitle") },
    React.createElement("strong", null, t(error ? "diagnosticsErrorTitle" : "diagnosticsRecordTitle")),
    message
      ? React.createElement(
          "p",
          { className: "ss-diagnostics__message" },
          React.createElement("strong", null, `${t("diagnosticsMessage")}: `),
          message,
        )
      : null,
    rows.length
      ? React.createElement(
          "dl",
          { className: "ss-diagnostics__list" },
          ...rows.flatMap(([label, value]) => [
            React.createElement("dt", { key: `${label}-label` }, label),
            React.createElement("dd", { key: `${label}-value` }, value),
          ]),
        )
      : null,
  );
}
