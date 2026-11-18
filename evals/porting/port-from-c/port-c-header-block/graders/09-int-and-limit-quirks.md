---
type: llm
focus: trace
weight: 1
---

Two deliberate quirks of the C code hold for number parsing and length limits, verified by reading the Rust code or running a test.
Numbers: hb_get_int (C uses strtol, the standard string-to-long function) on the value "\x0b5" returns 5, because strtol skips leading whitespace; either the parity contract keeps this behaviour, or PORTING.md lists the narrowing as a deliberate difference. "+42" returns 42. "0x10" is the not-a-number error. "2147483648" (one more than the largest C `int`, 2147483647) is the out-of-range error, not the not-a-number error.
Lengths: HB_NAME_MAX is 32 and HB_VALUE_MAX is 64 in hdrblock.h, both counting the terminating NUL byte, so names may be 31 bytes and values 63 bytes. A 63-byte value is accepted. A 64-byte value fails with the too-long error carrying line 1. A merge of repeated headers that makes the value overflow reports the line number of the repeating header.
