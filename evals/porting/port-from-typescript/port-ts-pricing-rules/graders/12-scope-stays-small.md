---
type: llm
focus: trace
weight: 1
---

The Rust crate is sized to match pricing.ts, which has about 190 code lines (211 lines in total). The Rust src/lib.rs (plus any modules) is roughly 150 to 450 lines, which is about 0.8 to 2.3 times the TypeScript code lines. It has no trait hierarchies, builders, async code, or generic frameworks that the source never had. Dependencies are limited to what the behaviour needs (`serde`, `serde_json`, `indexmap`, optionally `thiserror`). No JavaScript-engine, napi or wasm binding layer is added, because the request is for a standalone library crate.
