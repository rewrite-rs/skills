# Packaging

The metadata and release hygiene around a published crate, apart from the
rustdoc comments in `SKILL.md`. Manifest fragments are fenced `toml`.

## Cargo package metadata

A crate that will be published fills the manifest fields that registries and
search index on, so a stranger can find it and judge it:

```toml
[package]
name = "ledger-sync"
version = "0.4.0"
authors = ["Ada Quill <ada@example.org>"]
description = "Replicates an append-only ledger between two stores."
license = "MIT OR Apache-2.0"
repository = "https://example.org/ledger-sync"
keywords = ["ledger", "replication", "sync"]
categories = ["database"]
```

Two fields are conditional. `documentation` is set only when the docs live
somewhere other than docs.rs; the registry links the hosted page by itself
otherwise, and a redundant key is just another thing to go stale. `homepage`
is set only when it is a different place from `repository`, such as a project
site; pointing both at the same address adds nothing.

## Release notes and annotated tags

Keep release notes, one entry per release, and mark every breaking change in
them so an upgrader can scan for what will break. Tag each release in version
control with an annotated tag, not a lightweight one, so the tag carries its
own author, date, and message:

```bash
git tag -a v0.4.0 -m "ledger-sync 0.4.0"
```

What counts as breaking is `/rust-api-design`.
