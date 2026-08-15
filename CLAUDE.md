# CLAUDE.md

Rules for any session that authors, edits, or reviews a skill in this repo. Read
`.agents/invocation.md`, `.agents/install-block.md`, and `.agents/writing-docs.md`
before touching skill content — this file points at them rather than repeating them.

## 1. Buckets

`skills/rust/` (language craft), `skills/porting/` (migration), and
`skills/workflow/` (review, testing, setup, router) are **promoted**. `skills/misc/`
(occasional, provider-specific) and `skills/in-progress/` (public, unshipped) are
**not promoted**.

Every promoted skill must appear in all three of:

- `README.md`
- `.claude-plugin/plugin.json`'s `skills` array
- `docs/<bucket>/<name>.md`

A non-promoted skill appears in none of the three. The split that decides which
bucket a skill lives in is frequency of use — how often an agent reaches for it — not
whether the skill happens to write files into a user's repo.

## 2. Prose-dominant with verification

Skills teach judgment in prose. Commands inside a skill are inline instructions the
agent runs itself, never shipped runner scripts the skill invokes on the user's
behalf. Every skill where a machine can settle the question it makes ends with a
verification step the agent actually runs — see
`.agents/adr/0001-verification-steps-run-cargo.md`.

## 3. Config precedence

A verification step runs at the target repo's own configured lint level.
`cargo clippy -- -D warnings` is the fallback only when the target repo has no lint
configuration at all. A skill must never override a lint level the user (or an
earlier `setup-rust-skills` run) deliberately set.

## 4. One porting language per session

Never author or revise two `port-from-*` language skills in the same session. See
`.agents/adr/0003-one-skill-per-source-language.md` for why the set is split by
source language in the first place.

## 5. No citations in skill files

Sources live in `.agents/sources.md`, not inside any `SKILL.md` or docs page.

## 6. Invocation

See `.agents/invocation.md` for the full rules on user-invoked versus model-invoked
skills, and for what agrees between Claude Code's frontmatter flag and Codex's
`agents/openai.yaml` policy. Only two skills in this repo are user-invoked:
`setup-rust-skills` and `rust-skills-map`. Every other skill is model-invoked.

## 7. Router upkeep

Whenever a user-reachable skill is added, renamed, removed, or changes how it fits
the flows, re-read `rust-skills-map`'s `SKILL.md` and update it in the same change.
A router that omits a new skill or routes to a dead one is a router that lies.

## 8. Docs pages

See `.agents/writing-docs.md` for the page template. Trigger: adding, renaming, or
behaviour-changing a promoted skill means its `docs/<bucket>/<name>.md` page is
created or re-synced in the same change. A rename moves the file — it does not leave
the old page behind and add a new one.

## 9. Checks

Run these before considering skill work done:

- `npm run check` — runs the test harness, the index checker (`check-skills.mjs`),
  and the plugin-version check (`sync-plugin-version.mjs --check`).
- `claude plugin validate . --strict` — after touching `.claude-plugin/plugin.json`
  or `.claude-plugin/marketplace.json`.
- `scripts/link-skills.sh` — symlinks skills into the local harness for manual
  testing.
