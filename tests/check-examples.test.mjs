import { test } from "node:test";
import assert from "node:assert/strict";
import { extractBlocks } from "../scripts/check-examples.mjs";

test("extracts an untagged rust block with its line number", () => {
  const md = ["intro", "```rust", "fn main() {}", "```", "outro"].join("\n");
  const blocks = extractBlocks(md, "a.md");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].code, "fn main() {}");
  assert.equal(blocks[0].file, "a.md");
  assert.equal(blocks[0].line, 2);
});

test("skips a rust,ignore block", () => {
  const md = ["```rust,ignore", "let x = undefined_thing;", "```"].join("\n");
  assert.deepEqual(extractBlocks(md, "a.md"), []);
});

test("skips non-rust blocks", () => {
  const md = ["```bash", "cargo test", "```", "```toml", "x = 1", "```"].join("\n");
  assert.deepEqual(extractBlocks(md, "a.md"), []);
});

test("extracts several blocks from one file", () => {
  const md = ["```rust", "fn a() {}", "```", "text", "```rust", "fn b() {}", "```"].join("\n");
  const blocks = extractBlocks(md, "a.md");
  assert.deepEqual(blocks.map((b) => b.code), ["fn a() {}", "fn b() {}"]);
});

test("a fence inside a doc comment does not terminate the block", () => {
  const md = ["```rust", "/// ```", "/// let x = 1;", "/// ```", "fn documented() {}", "```", "after"].join("\n");
  const blocks = extractBlocks(md, "a.md");
  assert.equal(blocks.length, 1);
  assert.match(blocks[0].code, /fn documented/);
});

test("a longer opening fence is not closed by a shorter one", () => {
  const md = ["````rust", "```", "fn inner() {}", "```", "````"].join("\n");
  const blocks = extractBlocks(md, "a.md");
  assert.equal(blocks.length, 1);
  assert.match(blocks[0].code, /fn inner/);
});
