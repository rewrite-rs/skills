---
type: llm
focus: trace
weight: 1
---

The C++ scoped bulk loader `Batch` (RAII: it does its work in the destructor) is ported as a guard type that implements `Drop`. It counts one batch only if at least one `put` through it stored a value; an empty `Batch` counts nothing. The C++ `unique_ptr<EvictionListener>` member (a listener object the cache owns exclusively) becomes an owned `Option<Box<dyn Trait>>` or an owned generic parameter, and is not an `Rc`, an `Arc`, or a borrowed reference.
