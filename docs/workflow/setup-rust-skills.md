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
| `docs/agents/rust.md` | the five detected facts, the commands, which of the four tools the repo runs, and the unsafe policy — the recorded posture the rest of the set reads |

The one rule over all three: read before writing, and never overwrite a
deliberate setting. An existing file is a diff for approval, not a
replacement; only missing keys are added.

## Detect, propose, confirm

Detection reads `Cargo.toml`, the crate root, and `rust-toolchain.toml`, and
settles what it can — edition, MSRV, async runtime, `no_std`, and the unsafe
policy. Only the unsettled facts are asked, in one batch. The proposal is the
default lint set with a one-line reason per entry, presented for the user to
cut, never imposed: denies for the unsafe-documentation lints
(`unsafe_op_in_unsafe_fn`, `clippy::undocumented_unsafe_blocks`, and
`clippy::missing_safety_doc`), for the panic lints `clippy::unwrap_used` and
`clippy::expect_used` with their test carve-out, and for
`clippy::allow_attributes_without_reason`; warns for `clippy::pedantic` as a
group at `priority = -1`, `missing_docs`, `missing_debug_implementations`,
`unreachable_pub`, and `rust_2018_idioms`. `#[expect(lint, reason = "...")]`
is preferred over `#[allow(lint)]` where the toolchain supports it, because
an `expect` fails when the situation it was written for goes away, and an
`allow` that outlived its reason is invisible. The confirmation is the
per-artifact report: created, updated with an approved diff, or already
correct and left alone. The templates, the full worked configuration, and the
three worked scenarios are in `TEMPLATES.md`.

## The tools worth having configured

Four tools cover what lints cannot, and each gets a status line in
`docs/agents/rust.md`, so no later skill has to guess: `cargo audit`
(published advisories in the dependency tree), `cargo hack --feature-powerset
check` (every feature combination compiles, not just the one CI builds),
`cargo udeps` (declared but unused dependencies), and `cargo miri test`
(undefined behaviour in the `unsafe` code). The skill proposes them and never
installs them: `cargo hack` and `cargo udeps` go in a scheduled job rather
than on every push, and `miri` is worth the toolchain only for a crate with
`unsafe` in it. The posture file records the answer either way — "not
installed" is as useful to the next agent as the installed state.

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
- The posture file names which of the four tools the repo runs — `cargo
  audit`, `cargo hack --feature-powerset check`, `cargo udeps`, `cargo miri
  test` — including the ones it does not.
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
