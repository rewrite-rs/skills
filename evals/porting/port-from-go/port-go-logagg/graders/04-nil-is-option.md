---
type: llm
focus: trace
weight: 1
---

Go nil meaning "absent" becomes `Option`. `Report.Slowest` (a `*Entry` that is nil when no line was accepted) is an `Option<Entry>` or `Option<&Entry>`. `Report.Service(name)` (a `*ServiceStats` that is nil for an unknown name) returns `Option<&ServiceStats>` or `Option<ServiceStats>`. No sentinel value, default struct, or empty-string name stands in for absence. The tests check `is_none()` for the slowest entry of empty input and for `Service("nope")`.
