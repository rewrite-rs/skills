# 0003: One skill per source language

## Status

Accepted

## Context

Porting guidance for "how to move code from language X into Rust" could be structured
one of two ways: a single `port-from-other-language` skill with a per-language
reference file selected at read time, or a separate thin skill per source language,
each with its own trigger. The single-skill approach keeps the skill count down. The
per-language approach means more `SKILL.md` files but lets each one carry a precise
trigger and a directly typeable name.

## Decision

One skill per source language: `port-from-python`, `port-from-typescript`,
`port-from-go`, `port-from-java`, `port-from-cpp`, `port-from-c`. Each is thin — it
owns its construct-mapping reference file for that language and invokes
`/port-to-rust` in prose for the process guidance (parity contract, phase sequence,
incremental migration, differential testing) that is common to every port regardless
of source language.

Two boundary calls follow from language distance, not from mechanics:

- **C and C++ are separate skills**, despite nearly identical migration mechanics (FFI
  first, a Rust `staticlib` linked into the existing build, leaf modules replaced
  first, `cbindgen` for headers). Idiom mapping is not shared: C++ brings RAII,
  templates, exceptions, STL containers, and smart pointers, none of which C has, and
  C brings manual malloc/free lifetimes, raw pointers, unions, and preprocessor macros
  that don't map the same way C++'s constructs do.
- **TypeScript and JavaScript share one skill** (`port-from-typescript` covers both).
  TypeScript is JavaScript plus types on the same runtime, with the same async model
  and the same `napi-rs`/`wasm-bindgen` boundary — there is no separate migration
  mechanics or idiom mapping to justify a second skill.

## Consequences

The set carries more `SKILL.md` files than the single-skill alternative would. In
exchange, each porting skill has a precise trigger — the model matches on the actual
source language mentioned rather than a generic "porting" description — and a user can
type `/port-from-python` directly rather than invoking a general skill and specifying
the language as an argument. Process guidance is written once, in `port-to-rust`, and
every language skill invokes it rather than restating it, so the per-language cost is
limited to the mapping reference and trigger, not the whole process.
