---
type: llm
focus: trace
weight: 1
---

Two JavaScript numeric behaviours are reproduced with exact outputs.
(a) `Math.round` rounds halves toward positive infinity: a percent_off of -2.5 on one item of 100 cents gives a discount of -2 cents and a total of 102 cents (Rust `f64::round` rounds halves away from zero and would give -3 and 103).
(b) `toFixed` rounds exact ties up: two lines of 50 cents each with a fixed_off of 25 cents give an average of 25 cents (0.25 dollars) and the label "2 lines, total $0.50, avg 0.3" (Rust `{:.1}` formatting of 0.25 gives 0.2, which fails).
A port that makes these tests pass by changing the expected values fails this check.
