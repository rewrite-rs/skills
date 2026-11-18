---
type: llm
focus: trace
weight: 1
---

The port stays small and safe, checked in three parts.
- There is no `unsafe` block or `unsafe fn` in the crate, and Cargo.toml needs nothing beyond the standard library (no async runtime; helper error crates are also fine).
- The public API is the original operations plus ordinary trait impls (Debug, Clone, Display, Error, FromStr, Default) and accessors.
- Code in src/ outside tests (not counting comments or blank lines) is under twice the 262 non-test code lines of logagg.go (112) and aggregate.go (150) together, so under about 524 lines.
