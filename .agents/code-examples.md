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

## Verifying a `rust` block by hand

Until the check is automated, verify a complete block the direct way:

```bash
mkdir -p /tmp/skill-example/src && cd /tmp/skill-example
printf '[package]\nname = "x"\nversion = "0.0.0"\nedition = "2021"\n' > Cargo.toml
# paste the block into src/lib.rs, adding a `fn main` only if the block needs one
cargo check
```

A block that needs a dependency needs that dependency in the scratch `Cargo.toml` —
which is itself a signal worth noticing, because the surrounding prose has to name
the crate for the reader too.
