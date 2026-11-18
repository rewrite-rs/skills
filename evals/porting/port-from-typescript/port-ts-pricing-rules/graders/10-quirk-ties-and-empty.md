---
type: llm
focus: trace
weight: 1
---

Two edge behaviours are reproduced with exact outputs.
(a) Ties. Three lines whose totals are each 1000 cents (pen, mug, ink in the test items) stay in input order [pen, mug, ink] after sorting by total descending. This needs a stable sort (such as `sort_by` or `sort_by_key`, not `sort_unstable*`) and an order that is not lost through a `HashMap`. In best mode, two fixed_off rules of 100 cents on one item credit only the first-listed rule.
(b) Empty input. `priceCart` with no items returns total 0, the label "empty cart", and an average that is absent (`None`), not 0 or NaN. `quoteToJson` on that empty quote returns exactly {"lines":[],"discountsByRule":{},"subtotal":0,"discount":0,"total":0,"label":"empty cart"}: the average key is omitted, not `null`, and the output is produced through `serde`. A port that divides by zero or reports an average of 0 fails this check.
