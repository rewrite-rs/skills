---
tags: [port-from-python]
max_turns: 35
timeout_seconds: 1200
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Our Python course-catalog helper is on its way out. Rewrite curriculum.py as an idiomatic Rust library crate in the working directory (Cargo.toml, src/lib.rs) that behaves identically, and translate test_curriculum.py so we can confirm nothing changed. Include a PORTING.md for the reviewer.

Input files: curriculum.py, test_curriculum.py
