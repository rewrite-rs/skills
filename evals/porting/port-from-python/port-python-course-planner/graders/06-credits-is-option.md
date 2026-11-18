---
type: llm
focus: trace
weight: 1
---

Course credits is an `Option` of an unsigned or signed integer type, not 0 or -1 used as a sentinel for "no credits". The empty field in the line "SEM | elective | | CS1" and the omitted field in "ART1 | intro" both parse to `None`. Credits of 0 and non-numeric credits are rejected with a line error. The code that sorts by credits and the code that totals credits handle `None` explicitly: `None` sorts last, and counts as zero in totals.
