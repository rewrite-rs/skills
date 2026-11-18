## What it does

Rewrites Rust so it reads like Rust instead of like a translation from another
language — iterator pipelines instead of index loops, `From`/`Into` instead of ad-hoc
converter functions, derives instead of hand-written impls, newtypes instead of bare
primitives standing in for domain concepts. The defining constraint: this skill only
changes how code is *expressed*. It does not decide whether to clone, how to shape an
error type, or how to make an illegal state unrepresentable — it defers every one of
those to its sibling skills and will not tell you whether to clone.

## When to reach for it

Model-invoked: the agent pulls this in on its own when writing new Rust, when
reviewing Rust that reads like it was translated line-by-line from another language,
or when asked to make code more idiomatic or less repetitive. It does not cover
ownership tradeoffs (that's `/ownership-not-clone`), error type design (that's
`/rust-errors`), or type-level modelling of invalid states (that's
`/type-driven-design`) — those are shape-preserving decisions this skill leaves
alone even when the surrounding code also gets touched. The user can run it
directly, as `/idiomatic-rust`.

## Principles

Readability beats writeability, uniform shapes let tools and sweeps change code in one
pass, and consistency with the ecosystem beats local taste. The baseline is the
conventions the Rust project and the standard library already set, unless the repo has a
settled convention that differs.

## Iterators, conversions, derives, newtypes

- **Iterators** — collect into the target type directly rather than pushing into a
  `Vec` and converting afterward; compose `?` with iteration via
  `.collect::<Result<Vec<_>, _>>()`. A plain `for` loop still wins when the body has
  real side effects, an early exit with state a combinator chain would obscure, or a
  large body that does several jobs.
- **Conversions** — implement `From`, get `Into` for free, and never implement `Into`
  or `TryInto` directly; use `TryFrom` when the conversion can fail. Widening numbers is `From` (`u32::from(x_u16)`); narrowing is `TryFrom`, never `From<u32> for u16`. A free function named `to_foo`/`from_bar` where a trait impl
  belongs is a sign this rule was skipped.
- **Derives** — `Debug`, `Clone`, `PartialEq`, `Default`, `Hash` by derive before by
  hand. Hand-write only when the derive would be wrong: an invariant-preserving
  `Default`, a `Debug` that must redact a secret field, a `PartialEq` that must
  ignore a field the derive would compare. `Copy` for small plain data, never large or resource-owning types; no `Clone` on unique-access
  handles or secret key material; `Eq` with `PartialEq` except for floats; `Hash` agrees
  with `Eq`; `PartialOrd` always ships with a matching `Ord`.
- **Newtypes** — `struct UserId(u64)` costs nothing at runtime and turns an
  argument-order bug into a compile error. A type alias does not; use a newtype when
  meaning differs, when the type needs its own API, when the representation may change,
  or to wrap a type when neither it nor the trait is yours.
- **Bounds** — ask for `Into<T>` to accept any `From` impl; ask for `TryInto<T>` when
  failure is acceptable.

## Naming

- **Names earn every word** — `Inventory`, not `InventoryManager`: `Service`,
  `Manager`, `Helper`, `Util`, `Data`, and `Info` mark a name nobody finished. The
  test is the call site — `inventory.reserve(sku)` against `inventory_manager.reserve(sku)`.
- **The cost prefixes are a promise** — `as_` is a free borrow-to-borrow view, `to_`
  allocates or clones, `into_` consumes. A `to_` that is free is merely surprising;
  an `as_` that allocates is a lie the reader will not check.
- **Accessors and case** — no `get_` on a field accessor (`fn name(&self)`,
  `fn name_mut(&mut self)`); acronyms are words (`HttpClient`, `Uuid`); a helper that
  does not need `Self` is a free function in the module, not an `impl` block used as
  a namespace.

- **Cost, ownership, and case** — `to_` covers borrowed-to-borrowed work, borrowed-to-owned
  for non-`Copy`, and owned-to-owned for `Copy`; `into_` is owned-to-owned with variable
  cost; `as_` and `into_` expose the representation; `mut` keeps type order
  (`as_mut_slice`). Types, traits, and variants are `UpperCamelCase`; functions,
  modules, and locals `snake_case`; constants `SCREAMING_SNAKE_CASE`. A bare `get` fits
  one obvious value, and a checked accessor can have an `unsafe get_unchecked` sibling.
- **Replace Java words** — `Builder` not `Factory`, `Drop` not a disposal manager,
  `impl Fn() -> T` not a factory type, and at most two short words per name.
- **Constructors in detail** — `with_*` when it stands in for `new`, a `*_with_*` suffix
  when it varies another named constructor; `new` beside `Default` even if identical,
  only one `Default` per type; an important `From` may be paired with an inherent
  constructor; a fallible `new` returns `Result` (follow the repo if it standardises on
  `try_new`); the owner of the extended type is the natural home of its `Ext` trait.
- **Naming families** — constructors (`new`, `with_*`, `from_*`, and a verb such as
  `open` for one that acquires a resource), the accessor family (`name`, `name_mut`,
  `set_name`, `take_name`, `into_inner`), iterator types named after their method
  (`keys()` returns `Keys`), verb-object-`Error` error names, `Ext` on extension traits,
  and features named for what they turn on, never `no-*`.

The tiers table, the family tables, and worked pairs live in `NAMING.md`.

## Patterns and readability

Classic design patterns shrink in Rust, so the skill writes the small form first:

| Pattern | Small form | Named form once |
|---------|------------|-----------------|
| Strategy | closure parameter | the strategy has several methods — a trait |
| Command | enum, one variant per action | other crates add actions — `Box<dyn Trait>` |
| Visitor / fold | recursive `match` | several passes walk a tree of mixed node kinds |
| `try`/`finally` (RAII) | guard type with `Drop`, data exposed through `Deref` | — |
| Interpreter | skip unless a small language really recurs | grammar plus recursive `match` |

Stored commands may also be capture-free `fn` pointers in a table or boxed closures; the
enum stays the default when the crate owns the set. A strategy bound as a generic gives
static dispatch, and `Option::map` is often the strategy already. `Drop` is skipped by
abort, infinite loops, and panics during unwinding, so essential work goes in an explicit
method. `Vec` and `String` deref to their views; wrappers should not. Optics are reading
vocabulary for APIs like serde, not something to build.

Readability choices it applies: `if let` / `let ... else` instead of a check followed by
`unwrap`, a type on the binding where `.parse()` or `.collect()` hide it, `TryFrom`
instead of an `as` cast that can truncate, `format!` instead of `+`, named fields instead
of a long-lived tuple, short iterator chains bound to a name before a `for`, and
functions called through their module (`fs::read_to_string`), a comment on each
unavoidable `bool` literal, one module per `use` line, traits imported in the function
that needs them, and no globs except tests, a local enum, or a documented framework
prelude (pin a dependency you glob anyway). `PATTERNS.md` and
`READABILITY.md` hold the before-and-after pairs.

## Common questions

**Does this skill decide whether to clone here or restructure the borrow?** No — that
call belongs to `/ownership-not-clone`. This skill only reshapes expression, not
ownership.

**Will it redesign my error enum?** No — `/rust-errors` owns error type design. This
skill will remove repeated `.map_err(...)` closures with `#[from]` (see
`BOILERPLATE.md`), but the shape of the enum itself is not its call.

**Is every `Deref` impl on a wrapper type wrong?** No — `Deref` is correct for actual
smart pointers. It's wrong specifically when used to forward the whole method
surface for inheritance-style convenience; see the `Deref` section of
`BOILERPLATE.md` for the distinction.

**Is `get_` ever right?** Yes — where the operation genuinely looks something up and
can fail, as in `HashMap::get`, which returns `Option<V>` because the key may be
absent. On a plain field accessor it is dead weight: the accessor is
`fn name(&self)`, the mutable one `fn name_mut(&mut self)`.

**Does the `as_`/`to_`/`into_` rule apply to my own types?** Yes — that is the point.
The convention is only worth anything if every crate keeps it: `as_` stays a free
view, `to_` earns its allocation, and `into_` consumes its input.

**Should I implement the visitor or strategy pattern here?** Usually not by name. A
one-method strategy is a closure parameter, and a visitor only pays off over a tree
of mixed node kinds that several passes walk. `PATTERNS.md` gives the point where each
pattern earns its full form.

**Is `as` ever fine?** Yes, where truncation is the point — hashing, bit packing, a C
interface — with a comment saying so. Between numeric types elsewhere, `From` and
`TryFrom` say whether the conversion can lose data; `as` never does.

**Can I wrap a `Deref` around a newtype to avoid forwarding?** No; use explicit
forwards, a trait, a delegation crate, or a derive crate for trait surface.

## It's working if

- Index loops (`for i in 0..v.len()`) are gone in favor of iterator adaptors where
  the loop body was a pure transformation.
- No hand-written `to_foo`/`from_bar` free functions remain where a `From`/`TryFrom`
  impl would do the same job.
- `Debug`, `Clone`, `PartialEq`, `Default`, and `Hash` are derived except where a
  comment explains why the derive would be wrong.
- Bare primitives that stand in for a domain concept (an ID, a currency amount) have
  become newtypes.
- No new `Deref` impl exists purely to forward the method surface of a wrapper.
- No `is_some()` or `is_ok()` check is followed by an `unwrap()` of the same value.
- Numeric `as` casts that could truncate have become `From` or `TryFrom`, or carry a
  comment saying why truncation is intended.
- `Eq`, `Hash`, and `Ord` impls agree with each other, and `Copy` appears only on small
  plain-data types.
- Constructors, accessors, and `as_`/`to_`/`into_` methods follow the naming tables.
- Cleanup that must run on early return sits in a guard with `Drop`, not repeated
  before every `return`.
- Only the files you changed were formatted; any untouched file flagged by
  `cargo fmt --check` was left alone and mentioned.

## Where it fits

`idiomatic-rust` is the expression-level skill in the language-craft group — it
governs how correct code is written, not whether it's correct or how it's owned. It
sits next to `/ownership-not-clone` (borrow and ownership tradeoffs), `/rust-errors`
(error type design), and `/type-driven-design` (making illegal states
unrepresentable), each of which owns a decision this skill deliberately defers. See
`rust-skills-map` for how the full set of Rust skills relates.
