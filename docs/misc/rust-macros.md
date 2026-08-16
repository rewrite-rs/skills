## What it does

Judges whether a piece of repeated code should be a macro at all, and if so,
how to write it — by-example before procedural, hygienic names, a `_private`
helper module, and compile errors that carry spans. The defining constraint:
the first answer is usually "not a macro," and a macro that cannot name why a
function, a trait, or a generic cannot do the job is not ready.

## When to reach for it

Model-invoked: the agent pulls this in on its own when writing or reviewing
`macro_rules!` or a proc macro, when a derive or attribute macro is being
added, when macro hygiene or `$crate` comes up, or when the user asks whether
something should be a macro. It does not decide whether the generated API
should exist at all — that is `/rust-api-design` — and it does not cover
serde attribute behaviour — that is `/rust-serde`.

## Before writing a macro

Three cases are the genuine answers: a variadic interface, generating an impl
per type from a list, and embedding a DSL whose syntax is not Rust. Outside
them, a function, a trait with a blanket impl, or a generic is the tool, and
the cost a macro charges — no jump-to-definition, errors pointing at
expansions, no type checking until the expansion happens — is paid by every
reader afterwards.

`macro_rules!` comes before the proc macro: it is in the same crate, needs no
dependency, and can be read. The proc macro earns its own crate and a
`syn`/`quote` dependency pair only when the input has to be parsed as Rust
syntax — what derives and attribute macros are. Whatever the expansion
references in the crate that defines it goes through `$crate`, and the
helpers live in a `#[doc(hidden)] pub mod _private` so they stay reachable
from the expansion without becoming public surface.

## Errors users can act on

A proc macro that panics reports "proc macro panicked" with no location, and
a location-less failure is not one a user can act on. The error is a
`syn::Error` built with `new_spanned` over the offending tokens and turned
into a compile error with `to_compile_error`, so the compiler points at the
code the user wrote — the difference between a macro people use and one they
work around.

The failure cases are the ones worth testing. A `trybuild` (or equivalent)
compile-failure suite records each spanned error, and a macro crate without
one has never checked the thing users complain about, which is the error
message.

## Common questions

**When is a proc macro worth its crate?** When the input has to be parsed as
Rust syntax — derives and attribute macros. `macro_rules!` matches patterns
against tokens but cannot read an input as syntax, and the proc macro cost —
a separate crate, a `syn`/`quote` dependency pair, compilation before the
crate that uses it — is paid only for that ability.

**Why does my macro break when called from another module?** The expansion
lands at the call site, where a name the macro mentions may mean something
else: a module that shadows the path, a different import of the same name.
`$crate` resolves to the crate that defines the macro no matter where the
expansion lands, so every item the macro pulls from that crate must be named
through it.

**How do I test a macro failure?** With a compile-failure test: `trybuild`
(or an equivalent) runs a case that invokes the macro wrongly and compares
the compiler output against a recorded `.stderr` file. `cargo test` runs the
suite, and the recorded message is what gets reviewed — the failure output
is the surface the user reads.

## It's working if

- Every macro in the crate has a stated reason a function, a trait, or a
  generic could not do it.
- No expansion references an item from the defining crate without `$crate`.
- The helpers the expansion needs sit in a `_private` module marked
  `#[doc(hidden)]`, not in the public surface.
- Failure cases produce spanned errors, and there is a test that reads them.

## Where it fits

`rust-macros` is the occasional craft skill in the `misc` bucket — the one
that answers "should this be a macro?" before anyone types `macro_rules!`.
It defers whether the generated API should exist to `/rust-api-design`, the
shape of a generated error type to `/rust-errors`, the derives that already
exist to `/idiomatic-rust`, and serde attribute behaviour to `/rust-serde`.
See `rust-skills-map` for how the full set of Rust skills relates.
