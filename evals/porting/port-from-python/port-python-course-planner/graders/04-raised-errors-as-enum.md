---
type: llm
focus: trace
weight: 1
---

The Python exception hierarchy (the base class CatalogError and its subclasses LineError, UnknownPrereq and PrereqCycle) is ported as one single error enum. It is not three unrelated structs, not a trait-object hierarchy, and not stringly-typed errors. The variants carry the data the Python attributes carried: the line number and reason for the line error, the course and prereq for the unknown prerequisite, and the path `Vec` for the cycle. The enum has `Display` and `std::error::Error` impls, and `parse_catalog` and `study_order` return `Result` instead of panicking.
