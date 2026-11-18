---
type: llm
focus: trace
weight: 1
---

Tie-breaking and truncation match Go exactly, using the sample input in logagg_test.go (7 accepted lines):
- The slowest entry is api at 250ms. Two entries tie at 250ms (api and web) and the first one wins, so a `max_by_key` that returns the last maximum is wrong.
- The overall average is 99ms: the total latency 696 divided by 7 lines, truncated (not rounded to 100, and not a float).
- db averages 40ms (81 divided by 2) with err=50%.
- A `Stats` with count 3, errors 1 and total_ms 10 gives error_pct 33 and avg_ms 3 (both truncated).
