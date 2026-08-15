---
name: setup-rust-skills
description: Configure a Rust repo for this skill set — lint and format configuration, and a recorded project posture (edition, MSRV, async runtime, no_std, unsafe policy) at docs/agents/rust.md.
disable-model-invocation: true
---

# Setup Rust Skills

Configuration is a promise the tooling keeps. Every other skill in this set
reads the lint level and the recorded posture before running a verification
step, and this skill is the one that writes both. It runs only when the user
invokes it — it drops files into the repo, and the model never decides that on
its own. The whole run is governed by one rule: **read before writing, and
never overwrite a deliberate setting.**

## What this writes, and the one rule

Three artifacts: the lint configuration — the levels in `Cargo.toml` and the
knobs in `clippy.toml` — a `rustfmt.toml`, and `docs/agents/rust.md`. If an
artifact already exists, the change is presented as a diff for approval;
existing keys are left alone unless the user says otherwise, and only missing
keys are added. A second run on an already-configured repo makes no changes
and says so.

## Detect first, ask second

Read `Cargo.toml` (edition, `rust-version`, workspace layout, `[lints]`,
dependencies), the crate root (`#![no_std]`, `#![forbid(unsafe_code)]`,
existing `deny` attributes), and `rust-toolchain.toml`. Ask only about what
could not be detected, and ask in one batch rather than one question at a
time. The five facts to end up with:

| Fact | Usually detected from |
|---|---|
| Edition | `[package].edition` or `[workspace.package].edition` |
| MSRV | `rust-version`, `clippy.toml` `msrv`, or the CI job that builds on the oldest compiler |
| Async runtime | `tokio`, `async-std`, or `smol` in the dependencies — or none |
| `no_std` posture | `#![no_std]` at the crate root |
| Unsafe policy | `#![forbid(unsafe_code)]`, an existing `unsafe_code` level, or the absence of one |

The unsafe policy lands as one of three: forbidden, allowed with review, or
unrestricted. When nothing in the repo settles it, that is the one question
worth asking.

## Where lint levels actually go

`clippy.toml` cannot set lint levels — it holds the configurable-lint knobs:
`msrv`, thresholds, and the test carve-outs for `unwrap_used` and
`expect_used`. Levels belong in `[lints.rust]` and `[lints.clippy]` in
`Cargo.toml`, or — for a workspace — in `[workspace.lints]` at the root plus
`lints.workspace = true` in each member. Write each file for its own purpose,
and never put a level where it will be silently ignored: a level in
`clippy.toml` compiles fine and does nothing, which is worse than an error.
Confirm against the installed toolchain rather than assuming — `cargo
clippy -- --help` settles which lints exist, and the `[lints]` block in the
repo `Cargo.toml` settles where the levels already live.

## A defensible default set, proposed not imposed

Present the set with a one-line reason per entry and let the user cut it — a
set the user did not agree to is a set they will disable in a week:

| Level | Lint | Why |
|---|---|---|
| deny | `unsafe_op_in_unsafe_fn` | an implicit `unsafe` inside an `unsafe fn` hides the invariant the caller must uphold |
| deny | `clippy::undocumented_unsafe_blocks` | every `unsafe` block needs a written `// SAFETY:` invariant |
| deny | `clippy::missing_safety_doc` | every `pub unsafe fn` needs a `# Safety` doc section |
| deny | `clippy::unwrap_used` | a panic in production code is a design decision — the test carve-out keeps it as the assertion in tests |
| deny | `clippy::expect_used` | the same rule, for the variant with a message |
| warn | `clippy::pedantic`, as a group | worth a look, not a blocker; the group level leaves room to re-allow the noisy members |
| warn | `missing_docs` | for a library — the public surface should document itself |

Two boundaries on the set: never enable the whole `restriction` group — these
individual lints are the selection — and the `pedantic` entry carries
`priority = -1`, which is what lets individual members be re-allowed
afterwards. `missing_docs` stays out of the set for a binary crate.

## `docs/agents/rust.md` is the point

The lint files configure the compiler; this file configures every agent that
opens the repo afterwards. It records the five detected facts plus the things
that would otherwise be rediscovered wrongly — the test command, whether
`--all-features` is meaningful for the feature set, whether Miri is
available, and which crates form the public surface. It is what every other
skill in this set means when it says "the repo recorded posture": the
posture in the file wins over any default a skill would otherwise assume.
Keep it short enough to be read in full every session — a page nobody reads
changes nothing. The full template is in `TEMPLATES.md`.

## Idempotence, stated as behaviour

Re-running reports one of three outcomes per artifact: created, updated with
an approved diff, or already correct and left alone. Never "regenerated" —
regeneration implies a rewrite, and a rewrite of a file the user already
approved is a change nobody asked for. The three-outcome report is what makes
a second run safe to run and readable in review.

## Verification

After writing:

```bash
cargo fmt --check          # expected to fail loudly if rustfmt.toml changed the house style; report, do not auto-format the repo
cargo clippy --all-targets # now at the level just configured
cargo test
```

If the new lint set turns an existing clean build red, that is a finding to
report with the count and the top offenders, not a reason to quietly lower
the level just written.
