---
tags: [port-from-c]
max_turns: 30
timeout_seconds: 1500
allowed_tools: [Read, Grep, Glob, Edit, Write, Bash, Skill]
---

Our HTTP header-block parser has to leave C behind. Rewrite hdrblock.h and hdrblock.c as an idiomatic Rust library with identical behaviour, and carry over every test in test_hdrblock.c. Place the crate in the working directory (Cargo.toml, src/lib.rs) and include a PORTING.md aimed at whoever reviews the result.

Input files: hdrblock.h, hdrblock.c, test_hdrblock.c
