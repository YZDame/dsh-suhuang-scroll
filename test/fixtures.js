// Synthetic host/backend fixtures for tests and the visual preview harness.
// Shapes mirror the frozen contracts: ReadinessResponse, host bridge payload,
// settings snapshot and RunState.

export const API_BASE = "http://127.0.0.1:8000/api";

export function readinessChecks(overrides = {}) {
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
  return ids.map((id) => ({
    id,
    status: "ok",
    blocking: false,
    summary: "",
    details: {},
    fixes: [],
    ...(overrides[id] ?? {}),
  }));
}

export function settingsPayload(overrides = {}) {
  return {
    status: "ready",
    value: {
      apiBaseUrl: API_BASE,
      backendDir: "",
      defaultSpec: "/tmp/specs/math.md",
      adapter: "zhixue",
      provider: "",
      model: "",
      submitMode: "auto_submit",
      confidenceThreshold: 0.9,
      ...overrides,
    },
    revision: 1,
    writable: true,
  };
}

export function hostPayload({ run = null, checks = readinessChecks(), ready = true, health = true } = {}) {
  return {
    ok: true,
    apiBaseUrl: API_BASE,
    port: 8000,
    origin: "http://127.0.0.1:3080",
    process: { managed: true, running: true, pid: 4242 },
    launch: { kind: "binary", backendDir: "/Users/teacher/.local/suhuang-scroll" },
    cors: { origin: "http://127.0.0.1:3080", allowed: true },
    host: { pluginVersion: "0.4.0", expectedProtocol: 1 },
    readiness: {
      supported: true,
      error: null,
      data: {
        ready,
        generated_at: "2026-10-18T13:00:00+08:00",
        checks,
        extension: {
          connected: true,
          stale: false,
          clients: [
            {
              extension_id: "a".repeat(32),
              name: "Suhuang Scroll Bridge",
              version: "0.6.4",
              protocol_version: 1,
              protocol_compatible: true,
              version_matches_runtime: true,
              state: "connected",
              seconds_since_seen: 3,
              data_consent_granted: true,
              active_site: { host: "www.zhixue.com", matched_adapter_id: "zhixue", observed_at: "2026-10-18T13:00:00+08:00" },
            },
          ],
        },
        model: {
          provider: "aliyun",
          model: "Qwen/Qwen3.6-27B",
          base_url: "https://api.example.com/v1",
          api_key_configured: true,
        },
        specs: { count: 1, names: ["math.md"], selected: "/tmp/specs/math.md" },
        adapters: {
          registry_ok: true,
          default_adapter: "zhixue",
          enabled: [{ id: "zhixue", display_name: "智学网" }],
          disabled: [],
          selected: "zhixue",
          selected_enabled: true,
        },
        site: { host: "www.zhixue.com", matched_adapter_id: "zhixue" },
        runtime: { version: "0.6.4", protocol_version: 1, pid: 4242, uptime_seconds: 120 },
        automation: {
          active: Boolean(run),
          run_id: run ? "run-synthetic" : null,
          state: run?.state ?? null,
          completed_count: run?.completed_count ?? 0,
          elapsed_seconds: run?.elapsed_seconds ?? 0,
          paused_seconds: run?.paused_seconds ?? 0,
          warning_count: run?.warning_count ?? 0,
        },
      },
    },
    health: health ? { status: "ok", version: "0.6.4", protocol_version: 1 } : null,
    automation: { active: Boolean(run), run },
  };
}

export function runningRun(overrides = {}) {
  return {
    run_id: "run-synthetic",
    state: "grading",
    adapter: "zhixue",
    spec_path: "/tmp/specs/math.md",
    run_dir: "/tmp/runs/run-synthetic",
    exam_id: "synthetic-exam",
    student_id: "synthetic-student",
    question: {},
    execution: {},
    started_at: "2026-10-18T12:54:00+08:00",
    updated_at: "2026-10-18T13:00:00+08:00",
    elapsed_seconds: 372,
    active_seconds: 360,
    paused_seconds: 12,
    completed_count: 13,
    warning_count: 1,
    pause_requested: false,
    stop_requested: false,
    current_page_context: { pageUrl: "https://www.zhixue.com/synthetic", site: "zhixue", paperIndex: 13 },
    ...overrides,
  };
}

export function awaitingRun(overrides = {}) {
  return runningRun({
    state: "awaiting_confirmation",
    completed_count: 13,
    elapsed_seconds: 400,
    pending_decision: {
      suggested_score: 8.5,
      confidence: 0.62,
      batch_scores: { 0: 3, 1: 5.5 },
      review_flags: [{ code: "low_confidence", message: "置信度低于阈值，建议人工复核", severity: "warning" }],
      ocr_text: "第 3 题：x = 12",
    },
    ...overrides,
  });
}

export function completedRun(overrides = {}) {
  return runningRun({
    state: "stopped",
    pause_reason: "end_of_queue",
    completed_count: 24,
    warning_count: 2,
    elapsed_seconds: 842,
    paused_seconds: 30,
    active: false,
    last_record: { timestamp: "2026-10-18T13:00:00+08:00", suggested_score: 8.5, confidence: 0.92, status: "submitted" },
    ...overrides,
  });
}

/** A fetch double for the plugin's same-origin bridge. */
export function fetchMock({ settings = settingsPayload(), host = hostPayload() } = {}) {
  const calls = [];
  const mock = async (url, init = {}) => {
    const path = String(url);
    calls.push({ path, method: init.method ?? "GET", body: init.body });
    const response = (body, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
    if (path === "/suhuang-scroll/settings") {
      let payload = settings;
      if (init.method === "POST") {
        const request = JSON.parse(init.body ?? "{}");
        payload = {
          ...settings,
          value: { ...settings.value, ...(request.patch ?? {}) },
          revision: (settings.revision ?? 0) + 1,
        };
      }
      return response(payload);
    }
    if (path === "/suhuang-scroll/runtime") return response(host);
    if (path === "/suhuang-scroll/runtime-api") {
      const request = JSON.parse(init.body ?? "{}");
      if (request.path === "/specs") {
        return response({
          ok: true,
          data: { specs: [{ value: "/tmp/specs/math.md", label: "math.md" }] },
        });
      }
      if (request.path === "/resources") {
        return response({
          ok: true,
          data: {
            providers: [{ value: "aliyun", label: "阿里云" }],
            defaultProvider: "aliyun",
            adapters: [{ value: "zhixue", label: "智学网" }],
            defaultAdapter: "zhixue",
          },
        });
      }
      if (request.path === "/provider/status") {
        return response({
          ok: true,
          data: { provider: "aliyun", model: "Qwen/Qwen3.6-27B", base_url: "https://api.example.com/v1", api_key_configured: true },
        });
      }
      if (request.path.startsWith("/automation/")) return response({ ok: true, data: { state: "grading" } });
      return response({ ok: false, error: `unsupported ${request.path}`, status: 404 }, 200);
    }
    return response({ ok: false, error: `unexpected ${path}` }, 404);
  };
  mock.calls = calls;
  return mock;
}
