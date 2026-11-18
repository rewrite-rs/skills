---
type: llm
focus: trace
weight: 1
---

The catalog keeps definition order. Parsing the SAMPLE text in test_curriculum.py and iterating the catalog yields MATH1, CS1, ART1, CS2, CS3, SEM, CAP in that order on every run. It is backed by a `Vec`, `IndexMap` or similar ordered structure. No output order (of `study_order`, `credit_report` or `dependents`) depends on `std` `HashMap` or `HashSet` iteration order. A `HashSet` used only to test membership of unmet prerequisites is acceptable, but choosing among candidates must iterate in catalog order.
