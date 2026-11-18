---
type: llm
focus: trace
weight: 1
---

Nowhere in the crate is there an `unsafe` block or function, a raw pointer (`*const` or `*mut`), a libc or `c_char` type, or an `extern "C"` item. The end state is a standalone Rust replacement with no boundary to C.
