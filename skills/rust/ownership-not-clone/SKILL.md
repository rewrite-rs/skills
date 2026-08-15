---
name: ownership-not-clone
description: Use ownership and borrowing instead of reaching for clone, Rc, RefCell, or Arc<Mutex<_>> to silence the borrow checker. Every clone must be explainable. Use when code clones to make an error go away, when a borrow-checker fight is being resolved by copying data, when reviewing Rust dense with .clone() or Rc<RefCell<_>>, or when the user asks whether a clone is necessary.
---

# Ownership, Not Clone

The borrow checker is a map of where ownership is being fudged, not an obstacle
to route around. This skill decides who holds a value and for how long — what to
do when two claims on it collide. It does not reshape how correct code is
expressed (`/idiomatic-rust`) or decide how a failure is typed (`/rust-errors`).

## The rule

Every `clone` must be explainable in one sentence that is not "the borrow checker
complained." A clone that buys a real thing — an owned value that must outlive the
borrow it came from, a cheap `Arc` bump handed to a second task, a `Copy`-sized
struct where the indirection would cost more than the copy — is fine. A clone that
only silences an error message is a deferred design decision, not a decision. The
goal is not zero clones; it is no unexplained ones.

## Read the error, not the workaround

`E0502` (a mutable borrow while an immutable one is still live) and `E0499` (two
mutable borrows of the same place) name a scope problem. The fix is almost always
to end the borrow earlier, not to copy the data:

```rust
// The borrow spans the whole loop, so the push conflicts.
let first = &items[0];
for _ in 0..n {
    items.push(first.clone()); // E0502: items is borrowed immutably by `first`
}

// One clone, taken before the mutable borrow begins. Explainable: the value
// must outlive the loop that mutates the vector.
let first = items[0].clone();
for _ in 0..n {
    items.push(first.clone());
}
```

Before settling on that clone, ask whether the read can be done so no copy is
needed at all — because the value is read before the mutation begins and the
borrow ends at the `let`:

```rust
// No clone: `first` is Copy, so the borrow ends at the let.
let first = items[0];
for _ in 0..n {
    items.push(first);
}
```

## Borrow splitting

The borrow checker tracks a whole value through method calls, but tracks fields
individually through direct field access. A `&mut self` method that also needs
`self.other_field` is the classic false conflict — destructure once, and the two
fields borrow independently:

```rust
// Rejected: self is mutably borrowed by the loop, so self.log is unreachable.
impl Server {
    fn handle(&mut self) {
        for conn in &mut self.connections {
            self.log.record(conn.id()); // E0502
        }
    }
}

// Accepted: the two fields are separate lets and borrow independently.
impl Server {
    fn handle(&mut self) {
        let Self { connections, log, .. } = self;
        for conn in connections.iter_mut() {
            log.record(conn.id());
        }
    }
}
```

`split_at_mut` hands back two disjoint `&mut` halves of one slice, so "mutate
the head, read the tail" stops being a conflict. When destructuring is not
enough — the fields are used from different methods — extract a free function
that takes the two fields as separate arguments.

## Take the cheapest thing that works, in argument position

`&str` over `&String`, `&[T]` over `&Vec<T>`, `impl AsRef<Path>` over a `PathBuf`
for a path a function only reads. A signature that takes `String` when it only
reads the contents forces every caller into a clone — the clone shows up at the
call site, but the bug is in the signature. Take ownership only when the function
genuinely stores or consumes the value.

```rust
// Forces a clone at every call site that holds a &str.
fn log_message(message: String) { ... }

// Reads only — callers pass a reference and copy nothing.
fn log_message(message: &str) { ... }
```

## `Cow` for genuine borrow-or-own

`Cow<'_, str>` earns its keep when the common path returns the input untouched
and the rare path allocates — a sanitizer that usually finds nothing to escape.
It does not earn its keep when both paths allocate (a plain owned type is
clearer), or when the lifetime it introduces propagates through several structs
to avoid one small allocation.

```rust
// The common path borrows; only input containing a bracket allocates.
fn sanitize(input: &str) -> Cow<'_, str> {
    if input.contains(['<', '>']) {
        Cow::Owned(input.replace('<', "&lt;").replace('>', "&gt;"))
    } else {
        Cow::Borrowed(input)
    }
}
```

## When `Rc`/`Arc`/`RefCell`/`Mutex` express a real requirement

Shared ownership is justified when the *runtime* structure genuinely has multiple
owners with no single one outliving the rest — a graph with cycles, an observer
list, a cache handed to several tasks. It is not justified when a single owner
exists but is inconvenient to name. Run the four-question test in `SHARED-STATE.md`
before adding a `RefCell`, and keep the escape routes in view: an arena or
index-based model, `&mut` passed down the call chain, or ownership moved to the
caller. The decision table for the common situations is in `CLONE-DECISIONS.md`.

## Deferrals

Reshaping how correct code is expressed is `/idiomatic-rust`. Whether the borrow
problem is really a modelling problem — an invariant that should live in a type —
is `/type-driven-design`. Error types are `/rust-errors`. Shared state across
`.await` points, and why holding a `std::sync` guard across one is a bug, is
`/async-rust`.

## Verification

Keeping or removing a clone changes no behaviour, so the claim "this still works"
is settled by the suite:

```bash
cargo clippy --all-targets   # add -- -D warnings only if the repo has no lint config
cargo test
```

Run clippy at the lint level configured in the repo — a repo with a `clippy.toml`
or its own lint attributes keeps them, and `-D warnings` never goes on top.
`clippy::redundant_clone` lives in the `nursery` group and is off by default; it
may be run as a one-off proposal generator with `cargo clippy -- -W
clippy::redundant_clone`, but it must not be written into the repo lint config,
and its findings are candidates to inspect, not edits to apply. And removing a
clone is a behaviour-preserving refactor only to the extent the tests cover the
path — a suite passing before and after is evidence for the covered paths only.
