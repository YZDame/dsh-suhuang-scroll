import assert from "node:assert/strict";
import test from "node:test";

import { loadPlugin, NS } from "./harness.js";
import { zh, en } from "../src/client/i18n.js";

test("bundle registers under its npm package id with slots and locale injected", () => {
  const plugin = loadPlugin();
  assert.equal(plugin.loadedId, "dsh-suhuang-scroll");
  assert.deepEqual([...plugin.exported.inject], ["slots", "locale"]);
  assert.ok(plugin.dictionaries[NS], "locale dictionary was registered");
});

test("all four DSH seats are registered", () => {
  const plugin = loadPlugin();
  const names = plugin.registrations.map((registration) => registration.options.name);
  assert.ok(names.includes("settings.section"));
  assert.ok(names.includes("sidebar.panellist"));
  assert.ok(names.includes("main"));
  assert.ok(names.includes("sidebar.right.pane.tab"));
  assert.ok(names.includes("sidebar.right.pane.tab.title"));
});

test("the sidebar icon row opens the main panel key", () => {
  const plugin = loadPlugin();
  const panellist = plugin.find("sidebar.panellist");
  const main = plugin.find("main");
  assert.equal(panellist.options.id, "suhuang-scroll");
  assert.equal(main.options.key, "suhuang-scroll");
  assert.equal(panellist.options.order, 60);
});

test("the settings section keeps its id, order and localized label", () => {
  const plugin = loadPlugin();
  const settings = plugin.find("settings.section");
  assert.equal(settings.options.id, "suhuang-scroll");
  assert.equal(settings.options.order, 120);
  assert.equal(settings.options.label(), "苏黄共阅");
});

test("the right tab type matches the keyed title and body registrations", () => {
  const plugin = loadPlugin();
  const [action, definition] = plugin.calls.find(([name]) => name === "register");
  assert.equal(action, "register");
  assert.equal(definition.id, "dsh-suhuang-scroll/runtime");
  assert.equal(definition.kind, "suhuang-scroll");
  const title = plugin.find("sidebar.right.pane.tab.title");
  const body = plugin.find("sidebar.right.pane.tab");
  assert.equal(title.options.key, definition.id);
  assert.equal(body.options.key, definition.id);
});

test("opening the right tab returns to the conversation before opening it", () => {
  const plugin = loadPlugin();
  const main = plugin.find("main");
  main.options.inject().onOpenRightTab();
  assert.deepEqual(
    plugin.calls.filter(([name]) => name === "select" || name === "open"),
    [
      ["select", null],
      ["open", "suhuang-scroll"],
    ],
  );
});

test("no open conversation fails visibly and leaves the console selected", () => {
  const plugin = loadPlugin({ mounted: false });
  const main = plugin.find("main");
  assert.throws(() => main.options.inject().onOpenRightTab(), /请先打开一个会话/);
  assert.ok(!plugin.calls.some(([name]) => name === "select"));
});

test("a client without the right sidebar reports it instead of silently swallowing", () => {
  const plugin = loadPlugin({ rightAvailable: false });
  const main = plugin.find("main");
  assert.throws(() => main.options.inject().onOpenRightTab(), /当前客户端未提供右侧栏/);
});

test("the tab title renders the icon and the translated label", () => {
  const plugin = loadPlugin();
  const title = plugin.find("sidebar.right.pane.tab.title");
  const html = plugin.renderMarkup(title.component({ locale: plugin.locale }));
  assert.match(html, /data-icon="list-pen"/);
  assert.match(html, /苏黄共阅/);
});

test("every readiness fix intent has a localized label and handler key", () => {
  const intents = [
    "refresh_readiness",
    "start_runtime",
    "restart_runtime",
    "stop_runtime",
    "open_model_settings",
    "test_model_connection",
    "import_spec",
    "open_spec_settings",
    "open_adapter_settings",
    "copy_adapter_command",
    "install_extension",
    "upgrade_extension",
    "upgrade_runtime",
    "reload_extension",
    "open_extension_consent",
    "open_grading_site",
    "open_docs",
  ];
  for (const intent of intents) {
    assert.ok(zh[`fix_${intent}`], `zh fix_${intent}`);
    assert.ok(en[`fix_${intent}`], `en fix_${intent}`);
  }
});

test("zh and en dictionaries carry exactly the same keys", () => {
  const plugin = loadPlugin();
  const dictionaries = plugin.dictionaries[NS];
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), Object.keys(dictionaries.en).sort());
});
