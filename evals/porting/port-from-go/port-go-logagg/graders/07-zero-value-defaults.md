---
type: llm
focus: trace
weight: 1
---

The Go zero-value defaults (Go gives unset struct fields the value 0 or false, and aggregate.go turns Workers 0 into 2 and TopN 0 into 3) are reproduced explicitly instead of lost:
- `Config` has a `Default` impl (or equivalent) giving workers 2, top-N 3 and skip-bad false.
- A `Config` whose workers or top_n field is 0 still behaves as 2 workers and top 3. The render test with workers 0 and top_n 0 must show three services in the output, not none.
- `Level` defaults to `Info`, so a KV line such as "svc=api" with no level gives `Level::Info` with latency 0 instead of an error.
- `Stats` defaults to all zeros.
