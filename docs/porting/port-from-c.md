## What it does

Maps C constructs to Rust and carries the mechanics of the seam — a
C-callable surface under end states B and C, a process boundary under A.
The defining constraint: it recovers the ownership, lifetime, nullability,
length, and encoding that C never recorded, and turns each into a type. C
states almost nothing the port needs — ownership, lifetime, nullability, and
array length are conventions in comments — so a C port is largely an exercise
in recovering intent from a language that never recorded it, with every
process question deferred to `/port-to-rust`.

## When to reach for it

Model-invoked: the agent pulls this in when C is moving into Rust — a C
library, firmware, or a C application being replaced, or C modules being
replaced one at a time behind the existing build — and the question is what a
C construct becomes, or how the boundary works. It does not cover C++
codebases — RAII, templates, and the STL are `/port-from-cpp` — how a port is
run (`/port-to-rust`), the differential harness (`/rust-testing`), the
`unsafe` discipline of the shim (`/unsafe-rust`), or the shape of the Rust
that comes out (`/idiomatic-rust` and the other craft skills). The user can run
it directly, as `/port-from-c`.

## Prerequisites

A buildable C implementation with its test command, a Cargo project, and a
decided end state — `/port-to-rust` is run first, because whether a permanent
C-callable surface exists at all is settled there. Plus a sanitizer run over
the source before phase 3, so the behaviour the source does not have is
recorded in the contract before the port starts.

## What C never said

| Trap | What C never recorded |
|---|---|
| Ownership | A `T*` may be owned, borrowed, or static. Freeing the wrong one is a double free; freeing none is a leak. The port has to decide per pointer — `Box<T>`, `&T`, or a raw pointer kept raw — and the decision usually lives in a comment or in nothing at all |
| Lifetime | How long a returned pointer stays valid is convention. A function returning a pointer into a static buffer, into the argument, or into freshly allocated memory all look identical in the header, and each maps to a different Rust signature |
| Nullability | Any pointer may be null. `Option<&T>` is the honest mapping at the boundary; inside the port, a value that must exist should be a type that cannot be absent |
| Length | Arrays decay to pointers, so length travels separately, in a second parameter, in a struct field, in a NUL terminator, or by convention. Each of these is a different Rust type, and getting it wrong is the classic C bug the port is supposed to eliminate |
| Encoding and validity | `char*` is bytes. It may be UTF-8, some other encoding, or arbitrary binary. `CStr`/`CString` at the boundary, and a deliberate decision — validate, convert lossily, or keep bytes — before anything becomes a `String` |

## The boundary: bindgen in, cbindgen out

Inward, `bindgen` generates Rust declarations from the existing C headers so
the Rust side can call the C that has not moved yet; the generated API is raw
and `unsafe`, so it gets wrapped in a safe module immediately and the
generated types never spread through the codebase. Outward, `cbindgen`
generates a C header from the Rust side so existing C code calls the ported
module without call-site edits: `#[no_mangle]` exports, a stable
`#[repr(C)]` type set, `catch_unwind` at every entry point because a panic
crossing into C is undefined behaviour, and a documented caller contract for
every pointer parameter. Rust lands in the build as a `staticlib` or
`cdylib` linked into the existing Make, CMake, or Autotools build, and the
ordering rule that matters most: an empty exported function compiles, links,
and runs from the C test suite in CI before any logic is ported. Under end
state B the generated header is the product — version-controlled, and a
change to it is a semver event; under A and C the seam and its header are
deleted at cut-over. The full mechanics are in `BOUNDARY.md`.

## Common questions

**Why are C and C++ separate skills?** The migration mechanics are nearly
identical — FFI first, a Rust `staticlib` linked into the existing build,
leaf modules first, generated headers — but the idiom mapping does not share:
C++ brings RAII, templates, exceptions, and the STL, none of which C has, and
C brings manual `malloc`/`free` lifetimes, raw pointers, unions, and
preprocessor macros. A codebase using RAII, templates, or the STL is
`/port-from-cpp` even when it compiles as C.

**Should the port use a C-to-Rust transpiler?** Only as a checkpoint, never
as the port. Transpiled output compiles, but it is entirely `unsafe` and
shaped exactly like the C; it is refactored away module by module with the
differential harness green throughout, and stopping there is the
transliteration anti-pattern in its most extreme form.

**What happens to `goto cleanup`?** `?` plus `Drop` — the one C idiom that
gets strictly shorter in Rust. The cleanup order the `goto` sequence
expressed becomes the drop order, and the error path is one expression
instead of a ladder.

**How do you handle a `char*` that is not UTF-8?** It is bytes, not a
string: `&[u8]` end to end, `CStr`/`CString` only where the C side needs a
NUL-terminated view, and an explicit decision — validate, convert lossily, or
keep bytes — recorded before anything becomes a `String`.

**Is the exported header public API?** Under end state B, yes: the library
and its generated header ship together, the header is version-controlled
rather than generated-only, and a change to it is a semver event. Under A and
C the header is scaffold and is deleted at cut-over.

## It's working if

- The end state was chosen before any Rust was written.
- An empty exported function linked and ran from the C test suite before any
  logic moved.
- Every generated `bindgen` type is wrapped in a safe module rather than used
  raw.
- Every pointer parameter has a documented caller contract, and every
  `unsafe` block a `// SAFETY:` comment.
- `cargo miri test` passes over the shim.
- No panic can cross into C.
- Tag-plus-union structs became enums.
- Sanitizer findings are recorded in the contract as non-reproduced
  behaviour.

## Where it fits

`port-from-c` is the C member of the per-language porting skills: it owns the
construct mapping and the bindgen/cbindgen boundary, and defers everything
common to a port to `/port-to-rust`, the harness mechanism to
`/rust-testing`, the `unsafe` discipline of the shim to `/unsafe-rust`, the
error taxonomy to `/rust-errors`, the tag-plus-union rewrite to
`/type-driven-design`, and the public surface under end state B to
`/rust-api-design`. Its neighbour first is `/port-from-cpp`, which owns the
RAII, templates, and STL codebase even when it compiles as C; the other
per-language skills share its three-file shape but carry different traps and
a different boundary. See `rust-skills-map` for how the full set relates.
