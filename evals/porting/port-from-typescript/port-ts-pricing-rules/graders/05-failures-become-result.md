---
type: llm
focus: trace
weight: 1
---

The thrown `PricingError` subclasses (InvalidRuleError, DuplicateRuleError, InvalidItemError) become `Result` return values with an error enum (hand-written or using `thiserror`) whose variants hold the same data: the rule index for an invalid rule, the rule name for a duplicate, and the sku for an invalid item. The code string (invalid_rule, duplicate_rule, invalid_item) stays recoverable, and the library never panics for these cases. The `SyntaxError` that `JSON.parse` throws on malformed text is also an `Err` variant, not a panic.
