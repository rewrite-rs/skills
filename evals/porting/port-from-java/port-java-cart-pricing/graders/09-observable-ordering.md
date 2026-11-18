---
type: llm
focus: trace
weight: 1
---

Ordering that a caller or test can observe is preserved.
- `Catalog::skus` returns G-1, B-2, E-3, E-9 in insertion order (an `IndexMap` or an ordered `Vec`, not a plain `HashMap` that is iterated).
- The category subtotals iterate Grocery, Books, Electronics: a `BTreeMap` or equivalent, with `Category` deriving `Ord` in that declaration order (the Java `TreeMap` over the enum).
- `Receipt.discounts` lists applied discount names in the order they were applied.
- `Catalog::low_stock(5)` (products with at most 5 units in stock) returns E-3 then G-1, sorted by sku.
