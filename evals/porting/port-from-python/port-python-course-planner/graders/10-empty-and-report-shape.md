---
type: llm
focus: trace
weight: 1
---

Empty input behaves as in Python.
- Parsing "" or comment-only text succeeds with an empty catalog.
- `study_order` of an empty catalog returns an empty list, not an error.
- `credit_report` of an empty catalog still lists all four levels in the order intro, core, elective, capstone, each with count 0 and credits 0.
- For the SAMPLE catalog in test_curriculum.py, `credit_report` gives (count, credits) of intro (3, 8), core (2, 6), elective (1, 0), capstone (1, 6). A course without credits counts toward the count but adds zero credits.
