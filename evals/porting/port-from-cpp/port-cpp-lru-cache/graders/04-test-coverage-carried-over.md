---
type: llm
focus: trace
weight: 1
---

Each of the 7 test functions in test_lru.cpp (test_eviction_order_and_stats, test_peek_does_not_promote_but_update_does, test_zero_capacity, test_errors, test_listener_resize_erase, test_groups_and_batch, test_stats_arithmetic) has a Rust test counterpart with the same assertions and expected values. A newly written suite that only covers similar ground does not count.
