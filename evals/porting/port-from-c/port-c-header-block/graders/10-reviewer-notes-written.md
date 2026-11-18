---
type: llm
focus: trace
weight: 1
---

PORTING.md pairs each of the 6 C functions (hb_parse, hb_get, hb_name_at, hb_get_int, hb_count, hb_free) with its Rust counterpart. It pairs each of the 9 C tests in test_hdrblock.c with a Rust test. It spells out the parity contract, meaning which observable behaviour must match the C code. It also names at least one intentional difference as a recorded decision, for example dropping hb_free and HB_ERR_NOMEM, or taking UTF-8 `str` input instead of raw bytes.
