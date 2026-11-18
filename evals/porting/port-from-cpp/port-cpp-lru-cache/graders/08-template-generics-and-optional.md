---
type: llm
focus: trace
weight: 1
---

The C++ class template `LruCache<K, V>` becomes a Rust generic over `K` and `V` with only the trait bounds the implementation needs: `Eq`, plus `Hash` if a `HashMap` index is used, plus `Clone` only if something is actually cloned. It has no unneeded bounds such as `Debug`, `Display`, `Send`, `Sync`, `Default`, or `'static` on `K` or `V`. `std::optional` results become `Option`: `get` and `peek` return `Option`, and `peek`, which returns a nullable pointer in C++, returns `Option<&V>` and not a raw pointer.
