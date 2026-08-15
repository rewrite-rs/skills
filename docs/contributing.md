# Contributing

## Branch model

`dev` is where change integrates. `main` is release-only: it holds exactly the
history that has gone through a release, nothing more. The two never diverge in the
usual sense — the merge from `dev` into `main` is fast-forward only, so `main`
always ends up equal to some earlier `dev` commit rather than gaining a merge commit
of its own.

Open pull requests against `dev`. When `dev` is ready to ship, a maintainer runs the
release-prep workflow, merges the resulting changelog PR into `dev`, opens a PR from
`dev` into `main`, and comments `/fast-forward` on it. A bot account with elevated
permissions performs the fast-forward merge; a regular contributor push cannot do
this directly, and that is by design — see ADR 0004 for why.

## Adding a changeset

Most pull requests into `dev` need a changeset so the next release notes describe
the change. Three ways to satisfy this:

1. Run `npx changeset` locally and follow the prompts. Commit the generated file
   under `.changeset/` alongside the rest of the change.
2. Do nothing. If the pull request title follows Conventional Commits (`feat: ...`,
   `fix: ...`, `docs: ...`, `refactor: ...`), the `changeset-check` workflow
   generates a changeset fragment from the title and pushes it to the branch —
   only for pull requests from a branch in this repo, since a bot push to a fork
   is not possible. A `feat:` title bumps minor; everything else bumps patch.
3. Apply the `skip-changelog` label if the change has no user-visible effect
   worth a changelog entry (typo fixes, CI-only changes, and so on).

`changeset-check` fails the pull request if none of the three apply.

## Protected files

These five paths affect every consumer of the plugin, not just this repository, so
a change to any of them triggers an automatic warning comment on the pull request
from `protected-files-check`:

- **`.claude-plugin/plugin.json`** — verify the skills array still matches the set
  of promoted buckets, and that the version here agrees with `package.json`.
- **`.claude-plugin/marketplace.json`** — verify the entry still points at the
  correct plugin source and metadata.
- **`.agents/install-block.md`** — verify the install wording here still matches
  what is pasted into onboarding docs and the README, byte for byte.
- **`package.json`** — verify the version still agrees with `plugin.json`, and that
  a dependency change was intentional.
- **`.github/workflows/**`** — verify a workflow change was intentional and does
  not weaken a gate (branch restrictions, forbidden-path scans, permission checks).

## Release procedure

1. Confirm `dev` carries the changesets for everything going out — check
   `.changeset/*.md` for fragments beyond `README.md`.
2. Trigger the `release-prep` workflow with `workflow_dispatch`, supplying the
   target version (no leading `v`, e.g. `0.2.0`). It runs `changeset version`,
   syncs `plugin.json`, verifies the assembled version matches what was
   requested, runs `npm run check`, and opens a pull request into `dev` carrying
   the assembled `CHANGELOG.md` and version bump.
3. Review and merge that pull request into `dev`.
4. Open a pull request from `dev` into `main`, then comment `/fast-forward` on it.
   The `ff-merge-do` workflow verifies the pull request targets `main` from `dev`,
   verifies the commenter has admin or maintainer permission, backs up the current
   `main` under a timestamped branch, and performs the fast-forward merge.
5. Publish a GitHub release on the resulting `main` commit, tagged `vX.Y.Z`. The
   `release-notes` workflow extracts the matching `CHANGELOG.md` section and writes
   it into the release body automatically.
