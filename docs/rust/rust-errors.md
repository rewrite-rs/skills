## What it does

Decides how failure is represented and propagated — the panic policy for
`unwrap`/`expect`, the `Result` path from the point of failure to the boundary
that can actually decide, and the error type itself: `thiserror` enums for
libraries, `anyhow` for binaries, context added once per layer. It does not make
the failure impossible in the first place (that is `/type-driven-design`), and it
does not decide whether changing the error type breaks callers (that is
`/rust-api-design`).

## When to reach for it

Model-invoked: the agent pulls this in on its own when code calls `unwrap` or
`expect` outside tests, when designing or refactoring an error enum, when
choosing between `thiserror` and `anyhow`, or when asked how errors should be
handled or propagated. It does not cover making the illegal state
unrepresentable so the error cannot occur (`/type-driven-design`), semver
consequences of changing a published error type (`/rust-api-design`), or
cancellation and timeouts as error cases (`/async-rust`).

## Panic policy

`unwrap` and `expect` are assertions about invariants, not error handling. They
stand in tests, in `main` for a startup precondition, and after a check the
compiler cannot see — and the `expect` message names the invariant violated, not
the operation that failed. Input validation is always a `Result`; a broken
internal invariant with no caller-recoverable path is the one failure that
should panic loudly.

## thiserror, anyhow, and the boundary between them

A library error is an API callers match on, so it is an enum with named, stable
variants. A binary error is a message a human reads once, so a boxed dynamic
error with context is enough. A `thiserror` enum flows into `anyhow` for free at
the boundary; the reverse throws the API away. The complete variant shapes
(`#[from]`, `#[source]`, `#[error(transparent)]`), the `anyhow` side
(`.context` vs `.with_context`, `downcast_ref`), and what the derive eliminates
from hand-rolled `Display`/`Error`/`From` impls live in `ERROR-TYPES.md`.

## Common questions

**Is `unwrap` in tests fine?** Yes — in tests, and `expect` with a message is
better when a test has several of them, so the failing one is named in the panic.

**Can I use `anyhow` in a library?** Only if callers will never match on concrete
error types — usually meaning no. `anyhow` in a published library forces every
downstream caller to give up matching; that is the actual reason for the
`thiserror`/`anyhow` split.

**One error enum per crate or per module?** Per boundary the caller sees: usually
per module inside the internal library crates of a large binary, per crate for
published ones.

## It's working if

- No `unwrap` or `expect` remains outside tests and documented startup
  preconditions, and every surviving one has a one-line justification.
- Every `expect` message states the invariant violated, not the operation.
- Library crates expose `thiserror` enums; the binary surfaces `anyhow` with
  context only at the top.
- No error reaches a user as a bare OS message, and no fact is restated at more
  than one layer.
- Published enums are `#[non_exhaustive]` where variants will be added.
- `cargo test` passes at the lint level configured in the repo.

## Where it fits

`rust-errors` is the failure-representation skill in the language-craft group. It
hands off to `/type-driven-design` when the real fix is a type that makes the
error impossible, to `/rust-api-design` for what a change to a published error
type costs downstream, to `/async-rust` for timeouts and cancellation as error
cases, and to `/idiomatic-rust` for expression-level cleanup of the handling code.
See `rust-skills-map` for how the full set of Rust skills relates.
