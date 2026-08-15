# Error types

The depth for `SKILL.md`: complete enum shapes, the `anyhow` side, the boundary
between the two, and what `thiserror` eliminates from hand-rolled code.

## A full `thiserror` enum

Every variant shape, with when it is the right one:

```rust
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

## The `anyhow` side

`.context("...")` is the common form. Use the closure form,
`.with_context(|| ...)`, when building the message allocates — a format string
with a path in it — because the closure defers the allocation to the failure
path:

```rust
let data = std::fs::read_to_string(path)
    .with_context(|| format!("reading config file {}", path.display()))?;
```

`anyhow!` builds an ad-hoc error with no source, for the failure that is its own
explanation: `anyhow!("no worker claimed job {id} within the deadline")`. And for
the rare case where a binary must inspect a concrete error type, `downcast_ref`
reaches back through the box:

```rust
fn report(err: &anyhow::Error) -> ExitCode {
    if err.downcast_ref::<ConfigError>()
        .is_some_and(|e| matches!(e, ConfigError::NotFound { .. }))
    {
        eprintln!("hint: run `app init` to create the config file");
    }
    ExitCode::FAILURE
}
```

`downcast_ref` is the escape hatch that keeps `anyhow` honest at the top of a
binary: match what you can name, print the rest as a chain.

## Converting at the boundary

A `thiserror` enum flows into `anyhow` for free — it implements
`std::error::Error + Send + Sync + 'static`, which is all `anyhow` asks for:

```rust
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
#[derive(Debug)]
pub struct ParseError {
    inner: toml::de::Error,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "parse error: {}", self.inner)
    }
}

impl std::error::Error for ParseError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Some(&self.inner)
    }
}

impl From<toml::de::Error> for ParseError {
    fn from(inner: toml::de::Error) -> Self {
        ParseError { inner }
    }
}
```

After:

```rust
#[derive(Debug, thiserror::Error)]
pub struct ParseError(#[error("parse error: {0}")] #[from] toml::de::Error);
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

## `Box<dyn Error>` — the third option

For an internal binary that never matches on error types, wants one boxed error
type at the top, and has no `anyhow` in the dependency budget,
`Box<dyn std::error::Error + Send + Sync>` is genuinely enough. It is the same
dynamic-dispatch idea as `anyhow` minus the context API: there is no
`.context()`, no formatted source chain, and no way to attach a fact at the
failure point other than building a small wrapper type by hand. The moment a
caller needs to say *which* thing failed, the box is not enough — that is when
`thiserror` or `anyhow` earns its place.
