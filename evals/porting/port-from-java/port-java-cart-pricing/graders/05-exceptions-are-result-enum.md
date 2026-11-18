---
type: llm
focus: trace
weight: 1
---

The checked `CartException` hierarchy (UnknownSku, InsufficientStock, InvalidQuantity) becomes `Result<_, E>`, where `E` is an error enum or equivalent whose variants hold the same data: the sku for unknown-sku; the sku, requested quantity and available quantity for insufficient-stock; and the quantity for invalid-quantity. `Cart::add` returns that `Result`. The code string (UNKNOWN_SKU, OUT_OF_STOCK, BAD_QUANTITY) is still available. The error type has `Display` and `std::error::Error` impls. No error path in library code uses `panic!`, `unwrap` or `expect`.
