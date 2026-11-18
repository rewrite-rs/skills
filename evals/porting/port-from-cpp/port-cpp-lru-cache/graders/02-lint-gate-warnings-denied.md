---
type: llm
focus: trace
weight: 1
---

`cargo clippy --all-targets -- -D warnings` (clippy is the Rust linter; `-D warnings` turns every warning into an error) finishes cleanly with no warnings. The crate has no lint configuration of its own that would choose a different lint level, so this is the level that applies.
