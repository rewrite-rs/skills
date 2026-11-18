---
type: llm
focus: trace
weight: 1
---

The Java getter/setter style of Product (a bean) is not reproduced as `get_*`/`set_*` method pairs. Fields are `pub`, or accessors exist only where a caller or test needs one (for example `Category::label`, the error code, or `Catalog::find`). The crate has no unused `get_name`, `set_name`, `set_category` or similar methods, and no Java-style `get` prefix on any method.
