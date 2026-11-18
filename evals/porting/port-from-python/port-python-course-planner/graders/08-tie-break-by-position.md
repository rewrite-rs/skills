---
type: llm
focus: trace
weight: 1
---

`study_order` breaks ties by position in the catalog, not by course code. For the text "zed | core | 2\nalpha | core | 2\nmid | core | 2" the Rust output is exactly [zed, alpha, mid], not the alphabetical [alpha, mid, zed]. For "X | core\nY | core | 1" the output is [Y, X], because a course with no credits sorts after one with credits. The agent did not add a code-name tie-break that the Python lacks.
