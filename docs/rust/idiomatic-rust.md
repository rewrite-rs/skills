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

## Iterators, conversions, derives, newtypes

- **Iterators** — collect into the target type directly rather than pushing into a
  `Vec` and converting afterward; compose `?` with iteration via
  `.collect::<Result<Vec<_>, _>>()`. A plain `for` loop still wins when the body has
  real side effects or an early exit with state a combinator chain would obscure.
- **Conversions** — implement `From`, get `Into` for free; use `TryFrom` when the
  conversion can fail. A free function named `to_foo`/`from_bar` where a trait impl
  belongs is a sign this rule was skipped.
- **Derives** — `Debug`, `Clone`, `PartialEq`, `Default`, `Hash` by derive before by
  hand. Hand-write only when the derive would be wrong: an invariant-preserving
  `Default`, a `Debug` that must redact a secret field, a `PartialEq` that must
  ignore a field the derive would compare.
- **Newtypes** — `struct UserId(u64)` costs nothing at runtime and turns an
  argument-order bug into a compile error.

## Naming

- **Names earn every word** — `Bookings`, not `BookingService`: `Service`,
  `Manager`, `Helper`, `Util`, `Data`, and `Info` mark a name nobody finished. The
  test is the call site — `bookings.cancel(id)` against `booking_service.cancel(id)`.
- **The cost prefixes are a promise** — `as_` is a free borrow-to-borrow view, `to_`
  allocates or clones, `into_` consumes. A `to_` that is free is merely surprising;
  an `as_` that allocates is a lie the reader will not check.
- **Accessors and case** — no `get_` on a field accessor (`fn name(&self)`,
  `fn name_mut(&mut self)`); acronyms are words (`HttpClient`, `Uuid`); a helper that
  does not need `Self` is a free function in the module, not an `impl` block used as
  a namespace.

The tiers table and worked pairs live in `NAMING.md`.

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

## Where it fits

`idiomatic-rust` is the expression-level skill in the language-craft group — it
governs how correct code is written, not whether it's correct or how it's owned. It
sits next to `/ownership-not-clone` (borrow and ownership tradeoffs), `/rust-errors`
(error type design), and `/type-driven-design` (making illegal states
unrepresentable), each of which owns a decision this skill deliberately defers. See
`rust-skills-map` for how the full set of Rust skills relates.
