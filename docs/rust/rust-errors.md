## What it does

Decides how failure is represented and propagated — the panic policy for
`unwrap`/`expect`, the `Result` path from the point of failure to the boundary
that can actually decide, and the error type itself. The shape of the error
type is settled by the boundary question: does the error cross a public API
boundary you will maintain across releases? No — a closed set of failures — and
it is a `thiserror` enum. Yes — a published library — and it is a struct
wrapping a private kind, exposing the questions callers actually ask. Binaries
use `anyhow`, with context added once per layer. It does not make the failure
impossible in the first place (that is `/type-driven-design`), and it does not
decide whether changing the error type breaks callers (that is
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
compiler cannot see — and the `expect` message names the invariant violated,
not the operation that failed, and carries the actual values. Not every failure
is a `Result`: input validation is always a `Result`, and a broken internal
invariant with no caller-recoverable path is the one failure that should stop
the program.

## Which shape: the boundary decides

One question settles it: does the error cross a public API boundary you will
maintain across releases?

- No — an internal crate, a closed set of failures, an error the caller only
  ever prints: a `thiserror` enum. The enum is the cheaper, better answer, and
  callers can match it exhaustively.
- Yes — a published library whose callers upgrade without editing their code:
  a struct wrapping a private kind, exposing the questions callers actually ask
  as predicates (`is_not_found()`, `path()`), the shape of `std::io::Error`.
  The public enum fails at that boundary: a variant carrying a dependency type
  promises that dependency for ever, adding a variant breaks caller matches,
  and `#[non_exhaustive]` removes the exhaustive matching that was the reason
  to expose the enum.

Binaries use `anyhow`: a binary error is a message a human reads once, so a
boxed dynamic error with context is enough, and `anyhow` in a published library
forces every downstream caller to give up matching on concrete types — the
actual reason for the split. `thiserror` does the mechanical work either way.
The full compiling struct pattern, the closed enum shapes (`#[from]`,
`#[source]`, `#[error(transparent)]`), context and message style, the `anyhow`
side (`.context` vs `.with_context`, `downcast_ref`), and what the derive
eliminates from hand-rolled `Display`/`Error`/`From` impls live in
`ERROR-TYPES.md`.

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

**My library already ships a public enum error — is this a breaking change to
fix?** Yes. The honest answer is to make the change at the next major, with the
predicates callers are already deriving by hand added now as non-breaking
additions.

## It's working if

- No `unwrap` or `expect` remains outside tests and documented startup
  preconditions, and every surviving one has a one-line justification.
- Every `expect` message states the invariant violated, not the operation, and
  carries the actual values.
- No public error variant carries a type from a dependency, and every public
  error answers the questions callers ask through predicates rather than
  through a variant match.
- Library crates expose `thiserror` errors shaped by the boundary — an enum for
  the closed case, a struct with a private kind for the published case — and
  the binary surfaces `anyhow` with context only at the top.
- No error reaches a user as a bare OS message, and no fact is restated at more
  than one layer.
- `cargo test` passes at the lint level configured in the repo.

## Where it fits

`rust-errors` is the failure-representation skill in the language-craft group. It
hands off to `/type-driven-design` when the real fix is a type that makes the
error impossible, to `/rust-api-design` for what a change to a published error
type costs downstream, to `/async-rust` for timeouts and cancellation as error
cases, and to `/idiomatic-rust` for expression-level cleanup of the handling code.
See `rust-skills-map` for how the full set of Rust skills relates.
