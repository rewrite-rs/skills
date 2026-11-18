# The surface

The depth for the surface section of `SKILL.md`: the shapes a public signature
refuses, the paths items may occupy, the parameter types that cost nothing, and
the derives a public type owes its callers.

## Abstractions do not visibly nest

A caller should not have to understand two layers to use one. A return type of
`Wrapper<Handle<Inner>>` makes the caller learn the whole stack to write one
line.

## No `Arc`, `Rc`, `Box` or `RefCell` in a public signature

Those are how the crate stores the thing, not what the caller has. Take `&T` or
`impl Into<T>`, return the value or a handle type that hides the pointer. The
exception is a smart pointer that is the point of the API (shared ownership is
the contract) or one a benchmark showed necessary; write the reason down. A
`dyn` trait object, when it must be exposed, goes inside a purpose-built wrapper
struct rather than bare; see `DEPENDENCY-INJECTION.md`.

## Visibility is easier to widen than to narrow

Making a private item public later is a minor change; making a public item private
is breaking. That asymmetry is why the default is private. When an item must be
seen beyond its own module but not outside the crate, pick the narrowest
restriction that works: `pub(super)` reaches only the parent module,
`pub(in path)` reaches one named ancestor module, and `pub(crate)` reaches the
whole crate. Also remember that
`pub` on an enum exposes every variant and `pub` on a trait exposes every method,
so neither can be half-published: split the type if only part should be public.

## Fields stay private

A public field fixes the representation for good and makes it impossible to
maintain an invariant, since callers can write any value. Keep fields private and
offer methods. Public fields are only for passive C-style data with no
invariants at all (a point, a colour triple), and even then they commit the layout
and mean new fields break literal construction.

## Hide implementation types behind a newtype

Returning `Enumerate<Skip<I>>` publishes the adapter chain. Wrap it in a named
struct (`struct Pages<I>(Enumerate<Skip<I>>)`) implementing the traits you want to
promise, so the inside can change freely. Returning `impl Iterator` does the same
cheaply, with a cost: `impl Trait` is awkward when callers also need to name the
type, clone it or print it, since those bounds must be spelled out in the return
type. For internal APIs the awkwardness rarely matters; for a public API weigh it.

## Essential functionality is inherent

The methods a type cannot be used without are inherent methods, not trait
methods a caller must import a trait to reach. A trait is for the shared
vocabulary, not for the core of the type. When a trait impl also exposes that
functionality, have it forward to the inherent method (a `len` that just calls
`Inventory::len(self)`), so there is one implementation and a caller who never
imports the trait loses nothing.

## Methods, not free functions, when there is a receiver

A function with an obvious receiver is a method: it needs no import, it
autoborrows, and `self`, `&self` or `&mut self` states ownership in the signature.
(Whether to write a free function when there is no `Self` is `/idiomatic-rust`.)
A smart-pointer type adds no inherent methods, since they would shadow the
pointee's; use associated functions (`Rc::strong_count(&rc)`) so calls are never
ambiguous. Put a conversion on the more specific type (`str` knows how to become
bytes, not the reverse), and prefer the `to_`, `as_` and `into_` families over
`from_` constructors when you control the receiver, because they chain left to
right.

## Return what the caller already paid for

Return several values as a tuple or a small struct, not through `&mut` out
parameters; the one exception is reuse of a caller-owned buffer (the shape of
`Read::read`), where the point is avoiding allocation. Expose intermediate results
the function computed anyway: the insertion point from a failed binary search, the
valid prefix and byte count in a UTF-8 error, the replaced value from a map
insert. The caller cannot cheaply recompute them.

## Uniform signatures

Give one concept one name, one position and one type in every function of the
crate: if `region` leads one signature, it leads them all. Inside a single
signature, order the arguments from most specific to most ambient. Arguments
particular to this call come first, shared context (a logger, an allocator, a
clock) after them, and a closure goes at the very end. Take at most one closure.

## Balanced modules, and splitting the crate

A module of thirty items next to one of two is usually one module that grew and
one that never did. When genuinely in doubt about whether something belongs,
split the crate: two crates with a clear dependency direction beat one crate
with an internal boundary nobody enforces.

Prefer small crates, ideally one file: they compose, they compile in parallel,
and others can reuse one piece without taking the rest. The costs are real:
nothing curates them on the registry, and less cross-crate optimisation happens
(`/rust-performance` covers link-time optimisation). A larger crate is justified
when the orphan rule forces types and impls into one place, or for a foundational
library everything else builds on. Decide crate boundaries before module
boundaries.

Inside a crate, a non-leaf module holds only `mod` declarations and re-exports;
a little glue that ties the children together is tolerated, but real logic lives
in leaves. The root may re-export items from deep leaves. Keep the items every
user needs at the crate root, and arrange the rest by the job they do (billing,
transport) instead of by what they are (all traits in one module, all errors in
another), so a reader finds a name without knowing its category. Re-export names
individually (`pub use parser::{Parser, Token};`) so the surface is greppable.
Do not write `pub use submodule::*;` in a non-leaf module: it hides which names
the crate promises, and a name added to the submodule silently joins the public
surface. The one accepted glob re-export is a platform module selected by
`cfg(target_os)` that presents one interface over several implementations.

## One path per item

An item is public at exactly one path. Re-exporting it under a second path
across iterations, so that both keep working, is the agent smell: it looks like
compatibility and is actually a surface nobody can document. If a path was
wrong, move it and take the breaking change.

## Do not leak external types

A type from a dependency in your public signature makes that dependency version
part of your semver contract. Wrap it, or convert at the boundary. The error
shape is the case `/rust-errors` owns — a dependency error type in a signature
is the same leak, with the same fix. The exception is a type so ubiquitous it
is effectively vocabulary (`std` types, and in practice `http::Uri`-class
crates the whole ecosystem shares) — and that exception is a judgment you write
down, not a default. A second exception is a type exposed only behind a cargo
feature (see `FEATURES.md`); a third is a type whose benefit is substantial
enough to be worth the coupling. Once your crate reaches 1.0, every crate whose
types show up in your API must itself be at 1.0 or later, since a breaking
release of that crate forces a breaking release of yours.

## Re-exporting a foreign type, when you must

The default is not to `pub use` another crate's items: callers depend on that
crate directly, and a re-export makes yours a second, version-coupled path to
it. Four cases justify an exception:

- A foreign type appears in your public API. Re-export the crate (or the type) so
  callers can name the exact matching version. Two semver-incompatible versions
  of the same crate coexist in one build, and a caller on the wrong one gets a
  baffling "trait bound not satisfied" for a type that looks identical. Treat
  that version as part of your contract from then on.
- An umbrella crate whose job is to gather other crates under one name.
- A crate split in two for technical reasons (a proc-macro companion, a `-sys`
  split) where users should still see one facade.
- A hidden path (`#[doc(hidden)]`) for macro expansions to name dependencies; see
  `/rust-macros`. Conversely, never reach into a `#[doc(hidden)]` item of someone
  else's crate: it carries no stability promise.

Before re-exporting for the first reason, ask whether the foreign type should be
in the signature at all.

## Reaching the wrapped value

A crate that abstracts something should let a caller get at the thing underneath
(`fn inner(&self) -> &T`, `into_inner`). Without such an accessor, the first
requirement you did not anticipate pushes a user to fork the crate.

## Ergonomic parameter types

Generic functions assume as little as they need: accept `impl IntoIterator<Item
= i64>` over `&[i64]` when the function only iterates, since the slice-taker
forces callers to collect first. For a library this is the default; application
code may take or return `Vec` and slices when that is simpler, because simplicity
and directness beat reusability there.

Take `impl AsRef<str>` where callers plausibly hold either form,
`impl AsRef<Path>` over `&Path` for a path parameter, `impl AsRef<[u8]>` for
data that is read as bytes whether it arrives as a `&str`, `String`, `Vec<u8>`
or `&[u8]`, and `impl RangeBounds<usize>` over three overloads. Reach for
`impl Into<String>` only when the convenience at the call site clearly outweighs
the extra compiled code each distinct instantiation adds; application code
should almost never take `impl Into`. A function that performs one blocking
read or write takes `impl Read` or `impl Write` by value, and because
`&mut R` also implements `Read`, callers pass `&mut file` to keep using the file
afterwards. A struct that stores the value owns it as a concrete `String` or
`PathBuf`, not a generic `AsRef` parameter that would spread to the type.
Generic code that bounds on a trait does not see methods reached through `Deref`
(a `String` in a `Deref`-forwarding wrapper is not a `&str` bound); that is why
`AsRef` and `Borrow` are the right bounds when you want to accept both.

Return `impl Iterator<Item = T>` rather than `Vec<T>` when the caller may not
want the allocation; return the vector when the caller needs ownership, random
indexing, or the function builds a collection anyway. Use sans-IO
design where the protocol logic is a state machine the caller drives, so it
works under any runtime and tests without a network. And derive the common
traits — `Debug` always, `Clone` and `PartialEq` where they make sense — while
adding them is still cheap: a missing derive can become a breaking change to
add later when it creates inference ambiguity or conflicts with a downstream
impl, and which side of that line a given derive falls on is in `SEMVER.md`. The
full menu and when to hold each back is in `STANDARD-TRAITS.md`.

## `#[must_use]`

Put it on a function when ignoring the return is almost certainly a mistake: a
pure function (a lookup, a computation) whose only effect is the result, or one
whose return carries an error or critical information. Skip it where the return
type already has it (`Result`). Put it on a type when every function returning it
should be checked: error types and lazy computations that do nothing until
consumed. Adding it later is not breaking (see `SEMVER.md`).

## Native handles

A type wrapping an operating-system or foreign handle offers an unsafe
constructor from the raw handle plus `into_native`/`to_native` accessors, each
documenting what the caller must guarantee (ownership, validity, close
responsibility). The safe path stays safe; the unsafe pair is the documented
escape hatch (`/unsafe-rust` for the contract text).

## Public types are `Send`, `Debug`, and sometimes `Display`

A public type that is not `Send` cannot cross a task boundary, which callers
discover late and cannot fix. Every public type derives `Debug`. A type meant to
be read by a human implements `Display`. And a `Debug` on a type holding a
secret needs a test proving the secret does not appear in the output — the
redacting-newtype pattern is in `/rust-observability`.
