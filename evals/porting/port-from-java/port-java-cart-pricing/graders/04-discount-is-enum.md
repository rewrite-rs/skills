---
type: llm
focus: trace
weight: 1
---

The abstract class `Discount` and its three anonymous subclasses (created by the factory methods `percent`, `fixed` and `onCategory`) become a closed enum: a `Discount` enum, or a struct holding a kind enum. Behaviour is chosen by `match` inside `amount_off` or an equivalent. They are not a trait with `Box<dyn Trait>` implementations, no `Deref` is used to imitate `extends`, and no `Rc<RefCell<...>>` object graph appears anywhere in the crate.
