---
type: llm
focus: trace
weight: 1
---

The four Go sentinel errors (named error values: ErrEmptyLine, ErrBadLevel, ErrBadLatency, ErrMalformed) become variants of a Rust error enum, and callers match on variants instead of comparing strings. The parsers return `Result<Entry, Error>`. `ParseError` is a struct (or equivalent) that keeps the 1-based line number, the text of the line, and the underlying error as its cause (exposed through `Error::source` or a public field). The Go `errors.Is` and `errors.As` checks in the tests become matches on those variants. `aggregate` returns `Result`; for the 4-line input in the strict-mode subtest of TestAggregateErrors (whose line 2 is "WARN db x"), the failure carries line number 2 and the bad-latency variant.
