---
type: llm
focus: trace
weight: 1
---

REVIEW.md writes each finding as a single line of the form `path:line — severity: what is wrong. What to do instead.` (src/config.rs plus a line number, then one of the three severity words blocking, should-fix, or note), most severe first (blocking before should-fix before note), rather than multi-paragraph blocks with Consequence/Standard/Change headings
