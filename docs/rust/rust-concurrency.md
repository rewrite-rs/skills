## What it does

Picks the concurrency model from the shape of the workload — data
parallelism for the same operation over many independent items, scoped
threads for borrowed stack data, channels for handoff, shared state last —
and applies the weakest correct atomic ordering to whatever is shared. It
owns the threaded half of Rust concurrency, and it stops where async task
concurrency begins: runtimes, executors, `spawn_blocking`, and cancellation
are not its territory.

## When to reach for it

Model-invoked: the agent pulls this in on its own when writing or reviewing
threaded Rust, when `Mutex`, `RwLock`, atomics, or manual `Send`/`Sync`
appear, when a deadlock or data race is suspected, or when the user asks
how to parallelize code. It does not cover async runtimes and task
concurrency (`/async-rust`), whether the state should be shared at all
(`/ownership-not-clone`), or the soundness of an `unsafe impl`
(`/unsafe-rust`).

## The shape picks the model

| Shape of the work | Model | Where it lives |
|---|---|---|
| The same operation over many independent items | Data parallelism — `rayon` over the existing iterator chain | `/rust-concurrency` |
| Independent units of work that are mostly waiting | Task concurrency | `/async-rust` |
| State several threads read and write | Shared state — locks and atomics, and the one to reach for last | `/rust-concurrency` |

The per-item work has to be large enough to pay for the scheduling; a
`par_iter` over a million cheap closures is the standard disappointment.
Scoped threads remove the `'static` bound that forces an `Arc` when a
thread only needs to borrow stack data.

## Shared state and orderings

- **`Mutex` is the default.** `RwLock` pays off only with genuinely
  read-heavy access, and can starve writers.
- **Poisoning is a decision, not an error to swallow.** A `Mutex` whose
  holder panicked hands back an `Err`; the honest answers are propagate or
  `into_inner()` with a written reason.
- **Guards are scoped.** The guard lives for the shortest possible scope,
  never across a call into code that might lock again — the deadlock a
  shared-state design invites.
- **Orderings are paired.** `Relaxed` for a counter nobody synchronises on,
  `Acquire`/`Release` for a publish/observe handoff, `SeqCst` when unsure.
  When the ordering argument cannot be written in two sentences, the code
  wants a `Mutex`.
- **A global is a lifetime nobody wrote down.** `thread_local!` over
  `static mut`, and passing state over hiding it.

## Common questions

**When is `RwLock` actually better than `Mutex`?** Only with genuinely
read-heavy access — many readers, rare writes. Under sustained contention
it can starve writers, so a lock that is not clearly read-heavy stays a
`Mutex`.

**Is `unwrap` on a poisoned lock ever right?** The honest answers are
propagate the `Err`, or take `into_inner()` with a written reason. An
`unwrap` is only as good as the argument "the state is still coherent
after the holder panicked" — and once that argument is written, it is the
reason for `into_inner`, not for the `unwrap`.

**Do I need `loom`?** Only for a hand-written lock-free structure or a
non-trivial ordering argument. It explores interleavings exhaustively
rather than hoping the scheduler picks the bad one; it runs under its own
cfg and needs the model to be small. Ordinary threaded code settles with
`cargo test` and `cargo miri test`.

## It's working if

- Every `unsafe impl Send`/`Sync` carries a `// SAFETY:` argument.
- No guard is held across a call that can lock again.
- No ordering weaker than `SeqCst` without a written reason.
- No `static mut`.

## Where it fits

`rust-concurrency` is the threaded-concurrency skill in the language-craft
group — the neighbour of `/async-rust`, which owns the task side of the
same decision. It defers whether state should be shared at all to
`/ownership-not-clone`, the soundness of an `unsafe impl` to
`/unsafe-rust`, and the throughput of the parallel version to
`/rust-performance`. See `rust-skills-map` for how the full set of Rust
skills relates.
