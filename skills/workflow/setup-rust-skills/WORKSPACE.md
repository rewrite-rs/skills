# Workspace and toolchain posture

The creation-time decisions `SKILL.md` points here for. For a repo that already
exists, each one is detected and recorded in `docs/agents/rust.md`; a
difference between the repo and this page is a finding to report, not a rewrite
to perform. For a new repo, these are the proposed defaults.

## Layout

One workspace manifest at the root, and every crate a sibling in a single flat
`crates/` directory:

```text
my-project/
  Cargo.toml          # workspace root, no package of its own
  crates/
    app-core/
    cli/
    codegen/
```

Keep every crate beside the others, never under another crate or under its `src/`: a nested crate
hides from directory listings, confuses relative paths, and invites a
package that is half-inside two others. Every crate is listed as a workspace
member, including helper and test-support crates, so a single `cargo` command
at the root reaches all of them and one lockfile governs them. A single-crate
project keeps its `Cargo.toml` at the root; the flat layout begins when a
second crate appears.

Siblings reference each other through the workspace, not by repeating a path
and version in each member. The root declares the sibling once and the member
opts in:

```toml
# root Cargo.toml
[workspace]
members = ["crates/*"]
resolver = "3"

[workspace.dependencies]
app-core = { path = "crates/app-core" }
serde = { version = "1", default-features = false }
```

```toml
# crates/cli/Cargo.toml
[dependencies]
app-core.workspace = true
serde = { workspace = true, features = ["derive"] }
```

## Sharing versions, metadata, and lints

Three tables at the root carry what members would otherwise repeat:
`[workspace.package]` for edition, `rust-version`, license, and repository;
`[workspace.dependencies]` for every external dependency version, so two
members cannot drift onto different versions of the same crate; and
`[workspace.lints]` for the lint set (see `TEMPLATES.md`).

Define each workspace dependency with `default-features = false`. A member
then opts into exactly the features it uses, with `features = [...]` beside
`workspace = true`. Leave defaults on at the root and no member can turn
them off, because a feature set can only be added to from a member, never
subtracted from. This is what keeps a small crate from quietly pulling in a
dependency tree it never needed.

When adopting this in an existing workspace, move one dependency at a time and
let the diff stay reviewable. A dependency whose default features a member
truly relies on gets that member an explicit `features = ["default"]`-style
line, so behaviour does not change in the move.

## Edition, MSRV, and unstable features

| Decision | Default for a new crate | For an existing crate |
|---|---|---|
| Edition | the newest stable edition at creation (2024 or later) | keep the declared edition; recording it is the job |
| MSRV | set `rust-version` when the crate is created | detect and record it; never invent one |
| Unstable features | none: no `#![feature(...)]`, no nightly-only compiler flags in the build | flag any found and ask |

An MSRV chosen at creation is a promise that is cheap to keep and expensive to
introduce later, once code has used newer APIs. Raise it conservatively, and in
a minor release rather than a patch release, because raising it is a change
users of an older compiler will feel. The three places that must agree
(`rust-version`, the clippy `msrv`, the oldest CI toolchain) are in
`TEMPLATES.md`.

Unstable features tie the crate to one nightly and cut off everyone on stable.
The one nightly exception this skill allows is nightly-only rustfmt keys,
confined to a pinned toolchain as `TEMPLATES.md` describes.

## Pinning the toolchain

Propose a `rust-toolchain.toml` so every contributor and CI use the same
compiler instead of whatever happens to be installed:

```toml
[toolchain]
channel = "1.85.0"
components = ["rustfmt", "clippy"]
```

A pinned compiler makes failures reproducible and keeps a toolchain release
from changing lint results on an unrelated commit. The pin is a floor for
day-to-day work and is bumped on purpose; it is not the MSRV, which is the
oldest compiler the published crate supports. If the repo already has the
file, read it and report differences as a diff. If it pins nightly for
rustfmt, that pin is the explicit marker that makes the nightly rustfmt keys
legitimate. Keep the CI toolchain action consistent with the file (see
`setup-rust-ci`).

## Out-of-box build

A crate that is not tied to a particular platform builds on every tier-one
target with nothing installed beyond `cargo` and `rustc`: no required external
tool, no environment variable to set, no system library the build script
assumes is present. A contributor, or a downstream user depending on the crate,
should get a working build from `cargo build` alone.

Where a build needs generated code, run the generator at publish time, not at
the user build, and ship the output inside the published crate. The generator
and its tools are then the maintainer concern; consumers never need them.
Commit the generated output (or the publish step produces it) and let CI detect
drift between the generator and the shipped file; the job is in `setup-rust-ci`.
Crates that wrap a platform library are the legitimate exception, and even
there optional external tools should stay optional.
