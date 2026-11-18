---
type: llm
focus: trace
weight: 1
---

`cargo build` and `cargo test` pass. `cargo clippy` with warnings turned into errors (`-D warnings`) is clean, or the repo own lint configuration is respected. `cargo fmt --check` (the formatting check) passes. The Rust contains no `unwrap` or `expect` on fallible paths outside tests, and no `clone` added only to satisfy the borrow checker. Failures are returned as a typed error.
