import {
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";

// A fence line is a line whose first non-whitespace characters are a run of
// three or more backticks, optionally followed by an info string ("```rust").
// The run length matters: a block opened by four backticks is closed only by
// a fence of four or more.
const FENCE = /^\s*(`{3,})(.*)$/;

export function extractBlocks(markdown, filePath) {
  const blocks = [];
  let inside = false;
  let openLength = 0;
  let openLine = 0;
  let code = [];
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const fence = FENCE.exec(line);
    if (inside) {
      // A block closes only on a fence of at least the opening run length
      // with no info string. That keeps "/// ```" inside a doc-comment
      // example from closing early, and keeps a three-backtick fence from
      // closing a four-backtick one.
      if (fence && fence[1].length >= openLength && fence[2].trim() === "") {
        blocks.push({ code: code.join("\n"), file: filePath, line: openLine });
        inside = false;
      } else {
        code.push(line);
      }
    } else if (fence && fence[2].trim() === "rust") {
      // Collect only untagged `rust` blocks; skip `rust,ignore`,
      // `rust,no_run`, and every non-Rust tag.
      inside = true;
      openLength = fence[1].length;
      openLine = index + 1; // 1-based line of the opening fence
      code = [];
    }
  }
  if (inside) {
    // An unclosed fence runs to EOF in Markdown; keep the block so the
    // compiler sees the damage instead of us silently skipping it.
    blocks.push({ code: code.join("\n"), file: filePath, line: openLine });
  }
  return blocks;
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function walkMarkdown(dir, root, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // directory does not exist
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    const rel = toPosix(relative(root, path));
    // Plans and specs are working documents, not shipped prose, and they
    // quote examples deliberately.
    if (rel === "docs/superpowers") continue;
    if (statSync(path).isDirectory()) {
      walkMarkdown(path, root, out);
    } else if (entry.endsWith(".md")) {
      out.push(rel);
    }
  }
}

export function collectFiles(repoRoot) {
  const files = [];
  walkMarkdown(join(repoRoot, "skills"), repoRoot, files);
  walkMarkdown(join(repoRoot, "docs"), repoRoot, files);
  return files.sort();
}

export function renderCrate(blocks) {
  const parts = ["#![allow(dead_code, unused_imports, unused_variables, unused_mut)]", ""];
  blocks.forEach((block, i) => {
    // The module wrapper keeps two blocks from colliding on the same item
    // name; a `fn main` inside a module is just a function. Known
    // limitation: a block carrying an inner attribute (`#![...]`) cannot be
    // wrapped in a module, so it fails with a confusing error. No shipped
    // block has one today; if one appears, re-fence it or drop the
    // attribute.
    parts.push(
      `// ${block.file}:${block.line}`,
      `mod example_${i + 1} {`,
      block.code,
      "}",
      ""
    );
  });
  return parts.join("\n");
}

// Starter dependencies for the examples; Task 15's triage finds what the
// shipped blocks actually need. Pinned to edition 2021 — pin 2024 here (with
// a note on which block forced it) only if a block needs a 2024-only form.
const CARGO_TOML = `[package]
name = "skill-examples"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
thiserror = "2"
anyhow = "1"
serde = { version = "1", features = ["derive"] }
`;

function main() {
  const repoRoot = process.cwd();
  const files = collectFiles(repoRoot);
  const blocks = [];
  for (const file of files) {
    blocks.push(...extractBlocks(readFileSync(join(repoRoot, file), "utf8"), file));
  }

  const crateDir = join(repoRoot, "target", "skill-examples");
  mkdirSync(join(crateDir, "src"), { recursive: true });
  writeFileSync(join(crateDir, "Cargo.toml"), CARGO_TOML);
  writeFileSync(join(crateDir, "src", "lib.rs"), renderCrate(blocks));

  const probe = spawnSync("cargo", ["--version"]);
  if (probe.error) {
    // A silent skip is how a gate stops being a gate.
    console.error("✗ cargo is not on PATH; the example compile gate cannot run.");
    console.error(`  (probe failed: ${probe.error.message})`);
    process.exit(1);
  }

  const result = spawnSync(
    "cargo",
    ["check", "--quiet", "--manifest-path", join(crateDir, "Cargo.toml")],
    { encoding: "utf8" }
  );
  const output = [result.stdout, result.stderr].filter(Boolean).join("");
  if (result.status !== 0) {
    console.error(
      `✗ cargo check failed on the extracted examples (${blocks.length} block(s) from ${files.length} file(s)).`
    );
    console.error("");
    console.error("Block-to-source map:");
    blocks.forEach((b, i) => console.error(`example_${i + 1} = ${b.file}:${b.line}`));
    console.error("");
    console.error("--- cargo output ---");
    console.error(output.trimEnd());
    process.exit(1);
  }
  console.log(
    `✓ ${blocks.length} untagged rust block(s) across ${files.length} file(s) compile`
  );
}

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) main();
