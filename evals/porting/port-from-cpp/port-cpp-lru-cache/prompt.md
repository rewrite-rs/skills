---
tags: [port-from-cpp]
max_turns: 36
timeout_seconds: 1800
allowed_tools: [Glob, Read, Grep, Bash, Edit, Write, Skill]
---

The C++ LRU cache module is being replaced by Rust. Turn lru.h and lru.cpp into an idiomatic Rust library crate that acts exactly as before, and bring the tests from test_lru.cpp across as well. The crate goes in the working directory (Cargo.toml, src/lib.rs); add PORTING.md so the reviewer has context.

Input files: lru.h, lru.cpp, test_lru.cpp
