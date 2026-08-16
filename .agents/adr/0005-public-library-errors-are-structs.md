# 0005: Public library errors are structs with a private kind

## Status

Accepted

## Context

`rust-errors` teaches one library error shape: a public enum with one variant per
failure mode, built with `thiserror`. It is the shape most Rust tutorials teach, and
for a closed set of failures inside one crate it is the right one.

It is the wrong shape for an error that crosses a public API boundary the crate
maintains across releases. Four defects, each independent:

- It leaks dependencies into the public API. A variant `Parse(toml::de::Error)`
  permanently promises which TOML crate the crate uses. Swapping the dependency is a
  breaking change to a crate that never mentioned TOML in its own contract.
- Adding a failure mode is breaking, because callers exhaustive matches stop compiling.
- `#[non_exhaustive]` does not save it. It makes growth non-breaking by forcing every
  caller into a `_ =>` arm from the first release, which removes the exhaustive
  matching that was the reason to expose an enum at all.
- It pushes work onto callers. A caller wanting "the config file is missing" has to
  re-derive it from `ConfigError::Io(e) if e.kind() == ErrorKind::NotFound` — the
  crate knew the answer and declined to say it.

The precedent is not novel. `std::io::Error` is exactly this pattern; so are
`reqwest::Error` with `is_timeout`, `is_connect` and `is_status`, and
`serde_json::Error` with `classify`, `line` and `column`.

## Decision

A public library error is a struct wrapping a private kind, exposing semantic
predicates and accessors. A closed error set, or an error that never crosses a semver
boundary, stays an enum. Binaries use `anyhow`.

`thiserror` still does the mechanical work — `#[source]` chaining and `Display`
forwarding — so "libraries use `thiserror`, binaries use `anyhow`" survives unchanged.
Only the shape behind it changes.

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

The teaching order is fixed as part of this decision: the section leads with the
decision test — *does this error cross a public API boundary you will maintain?* — and
shows both shapes after it, enum first for the closed case. Not the struct pattern
first. An agent stops reading once it has an answer, and one writing an internal crate
must reach the enum in one step. The struct is more code than the enum, and a skill
that front-loads boilerplate gets skipped under time pressure.

## Consequences

`rust-errors/SKILL.md` and `rust-errors/ERROR-TYPES.md` are rewritten in wave 2, and
the `rust-code-review` smell baseline gains "a public enum error variant carrying a
dependency type" as a finding. Guidance published before that rewrite taught the enum
for the public case; the rewrite supersedes it rather than adding an alternative,
because a skill offering two defaults has no default.

The cost is real and accepted: the struct is more code, and it hides the kind from
callers who might have matched on it. That is the trade — the crate commits to
answering the questions callers actually ask, through predicates it can keep
answering after the internals change.
