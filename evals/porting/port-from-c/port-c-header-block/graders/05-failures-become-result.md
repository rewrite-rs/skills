---
type: llm
focus: trace
weight: 1
---

The Rust counterpart of hb_parse returns `Result<_, E>`, where `E` is an enum with separate variants for a syntax error, a repeated-name error and a too-long error. Each variant carries a 1-based line number (the first line of the input is line 1). The public API has no integer status codes (the HB_OK and HB_ERR_* constants in hdrblock.h), no out-parameters, and no errno-style global error state. The C error code HB_ERR_NOMEM (out of memory) is dropped instead of ported as a variant, because Rust allocation does not report failure that way.
