# Invocation

Every skill in this repo is either user-invoked or model-invoked. There is no third
option, and a skill must not be half of one and half of the other. The split is one
thing only: whether the agent may pull the skill in on its own. Every skill remains
user-invokable by name.

## The two modes

**User-invoked.** The user types the skill on purpose, typically as a slash command.
The model never decides on its own to pull the skill in. This is set with two flags
that must both be present:

- `disable-model-invocation: true` in the `SKILL.md` frontmatter.
- `policy.allow_implicit_invocation: false` in the `agents/openai.yaml`.

Because a user-invoked skill is found by browsing, not by the model matching a task
description against it, its `description` is human-facing: a short, plain summary of
what the skill does. Strip trigger phrasing — there is no need to say "use when the
user mentions X," because invocation is never automatic.

**Model-invoked.** The default. Both flags above are omitted. The model reads the
`description` field against the current task and decides whether to pull the
skill in without being asked. The user can invoke it by name, too — the mode
changes who else may, not whether the user may. Because that matching is the
whole mechanism, the `description` stays model-facing and keeps rich trigger
phrasing — "Use when the user wants…, mentions…, asks about…" — so the right
skill fires on the right task.

## The two harness settings must agree

A skill is user-invoked in both harnesses (the frontmatter flag in Claude Code and the
`agents/openai.yaml` policy in Codex) or in neither. Setting one without the other produces a
skill that behaves differently depending on which agent picks it up, which defeats the
point of shipping both. `npm run check-skills` enforces this agreement; a mismatch
fails the check.

## What is user-invoked in this repo

A skill is user-invoked when running it writes files into the user's
repository. That is the rule, and it applies in every bucket. The model may
propose running such a skill; it may never decide to run one on its own,
because the first thing the user would learn about the decision is a diff they
did not ask for.

One skill is user-invoked without meeting the rule: `rust-skills-map`. It
writes nothing — it is a router the user consults directly rather than one
the model reaches for mid-task.

In the promoted buckets, `setup-rust-skills` meets the rule: it writes
`clippy.toml`, `rustfmt.toml`, and `docs/agents/rust.md`. In `misc/`,
`setup-rust-ci` and `setup-rust-pre-commit` meet it too — the first writes a
workflow that runs on every push, the second writes a hook that runs on
every commit. `rust-supply-chain` is the second exception: it runs audits and
reports, and writes `deny.toml` only on an explicit request in the same
invocation, which is not an unasked-for diff.

Every other skill in the set is model-invoked.

## Cross-skill dependencies

When one skill needs another — for example, every porting skill needs the process
guidance in `port-to-rust` — express that as prose invocation in the skill-shaped,
directly typeable form: "Run the `/port-to-rust` skill." Never write a cross-reference
as a relative file link (`../other-skill/FILE.md`) reaching into another skill
directory. A skill owns its own directory; nothing outside it should depend on reading
files inside it directly.

The corollary: reference material that more than one skill would otherwise want lives
inside the skill that owns the topic, not in a shared location that other skills reach
into. If two skills both need it, one of them owns it and the other invokes it in
prose.
