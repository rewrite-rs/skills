## What it does

Writes the GitHub Actions workflow for a Rust repo —
`.github/workflows/rust.yml` — with the jobs the recorded posture earns:
`fmt`, `clippy` at the configured level, `test`, plus the MSRV, Miri, and
`no_std` variants, and a line in the contributing notes where the repo keeps
them. The defining constraint: CI runs the same commands the skills run
locally, at the same level — or CI is lying. A workflow stricter than the repo
`[lints]` block produces failures nobody can reproduce; one that is laxer
produces a green tick that means nothing.

## When to reach for it

User-invoked: the user runs it on purpose, typically as `/setup-rust-ci`.
The skill writes a workflow that executes on every push and pull request, on
someone's behalf, so the model never decides on its own to run it. The
trigger boundary: a repo that has lint configuration and recorded posture and
now needs CI to say the same thing. It does not write the lint configuration
or the posture — that is `/setup-rust-skills` — and it does not touch
commit-time hooks, which belong to `/setup-rust-pre-commit`.

## Prerequisites

The recorded posture in `docs/agents/rust.md`, written by
`/setup-rust-skills`. Every fact in it changes the workflow: MSRV decides
whether there is a second toolchain job, `no_std` decides whether the test
job becomes a build, the unsafe policy decides whether Miri earns a slot. If
the file is absent, the skill says so and offers to run `/setup-rust-skills`
first; it does not guess a posture and bake the guess into CI.

## The jobs a workflow earns

| Job | Earns its place when | Command |
|---|---|---|
| `fmt` | Always | `cargo fmt --check` |
| `clippy` | Always | `cargo clippy --all-targets --all-features`, at the configured level |
| `test` | Always, unless `no_std` | `cargo test --all-features` |
| `msrv` | `rust-version` is set in `Cargo.toml` | `cargo build` on the toolchain read from `Cargo.toml` |
| `miri` | The repo contains `unsafe` | `cargo miri test`, on `nightly` |
| `build` | `no_std`, in place of `test` | `cargo build --target <target>` |

Each job stands alone, so a red tick names the failure without opening logs.
The MSRV job builds and does not test — dev-dependencies frequently require a
newer compiler than the crate itself, and failing MSRV on a test-only
dependency teaches people to delete the job. What does not belong in the
default set: a coverage gate, a benchmark run, and a cross-compilation
matrix. Those are things a repo adds when it needs them, not things a setup
skill imposes.

## What makes a workflow safe to hand someone

Five properties, each one surviving a reviewer asking why it is there:

- `permissions: contents: read` at the top level, widened only per job that
  needs it.
- Every action carries an explicit version ref — a floating ref lets the
  workflow change underneath the repo without the repo changing.
- A `concurrency` group keyed on the ref, so a force-push cancels the
  superseded run.
- `timeout-minutes` on each job — a hung job is an open-ended bill.
- Caching keyed on the lockfile — the cache is valid exactly while the
  dependency set is unchanged.

An existing workflow is never overwritten: the skill reads it and reports the
difference as a diff for approval. The full files and the variants are in
`WORKFLOWS.md`.

## Common questions

**Why no `-D warnings` on the clippy job?** The level comes from the repo
`[lints]` block, and the flag would override a level the user deliberately
set. The flag belongs in the workflow only in the fallback form, for a repo
with no lint configuration at all.

**What happens when the repo already has CI?** The existing file wins. The
skill reports the difference between it and what the recorded posture would
produce, and changes nothing unless the user approves.

**Does `--all-features` always work?** No. Mutually exclusive feature flags
make the union fail to compile even though every individual feature is fine;
the fix is `cargo hack`, running the check per feature. In a workspace, every
command takes `--workspace`, and the MSRV read points at the root manifest.

**Can the model invoke the skill on its own?** No. Both harness flags are
set — `disable-model-invocation` in the frontmatter and
`allow_implicit_invocation: false` in the Codex policy.

## It's working if

- `.github/workflows/rust.yml` exists and runs on push and pull request.
- Every command in it passed locally before the workflow was committed.
- The clippy job runs at the level the repo configured — no level flag
  added.
- With `rust-version` set, the MSRV job builds on exactly that toolchain.
- The first run after pushing is confirmed — a workflow that has never run
  once is not evidence of anything.

## Where it fits

`setup-rust-ci` is the CI skill in the `misc` bucket — the one that makes the
public gate say what the local tooling says. It reads the posture
`/setup-rust-skills` writes, and it is the push-time gate that
`/setup-rust-pre-commit` defers to. Audits that belong on a schedule, such as
the dependency checks `/rust-supply-chain` runs, wire into the workflow here.
See `rust-skills-map` for how the full set of Rust skills relates.
