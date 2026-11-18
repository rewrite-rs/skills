---
type: llm
focus: trace
weight: 1
---

PORTING.md pairs Go items with Rust items for both the API and the tests. It records how each of these was handled: the sentinel errors, nil pointers, the Parser interface, the goroutine worker pool, and the zero-value defaults. It names at least one intentional difference or deletion, for example struct embedding replaced by composition, the typed-nil case (a nil pointer stored in a non-nil interface) that no longer exists, or the Go `int` becoming a fixed-width integer.
