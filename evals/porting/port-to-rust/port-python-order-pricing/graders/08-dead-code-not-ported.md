---
type: llm
focus: trace
weight: 1
---

`legacy_flat_rate` in pricing.py was not ported to Rust, and was not silently dropped either: the agent noted that it has no callers (with evidence such as a grep) and recorded it in the notes as deliberately not ported or as a candidate for deletion.
