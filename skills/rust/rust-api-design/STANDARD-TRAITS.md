# Standard traits and destructors

The depth for what a public type implements so it behaves like the rest of the
ecosystem, and how it cleans up. The cheap-while-early derive rule is in
`SURFACE.md`; the breaking-change side is in `SEMVER.md`.

## Implement eagerly, because callers cannot

Offer each standard trait the type can honestly support. The candidates are the
duplication pair (`Copy`, `Clone`), the comparison family (`PartialEq`, `Eq`,
`PartialOrd`, `Ord`), `Hash`, the formatting pair (`Debug`, `Display`) and
`Default`. The
orphan rule means a downstream crate cannot implement a foreign trait for your
type, so if you do not, nobody can, and the caller is left wrapping your type in a
newtype just to put it in a `HashSet`. Adding one later can also break callers, so
early is both kinder and cheaper.

Choose each one on meaning, not on what compiles:

| Trait | Add it when | Hold back when |
|---|---|---|
| `Copy` | The type is small and will clearly stay `Copy`; losing it later is a break | It may gain a heap field or a resource |
| `Clone` | Duplicating is meaningful, which is most types | The value owns an external resource such as a socket or a lock guard |
| `PartialEq` | Always sensible for data | Equality is not meaningful (a handle to a live resource) |
| `Eq` | Equality is reflexive; the weaker `PartialEq` is the default | Floats or `NaN`-like members are inside |
| `PartialOrd` | An order exists, even a partial one | Always prefer it over `Ord` unless you truly need a total order |
| `Ord` | The order is total and callers sort or key a `BTreeMap` with it | The order is arbitrary and would be a promise you never meant to make |
| `Hash` | The type is a likely map or set key; it must agree with `Eq` | `Eq` is absent |
| `Default` | A natural zero or empty state exists, or `new()` takes no arguments | No default state makes sense |

A map key wants `Hash` and `Eq`, plus `Ord` only when the order is clearly total.
A struct whose fields are all public implements every trait all of its fields
implement, since callers can already see and compare each piece.

When a type offers `Default` and an empty `new()`, make the two behave
identically; two zero-argument constructors that differ surprise everyone.

An application-only type is different: add trait impls on demand, when a caller in
the same codebase first needs one. A low-level library anticipates the callers it
cannot see.

## Conversions and collections

Implement `From`/`TryFrom` for conversions, and `AsRef` and `AsMut` for cheap
borrowed views. A type that holds a collection of items implements
`FromIterator<T>`, which lets `collect` build it, and `Extend<T>`, which lets
`partition` and `unzip` fill it, with no special-case code. It also implements
`IntoIterator` for the owned type and for `&`, plus `&mut` where mutation makes
sense, so a `for` loop accepts all three forms. Add `DoubleEndedIterator`
and `ExactSizeIterator` when the underlying order and count allow, and keep
`size_hint` truthful: a lie there breaks `collect` pre-allocation and any
`ExactSizeIterator` consumer.

Formatting details that callers notice:

- A type that is a bit set, combined with bitwise or and and, implements
  `LowerHex`, `UpperHex`, `Octal` and `Binary`. A pure quantity (a count of
  nanoseconds) does not need them.
- Every public type is `Debug`; exceptions are rare and deliberate (a secret
  holder, with a redacting impl instead). `Debug` output is never empty, even for
  an empty value: an empty string prints as `""`, an empty list as `[]`.

## Thread-safety is automatic until it is not

`Send` and `Sync` are implied by the fields. A type holding a raw pointer loses
both silently, so check it deliberately and write the `unsafe impl` only with a
justification (`/unsafe-rust`). Lock the guarantee in with a compile-time test so
a later field cannot quietly remove it:

```rust
fn assert_send_sync<T: Send + Sync>() {}

pub struct Session {
    id: u64,
}

#[test]
fn session_is_send_and_sync() {
    assert_send_sync::<Session>();
}
```

Futures returned by public async functions are expected to be `Send` too, so a
caller can spawn them; check that the same way (`/async-rust`). A nameless
constant that points at the helper (`const _: fn() = assert_send_sync::<Session>;`)
does the same work at build time, with no test run needed.

## Struct definitions carry no derivable bounds

Write `struct Wrapper<T>` and let the derive add `T: Clone` to the generated impl.
Writing `T: Clone` on the struct itself (or any other derivable trait: the
comparison traits, `Debug`, `Display`, `Default`, `Error`, or the serde pair)
forces every user, including code that never clones, to satisfy it, and removing a bound later is a
change callers can notice. Three exceptions are legitimate: a bound required to
name an associated type in a field, `?Sized` relaxations, and a `Drop` impl that
itself needs the bound (the definition and the `Drop` impl must agree).

## Marker traits

A trait with no methods, such as a stability marker layered on a sort trait, states
a guarantee the signature cannot: implementing it is a promise, and a generic
function that requires it only accepts types that made the promise. Seal a marker
when only your crate may grant it.

## Destructors

A `Drop` impl never fails. A panic during unwinding aborts the process, so
swallow or log the error inside `drop` instead of propagating it.

A destructor also must not block: flushing a queue or joining a thread inside
`drop` stalls whichever thread happens to drop the value. When teardown is
fallible or slow, offer a separate explicit method (`close`, `shutdown`) that does
the work and reports the result, and let `drop` do only the infallible,
non-blocking remainder as a safety net. Which resources need this treatment is
`/ownership-not-clone`; the `Drop` mechanics are in `/idiomatic-rust`.
