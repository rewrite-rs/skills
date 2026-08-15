# Templates

The three artifacts, in full, ready to be adapted to the detected facts.
Adapt, do not paste: every value here is an example, and the detection step in
`SKILL.md` decides which values apply. Where an artifact already exists in the
repo, the template is the proposal for a diff, not a replacement.

## `Cargo.toml` lint block

Single-crate form:

```toml
[lints.rust]
unsafe_op_in_unsafe_fn = "deny"
missing_docs = "warn"

[lints.clippy]
unwrap_used = "deny"
expect_used = "deny"
undocumented_unsafe_blocks = "deny"
missing_safety_doc = "deny"
pedantic = { level = "warn", priority = -1 }
```

Workspace form — the levels live at the root, and each member opts in:

```toml
# Cargo.toml at the workspace root
[workspace.lints.rust]
unsafe_op_in_unsafe_fn = "deny"

[workspace.lints.clippy]
unwrap_used = "deny"
expect_used = "deny"
undocumented_unsafe_blocks = "deny"
missing_safety_doc = "deny"
pedantic = { level = "warn", priority = -1 }
```

```toml
# Cargo.toml in each member
[lints]
workspace = true
```

Two notes on the block:

- `priority = -1` is what lets individual `pedantic` lints be re-allowed
  afterwards — a group lint at the default priority would override a later
  `allow` on a member, and the exception would be silently discarded.
- The test carve-out for `unwrap_used` and `expect_used` is not automatic:
  clippy fires both inside `#[cfg(test)]` modules unless `clippy.toml` says
  otherwise, so a deny level without the carve-out turns ordinary test
  assertions red. `missing_docs` stays in the members that are libraries, not
  in `[workspace.lints]` — a binary member has no public surface to document.

## `clippy.toml`

Knobs only — this file cannot set lint levels, and a level written here is
silently ignored:

```toml
msrv = "1.75"
allow-unwrap-in-tests = true
allow-expect-in-tests = true
```

`msrv` is what lets clippy check that the code builds on the recorded MSRV —
set it to the detected value, not to an aspiration. The two `allow-*-in-tests`
flags are the `#[cfg(test)]` carve-out the deny levels in the lint block
depend on. If the repo already has a `clippy.toml`, read it first: an existing
`msrv` wins, and the carve-out flags are added only if missing.

## `rustfmt.toml`

The stable/nightly split is the rule: every key that requires nightly is
marked, because a `rustfmt.toml` full of silently ignored nightly keys is
worse than no file — stable rustfmt prints one warning per ignored key and
then formats as if the key were not there.

```toml
# Stable — honored by `cargo fmt` on a stable toolchain.
edition = "2024"
max_width = 100

# Nightly-only — commented out by default. Each key in this block ships only
# with a nightly-pinned rust-toolchain.toml, and is removed when the pin is
# dropped.
# group_imports = "StdExternalCrate"
# format_code_in_doc_comments = true
# wrap_comments = true
```

`edition` matches the detected edition. Keep the file small: every key is a
house style the whole repo now has to follow, and a key with no reason behind
it is a future argument.

## `docs/agents/rust.md`

The full template, with the five facts as filled-in example values. The
opening sentence is load-bearing — it tells every future agent that the file
wins over a skill default:

````markdown
# Rust posture

This file is authoritative for this repo: every agent working here reads it
before running a verification step, and it takes precedence over any default
a skill would otherwise assume. Keep it short enough to read in full.

## Detected facts

| Fact | Value | Source |
|---|---|---|
| Edition | 2024 | `[package].edition` |
| MSRV | 1.85 | `rust-version` |
| Async runtime | tokio | `[dependencies]` |
| `no_std` | no — std is linked | crate root |
| Unsafe policy | allowed with review | `clippy::undocumented_unsafe_blocks` denied, no `#![forbid(unsafe_code)]` |

## Commands

```bash
cargo test                  # the test command CI and agents run
cargo clippy --all-targets  # at the level configured in Cargo.toml
```

`--all-features` is meaningful: no — the feature set does not change the
public API, and the default build covers it.

Miri: not installed. `cargo miri test` is not part of the verification here.

## Posture

Unsafe is allowed with review. Every `unsafe` block carries a `// SAFETY:`
invariant and every `pub unsafe fn` carries a `# Safety` doc section; the
deny levels in `[lints.clippy]` enforce both. The public surface is this
crate only.
````

Adapt every value to the detected facts — a template left with example values
in it records nothing.

## Three worked scenarios

**Greenfield binary crate.** Nothing exists yet: no `[lints]`, no
`clippy.toml`, no `rustfmt.toml`, no `docs/`. The run creates three artifacts
across four files. The lint configuration: the lint block without
`missing_docs` (no library surface) into `Cargo.toml`, and `clippy.toml` with
the detected MSRV and the carve-out flags. Then the stable-only
`rustfmt.toml`, and `docs/agents/rust.md` with the five facts. `Cargo.toml`
is updated, not created: the crate exists, the lint block does not. The
report states its four lines — `Cargo.toml` updated with an approved diff;
`clippy.toml`, `rustfmt.toml`, and `docs/agents/rust.md` created. A second
run is four lines of "already correct," and the tree is untouched.

**Library crate with an MSRV commitment.** `rust-version = "1.85"` is
declared and a CI job builds on 1.85. The detected MSRV goes into
`clippy.toml` as `msrv = "1.85"`, so clippy checks the code against it, and
`missing_docs = "warn"` stays in the set because the public surface is real.
`docs/agents/rust.md` records the crate as the public surface and the
`--all-features` answer from the feature set. The report names each artifact:
created, or updated with an approved diff where `[lints]` already existed with
some of the levels.

**Workspace with an existing `[workspace.lints]` block.** The root already
denies `unsafe_op_in_unsafe_fn` and carries a curated `pedantic` set at warn
with two members re-allowed. This is the scenario where the skill mostly
leaves things alone and says so: it reads the block, compares it against the
default set, and proposes a diff for the missing entries only. Every existing
level stays exactly where it is, the two `allow` exceptions keep their
`priority = -1` ordering, and the members already carry
`lints.workspace = true`, so no member `Cargo.toml` changes. If the existing
block already covers the whole default set, the report for the lint artifact
is "already correct" — the run still writes `docs/agents/rust.md`, where the
posture is recorded, even when the compiler already enforces it.
