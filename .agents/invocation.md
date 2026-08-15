# Invocation

Every skill in this repo is either user-invoked or model-invoked. There is no third
option, and a skill must not be half of one and half of the other.

## The two modes

**User-invoked.** The user types the skill on purpose, typically as a slash command.
The model never decides on its own to pull the skill in. This is set with two flags
that must both be present:

- `disable-model-invocation: true` in the skill's `SKILL.md` frontmatter.
- `policy.allow_implicit_invocation: false` in the skill's `agents/openai.yaml`.

Because a user-invoked skill is found by browsing, not by the model matching a task
description against it, its `description` is human-facing: a short, plain summary of
what the skill does. Strip trigger phrasing — there is no need to say "use when the
user mentions X," because invocation is never automatic.

**Model-invoked.** The default. Both flags above are omitted. The model reads the
`description` field against the current task and decides whether to pull the skill in
without being asked. Because that matching is the whole mechanism, the `description`
stays model-facing and keeps rich trigger phrasing — "Use when the user wants…,
mentions…, asks about…" — so the right skill fires on the right task.

## The two harness settings must agree

A skill is user-invoked in both harnesses (Claude Code's frontmatter flag and Codex's
`agents/openai.yaml` policy) or in neither. Setting one without the other produces a
skill that behaves differently depending on which agent picks it up, which defeats the
point of shipping both. `npm run check-skills` enforces this agreement; a mismatch
fails the check.

## What is user-invoked in this repo

Only two skills are user-invoked: `setup-rust-skills` and `rust-skills-map`. Every
other skill in the set is model-invoked. `setup-rust-skills` writes files into the
user's repo (`clippy.toml`, `rustfmt.toml`, `docs/agents/rust.md`), and user-invocation
guarantees the model never decides on its own to drop those files into someone's
project. `rust-skills-map` is a router the user consults directly rather than one the
model would reach for mid-task.

## Cross-skill dependencies

When one skill needs another — for example, every porting skill needs the process
guidance in `port-to-rust` — express that as prose invocation in the skill-shaped,
directly typeable form: "Run the `/port-to-rust` skill." Never write a cross-reference
as a relative file link (`../other-skill/FILE.md`) reaching into another skill's
directory. A skill's directory is its own; nothing outside it should depend on reading
files inside it directly.

The corollary: reference material that more than one skill would otherwise want lives
inside the skill that owns the topic, not in a shared location that other skills reach
into. If two skills both need it, one of them owns it and the other invokes it in
prose.
