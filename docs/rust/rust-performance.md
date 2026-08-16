## What it does

Profiles before it optimises, and never recommends a change no measurement
pointed at: it finds the hot path, cuts allocation out of it, and treats LTO,
one codegen unit, PGO, and `target-cpu` as the last five percent, each with
the portability cost stated alongside the gain.

## When to reach for it

Model-invoked: the agent pulls this in on its own when Rust code is too slow,
when a benchmark regresses, when reviewing code that allocates or formats
inside a loop, or when release-profile and codegen flags come up. It does not
cover async throughput or executor stalls (`/async-rust`), `unsafe` for speed
(`/unsafe-rust` — the answer there is a soundness argument, not a benchmark),
or whether a clone the profile found should exist at all
(`/ownership-not-clone`). The user can run it directly, as `/rust-performance`.

## Prerequisites

Something to measure: a benchmark, a profile, or a reproducible slow workload.
Without one, the skill starts by building the measurement, and no change lands
until the measurement names a target.

## Measure, then change

No optimisation lands without a measurement that named it. The two costs of
skipping it — the change that made nothing faster, and the change that made
the code worse in exchange for nothing — are why the measurement is the entry
ticket. A profile exists to find the one function that holds the time, which
is almost never the one that looked expensive while reading. Part of the
measurement is `[profile.bench]` with `debug = 1`: without it, the profiler
shows addresses instead of function names.

## Allocation

The highest-yield category: `Vec::with_capacity` when the size is known,
clear-and-reuse over allocate-per-iteration, `Box<[T]>` and `Box<str>` for an
owned sequence that will never grow, `mem::take` to move a value out of a
`&mut` without cloning, no `format!` in a hot loop, and `Cow` for the
borrow-or-own case. The buffer-passing shapes and the reuse patterns behind
each are in `ALLOCATION.md`.

## Common questions

**Is `target-cpu=native` safe to commit?** No — the binary is then tied to
the build host and faults on an older machine. It is an application decision,
stated alongside the gain, never a library default.

**Does the default hasher matter?** Only when the keys are not
attacker-controlled — internal IDs, enum discriminants, interned strings. The
default is DoS-resistant and correspondingly slow; with attacker-controlled
keys the swap is a denial-of-service surface, and the risk goes in the commit
message rather than the code.

**Does a benchmark need `criterion`?** No — `divan` is enough when a lighter
harness suffices. But a comparison needs a stored baseline: a benchmark run
without one proves nothing about the change.

## It's working if

- Every optimisation in the diff traces to a measurement that named it.
- `[profile.bench]` sets `debug = 1`, so the profiler shows names.
- No `format!` in the hot path the profile named.
- No deployment-shaped flag committed into a library: no `target-cpu`, no PGO
  profile, no `panic = "abort"` as a default.

## Where it fits

`rust-performance` is the measurement-discipline skill in the language-craft
group — the one a review pass routes to when the question is throughput. It
defers async and executor questions to `/async-rust`, `unsafe`-for-speed to
`/unsafe-rust`, and clone-existence questions to `/ownership-not-clone`. See
`rust-skills-map` for how the full set of Rust skills relates.
