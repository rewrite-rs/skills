---
type: llm
focus: trace
weight: 1
---

The C++ exception hierarchy (CacheError, CapacityError, KeyNotFound) becomes a Rust error enum or equivalent with `Display` and `std::error::Error` implementations. `LruCache::new` and `resize` return `Result`, with a capacity-error variant that carries the requested capacity. `at` returns `Result`, with a key-not-found variant. The `Display` messages are exactly "capacity 1048577 exceeds maximum 1048576" (a request one above kMaxCapacity, which is 1 shifted left by 20, i.e. 1048576) and "key not found". No panic or `unwrap` is used for these failures.
