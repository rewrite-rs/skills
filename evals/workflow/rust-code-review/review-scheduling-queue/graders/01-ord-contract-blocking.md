---
type: llm
focus: trace
weight: 1
---

REVIEW.md reports the hand-written `Ord` on `Priority` (src/lib.rs lines 20 to 24, the `impl Ord` that compares only `level`) beside the derived `PartialEq`/`Eq` (line 14, which also compare `label`) as blocking, explains that the two disagree, and names a collection consequence such as the `BTreeSet<Priority>` in `Queue.seen` (line 63) merging priorities that differ only by label or `sort`/dedup behaving inconsistently
