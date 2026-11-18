---
type: llm
focus: trace
weight: 1
---

The Go `Parser` interface, which has exactly two implementers (`SpaceParser` and `KVParser`), becomes a Rust trait with one method returning `Result<Entry, _>` and an impl for each type (or an equivalent closed enum of the two parsers). The aggregate function accepts either implementer. The test that runs `KVParser` through the same aggregate entry point as `SpaceParser` still exists. The port adds no other trait or generic layer that has only a single implementer.
