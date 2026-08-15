A row in this table is a starting point, not a rewrite rule: the third
column names the decision the row hides, and the decision is made per
site, with the source in front of you. The Java corollary: map behaviour,
not structure — a row that reproduces a class hierarchy has failed even
when it compiles.

| Java | Rust | The decision |
|---|---|---|
| `class` (data) | `struct` + derives | Whether `equals`/`hashCode` were hand-written |
| `class` (behaviour) | `struct` + `impl` | Whether the class was really a namespace for functions |
| `abstract class` | `enum`, or `trait` + a struct field | Fixed subclass set means enum |
| `extends` | Composition | Rust has no field inheritance; each promoted member is a decision |
| `interface` | `trait` | Count implementations; one implementation means a struct |
| `interface` with default methods | `trait` with default method bodies | Nothing hidden |
| `record` | `struct` + `#[derive(Clone, Debug, PartialEq)]` | The clean row |
| `enum` with fields and methods | `enum` + `impl` | Java enum instances are singletons; identity comparison in the source is a tell |
| Static factory | `fn new` / `fn from_*` | Whether construction can fail — `/rust-errors` |
| Builder | Builder, or `Default` + struct update | Whether every field was really optional |
| Generic `<T>` | Generic with bounds | Java erases; Rust monomorphizes, so unbounded `T` in the source needs its real bound named |
| Wildcard `? extends T` | Generic bound, or `dyn Trait` | Variance, which Rust handles differently |
| `null` | `Option<T>` | Real absence versus an invalid state |
| `Optional<T>` | `Option<T>` | The clean row |
| Checked exception | `Result<T, E>` variant | The error taxonomy — `/rust-errors` |
| Unchecked exception | `Result` or `panic!` | Grep the catch sites first |
| `finally` | `Drop` guard | Whether cleanup can fail |
| `try-with-resources` | `Drop` | Same |
| `String` | `String` / `&str` | UTF-16 versus UTF-8, as in `SKILL.md` |
| `char` | `char`, or `u16` | A Java `char` is a UTF-16 code unit and may be half a surrogate pair; `char` cannot hold one |
| `StringBuilder` | `String` + `push_str` | Nothing hidden |
| `int` / `long` | `i32` / `i64` | Wraparound |
| `Integer` / `Long` (boxed) | `i32` / `i64`, or `Option<_>` | Whether the box was nullable, and whether identity comparison (`==` on boxes) was relied on |
| `BigDecimal` | `rust_decimal` | Never `f64` for money |
| `BigInteger` | `i128` / `num-bigint` | Actual range |
| `ArrayList` | `Vec<T>` | Nothing hidden |
| `HashMap` | `HashMap` | Iteration order leaking into output |
| `LinkedHashMap` | `IndexMap` | Insertion order was load-bearing |
| `TreeMap` | `BTreeMap` | The comparator, if custom |
| `HashSet` / `TreeSet` | `HashSet` / `BTreeSet` | Same ordering question |
| `Iterable` / `Iterator` | `Iterator` | Java iterators may be infinite and stateful; same in Rust |
| Stream | Iterator chain | Laziness matches; shape is `/idiomatic-rust` |
| Parallel stream | `rayon` | Shared mutable state, which becomes a compile error |
| `synchronized` | `Mutex<T>` | Rust guards data, not blocks, so fields move inside the mutex |
| `volatile` | `Atomic*` with ordering | Java volatile is sequentially consistent; naming the Rust ordering is required |
| `ExecutorService` | `rayon`, a thread pool, or `tokio` | CPU-bound versus IO-bound |
| `CompletableFuture` | `Future` + `tokio` | Eager versus lazy — `/async-rust` |
| Reflection | Derive macros, or explicit code | What the reflection actually did; usually serialization |
| Annotations | Attributes and derives | Whether the annotation carried behaviour or metadata |
| Spring DI | Explicit construction in `main` | The wiring becomes visible, which is the point |
| Jackson / JAXB | `serde` | Field naming strategies, null handling, and date formats — all observable |
| JDBC | `sqlx` / `diesel` | Connection pooling and transaction scope, which the framework was managing |
| `System.getenv` | `std::env` | A missing variable was null and is now explicit |
| `static` field | `OnceLock` / `LazyLock` | Class-loading order, which has no Rust equivalent |
| Logging (`slf4j`) | `tracing` | Structured consumers make format a contract question |

## The rows that are traps rather than mappings

- A hand-written `equals` that ignores fields — deriving changes
  behaviour; write the impl by hand and say why.
- Object identity comparison — `==` on references has no meaning in Rust;
  the code paths built on it are deleted, and the deletion is recorded.
- Any class hierarchy with a `visit` method — the visitor pattern is an
  enum plus a `match`, and translating the visitor keeps the workaround
  for the missing enum.
