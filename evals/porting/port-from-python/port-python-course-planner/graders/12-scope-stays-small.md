---
type: llm
focus: trace
weight: 1
---

The port stays small, checked in three parts.
Size: code lines in src/ (not counting blank lines, comments, doc comments or tests) stay under three times those of curriculum.py. curriculum.py has about 105 such lines (107 non-blank lines outside # comments), so the limit is about 315.
No re-created Python runtime behaviour: no emulation of `str.strip`, `str.isalnum`, `int()` or `sorted()` beyond what `std` provides.
API surface: no added traits, builders or generic layers that have a single implementation. The public API holds only the four original operations, the types they need, and ordinary conveniences (Debug, Clone, Display, Error, FromStr, Default, `len`, `is_empty`, `iter`, `get`).
