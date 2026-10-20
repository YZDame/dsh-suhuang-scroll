import { EXPECTED_PROTOCOL_VERSION, currentPaperNumber, paperTrail, runMetrics, safeBasename } from "./model.js";

/** Human-readable detail line for one readiness row. */
export function describeRow(row, { host, catalog, settings }, t) {
  const data = host?.readiness?.supported === true ? host.readiness.data : null;
  switch (row.id) {
    case "runtime": {
      const health = host?.health;
      if (!health) return t("runtimeDetailStopped");
      const protocol = health.protocol_version;
      if (Number.isInteger(protocol) && protocol !== EXPECTED_PROTOCOL_VERSION) {
        return t("runtimeDetailProtocolMismatch", { actual: protocol, expected: EXPECTED_PROTOCOL_VERSION });
      }
      return t("runtimeDetailRunning", {
        version: health.version ?? "—",
        protocol: protocol ?? "—",
      });
    }
    case "extension": {
      if (!data) return t("extensionDetailUnknown");
      const extension = data.extension ?? null;
      const clients = Array.isArray(extension?.clients) ? extension.clients : [];
      const compatible = clients.find((client) => client.state === "connected" && client.protocol_compatible);
      if (compatible) {
        if (compatible.data_consent_granted === false) return t("extensionDetailConsent");
        return t("extensionDetailConnected", { version: compatible.version ?? "—" });
      }
      const stale = clients.find((client) => client.state === "stale");
      if (stale) return t("extensionDetailStale", { seconds: stale.seconds_since_seen ?? "—" });
      return t("extensionDetailMissing");
    }
    case "model": {
      const model = data?.model ?? catalog?.provider ?? null;
      if (!model) return t("modelDetailUnknown");
      if (model.api_key_configured === false) return t("modelDetailNoKey");
      return t("modelDetail", {
        provider: model.provider || t("unknown"),
        model: model.model || t("unknown"),
      });
    }
    case "spec": {
      const specs = data?.specs?.names ?? (Array.isArray(catalog?.specs) ? catalog.specs.map((spec) => spec.label ?? spec.value) : []);
      const selected =
        settings.defaultSpec ||
        (Array.isArray(catalog?.specs) && catalog.specs.length > 0 ? catalog.specs[0].value : "");
      if (selected) return t("specDetailSelected", { name: safeBasename(selected) });
      if (specs.length > 0) return t("specDetailCount", { count: specs.length });
      return t("specDetailNone");
    }
    case "adapter": {
      const site = data?.site ?? null;
      const adapters = data?.adapters ?? null;
      const resources = catalog?.resources ?? null;
      const matched = site?.matched_adapter_id;
      if (site?.host && matched) {
        const label =
          resources?.adapters?.find((adapter) => adapter.value === matched)?.label ?? matched;
        return t("siteDetailMatched", { host: site.host, adapter: label });
      }
      const selectedId = settings.adapter || adapters?.default_adapter || resources?.defaultAdapter || "";
      if (selectedId) {
        const label = resources?.adapters?.find((adapter) => adapter.value === selectedId)?.label ?? selectedId;
        return t("adapterDetailSelected", { name: label });
      }
      const enabled = adapters?.enabled ?? resources?.adapters ?? [];
      if (enabled.length > 0) return t("adapterDetailCount", { count: enabled.length });
      return t("adapterDetailNone");
    }
    default:
      return row.summary || "";
  }
}

/** The first actionable blocking fix, used for the setup screen's primary action. */
export function firstBlockingFix(rows) {
  for (const row of rows) {
    if (!row.blocking) continue;
    if (row.fixes.length > 0) return { row, fix: row.fixes[0] };
  }
  for (const row of rows) {
    if (row.status === "fail" && row.fixes.length > 0) return { row, fix: row.fixes[0] };
  }
  return null;
}

/** Everything the run panel needs, derived once from the host snapshot. */
export function deriveRunView(host, phase) {
  const run = host?.automation?.run ?? null;
  const metrics = runMetrics(run);
  return {
    run,
    metrics,
    trail: paperTrail(run),
    paper: currentPaperNumber(run),
    spec: run?.spec_path ? safeBasename(run.spec_path) : "",
    adapter: run?.adapter ?? "",
    site: run?.current_page_context?.site ?? "",
  };
}
