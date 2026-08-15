## What it does

Configures a Rust repo for the skill set: the lint and format configuration,
and a recorded project posture — edition, MSRV, async runtime, `no_std`, and
the unsafe policy — at `docs/agents/rust.md`, the file every other skill
reads before running a verification step. The defining constraint: idempotent
and additive. It proposes a diff and never overwrites a deliberate setting,
including one it wrote itself on an earlier run; a re-run on a configured
repo changes nothing and says so.

## When to reach for it

User-invoked: the user runs it on purpose, typically as `/setup-rust-skills`.
The skill writes files into the repo — the lint configuration,
`rustfmt.toml`, and `docs/agents/rust.md` — so the model never decides on its
own to run it. It covers the configuration side of a repo: what the compiler
and formatter enforce, and what every later agent should assume. It does not
review code, write tests, or design CI, and it does not change a lint level
the repo already set without an approved diff.

## Prerequisites

A Cargo project — `Cargo.toml` and a crate root the detection step can read —
and write access to `Cargo.toml` and `docs/`.

## What it writes

| Artifact | Contents |
|---|---|
| Lint configuration | levels in `Cargo.toml` `[lints]` (or `[workspace.lints]` plus the per-member opt-in) and knobs in `clippy.toml` — `msrv`, the `unwrap_used`/`expect_used` test carve-outs |
| `rustfmt.toml` | the stable keys, and the nightly-only keys marked or omitted |
| `docs/agents/rust.md` | the five detected facts, the commands, and the unsafe policy — the recorded posture the rest of the set reads |

The one rule over all three: read before writing, and never overwrite a
deliberate setting. An existing file is a diff for approval, not a
replacement; only missing keys are added.

## Detect, propose, confirm

Detection reads `Cargo.toml`, the crate root, and `rust-toolchain.toml`, and
settles what it can — edition, MSRV, async runtime, `no_std`, and the unsafe
policy. Only the unsettled facts are asked, in one batch. The proposal is the
default lint set with a one-line reason per entry, presented for the user to
cut, never imposed. The confirmation is the per-artifact report: created,
updated with an approved diff, or already correct and left alone. The
templates and the three worked scenarios are in `TEMPLATES.md`.

## Common questions

**What happens if the repo already has lint configuration?** Every existing
key is left alone; only missing entries from the default set are proposed, as
a diff. If the existing set already covers the defaults, the run reports
"already correct" for the artifact and changes nothing.

**Why are the lint levels not in `clippy.toml`?** It cannot set them — it
holds the knobs, such as `msrv` and the test carve-outs. A level placed there
compiles fine and is silently ignored; the levels belong in `Cargo.toml`
`[lints]`.

**Does the run lower a level if the new set makes the build red?** No. A
newly red lint is a finding to report with the count and the top offenders,
not a reason to quietly lower the level just written.

**Can the model invoke the skill on its own?** No. Both harness flags are set
— `disable-model-invocation` in the frontmatter and
`allow_implicit_invocation: false` in the Codex policy — so the skill runs
only when the user asks.

## It's working if

- A re-run on the configured repo reports "already correct" for every
  artifact and changes nothing.
- Lint levels live in `Cargo.toml` `[lints]` — or `[workspace.lints]` with
  the per-member opt-in — and not in `clippy.toml`.
- `docs/agents/rust.md` records all five facts: edition, MSRV, async
  runtime, `no_std` posture, and unsafe policy.
- No existing key was changed without an approved diff.
- The verification commands ran and their output was reported, including any
  lints that turned red under the new set.

## Where it fits

`setup-rust-skills` is the setup skill in the workflow group — the one that
writes the configuration every other skill in the set reads before running a
verification step, and the one that makes "the repo recorded posture" a file
rather than an assumption. A new repo runs it first; afterwards the craft and
testing skills verify at the level it recorded. See `rust-skills-map` for how
the full set of Rust skills relates.
