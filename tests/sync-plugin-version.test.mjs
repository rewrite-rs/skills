import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncVersion } from "../scripts/sync-plugin-version.mjs";

function scaffold(packageVersion, pluginVersion) {
  const root = mkdtempSync(join(tmpdir(), "version-test-"));
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "rewrite-rs-skills", version: packageVersion }, null, 2)
  );
  writeFileSync(
    join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "rewrite-rs-skills", version: pluginVersion, skills: [] }, null, 2)
  );
  return root;
}

test("writes the package version into plugin.json when they differ", () => {
  const root = scaffold("0.2.0", "0.1.0");
  const result = syncVersion(root, { check: false });
  assert.equal(result.changed, true);
  const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(plugin.version, "0.2.0");
});

test("reports no change when versions already match", () => {
  const root = scaffold("0.1.0", "0.1.0");
  const result = syncVersion(root, { check: false });
  assert.equal(result.changed, false);
});

test("check mode does not write", () => {
  const root = scaffold("0.2.0", "0.1.0");
  const result = syncVersion(root, { check: true });
  assert.equal(result.changed, true);
  const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(plugin.version, "0.1.0");
});

function addCodex(root, version) {
  mkdirSync(join(root, ".codex-plugin"), { recursive: true });
  writeFileSync(
    join(root, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "rewrite-rs-skills", version, skills: "./skills/" }, null, 2)
  );
}

test("writes the package version into the Codex manifest too", () => {
  const root = scaffold("0.2.0", "0.2.0");
  addCodex(root, "0.1.0");
  const result = syncVersion(root, { check: false });
  assert.equal(result.changed, true);
  const codex = JSON.parse(readFileSync(join(root, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(codex.version, "0.2.0");
});

test("check mode flags a stale Codex manifest without writing", () => {
  const root = scaffold("0.2.0", "0.2.0");
  addCodex(root, "0.1.0");
  const result = syncVersion(root, { check: true });
  assert.equal(result.changed, true);
  const codex = JSON.parse(readFileSync(join(root, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(codex.version, "0.1.0");
});

test("a missing Codex manifest is not an error", () => {
  const root = scaffold("0.1.0", "0.1.0");
  assert.equal(syncVersion(root, { check: true }).changed, false);
});
