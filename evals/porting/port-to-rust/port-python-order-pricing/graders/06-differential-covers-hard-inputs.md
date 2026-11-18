---
type: llm
focus: trace
weight: 1
---

The differential corpus (the set of inputs fed to both implementations) includes inputs that the existing tests in test_shipcalc.py never exercise:
- negative quantities (refunds) giving a negative net or tax;
- negative `shipping_cents` split across lines;
- shipping cents that do not divide evenly by the number of lines;
- quantities exactly at 10 and 50 (the bulk discount thresholds);
- error inputs (unknown tax category, an order with no lines, a zero quantity).
On the negative-number cases the Rust matches Python, which uses floor division and floor modulo (rounding toward negative infinity), not the truncation toward zero that Rust `/` and `%` do.
