---
type: llm
focus: trace
weight: 1
---

`group_hits` (the per-group hit counter that is a `std::map` in C++, which iterates in sorted key order) is a `BTreeMap<String, usize>` and not a `HashMap`. Check it with test_groups_and_batch: with groups "zeta", "alpha" and "mid", the first key of `group_hits` is "alpha". After one hit each on p (group zeta) and q (group alpha) and two hits on r (group mid), `top_groups(2)` returns [("mid", 2), ("alpha", 1)]. The tie between alpha and zeta (1 hit each) is broken by name, using a stable sort or an explicit name tiebreak. A `HashMap` used only for the key-to-entry index is acceptable because its order is never observable.
