## What it does

Governs correctness under concurrency and cancellation — runtime choice, the
`Send`/`Sync` bounds a spawned task must satisfy, blocking work that stalls an
executor, locks held across await points, and futures dropped mid-operation. It
does not decide whether the code should be async in the first place.

## When to reach for it

Model-invoked: the agent pulls this in on its own when writing or reviewing
async code, when a future is held across an await point, when a `Send` bound
error appears on a spawned task, when a runtime stalls or deadlocks, or when
asked about `tokio`, `select!`, or `spawn_blocking`. It does not cover error
types for timeouts and cancellation (`/rust-errors`), the general
shared-ownership test (`/ownership-not-clone`), or the semver cost of a public
`async` function (`/rust-api-design`).

## Prerequisites

An async runtime already chosen and in the dependency graph. This skill does not
port a synchronous codebase to async — the decision to go async, and which
runtime, is made before it applies.

## Send bounds, locks, and blocking work

- **Async is not free concurrency.** A future does nothing until polled;
  concurrency comes from combining futures. Serial `.await`s that were meant to
  run concurrently become `tokio::join!`.
- **The spawn bound.** `tokio::spawn` needs `Send + 'static`; everything held
  across an `.await` must be `Send` — where `Rc`/`RefCell` fail to compile, and
  where a `std::sync` guard held across the await becomes a deadlock. Default:
  `std::sync::Mutex` with a critical section that never crosses an `.await`;
  `tokio::sync::Mutex` only when the lock must span one.
- **Blocking work.** `spawn_blocking` for blocking I/O and short CPU work,
  `rayon` for sustained CPU, never `std::thread::sleep` in a task. The symptom
  is latency on unrelated tasks, not the offending one.
- **Shared state.** `Arc<Mutex<T>>` for shared mutation, channels for handing
  work between tasks, message passing when the state has one logical owner.

## Cancellation safety

Any future can be dropped at any await point — that is what `select!` and
timeouts do. An operation is cancellation-safe if the drop leaves no work
half-done and loses no data already taken. The `select!` trap (take input before
the race), the common-operation table (`recv` and `sleep` safe; a transaction
future not), timeouts as scheduled drops, and the two structural fixes
(write-then-acknowledge; resumable checkpoints) live in `CANCELLATION.md`,
alongside the graceful-shutdown pattern and the cancellation-token mechanics.

## Channel shapes

Pick the channel by what it means, not by speed: `mpsc` for many producers to
one consumer, `oneshot` for a single reply, `watch` for the latest value where
missing intermediate values is correct, `broadcast` for every receiver seeing
every message with a bounded backlog. Picking `broadcast` where `watch` was
meant produces a lagging receiver error nobody expected.

## Common questions

**`std::sync::Mutex` or `tokio::sync::Mutex`?** `std` by default, with the
critical section kept clear of await points. `tokio::sync::Mutex` when the
lock must span an await — it parks the waiting task instead of blocking the
thread.

**Is `join!` enough, or do I need `spawn`?** `join!` runs both futures in the
current task — structured, no `Send + 'static` requirement. `spawn` runs them in
separate tasks — independent lifetimes, but the full spawn bound applies.

**Why did the single-threaded test pass but production stall?** Async bugs are
timing-dependent; a single-threaded `#[tokio::test]` hides starvation and
ordering bugs. Run the changed path with
`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]`.

## It's working if

- No `std::sync` guard is held across an `.await`.
- No blocking call sits directly in an `async fn`.
- No CPU-bound loop runs without either `spawn_blocking` or a yield.
- Concurrent work uses `join!`/`spawn` rather than sequential `.await`s.
- Every `select!` branch is cancellation-safe or documented as the deliberate
  loser.
- A timeout wraps only operations that are safe to drop mid-flight.
- Shutdown is a token, not a dropped handle.
- `cargo test` passes — with the multi-thread flavour where the repo already
  uses `#[tokio::test]`.

## Where it fits

`async-rust` is the concurrency-correctness skill in the language-craft group.
It owns the across-`.await` lock rule that `/ownership-not-clone` points at for
its general shared-ownership test, hands error types for timeouts to
`/rust-errors`, public-surface commitments to `/rust-api-design`, and `unsafe`
in a manual `Future` impl to `/unsafe-rust`. See `rust-skills-map` for how the
full set of Rust skills relates.
