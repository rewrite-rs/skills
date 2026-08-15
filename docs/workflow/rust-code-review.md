## What it does

Reviews a Rust change on two axes at once — standards (does the diff meet the
idiom, ownership, error, API, and unsafe rules the craft skills own) and spec
(does the change do what was asked) — and merges the two passes into one
report led by a verdict. The defining constraint: the two axes run separately
and are merged, with a Rust smell baseline layered on the repo lint
configuration rather than replacing it. A finding that contradicts a level
the repo deliberately set is a proposal, and it says so.

## When to reach for it

Model-invoked: the agent pulls this in on its own when reviewing a Rust diff,
pull request, or branch, when asked whether a change is ready to merge, or
when a review needs to cover more than what clippy already reports. It does
not rewrite the code — findings, not patches — it does not restate the rules
the seven craft skills own, and it does not decide the parity contract of a
port, which belongs to the porting skills, landing in a later wave.

## Prerequisites

A buildable checkout: the verification step runs `cargo fmt`, `cargo clippy`,
and `cargo test`, and a report that cannot run them names the gap rather than
implying a clean bill. And a stated request for the change to be reviewed
against — an issue, a PR body, or the user's own words. Without the second,
only the standards axis can run; the spec pass is asked for rather than
invented.

## The two passes

| Pass | Reads for | Input order | Reports |
|---|---|---|---|
| Standards | The smell baseline in `SMELLS.md`, settled by the owning skill | Diff and the files it touched | Craft findings, one line each |
| Spec | The request, checked against the diff | Request first, diff second | Missing scope, extra scope, contradictions |

The prompts for both, the merge rules, and the report shape are in
`REVIEW-PASSES.md`. When the harness supports parallel sub-agents the passes
run side by side; otherwise they run in order. The machine goes first either
way: anything clippy already reports is a build failure, not a finding.

## What it adds beyond clippy

The smell baseline: the judgment calls no lint can make — an unexplained
`clone`, `unwrap` on a caller-controlled path, `pub` with no external caller,
a boolean parameter that should be an enum, blocking work inside an
`async fn`, `unsafe` without a written invariant, a behaviour change with no
test that would have caught it. The baseline never re-runs clippy at a
stricter level to manufacture defects; it layers on the configuration the
repo set.

## Common questions

**What happens when both passes flag the same line?** The more severe framing
wins, and the duplicate is dropped. Repeated instances of one root cause
merge into a single finding.

**Can the review run without a stated request?** Only the standards axis.
The spec pass cannot invent an intent from the diff, so the reviewer asks for
the request instead of guessing.

**Is the smell baseline a stricter lint level?** No. It layers on the repo
lint configuration: a finding that contradicts a deliberately set level is
phrased as a proposal, and the verification step never re-runs stricter than
the level the repo set.

**How is this different from running clippy?** Clippy is the floor, and it
runs first. The review covers what the tools cannot see, and it leads with a
verdict rather than a dump of tool output.

## It's working if

- The report leads with a verdict — blocking issues present, or none — not a
  summary of the change.
- Every finding carries a severity and a concrete fix; a finding without a
  fix is phrased as a question.
- Nothing clippy already reports appears as a finding.
- Findings that contradict the repo lint configuration are phrased as
  proposals.
- The verification output is quoted rather than summarized, and any check
  that could not run is named.

## Where it fits

`rust-code-review` is the review skill in the workflow group — it defers
every "is this tested" verdict to `/rust-testing`, and it is the one the
porting skills, when they land, will invoke for the review pass over ported
code. It routes every smell row to the craft skill that owns the
standard, and it never restates those rules. See `rust-skills-map` for how
the full set of skills relates.
