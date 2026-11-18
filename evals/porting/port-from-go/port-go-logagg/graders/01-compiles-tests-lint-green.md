---
type: llm
focus: trace
weight: 1
---

In the crate root, `cargo build` succeeds, `cargo test` passes with no failures, and `cargo clippy --all-targets -- -D warnings` (clippy is the Rust linter; `-D warnings` turns every warning into an error) prints no warnings. The crate has no lint configuration of its own, so `-D warnings` is the right level.
