---
type: llm
focus: trace
weight: 1
---

REVIEW.md is in the long report shape (a block per finding) and opens with a verdict line (blocking issues present, plus the single most important fix), then a scope statement that says the whole crate was reviewed, that a library was assumed (the only source file is src/lib.rs and its items are pub), and gives the edition (2021, the `edition` line) and MSRV (1.75, the `rust-version` line; MSRV is the minimum supported Rust version) read from Cargo.toml, then a tools line saying which of the format check (`cargo fmt --check`), clippy (the Rust linter), and the tests ran
