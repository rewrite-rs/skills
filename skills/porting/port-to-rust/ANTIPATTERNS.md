# Anti-patterns

The failure list for a port. Each entry names the anti-pattern, the
tell that it is happening, why it is fatal rather than merely
untidy, and what to do instead. The per-language skills, as they
land, extend this list with the instances that show up in one
language only.

## Transliteration

**Tell.** The Rust has the same file names, the same function order,
the same loop indices, and a `clone` on every parameter.

**Why it is fatal.** It locks in the source design permanently —
nobody refactors a port after it ships — and the `clone` and
`unwrap` layer it needs to compile hides exactly the ownership
decisions Rust was adopted for.

**Instead.** Port the behaviour module by module, and let the Rust
shape follow from `/idiomatic-rust` and `/ownership-not-clone`.

## Big-bang rewrite

**Tell.** No seam was chosen, and the plan is "finish it, then
switch."

**Why it is fatal.** Parity is never measured until the end, when
every difference is a mystery and the budget is gone.

**Instead.** Run phase 1. A named seam makes parity measurable from
the first module ported.

## Improving while porting

**Tell.** A commit message that says "port module X and fix the
off-by-one."

**Why it is fatal.** Differences stop being attributable: the fix
and the regression are indistinguishable in the difference report,
and the harness cannot say which commit the report is complaining
about.

**Instead.** Record the fix as a follow-up, ship the port, and fix
it after parity is proven.

## Porting the abstraction instead of the behaviour

**Tell.** Traits that mirror base classes one for one, a factory
with a single implementation, a trait with one impl.

**Why it is fatal.** The port inherits the indirection with none of
the reasons for it, and every layer is a place parity can silently
drift.

**Instead.** Write the behaviour, and add the abstraction when a
second caller demands it.

## Porting dead code

**Tell.** A module ported that no caller could be found for.

**Why it is fatal.** It spends parity evidence on behaviour no
caller exercises, and it ships — which is how dead code becomes
load-bearing.

**Instead.** Prove there is a caller before porting. Deleting is
cheaper than porting, and a port is the one moment when deleting is
easy to defend in review.

## Rewriting the tests from scratch

**Tell.** The new test suite is fresh, clean, and covers what the
porter thought of.

**Why it is fatal.** A fresh suite proves the port matches the
porter imagination, not the source behaviour — and the expectation
values it encodes may never have been true.

**Instead.** The characterization suite comes from the existing
behaviour; expected values come from running the source, never from
reading its code.

## `clone` and `unwrap` as translation glue

**Tell.** A `clone` on every argument and an `unwrap` after every
fallible call, added to make a transliteration compile.

**Why it is fatal.** It converts a compile error — which is
information about ownership — into a runtime panic in production.

**Instead.** `/ownership-not-clone` and `/rust-errors`.

## Reaching for `unsafe` to reproduce a source-language pattern

**Tell.** Raw pointers appearing to model a graph, a parent
pointer, or a self-reference the source language gave away through
its garbage collector.

**Why it is fatal.** It imports the aliasing of the source design
into a language whose whole point is that the compiler rejects it,
and every such block is a soundness promise the port now has to
keep.

**Instead.** A different data structure — indices into a `Vec`, an
arena — before any `unsafe`, and `/unsafe-rust` if the answer really
is `unsafe`.

## Letting the harness rot

**Tell.** The differential job is red, and someone added
`continue-on-error`.

**Why it is fatal.** From that moment the port has no evidence at
all, and the green builds after it are claims, not proof.

**Instead.** Fix the difference or fix the process — never the
check.

## No owner for the contract

**Tell.** Two people disagree about whether a difference matters,
and the answer is decided by whoever writes the commit.

**Why it is fatal.** The contract narrows commit by commit until it
says nothing, and "parity" becomes a word in a PR description.

**Instead.** The contract is a file, and it is edited deliberately —
one place, with a line saying what changed and why.
