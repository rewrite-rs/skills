# Cargo features and `no_std`

The depth for the features a crate exposes and for making a library usable without
the standard library. Verification of feature combinations belongs to the CI skill
(`/setup-rust-ci`); this file says what the features must promise.

## Features are additive, and only additive

Cargo unifies features across the whole dependency graph, so a crate's features
get turned on by whoever asks, in any combination, and the result must compile and
behave. Three consequences:

- **Any combination compiles.** A pair of features that cannot coexist is a bug,
  not a documented limitation, because some dependent you have never seen will
  enable both.
- **Enabling a feature only adds.** It brings in new items or implementations
  and leaves every existing public item as it was. Adding variants to a `#[non_exhaustive]` enum under a feature
  is the one tolerated form of change.
- **No feature gates a public struct field or a trait method.** A gated field
  changes the layout and literal syntax callers rely on; a gated trait method
  changes what an implementer must write. Both turn a feature flag into a
  semver-breaking switch. Gate a whole type, a whole impl, or a whole module
  instead.

Features share a namespace with optional dependencies (and crate names), so
choose feature names that cannot collide with a dependency you might add later,
and avoid a feature named after a crate unless it is exactly the optional
dependency of that name.

Each independent feature roughly doubles the configurations to test. Keep the set
small, and have CI exercise the combinations that matter, not only the default
and all-on.

Gating third-party types in your signatures behind a feature (the `serde`
integration is the classic case) is acceptable because callers who do not enable
it never see the foreign type. Without a feature gate, a foreign type needs a
substantial benefit to justify the dependency entering your contract; see
`SURFACE.md`.

The default feature set is part of the API: what compiles for a dependent with
default features is a promise. The licence is part of the API too, since
changing it can make the crate unusable for a dependent whose policy forbids the
new one; treat a licence change like a breaking release and say so.

## `no_std` libraries

Three layers, each adding to the one below:

| Layer | Brings |
|---|---|
| `core` | `Option`, `Result`, iterators, slices, `fmt`, atomics, the traits |
| `alloc` | Heap types: `Box`, `Rc`, `Arc`, `Vec`, `String`, `BTreeMap` and friends |
| `std` | Everything needing an operating system: `HashMap` (random seed), `Mutex`, files, threads, time, networking |

Making a library `no_std` is frequently small: replace `std::` paths with `core::`
or `alloc::` ones, and swap `HashMap` for `BTreeMap` (or a `no_std`-friendly
alternative) when the hash seed is not needed.

```rust,ignore
#![no_std]

#[cfg(feature = "alloc")]
extern crate alloc;

use core::fmt;
```

The usual layout is a `no_std` base with additive `alloc` and `std` features (the
`std` feature enabling `alloc`), so embedded users get the core and everyone else
gets the conveniences. Features stay additive here too: `std` adds items, it never
changes behaviour of existing ones. A dependency must also support `no_std`, with
its default features turned off, or the whole chain gives it up. Never expose a
feature named `no_std`: opting out of something is not additive, and unification
would let one dependent switch it on for everybody. The positive `std` feature
(on by default) is the form that composes.

Guard the property in CI by cross-compiling to a target with no operating system
(a bare-metal triple), since a stray `std::` that happens to compile on the host
will not on the target:

```bash
rustup target add thumbv7em-none-eabi
cargo check --target thumbv7em-none-eabi --no-default-features
```

Where memory is limited, prefer fallible allocation (`try_reserve` on `Vec` and
`String`) over APIs that abort on allocation failure, and return the error to the
caller.
