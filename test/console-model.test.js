import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_API_BASE_URL,
  derivePhase,
  deriveReadiness,
  effectiveDefaultSpec,
  formatDuration,
  normalizeSettings,
  paperTrail,
  pendingDecision,
  resolveApiBaseUrl,
  runMetrics,
  createStartPayload,
} from "../src/client/model.js";

test("settings normalize with safe defaults and manual submit mode", () => {
  const defaults = normalizeSettings();
  assert.equal(defaults.apiBaseUrl, DEFAULT_API_BASE_URL);
  assert.equal(defaults.confidenceThreshold, 0.9);
  assert.equal(defaults.submitMode, "auto_submit");
  const manual = normalizeSettings({ submitMode: "manual_confirm", confidenceThreshold: 5 });
  assert.equal(manual.submitMode, "manual_confirm");
  assert.equal(manual.confidenceThreshold, 1);
  assert.equal(normalizeSettings({ submitMode: "nonsense" }).submitMode, "auto_submit");
});

test("only loopback http(s) backend URLs are accepted", () => {
  assert.equal(resolveApiBaseUrl("http://127.0.0.1:8000/api"), "http://127.0.0.1:8000/api");
  assert.throws(() => resolveApiBaseUrl("https://example.com/api"), /API_INVALID_LOOPBACK/);
  assert.throws(() => resolveApiBaseUrl("http://127.0.0.1:8000/api?token=x"), /API_INVALID_CREDENTIALS/);
  assert.throws(() => resolveApiBaseUrl("ftp://127.0.0.1/api"), /API_INVALID_PROTOCOL/);
});

test("start payload carries spec, threshold and adapter; manual mode sets dev", () => {
  const specs = [{ value: "/tmp/specs/math.md", label: "math.md" }];
  const auto = createStartPayload({ confidenceThreshold: 0.86, adapter: "zhixue" }, specs);
  assert.equal(auto.spec_path, "/tmp/specs/math.md");
  assert.equal(auto.dev, false);
  assert.equal(auto.confidence_threshold, 0.86);
  assert.equal(auto.adapter, "zhixue");
  const manual = createStartPayload(
    { submitMode: "manual_confirm", defaultSpec: "/tmp/specs/math.md" },
    specs,
  );
  assert.equal(manual.dev, true);
  assert.throws(() => createStartPayload({}, []), /NO_SPEC/);
});

test("effective spec falls back to the first available spec", () => {
  assert.equal(effectiveDefaultSpec({ defaultSpec: "" }, [{ value: "a.md" }]), "a.md");
  assert.equal(effectiveDefaultSpec({ defaultSpec: "b.md" }, [{ value: "a.md" }]), "b.md");
});

test("phase derivation covers offline, setup, run states and summaries", () => {
  assert.equal(derivePhase(null, { ready: false }), "offline");
  assert.equal(derivePhase({ health: null }, { ready: false }), "offline");
  const idle = { health: {}, automation: { run: null } };
  assert.equal(derivePhase(idle, { ready: false }), "setup");
  assert.equal(derivePhase(idle, { ready: true }), "ready");
  const running = (state, extra = {}) => ({
    health: {},
    automation: { run: { state, ...extra } },
  });
  assert.equal(derivePhase(running("grading"), { ready: true }), "running");
  assert.equal(derivePhase(running("grading", { pause_requested: true }), { ready: true }), "pausing");
  assert.equal(derivePhase(running("paused"), { ready: true }), "paused");
  assert.equal(derivePhase(running("awaiting_confirmation"), { ready: true }), "awaiting");
  assert.equal(derivePhase(running("error"), { ready: true }), "error");
  assert.equal(derivePhase(running("stopped", { pause_reason: "end_of_queue" }), { ready: true }), "completed");
  assert.equal(derivePhase(running("stopped", { pause_reason: "user" }), { ready: true }), "ended");
  assert.equal(derivePhase(running("starting"), { ready: true }), "starting");
});

function readinessCheck(id, status = "ok", extra = {}) {
  return { id, status, blocking: false, summary: "", details: {}, fixes: [], ...extra };
}

test("supported readiness folds nine checks into five console rows", () => {
  const checks = [
    readinessCheck("runtime_health"),
    readinessCheck("runtime_protocol"),
    readinessCheck("extension_connected"),
    readinessCheck("extension_version"),
    readinessCheck("extension_consent"),
    readinessCheck("model_config"),
    readinessCheck("spec_available"),
    readinessCheck("adapter_registry"),
    readinessCheck("site_adapter"),
  ];
  const host = {
    health: { version: "0.6.4", protocol_version: 1 },
    readiness: { supported: true, data: { ready: true, checks } },
  };
  const readiness = deriveReadiness(host);
  assert.equal(readiness.supported, true);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.rows.length, 5);
  assert.deepEqual(
    readiness.rows.map((row) => row.id),
    ["runtime", "extension", "model", "spec", "adapter"],
  );

  checks[2] = readinessCheck("extension_connected", "fail", {
    blocking: true,
    summary: "No extension",
    fixes: [{ intent: "install_extension", label: "", params: {}, destructive: false }],
  });
  const blocked = deriveReadiness({ ...host, readiness: { supported: true, data: { ready: false, checks } } });
  assert.equal(blocked.ready, false);
  assert.equal(blocked.blockingCount, 1);
  assert.equal(blocked.rows[1].status, "fail");
  assert.equal(blocked.rows[1].fixes[0].intent, "install_extension");
});

test("unsupported readiness falls back to host facts and never claims the extension is connected", () => {
  const host = {
    health: { version: "0.5.0", protocol_version: 1 },
    automation: { run: null },
    readiness: { supported: false, data: null, error: null },
    fallbackCatalog: {
      specs: [{ value: "a.md", label: "a.md" }],
      resources: { adapters: [{ value: "zhixue", label: "智学网" }] },
      provider: { provider: "p", model: "m", api_key_configured: false },
    },
  };
  const readiness = deriveReadiness(host);
  assert.equal(readiness.supported, false);
  const byId = Object.fromEntries(readiness.rows.map((row) => [row.id, row]));
  assert.equal(byId.runtime.status, "ok");
  assert.equal(byId.extension.status, "unknown");
  assert.equal(byId.extension.blocking, false);
  assert.equal(byId.model.status, "fail");
  assert.equal(byId.model.blocking, true);
  assert.equal(byId.spec.status, "ok");
  assert.equal(byId.adapter.status, "ok");
  assert.equal(readiness.ready, false);
});

test("paper trail never invents a total", () => {
  const running = { state: "grading", completed_count: 3 };
  const trail = paperTrail(running, 40);
  assert.equal(trail.filter((segment) => segment.state === "done").length, 3);
  assert.equal(trail.filter((segment) => segment.state === "active").length, 1);
  const overflow = paperTrail({ state: "grading", completed_count: 100 }, 40);
  assert.equal(overflow.filter((segment) => segment.state === "done").length, 40);
  assert.equal(overflow.find((segment) => segment.state === "overflow").count, 60);
  assert.equal(paperTrail({ state: "stopped", completed_count: 3 }, 40).length, 3);
});

test("review flags normalize from the backend object shape", () => {
  const pending = pendingDecision({
    pending_decision: {
      suggested_score: 8.5,
      confidence: 0.62,
      review_flags: [{ code: "low_confidence", message: "Confidence below threshold", severity: "warning" }],
      ocr_text: "answer",
    },
  });
  assert.equal(pending.flags.length, 1);
  assert.equal(pending.flags[0].message, "Confidence below threshold");
  assert.equal(pending.flags[0].severity, "warning");
});

test("durations and run metrics are rendered for humans", () => {
  assert.equal(formatDuration(0), "0s");
  assert.equal(formatDuration(47), "47s");
  assert.equal(formatDuration(372), "6m 12s");
  assert.equal(formatDuration(3720), "1h 02m");
  const metrics = runMetrics({ completed_count: 4, warning_count: 1, elapsed_seconds: 120, paused_seconds: 30 });
  assert.deepEqual(metrics, { completed: 4, warnings: 1, elapsed: 120, paused: 30, average: 30 });
});
