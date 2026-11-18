---
type: llm
focus: trace
weight: 1
---

The crate has no `unsafe` block, no raw pointers, and no hand-written linked list built on pointers. The C++ design (a `std::list` of entries plus an `unordered_map` from key to list iterator) is replaced by a safe structure, such as a `VecDeque`, indices into a `Vec`, or a map with a recency counter. A line-by-line transliteration that clones and unwraps its way around the borrow checker does not count.
