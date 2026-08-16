# 0006: Two mocking patterns, one decision rule

## Status

Accepted

## Context

Two patterns for making code testable arrive from different directions and are
routinely presented as rivals.

The first: define a trait for the dependency, implement it for the real thing, and
generate a mock implementation for tests. It suits an abstraction the crate owns and
would want anyway — a repository, a payment gateway, a policy.

The second: keep one concrete type, give it a private enum core with a real variant
and a fake variant, and expose the fake only behind a `test-util` feature. It suits
syscalls, clocks, and entropy, where the trait exists solely to permit substitution.
There, a trait costs a public generic parameter, or dynamic dispatch, on every type
that touches it — a permanent change to the public API paid for a test-only need.

## Decision

Teach both, with a decision rule rather than a preference: a trait plus a mock for
abstractions the crate owns and would define anyway; a private enum core behind a
`test-util` feature for substituting syscalls, clocks, and entropy inside a library
shipped to others.

## Consequences

`rust-testing` carries both patterns and the rule in `TEST-DESIGN.md` in wave 2. The
rule replaces "prefer traits for testability" as blanket advice — the blanket version
is what produces libraries whose public API is generic over a clock.
