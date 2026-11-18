---
type: llm
focus: trace
weight: 1
---

All 13 tests in pricing.test.ts have a Rust counterpart that asserts the same inputs and outputs. The 13 tests cover: category scope (missing key means any category, null means uncategorized only), parseRules keeping absent and null distinct, stack mode versus best mode, a tie in best mode, the surcharge from a negative percent and its rounding, fixed_off with minQty and clamping to the line, buy_x_get_y, sorting with ties, the empty cart, the average label, errors carrying their fields, groupBy and subtotalsByCategory, and formatMoney. The tests were ported, not rewritten into weaker assertions, and none was dropped silently.
