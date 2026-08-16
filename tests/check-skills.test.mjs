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
  if (docs && ["rust", "porting", "workflow", "misc"].includes(bucket)) {
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

test("an in-progress skill listed in plugin.json is an error", () => {
  const root = scaffold();
  addSkill(root, "in-progress", "draft-skill");
  promote(root, "in-progress", "draft-skill");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("not promoted")));
});

test("a fully indexed promoted misc skill passes", () => {
  const root = scaffold();
  addSkill(root, "misc", "setup-rust-ci");
  promote(root, "misc", "setup-rust-ci");
  const { errors } = checkRepo(root);
  assert.deepEqual(errors, []);
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

test("openai policy without the user-invoked frontmatter flag is an error", () => {
  const root = scaffold();
  const dir = addSkill(root, "workflow", "rust-skills-map");
  writeFileSync(
    join(dir, "agents", "openai.yaml"),
    'interface:\n  display_name: "rust-skills-map"\n  short_description: "Map"\npolicy:\n  allow_implicit_invocation: false\n'
  );
  promote(root, "workflow", "rust-skills-map");
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("model-invoked in frontmatter")));
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

test("a README badge count that disagrees with the manifest is an error", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust");
  promote(root, "rust", "idiomatic-rust");
  writeFileSync(
    join(root, "README.md"),
    `# Skills\n\n[![skills](https://example.com/badge/skills-2-f2723f.svg)](#skills)\n\n- [idiomatic-rust](./skills/rust/idiomatic-rust/SKILL.md) — does the thing\n`
  );
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("badge") && e.includes("skills-2")));
});

test("README prose skill count that disagrees with the manifest is an error", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust");
  promote(root, "rust", "idiomatic-rust");
  writeFileSync(
    join(root, "README.md"),
    `# Skills\n\n25 skills that teach judgment.\n\n- [idiomatic-rust](./skills/rust/idiomatic-rust/SKILL.md) — does the thing\n`
  );
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("prose") && e.includes("25 skills")));
});

test("README counts that agree with the manifest pass", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust");
  promote(root, "rust", "idiomatic-rust");
  writeFileSync(
    join(root, "README.md"),
    `# Skills\n\n[![1 skill](https://example.com/badge/skills-1-bc4710.svg)](#skills)\n\n1 skill that teaches judgment.\n\n- [idiomatic-rust](./skills/rust/idiomatic-rust/SKILL.md) — does the thing\n`
  );
  const { errors } = checkRepo(root);
  assert.deepEqual(errors, []);
});

test("a stale bucket count phrase in shipped prose is an error", () => {
  const root = scaffold();
  addSkill(root, "rust", "idiomatic-rust");
  addSkill(root, "workflow", "rust-testing");
  const path = join(root, ".claude-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.skills.push("./skills/rust/idiomatic-rust", "./skills/workflow/rust-testing");
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(root, "README.md"),
    `# Skills\n\nFour areas of judgment.\n\n- [idiomatic-rust](./skills/rust/idiomatic-rust/SKILL.md) — does the thing\n- [rust-testing](./skills/workflow/rust-testing/SKILL.md) — does the thing\n`
  );
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("Four areas") && e.includes("2 buckets")));
});

test("a stale route count in the router docs page is an error", () => {
  const root = scaffold();
  const dir = addSkill(root, "workflow", "rust-skills-map", { userInvoked: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: rust-skills-map\ndescription: The router for the set.\ndisable-model-invocation: true\n---\n\n# Rust Skills Map\n\n## The three flows, one line each\n\n- **One** — first\n- **Two** — second\n- **Three** — third\n`
  );
  promote(root, "workflow", "rust-skills-map");
  writeFileSync(
    join(root, "docs", "workflow", "rust-skills-map.md"),
    "## What it does\n\nFour routes, in `FLOWS.md`.\n"
  );
  const { errors } = checkRepo(root);
  assert.ok(errors.some((e) => e.includes("Four routes") && e.includes("3 flows")));
});

test("a router flows heading that disagrees with its bullet list is an error", () => {
  const root = scaffold();
  const dir = addSkill(root, "workflow", "rust-skills-map", { userInvoked: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: rust-skills-map\ndescription: The router for the set.\ndisable-model-invocation: true\n---\n\n# Rust Skills Map\n\n## The four flows, one line each\n\n- **One** — first\n- **Two** — second\n`
  );
  promote(root, "workflow", "rust-skills-map");
  const { errors } = checkRepo(root);
  assert.ok(
    errors.some((e) => e.includes("The four flows") && e.includes("lists 2"))
  );
});
