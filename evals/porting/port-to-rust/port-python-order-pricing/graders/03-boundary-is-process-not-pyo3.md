---
type: llm
focus: trace
weight: 1
---

The comparison between Python and Rust crosses a process boundary: the Rust side is a binary that reads on stdin the same JSON order that `cli.py quote` takes, and prints a JSON receipt. The agent did not add PyO3, maturin, cffi or another in-process Python binding to do the comparison. If it did add one, the parity contract explicitly justifies it as a temporary scaffold that is deleted at cut-over (the moment the Python module is retired).
