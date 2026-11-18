---
tags: [rust-code-review]
max_turns: 35
timeout_seconds: 1500
allowed_tools: [Glob, Read, Grep, Skill, Bash, Write, Edit]
---

The worker service is going to sit on top of this job-queue crate, so I need to know what should be fixed first. Review the entire crate and write what you find to REVIEW.md. Do not modify the code.

Input files (all staged in the working directory): Cargo.toml, src/lib.rs
