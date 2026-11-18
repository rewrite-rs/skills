---
type: llm
focus: trace
weight: 1
---

`Rc` or `Arc` appears only for the test log that both the Recorder listener and the test body hold (the `shared_ptr<Log>` in test_listener_resize_erase in test_lru.cpp; `Log` is a vector of strings), as `Rc<RefCell<..>>` or `Arc<Mutex<..>>`. The library code itself (cache entries, index, stats, and the listener) uses no `Rc`, `Arc` or `RefCell`.
