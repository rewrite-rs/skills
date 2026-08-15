## What it does

Maps C++ constructs to Rust and carries the mechanics of the seam —
a Rust `staticlib` linked into the existing build for the default
scaffold case, and the `cxx` bridge or a C-ABI shim for the boundary
itself. The defining constraint: it maps C++ ownership intent onto
Rust ownership guarantees, and treats every construct whose C++
behaviour is undefined as a contract decision rather than a
translation.

## When to reach for it

Model-invoked: the agent pulls this in when C++ code is moving into
Rust — a C++ library or application being replaced, a C++ module
being swapped for Rust behind the existing build, or the question of
what `unique_ptr`, a template, or an STL container becomes in Rust.
It does not cover how a port is run (that is `/port-to-rust`), the
differential harness (`/rust-testing`), the `unsafe` discipline the
boundary needs (`/unsafe-rust`), or a C codebase — C is a separate
skill, `/port-from-c`.

## Prerequisites

A buildable C++ implementation with its test command, a Cargo
project, and a decided end state — `/port-to-rust` is run first,
because whether a bridge exists at all is settled there. A sanitizer
run over the source — ASan, UBSan, and TSan — is strongly recommended
before phase 3, because it tells you which behaviour is UB and
therefore not part of the contract.

## The traps

| Trap | What actually differs |
|---|---|
| Undefined behaviour was doing something | Signed overflow, strict aliasing violations, reading uninitialized memory, and out-of-bounds access are undefined in C++ and defined-or-rejected in Rust. Any behaviour the source got from UB is behaviour the port cannot reproduce and must not try to — it is found, recorded, and decided, and it is one of the few legitimate reasons for a port to differ from its source |
| Move semantics are not the same move | A C++ move leaves a valid, unspecified object behind and runs a destructor on it; a Rust move is a bitwise transfer with no hook and no leftover object. Code that reads a moved-from C++ object is doing something the port cannot express, and self-referential types that relied on move constructors need a different design entirely |
| Implicit conversions | C++ converts between numeric types, applies integer promotion, and calls converting constructors without a cast. Rust requires every conversion to be written, so a port surfaces conversions the source never made visible — and each one is a place a value could have been truncated silently |
| Iterator and reference invalidation | A `push_back` may reallocate and invalidate every outstanding iterator and reference; C++ tolerates the pattern until it does not. Rust rejects the pattern at compile time, so the port must restructure — usually with indices — and the restructuring is where the design gets clearer, not where it gets worse |
| Exceptions cross layers invisibly | An exception propagates through frames that never mention it, including destructors that run on the way out. Mapping to `Result` makes every propagation point visible and surfaces error paths the source never named — `/rust-errors`. Note the `noexcept` boundary: a C++ function that promises not to throw becomes an infallible signature, and one that did throw becomes `Result` |

## RAII, smart pointers, and templates

Destructors map to `Drop`, `unique_ptr` to `Box`, `shared_ptr` to
`Arc` (or `Rc` where single-threaded), `weak_ptr` to `Weak`,
references to `&`/`&mut`, and `const` to immutability by default —
and the rule that keeps the port clean: reach for `Arc`/`Rc` only
where the C++ genuinely shared ownership, because `shared_ptr` is
often a habit where a `unique_ptr` or a plain reference would have
done. `Drop` cannot fail, so a destructor that could throw becomes
an explicit `close()`/`finish()` returning `Result`. Simple templates
map to generics with trait bounds; SFINAE and concepts map to
bounds; CRTP usually maps to a plain trait; specialization to
distinct trait impls. Where a template was doing compile-time
computation or reflection, it is reimplemented rather than
translated — usually as a macro or a build script. Multiple
inheritance and virtual bases have no mapping and become
composition.

## Common questions

**Why are C and C++ separate skills?** The mechanics of the port
overlap — the phases, the contract, and the differential harness are
all `/port-to-rust` — but the idiom mapping does not: RAII,
templates, exceptions, and the STL have no C counterpart, and the
C-level material does not belong in the C++ skill. The set ships one
skill per source language, so C is a separate skill, `/port-from-c`.

**Should `shared_ptr` become `Arc`?** Only where the sharing is real.
The default is `Box` or a borrow; `Arc`/`Rc` is the exception the
source justifies, and a port that turns every `shared_ptr` into an
`Arc` has copied a habit rather than ported a design.

**What happens to a self-referential type?** No mapping. A Rust type
cannot hold a reference to itself, so a structure that relied on a
stable address across moves is redone — arenas, indices, or pinning —
and the redesign is a task in the plan, not a translation.

**May the port differ where the source relied on undefined behaviour?**
Yes — that is the one legitimate difference a port may take from its
source, and it is recorded: the finding goes into the parity
contract as behaviour explicitly not reproduced.

**`cxx` or a C shim?** `cxx` is the default — a shared, checked
interface on both sides, no hand-written `unsafe` for ordinary
calls. The C-ABI shim is the fallback when `cxx` does not fit: an
existing stable C API, or a build that cannot take a new dependency.
The shim is where the `unsafe` lives.

## It's working if

- The end state was chosen before any Rust was written.
- The empty bridge compiled in CI before any logic moved.
- Sanitizer findings from the source are recorded in the contract as
  behaviour that is explicitly not reproduced.
- `shared_ptr` did not become `Arc` by default.
- Every `unsafe` block in the shim carries a `// SAFETY:` comment and
  the shim passes `cargo miri test`.
- No exception or panic can cross the boundary.

## Where it fits

`port-from-cpp` is the C++ member of the per-language porting
skills: it owns the construct mapping and the C++ boundary, and
defers everything common to a port to `/port-to-rust`, the harness
mechanism to `/rust-testing`, the `unsafe` discipline to
`/unsafe-rust`, and the target-side judgment to the craft skills
(`/rust-errors`, `/type-driven-design`, `/ownership-not-clone`,
`/idiomatic-rust`). Its neighbours are the other per-language
skills — C, Python, TypeScript, Go, and Java — which share
its three-file shape but carry different traps and a different
boundary. See `rust-skills-map` for how the full set relates.
