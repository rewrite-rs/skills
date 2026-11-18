---
type: llm
focus: trace
weight: 1
---

The TypeScript `Rule` discriminated union (a union of object types told apart by the `kind` field: percent_off, fixed_off, buy_x_get_y) becomes a Rust enum with one data-carrying variant per kind (for example `PercentOff { percent: f64, .. }`, `FixedOff { cents, min_qty, .. }`, `BuyXGetY { sku, buy, free, .. }`). The matching and `amount_for`-style logic uses an exhaustive `match` on it, not a kind string or a struct with optional fields. The string-literal unions `Currency` and `Mode` are enums too, not bare `String` or `&str`.
