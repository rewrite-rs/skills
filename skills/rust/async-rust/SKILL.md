---
name: async-rust
description: Write correct async Rust — runtime choice, Send and Sync bounds, cancellation safety, blocking work inside async contexts, and shared state across tasks. Use when writing or reviewing async code, when a future is held across an await point, when the user hits a Send bound error on a spawned task, when a runtime stalls or deadlocks, or when the user asks about tokio, select!, or spawn_blocking.
---

# Async Rust

Async Rust fails in three places: an executor thread that gets blocked, a guard
held across an await point, and a future dropped mid-operation. This skill
governs *correctness under concurrency and cancellation* — it does not decide
whether the code should be async in the first place. Error types for timeouts
and cancellation are `/rust-errors`; the general shared-ownership test is
`/ownership-not-clone`.

## Async is not free concurrency

An `async fn` yields a future that does nothing until polled. Concurrency comes
from the runtime and from combining futures — `join!`, `select!`, `spawn` — not
from the `async` keyword. The most common bug in agent-written async Rust is a
sequence of `.await`s that runs strictly serially and was meant to run
concurrently:

```rust
// Serial: the second fetch starts only after the first completes.
let a = fetch_user(id).await;
let b = fetch_orders(id).await;

// Concurrent: both futures are polled at the same time.
let (a, b) = tokio::join!(fetch_user(id), fetch_orders(id));
```

## Runtime choice, once, at the top

Pick a runtime — `tokio` in the overwhelming majority of cases — and let it into
the dependency graph deliberately. A library that hard-depends on a runtime
forces it on every consumer. The library rule: stay runtime-agnostic if you can,
feature-gate the runtime integration if you cannot, and never start a runtime
inside a library function — `#[tokio::main]` belongs in a binary or a test, and
a `Runtime::block_on` inside a library is how a consumer gets a second,
conflicting executor.

## Blocking work in an async context

A CPU-bound loop or a synchronous file or network call inside an `async fn`
stalls the executor thread and starves every other task on it. The fix:
`tokio::task::spawn_blocking` for blocking I/O and short CPU work, a dedicated
thread pool (`rayon`) for sustained CPU work, and never a `std::thread::sleep`
inside a task. The symptom is how this is actually noticed: latency on
*unrelated* tasks, not on the offending one.

## `Send`, `Sync`, and the spawn bound

`tokio::spawn` requires `Send + 'static`, so everything held *across* an `.await`
inside the task must be `Send`. This is where `Rc` and `RefCell` fail to
compile, and where a `std::sync::MutexGuard` held across an `.await` becomes a
deadlock:

```rust
// Deadlock waiting to happen: the std guard is held across the await.
let mut guard = state.lock().unwrap();
guard.value = fetch().await;

// Either drop the guard before awaiting…
let value = fetch().await;
state.lock().unwrap().value = value;

// …or use the async-aware mutex when the lock genuinely must span the await.
let mut guard = state.lock().await; // tokio::sync::Mutex
guard.value = fetch().await;
```

The default, stated plainly: prefer `std::sync::Mutex` with a short critical
section that never crosses an `.await`; reach for `tokio::sync::Mutex` only when
the lock must span one. `clippy::await_holding_lock` catches the common case.

## Cancellation safety

Any future can be dropped at any `.await` point — that is what `select!` and
timeouts do. A future that has consumed input but not yet committed it loses
data when dropped mid-flight. The rule: do the irreversible step in one
non-cancellable piece, or make the operation resumable. The worked cases — the
`select!` trap, which common operations are safe, and timeouts as cancellation —
live in `CANCELLATION.md`.

## Shared state across tasks

`Arc<Mutex<T>>` for shared mutation, channels (`mpsc`, `watch`, `broadcast`) for
handing work between tasks, and message passing when the state has one logical
owner — a task that owns its state and is told what to do beats tasks that reach
into shared memory. The general shared-ownership test is
`/ownership-not-clone`; this section is only the async-specific part.

## Async in a public API

Making a public function `async` commits the crate to a runtime story and
infects every caller — the semver treatment is `/rust-api-design`. `async fn` in
traits works on modern Rust but still lacks `Send` bound sugar, and
`#[async_trait]` remains the pragmatic choice for object-safe async traits.

## Deferrals

Error types for timeouts and cancellation are `/rust-errors`. Shared-ownership
modelling generally is `/ownership-not-clone`. Public-surface commitments are
`/rust-api-design`. `unsafe` in a manual `Future` impl — the `Pin` invariants —
is `/unsafe-rust`.

## Verification

```bash
cargo clippy --all-targets   # add -- -D warnings only if the repo has no lint config
cargo test
```

Run clippy at the lint level configured in the repo — the async-relevant lints
(`await_holding_lock`, `await_holding_refcell_ref`, `async_yields_async`) are
read out of the output, not switched on in a repo that configured its own. And
the concurrency-specific caution: async bugs are timing-dependent, so a passing
`cargo test` is weak evidence. Where the repo already uses `#[tokio::test]`, run
the multi-thread flavour for tests covering the changed path —
`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]` — because
single-threaded tests hide exactly the starvation and ordering bugs this skill
is about.
