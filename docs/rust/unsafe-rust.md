## What it does

Governs soundness — whether a safe caller can trigger undefined behaviour — for
every `unsafe` block, `unsafe fn`, raw pointer, `transmute`, and FFI call it
touches. It justifies `unsafe` against the three named reasons — FFI, a
performance win the profile named, a primitive the language cannot express
safely — requires a `// SAFETY:` invariant on every block, and verifies with
Miri. It never treats "the tests pass" as evidence of soundness.

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

Exactly three reasons, each with a checklist to answer before the block is
written. **FFI** — calling into or out of another language: who owns the
memory on each side, what happens on a panic crossing the boundary (it must
not), whether the foreign function is thread-safe, what the lifetime of every
pointer received actually is; the boundary design goes to `/rust-ffi`.
**A performance win the profile named** — what the measurement said, what
invariant is asserted in place of the check, whether the safe version is
genuinely on the hot path; `/rust-performance` first, and the answer there is
usually that the allocation was the problem. **A primitive the language cannot
express safely** — intrusive structures, custom allocators, self-referential
types: does a crate already do this correctly, and is the invariant writable
in two sentences? A block that does not sit under one of these three has an
author reaching for `unsafe` to make an error go away, and the error was
right. When a published crate already solved the case — `bytemuck`,
`zerocopy`, `smallvec`, an existing binding — auditing it beats writing the
`unsafe`.

## Documenting and verifying safety

Every `unsafe` block carries a `// SAFETY:` comment stating the invariant the
caller upholds; every `pub unsafe fn` carries a `# Safety` doc section. The
check that makes the invariant true lives in the safe code outside the block,
and the review assumes the code an `unsafe` block calls misbehaves — a
closure that panics mid-operation, a `Deref` that varies, a `Drop` at an
unchosen moment. The line-by-line checklist — per block, per pointer, per
`transmute`, per FFI call (including the edition 2024 marks), per
hand-written `Send`/`Sync` impl — is in `SAFETY-REVIEW.md`, where the
sound/unsound `split_at_mut` pair is the test. Verification runs
`cargo miri test` (targeted at the relevant tests, with its limits stated),
clippy at the repo lint level, and the full suite.

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

**Is `unsafe` allowed for performance?** Only after a profile — the reason has
to be a win the profile named, so `/rust-performance` goes first, and the
answer there is usually that the allocation was the problem.

**What is the difference between unsafe and unsound?** `unsafe` names the
block; soundness names the API. A safe function that can cause UB from safe
caller code is unsound — a bug regardless of who currently calls it — and
unsound code is never acceptable.

## It's working if

- Every `unsafe` block has a `// SAFETY:` comment naming an invariant.
- Every `pub unsafe fn` has a `# Safety` doc section.
- `cargo miri test` passes on the tests covering the `unsafe` paths, or its
  absence is reported.
- No `unsafe` block exists solely to resolve a borrow-checker error.
- The check that makes each invariant true is in safe code, outside the block.
- Every `unsafe` block traces to one of the three reasons — FFI, a
  performance win the profile named, or a primitive the language cannot
  express safely.
- No `mem::zeroed()` on a type with invalid bit patterns.

## Where it fits

`unsafe-rust` is the soundness skill in the language-craft group — the one the
`port-from-c` and `port-from-cpp` skills will invoke for the FFI boundary, and
the one a review pass invokes for the `unsafe` lines. It defers public-surface
questions to `/rust-api-design`, error handling to `/rust-errors`, `Pin` and
manual `Future` impls to `/async-rust`, and borrow-checker fights to
`/ownership-not-clone`. See `rust-skills-map` for how the full set of Rust
skills relates.
