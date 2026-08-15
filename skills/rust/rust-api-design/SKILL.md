---
name: rust-api-design
description: Design a Rust public API — trait design, generics versus dyn, sealed traits, what is exported, and which changes break semver. Use when designing or reviewing a crate public surface, when choosing between a generic parameter and a trait object, when adding a trait method or enum variant to a released crate, or when the user asks whether a change is a breaking change.
---

# Rust API Design

Everything `pub` from the crate root is a promise to every downstream caller.
This skill governs *what callers can see and rely on* — the exported surface,
the shape of the traits and generics it uses, and which changes break the
promise. Everything it says about internals is incidental: the internal tree can
be reorganized without a major version, and this skill exists to keep it that
way. Whether an argument type should carry an invariant is
`/type-driven-design`; the shape of the error type is `/rust-errors`.

## The surface is the contract

Default to private and export deliberately. A type that is `pub` only because a
`pub fn` returns it is still part of the API — including its trait impls and its
public fields. Make `pub(crate)` the habit: it says "visible inside this crate"
without saying "promised forever." Re-export the surface from `lib.rs` and keep
the module paths private, so the internal tree can move without a major version:

```rust
// lib.rs
pub use crate::internal::parser::Parser; // the surface
mod internal;                            // the tree stays private
```

`Parser` is reachable by one path only. Renaming the module, moving the file,
splitting the crate — none of it is a breaking change, because none of it is
visible.

## Generics or `dyn`

The decision, not a survey:

| Want | Choose | Cost |
|---|---|---|
| Monomorphized speed, inlining, no vtable | `impl Trait` / `<T: Trait>` | Code bloat; every call site instantiates |
| Heterogeneous collection, plugin registry, smaller binary | `dyn Trait` | Vtable dispatch; the trait must be object-safe |
| Argument position, caller convenience | `impl Trait` argument | The caller cannot turbofish |
| Return position in a public API | named type or `impl Trait` | `impl Trait` hides the type — a deliberate choice, not a shortcut |

Object safety usually settles it: a trait with generic methods, methods
returning `Self` by value, or associated constants used through the object
cannot be `dyn`, so the generic is the only option. A registry of
heterogeneous implementations cannot be generic without an enum or a trait
object, so the object is the only option.

## Trait design

A trait is shared behaviour callers write generic code against — not a
namespace for grouping functions that happen to be related. Keep the set of
required methods small and provide defaults for the rest; every required method
is a promise to every future implementer. Use an associated type when there is
exactly one sensible choice per implementer (`Iterator::Item`), and a generic
parameter when there are several (`From<T>`). Watch blanket impls:
`impl<T: Foo> Bar for T` closes the door on any later `impl Bar for SomeType`
where `SomeType` does not satisfy `Foo` — a coherence trap that fires when the
second impl is written, not when the blanket is.

## Sealed traits

The single purpose of a sealed trait: let the crate add methods to a trait
without breaking downstream implementers. The pattern is small, and readers
reproduce it wrong from memory, so here it is:

```rust
mod sealed {
    pub trait Sealed {}
    impl Sealed for Widget {}
}

pub trait WidgetBuilder: sealed::Sealed {
    fn new() -> Self;
}

impl WidgetBuilder for Widget {
    fn new() -> Self {
        Widget
    }
}
```

The supertrait lives in a private module, so only this crate can implement it.
Downstream code can still name the trait as a bound — it just cannot implement
it — which means adding a method to `WidgetBuilder` later breaks no one,
because no one outside the crate can be an implementer.

## Ergonomics that cost nothing

Take `impl AsRef<str>` or `impl Into<String>` where callers plausibly hold
either form. Return `impl Iterator<Item = T>` rather than `Vec<T>` when the
caller may not want the allocation. Derive the common traits on public types —
`Debug` always, `Clone` and `PartialEq` where they make sense — while adding
them is still cheap: a missing derive can become a breaking change to add later
when it creates inference ambiguity or conflicts with a downstream impl, and
which side of that line a given derive falls on is in `SEMVER.md`.

## What breaks and what does not

The headline cases: adding a variant to a public enum breaks exhaustive
matches (unless the enum is `#[non_exhaustive]`); adding a required trait method
breaks implementers, a default body does not; adding a field to a public struct
that is not `#[non_exhaustive]` breaks literal construction; narrowing an
argument type breaks callers; widening a return type breaks callers who
programmed against the old one. The full table — including the non-obvious
ones, like adding a trait impl or raising the MSRV — is in `SEMVER.md`.

## Deferrals

The shape of the error type this API returns is `/rust-errors`. Whether an
argument type should be a newtype carrying an invariant is
`/type-driven-design`. Whether a public function should be `async`, and what
that commits the crate to, is `/async-rust`. Whether a `pub unsafe fn` is
justified and how its contract is documented is `/unsafe-rust`.

## Verification

```bash
cargo doc --no-deps          # every public item documented and the links resolve
cargo clippy --all-targets   # add -- -D warnings only if the repo has no lint config
cargo test
```

Run clippy at the lint level configured in the repo — never force `missing_docs`
or another lint on to make the surface check pass. Propose the lint; do not
override a level the repo set. When the crate is published or has downstream
consumers, the semver check the agent runs and reads:

```bash
cargo semver-checks check-release   # requires cargo-semver-checks; skip with a note if unavailable
```

Do not install tooling into the user environment as a side effect. If
`cargo-semver-checks` is not present, say so in the report and fall back to the
table in `SEMVER.md` applied by hand.
