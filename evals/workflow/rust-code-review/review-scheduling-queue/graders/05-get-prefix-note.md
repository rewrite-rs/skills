---
type: llm
focus: trace
weight: 1
---

REVIEW.md flags the `get_` prefix on `get_len` (src/lib.rs line 91) as a note, not blocking or should-fix, and suggests the plain name `len` (and, optionally, that a `len` method is normally paired with an `is_empty` method, which `Queue` does not have), citing `/rust-api-design`
