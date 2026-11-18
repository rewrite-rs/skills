---
type: llm
focus: trace
weight: 1
---

The trace never runs `cargo fmt` (the Rust formatter, which rewrites files) without `--check` (or an equivalent that rewrites files) in the crate under review, and src/lib.rs and Cargo.toml are unchanged from their original contents; a scratch copy used to run tools sits outside the working tree, and REVIEW.md contains no complete rewrite of src/lib.rs
