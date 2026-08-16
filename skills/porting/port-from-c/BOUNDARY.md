Under end state A there is no permanent boundary — but the C caveat: even an
A port usually passes through a C seam on the way, so this file applies
during the migration and its output is deleted at cut-over. Under end state B
the C-callable surface is the product, and every exported signature is public
API; under C the seam is scaffold, built to be thrown away. The end-state
decision is `/port-to-rust`.

## `bindgen`, inward

`bindgen` generates Rust declarations from the existing C headers, so the
Rust side can call the C that has not moved yet. What it generates is raw:
`unsafe` functions, raw pointers, and `#[repr(C)]` types with no safety
discipline around them. The rule that follows: wrap the generated API in a
safe module immediately, and never let generated raw types spread through the
codebase. That wrapper is where the ownership and nullability decisions from
`MAPPING.md` get written down, once; the `unsafe` in it is `/unsafe-rust`.

## `cbindgen`, outward

`cbindgen` generates a C header from the Rust side, so existing C code can
call the ported module without editing call sites. The exported shape:

```rust,ignore
#[no_mangle]
pub extern "C" fn engine_normalize(
    input: *const c_char,
    out: *mut c_char,
    out_len: usize,
) -> i32 {
    // SAFETY: the caller contract, stated in the header comment, is that `input`
    // is a NUL-terminated string and `out` points to `out_len` writable bytes.
    ...
}
```

The rules around it: `#[no_mangle]` on every export, a stable `#[repr(C)]`
type set, `catch_unwind` at every entry point because a panic crossing into C
is undefined behaviour, and a documented caller contract for every pointer
parameter. Under end state B this header is the product, and changing it is a
semver event — `/rust-api-design`.

## Build integration

Rust lands in the build as a `staticlib` or `cdylib` linked into the existing
Make, CMake, or Autotools build; the `cc` crate covers the case where the
Rust build compiles the remaining C. The ordering rule that matters most in a
C port: get an empty exported function compiling, linking, and called from
the C test suite in CI before porting any logic. Build integration discovered
late blocks every module behind it.

## Errors across the boundary

Return codes go out; `errno`-style conventions are preserved where existing
callers depend on them; and no panic ever crosses. Under end state B the
code-to-meaning mapping is documented in the header rather than living in the
Rust enum only.

## Data crossing the boundary

Who allocates and who frees: the side that allocates provides the free
function, exported alongside. Layout stability comes from `#[repr(C)]` plus
a test that pins `size_of` and `align_of`. Strings are bytes on the C side
and are validated on the Rust side at exactly one place.

## The transpile-then-refactor route, and its caveat

Automatic C-to-Rust transpilation produces compiling Rust that is entirely
`unsafe`, raw-pointer-based, and shaped exactly like the C. It is a
legitimate starting point only when treated as a checkpoint to refactor away
module by module, with the differential harness green throughout. It is not a
port, and stopping there produces a codebase with the drawbacks of both
languages — the transliteration anti-pattern in `/port-to-rust`, in its most
extreme form.

## Packaging and CI

Under B, the library and its generated header ship together, and the header
is version-controlled rather than generated-only, so a diff shows API changes.
Under A and C the seam and its header are deleted at cut-over, and that
deletion is a task. In all three, the differential job builds both sides from
source.
