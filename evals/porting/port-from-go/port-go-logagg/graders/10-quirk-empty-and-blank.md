---
type: llm
focus: trace
weight: 1
---

Empty and blank input match Go exactly.
- Aggregating no lines returns `Ok` with total 0, no slowest entry and an empty top list. It renders exactly "total=0 skipped=0 avg=0ms\nlevels:\n", with no divide-by-zero panic (`Stats::default()` gives avg_ms 0 and error_pct 0).
- Blank or whitespace-only lines are ignored in strict mode: they produce no error and do not increment skipped. So the input ["", "  "] gives total 0 and skipped 0.
