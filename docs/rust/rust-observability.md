## What it does

Instruments Rust code as structured events with named fields — which layer to
use, how to name events, what each level means, where spans carry context, and
how to keep secrets and duplicate error logging out of the output. The
defining constraint: a log line is an event, not a sentence, and a library
emits and never installs a subscriber.

## When to reach for it

Model-invoked: the agent pulls this in on its own when adding logging or
tracing to Rust code, when reviewing `println!` or string-interpolated log
messages, when a library installs a subscriber, or when asked how to
instrument Rust code. It does not cover what an error type contains and how it
chains (`/rust-errors`), span behaviour across cancellation (`/async-rust`),
or whether the redacting newtype fits a domain (`/type-driven-design`). The user
can run it directly, as `/rust-observability`.

## Events, not sentences

Fields stay fields: `error!(user_id, %path, "config load failed")` keeps
`user_id` and `path` as named columns a dashboard can group by, while an
interpolated message becomes a string someone will later write a regex
against. Events are named `component.operation.state` — `config.load.failed`,
`pool.connection.acquired` — because a consistent scheme is what makes a
dashboard possible. The layers: `println!` for a CLI producing output the
user asked for, `log` when the dependency budget is tight, `tracing` as the
default. Levels earn their meaning at the boundary: `error!` means someone
should look, so a handled and expected failure is `warn!` or `debug!` at most.

## Libraries emit, applications subscribe

A library emits and never installs a subscriber. Installing one is global
state the application owns: the binary installs the subscriber exactly once,
and a library that installs one too fights for the global — a panic at
startup with `tracing`, a re-formatted event stream with `log`. Per-module
filtering with `EnvFilter` (`RUST_LOG="pool=debug,config=info"`) is the whole
story on the library side. Within it, the remaining library-side rules:
errors are logged once, at the boundary that handles them, with the whole
`source` chain rather than the top-level `Display` alone. Secrets sit behind
a redacting newtype, so no call site — present or future — can log them. And
field values are passed lazily, so a `debug!` that is off in production costs
only the enablement check.

## Common questions

**`log` or `tracing`?** `tracing` by default: spans carry context across
`.await` points, and field capture is part of the API. `log` is the older,
format-string facade — right when the dependency budget is tight, where the
discipline degrades to keeping messages stable and parseable rather than
queryable.

**Is `println!` ever right?** In a binary producing output the user asked
for — progress lines, generated content, the result of a command. Never in a
library: a library has no stdout of its own, and no level, filter, or
structure to attach the output to.

**Where do metrics fit?** A metric is an event a backend aggregates — a
count, a sum, a histogram — rather than a line a human reads. Emit it with
the same named fields and the same `component.operation.state` name, and let
the collector do the counting. The shared scheme is what keeps a metric and a
log line joinable.

**How do I keep a secret out of a log for good?** A redacting newtype:
`Debug` and `Display` print a fixed placeholder, so the `?` and `%` capture
paths print the placeholder, and the bare field form does not compile for a
custom type at all. A grep for the literal value finds the type, not the
token, and a future call site cannot regress it.

## It's working if

- No `println!` in library code.
- Log calls carry named fields rather than interpolated values.
- Exactly one subscriber, installed in the binary.
- Secrets sit behind a redacting type.
- Errors are logged once, with the chain.

## Where it fits

`rust-observability` is the instrumentation skill in the language-craft
group: it owns how Rust code reports what it is doing — layer, name, level,
span, field. It defers error-type contents to `/rust-errors`, the
redacting-newtype model to `/type-driven-design`, and span behaviour across
cancellation to `/async-rust`. See `rust-skills-map` for how the full set of
Rust skills relates.
