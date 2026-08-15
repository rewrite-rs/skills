# Flows

The three routes a user of this set actually walks, in the form the map
summarizes: the situation, the ordered skills, and the handoff signal that
moves from one step to the next. The choice between two skills that both seem
right is settled at the end of this file.

## Starting fresh in a Rust repo

**Situation.** A new Rust repo — or an existing one the set has not yet been
pointed at — and the question is what to do first and in what order.

**The route.**

1. `/setup-rust-skills` — configure the lint and format settings and record
   the project posture: edition, MSRV, async runtime, `no_std`, and the unsafe
   policy. **Handoff:** the recorded posture exists in the repo and a re-run
   of the skill reports nothing to change; from here every other skill in the
   set verifies at the level the repo set.
2. The craft skills, as the code demands them — `/type-driven-design` while
   the model is still soft, `/rust-errors` at the first fallible boundary,
   `/rust-api-design` before the first published version, and the rest by the
   questions they raise. **Alongside, not after:** `/rust-testing` writes the
   test for each behaviour change as it lands, so the suite never trails the
   code. **Handoff:** the code compiles clean at the repo lint level, and the
   questions a review would route to the craft skills are already answered.
3. `/rust-code-review` — before merge. **Handoff:** the report leads with a
   verdict and nothing blocking is open.

## Reviewing someone else code

**Situation.** A diff, branch, or pull request that someone else wrote, and
the question is whether it is ready to merge.

**The route.**

1. `/rust-code-review` — first, and for most reviews the only entry point: it
   runs the machine before either pass reads a line, runs the standards and
   spec passes separately, and dispatches every smell to the craft skill that
   owns the standard. **Handoff:** the report is out, leads with a verdict,
   and every finding that needs depth already names the skill that owns it.
2. A craft skill directly — only when the review already named it and the
   depth is wanted: the finding points at `/ownership-not-clone` and the
   question is the clone decision, not the one-line fix. **Handoff:** the
   question the finding raised is settled by the rules of the named skill.

## Porting from another language

**Situation.** A Rust implementation is replacing an existing one — C, C++,
Python, TypeScript, Go, or Java — and the question is how to sequence the work
so the port does not drift from the behaviour of its source.

The per-language skills (C, C++, Python, TypeScript, Go, and Java) are not
shipped yet; they land one per session, and this file presents none of them
as installed. The process runs through `/port-to-rust` in the meantime; the
construct mapping for a language arrives with the skill for that language.

**The route.**

1. `/port-to-rust` — the parity contract, the seam, the phase sequence.
   **Handoff:** a written contract and a named seam exist.
2. `/rust-testing` — the differential harness against the existing
   implementation: the same inputs through both, the outputs compared, the
   differences recorded. **Handoff:** the harness fails when the ported code
   diverges, so a drift is a report rather than a production incident.
3. The craft skills on the Rust side, as the ported code raises their
   questions — the decision table in `SKILL.md` settles which one a given
   question belongs to — then `/rust-code-review` before merge, over the
   ported diff. **Handoff:** the ported code reads like Rust rather than
   like a translation, at the level the repo configured, and the report
   leads with a verdict and nothing blocking is open.

## When two skills both seem right

The tie-breaker is which one names the decision as its defining constraint.
That is on each `docs/` page under `## What it does`: read the two defining
constraints, and the skill whose defining constraint matches the decision in
front of you is the one to run. The "not to be confused with" column in the
decision table is the same test, pre-computed for the pairs that actually get
confused.
