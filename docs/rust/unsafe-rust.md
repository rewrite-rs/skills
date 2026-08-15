## What it does

Governs soundness — whether a safe caller can trigger undefined behaviour — for
every `unsafe` block, `unsafe fn`, raw pointer, `transmute`, and FFI call it
touches. It justifies the three cases where `unsafe` is legitimate, requires a
`// SAFETY:` invariant on every block, and verifies with Miri. It never treats
"the tests pass" as evidence of soundness.

## When to reach for it

Model-invoked: the agent pulls this in on its own when writing or reviewing
unsafe code, when working across an FFI boundary, when raw pointers or
`transmute` appear, when a safe API wraps an unsafe primitive, or when asked
whether an `unsafe` block is justified. It does not cover construct-level
mapping from C or C++ (the `port-from-c` and `port-from-cpp` skills), whether
the wrapper should be public (`/rust-api-design`), or error handling across the
boundary (`/rust-errors`).

## Prerequisites

Miri for the verification step — `rustup +nightly component add miri`. The skill
still applies without it, with a weaker guarantee that must be reported as such
rather than silently claimed.

## When unsafe is justified

Exactly three situations: an FFI boundary; a data structure the borrow checker
genuinely cannot express (intrusive lists, self-referential types, custom
allocators); and a measured performance win where the safe version was
benchmarked and lost. "It was easier" is not on the list, and an `unsafe` block
that exists to resolve a borrow-checker error is rejected and pointed at
`/ownership-not-clone`. When a published crate already solved the case —
`bytemuck`, `zerocopy`, `smallvec`, an existing binding — auditing it beats
writing the `unsafe`.

## Documenting and verifying safety

Every `unsafe` block carries a `// SAFETY:` comment stating the invariant the
caller upholds; every `pub unsafe fn` carries a `# Safety` doc section. The
check that makes the invariant true lives in the safe code outside the block —
the sound/unsound `split_at_mut` pair in `SAFETY-REVIEW.md` is the test.
Verification runs `cargo miri test` (targeted at the relevant tests, with its
limits stated), clippy at the repo lint level, and the full suite. The
line-by-line checklist — per block, per pointer, per `transmute`, per FFI call,
per hand-written `Send`/`Sync` impl — is in `SAFETY-REVIEW.md`.

## Common questions

**Is `unsafe` always a smell?** No — the three justifications are legitimate.
The smell is `unsafe` without a written reason, or `unsafe` where the objection
from the borrow checker was a design problem all along.

**Can I use this skill without Miri installed?** Yes, with a weaker guarantee:
the code is documented and reasoned about, but the machine check did not run.
The report must say so, and a nightly toolchain is never installed as a side
effect.

**Should I keep `unsafe` blocks large to minimize `// SAFETY:` comments?** No —
the block should be as small as it can be, with the check just outside. One
precise invariant beats three vague ones.

## It's working if

- Every `unsafe` block has a `// SAFETY:` comment naming an invariant.
- Every `pub unsafe fn` has a `# Safety` doc section.
- `cargo miri test` passes on the tests covering the `unsafe` paths, or its
  absence is reported.
- No `unsafe` block exists solely to resolve a borrow-checker error.
- The check that makes each invariant true is in safe code, outside the block.

## Where it fits

`unsafe-rust` is the soundness skill in the language-craft group — the one the
`port-from-c` and `port-from-cpp` skills will invoke for the FFI boundary, and
the one a review pass invokes for the `unsafe` lines. It defers public-surface
questions to `/rust-api-design`, error handling to `/rust-errors`, `Pin` and
manual `Future` impls to `/async-rust`, and borrow-checker fights to
`/ownership-not-clone`. See `rust-skills-map` for how the full set of Rust
skills relates.
