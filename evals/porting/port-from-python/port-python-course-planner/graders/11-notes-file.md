---
type: llm
focus: trace
weight: 1
---

PORTING.md exists in the crate root and does four things.
(a) It pairs each Python function (parse_catalog, study_order, credit_report, dependents) and the exception classes with their Rust counterparts.
(b) It pairs the Python tests with Rust tests.
(c) It names at least one intentional difference, such as the exception hierarchy becoming one enum, the level string becoming an enum, or an integer-width decision for credits.
(d) It records any behavioural improvement the agent noticed but deliberately did not make as a follow-up item, instead of silently changing behaviour.
