# 0007: Profile-first governs micro-optimisation

## Status

Accepted

## Context

Performance guidance splits into two kinds that read as equally actionable and are
not. One kind is measurement discipline: profile, find the hot path, fix what the
profile named. The other is a catalogue of knobs — link-time optimisation, one
codegen unit, profile-guided optimisation, `target-cpu`, `#[inline(always)]` — each
with a plausible rationale and none with a stated precondition.

Shipped side by side with no ordering, the catalogue wins, because a knob is one line
and a profile is an afternoon. The result is a crate carrying `target-cpu=native` in
its committed config, producing binaries that fault on a colleague machine.

## Decision

Profile-first governs. Measurement precedes every optimisation, and the knobs are
taught as the last few percent, after the allocation and algorithm work the profile
pointed at.

Deployment-shaped flags — profile-guided optimisation, `target-cpu`, and one codegen
unit — are application decisions, never library defaults, and every mention states
the portability cost alongside the gain. `#[inline(always)]` is rare and needs a
measured reason, not an intuition about function size.

Related: `panic = "abort"` is rejected as a default for the same reason. It is an
application-level choice, libraries cannot assume unwinding, and it changes behaviour
under `#[should_panic]`.

## Consequences

`rust-performance` opens on profiling and benchmarking and closes on flags, in that
order, and its flags section names the portability cost of each. No skill in the set
recommends a release profile that sets `panic = "abort"` or a `target-cpu` value.
