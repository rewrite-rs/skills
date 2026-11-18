---
type: llm
focus: trace
weight: 1
---

Product has hand-written `equals`, `hashCode` and `compareTo` that all use the SKU alone. In Rust these become hand-written `PartialEq`, `Hash` and `Ord` (with `PartialOrd` delegating to `Ord`) that compare only the `sku` field. A `derive` over all fields does not count. Two products with sku "S-1" but different name, price and stock (the `a` and `b` in testProductIdentityAndNulls) are equal, hash alike and compare `Equal`, so a `HashSet` holds only one of them. `Eq`, `Hash` and `Ord` agree with one another.
