Under end state A — a standalone Rust replacement, nothing linking
against the C++ side afterwards — there is no bridge, the seam is a
process or library boundary, and the rest of this file is
background. Under C the bridge is scaffolding deleted at cut-over,
and under B the C++-callable surface is the product. It must be
sound in all three, because unsoundness is not a scaffolding-grade
defect. The end-state decision is `/port-to-rust`.

## The `cxx` crate, the default bridge

`cxx` is the default because the interface is shared and checked on
both sides, strings and vectors cross as safe types, and ordinary
calls need no hand-written `unsafe`. A minimal bridge:

```rust,ignore
#[cxx::bridge(namespace = "engine")]
mod ffi {
    extern "Rust" {
        fn normalize(input: &str) -> String;
    }
    unsafe extern "C++" {
        include!("engine/legacy.h");
        fn legacy_normalize(input: &CxxString) -> UniquePtr<CxxString>;
    }
}
```

What does not cross: templates, exceptions (they must be caught on
the C++ side and mapped to a result type), and arbitrary class
hierarchies.

## The C-ABI shim route

When `cxx` does not fit — an existing stable C API, or a build that
cannot take a new dependency — the fallback is `extern "C"` on both
sides with `#[repr(C)]` types and a hand-written shim. This is where
the `unsafe` lives: every block carries a `// SAFETY:` comment, and
the whole shim is reviewed under `/unsafe-rust` and verified under
`cargo miri test`. For an existing C header, `bindgen` can generate
the declarations; it consumes the header, it does not own the safety
story.

## Build integration

Rust as a `staticlib` or `cdylib` linked into the existing CMake,
Bazel, or Make build; the `cc`/`cmake` crates when the Rust build
drives the C++ instead. The differential job builds both sides from
source rather than linking a stale artifact. Get the empty bridge
compiling and linked in CI before porting any logic — a
build-integration problem discovered after the port has started
blocks everything behind it.

## Errors across the boundary

A C++ exception must not cross into Rust and a Rust panic must not
cross into C++ — both are undefined behaviour. Catch on each side at
the boundary and convert to a result value; `catch_unwind` on the
Rust side where a C++ callback can re-enter through a panicking path.

## Data across the boundary

Ownership transfer versus borrowing, `#[repr(C)]` layout, and string
encoding: C++ strings are bytes, Rust strings are UTF-8, so which
type crosses is a decision. The rule: the boundary type is a design
decision, not whatever was convenient on one side.

## Packaging and CI

Under B, the headers and the library ship as the deliverable —
`cbindgen`-generated headers if the surface is C-ABI, the `cxx`
generated headers otherwise. Under C, the bridge is deleted at
cut-over, and the deletion is a task in the plan. Under A, only the
Rust artifact ships.
