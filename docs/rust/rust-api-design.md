## What it does

Governs what callers can see and rely on — the exported surface, trait design,
generics versus `dyn`, sealed traits, how a dependency gets into the API, and
which changes break semver. Everything it says about internals is incidental: the
re-export-from-`lib.rs` pattern exists so the internal tree can be reorganized
without a major version.

## When to reach for it

Model-invoked: the agent pulls this in on its own when designing or reviewing a
crate public surface, when choosing between a generic parameter and a trait
object, when adding a trait method or enum variant to a released crate, or when
asked whether a change is a breaking change. It does not decide what an argument
type should model (`/type-driven-design`), the shape of the error type
(`/rust-errors`), whether a public function should be `async` (`/async-rust`), or
the safety contract of a `pub unsafe fn` (`/unsafe-rust`). The user can run it
directly, as `/rust-api-design`.

## Prerequisites

A crate with a public surface someone else consumes — a published crate, or an
internal one with downstream callers. For a binary with no library target, most
of the skill does not apply: there is no semver promise to keep, and the
surface-discipline sections still help, but the breaking-change table does not.

## Generics, dyn, and sealed traits

- **The decision table.** Monomorphized speed wants generics; heterogeneous
  collections and smaller binaries want `dyn`; object safety usually settles the
  cases the table leaves open. A generic method, a `Self` return, or an
  associated function with no `self` rules a trait out as `dyn`, unless it opts
  out with `where Self: Sized`.
- **Traits are for shared behaviour**, not namespacing. Few required methods,
  defaults for the rest (a default method may carry its own bound), associated types for the one-sensible-choice, generics
  for the several-choices.
- **Sealed traits** freeze the implementer set to the crate itself, so methods
  can be added later without breaking anyone — the pattern is in the skill body
  because readers reproduce it wrong from memory.
- **`pub(crate)` as the default habit** (or the narrower `pub(super)` and
  `pub(in path)`), with the surface re-exported from `lib.rs`, keeps the
  internal tree free to move. Names are re-exported one by one; a glob re-export
  is accepted only for a `cfg(target_os)` platform module.

## The injection ladder

A dependency gets in through the lowest rung that expresses the requirement: a
concrete type first, then a wrapper struct, then a generic parameter, then
`dyn Trait`. Climb only when the current rung cannot express the need — never
for a test-only need (ADR 0006 belongs to `/rust-testing`). The cost of each rung
is in `DEPENDENCY-INJECTION.md`; the rules the surface itself must obey — one
path per item, no `Arc` or `Box` in a public signature, no leaked dependency
types — and the ergonomics that cost nothing are in `SURFACE.md`.

## Construction, standard traits, features

- **`CONSTRUCTION.md`** picks the constructor shape by the number of knobs:
  inherent variants for one or two optional inputs, a separate builder type from four
  permutations, grouped parameter types for long required lists, `Default` for
  all-public option bags. Builders use field-named, infallible setters and validate
  in `build()`; borrowing setters are the default, consuming ones only when the
  terminal method moves a value out.
- **`STANDARD-TRAITS.md`** lists the standard traits a public type implements
  eagerly (callers cannot add them: orphan rule) and when to hold each back,
  collection and iterator traits, the `Send`/`Sync` compile-time test, bound-free
  struct definitions, marker traits, and destructor rules: never fail, never block.
- **`FEATURES.md`** keeps cargo features additive (no gated fields or trait
  methods, no feature that changes an item) and covers `no_std` libraries: the
  `core`/`alloc`/`std` layers, additive `std` and `alloc` features, a no-OS CI
  cross-compile, fallible allocation.
- Foreign-crate re-exports are off by default, with four exceptions; libraries ship
  no prelude by default, with one narrow exception. Library rules bind harder than
  application ones.

## What breaks callers

Adding an enum variant or a struct field is breaking unless the type is
`#[non_exhaustive]`; adding a required trait method is breaking, a default body
is not; changing a concrete return type to `impl Trait` is; raising the MSRV is
not technically semver but is treated as breaking (raising it conservatively in
minor releases is the common alternative, trading surprise for freedom). Adding a
blanket impl, making a trait non-object-safe, and removing `const` also break;
`#[non_exhaustive]` (on a type or a single variant) is skipped for closed sets and when a major bump is preferred,
because it forces wildcard arms downstream. The full table, with the
non-obvious rows (adding a trait impl, default features, feature removal) and
the apply-it-at-release-time rule for `#[non_exhaustive]`, lives in `SEMVER.md`.

## Common questions

**Should I re-export a dependency?** Not by default. Do it when its type appears
in your API, for umbrella crates, technical splits, and hidden macro paths.

**Does `#[non_exhaustive]` remove all future breakage?** No — it covers adding
variants and fields only. Removing them, renaming the type, or changing a
variant shape still breaks, and adding the attribute after release is itself a
break.

**Is a change that only adds a derive ever breaking?** Usually not, but yes when
it creates inference ambiguity or conflicts with a downstream impl — the table
in `SEMVER.md` covers the line.

**Does this apply to a private helper crate nobody depends on?** The
breaking-change discipline does not — there is no downstream promise. The
surface-hygiene habits (`pub(crate)` default, re-exports) still pay, because the
crate may grow a consumer later.

## It's working if

- The public surface is re-exported from `lib.rs` and the module tree underneath
  is private.
- Every public item is documented — `cargo doc --no-deps` is clean.
- Each generics-versus-`dyn` choice is deliberate against the table, and object
  safety was checked where `dyn` was chosen.
- A trait that will grow methods is sealed.
- A change to a released crate was checked against `SEMVER.md` — or with
  `cargo semver-checks` when the tool is present — before it was called
  non-breaking.
- No public type is missing a derive it should carry.
- No public signature names an `Arc`, `Rc`, `Box` or `RefCell`.
- Every item has exactly one public path.
- Every public type derives `Debug`.
- No library ships a prelude, except a deliberately curated, small one.
- Public types carry the standard traits they honestly support, and `Send`/`Sync`
  are locked in by a test.
- Features are additive and a `no_std` build is checked in CI.

## Where it fits

`rust-api-design` is the public-surface skill in the language-craft group — it
decides what callers can rely on, and it is where the other craft skills defer
semver questions: error-type changes from `/rust-errors`, model changes from
`/type-driven-design`, `async` commitments from `/async-rust`, and `pub unsafe
fn` contracts from `/unsafe-rust`. See `rust-skills-map` for how the full set of
Rust skills relates.
