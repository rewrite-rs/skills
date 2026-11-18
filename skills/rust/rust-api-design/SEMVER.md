# Semver

The full breaking-change reference for a released crate. Apply it by hand when
`cargo semver-checks` is unavailable, and use it as the table to propose from
when a change is borderline.

| Change | Breaking? | Why | Mitigation |
|---|---|---|---|
| Adding an enum variant | Yes, unless `#[non_exhaustive]` | Downstream exhaustive `match` no longer compiles | Mark the enum `#[non_exhaustive]` |
| Adding a public struct field | Yes, unless `#[non_exhaustive]` | Breaks literal construction and exhaustive deconstruction separately | Mark the struct `#[non_exhaustive]` |
| Adding a required trait method | Yes | Existing implementers no longer compile | No, if it has a default body |
| Adding a trait supertrait | Yes | Implementers must now satisfy the new bound too | None after release — plan it in |
| Sealing a trait after release | Yes | Downstream implementers are no longer legal | Seal at release time, not later |
| Removing a trait impl | Yes | Code that relied on the impl no longer compiles | Deprecate first, remove in a major version |
| Adding a trait impl | Usually no | New capabilities break no one | Yes when it creates inference ambiguity or a coherence conflict for a downstream impl |
| Changing a concrete return type to `impl Trait` | Yes | The concrete type was part of the API — callers stored it, named it | Keep the concrete type; hide it only for types you never exposed |
| Narrowing a generic bound | Yes | Callers who satisfied the old bound may not satisfy the new one | Widen instead, or pay the major version |
| Widening a generic bound | No | Everything that worked before still works | — |
| Renaming a public item | Yes | The old path no longer exists | Re-export the old name as a deprecated alias |
| Adding `#[must_use]` | No | Warning at worst, for callers who discarded the value | — |
| Raising the MSRV | Not technically semver | Treat it as breaking anyway: a caller on the old toolchain stops compiling, which is what a semver break *is* — document the MSRV change in the release notes | Keep the MSRV pinned in `Cargo.toml` and bump it deliberately, with notice. The common alternative is raising it conservatively in minor releases, with the oldest toolchain you can reasonably support; that frees the crate to adopt new language features, at the cost of surprising pinned downstream users, so pick it only when the audience tracks recent toolchains |
| Adding a blanket impl | Yes | It can overlap an impl a downstream crate already wrote, or make a method call ambiguous | Add it only in a major version, or bound it so tightly it cannot overlap |
| Making a trait non-object-safe | Yes | `dyn Trait` users stop compiling; adding a generic method or a `Self`-returning method does it | Add `where Self: Sized` to the new method so it stays out of the vtable |
| Making a private item public | No | Nothing that compiled stops compiling | — |
| Making a public item private | Yes | Every caller of the path breaks | Deprecate, then remove in a major version |
| Removing `const` from a public function | Yes | Callers in `const` contexts stop compiling | Add `const` to a function only when you are ready to keep it forever; adding it is not breaking, removing it is |
| Changing the licence | Treat as yes | A dependent whose policy forbids the new licence cannot upgrade | Announce it as a major release |
| Adding a default cargo feature | Usually no | Opt-in by default changes what compiles for new dependents | Yes if it changes behaviour — a feature that flips semantics on by default is a behaviour change, not a build change |
| A feature that changes or removes a public item | Yes | Features are additive; see `FEATURES.md` | Gate whole items, never fields or trait methods |
| Removing a feature | Yes | Dependents that enabled it no longer build | Deprecate first, remove in a major version |

## `#[non_exhaustive]`, applied at release time

The attribute is the only way to keep "add a variant" and "add a field"
non-breaking — but adding it *later* is itself a breaking change, because
downstream code that constructed the type literally or matched it exhaustively
stops compiling the moment it appears. Apply it at release time to every enum
and struct the crate expects to grow. The test: if the type will ever gain a
variant or a field without a major version, it needs the attribute on day one.

### When not to apply it

Apply `#[non_exhaustive]` to library types expected to grow. Skip it for:

- stable closed sets: a two-state enum, a mathematical or protocol-fixed set
  (the days of the week, a colour model's channels) that will not gain members;
- types where you would rather take a major-version bump than constrain callers.

The attribute has a price: every downstream `match` on the enum must carry a
wildcard arm, which hides new variants from the compiler until a human reads the
release notes, and a struct with it cannot be built with a literal outside the
crate. Use it sparingly, then, not by reflex. Callers matching a
`#[non_exhaustive]` enum list every variant they handle and add a wildcard for
the rest, and can switch on the compiler lint for omitted patterns (and the
`clippy::exhaustive_enums` lint helps the authoring side find public enums
lacking the decision) so a new variant at least warns.

The attribute also goes on a single enum variant, where it stops downstream code
from constructing that variant with a literal or matching its fields without a
`..` rest pattern, so fields can be added to that variant alone.

Inside one crate the attribute has no effect. To stop other modules building a
struct literal, add a private zero-sized field (`_priv: ()`), which also makes the
struct impossible to construct outside the defining module.
