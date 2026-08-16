## What it does

Runs a port into Rust as a behaviour-preserving move: it records the
end state, writes the parity contract, sequences the five phases,
and requires parity to be proven differentially before the source
implementation is deleted. The defining constraint: it owns the
process common to every port and carries no construct mapping for
any source language — the construct mapping for a specific
language lives in the per-language skills.

## When to reach for it

Model-invoked: the agent pulls this in when an existing codebase is
moving into Rust, when a rewrite needs sequencing or scoping, when a
partially-ported system needs both implementations running side by
side, or when a port needs to prove it matches its source. It does
not cover construct mapping from any one language (the per-language
skills), the mechanics of the differential harness
(`/rust-testing`), the shape of the Rust that comes out
(`/idiomatic-rust` and the other craft skills), or the review pass
over a ported diff (`/rust-code-review`). The user can run it directly, as
`/port-to-rust`.

## Prerequisites

A source implementation that can still be run — without it there is
no differential evidence available, only characterization tests —
and a Cargo project for the Rust side.

## The end state and the parity contract

The end state is written down before anything else, because it
decides what the rest of the contract means. The one-line test:
does anything import this from another language after the port is
finished?

- **A — replacement.** A standalone Rust binary or crate; the
  source implementation is deleted; no binding layer at any point.
- **B — Rust core with a permanent binding layer.** The binding
  surface is public API that outlives the port: it gets semver,
  packaging per platform, and its own docs.
- **C — scaffold bindings.** A binding layer built to be thrown
  away; phase 5 is not done until it is deleted.

The contract then answers four questions: the unit of parity, which
differences are acceptable, which are not, and how parity is
measured. It is a file in the repo, edited deliberately, and it is
what the differential harness enforces. The full form — bad-answer
examples, the filled-in `logfmt` example, the trap in each
"acceptable" difference, and the triage rule when the two
implementations disagree — is in `PARITY-CONTRACT.md`.

## The five phases

1. **Inventory and seam** — the boundary the Rust will live behind
   is named, and the call sites crossing it are counted.
2. **Characterize** — the existing behaviour is captured as
   executable tests, against the source implementation, bugs
   included.
3. **Port leaf-first** — the lowest-dependency module is in Rust,
   called through the seam, with both implementations still
   present.
4. **Run both** — every input reaching the seam goes through both
   implementations and the outputs are compared.
5. **Cut over and delete** — traffic goes to Rust only, and the
   source implementation is deleted rather than left as a dead
   fallback.

What each phase produces, what done looks like, and the failure
that skipping it causes is in `PHASES.md`.

## Common questions

**What if the source implementation cannot be run at all?** Then
there is no differential evidence — only characterization tests,
and the definition of done weakens to "matches the documented
behaviour," which must be said plainly rather than claimed as
parity.

**May a port fix a known bug?** No. The fix is recorded as a
follow-up and shipped after parity is proven; a commit that ports
and fixes cannot be attributed, so the harness cannot tell the fix
from a regression.

**Does a port have to produce bindings?** No. That is end state B,
the case where the package the existing consumers import is the
deliverable. End state A is a standalone replacement with no
binding layer at any point, and C uses bindings only as scaffold
that is deleted at cut-over.

**How do you tell scaffold bindings from product bindings?** The
question is whether the binding surface outlives the port.
Scaffold may be crude because it dies; product bindings are a
public API with semver, per-platform packaging, and docs. The
answer goes in the parity contract, because it changes what the
unit of parity is.

**How faithful should the structure be?** Behaviour is faithful,
structure is not. The domain survives a port; the source module
layout does not. Restructuring is allowed precisely because the
parity contract is written in terms of observable behaviour — and a
Rust structure that mirrors the source is a signal to re-examine; the
entry is in `ANTIPATTERNS.md`.

**How does this relate to the per-language skills?** Those carry
the construct mapping and FFI mechanics for one source language
each; this skill carries the process they all share, and it runs
first and stays running through the port.

## It's working if

- The end state (A, B, or C) is written down before any Rust was
  written.
- A written parity contract exists before any Rust was written.
- The characterization tests pass against the source
  implementation, before any Rust exists.
- The differential run reports a denominator — the count of inputs
  compared and the count of differences — not just a pass.
- No commit mixes a behaviour change with a port.
- The source implementation was deleted at cut-over rather than
  left in place.
- The Rust module structure was chosen, not inherited.

## Where it fits

`port-to-rust` is the process skill in the porting group — the one
the per-language skills invoke for everything common to a
port. It defers the differential-harness mechanism to
`/rust-testing`, the shape of the Rust to the craft skills
(`/idiomatic-rust`, `/ownership-not-clone`, `/rust-errors`,
`/type-driven-design`, `/rust-api-design`, `/async-rust`,
`/unsafe-rust`), and the review pass to `/rust-code-review`. See
`rust-skills-map` for how the full set relates.
