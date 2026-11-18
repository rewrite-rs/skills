---
type: llm
focus: trace
weight: 1
---

The Rust tests were derived from the existing cases in test_shipcalc.py (a characterization suite: tests that pin down what the code does today), not from a freshly invented suite. The cases to carry over are:
- the bulk discount boundaries, quantities 10, 11, 50 and 51 (no discount at 10, 5 percent at 11 and 50, 10 percent at 51);
- the floored discount for 333 cents times 11 units;
- half-up tax on 25 cents (standard category) and 22 cents (reduced category);
- shipping of 10 cents split over 3 lines as [3, 3, 4];
- the error cases;
- the `price_order` example.
Expected values were taken from running the Python, and the notes or the test names make that mapping visible.
