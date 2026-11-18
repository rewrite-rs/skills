---
type: llm
focus: trace
weight: 1
---

The trace never runs `cargo fmt` (the Rust formatter, which rewrites files) without `--check` in the working tree; src/config.rs, src/main.rs, Cargo.toml, clippy.toml, and change.diff are unchanged from their state right after stage-inputs.sh ran (the five files named in prompt.md); REVIEW.md includes no rewrite of the changed function beyond a brief fix fragment for each finding
