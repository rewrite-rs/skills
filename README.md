# rewrite-rs/skills

Skills for writing Rust that uses the ownership system rather than working around
it, and for porting code into Rust without losing behaviour. The org name is
`rewrite-rs`, but porting is one of three areas here, not the whole story — the
other two are idiomatic Rust craft and the workflow skills (review, testing, setup)
that hold a port or a rewrite together end to end.

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

### Workflow

**Model-invoked**

- [rust-testing](./skills/workflow/rust-testing/SKILL.md) — Tests that fail when behaviour changes, including port parity.
- [rust-code-review](./skills/workflow/rust-code-review/SKILL.md) — Two-axis review — standards and spec — over a Rust diff.

**User-invoked**

- [setup-rust-skills](./skills/workflow/setup-rust-skills/SKILL.md) — Lint, format, and recorded project posture for a Rust repo.
- [rust-skills-map](./skills/workflow/rust-skills-map/SKILL.md) — Router over the skill set — which skill owns which decision.

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
