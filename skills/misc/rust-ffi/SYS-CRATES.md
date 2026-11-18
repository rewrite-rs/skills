# `-sys` crates

A `-sys` crate is the raw layer: declarations and linking for one C library,
no policy. A safe crate with the plain name sits on top. Build rules for the
raw layer:

- **Build native code in `build.rs` with the `cc` crate.** The crate compiles
  its own copy of the library, so a user needs a C compiler and nothing else
  installed system-wide.
- **Ship verifiable upstream sources.** Vendor the sources, or download them
  at a pinned URL, and check a recorded hash before building. A reviewer can
  then confirm the bytes are the upstream release.
- **Optional build tools stay optional.** If a tool like `pkg-config`, `cmake`
  or `bindgen` is only a convenience, the build falls back when it is absent
  instead of failing.
- **Pre-generate the bindings.** Run `bindgen` ahead of time and commit the
  output so users do not need libclang. Keep generation behind a feature or
  script for maintainers.
- **Support static linking and dynamic loading.** Static by default for
  reproducibility; a `libloading`-based path for callers who must load the
  library at runtime or tolerate its absence.

## Generating the declarations

Prefer `bindgen` to mapping each function by hand; hand mappings drift from the
header. Restrict the output to what the crate needs (`--allowlist-function`,
and the matching type and var allowlists) so the surface stays small.
`include!` the generated file from a module rather than editing it. In CI,
regenerate the file and fail the job if it differs from the committed copy, so
a header update cannot slip in unreviewed. For C++ libraries, `cxx` is the
better bridge than raw bindgen output.
