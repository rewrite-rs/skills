Under end state A there is no binding layer: the rest of this file
does not apply, and the seam is the process boundary in the
second-to-last section. The end-state decision itself is
`/port-to-rust`. Under C the binding layer is scaffolding that gets
deleted at cut-over and may be crude; under B it is the published
package surface, and every choice below is a public API decision.

## napi-rs, the Node route (B and C)

A native addon is a `cdylib` that Node, Deno, and Bun `require`
exactly like the JS module it replaces, which is what makes the swap
invisible to call sites. A minimal addon:

```rust
use napi_derive::napi;

#[napi]
pub fn normalize(input: String) -> napi::Result<String> {
    Ok(input.trim().to_lowercase())
}
```

with the build fragments beside it — `Cargo.toml` declares the crate
type, `package.json` the build script:

```toml
[lib]
name = "fastcore"
crate-type = ["cdylib"]

[dependencies]
napi = "3"
napi-derive = "3"
```

```json
{
  "name": "fastcore",
  "version": "0.1.0",
  "devDependencies": {
    "@napi-rs/cli": "^3.0.0"
  },
  "scripts": {
    "build": "napi build --release"
  }
}
```

`napi build` emits the `.node` addon beside a generated JavaScript
glue file that exports the names the JS module had, so the existing
`require('fastcore')` is unchanged. Async crosses the same way: an
`#[napi]` function returning a future resolves a JavaScript Promise,
and blocking work belongs on the napi thread pool rather than on the
Node event loop thread — a blocking call on the loop thread stalls
every other callback in the process.

## wasm-bindgen, the browser and edge route

Two questions come first: what compiles, and what it costs. What does
not compile: threads without cross-origin isolation, a filesystem,
arbitrary sockets — and a hard cap on the crates that build for the
target at all. The cost model: every string and object crossing the
boundary is serialized, so a chatty interface is slower than the
JavaScript it replaced. The corollary is the Python one: port the
loop, not the loop body — the module worth moving is the CPU-bound
one with a clean boundary, where the boundary cost amortizes.

The output is an npm package: `wasm-pack build --target web` emits a
`pkg/` directory the JavaScript imports from, and the same build for
an edge runtime takes `--target nodejs`.

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn process_data(input: &str) -> String {
    format!("processed: {}", input)
}
```

## Errors across the boundary

A Rust `Err` becomes a thrown JavaScript value, and the existing
`catch` blocks may branch on `instanceof` or on a `code` property. Map
the error enum to the shape callers already handle rather than
accepting the default, which stringifies — a port that throws a plain
`Error` where the source threw a `TypeError` breaks the `catch`
branches the corpus never covers.

## Data crossing the boundary

Buffers and typed arrays cross without a copy where the binding
supports it; every copy that is not avoided is a conversion somewhere
in the profile. `serde_json` round-tripping at the boundary —
serializing on one side, parsing on the other — pays for itself only
when the two sides genuinely need different representations; where
both could share a typed structure, the JSON is tax. And JavaScript
strings are UTF-16, so every string crossing the boundary is a
re-encode either way.

## The no-bindings route, for end state A

The seam is a boundary the system already has — an HTTP route, a CLI
subcommand, a queue or cron worker — and the Rust binary takes one at
a time while Node keeps the rest. The differential harness runs
process-to-process: the same request, or argv and stdin, through
both, with responses, stdout, and exit codes compared. What this
costs relative to bindings: the comparison happens over serialized
output, and the granularity is the existing boundary rather than a
function. What it buys: no addon to build, no prebuilds to publish,
no wasm size budget, and a port that ends with one runtime instead of
two.

## Packaging and CI

Under B this is a deliverable: prebuilt binaries per platform for
napi-rs, or `wasm-pack` output targets, matching every platform and
runtime the existing package supported, with the fallback path —
build-from-source, or a JS implementation — decided rather than
discovered by a user on an unsupported platform. Under C it is
throwaway build glue; the only requirement is that the differential
job rebuilds the addon rather than testing a stale artifact. Under A
there is nothing to package beyond the Rust binary.
