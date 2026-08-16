## What it does

Designs the test side of a change — which behaviours earn a test, which of the
five forms the test takes, and, for a port, the differential harness that
proves the Rust implementation matches its source. It decides *what deserves a
test and in which of the five forms*, and it never decides what the code under
test should look like: shaping the code belongs to the craft skills, and the
verdict on whether a change is tested at all is `/rust-code-review`.

## When to reach for it

Model-invoked: the agent pulls this in on its own when writing or reviewing
Rust tests, when a change lands without tests, when deciding what form a test
should take, when a port needs parity evidence, or when the user asks about
`proptest`, `insta`, `rstest`, or test coverage. It does not cover the design
of error variants (`/rust-errors`), Miri verification of `unsafe` code
(`/unsafe-rust`), async test flavours and time control (`/async-rust`), or the
parity contract of a port, which belongs to `/port-to-rust`.

## Choosing the form

The form follows the assertion, not the habit:

| Form | Use it when |
|---|---|
| Unit test in `#[cfg(test)] mod tests` | The assertion needs private access, or the unit is a pure function with interesting edges |
| Integration test in `tests/` | The assertion is about the public API a real caller sees — imports the crate as a consumer would |
| Doc test | The example is documentation first; a doc test that is really a unit test in disguise belongs in `mod tests` |
| Property test (`proptest`) | The rule holds for a whole input space — round-trips, invariants, parser/serializer pairs |
| Snapshot test (`insta`) | The output is large, structured, and reviewed by eye — rendered text, generated code, error reports |

The corollary: a bug found in production earns a test at the level the bug
lived, not an end-to-end test that happens to cover it. Table-driven cases
carry the input in the assertion message, so a failure names the case. The
file locations, reach, costs, and worked examples for each form are in
`TEST-DESIGN.md`, along with snapshot discipline, golden files, fixtures,
making a dependency substitutable, and the list of what not to test.

## Proving a port matches its source

When a Rust implementation replaces an existing one, the strongest available
evidence is both running over the same inputs and agreeing.
`DIFFERENTIAL-TESTING.md` supplies the three harness shapes — recorded corpus,
side-by-side execution, property-driven — the normalizations that keep
non-behaviour differences out of the comparison, and the triage for when the
outputs disagree. This skill owns the mechanism only; the parity contract that
says which differences are acceptable belongs to `/port-to-rust`.

## Common questions

**Is a test that restates the implementation acceptable?** No — it fails on a
refactor and passes on the behaviour break, which is backwards. The regression
it would catch must be nameable in one sentence before the test is written.

**Coverage is low — should tests be written to raise the number?** No. The
uncovered branches are looked at, and the ones that matter earn a test for the
behaviour, not the line. A percentage as a merge gate produces tests written
to touch lines.

**Does the differential harness stay after the port?** The recorded corpus
does — it is the parity baseline CI can run forever. Side-by-side execution
retires with the source runtime; it is the bridge, not the destination.

**Should I use `mockall` or a fake?** The rule picks the pattern first: a
trait plus a mock (what `mockall` generates) for an abstraction the crate
owns and would define anyway; a private enum core with a fake variant behind
a `test-util` feature for syscalls, clocks, and entropy in a shipped library
— where there is no public trait for `mockall` to mock.

## It's working if

- Every new test was observed failing before being accepted — the fix
  commented out or the assertion inverted, and the failure read.
- Failures name the case, not just a line number.
- Error-path assertions match on variants rather than message strings.
- No test computes its expectation from the logic under test.
- Test-only helpers sit behind a feature.
- No test reads the wall clock or the network, and every generator seed is
  explicit.
- Snapshot diffs were read before acceptance.
- `cargo test --all-features` and `cargo test --doc` both pass, and clippy ran
  at the lint level configured in the repo.

## Where it fits

`rust-testing` is the testing skill in the workflow group — the one
`/rust-code-review` defers the test design to, and the one the porting
skills invoke for the differential harness. It defers
error-variant design to `/rust-errors`, `unsafe` verification to
`/unsafe-rust`, async test flavours to `/async-rust`, the concurrency model
behind a `loom` test to `/rust-concurrency`, and benchmarking to
`/rust-performance`. See `rust-skills-map` for how the full set of Rust
skills relates.
