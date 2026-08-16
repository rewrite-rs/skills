import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PROMOTED_BUCKETS = ["rust", "porting", "workflow", "misc"];
const ALL_BUCKETS = [...PROMOTED_BUCKETS, "in-progress"];

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function countNumber(token) {
  if (/^\d+$/.test(token)) return Number(token);
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

// Count phrases in shipped prose, e.g. "Four areas" or "The four flows".
// "N skills" is checked separately, in README.md only: a generic phrase like
// "the two skills that both seem right" is not a claim about the set size.
const COUNT_PHRASE =
  /\b(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+)\s+(areas?|buckets?|routes?|flows?)\b/g;
const COUNT_FILES = [
  "README.md",
  "skills/workflow/rust-skills-map/SKILL.md",
  "skills/workflow/rust-skills-map/FLOWS.md",
  "docs/workflow/rust-skills-map.md",
];

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
    } else {
      const yaml = readFileSync(openaiPath, "utf8");
      const policy = /allow_implicit_invocation:\s*false/.test(yaml);
      if (skill.userInvoked && !policy) {
        errors.push(
          `${label}: user-invoked but agents/openai.yaml lacks policy.allow_implicit_invocation: false`
        );
      }
      if (!skill.userInvoked && policy) {
        errors.push(
          `${label}: model-invoked in frontmatter but agents/openai.yaml sets policy.allow_implicit_invocation: false`
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

  // The skill count, in the badge URL and in README prose, must equal the
  // manifest length; the bucket and flow counts in shipped prose must equal
  // what the manifest and the router actually contain.
  const skillCount = (manifest.skills ?? []).length;
  for (const match of readme.matchAll(/skills-(\d+)/g)) {
    if (Number(match[1]) !== skillCount) {
      errors.push(
        `README.md: badge says "skills-${match[1]}" but plugin.json lists ${skillCount}`
      );
    }
  }
  for (const match of readme.matchAll(/\b(\d+)\s+skills?\b/g)) {
    if (Number(match[1]) !== skillCount) {
      errors.push(
        `README.md: prose says "${match[0]}" but plugin.json lists ${skillCount}`
      );
    }
  }

  const bucketCount = new Set(
    (manifest.skills ?? []).map((entry) => entry.split("/")[2])
  ).size;

  // The flow count anchors on the bullet list in the router SKILL.md, under
  // the "The <word> flows" heading: counting FLOWS.md sections instead would
  // count the tie-breaker section as a route.
  let flowCount = null;
  const routerSkillPath = join(repoRoot, "skills", "workflow", "rust-skills-map", "SKILL.md");
  if (existsSync(routerSkillPath)) {
    const lines = readFileSync(routerSkillPath, "utf8").split(/\r?\n/);
    const start = lines.findIndex((line) =>
      /^## The \w+ flows, one line each$/.test(line.trim())
    );
    if (start >= 0) {
      const word = /^## The (\w+) flows/.exec(lines[start])[1];
      let end = lines.length;
      for (let i = start + 1; i < lines.length; i += 1) {
        if (/^## /.test(lines[i].trim())) {
          end = i;
          break;
        }
      }
      flowCount = lines.slice(start + 1, end).filter((line) => /^- /.test(line.trim())).length;
      const named = countNumber(word);
      if (named !== null && named !== flowCount) {
        errors.push(
          `skills/workflow/rust-skills-map/SKILL.md: "The ${word} flows" heading names ${named} but the section lists ${flowCount}`
        );
      }
    }
  }

  for (const rel of COUNT_FILES) {
    const source = existsSync(join(repoRoot, rel))
      ? readFileSync(join(repoRoot, rel), "utf8")
      : null;
    if (source === null) continue;
    for (const match of source.matchAll(COUNT_PHRASE)) {
      const noun = match[2].toLowerCase();
      const isBucket = noun === "area" || noun === "areas" || noun === "bucket" || noun === "buckets";
      const expected = isBucket ? bucketCount : flowCount;
      if (expected === null) continue;
      const actual = countNumber(match[1]);
      if (actual !== expected) {
        errors.push(
          `${rel}: says "${match[0]}" but ${isBucket ? `plugin.json lists ${expected} buckets` : `the router lists ${expected} flows`}`
        );
      }
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
