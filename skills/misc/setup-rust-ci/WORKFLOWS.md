# Rust CI workflows

The workflow file in full, ready to adapt, plus the variants. Every command
here must also be one a contributor can run locally. The posture
recorded in `docs/agents/rust.md` decides which sections apply — MSRV adds the
`msrv` job, `no_std` swaps the test job for a build, `unsafe` earns the Miri
job — and the base never ships unexamined.

## The base workflow

```yaml
name: Rust
on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  CARGO_TERM_COLOR: always

jobs:
  fmt:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt
      - run: cargo fmt --check

  clippy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy
      - uses: Swatinem/rust-cache@v2
      - run: cargo clippy --all-targets --all-features

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - run: cargo test --all-features
```

The clippy job carries no `-D warnings` on purpose: the level comes from the
repo `[lints]` block, and adding the flag would override a level the user
deliberately set. The flag belongs in this file only in the fallback form —
`cargo clippy --all-features --all-targets -- -D warnings` — for a repo with
no lint configuration at all. The other legitimate fallback form sets
`RUSTFLAGS: -D warnings` in the job `env`; use one or the other, never both,
and never alongside a lint block the repo already set. Doc warnings are a
separate flag, `RUSTDOCFLAGS`, shown in the library scenario below.

Pin the toolchain to match `rust-toolchain.toml` where the repo has one:
give the toolchain action the same version in place of `@stable` (for example
`dtolnay/rust-toolchain@master` with `toolchain: 1.85.0`), or let the action
read the file by omitting the input. A job that floats on `stable` while the
repo pins a version tests a compiler nobody develops with.

## The MSRV job

An addition to the base, not a rewrite:

```yaml
  msrv:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - name: Read MSRV from Cargo.toml
        id: msrv
        run: echo "version=$(cargo metadata --format-version 1 --no-deps | jq -r '.packages[0].rust_version')" >> "$GITHUB_OUTPUT"
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ steps.msrv.outputs.version }}
      - run: cargo build --all-features
```

This job builds and does not test: dev-dependencies frequently require a newer
compiler than the crate itself, and failing MSRV on a test-only dependency
teaches people to delete the job.

## The Miri job

Gated on the unsafe policy — included only when the repo actually contains
`unsafe`, and always on `nightly`:

```yaml
  miri:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@nightly
        with:
          components: miri
      - run: cargo miri test
```

## The no_std variant

`--target thumbv7em-none-eabihf` plus `targets:` on the toolchain action:

```yaml
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: thumbv7em-none-eabihf
      - run: cargo build --target thumbv7em-none-eabihf
```

`cargo test` cannot run on a bare-metal target, so this job builds only.

## A workspace note

Put `--workspace` on every command in a workspace, so a push that changes a
member reaches the check. `--all-features` is sometimes wrong: mutually
exclusive feature flags make the union fail to compile even though every
individual feature is fine. For that case the tool is `cargo hack` — run the
check per feature (or over the feature powerset) rather than with all of them
on. In a workspace, point the MSRV read at the root manifest; `.packages[0]`
does not guarantee the root package. A virtual workspace has no root package,
so `.packages[0].rust_version` can be `null`; there, read `rust-version` from
the workspace member that declares it.

## Feature combinations and platforms

```yaml
  features:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - uses: taiki-e/install-action@cargo-hack
      - run: cargo hack check --workspace --feature-powerset --no-dev-deps
```

Each independent feature doubles the configurations, so the powerset grows
exponentially. With more than a handful of features, trim it with
`--depth 2` (every pair) or run the job on a schedule instead of each push.
Features that are mutually exclusive need an exclusion flag, or a separate
step per valid set. For code that differs per platform, run the test job on
`runs-on` entries for each OS that has its own code path, as a `matrix`.

## Advisories and dependency policy

```yaml
  deny:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: EmbarkStudios/cargo-deny-action@v2
```

Add a `schedule` trigger (weekly cron) to the workflow `on:` block for this
job, since new advisories land independently of commits. The policy file,
`deny.toml`, is what `/rust-supply-chain` helps decide; do not invent one
here. A repo that only wants advisories can run `cargo audit` in its place.

## Generated-code drift

For a repo that commits output produced by a generator, regenerate in CI and
fail if anything changed:

```yaml
  generated:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo run -p codegen
      - run: git diff --exit-code
```

The command that regenerates is whatever the repo documents; the same
command, run locally, is what a contributor uses to fix a red job. A new
untracked output file will not show in `git diff`, so also run
`git status --porcelain` and fail on any output, or `git add -N .` first.

## Process checks

When a recurring mistake can be detected by a command, a small job that runs
it is cheaper than reviewing for the mistake. Write the job first so it fails
on the existing instances, fix them, and the check keeps the problem fixed.

## Three worked scenarios

**A single binary crate, no MSRV commitment.** The base workflow as written:
three jobs — `fmt`, `clippy`, `test`. No `msrv` job because nothing in the
repo commits to an old toolchain, and no Miri job because there is no
`unsafe`.

**A library with an MSRV and published docs.** The base, plus the `msrv` job,
plus a doc job that treats doc warnings as errors:

```yaml
  doc:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      RUSTDOCFLAGS: -D warnings
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo doc --no-deps
```

**A workspace with existing CI.** The skill mostly reports the difference
between the existing workflow and what the recorded posture would produce, and
leaves things alone — the existing file wins unless the user asks for the
change.
