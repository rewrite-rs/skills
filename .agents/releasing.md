# Releasing

Maintainer-only. Contributors never run any of this — a contribution is done when
its pull request merges into `dev`, and the release that carries it is a separate
act by someone with permission on `main`.

## Procedure

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

## Why the version is not derived from the tag

The version is committed to `package.json` before it is tagged, and
`scripts/sync-plugin-version.mjs` mirrors it into `.claude-plugin/plugin.json`.
The repo tree is the artifact — both install routes read files out of it, and
there is no build step in which a tag could be injected — so a version that
exists only as a tag never reaches a user.

See ADR 0004 for the branch model this procedure depends on.
