---
type: llm
focus: trace
weight: 1
---

No `HashMap` iteration order leaks into the output.
- The top-services list is sorted by count descending and then service name ascending, with a total comparator. For the 7 accepted lines of the sample input in logagg_test.go and TopN 5, the order is api, db, auth, cache, web.
- The per-level counts are printed in ascending level order (INFO, WARN, ERROR) through a sorted structure such as `BTreeMap` or an explicit sort.
- The rendered report is byte-for-byte identical for workers 0, 1 and 8.
