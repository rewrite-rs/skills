# Patterns

Most of the classic object-oriented patterns exist to stand in for a language feature
the host language lacked. Rust has closures, enums with data, traits, and `Drop`, so
most of those patterns shrink to a few lines or disappear. Write the small form first;
reach for the named pattern only when the small form stops fitting.

| Reaching for | Write this first | Graduate when |
|--------------|------------------|---------------|
| Strategy | a closure parameter (`impl Fn(..) -> ..`) | the strategy has several methods or state worth naming — then a trait |
| Command | an enum, one variant per action | the set of actions is open to other crates — then `Box<dyn Trait>` |
| Visitor / fold | a recursive function with a `match` | several passes walk the same heterogeneous tree |
| Builder | struct literal with `..Default::default()` | see `/rust-api-design` |
| `try`/`finally` | a guard type with `Drop` | — |
| State machine in a class | an enum, or typestate | see `/type-driven-design` |

## Strategy is a closure

A strategy object with one method is a closure with a name. Take `impl Fn` and let the
caller pass the behaviour inline:

```rust
use std::time::Duration;

fn delays(attempts: u32, backoff: impl Fn(u32) -> Duration) -> Vec<Duration> {
    (0..attempts).map(backoff).collect()
}

fn main() {
    let linear = delays(3, |n| Duration::from_millis(100 * u64::from(n + 1)));
    let fixed = delays(3, |_| Duration::from_millis(250));
    assert_eq!(linear[2], Duration::from_millis(300));
    assert_eq!(fixed.len(), 3);
}
```

Ask for the loosest bound the body allows: `FnOnce` if it is called once, `FnMut` if it
mutates what it captured, `Fn` otherwise. A bare `fn` pointer type refuses every
closure that captures anything, so it is the wrong default. Move to a trait when the
strategy grows a second method, or carries configuration a reader should see by name.

Often the strategy is already in `std`: `Option::map` takes the behaviour to apply to the
present value, `sort_by_key` takes the ordering, `retain` takes the keep rule. Before
writing a strategy type, check whether an existing method with a closure slot does the
job.

When the trait form is right, take it as a generic bound, not a `dyn`, unless the choice
is made at runtime. The compiler then specialises each call and nothing is boxed:

```rust
trait Scorer {
    fn score(&self, word: &str) -> u32;
}

struct Length;

impl Scorer for Length {
    fn score(&self, word: &str) -> u32 {
        word.len() as u32
    }
}

fn best<'a, S: Scorer>(scorer: &S, words: &[&'a str]) -> Option<&'a str> {
    words.iter().copied().max_by_key(|w| scorer.score(w))
}

fn main() {
    assert_eq!(best(&Length, &["a", "ccc", "bb"]), Some("ccc"));
}
```

## Command is an enum

An undo stack, a job queue, or a replay log holds actions as values. When this crate
owns the full list of actions, an enum is the command type: a new variant breaks every
`match` that forgot it, the values compare in tests, and they serialize without a
registry.

```rust
#[derive(Debug, Clone, PartialEq)]
enum Edit {
    Insert { at: usize, text: String },
    Delete { at: usize, text: String },
}

impl Edit {
    fn apply(&self, doc: &mut String) {
        match self {
            Edit::Insert { at, text } => doc.insert_str(*at, text),
            Edit::Delete { at, text } => doc.replace_range(*at..*at + text.len(), ""),
        }
    }

    fn inverse(&self) -> Edit {
        match self.clone() {
            Edit::Insert { at, text } => Edit::Delete { at, text },
            Edit::Delete { at, text } => Edit::Insert { at, text },
        }
    }
}

fn main() {
    let mut doc = String::from("hello world");
    let edit = Edit::Insert { at: 5, text: ",".to_string() };
    edit.apply(&mut doc);
    assert_eq!(doc, "hello, world");
    edit.inverse().apply(&mut doc);
    assert_eq!(doc, "hello world");
}
```

`Delete` carries the removed text so that `inverse` is exact — the variant holds
everything undo needs, which a command object would have stored in fields anyway.
`Box<dyn Command>` earns its place only when other crates add actions this crate cannot
list, or when each command is a struct with several methods of its own (`execute`,
`rollback`, a label) and the set is open-ended enough that one enum would balloon.

Two lighter forms cover stored actions that need no data of their own:

- **A `fn` pointer** suits a table of capture-free actions — a map from a command name to
  a handler, built once. It is a plain value, needs no allocation, and calls without
  dynamic dispatch. The enum stays the default whenever this crate owns the full set,
  since the table cannot compare, serialize, or be checked for exhaustiveness.
- **A boxed closure** (`Box<dyn Fn(..)>`) suits an action that must carry captured state
  but needs no named type: a callback registered at runtime, a deferred step in a queue.
  A generic `F: Fn(..)` parameter does the same without the box when one call site
  stores one action.

Function pointers and generic closures never go through a vtable; only the `Box<dyn ..>`
forms pay for dynamic dispatch.

```rust
use std::collections::HashMap;

fn double(n: i64) -> i64 {
    n * 2
}

fn negate(n: i64) -> i64 {
    -n
}

fn main() {
    let mut table: HashMap<&str, fn(i64) -> i64> = HashMap::new();
    table.insert("double", double);
    table.insert("negate", negate);

    let offset = 10;
    let shift: Box<dyn Fn(i64) -> i64> = Box::new(move |n| n + offset);

    assert_eq!(table["double"](4), 8);
    assert_eq!(shift(table["negate"](4)), 6);
}
```

## Visitor, only for heterogeneous trees

A visitor separates "walk the tree" from "what to do at each node", so several passes
can share one traversal. That only pays off over a tree of differing node kinds — a
syntax tree, a document model — with more than one or two passes. Over a flat
collection the traversal is an iterator; over a small enum with one pass, a recursive
`match` is shorter.

The shape: a trait with one method per node kind, each defaulting to a shared `walk_*`
function that recurses into children. A pass overrides only the nodes it cares about.

```rust
enum Expr {
    Lit(i64),
    Neg(Box<Expr>),
    Add(Box<Expr>, Box<Expr>),
}

trait Visit {
    fn visit_expr(&mut self, expr: &Expr) {
        walk_expr(self, expr);
    }
    fn visit_lit(&mut self, _value: i64) {}
}

fn walk_expr<V: Visit + ?Sized>(visitor: &mut V, expr: &Expr) {
    match expr {
        Expr::Lit(value) => visitor.visit_lit(*value),
        Expr::Neg(inner) => visitor.visit_expr(inner),
        Expr::Add(lhs, rhs) => {
            visitor.visit_expr(lhs);
            visitor.visit_expr(rhs);
        }
    }
}

struct MaxLiteral(Option<i64>);

impl Visit for MaxLiteral {
    fn visit_lit(&mut self, value: i64) {
        self.0 = Some(self.0.map_or(value, |max| max.max(value)));
    }
}

fn main() {
    let expr = Expr::Add(
        Box::new(Expr::Lit(3)),
        Box::new(Expr::Neg(Box::new(Expr::Lit(9)))),
    );
    let mut max = MaxLiteral(None);
    max.visit_expr(&expr);
    assert_eq!(max.0, Some(9));
}
```

The rewriting variant — a fold — has the same shape, except each method takes the node
by value and returns a new one, with defaults that rebuild the node from its folded
children. This pattern is unrelated to `Iterator::fold`, which reduces a sequence to one
value; the name overlap is an accident.

## Interpreter: only for a real small language

When a recurring problem is really a tiny language — a filter expression, a routing rule,
a pricing formula that users write — give it a grammar and an interpreter: parse text
into an enum tree, then evaluate the tree with a recursive `match`. The visitor example
above is already the evaluation half. For a lightweight embedded syntax inside Rust source
itself, a declarative macro can stand in for the parser. Do not invent a language when a
config struct or a closure would do; the pattern pays only when the problem keeps
recurring in new combinations.

## Optics, as vocabulary

Isomorphisms, prisms, and their relatives from functional programming describe lossless
conversions and partial views onto one case of a sum type. An iso converts both ways
with no loss; a poly iso is the same idea where the converted type may differ from the
original, as in a generic `Wrapper<A>` to `Wrapper<B>` mapping. Rust code rarely uses them as
library abstractions; their value is as a reading aid for APIs built on the same idea,
serde's visitor interface being the common one. Recognise the shape when reading such an
API; do not import the machinery into ordinary code.

## `finally` is a guard with `Drop`

This is RAII: acquire the resource in the constructor and release it in `Drop`, so the
value's existence means the resource is held. Where the resource is data, such as a lock
or a borrowed buffer, expose it only through the guard by implementing `Deref` (and
`DerefMut` when mutation is allowed), as `MutexGuard` does. The borrow checker then
stops every reference taken through the guard from outliving it, which makes
use-after-release a compile error rather than a runtime bug.

Rust has no `finally`. Cleanup that must run on every way out of a scope — the happy
path, an early `return`, a `?`, a panic unwinding — goes in the `Drop` impl of a guard
value that lives for that scope:

```rust
use std::cell::Cell;

struct Restore<'a> {
    slot: &'a Cell<u32>,
    saved: u32,
}

impl<'a> Restore<'a> {
    fn set(slot: &'a Cell<u32>, value: u32) -> Self {
        let saved = slot.replace(value);
        Restore { slot, saved }
    }
}

impl Drop for Restore<'_> {
    fn drop(&mut self) {
        self.slot.set(self.saved);
    }
}

fn nested_depth(depth: &Cell<u32>, input: &str) -> Result<u32, std::num::ParseIntError> {
    let _restore = Restore::set(depth, depth.get() + 1);
    let extra: u32 = input.parse()?;
    Ok(depth.get() + extra)
}

fn main() {
    let depth = Cell::new(0);
    assert_eq!(nested_depth(&depth, "2"), Ok(3));
    assert!(nested_depth(&depth, "x").is_err());
    assert_eq!(depth.get(), 0);
}
```

Two traps:

- **The binding decides the lifetime.** `let _restore = ...` keeps the guard alive to
  the end of the scope. `let _ = ...` drops it on the same line, so the cleanup runs
  before the work it was guarding. To end a guard early, close a block around it or
  call `drop(guard)` — the free function, never a direct `guard.drop()`, which the
  compiler rejects because the destructor is not callable by hand.
- **`Drop` is best-effort.** It does not run on `process::exit`, on an abort, or for a
  value passed to `mem::forget`; an infinite loop, or a panic raised while another panic
  is already unwinding, can skip it too. And it cannot return an error. Work that must happen,
  or can fail — flushing a durable write, committing a transaction — belongs in an
  explicit method that returns `Result`, with `Drop` as the fallback.

## Small patterns

**A `dyn` without a `Box`.** When two branches produce different types that share a
trait, a reference can hold either, with no heap allocation. Declare the storage before
the `if`, so it outlives the reference:

```rust
use std::fs::File;
use std::io::{self, BufRead, BufReader, Read};

fn count_lines(path: &str) -> io::Result<usize> {
    let mut stdin;
    let mut file;
    let source: &mut dyn Read = if path == "-" {
        stdin = io::stdin();
        &mut stdin
    } else {
        file = File::open(path)?;
        &mut file
    };
    Ok(BufReader::new(source).lines().count())
}
```

From Rust 1.79, temporary lifetime extension lets each branch write `&mut io::stdin()`
directly; the form above works on any toolchain, so check the repo MSRV before
shortening it.

**Choose what a `move` closure captures.** `move` moves everything the closure uses.
When one capture should be a clone and another a borrow, rebind them in a block that
produces the closure — the clones stay inside the block, and the originals stay usable
after it:

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    let config = Arc::new(String::from("prod"));
    let label = String::from("worker-1");
    let job = {
        let config = Arc::clone(&config);
        move || format!("{label} using {config}")
    };
    let report = thread::spawn(job).join().expect("worker thread panicked");
    assert_eq!(report, "worker-1 using prod");
    assert_eq!(config.as_str(), "prod");
}
```

The same block form handles a borrow. Rebinding a reference inside the block moves only
the reference into the closure, so the owner stays usable once the closure is gone:

```rust
use std::thread;

fn main() {
    let names = vec![String::from("ada"), String::from("grace")];
    let prefix = String::from("dev-");
    thread::scope(|s| {
        let job = {
            let prefix = &prefix;
            let names = &names;
            move || names.iter().map(|n| format!("{prefix}{n}")).collect::<Vec<_>>()
        };
        let handle = s.spawn(job);
        assert_eq!(handle.join().unwrap(), ["dev-ada", "dev-grace"]);
    });
    assert_eq!(prefix, "dev-");
    assert_eq!(names.len(), 2);
}
```

**`Option` iterates as zero or one item.** Hand it to anything that takes an iterator
instead of writing an `if let` around the call:

```rust
fn command_line(program: &str, extra: Option<&str>) -> Vec<String> {
    let mut args = vec![program.to_string()];
    args.extend(extra.map(str::to_string));
    args
}
```

When the value is always present, `std::iter::once(value)` is the same thing without an
`Option`. The same holds for `chain(opt)` and `flatten()` over an iterator of options. For a real
branch with different work on each side, `if let` still reads better.

**Owning collections deref to their view.** `Vec<T>` derefs to `[T]` and `String` to
`str`, so every slice or `str` method works on the owner. This is the legitimate use of
`Deref`: the owner really is a pointer to its view. The catch is that methods reached
through `Deref` do not count toward trait bounds, so a generic function bounded on a
trait that only the view implements will not accept the owner — take `&[T]` or `&str`
in the signature. A wrapper that merely holds another type is not this case;
`BOILERPLATE.md` covers that trap.

**Mutable while building, frozen after.** Build a value inside a block expression, so
the `mut` binding cannot leak into the rest of the function:

```rust
fn podium(scores: &[u32]) -> Vec<u32> {
    let ranked = {
        let mut sorted = scores.to_vec();
        sorted.sort_unstable_by(|a, b| b.cmp(a));
        sorted
    };
    ranked.into_iter().take(3).collect()
}
```

In a longer function, the same block keeps the reader from scanning the rest of the
body for later mutation.
