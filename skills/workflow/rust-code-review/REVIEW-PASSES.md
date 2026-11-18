# Review passes

The protocol behind the two axes in `SKILL.md`: what the review needs before
it starts, the prompt for each pass, and how the two lists merge into one
report. Run the passes as parallel sub-agents when the harness supports it;
otherwise run them in order, one at a time. The prompts below are written to
hand to a sub-agent verbatim, with the diff attached — and, for the spec
pass, the request attached as well.

## Inputs the review needs before it starts

Three things:

- **The diff** — `git diff <base>...HEAD`, where `<base>` is the branch point:
  main, a release tag, or whatever the request names.
- **The request the change answers** — an issue, a PR body, or the user's own
  words.
- **The repo lint configuration** — `[lints.clippy]` in `Cargo.toml`, a
  `clippy.toml`, a `rustfmt.toml`, `#![deny(...)]` in the crate root.

Plus three facts read from the tree, which open the report: the subject (for a
diff, the lines that changed and whatever they break), whether the crate is a library or
an application, and the edition and MSRV found in `Cargo.toml`. A library is held
to the API bar strictly; an application is held to simplicity instead. No
recommendation may need a toolchain newer than the MSRV.

Run the tools before the passes start and hand their grouped results to both:
`cargo fmt --check`, clippy at the repo level, and the tests. Pedantic hits,
when asked for at all, are proposals and only the relevant ones. Never run
`cargo fmt` itself on the code under review.

Missing the request means the spec pass cannot run: ask for it rather than
inventing an intent from the diff. Missing the lint configuration means
clippy runs at its default level and `-- -D warnings` is the fallback; a
present configuration always runs at the level it set, never stricter.

## The standards pass

Reads for craft: does the diff meet the standards the repo already lives by.
It reads only the diff and the files it touches, applies `SMELLS.md`, and
reports findings in the one-line format (or the long block for an audit). It does not comment on whether the
change was the right thing to build.

The prompt, in full:

```
You are the standards pass of a two-axis Rust code review.

Read only the diff and the files it touches. Do not survey the rest of the
crate.

Apply the smell baseline in SMELLS.md line by line. Where a row names an
owning skill, run that skill and let its rules settle the question.

Read in priority order. First correctness and soundness: unsafe blocks and
FFI, reachable panics (indexing, narrowing casts, overflow), trait contracts
that disagree (Ord against PartialEq, Hash against Eq), lock hazards, and
destructors that can fail. Then error handling, then API design (strict for a
library, relaxed for an application), then idiom, then docs and tests. Never
let a lower tier crowd out a higher one.

Reproduce a suspected defect, or trace the exact failing path, before
reporting it as fact. If the evidence is incomplete, say what remains
uncertain and which check would resolve it.

Report findings only, most severe first, in the shape you are given (one
line each for a diff, a long block for an audit):

path:line — severity: what is wrong. What to do instead.

Every finding cites a location (path:line, or whole file) and names a rule: a
clippy lint or the owning skill. Group repeats into one finding listing the
lines. A documented or commented choice is a note stating the trade-off, not
a blocker. Do not modify, reformat, or rewrite the code under review.

Severity is blocking, should-fix, or note. Blocking includes an API choice
that turns into a semver break after release. A finding with no concrete fix is
a question, and is phrased as one. Drop anything below note. Do not comment
on whether the change was the right thing to build; that is the spec pass.
```

## The spec pass

Reads for intent: does the diff do what was asked, nothing more and nothing
less. It reads the request first and the diff second, and it answers three
questions. It does not apply the smell baseline; that is the standards pass.
Unrequested scope is a finding, not a bonus.

The prompt, in full:

```
You are the spec pass of a two-axis Rust code review.

Read the request first — the issue, the PR body, or the words the user gave —
and the diff second, against it. Do not apply the smell baseline and do not
comment on craft; that is the standards pass.

Answer three questions, and report the answer to each:

1. Is everything the request asks for implemented? Name each missing part.
2. Is anything implemented that the request did not ask for? Unrequested
   scope is a finding, not a bonus — name each extra and say whether it
   belongs in this change or in a follow-up.
3. Does any part of the diff contradict a stated requirement? Quote the
   requirement and the line that contradicts it.

Report findings one line each, most severe first:

path:line — severity: what is wrong. What to do instead.
```

## Merging

- Deduplicate where both passes found the same line, keeping the more severe
  framing.
- Group repeated instances of one root cause under a single finding when one
  correction addresses all of them.
- Sort by severity — blocking, should-fix, note — then by file.
- Cap the output: if the merged list runs past roughly fifteen findings,
  report the blocking and should-fix ones in full and summarize the notes as
  a count with a theme. A list nobody finishes reading is a list nobody acts
  on.

## Reporting

Lead with the verdict — blocking issues present, or none — then the scope
decisions and what ran, as set out in `REPORT-FORMAT.md`. Then the findings,
most severe first, in the shape that file gives for the review at hand. Then
the verification output, quoted rather than summarized, with any check that
could not run named. Close with the risks that could not be tested locally, if any.
Never lead with a summary of what the change does; the author knows.
