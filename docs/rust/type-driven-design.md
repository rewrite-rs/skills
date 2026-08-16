## What it does

Changes what the types allow — the only skill in the Rust bucket that
restructures a domain model: enums over flag soup, parsed types over validated
strings, newtypes that carry an invariant, typestate for protocol order. It
stops at the point where the invariant is not a real bug class, and says so in
its own body rather than leaving the call to a reviewer.

## When to reach for it

Model-invoked: the agent pulls this in on its own when a struct has fields that
are only valid in some combinations, when validation is re-checked at many call
sites, when boolean flags multiply, or when asked how to model a domain in Rust.
It does not cover how the constructor reports rejection (`/rust-errors`),
whether tightening a published type breaks callers (`/rust-api-design`), or
borrow-checker pain that an ownership fix resolves first
(`/ownership-not-clone`). The user can run it directly, as
`/type-driven-design`.

## Enums, newtypes, and parsing

- **The gap is the bug surface.** Count constructible field combinations and
  valid ones; the difference is where bugs live. Two booleans where only three
  of four states make sense become an enum with three variants.
- **Parse, do not validate.** A type constructible only through a checking
  constructor validates once at the boundary; the private field is what makes
  the constructor the only way in.
- **Newtypes carry invariants.** `NonEmptyVec`, `Percentage`, `Sanitized<T>` —
  distinct from the argument-swap-safety newtype in `/idiomatic-rust`.
- **The stopping rule.** Encode an invariant in a type when violating it is a
  real bug class here, not when it is merely expressible.

## Typestate, and when it costs more than it saves

Protocol order — connect before send, build before finalize — can be a type
parameter, so an out-of-order call is a compile error. The worked `Connection`
example, the builder variant, and the three costs (error messages, storage,
public API leakage) live in `TYPESTATE.md`. The decision list: typestate for
small fixed state machines where out-of-order use ships a bug; a runtime state
enum with a `Result` when states are many, dynamic, or stored together.

## Numerics: count, measure, identify, or money

- **The type family first.** A count is an unsigned integer, a measurement a
  float only if it genuinely is one, an identifier a newtype that never does
  arithmetic, and money an integer of minor units.
- **`NonZero` for what cannot be zero**, and the overflow operator named
  explicitly — checked, saturating, or wrapping — rather than plain `+`.
- **`TryFrom` over `as`** at the boundary, once.
- **Floats compare badly.** No `==` without an epsilon appropriate to the
  magnitude, and sorting goes through `total_cmp`.
- The worked `Cents` versus `Meters` example, with the range-checking
  constructor, lives in `NUMERICS.md`.

## Common questions

**Newtypes appear in both `/idiomatic-rust` and here — what is the difference?**
In `/idiomatic-rust` a newtype prevents argument swaps and names a domain
concept; the field may be public and no check runs. Here the newtype carries an
invariant a private constructor enforces — `Percentage` only ever holds 0–100
because the only way in checks it. Same shape, different job.

**If the enum is already `#[non_exhaustive]`, does this skill still apply?**
Yes, and more strongly: the type is public API, so adding a state is a change
`/rust-api-design` reviews, and the modelling cost is paid at every caller.

**When is a runtime check the better trade over a type?**
When the states are many, dynamic, or stored in a collection — erasing a
typestate back into an enum gives back most of the cost without keeping the
safety.

## It's working if

- In the touched models, the constructible states equal the valid states — the
  impossible combination no longer compiles.
- Validation that ran at every call site now runs once, at the boundary, behind
  a private constructor.
- The runtime checks the new types made impossible are deleted, not left in
  place — grep confirms the now-impossible branch is gone.
- Tests that asserted the old runtime rejection were removed or rewritten to a
  compile-fail expectation.
- No typestate machine with more than a handful of fixed states was introduced
  for a struct built once.
- No `as` cast between integer types outside a place where truncation is the
  documented intent; no float `==`.
- `cargo test` passes at the lint level configured in the repo.

## Where it fits

`type-driven-design` is the modelling skill in the language-craft group — it
decides what the types allow, and it is the skill the other craft skills defer
to when a borrow or an error turns out to be an invariant problem. Constructor
rejections are `/rust-errors`, published-type changes are `/rust-api-design`,
and a model change forced by borrow pain runs `/ownership-not-clone` first. See
`rust-skills-map` for how the full set of Rust skills relates.
