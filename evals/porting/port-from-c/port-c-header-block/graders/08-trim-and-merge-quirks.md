---
type: llm
focus: trace
weight: 1
---

Two deliberate quirks of the C code (the parser deliberately keeps C behaviour even where it looks odd) hold for whitespace and merging.
Trimming: parsing "K:\t\x0b v \t\n" stores the value "\x0b v". Only space and tab are trimmed, so the vertical tab (\x0b) survives; this rules out Rust `str::trim`, which would also strip it.
Merging: with HB_MERGE_REPEATS enabled (repeated names joined onto the first one), "Via: a\nvia: b\nVIA:\nVia: c\n" yields one header named "Via" (the spelling of the first occurrence) with value "a, b, c". The empty repeat adds no separator. Also, "Via:\nVia: only\n" yields the value "only" with no leading ", ".
