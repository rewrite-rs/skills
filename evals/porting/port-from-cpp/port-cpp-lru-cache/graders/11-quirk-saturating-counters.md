---
type: llm
focus: trace
weight: 1
---

Counters saturate (stop at the maximum value) rather than wrap around or panic, checked in a debug build, where integer overflow normally panics. Adding `Stats { hits: u32::MAX - 1 }` to `Stats { hits: 5, misses: 3 }` gives hits equal to `u32::MAX` and misses equal to 3. `hit_rate_permille` (hits per 1000 lookups) is 0 for zero lookups, 500 when hits and misses both equal `u32::MAX` (computed in `u64` so it does not overflow), and 333 for 1 hit and 2 misses. Adding stats is done through `std::ops::Add` and/or `AddAssign`, and equality through `PartialEq`, not through named methods.
