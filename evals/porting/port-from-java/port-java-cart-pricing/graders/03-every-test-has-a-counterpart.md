---
type: llm
focus: trace
weight: 1
---

Each of the 9 test methods in CartTest.java has a Rust counterpart that asserts the same values: testCheckoutTotals, testTaxRoundsHalfUp, testDiscountsApplyInPriorityOrder, testEqualPriorityKeepsInsertionOrder, testCategoryDiscountUsesOriginalSubtotal, testOrderingIsObservable, testLineTotalWrapsLikeInt, testErrorsCarryData, and testProductIdentityAndNulls. None is dropped on the grounds that the Java test runner (the `main` method that calls them) does not port.
