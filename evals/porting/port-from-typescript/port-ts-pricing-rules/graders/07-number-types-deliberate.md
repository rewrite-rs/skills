---
type: llm
focus: trace
weight: 1
---

Each TypeScript `number` gets a deliberate Rust type, not `f64` everywhere. Money amounts (unitCents, cents, base, discount, total) and quantities (qty, buy, free, minQty) are integer types (`i64`, `u64`, `u32` or similar), while `percent` is `f64`. The `average` field is `f64`, because it is total divided by the number of lines and can be fractional. The port rejects non-integer or negative cents and non-positive quantities the way the TypeScript validation does, and PORTING.md or code comments record the choice.
