---
type: llm
focus: trace
weight: 1
---

`cargo clippy --all-targets -- -D warnings` (clippy is the Rust linter; `-D warnings` turns every warning into an error) reports no warnings. The crate sets no lint configuration that would override this level. Also, no `unsafe` block or `unsafe fn` appears, and there is no JNI (Java Native Interface) or other foreign-function layer. The end result is a standalone Rust crate with no link back to the JVM.
