import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PROMOTED_BUCKETS = ["rust", "porting", "workflow"];
const ALL_BUCKETS = [...PROMOTED_BUCKETS, "misc", "in-progress"];

function parseFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

export function collectSkills(repoRoot) {
  const skills = [];
  for (const bucket of ALL_BUCKETS) {
    const bucketDir = join(repoRoot, "skills", bucket);
    if (!existsSync(bucketDir)) continue;
    for (const entry of readdirSync(bucketDir)) {
      const dir = join(bucketDir, entry);
      if (!statSync(dir).isDirectory()) continue;
      const skillFile = join(dir, "SKILL.md");
      if (!existsSync(skillFile)) continue;
      const frontmatter = parseFrontmatter(readFileSync(skillFile, "utf8")) ?? {};
      skills.push({
        name: frontmatter.name ?? null,
        directory: entry,
        bucket,
        dir,
        promoted: PROMOTED_BUCKETS.includes(bucket),
        userInvoked: frontmatter["disable-model-invocation"] === "true",
        description: frontmatter.description ?? null,
      });
    }
  }
  return skills;
}

export function checkRepo(repoRoot) {
  const errors = [];
  const manifestPath = join(repoRoot, ".claude-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const listed = new Set(manifest.skills ?? []);
  const readme = existsSync(join(repoRoot, "README.md"))
    ? readFileSync(join(repoRoot, "README.md"), "utf8")
    : "";

  for (const skill of collectSkills(repoRoot)) {
    const label = `${skill.bucket}/${skill.directory}`;
    const entry = `./skills/${skill.bucket}/${skill.directory}`;

    if (!skill.name) {
      errors.push(`${label}: SKILL.md has no name in frontmatter`);
    } else if (skill.name !== skill.directory) {
      errors.push(`${label}: frontmatter name "${skill.name}" does not match directory`);
    }

    if (!skill.description) {
      errors.push(`${label}: SKILL.md has no description in frontmatter`);
    }

    const openaiPath = join(skill.dir, "agents", "openai.yaml");
    if (!existsSync(openaiPath)) {
      errors.push(`${label}: missing agents/openai.yaml`);
    } else if (skill.userInvoked) {
      const yaml = readFileSync(openaiPath, "utf8");
      if (!/allow_implicit_invocation:\s*false/.test(yaml)) {
        errors.push(
          `${label}: user-invoked but agents/openai.yaml lacks policy.allow_implicit_invocation: false`
        );
      }
    }

    if (skill.promoted) {
      if (!listed.has(entry)) {
        errors.push(`${label}: promoted but missing from plugin.json skills array`);
      }
      if (!readme.includes(entry.slice(1))) {
        errors.push(`${label}: promoted but not linked from README.md`);
      }
      if (!existsSync(join(repoRoot, "docs", skill.bucket, `${skill.directory}.md`))) {
        errors.push(`${label}: promoted but has no docs page at docs/${skill.bucket}/${skill.directory}.md`);
      }
    } else {
      if (listed.has(entry)) {
        errors.push(`${label}: in a bucket that is not promoted but listed in plugin.json`);
      }
      if (readme.includes(entry.slice(1))) {
        errors.push(`${label}: in a bucket that is not promoted but linked from README.md`);
      }
      if (existsSync(join(repoRoot, "docs", skill.bucket, `${skill.directory}.md`))) {
        errors.push(`${label}: in a bucket that is not promoted but has a docs page`);
      }
    }
  }

  for (const entry of listed) {
    const match = /^\.\/skills\/([^/]+)\/([^/]+)$/.exec(entry);
    if (!match || !existsSync(join(repoRoot, "skills", match[1], match[2], "SKILL.md"))) {
      errors.push(`plugin.json lists "${entry}" but no such skill exists`);
    }
  }

  return { errors };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const { errors } = checkRepo(process.cwd());
  for (const error of errors) console.error(`✗ ${error}`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log("✓ all skills correctly indexed");
}
