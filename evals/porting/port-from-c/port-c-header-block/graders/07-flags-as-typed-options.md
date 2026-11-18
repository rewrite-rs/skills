---
type: llm
focus: trace
weight: 1
---

The three C flags HB_UNFOLD, HB_MERGE_REPEATS and HB_STRICT_NAMES (bits 0x1, 0x2 and 0x4 in hdrblock.h, combined with bitwise OR) no longer exist as OR-ed bits. The parse function takes a typed value instead: an options struct of bools, a builder, or a bitflags type. There are no public `u32` or `i32` flag constants that callers combine with OR.
