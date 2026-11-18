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
| Lint configuration | levels in `Cargo.toml` `[lints]` (or `[workspace.lints]` plus the per-member opt-in) and knobs in `clippy.toml` — `msrv`, `max-fn-params-bools`, the unwrap, expect, and print test carve-outs |
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
cut, never imposed:

- Denies: the unsafe lints (`unsafe_op_in_unsafe_fn`,
  `clippy::undocumented_unsafe_blocks`, `clippy::multiple_unsafe_ops_per_block`,
  `clippy::missing_safety_doc`), the panic lints `clippy::unwrap_used` and
  `clippy::expect_used` with their test carve-out, and
  `clippy::allow_attributes_without_reason` and `clippy::map_err_ignore`.
- Warns: `clippy::pedantic` as a group at `priority = -1`, the type-design and ownership lints
  (`fn_params_excessive_bools`, `struct_excessive_bools`, `clone_on_ref_ptr`,
  `redundant_clone`, `rc_buffer`), the cast lints (`as_conversions`,
  `cast_possible_truncation`, `cast_sign_loss`), the idiom and leftover lints
  (`string_add`, `wildcard_imports`, `dbg_macro`, `todo`,
  `panic_in_result_fn`, `missing_assert_message`), `missing_debug_implementations`,
  `unreachable_pub`, and `rust_2018_idioms`.
- Library only, dropped for an application: `missing_docs`, `exhaustive_enums`,
  `print_stdout`, `print_stderr`, `missing_panics_doc`, and
  `missing_errors_doc`. Detection picks the variant from a `lib.rs`, a `[lib]`
  target, or a publishable package.
- Re-allowed as noise when pedantic is on, each with a reason:
  `module_name_repetitions`, `must_use_candidate`, `module_inception`, and
  `enum_glob_use`.

`clippy::allow_attributes` is proposed only when the detected MSRV is 1.81 or
later, and so is `allow_attributes_without_reason`. Any lint the repo already
sets keeps its level.

`#[expect(lint, reason = "...")]`
is preferred over `#[allow(lint)]` where the toolchain supports it, because
an `expect` fails when the situation it was written for goes away, and an
`allow` that outlived its reason is invisible. The confirmation is the
per-artifact report: created, updated with an approved diff, or already
correct and left alone. The templates, the full worked configuration, and the
three worked scenarios are in `TEMPLATES.md`.

## The tools worth having configured

Four tools cover what lints cannot, and the `Tooling` line in the posture
file records each status, so no later skill has to guess: `cargo audit`
(published advisories in the dependency tree), `cargo hack --feature-powerset
check` (every feature combination compiles, not just the one CI builds),
`cargo udeps` (declared but unused dependencies), and `cargo miri test`
(undefined behaviour in the `unsafe` code). The skill proposes them and never
installs them: `cargo hack` and `cargo udeps` go in a scheduled job rather
than on every push, and `miri` is worth the toolchain only for a crate with
`unsafe` in it. The posture file records the answer either way — "not
installed" is as useful to the next agent as the installed state. The
feature check matters because each independent feature doubles the
configurations, and it only passes when features are additive. The run also
names the everyday cargo subcommands the repo leans on and suggests
`rust-analyzer`: put a tool in CI when its signal is worth a red build, and in
the editor when it is fast and free of false positives.

## Project shape and formatting

For a new crate the skill proposes the creation-time decisions in
`WORKSPACE.md`: one flat workspace with every crate a sibling under `crates/`
and a member of the workspace, siblings referenced through the workspace,
versions and metadata shared in `[workspace.package]` and
`[workspace.dependencies]` (defined with `default-features = false`), the
latest stable edition, an MSRV set at creation and raised conservatively in
minor releases, no unstable features, a pinned `rust-toolchain.toml`, and a
build that needs only `cargo` and `rustc`, with generated code produced at
publish time and shipped in the crate. For an existing repo these are
detected and recorded, never rewritten without an approved diff.

Formatting is left to rustfmt. The `rustfmt.toml` stays small, with a reason
per key; the nightly-only keys (`imports_granularity`, `group_imports`,
`hex_literal_case`, `format_macro_matchers`) stay commented out unless the
toolchain is pinned to nightly. `#[rustfmt::skip]` is for hand-aligned tables
and generated code, never personal style.

## Common questions

**What happens if the repo already has lint configuration?** Every existing
key is left alone; only missing entries from the default set are proposed, as
a diff. If the existing set already covers the defaults, the run reports
"already correct" for the artifact and changes nothing.

**Why are the lint levels not in `clippy.toml`?** It cannot set them — it
holds the knobs, such as `msrv` and the test carve-outs. A level placed there
compiles fine and is silently ignored; the levels belong in `Cargo.toml`
`[lints]`.

**What if the repo prefers `expect` over a ban on both?** The default denies
`clippy::expect_used`. A repo whose rule is "unwrap is banned, expect with a
message is the sanctioned panic" sets `expect_used = "allow"`, and the skill
honours that level when it detects it instead of proposing the deny back.

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
- Library-only lints appear only for a library, and `allow_attributes` only
  where the MSRV is 1.81 or later.
- No `#![deny(warnings)]` was added, and `#[allow]` appears only in generated
  code or macro output.
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
