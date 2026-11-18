---
type: llm
focus: trace
weight: 1
---

REVIEW.md groups repeated instances of one cause into a single finding that lists the lines, rather than writing one finding per occurrence: for example the six `.lock().unwrap()` calls on lines 80, 85, 92, 97, 102, and 109 of src/lib.rs (if mentioned at all) appear in one finding, not one finding each
