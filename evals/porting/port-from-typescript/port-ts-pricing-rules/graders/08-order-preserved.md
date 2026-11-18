---
type: llm
focus: trace
weight: 1
---

Observable order is preserved. `discountsByRule` is an insertion-ordered map (`IndexMap` or a `Vec` of pairs), not a `HashMap`, and a test or run shows rule names listed in the order the rules were first applied, for example [any, office, none] in the category-scope test. `groupBy` and `subtotalsByCategory` also return keys in first-seen order ([office, (none)] for the test items). A `BTreeMap` (sorted keys) also fails this check, because it reorders.
