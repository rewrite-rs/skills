A row in this table is a starting point, not a rewrite rule: the third
column names the decision the row hides, and the decision is made per
site, with the source in front of you.

| Python | Rust | The decision the row hides |
|---|---|---|
| `list` | `Vec<T>` | The Python list was heterogeneous — if so, the real mapping is an enum, not `Vec<Box<dyn Any>>` |
| `tuple` | tuple or `struct` | A tuple with a fixed meaning per position is a struct; `t[2]` in the source is the tell |
| `dict` | `HashMap`, `BTreeMap`, or `struct` | Fixed key set means `struct`; ordered iteration means `BTreeMap` or `IndexMap`, because Python dicts preserve insertion order and `HashMap` does not |
| `set` | `HashSet`/`BTreeSet` | Same ordering question |
| `None` | `Option<T>` | Whether the source used `None` as "absent" or as a sentinel value with meaning |
| `class` | `struct` + `impl` | Whether the class was a record, a namespace, or a state machine — the third is `/type-driven-design` |
| `@dataclass` | `struct` + `#[derive(Clone, Debug, PartialEq)]` | Mutability: a frozen dataclass is a plain value; a mutable one may need a builder |
| `__init__` | `fn new(...) -> Self` or `-> Result<Self, E>` | Whether construction can fail — if `__init__` raised, `new` returns `Result` |
| Inheritance | Composition, or a trait | Almost always composition; a base class with state is a field, not a supertrait |
| `abc.ABC` | `trait` | Only with two or more implementations |
| Duck-typed parameter | Concrete type, generic, or `dyn Trait` | Count the actual implementations before choosing |
| `*args` / `**kwargs` | An explicit struct, or a builder | Which keywords are actually passed at the call sites — grep before designing |
| Decorator | A wrapper function, or a `#[derive]`/attribute macro | Whether the decorator adds behaviour (wrapper) or metadata (derive) |
| `with` / context manager | A guard type with `Drop` | Whether cleanup can fail — `Drop` cannot return an error, so a fallible close needs an explicit `finish()` |
| Generator / `yield` | `impl Iterator` | Whether the generator was infinite or stateful; stateful generators become a struct with an `Iterator` impl |
| Comprehension | Iterator chain | Nothing hidden — this is the clean one; shape is `/idiomatic-rust` |
| `try/except` | `Result` + `?` | The error type, which is `/rust-errors` |
| `raise` in a library | `Err(...)` | Never `panic!` — an exception the source caller handled must stay recoverable |
| `assert` | `assert!` or a `Result` | Python `assert` vanishes under `-O`; if the source ran optimized, the check was not running at all |
| `threading` | `std::thread` / `rayon` | The GIL meant no true parallelism — a port removes it, so data races become possible where they were structurally impossible |
| `multiprocessing` | threads, usually | The process boundary existed to escape the GIL and is usually not needed |
| `asyncio` | `tokio` | `/async-rust` |
| `str` | `String` / `&str` | Code point versus byte indexing, as in `SKILL.md` |
| `bytes` | `Vec<u8>` / `&[u8]` | Whether the source ever mixed the two implicitly |
| `int` | `i64`, `u64`, `i128`, `num-bigint` | Range, as in `SKILL.md` |
| `float` | `f64` | Formatting differences in serialized output are a contract question |
| `Decimal` | `rust_decimal` | Never `f64` — a money port that lands on `f64` is a defect |
| `json` | `serde_json` | Python `json` accepts `NaN`/`Infinity` by default and `serde_json` does not |
| `pickle` | Nothing — re-serialize with `serde` | A pickle boundary cannot be ported; it is replaced, which is a contract change |
| `logging` | `tracing` / `log` | Log wording differences are usually an acceptable difference; log *structure* consumed by another system is not |
| Global mutable module state | `OnceLock`, `LazyLock`, or an explicit context struct | Module-level mutables are the hardest Python idiom to port; making the dependency explicit is the point, not a side effect |
| Monkeypatching in tests | Trait injection or a feature flag | If the source tests monkeypatch, the port needs a seam the source never had |

## Three rows that are traps rather than mappings

- `dict` used as a record — becomes a struct.
- `None` used as three different things in one codebase — absent, error, and
  "not yet computed" — each becomes a different type.
- Any code branching on `type(x)` — becomes an enum, and that rewrite is
  the port.
