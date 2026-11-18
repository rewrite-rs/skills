## What it does

Decides who owns what and for how long — every `clone` must be explainable in one
sentence, and the skill reaches for borrowing, moves, signature changes, and
destructuring before it reaches for a copy. It does not reshape how correct code
is expressed (that is `/idiomatic-rust`), design error types (that is
`/rust-errors`), or model invariants into types (that is `/type-driven-design`).

## When to reach for it

Model-invoked: the agent pulls this in on its own when code clones to make a
borrow-checker error go away, when an `E0502`/`E0499` fight is being resolved by
copying data, when reviewing Rust dense with `.clone()` or `Rc<RefCell<_>>`, or
when asked whether a particular clone is necessary. It does not cover expression
level (iterators, `From`/`Into`, derives — `/idiomatic-rust`), the decision of
whether a shared structure should be an arena, a graph of `Rc`s, or something
else entirely (the modelling half of that is `/type-driven-design`), or locks
held across `.await` points (`/async-rust`). The user can run it directly, as
`/ownership-not-clone`.

## Borrows, splits, and signatures

- **The one-sentence rule.** A clone that buys a real thing — a value that must
  outlive the borrow, a cheap `Arc` bump for a second task — is fine. A clone
  that only silences an error message is a deferred design decision.
- **Read the error, not the workaround.** `E0502` and `E0499` name a scope
  problem; shorten the borrow before copying the data.
- **Borrow splitting.** Destructure `let Self { connections, log, .. } = self;`
  so two fields borrow independently; `split_at_mut` for disjoint slice halves;
  extract a free function taking the two fields when destructuring is not enough.
- **Cheapest argument types.** `&str` over `&String`, `&[T]` over `&Vec<T>` — a
  signature that takes ownership of a value it only reads forces a clone at every
  call site, and the bug is in the signature. Likewise `&T` over `&Box<T>` and
  `Option<&T>` over `&Option<T>` (clippy `borrowed_box`, `ptr_arg`). When the
  function needs ownership, take it by value and never clone a borrow inside;
  bound by `Copy` only when the body needs it.
- **`Cow` for genuine borrow-or-own.** The common path borrows, the rare path
  allocates; anything else is a plain owned type.
- **`mem::take` and `mem::replace`.** When only a `&mut` is in hand and an owned
  value is needed, swap something in so the original can be moved out. `take`
  leaves `Default`, `replace` leaves a value you pick, `Option::take` covers
  options, and an enum variant can be changed in place by taking the field you
  want to keep.
- **Global state.** A `static` with mutable or lazily-initialised contents has
  no visible owner and no stated lifetime; pass the value in, or keep it in the
  type that does the work. Thread-locals break where one shared value matters,
  two semver-incompatible crate versions each carry their own statics, and no
  code should run before `main`.

## Pointers, lifetimes, and borrow tactics

`LIFETIMES.md` holds the pointer-type table (`&`, `Box`, `Rc`/`Arc`, `RefCell`,
`Mutex`), the elision rules and when to name a lifetime, why a struct should
usually own its data instead of borrowing it, what `'static` and `Box::leak`
mean, and the order of tactics when a borrow conflict survives: shorten the
borrow, split the expression into typed steps, split the struct, then change the
ownership design. Self-referential structs are avoided.

## When shared ownership is the answer

`Rc`/`Arc` when the runtime structure genuinely has multiple owners with no
single one outliving the rest; `RefCell`/`Mutex` only when the mutation is
dynamic or cross-thread. The four-question test and the arena alternative (a
graph as `Vec<Node>` plus index edges, no runtime borrow check, no cycle leak)
live in `SHARED-STATE.md`; the situation-by-situation verdicts live in
`CLONE-DECISIONS.md`. The handle clone — a service type that derives `Clone`
over an `Arc<Inner>` and copies one pointer, not the pool — passes the
one-sentence test and is covered in `SHARED-STATE.md`, along with `Weak`
back-pointers, `try_borrow`, the `RefCell` nesting granularity, and the stale-index
risk of arenas. Prefer unique ownership; use shared ownership when the
alternative is unreasonably complex; cloning an `Rc`/`Arc` handle is cheap.

## Common questions

**Is the goal zero clones?** No — the goal is no unexplained clones. A clone with
a one-sentence justification a reviewer would accept (an owned value that must
outlive the borrow) stays, with the justification in a comment.

**My service type derives `Clone` — is that a smell?** No, when it clones an
`Arc` handle — the outer type holds an `Arc<Inner>`, and the derive copies one
pointer, so every task gets its own handle to the same client. Yes, when it
copies the data: a `Clone` that deep-copies a pool or a buffer is the
unexplained clone the one-sentence test exists to catch.

**When is `RefCell` the right call over `Mutex`?** Single-thread interior
mutability where the borrow structure is determined by data at runtime. Both move
the borrow-checker error to runtime instead of removing it; if the borrows are
known at compile time, neither is needed.

**Does destructuring always resolve a field conflict?** No — it works when the
conflicting borrows are within one method body. Across methods, extract a free
function that takes the two fields as separate arguments.

## It's working if

- Every remaining `.clone()` has a one-sentence justification a reviewer would
  accept, in a comment or in the PR description.
- No function takes `String`, `Vec<T>`, or `PathBuf` where it only reads the
  value.
- `Rc<RefCell<_>>` appears only where the four-question test in `SHARED-STATE.md`
  passes.
- Handle clones are recognisable as such — a service type that derives `Clone`
  copies the `Arc` pointer, not the data it owns.
- Borrow conflicts between two fields are resolved by destructuring, not by
  cloning a field.
- `cargo test` passes and no clone was removed on a path the tests do not cover.

## Where it fits

`ownership-not-clone` is the ownership-level skill in the language-craft group —
it governs who holds a value and for how long, not how correct code is expressed
(`/idiomatic-rust`), how failure is typed (`/rust-errors`), or what the types
allow (`/type-driven-design`). Locks across `.await` points hand off to
`/async-rust`. See `rust-skills-map` for how the full set of Rust skills relates.
