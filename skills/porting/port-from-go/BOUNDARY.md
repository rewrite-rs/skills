Under end state A — the common case for Go — there is no binding layer
at all, and only the process-seam section below applies; the cgo
sections are for B and C. Under C, cgo carries the migration and is
deleted at cut-over. Under B the C ABI surface is the product and every
signature in it is public API. The end-state decision is
`/port-to-rust`.

## The process seam, which is the default

How to put a Rust binary behind an existing Go interface: one HTTP
route, one gRPC method, one subcommand, or one queue consumer at a
time, with both implementations reachable and traffic split or
mirrored. Why this is the right default for Go specifically: cgo is
expensive at the call and awkward in the build, while Go systems
almost always already have a network or process boundary to strangle
at.

## cgo, both directions, with its costs

Rust exposed as a C ABI `staticlib` or `cdylib` and called from Go
through cgo; Go exposed via `c-shared` and called from Rust. The costs,
stated honestly: a cgo call costs far more than a Go function call, the
Go runtime and the Rust side each want their own threads, Rust panics
and Go panics do not cross the boundary safely, and any pointer passed
across is subject to the cgo pointer-passing rules. A minimal surface:

```rust
#[no_mangle]
pub extern "C" fn normalize(input: *const c_char, out: *mut c_char, out_len: usize) -> i32 {
    // SAFETY: caller guarantees `input` is a NUL-terminated C string and that
    // `out` points to at least `out_len` writable bytes.
    ...
}
```

The `unsafe` in a shim is `/unsafe-rust`; whether the shim earns its
keep is a `/port-to-rust` strategy question.

## Errors across the boundary

A Rust `Result` becomes a status code plus an out-parameter across
cgo, or a typed error response across a network seam. Go callers
matching on sentinel errors must keep matching — map the sentinel set
explicitly rather than serializing a message.

## Data crossing the boundary

Byte slices, strings (Go strings are not NUL-terminated and not
guaranteed UTF-8), and struct layout with `#[repr(C)]`. Copying at a
network seam is usually cheaper than the engineering cost of a
shared-memory design, and measuring beats assuming.

## Concurrency across the boundary

Do not call back into Go from a Rust thread it does not know about;
keep the async runtime on the Rust side and the goroutines on the Go
side, with the seam as the only crossing point.

## Packaging and CI

Linking a Rust `staticlib` into a Go build, cross-compilation (which
Go makes easy and cgo makes hard — a cgo port loses `CGO_ENABLED=0`
static builds, and that is a deployment change to raise before phase
3), and the requirement that the differential job builds both sides
fresh.
