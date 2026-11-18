# Naming

Names a Rust reader can guess: short type names, the cost prefixes, accessor
shape, acronym case, where a function belongs, and the naming families —
constructors, accessors, iterators, errors, generics, features — that `std` taught
every reader to expect.

The governing idea is consistency with the wider ecosystem: when a name follows the
convention `std` and the popular crates already use, a reader guesses it without opening
the docs, and an agent that has seen a thousand Rust crates guesses it too. Where this
file is silent, copy what `std` does; where the repo already has a settled local
convention that differs on a point below, follow the repo.

## Short names, no weasel words

A name earns every word in it. `InventoryManager` says "inventory" plus a word of
nothing: `Inventory` is the type, and `Service`, `Manager`, `Helper`, `Util`, `Data`,
`Info` are the words that mark a name nobody finished. The test: read the name at
the call site.

```rust,ignore
inventory.reserve(sku)
inventory_manager.reserve(sku)
```

The second line does the same job with dead weight in the receiver.

Stop at two short words per identifier. A third word is usually a module name or a type
name the call site already shows, and the path (`http::Client`) supplies it for free.

Three Java-flavoured words deserve a direct replacement:

- **`Factory` becomes `Builder`.** A type that assembles a value in stages is
  `ReportBuilder`, never `ReportFactory`.
- **A `Manager` that disposes of things becomes `Drop`.** Teardown is a destructor on the
  value that owns the resource, not a `ResourceDisposer` somebody must remember to call.
- **A factory handed to a function becomes a closure.** Code that must create fresh
  values on demand takes `impl Fn() -> T`; it does not take a `WidgetFactory`.

```rust
fn fill(count: usize, make: impl Fn() -> Vec<u8>) -> Vec<Vec<u8>> {
    (0..count).map(|_| make()).collect()
}
```

## The conversion cost tiers

The three prefixes are a promise about cost and ownership, and Rust readers rely on it:
`as_` is a free borrow-to-borrow view, `to_` is expensive and allocates, clones, or
computes, `into_` consumes and its cost varies with the type. A `to_` that is free is
merely surprising; an `as_` that allocates is a lie the reader will not check.

| prefix | cost | receiver to result | `std` example |
|--------|------|--------------------|---------------|
| `as_` | free | borrowed to borrowed | `String::as_str` returns `&str` |
| `to_` | expensive | borrowed to borrowed (the work is a check or computation), borrowed to owned for a non-`Copy` type, or owned to owned for a `Copy` type | `Path::to_str` validates UTF-8; `str::to_string` returns `String`; `u32::to_be_bytes` takes a `Copy` value by value |
| `into_` | variable | owned to owned, for a non-`Copy` type | `String::into_bytes` returns `Vec<u8>` |

Two refinements help when choosing between them. First, `as_` and `into_` expose the
underlying representation: the result is the same data seen differently, which is why
`into_inner` is the standard unwrap for a wrapper. `to_` stays at the same level of
abstraction and does real work to produce its answer — `Path::to_str` still gives a path,
only after checking it is valid text. Second, `mut` sits where it would in the type, so
the name reads like the signature: `as_mut_slice`, not `as_slice_mut`.

```rust
struct Frame {
    bytes: Vec<u8>,
}

impl Frame {
    fn as_slice(&self) -> &[u8] {
        &self.bytes
    }

    fn as_mut_slice(&mut self) -> &mut [u8] {
        &mut self.bytes
    }
}
```

Clippy enforces the receiver half of this table through `clippy::wrong_self_convention`:
an `as_` taking `self` by value, or an `into_` taking `&self`, trips it. Treat the lint as
agreeing with the table, not as noise.

The promise covers your own types too — a `to_foo` free function or inherent method
where a `From` impl belongs breaks it twice: callers bound against `Into<Foo>` can't
see it, and the cost it promises is never kept. The counter-example:

```rust
struct Log(Vec<String>);

impl Log {
    fn as_summary(&self) -> String {
        self.0.join(", ")
    }
}

fn main() {
    let log = Log(vec!["a".to_string(), "b".to_string()]);
    println!("{}", log.as_summary());
}
```

The `as_` prefix promises a free borrow; the body allocates a `String`.

## No `get_` prefix

The field accessor is named for the field: `fn name(&self)`, the mutable one
`fn name_mut(&mut self)`.

```rust,ignore
// before
impl User {
    fn get_name(&self) -> &str {
        &self.name
    }
}
```

```rust
struct User {
    name: String,
}

impl User {
    fn name(&self) -> &str {
        &self.name
    }

    fn name_mut(&mut self) -> &mut String {
        &mut self.name
    }
}

fn main() {
    let mut user = User { name: "Ada".to_string() };
    user.name_mut().push_str(" Lopez");
    println!("{}", user.name());
}
```

`get_` survives only where the operation genuinely looks something up and can fail,
as in `HashMap::get` — there is no field to name the accessor after, and the
`Option` return is the whole point of the call.

A bare `get` with no suffix is right when the type has exactly one obvious thing to
fetch, as `Cell::get` does. When a checked accessor exists and a caller can prove the
index is in range, offer an `unsafe fn get_unchecked` sibling that skips the check, with
a `# Safety` section naming the precondition:

```rust
struct Grid {
    cells: Vec<u8>,
}

impl Grid {
    fn get(&self, index: usize) -> Option<&u8> {
        self.cells.get(index)
    }

    /// # Safety
    ///
    /// `index` must be less than the number of cells.
    unsafe fn get_unchecked(&self, index: usize) -> &u8 {
        unsafe { self.cells.get_unchecked(index) }
    }
}
```

## Acronyms are words

`HttpClient` not `HTTPClient`, `Uuid` not `UUID`, `parse_url` not `parse_URL`.
Consistency here is what makes a name guessable, which is the only thing case
conventions buy:

```rust,ignore
// before
struct HTTPClient;

fn parse_URL(s: &str) -> Option<Url> {
    todo!()
}

// after
struct HttpClient;

fn parse_url(s: &str) -> Option<Url> {
    todo!()
}
```

## Case by kind of item

| Item | Case |
|------|------|
| types, traits, enum variants | `UpperCamelCase` |
| modules, functions, methods, fields, local variables | `snake_case` |
| constants and statics | `SCREAMING_SNAKE_CASE` |
| type parameters | short `UpperCamelCase` (see below) |

Rustc warns on a violation, and the compiler's opinion is the one that matters in review.

## Regular functions over associated functions

A function that does not need `Self` and is not a constructor is a free function in
the module. Reaching for an `impl` block to namespace a helper produces
`Config::merge_maps(a, b)` where `merge_maps(a, b)` was available, and the
associated form cannot be imported by name:

```rust,ignore
// before — the `impl` block is a namespace, not a home
impl Config {
    fn merge_maps(base: &Map, extra: &Map) -> Map {
        // ...
    }
}

Config::merge_maps(&a, &b)
```

```rust
use std::collections::HashMap;

fn merge_maps(
    base: &HashMap<String, i64>,
    extra: &HashMap<String, i64>,
) -> HashMap<String, i64> {
    let mut out = base.clone();
    for (key, value) in extra {
        out.insert(key.clone(), *value);
    }
    out
}

fn main() {
    let mut base = HashMap::new();
    base.insert("a".to_string(), 1);
    let mut extra = HashMap::new();
    extra.insert("b".to_string(), 2);
    let merged = merge_maps(&base, &extra);
    println!("{}", merged.len());
}
```

The free form is what `use crate::config::merge_maps;` pulls into scope at a call
site; the associated form is only reachable through the type.

## Constructors

| Shape | Name | `std` example |
|-------|------|---------------|
| the primary constructor | `new` | `Vec::new` |
| a variant that stands in for `new`, with one extra input | `with_*` prefix | `Vec::with_capacity` |
| a variant that varies another named constructor | `*_with_*` suffix | `open_with_options` beside `open` |
| one that acquires a resource | a verb naming the side effect | `File::open`, `TcpStream::connect` |
| one that converts from a specific encoding, takes extra arguments, or is `unsafe` | `from_*` | `String::from_utf8`, `u32::from_str_radix`, `Box::from_raw` |
| a plain, single-argument conversion | a `From` / `TryFrom` impl, not a method | `String::from` |

Pick between the two `with` spellings by what the constructor replaces. If it is the
alternative to `new` — the way you build the type when you have this extra fact — it is
`with_capacity`-style. If a named constructor such as `open` already exists and this one
only changes how it runs, the suffix keeps the family sorted: `open`, `open_with_options`.
The form `new_with_capacity` is the same idea written with a redundant `new`; drop it in
new code, and keep it only if the repo already uses it everywhere.

A fallible constructor is `new` returning `Result` or `Option` — `NonZeroU32::new`
returns `Option` without a `try_` prefix. Reach for `try_new` only when an infallible
`new` already sits beside it and the two need telling apart. Some codebases standardise on
`try_new` for every fallible constructor; the repo convention beats this default. Parsing
from text is a `FromStr` impl, so callers get `"..".parse()`; a hand-written `from_str`
method hides it from every generic caller.

**`new` beside `Default`.** Provide `new()` even when it takes no arguments and does the
same as `Default::default()`. People look for `new` first, and generic code looks for
`Default`; supplying both costs one line:

```rust
#[derive(Default)]
struct Tally {
    hits: u32,
}

impl Tally {
    fn new() -> Self {
        Self::default()
    }
}
```

A type gets exactly one `Default`. Other useful starting points are named constructors
that say what they start as — `Throttle::unlimited()` and `Throttle::strict()` — rather
than a second, unreachable notion of default.

**An important `From` impl may be paired with an inherent constructor** (`from_foo`, or
`new` when the input is the natural one) so the conversion shows up in the type's own
documentation page and works without importing a trait. Plain conversion still goes
through `From`; the inherent method is a discoverability aid that forwards to it, not a
second implementation.

**Std-trait methods.** `clippy::should_implement_trait` fires when an inherent method
carries the name of a std trait method (`from_str`, `add`, `default`, `next`). The cure
is the trait impl. Keeping an inherent method beside it is acceptable when callers
benefit from not importing the trait; make it forward to the trait and silence the lint
on that one method with a comment saying why.

## The accessor family

Once a field has an accessor, the rest of the family follows one pattern, and readers
guess the name of the next one from the first:

| Method | Does |
|--------|------|
| `name(&self)` | borrows the field |
| `name_mut(&mut self)` | borrows it mutably |
| `set_name(&mut self, v)` | replaces it, dropping the old value |
| `replace_name(&mut self, v) -> T` | replaces it, returning the old value |
| `take_name(&mut self) -> T` | moves it out, leaving the default behind |
| `with_name(|n| ..)` | runs a closure on the field |
| `with_name_mut(|n| ..)` | runs a closure on the field mutably |
| `into_inner(self)` | unwraps a single-value wrapper |
| `into_parts(self)` | splits a value into all its fields |

The closure forms fit two cases: a wrapper over interior mutability (`Mutex`, `RefCell`),
where handing out a reference would outlive the lock or borrow, so the closure scopes it;
and a field whose setter must validate afterwards, where a plain `set_name` cannot do the
follow-up. A `with_name` that takes a closure is an accessor; a `with_*` that takes a
plain value and returns `Self` is a constructor. The argument tells them apart.

## Iterator names

A collection offers three methods, and the receiver decides what the items are:

| Method | Receiver | Iterator type | Items |
|--------|----------|---------------|-------|
| `iter` | `&self` | `Iter` | `&U` |
| `iter_mut` | `&mut self` | `IterMut` | `&mut U` |
| `into_iter` | `self` | `IntoIter` | `U` |

A type with more than one
natural sequence names the method after the item: `chars`, `bytes`, `lines`, `keys`. The
iterator type takes the name of the method that returns it, in type case: `keys()`
returns `Keys`, `drain()` returns `Drain`, `iter()` returns `Iter`.

## Error types: verb, object, `Error`

`std` mostly reads verb-object-`Error`: `ParseIntError`, `TryFromIntError`,
`ParseFloatError`. Follow the same order — `ParseConfigError`, not `ConfigParseError` —
and above all keep one order across the crate, since a reader who learns one error name
guesses the rest from it.

## The module path is part of the name

Callers read `http::Client`, so `http::HttpClient` says "http" twice. A module named
after the one type it holds (`mod parser` holding `Parser`) is fine, but every other item in it
drops the module from its own name: `parser::Options`, not `parser::ParserOptions`.

## Generic parameters and lifetimes

- **Type parameters.** `T` and `U` for "any type". Otherwise use the first letter of the
  bound that matters: `R: Read`, `W: Write`, `F: Fn`, `I: Iterator`, `K` and `V` for map
  keys and values.
- **Lifetimes.** `'a` is enough when one input lends to one output. A type holding a
  borrow, or a signature juggling several, names each lifetime after what it borrows:
  `Token<'src>`, `Frame<'buf>`. `'de` already means "deserializer input" to anyone who
  has used serde. Descriptive names matter most on types, where the lifetime appears in
  every mention.
- **Where short is right.** Generic abstractions over borrowing such as `Cow<'a, str>`,
  the anonymous `'_`, and single-letter names for an obvious one-input one-output
  relationship all stay as they are.

## Extension traits end in `Ext`

A trait that exists only to add methods to a type this crate does not own takes the
`Ext` suffix — `StrExt`, `PathExt`, as `futures` ships `StreamExt`. The suffix tells the
reader to look for the import when a method appears on a foreign type.

Ownership follows the extended type. The crate that owns the type is the natural home for
its extension trait, because it can see what belongs there and keeps one definition for
every user. An `Ext` trait over a foreign type is a local convenience: it lives with
whoever needs it, stays private or crate-level, and is not published as though it were
part of the foreign type's API.

## Abbreviations

Shorten only to the form a domain already uses: `Url`, `Io`, `Ip`, `Tcp`. Dropped
letters (`Mgr`, `cnt`, `usr_nm`) save typing once and cost reading every time after.

## Cargo features and crate names

A feature is named for what it turns on: `serde`, `std`, `tls`. No `use-`, `with-`, or
`enable-` prefix, since every feature enables something. Never a `no-*` feature: Cargo
merges features across the dependency graph, so one crate turning on `no-std` would turn
it on for every other user of the crate. Model the opposite as a default feature
(`default = ["std"]`) that callers switch off. The usual wiring has three parts: the
feature declared as empty, the crate marked `no_std`, and `std` linked back in when the
feature is on.

```toml
[features]
default = ["std"]
std = []
```

```rust,ignore
#![no_std]

#[cfg(feature = "std")]
extern crate std;
```
 A crate name carries no `-rs` or `-rust`
suffix; every crate on crates.io is Rust.

## Names that mirror the source language

`getUserById` transliterated to `get_user_by_id` is a Rust name only in its case
convention; a name that carries assumptions over from the source language is the
general shape of the problem the `/port-to-rust` skill covers.
