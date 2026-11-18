---
type: llm
focus: trace
weight: 1
---

`Product.description` (null in Java, exposed as `Optional<String>`) becomes `Option<String>`, and `Catalog.find` (returns `Optional<Product>`) becomes `Option<&Product>`. Fields that are never null in Java (sku, name, category, quantities) are not wrapped in `Option`. The crate has no `Option` that only papers over a state Java never allowed.
