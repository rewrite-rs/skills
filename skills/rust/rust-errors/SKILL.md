---
name: rust-errors
description: Design Rust error types and panic policy — Result over unwrap, thiserror for libraries, anyhow for binaries, context that survives the call stack. Use when code calls unwrap or expect outside tests, when designing or refactoring an error enum, when choosing between thiserror and anyhow, or when the user asks how errors should be handled or propagated.
---

# Rust Errors

An error type is a contract about what can go wrong and what the caller does
about it. This skill is about how failure is *represented and propagated* — which
failures panic, which become a `Result`, which shape the enum takes, and how much
context survives the call stack. It does not make the failure impossible in the
first place (that is `/type-driven-design`), and it does not decide whether
changing the shape breaks callers (that is `/rust-api-design`).

## The panic policy

`unwrap` and `expect` are assertions about invariants, not error handling.
Acceptable: in tests, in `main` for a startup precondition whose failure means the
program cannot run, and after a check that the compiler cannot see — where
`expect` carries the reason. Unacceptable: in library code on any input-derived
value, and anywhere the justification is "this can't fail" without saying why.

The phrasing rule: an `expect` message describes the invariant that was violated,
not the operation that failed — `expect("config path is set by the caller")`, not
`expect("failed to get config")`. The second reads like a log line; the first
tells the next debugger exactly which assumption broke.

## `Result` all the way to a boundary

Errors propagate with `?` to the layer that can actually decide — retry, report,
exit. The layers in the middle add context and get out of the way. `?` converts
through `From`, which is why a `#[from]` on an enum variant removes a `map_err`
closure at every call site:

```rust
#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("parse error: {0}")]
    Parse(#[from] toml::de::Error),
}

// No map_err closures — ? converts through the From impls.
fn load(path: &str) -> Result<Config, AppError> {
    let text = std::fs::read_to_string(path)?;
    let config = toml::from_str(&text)?;
    Ok(config)
}
```

## Libraries: `thiserror`. Binaries: `anyhow`.

A library error is part of the public API: callers match on it, so it is an enum
with named variants and a stable shape. A binary error is a message a human reads
once, so a boxed dynamic error with context is enough.

```rust
// Library: the caller can match, so the variants are the API.
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("config file not found at {path}")]
    NotFound { path: PathBuf },
    #[error("invalid TOML in config")]
    Parse(#[from] toml::de::Error),
}

// Binary: the caller is a human reading stderr.
fn main() -> anyhow::Result<()> {
    let config = load_config().context("loading config")?;
    run(config)
}
```

Two caveats. A binary large enough to have internal library crates uses
`thiserror` inside them and `anyhow` only at the top. And `anyhow` in a published
library forces every downstream caller to give up matching on concrete error
types — that is the actual reason for the split, not taste.

## Context is what makes an error actionable

`No such file or directory (os error 2)` names the syscall, not the mistake. Each
layer adds what it uniquely knows — which path, which config key, which request
ID — and adds it once. The two failure modes to reject in review: no context at
all, where the error arrives as a bare OS message, and the same fact restated at
four layers, where the message ends up as `opening config: opening config: failed
to read /etc/app/config.toml`.

## Error taxonomy

Split the enum by what the caller does about it, not by where it was raised. If
two variants always get identical handling, they are one variant. If one variant
is retryable and another is fatal, they must be distinguishable without
string-matching a message — an `is_retryable()` or `kind()` accessor on a coarse
enum is the standard shape. Mark a published enum `#[non_exhaustive]` so adding a
variant later is not a breaking change; the semver rules for what does and does
not break live in `/rust-api-design`.

## Panics that are the right answer

Not every failure is a `Result`. A broken internal invariant in code with no
caller-recoverable path should panic loudly rather than propagate a nonsense
value — the program is already in a state the type system promised it would not
reach. Input validation is the opposite: whatever the input, the caller can
respond, so it is always a `Result`. For invariants too costly to check in
release builds, `debug_assert!` keeps the check in dev and test builds and
documents the assumption for the reader.

## Deferrals

Making the illegal state unrepresentable so the error cannot occur at all is
`/type-driven-design` — the best error handling is a type that makes the error
impossible. Whether changing the error enum is a semver break is
`/rust-api-design`. Cancellation and timeouts as error cases are `/async-rust`.
Expression-level cleanup of error handling — `map_err` closures, `Option`
combinators — is `/idiomatic-rust`.

## Verification

```bash
cargo clippy --all-targets   # add -- -D warnings only if the repo has no lint config
cargo test
```

Run clippy at the lint level configured in the repo — a repo with a `clippy.toml`
or its own lint attributes keeps them, and a stricter level never goes on top.
Then the targeted audit the agent runs itself and reads, rather than acting on
blindly:

```bash
rg '\.unwrap\(\)|\.expect\(' --glob '!**/tests/**' --glob '!**/benches/**' src/
```

Every surviving hit needs a one-line justification. `clippy::unwrap_used` and
`clippy::expect_used` are `restriction`-group lints: propose them for the repo
lint config, do not switch them on unilaterally, and never override a level
already configured.
