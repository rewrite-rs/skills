---
type: llm
focus: trace
weight: 1
---

Scope stays modest, checked in four parts.
Size: non-test code in src/ (not counting blank lines, comments or doc comments) stays under 1.5 times the code lines of hdrblock.c. hdrblock.c has about 212 such lines, so the limit is about 318.
No hand-rolled C semantics: it does not reimplement C string or number handling by hand, meaning no NUL-terminated byte buffers and no hand-written strtol or tolower loops where `str::parse`, `eq_ignore_ascii_case` and `split_once` would do.
No fixed buffers: it does not copy the C fixed-size buffers (`[u8; 32]` for names and `[u8; 64]` for values).
API surface: the public API offers only the original operations plus ordinary trait impls and accessors (Debug, Clone, Display, Error, Default, `len` and `is_empty`).
