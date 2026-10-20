import assert from "node:assert/strict";
import test from "node:test";

import * as store from "../src/client/store.js";
import { fetchMock, hostPayload, settingsPayload } from "./fixtures.js";

test.afterEach(() => {
  store.__resetForTests();
  delete globalThis.fetch;
});

test("settings refresh normalizes the submit mode and keeps the revision", async () => {
  globalThis.fetch = fetchMock({ settings: settingsPayload({ submitMode: "manual_confirm" }) });
  await store.refreshSettings();
  const { settings } = store.getState();
  assert.equal(settings.status, "ready");
  assert.equal(settings.value.submitMode, "manual_confirm");
  assert.equal(settings.revision, 1);
  assert.equal(settings.writable, true);
});

test("host refresh derives readiness rows and the console phase", async () => {
  globalThis.fetch = fetchMock({ host: hostPayload() });
  await store.refreshSettings();
  await store.refreshHost();
  const state = store.getState();
  assert.equal(state.connection, "ok");
  assert.equal(state.phase, "ready");
  assert.equal(state.readiness.supported, true);
  assert.equal(state.readiness.rows.length, 5);
});

test("catalog refresh feeds spec/site options from the runtime allow-list", async () => {
  globalThis.fetch = fetchMock();
  await store.refreshSettings();
  await store.refreshCatalog();
  const { catalog } = store.getState();
  assert.equal(catalog.state, "ready");
  assert.equal(catalog.specs.length, 1);
  assert.equal(catalog.specs[0].value, "/tmp/specs/math.md");
  assert.equal(catalog.resources.adapters[0].value, "zhixue");
  assert.equal(catalog.provider.api_key_configured, true);
});

test("starting a manual-confirm run posts dev=true through the bridge", async () => {
  const fetch = fetchMock({ settings: settingsPayload({ submitMode: "manual_confirm" }) });
  globalThis.fetch = fetch;
  await store.refreshSettings();
  await store.refreshCatalog();
  await store.startGrading();
  const startCall = fetch.calls.find(
    (call) => call.path === "/suhuang-scroll/runtime-api" && String(call.body).includes("/automation/start"),
  );
  assert.ok(startCall, "start request reached the bridge");
  const forwarded = JSON.parse(startCall.body);
  assert.equal(forwarded.path, "/automation/start");
  assert.equal(forwarded.body.dev, true);
  assert.equal(forwarded.body.spec_path, "/tmp/specs/math.md");
});

test("settings updates send the revision they were read from", async () => {
  const fetch = fetchMock();
  globalThis.fetch = fetch;
  await store.refreshSettings();
  await store.updateSettings({ adapter: "zhixue" });
  const updateCall = fetch.calls.find(
    (call) => call.path === "/suhuang-scroll/settings" && call.method === "POST",
  );
  assert.ok(updateCall);
  const body = JSON.parse(updateCall.body);
  assert.equal(body.operation, "update");
  assert.equal(body.expectedRevision, 1);
  assert.equal(body.patch.adapter, "zhixue");
});

test("spec import rejects the wrong file type before any network call", async () => {
  globalThis.fetch = fetchMock();
  await assert.rejects(
    store.importSpec({ name: "scores.txt", size: 10, text: async () => "" }),
    /SPEC_FILE_TYPE/,
  );
});
