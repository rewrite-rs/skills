---
type: llm
focus: trace
weight: 1
---

The trace shows `cargo clippy` (clippy is the Rust linter) run without `-- -D warnings` appended (`-D warnings` turns every warning into an error; it is allowed only after it was shown that the repo has no lint configuration, which is not the case here: Cargo.toml has a `[lints.clippy]` table and clippy.toml exists), and REVIEW.md reports what ran at that level; it does not report hits from stricter lint groups (such as clippy pedantic) or from levels the repo did not configure as defects
