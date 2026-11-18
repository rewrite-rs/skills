---
type: llm
focus: trace
weight: 1
---

Each of the 11 test functions in test_curriculum.py has a Rust test counterpart: test_parse_fields_and_order, test_empty_catalog, test_line_errors_carry_line_number, test_error_classes_have_common_parent, test_study_order_sample, test_ties_keep_catalog_order_not_alphabetical, test_unknown_prereq, test_cycle_path_starts_at_first_stuck_course, test_cycle_tail_and_self_loop, test_credit_report_lists_every_level_in_order, test_dependents_in_catalog_order. The 7 line-error cases in the `cases` dict of test_line_errors_carry_line_number are all still asserted with their expected line numbers. test_error_classes_have_common_parent (which checks that the three exception classes share the base class CatalogError) may be replaced by the single error enum, but PORTING.md or a test must say so.
