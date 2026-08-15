# The parity contract

The contract a port starts from: what the unit of parity is, which
differences are acceptable and which are not, and how parity is
measured. It is a file in the repo, edited deliberately, and it is
what the differential harness enforces.

## The end state, recorded first

The end state decides the other answers, so it is written down before
them. The one-line test: does anything import this from another
language after the port is finished?

- If no, **A — replacement**: a standalone Rust binary or crate, the
  source implementation deleted, no bindings at any point.
- If yes, and that is the product, **B — Rust core with a permanent
  binding layer**: the binding surface is public API that outlives
  the port.
- If yes only until cut-over, **C — scaffold bindings**: a binding
  layer built to be thrown away and deleted in phase 5.

The consequence for the contract: under B the binding signatures are
part of the parity unit, and changing one is a breaking change, so
the contract names them. Under A and C the binding layer has no
parity obligations at all beyond the phase it exists in.

## The four questions

Each with what a bad answer looks like.

- **What is the unit of parity?** One thing a harness can feed and
  compare: a CLI invocation, a library function, an HTTP response, a
  file artifact. Bad answer: "the whole app" — untestable, so nothing
  is ever checked.
- **Which differences are acceptable?** A short, closed list — log
  wording, timing, map iteration order, float formatting, timestamps,
  absolute paths. Bad answer: unwritten — every difference becomes an
  argument.
- **Which differences are not?** Anything a caller can observe or
  branch on: exit codes, error classes, numeric results, observable
  ordering. Bad answer: unwritten — every difference becomes a shrug.
- **How is parity measured?** A named corpus, a harness that runs it
  in CI, a denominator that gets reported. Bad answer: "we'll test
  it" — no corpus, no denominator.

## A filled-in example

A contract for a CLI tool, written out, so the shape can be copied:

```markdown
## Parity contract — `logfmt` port

- **Unit:** one process invocation — argv plus stdin in, stdout plus stderr plus exit code out.
- **Acceptable differences:** wall-clock timing; the wording of `--help`; the order of
  keys within one output record when the input order was not defined.
- **Unacceptable differences:** exit code; any byte of stdout for a valid input; the
  error *class* on stderr (the wording may change, the class may not); memory-safety
  behaviour on malformed input, which must remain a clean error rather than a crash.
- **Measurement:** 4,102 recorded invocations from production logs, replayed through
  both implementations in CI on every commit; plus a `proptest` generator over the
  record grammar. Done means zero unacceptable differences across the corpus and a
  green property run at the default case count.
```

## Almost always acceptable, and the trap in each

Every one of these is a normalization the harness must apply, and
every normalization is written into the contract — a normalization
the contract never names is how a real difference gets smoothed out
of the report.

- **Map and set iteration order** — acceptable unless the source
  implementation exposed it and a caller relied on it.
- **Float formatting** — acceptable in logs, never in a serialized
  artifact another system parses.
- **Timestamps and durations** — acceptable when the contract never
  names a specific instant; never when a caller compares them.
- **Absolute paths** — acceptable when the contract is the path
  structure, not the checkout location.
- **Log wording** — acceptable; the class of the message is not.

## Never acceptable without an explicit, dated decision

- Exit codes and error classes.
- Silently narrowed input acceptance — the source handled an edge
  case, the port rejects it.
- Numeric results.
- Ordering that a caller can observe.
- Anything that changes what a caller can branch on.

## Triage when the two disagree

Three outcomes, and who decides:

1. **The source behaviour is the contract, and the port is wrong.**
   The port is fixed.
2. **The source behaviour was a bug, and the contract changes.** The
   change is dated and recorded, and it is the decision of the owner
   of the contract — not of the agent running the port.
3. **The difference is out of scope**, and becomes a documented
   normalization.

The rule: an agent running the port never picks outcome two or three
silently.

## When the contract changes mid-port

It happens. The requirement: it is edited in one place, with a line
saying what changed and why, and the harness is updated in the same
commit. A contract that drifts to match the port is not a contract.
