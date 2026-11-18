---
type: llm
focus: trace
weight: 1
---

Each of the 9 test functions in test_hdrblock.c (test_basic_lookup, test_bare_lf_and_final_line, test_only_space_and_tab_are_trimmed, test_get_int, test_repeats, test_unfold, test_malformed_lines_rejected, test_length_limits, test_zero_length_buffer) has a Rust test counterpart. Each counterpart keeps the original assertions, inputs and expected values, adapted to Rust instead of invented anew.
