# Code examples in skills

Every Rust block in a `SKILL.md`, a companion file, or a docs page is one of two
things, and the fence says which.

## The two fences

- ` ```rust ` — a complete, self-contained example. Every symbol it uses is either in
  `std`, declared in the block itself, or in a crate the surrounding prose names. It
  compiles on its own. Anything under this fence is a promise, and a broken promise is
  a bug to fix.
- ` ```rust,ignore ` — a deliberate fragment. A snippet that refers to a type defined
  in the paragraph above it, a signature with no body, a before/after pair where the
  "before" is the mistake being named, illustrative pseudocode. Nothing checks it,
  because there is nothing well-formed to check.

Non-Rust blocks keep their own tag: ` ```bash ` for commands, ` ```toml ` for
manifest fragments, ` ```markdown ` for frontmatter. The convention here is about
Rust only.

## Why the fence and not a classifier

Without the tag, a genuinely broken example and an intentionally incomplete one look
identical, so no check can tell them apart and every check has to grandfather its
failures. Tagging moves the judgment to the author, who already knows which one they
wrote, and leaves a machine-checkable claim behind.

## Which one to reach for

Default to ` ```rust `. Reach for `ignore` when making the block compile would mean
adding scaffolding that buries the point — five lines of struct definitions above a
two-line example is worse teaching, and the tag is the cheaper answer.

Do not reach for `ignore` because a block was not checked. That is the case the
convention exists to catch.

## Two re-fence cases the compile gate forces

- A block that compiles only at the crate root — a `$crate` path, an inner
  attribute — takes `rust,ignore` for a harness reason, not a content reason:
  the gate wraps each untagged block in a `mod example_N`, and inside a module
  `$crate` resolves to the generated crate root rather than the module that
  defined the helper, so the expansion fails with E0433 although the same
  block compiles at the root of a real crate. The standing case is the
  `_private` helper block in `skills/misc/rust-macros/SKILL.md`.
- A "before" half that compiles but is semantically unsound may stay untagged:
  the block passing the gate is itself the evidence the type system cannot
  catch the bug, and tagging it `ignore` would withdraw that claim. The
  standing case is the unsound `split_at_mut` in
  `skills/rust/unsafe-rust/SAFETY-REVIEW.md`, beside its sound fix.

## Verifying a `rust` block

The check is automated: `npm run check-examples` extracts every untagged block,
compiles them as modules of one generated crate under `target/skill-examples/`,
and reports each failure against its source file and line. To check a single
block without running the whole gate, paste it into a scratch crate and run
`cargo check`, adding a `fn main` only if the block needs one. A block that
needs a dependency needs that dependency in the scratch `Cargo.toml` — which is
itself a signal worth noticing, because the surrounding prose has to name the
crate for the reader too.

A block that needs a crate not already in the generated manifest is either given
that dependency or re-fenced, and the choice is made on whether compiling it is
teaching anything.
