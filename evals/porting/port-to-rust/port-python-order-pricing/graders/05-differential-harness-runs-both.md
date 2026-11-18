---
type: llm
focus: trace
weight: 1
---

A differential test or script exists that runs the Python and the Rust implementation on the same inputs and compares their JSON outputs, and also their exit codes for error inputs. The agent ran it in the transcript. Its final message or the notes report the number of inputs compared and the number of differences (for example "N inputs, 0 differences"), not just pass or fail.
