---
tags: [port-from-typescript]
max_turns: 45
timeout_seconds: 1500
allowed_tools: [Read, Glob, Grep, Skill, Edit, Write, Bash]
---

Please move pricing.ts over to Rust. The result should be an idiomatic Rust library crate that behaves like the original, with pricing.test.ts ported too as proof. Keep the crate in the working directory (Cargo.toml, src/lib.rs) and add a PORTING.md for the reviewer.

Input files: pricing.ts, pricing.test.ts, package.json
