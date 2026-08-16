# rewrite-rs-skills

## 0.1.0-alpha.1

2026-08-16

Initial alpha release: 28 promoted agent skills for writing real Rust and
porting into it. The `skills/in-progress/` set ships in neither install
route and is not part of this count. Each skill is listed with the
one-liner from its frontmatter, trigger conditions stripped.

The full set, by bucket:

### Language craft — `skills/rust/`

- `idiomatic-rust` — write Rust that reads like Rust — iterator pipelines over index loops, From/Into over ad-hoc converters, derives over hand-written impls, newtypes over bare primitives
- `ownership-not-clone` — use ownership and borrowing instead of reaching for clone, Rc, RefCell, or Arc<Mutex<_>> to silence the borrow checker; every clone must be explainable
- `rust-errors` — design Rust error types and panic policy — Result over unwrap, thiserror for libraries, anyhow for binaries, context that survives the call stack
- `type-driven-design` — make illegal states unrepresentable — enums instead of boolean and string flags, newtypes instead of bare primitives, parsed types instead of validated ones, typestate for protocol order
- `rust-api-design` — design a Rust public API — trait design, generics versus dyn, sealed traits, what is exported, and which changes break semver
- `async-rust` — write correct async Rust — runtime choice, Send and Sync bounds, cancellation safety, blocking work inside async contexts, and shared state across tasks
- `unsafe-rust` — justify, document, and verify unsafe Rust — safety invariants on every unsafe block, sound safe wrappers, undefined behaviour hazards, and verification with Miri
- `rust-performance` — profile before optimizing, cut allocation out of hot paths, and treat LTO, codegen-units, PGO and target-cpu as the last five percent
- `rust-concurrency` — pick the concurrency model from the workload shape — rayon for data parallelism, scoped threads for borrowed stack data, channels for handoff, shared state last — and use the weakest correct atomic ordering
- `rust-observability` — logs are structured events with named fields, not formatted strings — tracing over log over println!, spans for async context, error chains logged once, and never a secret in a field
- `rust-docs` — doc comments as API contract — a one-line first sentence, module-level docs, Examples, Errors, Panics and Safety sections, doctests that actually run, and intra-doc links

### Porting — `skills/porting/`

- `port-to-rust` — run a port into Rust without losing behaviour — define the parity contract, sequence the phases, migrate incrementally behind a stable boundary, and prove parity differentially
- `port-from-python` — port Python into Rust — construct mapping, the semantic traps (integer width, floor division, str versus bytes, exceptions to Result), and the seam, which is a process boundary for a standalone replacement and PyO3 when Python keeps calling the code
- `port-from-typescript` — port TypeScript or JavaScript into Rust — construct mapping against runtime semantics, the traps (every number is an f64, two kinds of absent, structural typing, regex feature gaps), and the napi-rs and wasm-bindgen boundaries
- `port-from-go` — port Go into Rust — goroutines and channels onto tasks and async, interfaces onto traits, error values onto Result, and the value-semantics traps (zero values, integer wraparound, slice aliasing, nil)
- `port-from-java` — port Java into Rust — class hierarchies onto enums and composition, exceptions onto Result, collections and streams onto Rust equivalents, and the traps (UTF-16 strings, silent integer wraparound, null, equals/hashCode contracts)
- `port-from-cpp` — port C++ into Rust — RAII and smart pointers onto ownership, templates onto generics and traits, exceptions onto Result, the STL onto Rust collections, and the traps (move semantics, implicit conversions, undefined behaviour, iterator invalidation)
- `port-from-c` — port C into Rust — recovering the ownership, lifetime, nullability, and length that C never recorded, mapping pointers to references and slices, tag-plus-union to enums, return codes and errno to Result, and linking Rust into the existing build with bindgen and cbindgen

### Workflow — `skills/workflow/`

- `rust-testing` — design Rust tests that catch real regressions — unit, integration, doc, property, snapshot, and golden tests, and differential tests that prove a port matches its source
- `rust-code-review` — review Rust changes on two axes at once — standards (idioms, ownership, errors, API surface, unsafe) and spec (does the change do what was asked) — with a Rust smell baseline layered on the repo lint configuration
- `setup-rust-skills` — configure a Rust repo for this skill set — lint and format configuration, and a recorded project posture (edition, MSRV, async runtime, no_std, unsafe policy) at docs/agents/rust.md
- `rust-skills-map` — the router for this skill set — which Rust skill covers which decision, how they relate, and which one to reach for from where you are

### Setup and audit — `skills/misc/`

- `setup-rust-ci` — write a GitHub Actions workflow for a Rust repo — format, clippy at the configured level, tests, and an MSRV job, derived from the posture the repo already recorded
- `setup-rust-pre-commit` — set up fast pre-commit hooks for a Rust repo — format and lint the staged changes only, with CI left as the real gate
- `rust-supply-chain` — audit a Rust dependency tree — advisories, licences, banned and duplicate crates, and unmaintained dependencies — and turn each finding into a decision
- `rust-macros` — write a macro only when a function, a trait, or a generic cannot do the job — then by-example before proc-macro, with hygiene, a `_private` helper module, and spanned compile errors instead of panics
- `rust-serde` — serde as the boundary where untrusted input becomes a domain type — rename_all, default, skip_serializing_if, flatten, the four enum representations, deny_unknown_fields, and try_from validation
- `rust-ffi` — design an FFI boundary meant to last — a thin translation layer with the logic in core crates, no panic across the boundary, explicit ownership on every pointer, repr(transparent) newtypes, and unsafe extern in edition 2024
