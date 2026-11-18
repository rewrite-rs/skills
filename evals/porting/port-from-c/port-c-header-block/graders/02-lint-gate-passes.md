---
type: llm
focus: trace
weight: 1
---

`cargo clippy --all-targets -- -D warnings` (clippy is the Rust linter; `-D warnings` turns every warning into an error) finishes with no warnings or errors. The agent ran it, or an equivalent stricter lint run, before finishing, instead of assuming it would pass.
