---
name: idiomatic-rust
description: Write Rust that reads like Rust — iterator pipelines over index loops, From/Into over ad-hoc converters, derives over hand-written impls, newtypes over bare primitives. Use when writing new Rust, when reviewing Rust that reads like a translation from another language, or when the user asks how to make Rust code more idiomatic or less repetitive.
---

# Idiomatic Rust

Rust rewards code shaped around its own idioms, not code shaped around whatever
language it was translated from. This skill is about *expression*: given a piece of
logic, what is the form a Rust reader expects to see? It does not decide whether to
clone, how to model errors, or how to make an illegal state unrepresentable — those
are separate calls, deferred below.

## The shape of idiomatic Rust

Prefer expressions over statements. A `match` that returns a value beats a `match`
that assigns to a `let mut` in every arm; an `if let` chain that produces the answer
beats a flag variable set inside a loop and checked after it. The type system exists
to carry invariants so runtime checks don't have to — if a function only makes sense
for a non-empty collection, take `&[T]` plus a check once at the boundary, or better,
a type that can't be empty, rather than re-checking `.is_empty()` at every call site.

## Iterators

Reach for the iterator pipeline before the index loop. `for i in 0..v.len() { ... v[i] ... }`
almost always has a direct iterator equivalent, and the iterator version fails to
compile if you get the bounds wrong instead of panicking at runtime.

Collect into the type you actually want, not into a `Vec` you then convert:

```rust
// Reads like a translation.
let mut names = Vec::new();
for user in &users {
    names.push(user.name.clone());
}

// Reads like Rust.
let names: Vec<String> = users.iter().map(|u| u.name.clone()).collect();
```

`collect` isn't limited to `Vec` — it works for `HashMap`, `HashSet`, `String`, and
`Result<Vec<_>, _>`. That last one is how `?` composes with iteration: map a fallible
function over a collection, then collect into a `Result` to short-circuit on the
first error and get every item back as a `Vec` on success.

```rust
fn parse_all(lines: &[&str]) -> Result<Vec<i64>, ParseIntError> {
    lines.iter().map(|line| line.parse::<i64>()).collect::<Result<Vec<_>, _>>()
}
```

A plain `for` loop still reads better than forcing a chain when the body has real
side effects (writing to a file, sending on a channel per item) or needs an early
exit that carries complex accumulated state that a combinator would only obscure.
Don't chain `.fold()` five combinators deep to avoid a `for` loop that would read
more plainly — the goal is clarity, not iterator-chain purity for its own sake.

## Conversions

When one type can be built from another, implement `From`, and `Into` comes free
through the blanket impl — never write both directions by hand, and never write
`fn to_foo(x: Bar) -> Foo` as a free function or inherent method where a trait impl
belongs. Callers, and other trait bounds written against `Into<Foo>`, get the
conversion without knowing your type exists.

```rust
struct Celsius(f64);
struct Fahrenheit(f64);

impl From<Celsius> for Fahrenheit {
    fn from(c: Celsius) -> Self {
        Fahrenheit(c.0 * 9.0 / 5.0 + 32.0)
    }
}
```

When the conversion can fail, implement `TryFrom` instead of `From` plus a panic, or
a `From` that returns some sentinel value. A `TryFrom` impl composes with `?` and
signals fallibility at the type level, so a caller can't forget to handle it.

## Derives before hand-written impls

Reach for `#[derive(Debug, Clone, PartialEq, Default, Hash)]` before writing any of
those by hand. A derived impl is generated from the actual fields on the struct, so it
stays correct as the struct changes — a hand-written one silently drifts the moment
someone adds a field and forgets the impl.

Write the manual version only when the derive would be wrong, not merely longer:

- A `Default` that must preserve an invariant the field-wise default breaks — e.g. a
  `Default` for `Percentage` that gives 0, not the zero value for each field
  independently, if the fields are meant to always sum to 100.
- A `Debug` that must redact a secret field (an API key, a password) rather than
  print it — never derive `Debug` on a type holding a credential.
- `PartialEq` where two logically-equal values can differ in a field that shouldn't
  count (a cached hash, a timestamp) — derive would compare it anyway.

For a plain enum, `#[derive(Default)]` with `#[default]` on the intended variant
beats a hand-written `impl Default`:

```rust
#[derive(Default)]
enum Mode {
    #[default]
    Interactive,
    Batch,
}
```

## Newtypes

`struct UserId(u64)` costs nothing at runtime — it compiles to the same bits as a
bare `u64` — and it closes off an entire class of bugs where two arguments of the
same primitive type get swapped at a call site. `fn transfer(from: UserId, to: UserId)`
cannot be called with the arguments reversed and still compile if `from` and `to`
were both plain `u64`; the newtype makes the swap a type error instead of a bug
report. Reach for a newtype anywhere a bare `u64`, `String`, or `f64` is standing in
for a domain concept (an ID, a currency amount, a normalized score) rather than
genuinely being used as a number or string.

## Boilerplate that is actually a design signal

Not all repetition is a `derive` away from disappearing. Sometimes five near-identical
`match` arms, or a wrapper type with ten forwarding methods, are pointing at a missing
abstraction rather than a missing shortcut. See `BOILERPLATE.md` in this skill's
directory for concrete before/after pairs — including the cases where the fix is a
combinator or a derive, and the one case (`Deref` for inheritance-style forwarding)
where the "fix" is itself the anti-pattern.

## Deferrals

This skill governs expression, not decision-making. When the question is whether to
clone or to redesign the borrow, that's the `/ownership-not-clone` skill. When the
question is how to model an error type, that's the `/rust-errors` skill. When the
question is how to make an illegal state unrepresentable in the first place — not
just less repetitive to check — that's the `/type-driven-design` skill. Reach for
those directly rather than trying to answer them here.

## Verification

Idiomatic-rust changes are usually pure refactors — same behavior, different shape —
so run the standard trio before considering the change done:

```bash
cargo clippy --all-targets   # add -- -D warnings only if the repo has no lint config
cargo fmt --check
cargo test
```

Run clippy at the lint level configured in the repo; don't add `-D warnings` on top of
a repo that already has a `clippy.toml` or lint attributes of its own. Treat
`clippy::pedantic` findings as proposals worth considering, not violations to fix
automatically, unless the repo has explicitly opted into that lint group.
