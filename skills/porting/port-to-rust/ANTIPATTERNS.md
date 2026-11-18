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

## The port that mirrors its source

Every construct in the source encodes two things at once — the domain
(what the business rule is) and the language (how that source language
happened to express it). A port that carries both across produces Rust
that compiles and reads as a transliteration. The concrete tells: a
`throw_if_null(x)` helper, which never makes sense in a language where
the absence is in the type; getters and setters around a struct whose
fields could be public; an error type per class rather than per failure
mode.

The diagnostic is structural, and it is worth stating as a rule an
agent can apply to its own output: **a striking similarity between the
Rust module structure and the source module structure indicates an
architectural problem, not a faithful port.** The domain constraints
survive a port; the language constraints do not, and if both survived,
the second was never examined.

The counter-pressure that keeps this honest: parity is about
behaviour, not structure. Restructuring is allowed precisely because
the parity contract is written in terms of observable behaviour —
which is why the contract comes first.

## Reimplementing the source-language runtime

**Tell.** Hand-written copies of how the source language splits lines,
trims whitespace, parses integers, classifies characters, or handles a
locale: a `splitlines` clone, a `strtol` loop, an `isspace` table.

**Why it is fatal.** The copy is code the port must now test and
maintain, it is usually less correct than `std`, and it spends the
size budget on behaviour no caller asked for. It also hides the real
decision: where Rust and the source differ is a fact for the notes,
not something to bury in a helper.

**Instead.** Lean on the string helpers in `std` (`lines`, `trim`,
`parse`, the `char` predicates) rather than re-deriving them. Where `std`
differs only on rare input — non-ASCII digits or whitespace, unbounded
integers, locale tables — record the difference in `PORTING.md`, and add a
shim for those inputs only if the user confirms they exist. This is not licence to narrow behaviour:
on inputs the code really receives, observable behaviour is preserved,
and a difference there is a contract violation, not a note.

## Growing the API

**Tell.** A builder, an `Index` impl, `FromIterator` or `Extend`, or a
custom iterator type, none of which the source offered or its callers
used.

**Why it is fatal.** Every added public item is surface the parity
harness never exercised and a semver promise nobody requested. It also
makes the port unreviewable against the source, because the reviewer can
no longer map each source item to one Rust item.

**Instead.** Expose what the source exposes, plus the conventional trait
impls a Rust user would reach for: `Debug` and `Clone` on data types,
`Display` and `Error` on failures, `FromStr` where the source parsed text,
`Default` where it had an empty constructor, `IntoIterator` and
`len`/`is_empty` on collections. Add anything further only when a named
caller needs it.

## Swapping the algorithm

**Tell.** The source scans a list and the port introduces a different
structure or strategy, with no note saying why.

**Why it is fatal.** A new algorithm changes tie-breaking, ordering, and
edge-case behaviour in ways the source never promised, so differences
stop being attributable to a translation slip.

**Instead.** Keep the algorithm unless it is wrong — quadratic on
realistic input, say — and when it is swapped, say so in `PORTING.md`
with the reason and the evidence.

## Treating size as a target, or ignoring it

**Tell.** Either the port is trimmed to hit a line count, or it is three
times larger than expected and nobody asked why.

**Why it is fatal.** Size is a smell detector, not a goal. Trimming to a
number drops behaviour; ignoring it lets the three habits above go
unseen.

**Instead.** Count code lines, leaving out tests and comments, and compare
with the source. A C or C++ port lands near the source size. A Python,
JavaScript, or TypeScript port can come out two to three times as large, because
Rust writes out in types, error enums, and trait impls what the source
only implied. Much more than that points at a
runtime reimplementation, a grown API, or a swapped algorithm: find which
one and remove it.

## Over-testing parity

**Tell.** A fuzzing campaign over millions of inputs, written before the
realistic corpus exists.

**Why it is fatal.** It mostly turns up rare edge divergences that a note
can cover, while its cost delays the evidence that matters.

**Instead.** Tens of representative inputs, error paths included, are
enough to judge parity for a port of this size. The
recorded production corpus and property generators described in
`PARITY-CONTRACT.md` stay the measure for a system that has them; the
point here is that a small port does not need a campaign to be proven,
and anything a campaign turns up on inputs nobody sends goes in the
notes.

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
