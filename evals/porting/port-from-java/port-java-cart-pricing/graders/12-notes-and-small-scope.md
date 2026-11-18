---
type: llm
focus: trace
weight: 1
---

PORTING.md exists and does three things. It pairs the Java classes and tests with Rust types and tests. It states the decisions made at the places where Java and Rust behaviour could differ (half-up tax rounding, truncating percent discounts, 32-bit integer wraparound, equality by SKU alone, discounts ordered by priority with ties in insertion order). It names at least one intentional difference, such as the Discount subclasses becoming an enum or `IllegalArgumentException` becoming a `Result`.
Size: non-test code in src/ (not counting blank lines, comments or doc comments) is under three times the roughly 231 code lines of the Java sources other than CartTest.java, so under about 690 lines.
Scope: no re-created UTF-16 string semantics, no dependency-injection-style container, and a public API limited to the Java operations plus ordinary trait impls.
