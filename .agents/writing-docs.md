# Writing docs pages

Every promoted skill (one in `skills/rust/`, `skills/porting/`, `skills/workflow/`,
or `skills/misc/`)
gets exactly one human-facing page at `docs/<bucket>/<name>.md`. This is the template
every such page follows, section by section, in order.

No H1. The page title comes from the filename; do not repeat it as a heading inside
the file. No install commands appear on the page — installation is covered once, in
`README.md`, sourced from `.agents/install-block.md`.

## `## What it does`

Lead with the one-sentence job: what the skill is for, stated plainly. Follow with the
defining constraint as plain prose — the thing that makes this skill this skill and
not a nearby one. Not a bullet list; a short paragraph.

## `## When to reach for it`

State the invocation mode (user-invoked or model-invoked — see
`.agents/invocation.md`) and the trigger boundary: what task shape pulls this skill
in, and, as important, what shape it does *not* cover, so a reader can tell this skill
apart from its neighbours before opening it. For a model-invoked skill, state both
halves: that the agent may pull it in on its own, and that the user can run it
directly by name.

## `## Prerequisites`

What has to already be true, or already be set up, before this skill applies. Omit
this section entirely when there are none — do not write "none" as a section body.

## Free-form middle

One to three sections, titled in the vocabulary the skill uses — use its leading term as
a heading rather than a generic label like "Details." This is where the actual
content surfaces: the rules, the mapping, the checklist, whatever the skill teaches.
Keep multi-way branches (this vs. that vs. the other) in a table or a list; a
paragraph that tries to hold three branching cases reads as one undifferentiated
blob and readers skim past the distinction that matters.

## `## Common questions`

The questions a reader actually asks after skimming the sections above — edge cases,
"what if," disambiguation from a similarly named skill. Answer each briefly.

## `## It's working if`

A bulleted checklist a reader can verify without opening `SKILL.md`: observable
outcomes, not internal steps. Someone should be able to check these against their own
repo or the output from their own agent and know whether the skill did its job.

## `## Where it fits`

The role this skill plays in the set, its neighbours (skills it's commonly used alongside or
confused with), and a link to `rust-skills-map` for the full picture.
