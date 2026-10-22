import assert from "node:assert/strict";
import test from "node:test";

import { loadPlugin } from "./harness.js";
import {
  awaitingRun,
  completedRun,
  fetchMock,
  hostPayload,
  readinessChecks,
  runningRun,
  settingsPayload,
} from "./fixtures.js";

async function bootAndRender(surface, hostOptions = {}, settingsOptions = {}, key) {
  const plugin = loadPlugin({
    fetch: fetchMock({ host: hostPayload(hostOptions), settings: settingsPayload(settingsOptions) }),
  });
  await plugin.exported.__testing.boot();
  try {
    return { html: plugin.render(surface, {}, key), plugin };
  } finally {
    plugin.exported.__testing.__resetForTests();
  }
}

test("the main console renders its offline state without a live host", () => {
  const plugin = loadPlugin();
  const html = plugin.render("main");
  assert.match(html, /data-testid="suhuang-scroll-console"/);
  assert.match(html, /苏黄共阅/);
  assert.match(html, /读取中|尚未启动/);
  assert.match(html, /启动苏黄共阅/);
});

test("the compact right tab renders the same console with the compact marker", () => {
  const plugin = loadPlugin();
  const html = plugin.render("sidebar.right.pane.tab", {}, "dsh-suhuang-scroll/runtime");
  assert.match(html, /data-testid="suhuang-scroll-console-compact"/);
  assert.match(html, /苏黄共阅/);
});

test("the settings section renders the one-time setup groups", () => {
  const plugin = loadPlugin();
  const html = plugin.render("settings.section");
  assert.match(html, /data-testid="suhuang-scroll-settings"/);
  assert.match(html, /环境自检/);
  assert.match(html, /模型服务/);
  assert.match(html, /Chrome 扩展/);
  assert.match(html, /文档与帮助/);
});

test("the English dictionary drives the same surfaces", () => {
  const plugin = loadPlugin({ language: "en" });
  const main = plugin.render("main");
  assert.match(main, /Start Suhuang Scroll/);
  const settings = plugin.render("settings.section");
  assert.match(settings, /Readiness/);
  assert.match(settings, /Model service/);
});

test("render does not require a live host: both containers stay deterministic", () => {
  const first = loadPlugin();
  const second = loadPlugin();
  assert.equal(first.render("main"), second.render("main"));
});

test("ready state renders the configuration summary and the start action", async () => {
  const { html } = await bootAndRender("main");
  assert.match(html, /准备开始阅卷|开始阅卷/);
  assert.match(html, /math\.md/);
  assert.match(html, /智学网/);
});

test("running state renders TUI-parity metrics and no fake total", async () => {
  const { html } = await bootAndRender("main", { run: runningRun() });
  assert.match(html, /正在连续阅卷/);
  assert.match(html, /已阅/);
  assert.match(html, /待复核/);
  assert.match(html, /6m 12s/);
  assert.doesNotMatch(html, /\b13\s*\/\s*\d+/);
});

test("error state exposes provider boundary, retryability, and answer image evidence", async () => {
  const hash = "a".repeat(64);
  const { html } = await bootAndRender("main", {
    run: runningRun({
      state: "error",
      error_message: "模型调用失败（HTTP 402）",
      last_error: {
        stage: "grade",
        error_code: "provider_http_error",
        message: "模型调用失败（HTTP 402）",
        local_status: 502,
        upstream_status: 402,
        provider_id: "deepseek",
        model_id: "deepseek-flash",
        request_id: "request-safe-id",
        retryable: false,
        audit_evidence: {
          paper_key: "paper-23",
          paper_key_source: "adapter_id",
          image_sha256: hash,
          image_hash_status: "present",
          image_mime_type: "image/png",
          image_byte_size: 128,
          image_width: 500,
          image_height: 200,
          capture_source: "canvas:answer",
        },
      },
    }),
  });
  assert.match(html, /最近错误详情/);
  assert.match(html, /provider_http_error/);
  assert.match(html, /Runtime 状态码/);
  assert.match(html, /502/);
  assert.match(html, /上游状态码/);
  assert.match(html, /402/);
  assert.match(html, /deepseek-flash/);
  assert.match(html, /request-safe-id/);
  assert.match(html, /不要自动重试/);
  assert.match(html, /paper-23/);
  assert.match(html, new RegExp(hash));
  assert.match(html, /canvas:answer/);
});

test("awaiting state renders the pending decision card with review flags", async () => {
  const { html } = await bootAndRender("main", { run: awaitingRun() });
  assert.match(html, /需要你确认/);
  assert.match(html, /8\.5/);
  assert.match(html, /置信度低于阈值/);
  assert.match(html, /确认提交/);
});

test("completed state renders the after-run summary", async () => {
  const { html } = await bootAndRender("main", {
    run: completedRun({
      last_record: {
        timestamp: "2026-10-18T13:00:00+08:00",
        suggested_score: 8.5,
        confidence: 0.92,
        status: "submitted",
        model_diagnostics: { provider_id: "deepseek", model_id: "deepseek-flash" },
        audit_evidence: {
          paper_key: "paper-24",
          paper_key_source: "adapter_id",
          image_sha256: "b".repeat(64),
          image_hash_status: "present",
        },
      },
    }),
  });
  assert.match(html, /本轮阅卷已完成/);
  assert.match(html, /8\.5/);
  assert.match(html, /最近答卷的模型与图像证据/);
  assert.match(html, /paper-24/);
  assert.match(html, /deepseek-flash/);
});

test("setup state renders the blocking fix and its localized label", async () => {
  const checks = readinessChecks({
    extension_connected: {
      status: "fail",
      blocking: true,
      summary: "No extension",
      fixes: [{ intent: "install_extension", label: "Install", params: {}, destructive: false }],
    },
  });
  const { html } = await bootAndRender("main", { run: null, checks, ready: false });
  assert.match(html, /先完成准备/);
  assert.match(html, /安装步骤/);
});

test("settings section hosts the shared overlay surface", () => {
  const plugin = loadPlugin();
  const html = plugin.render("settings.section");
  assert.match(html, /data-testid="suhuang-scroll-surfaces"/);
});
