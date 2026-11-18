---
type: llm
focus: trace
weight: 1
---

The port keeps C behaviour even where it looks like a bug or an oddity. Examples: header names may contain characters such as `_` unless HB_STRICT_NAMES is set; a line with only whitespace is treated as a continuation line or a syntax error, not as the end of the block; the block ends at the first empty line; the integer getter still accepts a leading sign. If the agent wanted any behaviour change, it is written in PORTING.md as a follow-up item or a listed difference, and is not silently applied in the code.
