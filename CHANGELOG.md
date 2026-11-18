# rewrite-rs-skills

## 0.2.0

2026-11-18

Every skill was broadened. Ten skills gained new companion files, the rest
gained rules and reworked examples, and the porting skills and the Rust code
review now ship with eval cases. The README now explains how the set works and
lists every install route. The promoted set is unchanged at 28 skills.

### Skills — `skills/rust/`

- `idiomatic-rust` — new `PATTERNS` (common idioms with worked examples) and `READABILITY` files; `NAMING` extended with conversion, getter, and iterator naming rules; formatting now covers only the files you changed
- `rust-api-design` — new `CONSTRUCTION` (constructors, builders, defaults), `STANDARD-TRAITS` (which common traits a public type should implement), and `FEATURES` (additive Cargo features) files; `SURFACE` and `SEMVER` extended
- `rust-errors` — new `PANICS` file covering when a panic is the right answer and how to document it; `ERROR-TYPES` extended
- `type-driven-design` — new `MODELLING` file on turning a domain into types, with typestate and numerics notes tightened
- `ownership-not-clone` — new `LIFETIMES` file; the shared-state guidance extended
- `rust-docs` — new `COMMENTS` (when a plain comment beats a doc comment) and `PACKAGING` (crate metadata and docs.rs setup) files
- `async-rust` — keeping futures small, with a size test, and library rules for staying runtime-agnostic
- `unsafe-rust` — module-level soundness, plus rules against `transmute` shortcuts and `unsafe impl Send` used to silence a compiler error
- `rust-concurrency` — lock discipline (scope, ordering, never returning a guard) and a position on poisoned mutexes
- `rust-performance` — deciding whether speed matters at all, `black_box` in benchmarks, hasher choice, and batch entry points
- `rust-observability` — standard attribute names for fields, and keeping telemetry out of hot loops

### Skills — `skills/porting/`

- `port-to-rust` — `ANTIPATTERNS` extended with proportionality rules, so the port is sized to the source and does not grow extra layers; a `PORTING.md` reviewer-notes deliverable; `PARITY-CONTRACT` extended

### Skills — `skills/workflow/`

- `rust-code-review` — decides scope first, then reviews in a fixed priority order; short and long report formats in a new `REPORT-FORMAT` file, where each long finding carries Consequence, Standard, and Change; a larger smells table; `#[expect]` advice applies only at MSRV 1.81 or later
- `setup-rust-skills` — a wider default lint set, tagged lib or app and regrouped by category; `expect_used` stays at deny, with the alternative documented; new `WORKSPACE` file on lint and layout choices for multi-crate workspaces
- `rust-testing` — examples as compiled usage samples, fuzzing for untrusted input, feature-combination and per-platform testing, and following the test framework the repo already uses

### Skills — `skills/misc/`

- `setup-rust-ci` — CI job guidance and an extended `WORKFLOWS` file
- `rust-macros` — new `ITEM-MACROS` file on macros that generate items
- `rust-ffi` — new `SYS-CRATES` file on `-sys` crates and their safe wrappers
- `rust-serde` — an opt-in `serde` feature for library crates
- `rust-supply-chain` — what version requirements allow, why duplicate crates appear, and the cost of each added dependency

### Fixes

- `rust-macros` — the `min_of!` example evaluated its arguments twice; it now binds each argument once

### Evals

- Eval cases for all seven porting skills (`port-to-rust`, `port-from-python`, `port-from-typescript`, `port-from-go`, `port-from-java`, `port-from-cpp`, `port-from-c`), each with inputs, a prompt, and graders
- Two eval cases for `rust-code-review`
- Each grader says where its numbers come from

### Install and docs

- README: how the set works, a before and after example, and a testing section
- Install routes: Claude Code plugin, `npx`, `gh skill install rewrite-rs/skills --all`, Gemini CLI, manual copy, and claude.ai zips
- Codex plugin manifest and marketplace file (untested)

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
