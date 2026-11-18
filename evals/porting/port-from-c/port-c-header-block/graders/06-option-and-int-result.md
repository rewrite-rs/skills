---
type: llm
focus: trace
weight: 1
---

hb_get and hb_name_at return `Option`: `None` for a name that is absent or an index that is out of range. They never return a null pointer, an empty-string sentinel, or panic. hb_get_int returns a `Result` whose error type has three distinct cases, matching HB_INT_MISSING, HB_INT_NOT_NUMBER and HB_INT_RANGE in hdrblock.h (name not present, value is not a number, number does not fit in a C `int`). The parsed number is the `Ok` value, instead of being written through an out-parameter.
