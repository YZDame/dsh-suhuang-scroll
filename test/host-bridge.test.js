/**
 * Host-half unit tests for the DSH plugin bridge contract.
 *
 * These tests are deliberately independent of `client.js` and of the DSH host
 * runtime: they import only `runtime.js`, stub `globalThis.fetch` per test, and
 * exercise the pure merge/payload helpers the bridge uses. The browser bundle
 * may be rebuilt concurrently by the frontend work without breaking them.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKEND_OUTPUT_LINE_LIMIT,
  EXPECTED_PROTOCOL_VERSION,
  MANUAL_ACTIONS,
  RUNTIME_API_PATHS,
  buildHostFacts,
  buildReadinessPath,
  createStartPayload,
  isAllowedRuntimeApiPath,
  mergeReadiness,
  normalizeManualAction,
  normalizeSettings,
  readRuntimeReadiness,
} from "../runtime.js";

const VALID_READINESS = {
  ready: true,
  generated_at: "2026-10-18T00:00:00+00:00",
  runtime: {
    version: "0.6.5",
    protocol_version: 1,
    expected_protocol_version: 1,
    pid: 1234,
    started_at: "2026-10-18T00:00:00+00:00",
    uptime_seconds: 5,
    api_port: 8000,
  },
  extension: { connected: true, stale: false, clients: [] },
  model: { provider: "p", model: "m", base_url: "https://example.invalid", api_key_configured: true },
  specs: { dir: "/tmp/specs", count: 1, names: ["demo.md"] },
  adapters: { registry_ok: true, enabled: [], disabled: [] },
  site: { host: null },
  automation: { active: false },
  checks: [
    {
      id: "runtime_health",
      status: "ok",
      blocking: false,
      summary: "Runtime answered",
      details: {},
      fixes: [
        {
          intent: "refresh_readiness",
          label: "",
          params: {},
          destructive: false,
          requires_confirmation: false,
        },
      ],
    },
  ],
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: () => null },
  };
}

async function withFetch(fetchImplementation, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImplementation;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("EXPECTED_PROTOCOL_VERSION matches the Runtime protocol contract", () => {
  assert.equal(EXPECTED_PROTOCOL_VERSION, 1);
});

test("bridge allow-list accepts the additive Runtime routes", () => {
  const accepted = [
    "/health",
    "/doctor",
    "/readiness",
    "/extension/status",
    "/automation/status",
    "/automation/start",
    "/automation/pause",
    "/automation/resume",
    "/automation/stop",
    "/automation/manual-action",
    "/automation/validate-spec",
    "/resources",
    "/specs",
    "/specs/content",
    "/specs/import",
    "/provider/status",
    "/provider/test",
    "/provider/config",
  ];
  for (const pathname of accepted) {
    assert.equal(isAllowedRuntimeApiPath(pathname), true, pathname);
  }
  for (const pattern of RUNTIME_API_PATHS) {
    assert.ok(pattern instanceof RegExp);
  }
});

test("bridge allow-list is anchored and rejects unrelated paths", () => {
  const rejected = [
    "",
    "/",
    "/readiness/extra",
    "/readinessX",
    "/extension/heartbeat",
    "/doctorx",
    "/admin",
    "/automation/report/submit",
    "/automation/manual-action/extra",
    "/specs/content/../../etc/passwd",
    "/Specs",
    "//health",
    "/health ",
  ];
  for (const pathname of rejected) {
    assert.equal(isAllowedRuntimeApiPath(pathname), false, pathname);
  }
});

test("readiness path omits blank query values and encodes the rest", () => {
  assert.equal(buildReadinessPath(), "/readiness");
  assert.equal(buildReadinessPath({ spec: "", adapter: " ", site_host: null }), "/readiness");
  assert.equal(
    buildReadinessPath({ spec: "a b.md", adapter: "zhixue", site_host: "www.example.com" }),
    "/readiness?spec=a+b.md&adapter=zhixue&site_host=www.example.com",
  );
});

test("readiness read forwards the spec/adapter/site_host query", async () => {
  const requests = [];
  const result = await withFetch(
    async (url) => {
      requests.push(url);
      return jsonResponse(VALID_READINESS);
    },
    () => readRuntimeReadiness("http://127.0.0.1:8000/api", {
      spec: "demo.md",
      site_host: "www.zhixue.com",
    }),
  );
  assert.equal(result.supported, true);
  assert.equal(result.error, null);
  assert.equal(result.data.ready, true);
  assert.deepEqual(requests, [
    "http://127.0.0.1:8000/api/readiness?spec=demo.md&site_host=www.zhixue.com",
  ]);
});

test("a backend without /readiness is unsupported, not an error", async () => {
  for (const status of [404, 405]) {
    const result = await withFetch(
      async () => jsonResponse({ detail: "Not Found" }, status),
      () => readRuntimeReadiness("http://127.0.0.1:8000/api"),
    );
    assert.deepEqual(result, { supported: false, data: null, error: null }, String(status));
  }
});

test("readiness transport failures degrade without throwing", async () => {
  const result = await withFetch(
    async () => {
      const error = new Error("The operation was aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    },
    () => readRuntimeReadiness("http://127.0.0.1:8000/api"),
  );
  assert.equal(result.supported, false);
  assert.equal(result.data, null);
  assert.match(result.error, /timeout/i);
});

test("a malformed readiness body is reported, never thrown", async () => {
  const result = await withFetch(
    async () => jsonResponse({ status: "ok" }),
    () => readRuntimeReadiness("http://127.0.0.1:8000/api"),
  );
  assert.equal(result.supported, false);
  assert.equal(result.data, null);
  assert.match(result.error, /shape/);
});

test("mergeReadiness folds host facts into the readiness answer", () => {
  const merged = mergeReadiness(
    { supported: true, data: VALID_READINESS, error: null },
    {
      process: { managed: true, running: true, pid: 4321, error: null, output: ["boot"] },
      launch: {
        kind: "python",
        backendDir: "/repo/core/python",
        executable: null,
        python: "/repo/core/python/.venv/bin/python",
      },
      cors: { origin: "http://127.0.0.1:54431", allowed: true },
      apiBaseUrl: "http://127.0.0.1:8000/api",
      port: 8000,
      pluginVersion: "0.7.0",
      expectedProtocol: 1,
      dshVersion: "0.2.0-rc.2",
    },
  );
  assert.equal(merged.supported, true);
  assert.equal(merged.error, null);
  assert.equal(merged.data.host.process.pid, 4321);
  assert.equal(merged.data.host.launch.kind, "python");
  assert.equal(merged.data.host.launch.python, "/repo/core/python/.venv/bin/python");
  assert.deepEqual(merged.data.host.cors, { origin: "http://127.0.0.1:54431", allowed: true });
  assert.equal(merged.data.host.host.pluginVersion, "0.7.0");
  assert.equal(merged.data.host.host.expectedProtocol, 1);

  const health = merged.data.checks.find((check) => check.id === "runtime_health");
  assert.ok(health, "runtime_health check survives the merge");
  const intents = health.fixes.map((fix) => fix.intent);
  assert.ok(intents.includes("refresh_readiness"), "backend fixes are kept");
  assert.ok(intents.includes("restart_runtime"), "managed runtime gains restart");
  assert.ok(intents.includes("stop_runtime"), "managed runtime gains stop");
  assert.equal(health.details.host.process.pid, 4321);

  // The backend payload is not mutated by the merge.
  assert.equal(VALID_READINESS.checks[0].details.host, undefined);
  assert.equal(VALID_READINESS.host, undefined);
});

test("mergeReadiness supplies neutral host fallbacks", () => {
  const merged = mergeReadiness({ supported: true, data: VALID_READINESS, error: null });
  const { process, launch, cors, port, host } = merged.data.host;
  assert.deepEqual(process, {
    managed: false,
    running: false,
    pid: null,
    error: null,
    output: null,
  });
  assert.equal(launch, null);
  assert.equal(cors, null);
  assert.equal(port, null);
  assert.equal(host.pluginVersion, null);
  assert.equal(host.expectedProtocol, 1);
  assert.equal(host.dshVersion, null);
  const intents = merged.data.checks[0].fixes.map((fix) => fix.intent);
  assert.ok(!intents.includes("restart_runtime"));
  assert.ok(!intents.includes("stop_runtime"));
});

test("mergeReadiness degrades to null data for unsupported or malformed input", () => {
  for (const input of [null, undefined, {}, { supported: false, data: null, error: null }]) {
    assert.deepEqual(mergeReadiness(input, {}), {
      supported: false,
      data: null,
      error: null,
    });
  }
  const malformed = mergeReadiness({ supported: true, data: { status: "ok" }, error: null }, {});
  assert.equal(malformed.supported, false);
  assert.equal(malformed.data, null);
  assert.match(malformed.error, /shape/);
  assert.deepEqual(
    mergeReadiness({ supported: false, data: null, error: "connection refused" }, {}),
    { supported: false, data: null, error: "connection refused" },
  );
});

test("buildHostFacts caps output and normalizes process/launch facts", () => {
  const output = Array.from({ length: 25 }, (_, index) => `line ${index}`);
  const facts = buildHostFacts({
    process: { managed: true, pid: 9, error: "boom", output },
    launch: {
      kind: "binary",
      backendDir: "/opt/runtime",
      executable: "/opt/runtime/bin/suhuang-backend",
    },
    port: 8123,
    expectedProtocol: 2,
  });
  assert.equal(facts.process.managed, true);
  assert.equal(facts.process.running, true);
  assert.equal(facts.process.pid, 9);
  assert.equal(facts.process.error, "boom");
  assert.equal(facts.process.output.length, BACKEND_OUTPUT_LINE_LIMIT);
  assert.equal(facts.process.output.at(-1), "line 24");
  assert.deepEqual(facts.launch, {
    kind: "binary",
    backendDir: "/opt/runtime",
    executable: "/opt/runtime/bin/suhuang-backend",
    python: null,
  });
  assert.equal(facts.port, 8123);
  assert.equal(facts.host.expectedProtocol, 2);
});

test("buildHostFacts never throws on mistyped facts", () => {
  for (const input of [null, undefined, "x", 42, []]) {
    const facts = buildHostFacts(input);
    assert.equal(typeof facts.process.managed, "boolean");
    assert.equal(facts.process.pid, null);
    assert.equal(facts.launch, null);
    assert.equal(facts.port, null);
    assert.equal(facts.host.expectedProtocol, 1);
  }
  const mistyped = buildHostFacts({
    process: null,
    launch: "lantern",
    cors: "yes",
    port: "8000",
    pluginVersion: 5,
    expectedProtocol: "1",
  });
  assert.equal(mistyped.process.managed, false);
  assert.equal(mistyped.launch, null);
  assert.equal(mistyped.cors, null);
  assert.equal(mistyped.port, null);
  assert.equal(mistyped.host.pluginVersion, null);
  assert.equal(mistyped.host.expectedProtocol, 1);
});

test("manual actions accept exactly the Runtime allow-list", () => {
  assert.deepEqual([...MANUAL_ACTIONS], ["submit", "pause", "stop", "retry"]);
  for (const action of MANUAL_ACTIONS) {
    assert.equal(normalizeManualAction(action), action);
  }
  assert.equal(normalizeManualAction(" submit "), "submit");
  for (const invalid of ["", null, undefined, 1, "start", "SUBMIT", "submit_pending"]) {
    assert.throws(() => normalizeManualAction(invalid), /Unsupported manual action/);
  }
});

test("normalizeSettings defaults submitMode to auto_submit", () => {
  const normalized = normalizeSettings({});
  assert.equal(normalized.submitMode, "auto_submit");
  assert.equal(normalized.apiBaseUrl, "http://127.0.0.1:8000/api");
  assert.equal(normalizeSettings({ submitMode: "manual_confirm" }).submitMode, "manual_confirm");
  assert.equal(normalizeSettings({ submitMode: "garbage" }).submitMode, "auto_submit");
});

test("start payload defaults to auto-submit", () => {
  const payload = createStartPayload({}, [{ value: "demo.md" }]);
  assert.equal(payload.spec_path, "demo.md");
  assert.equal(payload.dev, false);
  assert.equal(payload.confidence_threshold, 0.9);
  assert.equal("adapter" in payload, false);
});

test("start payload switches to manual confirmation via submitMode", () => {
  assert.equal(createStartPayload({ submitMode: "manual_confirm" }, [{ value: "demo.md" }]).dev, true);
  assert.equal(createStartPayload({ submitMode: "auto_submit" }, [{ value: "demo.md" }]).dev, false);
  assert.equal(createStartPayload({ submitMode: "unknown" }, [{ value: "demo.md" }]).dev, false);
});

test("start payload keeps loopback validation and optional fields", () => {
  assert.throws(
    () => createStartPayload({ apiBaseUrl: "https://example.com/api" }, [{ value: "demo.md" }]),
    /loopback/,
  );
  assert.throws(
    () => createStartPayload({ apiBaseUrl: "http://user:pass@127.0.0.1:8000/api" }, [{ value: "demo.md" }]),
    /credentials/,
  );
  assert.throws(
    () => createStartPayload({ apiBaseUrl: "file:///tmp/api" }, [{ value: "demo.md" }]),
    /http or https/,
  );
  const payload = createStartPayload(
    {
      apiBaseUrl: "http://localhost:9000/api",
      adapter: "zhixue",
      provider: "deepseek",
      model: "deepseek-flash",
      confidenceThreshold: 2,
      submitMode: "manual_confirm",
    },
    [{ value: "demo.md" }],
  );
  assert.equal(payload.adapter, "zhixue");
  assert.equal(payload.provider, "deepseek");
  assert.equal(payload.model, "deepseek-flash");
  assert.equal(payload.confidence_threshold, 1);
  assert.equal(payload.dev, true);
  assert.throws(() => createStartPayload({}, []), /没有可用的评分标准/);
});

test("ReadinessResponse contract checks survive the merge unchanged", () => {
  const ids = [
    "runtime_health",
    "runtime_protocol",
    "extension_connected",
    "extension_version",
    "extension_consent",
    "model_config",
    "spec_available",
    "adapter_registry",
    "site_adapter",
  ];
  const payload = {
    ready: false,
    generated_at: "now",
    checks: ids.map((id) => ({
      id,
      status: "unknown",
      blocking: false,
      summary: id,
      details: {},
      fixes: [],
    })),
  };
  const merged = mergeReadiness({ supported: true, data: payload, error: null }, {
    process: { managed: false, running: false, pid: null, error: null, output: null },
  });
  assert.equal(merged.supported, true);
  assert.deepEqual(merged.data.checks.map((check) => check.id), ids);
  assert.equal(merged.data.checks[1].status, "unknown");
  // Only `runtime_health` receives host-only details; other checks pass through.
  assert.equal(merged.data.checks[1].details.host, undefined);
  assert.equal(merged.data.checks[0].details.host.process.managed, false);
});
