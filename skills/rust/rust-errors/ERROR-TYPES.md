# Error types

The depth for `SKILL.md`: the public struct error in full, the closed enum and
its variant shapes, context and message style, the `anyhow` side, the boundary
between the two, and what `thiserror` eliminates from hand-rolled code.

## The public struct error, in full

The published-library answer to the boundary question, compiling with
`thiserror` as the only dependency:

```rust
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
#[error("{kind}")]
pub struct ConfigError {
    #[source]
    kind: ErrorKind,
}

#[derive(Debug, thiserror::Error)]
enum ErrorKind {
    #[error("cannot read {path}")]
    Read {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("malformed config in {path}")]
    Parse {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
}

impl ConfigError {
    pub fn is_not_found(&self) -> bool {
        matches!(&self.kind, ErrorKind::Read { source, .. } if source.kind() == io::ErrorKind::NotFound)
    }

    pub fn path(&self) -> &Path {
        match &self.kind {
            ErrorKind::Read { path, .. } | ErrorKind::Parse { path, .. } => path,
        }
    }
}
```

The kind is private because the privacy is the whole mechanism: with a private
kind, new variants and dependency swaps are internal changes, not breaking
ones.

Choose the predicates from the questions callers would otherwise answer by
matching — one per question. If no caller can name a question, the error needs
no predicates and probably no struct.

A caller then writes `if err.is_not_found() { /* create the default */ }`
instead of matching a variant and inspecting an `io::ErrorKind` the crate
already knew about.

## What every public error type owes

An error type in a public `Result<T, E>` is a contract with more than its shape:

- It implements `std::error::Error`, so `?`, `Box<dyn Error>`, and `anyhow` all
  accept it. `thiserror` does this for free.
- It is `Send + Sync`, so it crosses threads and sits in a boxed error without
  complaint. A field such as an `Rc` or a raw pointer breaks that quietly.
- It is never `()`: a unit error says something failed and nothing else, cannot
  implement `Error`, and cannot grow a fact later without breaking callers.
- It does not implement the deprecated `description()` method; `Display` is the
  message, `source()` is the cause.
- A bare `String` or `&str` cannot be the error type either, because the orphan
  rule stops the standard library string types from implementing `Error`. Wrap the
  message in a one-field struct:

```rust
#[derive(Debug, thiserror::Error)]
#[error("{0}")]
pub struct Message(String);
```

- A small error that holds only plain data, such as a field-less kind or an
  offset, should also derive `Copy`: callers pass it around without cloning.
  Leave `Copy` off the moment it holds an owned allocation or a source error.

When the error is boxed for a binary, the bound is
`Box<dyn std::error::Error + Send + Sync + 'static>`; the `'static` is what lets
a caller later call `downcast_ref` on it.

## Backtrace in the struct error

A situation-specific struct can carry a `std::backtrace::Backtrace`, captured
once when the error is built, in the constructor or in the `From` impl that wraps
the upstream error. Capturing at construction records where the failure started,
which is the frame nobody can recover after the error has travelled up the
stack. `Backtrace::capture()` is nearly free unless backtraces are enabled in the
environment, so the cost is paid only when someone asked for it:

```rust
use std::backtrace::Backtrace;
use std::fmt;

#[derive(Debug)]
pub struct QuotaError {
    limit: u64,
    backtrace: Backtrace,
}

impl QuotaError {
    pub(crate) fn exceeded(limit: u64) -> Self {
        QuotaError { limit, backtrace: Backtrace::capture() }
    }

    pub fn limit(&self) -> u64 {
        self.limit
    }

    pub fn backtrace(&self) -> &Backtrace {
        &self.backtrace
    }
}

impl fmt::Display for QuotaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "quota of {} bytes exceeded", self.limit)
    }
}

impl std::error::Error for QuotaError {}
```

`Display` still prints only the message. Who prints the backtrace is the
reporting layer, covered under "Display and the source chain" below.

## One error for similar operations

An import error does not need a twin for every importer. When several functions fail
in the same way, from the caller point of view, they return the same struct:
`import_csv` and `import_ods` both return `ImportError`, and the private kind or
the message tells which format. A new type per function multiplies what callers
must import, convert, and match, and buys nothing if their handling is the same.
Split a type only when callers would act differently on the two.

## Returning the consumed input

A fallible function that takes its argument by value should hand the argument
back inside the error. The caller can then retry, repair, or reuse it, instead of
having cloned it up front just in case:

```rust
#[derive(Debug, thiserror::Error)]
#[error("batch rejected: {reason}")]
pub struct Rejected {
    reason: &'static str,
    items: Vec<String>,
}

impl Rejected {
    pub fn into_items(self) -> Vec<String> {
        self.items
    }
}

pub fn submit(items: Vec<String>) -> Result<usize, Rejected> {
    if items.is_empty() {
        return Err(Rejected { reason: "no items", items });
    }
    Ok(items.len())
}
```

The standard library does this in the error of `String::from_utf8`, which gives
the original bytes back. Skip it when the argument is `Copy` or cheap to rebuild.

## The enum, for the closed case

For the closed set of failures — an internal crate, an error the caller only
ever prints — the enum is the cheaper, better answer. Every variant shape, with
when it is the right one:

```rust,ignore
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    /// The upstream error is the whole story: #[from] generates the From impl,
    /// so ? converts it at the call site.
    #[error("upstream request failed: {0}")]
    Http(#[from] reqwest::Error),

    /// This layer knows facts the source does not carry. #[source] names the
    /// underlying error so error chains reach it.
    #[error("rate limited until {retry_after}")]
    RateLimited {
        retry_after: DateTime<Utc>,
        #[source]
        source: reqwest::Error,
    },

    /// Pure pass-through: there is no context of this layer to add, so the
    /// inner error prints as itself.
    #[error(transparent)]
    Io(#[from] std::io::Error),
}
```

A tuple variant is right when the inner type is the whole story. A struct
variant is right when the error needs its own facts alongside the source —
`retry_after` is known only to this layer, so it lives here. `transparent` is
right only while no context of your own exists; the day one appears, the variant
was never a pass-through and the `#[error(...)]` message gets the layer fact.

`?` converts through `From`, which is why a `#[from]` on an enum variant removes
a `map_err` closure at every call site. `Config` below is a `serde` type so the
example is self-contained:

```rust
#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("parse error: {0}")]
    Parse(#[from] toml::de::Error),
}

#[derive(serde::Deserialize)]
struct Config {
    name: String,
}

// No map_err closures — ? converts through the From impls.
fn load(path: &str) -> Result<Config, AppError> {
    let text = std::fs::read_to_string(path)?;
    let config = toml::from_str(&text)?;
    Ok(config)
}
```

## Context and message style

Each layer adds what it uniquely knows — which path, which config key, which
request ID — and adds it once. The two failure modes to reject in review: no
context at all, where the error arrives as a bare OS message —
`No such file or directory (os error 2)` names the syscall, not the mistake —
and the same fact restated at four layers, where the message ends up as
`opening config: opening config: failed to read /etc/app/config.toml`.

`map_err` has two honest uses: converting an error from a type that has no `From`
into yours, and attaching a fact only the call site knows. When it merely wraps
the same variant everywhere, write the `From` impl once instead and let `?` do the
work.

Error message style: short and lowercase, one clause where possible, no trailing
period, no `error:` prefix. The message is composed into a sentence someone else
wrote, and `Display` output that starts with a capital, ends in a period, or runs to a
paragraph reads as broken when it is. Detail belongs in the source chain, not in
a long message.

## Panic and expect messages

An `expect` message describes the invariant that was violated, not the
operation that failed — `expect("config path is set by the caller")`, not
`expect("failed to get config")`. The second reads like a log line; the first
tells the next debugger exactly which assumption broke. An `assert!` takes
a message too, and the message should say what the caller did wrong or which
promise broke — "call connect() before running queries" tells a human whether
they misused the API or hit a bug, which the bare condition cannot. Never echo
the condition itself as the message: `assert!(n > 0, "n > 0")` adds nothing the
panic location does not already print. A panic message carries
the actual values: `assert_eq!(len, cap)` over `assert!(len == cap)`, and an
`expect` that names the invariant and the value that broke it.

## The `anyhow` side

`.context("...")` is the common form. Use the closure form,
`.with_context(|| ...)`, when building the message allocates — a format string
with a path in it — because the closure defers the allocation to the failure
path:

```rust,ignore
let data = std::fs::read_to_string(path)
    .with_context(|| format!("reading config file {}", path.display()))?;
```

`anyhow!` builds an ad-hoc error with no source, for the failure that is its own
explanation: `anyhow!("no worker claimed job {id} within the deadline")`. And for
the rare case where a binary must inspect a concrete error type, `downcast_ref`
reaches back through the box:

```rust,ignore
fn report(err: &anyhow::Error) -> ExitCode {
    if err.downcast_ref::<ConfigError>()
        .is_some_and(|e| e.is_not_found())
    {
        eprintln!("hint: run `app init` to create the config file");
    }
    ExitCode::FAILURE
}
```

`downcast_ref` is the escape hatch that keeps `anyhow` honest at the top of a
binary: match what you can name, print the rest as a chain.

## Converting at the boundary

A `thiserror` type flows into `anyhow` for free — it implements
`std::error::Error + Send + Sync + 'static`, which is all `anyhow` asks for:

```rust,ignore
fn main() -> anyhow::Result<()> {
    let config = config::load()?; // ConfigError becomes anyhow::Error silently
    run(config)
}
```

The reverse throws the API away: an `anyhow::Error` inside a library enum is an
opaque box. Callers can print it but cannot match it, so the library has handed
back exactly the "no such file or directory" problem it exists to fix. A
published library never puts `anyhow::Error` in a public type.

## Hand-rolled, before and after

Before:

```rust
use std::fmt;
use std::net::AddrParseError;

#[derive(Debug)]
pub struct BindError {
    inner: AddrParseError,
}

impl fmt::Display for BindError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "invalid bind address: {}", self.inner)
    }
}

impl std::error::Error for BindError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Some(&self.inner)
    }
}

impl From<AddrParseError> for BindError {
    fn from(inner: AddrParseError) -> Self {
        BindError { inner }
    }
}
```

After:

```rust
#[derive(Debug, thiserror::Error)]
#[error("invalid bind address: {0}")]
pub struct BindError(#[from] std::net::AddrParseError);
```

What the derive eliminated: the `Display` impl, the `Error` impl (with the
`source()` plumbing), and the `From` impl — the three blocks that exist only so
that `?` and `{}` keep working, and that silently drift the day the inner type
changes.

## `Display` and the source chain

Each `Display` impl prints only its own layer; the full picture comes from
walking `source()`. The `{:#}` formatter does that walk for any
`std::error::Error`, and an `anyhow::Error` printed plainly already shows its
context chain. That is why `RateLimited` above carries its own message and
delegates the upstream detail to `#[source]`: the combined print gives
"rate limited until 2026-08-15T12:00:00Z" followed by the HTTP error — not the
HTTP error repeated twice.

The exception is the place that ends the chain: the top-level report at the
application boundary. A binary `main`, a request handler, or a log sink prints the
summary, the backtrace when one was captured, and every cause down the `source()`
chain, once. That is a reporter job, done by one function that walks the chain
(or by `anyhow` formatting), not something each error does inside its own
`Display` — otherwise every layer repeats the layers below it and the output
doubles up with each wrap.

## `Box<dyn Error>` — the third option

For an internal binary that never matches on error types, wants one boxed error
type at the top, and has no `anyhow` in the dependency budget,
`Box<dyn std::error::Error + Send + Sync>` is genuinely enough. It is the same
dynamic-dispatch idea as `anyhow` minus the context API: there is no
`.context()`, no formatted source chain, and no way to attach a fact at the
failure point other than building a small wrapper type by hand. The moment a
caller needs to say *which* thing failed, the box is not enough — that is when
`thiserror` or `anyhow` earns its place.
