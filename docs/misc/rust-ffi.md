## What it does

Designs an FFI boundary meant to last — a thin translation layer over a
core crate that holds all the business logic. The defining constraint: the
boundary only translates. It converts types, checks pointers, and calls in;
it does not decide, and a line of logic in the `extern` layer is a line no
`cargo test` reaches.

## When to reach for it

Model-invoked: the agent pulls this in when exposing a Rust library to
another language, when reviewing an `extern` surface, or when a DLL or
shared library keeps state. It is not for migrating off C — the bindgen and
cbindgen walkthroughs, and the mechanics of linking Rust into an existing
build, are `/port-from-c` — and it is not for `unsafe` soundness, which is
`/unsafe-rust`.

## Prerequisites

A decision about which side owns the process and which language calls which.
The boundary shape follows from it: a library that another language calls
presents a different surface from one that is loaded into a host process and
driven by it, and the state a shared library keeps is isolated differently
in each case.

## The layer that only translates

Every line of business logic lives in a normal Rust crate that knows nothing
about FFI; the `extern` layer converts types, checks pointers, and calls in.
The split is a testability decision as much as a cleanliness one: the core
crate is testable with `cargo test`, and the FFI layer is testable only
through a foreign harness. Nothing panics across the boundary — every
`extern "C"` entry point catches and converts the panic to an error code or
an out-parameter — and strings cross as `CStr` and `CString`, with the
UTF-8 validation happening once, on the way in.

## Ownership on every pointer

Who allocated it, who frees it, how long it stays valid, and whether null is
allowed — written in the signature and in the docs. A crate that exposes an
allocation exposes the matching free function from the same crate, because
the other side cannot free what the first side allocated, and a `# Safety`
section carries the contract. `#[repr(C)]` goes on every struct that
crosses, and `#[repr(transparent)]` on the newtype that wraps a handle, so
the wrapper is invisible on the wire and the type safety is free on the
Rust side.

## Common questions

**How is this different from `/port-from-c`?** That skill moves code off C
— bindgen, cbindgen, and linking Rust into an existing build, with a seam
that may be deleted at cut-over. This one designs a boundary meant to stay,
and it defers the migration mechanics back to that skill.

**Does every entry point need `catch_unwind`?** Yes. Unwinding into a
foreign frame is undefined behaviour, and the boundary is the one place
`/rust-errors` does not call `catch_unwind` a last resort.

**Is `repr(transparent)` worth it?** For a handle, yes: the newtype is
invisible on the wire, so the caller sees a plain pointer, while the Rust
side gets a distinct type at no layout cost. For a struct that crosses by
value it is `#[repr(C)]`, not `#[repr(transparent)]` — the layout is part
of the contract either way.

**Where do the bindings get generated?** That is `/port-from-c` — bindgen
inward, cbindgen outward — because the generation tooling belongs to the
migration story, not to the boundary design.

## It's working if

- No business logic in the `extern` layer — only translation, checks, and
  calls into the core crate.
- Every entry point catches unwinds and converts them to an error code or
  an out-parameter.
- Every allocation has a matching free from the same crate, and the
  ownership is stated in the signature and in a `# Safety` section.
- A foreign-language test exercises create-use-destroy under the platform
  leak checker.

## Where it fits

`rust-ffi` is the boundary-design skill in the `misc` bucket — the one that
shapes an FFI surface meant to last. It takes the end-state decision from
`/port-to-rust`, hands the migration mechanics to `/port-from-c`, the
soundness question to `/unsafe-rust`, the safe API above the boundary to
`/rust-api-design`, and the `# Safety` wording to `/rust-docs`. See
`rust-skills-map` for how the full set of Rust skills relates.
