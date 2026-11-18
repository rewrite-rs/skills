---
type: llm
focus: trace
weight: 1
---

Tax and discount quirks are reproduced exactly. All numbers are in cents.
- Tax rounds half-up. `Category::Electronics` tax (7.5 percent) on 60 is 5: the exact value 4.5 rounds up to 5, not down to 4 as banker's rounding (round half to even, the default of `rust_decimal` and of `f64` rounding) would give. Books (5 percent) on 100 is 5.
- Discounts apply in ascending priority order, regardless of the order they were added. With a cart of E-3 and G-1 (subtotal 999 + 199 = 1198), a fixed discount of 500 at priority 1 and a 10 percent discount at priority 2 take off 500 and then 69. The 69 is 10 percent of the remaining 698, truncated from 69.8 (not rounded to 70).
- Discounts of equal priority apply in insertion order. Three discounts at priority 5 on E-3 (subtotal 999), added as fixed 300, 50 percent, fixed 400, take off 300, then 349 (50 percent of the remaining 699, truncated), then 350 (the fixed 400 capped at what remains). Only the 75 cents of tax is left as the total.
- Percent math is integer, with no `f64` anywhere in pricing.
