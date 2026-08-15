# 0004: dev/main fast-forward release

## Status

Accepted

## Context

Both install routes for this plugin — the marketplace install and a direct clone —
consume skills straight from the default served branch. There is no build or
publish step in between that could catch a bad commit before it reaches a user: an
unfinished or broken commit on the branch that consumers pull from is live
immediately. A single-branch workflow, where work lands directly on the branch
consumers pull from, has no room to assemble a changelog, run a final check, or let
a maintainer look over a batch of changes before it goes out.

## Decision

Two branches, with different jobs. `dev` is where pull requests land and change
integrates; commits here are expected to be a work in progress between releases.
`main` holds only released history — the exact state of `dev` at the moment of each
release, nothing more. The merge from `dev` into `main` is fast-forward only,
triggered by a maintainer commenting `/fast-forward` on a `dev` → `main` pull
request; a regular merge commit on `main` is never produced. The `ff-merge-do`
workflow that performs this checks that the pull request is `dev` → `main`, checks
that the commenter holds admin or maintainer permission, and backs up the current
`main` under a timestamped branch before pushing, so a bad fast-forward can be
reverted by resetting to that backup.

## Consequences

Because `main` only ever receives a fast-forward, it cannot carry a changelog
commit produced during the merge itself — a fast-forward by definition introduces
no new commit. The changelog has to already exist on `dev` before the release
merge happens. That is why `release-prep.yml` runs against `dev`, assembling
`CHANGELOG.md` from accumulated changesets and opening a pull request into `dev`
rather than building notes as part of the `main` merge.

This split also requires a token beyond the default `GITHUB_TOKEN`. Fast-forwarding
into `main` and backing it up both need write access to a branch that org policy
protects, and opening the release-prep pull request needs the same. The default
`GITHUB_TOKEN` cannot do either when a ruleset forbids the built-in Actions
identity from pushing to a protected branch. `FF_MERGE_TOKEN` — a personal access
token belonging to an account configured as a ruleset bypass actor — supplies that
access, stored as a secret in the `ff_merge` environment so it is scoped to the
handful of jobs that need it rather than exposed to every workflow.
