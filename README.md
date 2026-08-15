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

**User-invoked**

None yet in this bucket.

### Porting

None yet in this bucket.

### Workflow

None yet in this bucket.

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

### Ports that drift from parity

A port that compiles is not a port that matches the behaviour of its source. Without a
crisply stated parity contract — what "done" means for this port — and discipline
about never narrowing it silently, a port drifts: edge cases the original handled
quietly stop being handled, and nobody notices until production.

## Contributing / repo layout

See `CLAUDE.md` for the rules that govern authoring, editing, and reviewing a skill
in this repo, and `CONTEXT.md` for the vocabulary this repo uses.
