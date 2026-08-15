## What it does

Maps the JavaScript runtime to Rust — the construct mapping is
written against the values the runtime actually produces, since
TypeScript types are erased before anything runs — and carries the
mechanics of the two boundaries: napi-rs for Node, Deno, and Bun,
wasm-bindgen for the browser and the edge. The defining constraint:
it maps the JavaScript runtime rather than the TypeScript type
system, and every process question is deferred — the parity
contract, the phases, and the anti-patterns are `/port-to-rust`.

## When to reach for it

Model-invoked: the agent pulls this in when TypeScript or JavaScript
code is moving into Rust — a Node, Deno, or Bun service, an Express
app, a JS CLI or library, or a hot JS module being replaced by a
native addon or a WebAssembly build — and the question is what a
TypeScript or JavaScript construct becomes, or how the boundary
works. It does not cover how a port is run (that is `/port-to-rust`),
the differential harness (`/rust-testing`), or the shape of the Rust
that comes out (`/idiomatic-rust` and the other craft skills). There
is no separate JavaScript skill: JavaScript is the same runtime
without the erased layer.

## Prerequisites

A runnable TypeScript or JavaScript implementation and its test
suite, a Cargo project, and a decided end state — `/port-to-rust` is
run first, because whether a binding layer exists at all is settled
there. Under end state B or C, also a decision about the target
runtime — Node, Deno, or Bun versus a browser or edge runtime —
because it selects the boundary.

## The traps

| Trap | What actually differs |
|---|---|
| Every `number` is an `f64` | There is no integer type. Above 2⁵³ values lose precision silently, and bitwise operators coerce to `i32` first — so `x \| 0` is a documented truncation the port must reproduce or deliberately drop. Decide per field: `i64`, `f64`, or `i32`, and record which in the contract |
| Two kinds of absent | `undefined` and `null` are distinct, and most codebases use both without a rule. Rust has one `Option`, so each field needs a decision, and JSON round-tripping makes it observable — `serde` must be told whether a missing key and a `null` key are the same thing |
| Sorting | `Array.prototype.sort` with no comparator sorts by UTF-16 string conversion, so `[10, 9].sort()` is `[10, 9]`. A port that uses a numeric sort produces a different, *better*, and non-parity result |
| Regex | JavaScript regexes use backtracking and support lookaround and backreferences; the `regex` crate does not. Any source pattern using them needs a different crate or a restructured matcher, and this is found at port time, not at review time |
| Exceptions carry anything | `throw` accepts any value, and `catch` receives it untyped. Mapping to `Result` means naming the error cases the source never named — `/rust-errors` — and the ones that were thrown from library code are the ones no test covers |

## Bindings, or no bindings

The end state decides whether a binding layer appears at all:

| End state | In TypeScript and JavaScript terms | Binding layer |
|---|---|---|
| A. Replacement | A Rust binary or crate takes over; nothing imports it from JavaScript afterwards, and the seam is the CLI, route, or worker that already exists | Neither napi-rs nor wasm appears |
| B. Rust core, the npm package is the product | The module keeps its name and its exported signatures; the engine underneath becomes Rust | Permanent public surface — signatures, error types, prebuilds per platform, semver |
| C. Scaffold | The port ends standalone, but JavaScript calls the Rust module while the migration is under way | Temporary, and deleted at cut-over |

Under B and C the target decides the route: Node, Deno, and Bun take
a native addon through napi-rs, built with the napi CLI and
`require`d exactly like the JS module it replaces; browsers and edge
runtimes take WebAssembly through wasm-bindgen, packaged with
`wasm-pack` as an npm-compatible module. The two are not
interchangeable — wasm has no threads by default, no filesystem, a
serialization cost at every call, and a hard cap on what crates will
compile — and under B the binding surface is a permanent public API,
under C it is scaffold deleted at cut-over. Under A there is no
binding layer at any point and the seam is the process boundary the
system already has — an HTTP route, a CLI subcommand, a queue or cron
worker — with the differential harness running process-to-process.
The mechanics are in `BOUNDARY.md`.

## Common questions

**Does a JavaScript or TypeScript port have to produce a native
addon or a wasm bundle?** No. That is end state B or C, the cases
where JavaScript keeps calling the code after the port. A standalone
Rust binary is end state A and is never imported from JavaScript;
its seam is the process boundary.

**Is there a separate JavaScript skill?** No. TypeScript is
JavaScript plus types on the same runtime — same async model, same
boundary — and the types are erased before anything runs, so the
mapping is identical. One skill, `port-from-typescript`, covers both.

**What happens to a regex that uses lookahead or a backreference?**
The `regex` crate does not support them, so the source pattern does
not port as-is: it needs a different crate or a restructured matcher.
This is found at port time, not at review time, so the source
patterns are inventoried before the first one is translated.

**Can both `undefined` and `null` map to `Option<T>`?** Yes, but the
JSON behaviour has to be pinned: `serde` must be told whether a
missing key and a `null` key are the same thing, and the decision is
per field, recorded in the contract.

**Can the TypeScript types be trusted?** No. They are erased before
anything runs: an annotation is a claim the runtime never checked, so
`any`, `as` casts, and unchecked JSON boundaries are unknown input,
and the mapping follows the runtime values, not the annotations.

## It's working if

- The end state was chosen before any Rust was written, and no addon
  or wasm target exists under end state A.
- Under B and C, the existing JavaScript or TypeScript suite still
  passes with the Rust module loaded.
- The differential corpus covers a value above 2⁵³, both flavours of
  absent (`null` and `undefined`), and a coercion case.
- Unions became enums rather than structs with optional fields.
- JSON output key order and number formatting were checked against
  the source, not assumed.
- The boundary choice is written down with its consequences.

## Where it fits

`port-from-typescript` is the TypeScript and JavaScript member of
the per-language porting skills: it owns the construct mapping and
the two boundaries, and defers everything common to a port to
`/port-to-rust`, the harness mechanism to `/rust-testing`, and the
target-side judgment to the craft skills (`/rust-errors`,
`/type-driven-design`, `/async-rust`, `/idiomatic-rust`). Its
neighbours are the other per-language skills — `/port-from-python`
and, as they land, C, C++, Go, and Java — which share its
three-file shape but carry different traps and a different
boundary. See `rust-skills-map` for how the full set relates.
