---
type: llm
focus: trace
weight: 1
---

Line totals reproduce the silent overflow of Java `int` (32-bit integer). `unit_cents` and `quantity` are 32-bit integers and their product wraps around before being widened (`wrapping_mul` on `i32`, or an explicit cast sequence). So 10 units of E-9 at 300_000_000 cents give a subtotal of -1_294_967_296, matching testLineTotalWrapsLikeInt. The port does not widen to `i64` before multiplying (that would give 3_000_000_000), does not panic in debug builds, and does not use `checked_mul` with a new error path. The decision is recorded in PORTING.md.
