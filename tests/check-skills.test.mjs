import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRepo, collectSkills } from "../scripts/check-skills.mjs";

function scaffold() {
  const root = mkdtempSync(join(tmpdir(), "skills-test-"));
  for (const bucket of ["rust", "porting", "workflow", "misc", "in-progress"]) {
    mkdirSync(join(root, "skills", bucket), { recursive: true });
  }
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  mkdirSync(join(root, "docs", "rust"), { recursive: true });
  writeFileSync(join(root, "README.md"), "# Skills\n");
  writeFileSync(
    join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "rewrite-rs-skills", version: "0.1.0", skills: [] }, null, 2)
  );
  return root;
}

function addSkill(root, bucket, name, { userInvoked = false, docs = true } = {}) {
  const dir = join(root, "skills", bucket, name);
  mkdirSync(join(dir, "agents"), { recursive: true });
  const flag = userInvoked ? "disable-model-invocation: true\n" : "";
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: Does the ${name} thing.\n${flag}---\n\n# ${name}\n`
  );
  const policy = userInvoked
    ? "policy:\n  allow_implicit_invocation: false\n"
    : "";
  writeFileSync(
    join(dir, "agents", "openai.yaml"),
    `interface:\n  display_name: "${name}"\n  short_description: "Does the ${name} thing"\n${policy}`
  );
  if (docs && ["rust", "porting", "workflow"].includes(bucket)) {
    mkdirSync(join(root, "docs", bucket), { recursive: true });
    writeFileSync(join(root, "docs", bucket, `${name}.md`), "## What it does\n");
  }
  return dir;
}

function promote(root, bucket, name) {
  const path = join(root, ".claude-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.skills.push(`./skills/${bucket}/${name}`);
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(root, "README.md"),
    `# Skills\n\n- [${name}](./skills/${bucket}/${name}/SKILL.md) — does the thing\n`
  );
}

test("collectSkills finds a skill and reads its frontmatter", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust");
  const skills = collectSkills(root);
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, "idiomatic-rust");
  assert.equal(skills[0].bucket, "rust");
  assert.equal(skills[0].promoted, true);
  assert.equal(skills[0].userInvoked, false);
});

test("a promoted skill missing from plugin.json is an error", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("plugin.json")));
});

test("a fully indexed promoted skill passes", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust");
  promote(root, "rust", "idiomatic-rust");
  const { errors } = checkRepo(root);
  assert.deepEqual(errors, []);
});

test("a misc skill listed in plugin.json is an error", () => {
  const root = scaffold();
  addSkill(root, "misc", "setup-rust-ci");
  promote(root, "misc", "setup-rust-ci");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("not promoted")));
});

test("frontmatter name must match the directory name", () => {
  const root = scaffold();
  const dir = addSkill(root, "rust", "idiomatic-rust");
  writeFileSync(
    join(dir, "SKILL.md"),
    "---\nname: wrong-name\ndescription: Mismatched.\n---\n"
  );
  promote(root, "rust", "idiomatic-rust");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("does not match directory")));
});

test("user-invoked frontmatter without the openai policy is an error", () => {
  const root = scaffold();
  const dir = addSkill(root, "workflow", "setup-rust-skills", { userInvoked: true });
  writeFileSync(
    join(dir, "agents", "openai.yaml"),
    'interface:\n  display_name: "setup-rust-skills"\n  short_description: "Setup"\n'
  );
  promote(root, "workflow", "setup-rust-skills");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("allow_implicit_invocation")));
});

test("a promoted skill with no docs page is an error", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust", { docs: false });
  promote(root, "rust", "idiomatic-rust");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("docs page")));
});

test("a skill missing agents/openai.yaml is an error", () => {
  const root = scaffold();
  const dir = addSkill(root, "rust", "idiomatic-rust");
  rmSync(join(dir, "agents", "openai.yaml"));
  promote(root, "rust", "idiomatic-rust");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("openai.yaml")));
});
