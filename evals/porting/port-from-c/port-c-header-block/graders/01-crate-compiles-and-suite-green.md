---
type: llm
focus: trace
weight: 1
---

Run in the crate root (the folder holding Cargo.toml and src/lib.rs): `cargo build` succeeds, and `cargo test` exits successfully with at least 9 tests run and all of them passing. The number 9 is the count of test functions in test_hdrblock.c, so each C test needs a Rust counterpart.
