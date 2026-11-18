---
tags: [port-from-java]
max_turns: 40
timeout_seconds: 1800
allowed_tools: [Skill, Read, Glob, Grep, Bash, Write, Edit]
---

A small Java shopping-cart pricing module needs a Rust version. Write it as an idiomatic Rust library crate that behaves the same, and port CartTest.java alongside it to show the two agree. Keep the crate in the working directory (Cargo.toml, src/lib.rs) and put reviewer notes in PORTING.md.

Input files: Category.java, CartException.java, Product.java, Discount.java, Catalog.java, Cart.java, CartTest.java
