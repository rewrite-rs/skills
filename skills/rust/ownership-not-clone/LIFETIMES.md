# Pointers, lifetimes, and borrow-checker tactics

The depth behind `SKILL.md` for three things the borrow checker keeps asking about:
which pointer type holds the value, how long a reference may live, and what to do
when a conflict survives a read of the error.

## Choosing the pointer type

| You need | Use | Cost |
|---|---|---|
| Look at a value someone else owns | `&T` / `&mut T` | None. The compiler guarantees the reference is valid, aligned, and borrow-checked |
| One owner, value on the heap (recursive type, large payload, trait object) | `Box<T>` | One allocation, no sharing |
| Several owners, one thread | `Rc<T>` | Non-atomic count |
| Several owners, several threads | `Arc<T>` | Atomic count |
| Mutation through a shared handle, one thread | `Cell<T>` / `RefCell<T>` | Borrow check moves to runtime |
| Mutation through a shared handle, several threads | `Mutex<T>` / `RwLock<T>` | A lock, plus a possible deadlock |

Read down the table and stop at the first row that fits. A reference that works
beats a `Box`; a `Box` that works beats an `Rc`; shared ownership is for the case
where no single owner outlives the rest. The shared rows have their own test in
`SHARED-STATE.md`.

## Lifetimes

A reference may never outlive the value it points at. Every lifetime annotation is
a statement of that fact, not a request to the compiler.

Elision handles the two common shapes without annotations: a function with exactly
one input reference lends that lifetime to the output, and a method with `&self`
lends the lifetime of `self` to its output. Any other shape — two reference inputs
and a reference output, say — needs the relationship named, because the compiler
has no way to guess which input the output borrows from:

```rust
// Two inputs: the name says the result borrows from `haystack`, not `needle`.
fn find_in<'h>(haystack: &'h str, needle: &str) -> Option<&'h str> {
    haystack.find(needle).map(|at| &haystack[at..at + needle.len()])
}
```

A struct that stores a reference carries a lifetime parameter, and that parameter
spreads: every struct, enum, or function signature that holds the type has to
mention it too. Prefer an owning field unless the borrow is the point, because the
owned type leaves callers free to store, return, and send it anywhere:

```rust
// Borrowing: every container of `Excerpt` now carries `'a`.
struct Excerpt<'a> {
    text: &'a str,
}

// Owning: no parameter, no propagation. Copying a few hundred bytes once is
// usually cheaper than the design cost of the lifetime.
struct OwnedExcerpt {
    text: String,
}
```

`'static` means the data lives for the whole program. It fits a true global or a
value that is deliberately leaked once at startup with `Box::leak` and then shared
freely by reference. It is not a way to make an error go away: a `'static` bound on
a function argument demands owned data (or a leak), and satisfying it with a leak
inside a loop is a memory leak.

```rust
// Leaked once at startup; the `&'static str` can then go to any thread.
fn install_banner(text: String) -> &'static str {
    Box::leak(text.into_boxed_str())
}
```

## The borrow rule and when it ends

At any moment a value has any number of shared references or exactly one mutable
reference, never both. A reference lives until its last use, not to the end of its
block — so a conflict often disappears by moving the last read of the shared
borrow ahead of the mutation.

## Tactics, in the order to try them

1. **Shorten the borrow.** Wrap the borrowing statements in a block, or finish
   reading before the mutation starts. A temporary that must survive gets a named
   `let` so it lives to the end of the scope; a borrow that must die sooner gets
   an inner block.
2. **Split a tangled expression into steps.** A chain of calls that borrows and
   mutates the same value in one expression is hard to read and hard for the
   checker to accept. Bind each intermediate with a `let` and, where the type is
   not obvious, an explicit type; the conflict then names a single line.

   ```rust
   fn longest_gap(times: &mut Vec<u64>) -> u64 {
       // One expression mixing a sort with a read of `times` would conflict;
       // two typed steps do not.
       times.sort_unstable();
       let gaps: Vec<u64> = times.windows(2).map(|pair| pair[1] - pair[0]).collect();
       gaps.into_iter().max().unwrap_or(0)
   }
   ```
3. **Destructure or split the struct.** Field-level borrow splitting is in
   `SKILL.md`. When a large struct keeps causing conflicts, split the struct
   itself into smaller ones the parent composes; each piece then borrows alone,
   and the split usually exposes a design that was doing too much.
4. **Change the ownership design.** Only now consider one of: cloning small
   immutable data once, with the reason written next to it; an owning `Vec` with
   indices as handles (cheap, but an index can go stale or point at the wrong
   element after a removal, so keep the `Vec` append-only or use generation
   counters); or `Rc`/`RefCell` with `Weak` back-pointers (see `SHARED-STATE.md`).

A struct with a field that borrows from a sibling field cannot satisfy the borrow
checker, and forcing it through `unsafe` costs more than it saves. Record an
index or offset in place of the reference, or make the owner and the borrower
separate values. If the shape really cannot be avoided, reach for a crate made
for it (`ouroboros`, for one) instead of writing the pinning by hand.
