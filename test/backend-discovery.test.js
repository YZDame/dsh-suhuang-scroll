import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveBackendLaunch } from "../runtime.js";

function fixture(name) {
  const root = join(tmpdir(), `dsh-suhuang-scroll-${process.pid}-${name}`);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  return root;
}

function touch(path) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, "");
}

test("explicit backend directory takes precedence", () => {
  const root = fixture("explicit");
  const configured = join(root, "custom");
  touch(join(configured, "main.py"));
  touch(join(root, ".local", "suhuang-scroll", "bin", "suhuang-backend"));

  assert.deepEqual(resolveBackendLaunch(configured, { pluginDir: join(root, "plugin"), homeDir: root }), {
    kind: "python",
    backendDir: configured,
  });
});

test("source checkout is discovered before the user installation", () => {
  const root = fixture("source");
  const pluginDir = join(root, "plugins", "dsh-suhuang-scroll");
  const backendDir = join(root, "core", "python");
  touch(join(backendDir, "main.py"));
  touch(join(root, "home", ".local", "suhuang-scroll", "bin", "suhuang-backend"));

  assert.deepEqual(resolveBackendLaunch("", { pluginDir, homeDir: join(root, "home") }), {
    kind: "python",
    backendDir,
  });
});

test("packaged Runtime is discovered in the standard user install", () => {
  const root = fixture("packaged");
  const pluginDir = join(root, "package", "node_modules", "dsh-suhuang-scroll");
  const installRoot = join(root, "home", ".local", "suhuang-scroll");
  const executable = join(installRoot, "bin", "suhuang-backend");
  touch(executable);

  assert.deepEqual(resolveBackendLaunch("", { pluginDir, homeDir: join(root, "home"), platform: "darwin" }), {
    kind: "binary",
    backendDir: installRoot,
    executable,
  });
});

test("missing Runtime returns null", () => {
  const root = fixture("missing");
  assert.equal(resolveBackendLaunch("", {
    pluginDir: join(root, "package", "node_modules", "dsh-suhuang-scroll"),
    homeDir: join(root, "home"),
  }), null);
});
