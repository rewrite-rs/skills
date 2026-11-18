# Readability

Code is read far more often than it is written, so when a shorter spelling and a clearer
one disagree, the clearer one wins — a few extra characters at the writer's keyboard buy
every later reader a faster read. Uniform shapes also let a tool or a scripted refactor
change many call sites at once, so the same choices should look the same everywhere;
rustfmt settles layout, which leaves this file to settle the choices a formatter cannot.

Small choices a Rust reader notices at once: how a value gets unwrapped, whether a type
is visible, how a cast can lose data, how a string gets built, and how imports read.
Each one is minor alone. Together they decide whether code reads as written by someone
fluent.

## Match, don't check then unwrap

A test followed by an `unwrap` states the same fact twice, and the two halves drift apart
under edits until the `unwrap` sits outside the branch that made it safe. Bind the value
in the test itself:

```rust,ignore
// before
if user.email.is_some() {
    send(user.email.unwrap());
}

// after
if let Some(email) = user.email {
    send(email);
}
```

When the absent case ends the function, `let ... else` keeps the happy path at the top
level. The same holds for `Result`: `is_ok()` followed by `unwrap()` is a `match`, an
`if let Ok(..)`, or a `?` that has not been written yet.

When one variant of a `#[non_exhaustive]` enum is the only one you care about, `if let` or
`let ... else` says so directly, where a `match` would need a `_ =>` arm that reads like an
oversight. When you do want to hear about new variants, name every known one in the
`match` and enable the `non_exhaustive_omitted_patterns` lint, which reports a wildcard
that hides a variant.

## A `bool` argument says nothing at the call site

`render(&page, true, false)` hides two decisions. Prefer an enum with named variants, or
a small options struct. When a `bool` stays — a one-off private helper, a signature fixed
by a trait — comment each literal where it is passed:

```rust
fn export(rows: &[u32], header: bool, sorted: bool) -> String {
    let mut rows = rows.to_vec();
    if sorted {
        rows.sort_unstable();
    }
    let body: Vec<String> = rows.iter().map(u32::to_string).collect();
    if header {
        format!("id\n{}", body.join("\n"))
    } else {
        body.join("\n")
    }
}

fn main() {
    let text = export(&[3, 1, 2], /* header */ true, /* sorted */ false);
    assert!(text.starts_with("id"));
}
```

## Show the type where inference hides it

`.parse()`, `.into()`, `.collect()`, and `Default::default()` all produce a type the
reader cannot see at the call. Put the type on the binding, where it reads as a
declaration:

```rust
fn port(raw: &str) -> Result<u16, std::num::ParseIntError> {
    let port: u16 = raw.trim().parse()?;
    Ok(port)
}
```

Use the turbofish only where there is no binding to annotate, such as mid-chain:
`.collect::<Result<Vec<_>, _>>()?`. Leave `_` wherever the compiler can still fill in
part of the type — the annotation exists for the reader, not to spell out every
parameter.

## Iterator chains: name them, keep them short

- **Bind a chain before looping over it.** A three-line chain inside a `for` header
  hides the loop variable. Give it a name on the line above:
  `let overdue = invoices.iter().filter(|i| i.due < today);` then `for invoice in overdue`.
- **`for` over `for_each` when the body does work.** A `for_each` closure cannot `break`,
  `continue`, or use `?` on the enclosing function, and its side effects hide at the
  end of a chain. `for_each` fits only at the end of a chain that already reads as
  pure data flow.
- **Split a chain that needs a scroll.** Past four or five adapters, or once a closure
  spans several lines, pull the closures into named functions or go back to a loop. A
  short chain such as `orders.iter().all(|o| o.is_paid())` is the case iterators win.
- **Keep the loop for a big or many-purpose body.** A body that validates, transforms,
  and records in one pass gains nothing from being spread across closures; the loop
  shows the steps in order.

## `as` is a silent cast

Between numeric types, `as` never fails. It truncates, wraps, or saturates without
saying so:

```rust,ignore
// before: -1 becomes 18446744073709551615 on a 64-bit target
let index = offset as usize;
```

```rust
fn slot(offset: i64, len: usize) -> Option<usize> {
    let index = usize::try_from(offset).ok()?;
    (index < len).then_some(index)
}
```

Use `From` or `u64::from(x)` for conversions that cannot lose data, and `TryFrom` for
ones that can. Keep `as` where truncation is the point — hashing, bit packing, a C
interface — and say so in a comment next to it.

## Strings: `format!`, not `+`

`a + &b + "/" + &c` reads as arithmetic and forces a borrow dance on every operand.
`format!("{a}{b}/{c}")` shows the finished shape, and inline captures (`{name}`) keep the
arguments next to where they land. A chain of `.replace()` calls filling in a template
is a `format!` in disguise.

Appending inside a loop, write into the existing `String` with `write!` rather than
`push_str(&format!(..))`, which allocates a throwaway string each time:

```rust
use std::fmt::Write;

fn render(rows: &[(&str, u32)]) -> String {
    let mut out = String::new();
    for (name, count) in rows {
        // Writing to a String cannot fail.
        let _ = writeln!(out, "{name}: {count}");
    }
    out
}
```

## Tuples: name the fields

`.0` and `.1` carry no meaning. A tuple is fine for a short-lived pair the reader can see
being built — the output of `enumerate`, `zip`, `split_once`. Once a tuple is a return
type, a struct field, or has three elements, it becomes a struct with named fields. A
single-field newtype is the exception: its one field has nothing to name.

## The contracts std readers assume

- **`len` comes with `is_empty`.** A reader who sees `len()` expects `is_empty()` next to
  it, and clippy flags the missing half.
- **Operators mean their operator.** Implement `Add` for `Money + Money`, not to append to
  a log. An overloaded operator must keep the properties a reader assumes — addition
  commutes, multiplication associates. When it does not, write a named method.

## Imports

- **Types and traits by name, functions through their module.** `use std::collections::HashMap;`
  then `HashMap::new()`, but `fs::read_to_string(path)` and `mem::take(&mut buf)` — the
  module prefix tells the reader where a free function comes from. Exceptions: a very large
  group of related types, macros, and generated code may import the functions or items
  directly when qualifying every use would drown the code.
- **One module per `use` line, with no nested paths inside the braces.** Write
  `use net::{Client, Server};` or two separate lines for different modules, but not
  `use net::{Client, tls::Config};`. A reader scanning for where a name comes from then
  reads one line, not a tree. The matching rustfmt option is nightly-only, so on stable
  this is a review convention.
- **Traits go inside the function that needs them** unless most of the file uses them.
  A `use std::fmt::Write;` at the top of a file suggests the whole file writes to
  strings; a `use` at the head of the one function that does says exactly where the
  trait matters, and keeps the name out of every other scope.
- **No glob imports by default.** A glob hides where a name comes from, and a minor release
  of the source crate that adds a name can collide with one of yours. Accepted globs:
  `use super::*;` in a test module, `use Kind::*;` inside one function that matches on
  `Kind`, items from a module you own in the same crate, and a prelude that a framework
  documents for glob use — consuming such a prelude is fine. Defining a prelude in your
  own library is rare and needs a reason; that is a surface decision for
  `/rust-api-design`.
- **A glob from a dependency needs an exact pin.** Write the version in `Cargo.toml` as
  `=1.4.2`, so a new release cannot slip a clashing name in; the cost is that you bump
  it by hand.
- **Rename the ambiguous ones.** When two `Error` or `Result` types meet in one file,
  qualify one (`io::Error`) or alias it (`use std::fmt::Result as FmtResult;`) instead of
  leaving the reader to work out which one is in scope.

Which crate items are public, and through how many paths, is API surface, owned by
`/rust-api-design`.
