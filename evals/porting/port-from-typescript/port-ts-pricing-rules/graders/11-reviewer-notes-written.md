---
type: llm
focus: trace
weight: 1
---

PORTING.md exists in the crate directory and, written for the reviewer, does the following: it ties the TypeScript API and tests to Rust items; it records the number-type decisions, the decision on `undefined` versus `null` for the category, the handling of `Math.round` and `toFixed`, and the stable-sort and ordered-map choices; and it lists intentional differences (or says there are none). It is specific to this module, not generic porting advice.
