## What it does

Audits a Rust dependency tree — advisories, licences, banned and duplicate
crates, and unmaintained dependencies — reading `Cargo.lock` as the authority
on what is actually built, not `Cargo.toml`, which states ranges. The
defining constraint: every finding ends in a decision — upgrade, replace,
vendor, or accept with a written reason and an expiry. An unactioned
advisory list is noise, and noise trains people to ignore the tool.

## When to reach for it

Model-invoked: the agent pulls this in on its own when checking whether
dependencies are safe to ship, when `cargo audit` or `cargo deny` reports
something, when adding a dependency to a project with a licence policy, when
a build pulls in two versions of the same crate, or when the user asks about
supply chain risk in Rust. It does not write the schedule that runs the audit
on purpose — that is `/setup-rust-ci` — and it keeps the audit out of
pre-commit hooks, where it costs network time on every commit. The user can run
it directly, as `/rust-supply-chain`.

## Prerequisites

A `Cargo.lock` to read — the audit judges what is built, and a tree without a
lockfile is a set of ranges, not a fact. When the MSRV is recorded in
`docs/agents/rust.md`, it bounds what counts as a fix: a fix that bumps a
dependency past the MSRV is not a fix.

## Two tools, overlapping on purpose

| Tool | Answers | Runs against |
|---|---|---|
| `cargo audit` | One question — is anything in the tree known-vulnerable | The RustSec advisory database |
| `cargo deny` | Four — advisories, bans, licenses, sources | A `deny.toml` policy, or built-in defaults that encode no policy |

A repo running `cargo deny check` does not need `cargo audit` separately; a
repo that wants only advisory checking and no policy file is better off with
`cargo audit` alone. The skill says which the repo should run and why,
rather than adding both. The annotated policy file is in `DENY.md`, and it
lands in the target repo only on explicit request.

## Reading a finding properly

An ID and a severity are the start; the question is whether this repo
reaches the affected code. `cargo tree --invert` shows who pulled a crate
in, which settles direct (upgrade the dependency) versus transitive (upgrade
the intermediary, or wait for it). "No upstream fix yet" is a real outcome
with real options — pin, patch via `[patch.crates-io]`, vendor, or replace —
and recording the choice matters more than which one is picked.

Unmaintained is a finding, not a warning to mute: RustSec issues `RUSTSEC-*`
unmaintained notices with no vulnerability attached, and they are a
maintenance-planning signal with a horizon, not an emergency. Duplicates are
a licence and a binary-size problem before they are a taste problem — every
duplicate means two versions compiled in and two licence obligations — and
the fix is usually raising a lower bound so the two ranges unify, not
banning the crate. The licence policy itself runs on an axis from
permissive-only to copyleft-tolerated; the skill names the axis, the repo
decides, and the decision is recorded in the policy file.

## Common questions

**What does "accept" mean?** A written reason and an expiry — an annotated
entry with the reachability, the re-check trigger, and a review date. A bare
ID is acceptable for one release cycle while the reason is worked out, never
as the resting state.

**Where does the `deny.toml` come from?** Only on an explicit request in the
same invocation. It is the one file this skill writes, and writing it
unasked would be the unasked-for diff the skill avoids.

**Does the MSRV constrain the decision?** Yes. When the fix needs a newer
compiler than the recorded MSRV, the choice — raise the MSRV, patch, vendor,
or accept with an expiry — belongs to the repo, with the trade stated on the
record.

**Where does the audit run?** On a weekly schedule and on dependency-change
pull requests — the advisory database changes without the code changing. CI
wiring for that is `/setup-rust-ci`; a pre-commit hook is never the place.

## It's working if

- Every finding in the report names a decision: upgrade, replace, vendor, or
  accept with a reason and an expiry.
- The report says what the tree was read from and quotes exit codes —
  `cargo deny check` exits non-zero on any denied finding, and that is what
  a CI job keys on.
- An accepted finding carries a re-check trigger and a date.
- No `deny.toml` appeared in the repo unless the user asked for one.
- Any tool that could not run is named — a clean audit that did not run is
  never reported.

## Where it fits

`rust-supply-chain` is the audit skill in the `misc` bucket — the one that
turns a list of findings into a list of decisions. It reads the MSRV
`/setup-rust-skills` records, keeps its checks off the commit path that
`/setup-rust-pre-commit` guards, and hands the scheduled run to
`/setup-rust-ci`. See `rust-skills-map` for how the full set of Rust skills
relates.
