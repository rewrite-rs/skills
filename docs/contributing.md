# Contributing

## Propose before you build

Open an issue before writing anything. Describe the skill or the change you have
in mind, what task shape would pull it in, and which existing skill it sits next
to. Wait for a maintainer to agree the change belongs in the set.

This is not ceremony. A skill is judged as much on what it refuses to cover as on
what it teaches — two skills whose descriptions both match the same task make the
set worse, not larger — and that judgement cannot be made from a finished pull
request without asking someone to throw work away. The issue is where the scope
gets settled, cheaply, before anyone has spent an evening on it.

Pull requests that arrive without an agreed issue may be closed with a pointer
back here, however good the content is.

## Branch model

`dev` is where change integrates. `main` is release-only: it holds exactly the
history that has gone through a release, nothing more. The two never diverge in the
usual sense — the merge from `dev` into `main` is fast-forward only, so `main`
always ends up equal to some earlier `dev` commit rather than gaining a merge commit
of its own.

Open pull requests against `dev`. Moving `dev` into `main` is a maintainer action
performed by a bot account with elevated permissions; a contributor push cannot do
it directly, and that is by design — see ADR 0004 for why.

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

## Releases

Releases are made by maintainers, and only from `main`. Nothing you do as a
contributor triggers one: your change ships when a maintainer next cuts a
release, and the changeset on your pull request is what puts it in the notes.

You do not need to pick a version, tag anything, or edit `CHANGELOG.md` — the
changelog is assembled from changesets, and a hand-edit to it will conflict.
The procedure itself lives in `.agents/releasing.md`.
