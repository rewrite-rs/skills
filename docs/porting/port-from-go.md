## What it does

Maps Go constructs to Rust and carries the mechanics of the seam — a
process boundary for the common case, cgo only when Go keeps calling
the code. The defining constraint: it maps Go concurrency and value
semantics, where a Go port actually lives, and defers process to
`/port-to-rust` — the parity contract, the phases, and the
anti-patterns.

## When to reach for it

Model-invoked: the agent pulls this in when Go code is moving into
Rust — a Go service, a Go CLI, a Go component being replaced by a Rust
one behind the same interface — and the question is what a Go
construct becomes, or how the seam works. It does not cover how a port
is run (`/port-to-rust`), the differential harness (`/rust-testing`),
the runtime rules the goroutine-to-task mapping defers to
(`/async-rust`), or the shape of the Rust that comes out
(`/idiomatic-rust` and the other craft skills).

## Prerequisites

A runnable Go implementation with `go test` passing, a Cargo project,
and an identified seam — for Go that is usually an existing process
boundary. The end state is decided by `/port-to-rust` first, because
whether cgo appears at all is settled there.

## The traps

| Trap | What actually differs |
|---|---|
| Integer overflow | Go wraps on overflow, always. Rust panics in debug and wraps in release. Any arithmetic that could overflow needs an explicit choice — `wrapping_add` to reproduce Go, or checked arithmetic plus a decision about what the new error path does |
| Zero values | Every Go type is constructible with all fields zeroed, and code relies on it — an empty struct is a valid, meaningful value. Rust has no implicit zero value, so each such site becomes either a `Default` impl (reproducing the behaviour) or a constructor that refuses (changing it). Reproducing is parity; refusing is an improvement, and improvements wait |
| `nil` is several things | A nil pointer, a nil slice (which appends fine and has length zero), a nil map (which reads fine and panics on write), and a nil interface holding a typed nil. `Option<T>` covers the first; the rest are behaviour, not absence, and mapping them all to `Option` produces subtle breakage |
| Slice aliasing | Go slices share a backing array, so a subslice mutation is visible through the original and `append` may or may not copy depending on capacity. Rust makes this impossible, which is the point — but if the source relied on the aliasing, the port must reproduce the *observable effect* deliberately, and if it relied on it accidentally, that is a bug found by the port and recorded |
| Error strings as contract | Go code branches on `err.Error()` text and on sentinel values via `errors.Is`. A port that redesigns the error taxonomy breaks callers that were matching on strings. Map the sentinel set first, then design — `/rust-errors` |

## Goroutines, channels, and context

`go f()` maps to `tokio::spawn` or a thread, decided per call site on
whether the work is IO-bound or CPU-bound; channels map to
`tokio::sync::mpsc` (or `crossbeam` for threads); `select` maps to
`tokio::select!`; `sync.WaitGroup` maps to collected `JoinHandle`s.
The differences that matter: a Rust future is lazy until polled while
a goroutine starts immediately; `tokio::select!` cancels the losing
branches, so branches holding state need cancellation safety; and a
bounded Rust channel introduces backpressure an unbounded Go channel
did not have, which is a contract change when it can block a caller.
`context.Context` maps to structure, not a parameter: cancellation
becomes a `CancellationToken` or a shutdown channel, deadlines become
`tokio::time::timeout`, and request-scoped values become explicit
parameters or a request struct.

## Common questions

**Does a Go port need cgo bindings at all?** Usually not. End state A
is the common case: a standalone Rust replacement strangling an
existing process boundary, with no binding layer at any point. cgo
appears only under B (the Go-importable package is the product) or C
(a leaf moves before its callers).

**Is cgo worth it when it does appear?** It is a cost to state
honestly: cgo calls cost far more than a Go function call, the Go
runtime and the Rust side each want their own threads, panics do not
cross safely, and a cgo port loses `CGO_ENABLED=0` static builds.
Under C it may be crude because it is deleted at cut-over; under B it
is a public API. The default remains the process seam.

**What happens to `context.Context`?** It maps to structure, not to a
parameter: a `CancellationToken` or shutdown channel for
cancellation, `tokio::time::timeout` for deadlines, and explicit
parameters or a request struct for the values threaded through
context.

**How do you reproduce Go integer wraparound?** Per arithmetic site:
`wrapping_add` and friends reproduce Go; checked arithmetic plus an
explicit decision about the new error path changes behaviour, and the
change is recorded in the parity contract.

**Why should an interface with one implementer not become a trait?**
Because the interface then carries no abstraction — it is a struct.
Only count more than one implementer, or a genuine substitution point,
into a trait; a test-substitution interface maps to a generic
parameter rather than `dyn`.

**Must a nil map read be reproduced?** Yes, if a caller can observe
it. A nil Go map reads the zero value and panics on write; mapping it
to something that refuses the read changes observable behaviour and
is not a port of the source.

## It's working if

- Overflow behaviour was decided per arithmetic site and written down.
- Zero-value reliance was found before it was hit in production.
- The sentinel error set maps one-for-one to enum variants.
- Channels were sized deliberately and the backpressure change is in
  the contract.
- The differential run exercised more than one worker thread.

## Where it fits

`port-from-go` is the Go member of the per-language porting skills:
it owns the construct mapping and the Go boundary — the process seam
and cgo — and defers everything common to a port to `/port-to-rust`,
the harness mechanism to `/rust-testing`, the runtime rules to
`/async-rust`, and the target-side judgment to the craft skills
(`/rust-errors`, `/ownership-not-clone`, `/idiomatic-rust`). Its
neighbours are `port-from-python` and the other per-language skills as
they land — C, C++, TypeScript, and Java — which share its
three-file shape but carry different traps and a different boundary.
See `rust-skills-map` for how the full set relates.
