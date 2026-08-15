# 0001: Verification steps run cargo

## Status

Accepted

## Context

Skill sets for dynamically typed or loosely checked languages often stop at prose
guidance and never run a verification command — a defensible choice there, since a
lot of correctness in those languages cannot be settled by a single command, and the
guidance has to lean on judgment because the tooling can't close the loop.

Rust is different. Most of the correctness claims a Rust skill makes — this compiles,
this doesn't leak an unsafe invariant, this lint is clean, this macro expands to what
you think it does — are machine-checkable with a single `cargo` invocation. Writing
skills that stop at prose guidance and never run the checker they're describing throws
away the thing that makes Rust guidance different from guidance for a dynamically
typed language.

## Decision

Every skill in this repo where a machine can settle the question ends with a
verification step that the agent actually runs, not just describes. Candidates
include `cargo clippy`, `cargo test`, `cargo miri test`, `cargo expand`, and
`cargo tree -d`. Which command applies depends on what the skill teaches — a skill
about unsafe invariants ends in `cargo miri test`, a skill about dependency bloat ends
in `cargo tree -d`, and so on. A skill that makes no machine-checkable claim (for
example, a purely conceptual or process skill) is exempt, but the default assumption
is that a Rust skill has a verification step, and its absence needs a reason.

## Consequences

Skills written this way are less portable to a repo without a Cargo project — the
verification step assumes `cargo` is on the path and a `Cargo.toml` exists. That
tradeoff is accepted because this is a Rust skill set; every skill already assumes a
Rust codebase.

This decision also makes the config-precedence rule binding rather than advisory:
verification runs at the repo's own configured lint level (whatever `clippy.toml` or
equivalent already says), and `cargo clippy -- -D warnings` is the fallback only when
the repo has no lint configuration at all. A skill must never silently override a lint
level the user — or an earlier run of `setup-rust-skills` — deliberately set.
