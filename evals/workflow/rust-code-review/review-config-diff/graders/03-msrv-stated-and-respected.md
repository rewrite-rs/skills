---
type: llm
focus: trace
weight: 1
---

REVIEW.md states the MSRV (minimum supported Rust version) of 1.64, read from the `rust-version` line of Cargo.toml (or the `msrv` line of clippy.toml), and nothing in it recommends `let ... else` (stable in 1.65), `#[expect]`/`reason = "..."` on lint attributes (1.81), or any other feature newer than 1.64 (such as `Option::is_some_and`, stable in 1.70; inline `const` blocks, stable in 1.79; or `LazyLock`, stable in 1.80); if the match-and-return block is mentioned, any suggested rewrite uses something available in 1.64, for example `ok_or` plus `?`, or it is left alone
