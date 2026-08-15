A row in this table is a starting point, not a rewrite rule: the
third column names the decision the row hides, and the decision is
made per site, with the source in front of you. The language-specific
corollary: read the runtime values, not the annotations — the type
was erased before anything ran, so the row that applies is the one
that matches what actually reaches the code.

| TS / JS | Rust | The decision |
|---|---|---|
| `number` | `f64`, `i64`, `i32`, `u32` | Range and whether bitwise ops were used; a counter is an integer, a measurement is `f64` |
| `bigint` | `i128` / `num-bigint` | Whether values genuinely exceed 64 bits |
| `string` | `String` / `&str` | JS strings are UTF-16 and may hold unpaired surrogates; `String` is valid UTF-8, so `.length` and byte length differ and lone surrogates fail to convert |
| `boolean` | `bool` | Whether the source relied on truthiness of non-booleans |
| `null` / `undefined` | `Option<T>` | Which of the two the site meant, and whether both occur |
| Array | `Vec<T>` | Whether it was heterogeneous (enum) or sparse (holes are not a `Vec`) |
| Tuple type | Tuple or `struct` | Positional access with meaning is a struct |
| Object literal | `struct` | Almost always — this is the highest-value row |
| `Record<string, T>` | `HashMap<String, T>` | Whether keys are truly dynamic |
| `Map` / `Set` | `IndexMap`/`HashMap`, `IndexSet`/`HashSet` | Insertion-order iteration, which JS guarantees and `HashMap` does not |
| `interface` | `struct` or `trait` | Count implementations before choosing |
| Discriminated union | `enum` | Nothing hidden — do this one |
| `string \| number` union | `enum`, or one type | The source deferred a design decision; the port makes it |
| `type` alias | Type alias or newtype | A newtype where the alias carried meaning — `/type-driven-design` |
| `class` | `struct` + `impl` | Whether it was a record, a namespace, or a state machine |
| `extends` | Composition | A base class with state is a field |
| Getter / setter | Methods | Whether the getter had side effects |
| `enum` (TS) | `enum` | TS numeric enums allow arbitrary numbers in; the Rust enum does not, which is a narrowing to record |
| Optional field `x?: T` | `Option<T>` + `#[serde(skip_serializing_if)]` | Whether missing and `null` serialize identically |
| `throw` / `try`/`catch` | `Result` + `?` | The error type — `/rust-errors` |
| `Promise<T>` | `impl Future<Output = T>` | Eager versus lazy, and whether anything relied on a floating promise |
| `async`/`await` | `tokio` | Runtime and blocking work — `/async-rust` |
| Callback with `(err, value)` | `Result` | Node-style callbacks encode both paths in one signature |
| `EventEmitter` | Channel (`tokio::sync::broadcast`/`mpsc`) | Backpressure, which the emitter did not have |
| `JSON.parse` / `stringify` | `serde_json` | Duplicate keys, key order, `NaN`/`Infinity` (JS stringifies them as `null`), and number precision |
| `Date` | `chrono` / `time` | Millisecond precision, timezone handling, and that JS `Date` is a millisecond epoch |
| `RegExp` | `regex` crate | Lookaround and backreferences are unsupported — see the traps table |
| `process.env` | `std::env` | Missing variable was `undefined` and is now an explicit decision |
| `require` / dynamic import | Compile-time modules | A dynamic import graph does not port; it is redesigned |
| `Object.assign` / spread | Struct update syntax or a builder | Whether the spread was adding unknown keys |
| Prototype mutation | Nothing | Cannot be ported; the behaviour it produced is reimplemented explicitly |
| `console.log` | `tracing` / `println!` | Structured log consumers make wording a contract question |
| `npm` dependency | A crate, or a reimplementation | Crate availability is a phase-1 finding, not a phase-3 surprise |

## The rows that are traps rather than mappings

- `any` — the annotation is not evidence; read the call sites.
- `as` casts — the source asserted something the runtime never
  checked, so the port validates instead.
- `==` versus `===` — any use of loose equality is coercion behaviour
  that must be reproduced or deliberately dropped, and recorded either
  way.
