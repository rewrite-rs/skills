## What it does

Sets up a fast pre-commit hook for a Rust repo — format and lint the staged
changes only, in about two seconds. The defining constraint: a hook is a
convenience, never a gate. CI is the gate — it runs on every push whether or
not a local hook ever fired — and a hook that tries to be the gate gets slow,
and a slow hook gets bypassed with `--no-verify` within a week.

## When to reach for it

User-invoked: the user runs it on purpose, typically as
`/setup-rust-pre-commit`. A hook executes on someone's behalf at every
commit, so the model never decides on its own to run it. The trigger
boundary: contributors keep pushing unformatted code and CI is catching it
late. It does not write the CI workflow — that is `/setup-rust-ci` — and it
does not change the lint level; the level is read from the recorded posture,
never added as a flag.

## Prerequisites

The recorded posture in `docs/agents/rust.md`, read exactly as
`/setup-rust-ci` reads it — including the clippy command it records, at the
level configured in `Cargo.toml`. If the file is absent, the skill says so
and offers to run `/setup-rust-skills` first; it does not guess a level and
bake the guess into a hook. And write access to the hook files the mechanism
needs and to the contributing notes.

## Which mechanism

Three, and the choice is the user's. The skill detects what is already there
— an existing `.pre-commit-config.yaml`, `lefthook.yml`, or `core.hooksPath`
setting — and matches it rather than introducing a second mechanism.

| Mechanism | Fits when | Costs |
|---|---|---|
| `core.hooksPath` script | Rust-only repo, no other hook needs | Each contributor runs one `git config` line; nothing enforces that they did |
| `lefthook` | Mixed repo, wants parallel hooks, no Python | One binary dependency |
| `pre-commit` | The repo already uses it for other languages | Python toolchain, and the Rust hooks shell out to cargo anyway |

The complete files for all three, ready to paste, are in `HOOKS.md`.

## What goes in the hook, and what never does

In: `cargo fmt` on the staged Rust files, and `cargo clippy` at the
configured level. Out: `cargo test` (too slow, and a broken test is what CI
exists to report), `cargo build --release`, and anything network-bound such
as `cargo audit` — those belong on a schedule, and `/rust-supply-chain`
covers them.

Staged-only is the difference between two seconds and thirty. The file list
comes from what the user actually staged; the warning worth stating plainly
is that `cargo clippy` cannot be scoped to files. It works per crate, so a
workspace hook lints only the crates containing staged files — and a repo
where even that is still slow drops clippy from the hook and keeps `fmt`. The
hook that survives is the one the repo keeps trusting.

Formatting is a design choice, stated in the contributing notes:
`cargo fmt --check` fails and makes the user format, or `cargo fmt` rewrites
the files and re-stages them — and a rewrite must print every file it
touched, never change what the user is about to commit silently. The bypass
is documented in the same breath as the hook: `git commit --no-verify`
exists, it is legitimate, and a hook presented as unbypassable is a hook
people route around resentfully.

## Common questions

**Why no tests in the hook?** A hook that takes longer than about two
seconds will be bypassed. Tests are what CI exists to report; the hook
formats and lints and stops.

**Why no `-D warnings` flag?** A hook stricter than CI fails commits CI would
pass — the single most effective way to get a hook uninstalled. The fallback
flag belongs only in a repo with no lint configuration at all.

**What if the measured time is over two seconds?** The verification step
times a clean commit and reports it. Over budget, the hook is cut down —
clippy goes first — rather than shipped.

**Can the model invoke the skill on its own?** No. Both harness flags are
set, as in `/setup-rust-ci`.

## It's working if

- A deliberately broken commit is rejected, naming the file.
- A clean commit passes, and the measured time is reported — under two
  seconds.
- The contributing notes say what the hook runs, how to install it, and that
  `--no-verify` is available.
- The clippy in the hook runs at the level the repo configured, no flag
  added.
- CI still catches what the hook skips — the hook is a convenience, and CI
  is the gate.

## Where it fits

`setup-rust-pre-commit` is the hook skill in the `misc` bucket — the
commit-time convenience that makes bad formatting visible before it is
pushed. It reads the posture `/setup-rust-skills` writes, defers every real
gate to `/setup-rust-ci`, and keeps the network-bound checks of
`/rust-supply-chain` out of the hook entirely. See `rust-skills-map` for how
the full set of Rust skills relates.
