---
tags: [port-to-rust]
max_turns: 55
timeout_seconds: 1800
allowed_tools: [Skill, Read, Glob, Grep, Write, Edit, Bash]
---

This small order-pricing tool should start moving to Rust, but in stages rather than in one go. Port the first slice, leave everything else in Python for now, and demonstrate that the Rust slice gives the same results as today's code. The Python tests and cli.py must keep working. Someone will review it, so write notes in the repo about what you did, why, and what remains.
