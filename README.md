<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/surface.svg?title=rewrite-rs%2Fskills&subtitle=The+most+complete+agent+skills+for+real+Rust%2C+and+for+porting+into+it&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiByb2xlPSJpbWciIGFyaWEtbGFiZWw9InJld3JpdGUucnMiPgogIDx0aXRsZT5yZXdyaXRlLnJzIOKAlCBhdmF0YXIsIHRyYW5zcGFyZW50PC90aXRsZT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMCAyMCkgc2NhbGUoMC42KSI%2BCiAgPHBvbHlnb24gcG9pbnRzPSIxMCwxMCA3OCwxMCAxMCw3OCIgZmlsbD0iIzVjNTM0ZCI%2BPC9wb2x5Z29uPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsOTAgOTAsMTggOTAsOTAiIGZpbGw9IiNiYzQ3MTAiPjwvcG9seWdvbj4KICA8L2c%2BCjwvc3ZnPg%3D%3D&align=left&logoColor=f2723f&bg=0c1015&titleColor=f2723f&subtitleColor=b0b5bd&font=jetbrains-mono&mode=dark" />
  <img alt="rewrite-rs/skills: the most complete agent skills for real Rust, and for porting into it" src="https://shieldcn.dev/header/surface.svg?title=rewrite-rs%2Fskills&subtitle=The+most+complete+agent+skills+for+real+Rust%2C+and+for+porting+into+it&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiByb2xlPSJpbWciIGFyaWEtbGFiZWw9InJld3JpdGUucnMiPgogIDx0aXRsZT5yZXdyaXRlLnJzIOKAlCBhdmF0YXIsIHRyYW5zcGFyZW50PC90aXRsZT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMCAyMCkgc2NhbGUoMC42KSI%2BCiAgPHBvbHlnb24gcG9pbnRzPSIxMCwxMCA3OCwxMCAxMCw3OCIgZmlsbD0iIzVjNTM0ZCI%2BPC9wb2x5Z29uPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsOTAgOTAsMTggOTAsOTAiIGZpbGw9IiNiYzQ3MTAiPjwvcG9seWdvbj4KICA8L2c%2BCjwvc3ZnPg%3D%3D&align=left&logoColor=5c534d&bg=fcfdff&titleColor=bc4710&subtitleColor=61666e&font=jetbrains-mono&mode=light" />
</picture>

<p>
  <a href="#skills">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/skills-25-f2723f.svg?variant=secondary&logo=rust&mode=dark" />
      <img alt="25 skills" src="https://shieldcn.dev/badge/skills-25-bc4710.svg?variant=secondary&logo=rust&mode=light" />
    </picture>
  </a>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/group/github/release/rewrite-rs/skills+github/ci/rewrite-rs/skills+github/license/rewrite-rs/skills+github/last-commit/rewrite-rs/skills+github/stars/rewrite-rs/skills.svg?variant=secondary&mode=dark" />
    <img alt="Release, CI, license, last commit, stars" src="https://shieldcn.dev/group/github/release/rewrite-rs/skills+github/ci/rewrite-rs/skills+github/license/rewrite-rs/skills+github/last-commit/rewrite-rs/skills+github/stars/rewrite-rs/skills.svg?variant=secondary&mode=light" />
  </picture>
</p>

The most complete skill set for coding agents writing real Rust. 25 skills that
teach judgment, not snippets: use the ownership system instead of working around
it, design errors and APIs that survive review, and port code into Rust without
losing behaviour.

Three areas. **Rust craft:** idioms, ownership, errors, types, async, unsafe,
performance, concurrency, observability, docs. **Porting:** one skill per source
language (C, C++, Go, Java, Python, TypeScript) over a shared migration spine.
**Workflow:** review, testing, setup, and a router that picks the skill for you.

## Installation

The two routes below are exclusive: the plugin is a managed, read-only bundle you
subscribe to; `npx` writes editable files you own. Installing both leaves every
skill duplicated. Pick one.

<details>
<summary>Claude Code</summary>

```
/plugin marketplace add rewrite-rs/skills
/plugin install rewrite-rs-skills@rewrite-rs
```

</details>

<details>
<summary>Other agents</summary>

```bash
npx skills@latest add rewrite-rs/skills
```

Pick the skills you want, and which coding agents to install them on.

</details>

## Skills

### Rust

Language-craft skills for writing and reviewing Rust.

**Model-invoked**

- [idiomatic-rust](./skills/rust/idiomatic-rust/SKILL.md) — Rust that reads like Rust, without boilerplate.
- [ownership-not-clone](./skills/rust/ownership-not-clone/SKILL.md) — Ownership and borrowing instead of clone, Rc, and RefCell.
- [rust-errors](./skills/rust/rust-errors/SKILL.md) — Result over unwrap, and error types callers can act on.
- [type-driven-design](./skills/rust/type-driven-design/SKILL.md) — Make illegal states unrepresentable in the type system.
- [rust-api-design](./skills/rust/rust-api-design/SKILL.md) — Public surface, trait design, and semver discipline.
- [async-rust](./skills/rust/async-rust/SKILL.md) — Runtimes, Send bounds, cancellation safety, and blocking work.
- [unsafe-rust](./skills/rust/unsafe-rust/SKILL.md) — Justify, document, and verify unsafe blocks with Miri.
- [rust-performance](./skills/rust/rust-performance/SKILL.md) — Profile first, cut allocation, and treat codegen flags as the last five percent.
- [rust-concurrency](./skills/rust/rust-concurrency/SKILL.md) — Threads, channels, locks, and atomics — the model that fits the workload.
- [rust-observability](./skills/rust/rust-observability/SKILL.md) — Structured events with named fields, spans, and no secrets in logs.
- [rust-docs](./skills/rust/rust-docs/SKILL.md) — Doc comments as API contract, with doctests that actually run.

**User-invoked**

None yet in this bucket.

### Porting

**Model-invoked**

- [port-to-rust](./skills/porting/port-to-rust/SKILL.md) — Parity contract, phase sequence, and differential proof for a port.
- [port-from-python](./skills/porting/port-from-python/SKILL.md) — Python-to-Rust construct mapping and the PyO3 boundary.
- [port-from-typescript](./skills/porting/port-from-typescript/SKILL.md) — TypeScript and JavaScript mapping, with the napi-rs and wasm boundaries.
- [port-from-go](./skills/porting/port-from-go/SKILL.md) — Go-to-Rust mapping — goroutines, channels, interfaces, and error values.
- [port-from-java](./skills/porting/port-from-java/SKILL.md) — Java-to-Rust mapping — hierarchies to enums, exceptions to Result.
- [port-from-cpp](./skills/porting/port-from-cpp/SKILL.md) — C++-to-Rust mapping — RAII, smart pointers, templates, and the cxx bridge.
- [port-from-c](./skills/porting/port-from-c/SKILL.md) — C-to-Rust mapping — pointers, ownership, unions, and the bindgen boundary.

**User-invoked**

None yet in this bucket.

### Workflow

**Model-invoked**

- [rust-testing](./skills/workflow/rust-testing/SKILL.md) — Tests that fail when behaviour changes, including port parity.
- [rust-code-review](./skills/workflow/rust-code-review/SKILL.md) — Two-axis review — standards and spec — over a Rust diff.

**User-invoked**

- [setup-rust-skills](./skills/workflow/setup-rust-skills/SKILL.md) — Lint, format, and recorded project posture for a Rust repo.
- [rust-skills-map](./skills/workflow/rust-skills-map/SKILL.md) — Router over the skill set — which skill owns which decision.

### Misc

Occasional setup and audit skills: CI, hooks, and the dependency tree.

**Model-invoked**

- [rust-supply-chain](./skills/misc/rust-supply-chain/SKILL.md) — Dependency advisories, licences, and duplicates, each ending in a decision.
- [rust-macros](./skills/misc/rust-macros/SKILL.md) — Macros as a last resort, by-example first, with errors that point at the caller.
- [rust-serde](./skills/misc/rust-serde/SKILL.md) — Serde as the validating boundary between a wire format and a domain type.
- [rust-ffi](./skills/misc/rust-ffi/SKILL.md) — A translating FFI boundary with explicit ownership and no panics crossing it.

**User-invoked**

- [setup-rust-ci](./skills/misc/setup-rust-ci/SKILL.md) — A GitHub Actions workflow that runs what the skills run locally.
- [setup-rust-pre-commit](./skills/misc/setup-rust-pre-commit/SKILL.md) — Fast format-and-lint hooks, with CI left as the gate.

## Why these skills exist

### Rust that reads like a translation

Code ported or written without idioms native to Rust compiles and runs, but reads like
whatever language it came from — index loops instead of iterators, hand-written
conversions instead of `From`/`Into`, hand-written impls instead of derives. These
skills push toward the shape a Rust reader expects, not just code that the compiler
accepts.

### `clone` and `unwrap` as design smells

`clone`, `unwrap`, `expect`, and `Rc<RefCell<_>>` all resolve a borrow-checker or
type-system objection without resolving the design problem behind it. Sometimes
that's the right call — but reaching for one by reflex, rather than as a deliberate
tradeoff, is usually a sign the ownership structure needs rethinking rather than
routing around.

### States that compile, and invariants that hold

The compiler accepts every constructible combination of fields, and the test
suite covers only the paths it was told to. An illegal state that compiles — a
post that is draft and published at once, a connection that sends before it
connects — and an `unsafe` block whose invariant holds for every current caller
but not for the next one both pass every check until they do not. The skills in
this set push the first into the type system, where the state cannot be
constructed, and keep the second behind a written invariant and Miri, where a
violation is a report rather than a production incident.

### Ports that drift from parity

A port that compiles is not a port that matches the behaviour of its source. Without a
crisply stated parity contract — what "done" means for this port — and discipline
about never narrowing it silently, a port drifts: edge cases the original handled
quietly stop being handled, and nobody notices until production.

### Ports that never choose an end state

A port ends one of three ways: replacement, with the source implementation deleted;
a permanent binding that the existing callers keep importing; or scaffold, deleted
at cut-over. That choice fixes the seam and the contract before either is written,
and choosing it late is what leaves a codebase stuck in two languages — Rust that
was never agreed to stay, and source code that is no longer maintained but still
decides what runs.

### Advice that nothing enforces

The craft skills name the standard — the shape, the ownership, the error type —
but a standard nothing enforces is a standard the next contributor forgets.
Lint and format configuration the tooling applies, tests that fail when
behaviour changes, a review that ends in a verdict, and a recorded posture file
every agent reads on opening the repo are what make the standard the state
the repo lives in, not advice about it.

## Contributing / repo layout

See `CLAUDE.md` for the rules that govern authoring, editing, and reviewing a skill
in this repo, and `CONTEXT.md` for the vocabulary this repo uses.
