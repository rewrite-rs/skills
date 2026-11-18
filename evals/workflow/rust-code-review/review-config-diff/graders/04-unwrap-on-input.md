---
type: llm
focus: trace
weight: 1
---

REVIEW.md flags the `.unwrap()` on the parsed `workers` value in `Config::parse` (line 29 of src/config.rs after change.diff is applied) as blocking or should-fix, with its line number in src/config.rs, explains that a non-numeric `workers=abc` in user-supplied config text panics, and says to return an error like the neighbouring port parsing (line 25) and timeout parsing (lines 42 to 44) do with `map_err` and `?`
