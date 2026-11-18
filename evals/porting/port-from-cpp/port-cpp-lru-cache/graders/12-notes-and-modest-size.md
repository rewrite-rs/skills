---
type: llm
focus: trace
weight: 1
---

PORTING.md does three things. It pairs the C++ API with the Rust API. It pairs each of the 7 C++ tests in test_lru.cpp with a Rust test. It names at least one intentional difference, for example `get` returning `Option<&V>` instead of a copy, or exceptions becoming one enum.
Size: non-test source lines of the crate (not counting blank lines or comments) are under about 300, which is 1.5 times the roughly 202 code lines of lru.h (167) and lru.cpp (35) together.
API surface: no new public API beyond a plain mapping of the C++ one, meaning no builder, no extra traits beyond the listener, and no extra public methods.
