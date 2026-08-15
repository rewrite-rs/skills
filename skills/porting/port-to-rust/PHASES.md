# Phases

The five phases in depth: what each produces, what done looks like,
and the failure that skipping it causes. The order is the point — the
phases do not run in any other order, and a phase entered early
re-runs later at full cost.

## Phase 1 — inventory and seam

**Produces.** A list of modules with the direction their dependencies
point, and a named seam.

**Done when.** The seam is somewhere both implementations can be
called — ideally a boundary that already exists: a process, an
interface, a public function with few callers — and the call sites
crossing it are counted.

Choosing the seam is the whole phase. It decides which strategy
applies, what the unit of parity is, and whether the differential
harness has a place to live. Skip it and the port has no place to put
the harness — a port that cannot be validated until it is finished,
at which point validation has no buyer left.

## Phase 2 — characterize

**Produces.** Executable tests over the behaviour that exists, run
against the source implementation and passing before any Rust
exists.

**Done when.** The suite covers the error paths explicitly. The
error paths are the least-tested part of most codebases and the most
narrowed part of most ports, so a suite that never exercised one
does not prove one does not matter. If the source has tests, they
are inputs, not the contract — the characterization suite comes from
running the source, with expected values recorded from what the
source actually does, bugs included. The harness shapes are
`/rust-testing`.

## Phase 3 — port leaf-first

**Produces.** One Rust module behind the seam, with the source
implementation still present and still callable.

**Done when.** The module ported is the lowest-dependency one
remaining. A leaf validates in isolation; porting top-down means
every module below it is a stub the harness cannot exercise, so the
"green" says nothing about the real dependency. The corollary for
scope: one module per session, and the session ends with both
implementations green.

## Phase 4 — run both

**Produces.** A period in which every input reaching the seam goes
through both implementations and the outputs are compared — in CI or
in production shadow traffic, depending on the seam.

**Done when.** Every difference found is triaged to one of the three
outcomes in `PARITY-CONTRACT.md`, and the difference report is being
read. The two failure modes: comparing outputs normalized so
heavily that they cannot differ, and running both for a week with
no one reading the report. Skip it and the cut-over rests on tests
that never compared the two implementations — every difference a
caller can see becomes a mystery on the day the source is deleted.

## Phase 5 — cut over and delete

**Produces.** One implementation. Under end state C this includes
deleting the scaffold bindings — part of this phase, not a follow-up
ticket. Under end state B the binding layer survives on purpose, and
the phase ends with it documented, versioned, and packaged for every
platform the old package supported; a B port that ships artifacts
for one platform when the source shipped four has not cut over.

**Done when.** Traffic goes to the Rust implementation only, and the
source implementation is gone.

The deletion is the phase. A source implementation kept "just in
case" is unmaintained within a month and diverges silently, and the
next person cannot tell which one is authoritative. If a rollback
path is genuinely required, it is a tagged commit of the old
release, not a live second implementation.

## Sequencing across sessions

A port is a sequence of small, individually green sessions, each
ending with the whole system building and both harnesses passing. A
session that ends with the seam half-moved is a session that gets
redone, so the cut is drawn where a green end is possible.
