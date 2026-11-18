---
type: llm
focus: trace
weight: 1
---

The Go worker-pool goroutines, channel and `sync.WaitGroup` are mapped to standard-library threads (`std::thread::scope`, spawned threads with collected `JoinHandle`s, or `std::sync::mpsc` or crossbeam channels), not to an async runtime. Specifically: Cargo.toml has no tokio, async-std or smol dependency and the code has no `async fn`; the worker count comes from the config; every worker is joined before results are combined, so a worker panic is not swallowed; and results are combined in input order, so the outcome does not depend on thread scheduling.
