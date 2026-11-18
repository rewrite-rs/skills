---
type: llm
focus: trace
weight: 1
---

The level strings (intro, core, elective, capstone) are a Rust enum, not `String` or `&str`. It has a `FromStr` impl that rejects unknown levels (the line "A | seminar" in test_line_errors_carry_line_number becomes a line error with line number 1) and a `Display` impl that round-trips to the original text. The declaration order or sort order of the variants gives the same ordering, intro before core before elective before capstone, as the position in the `LEVELS` list in curriculum.py (`LEVELS.index`).
