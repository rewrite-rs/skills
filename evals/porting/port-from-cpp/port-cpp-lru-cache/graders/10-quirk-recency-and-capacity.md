---
type: llm
focus: trace
weight: 1
---

Recency and capacity quirks match the C++ code (all from test_lru.cpp).
Peek does not promote: with capacity 2 holding "a" then "b", calling `contains("a")` and `peek("a")` and then `put("c")` evicts "a" (not "b") and leaves hits and misses at 0.
Update at capacity: `put("b", 20)` on the existing key "b" at full capacity does not evict, and moves "b" to the front, so iteration order is ["b", "c"].
Capacity 0: `put` returns false twice, the rejected counter is 2, evictions is 0, size is 0, and the listener is never called.
Resize and erase: `resize(2)` from 4 entries evicts the least recently used first, so the listener sees k2 then k3 (k1 was refreshed by a `get`); `erase` calls no listener and counts no eviction.
