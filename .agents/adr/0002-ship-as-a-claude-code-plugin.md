# 0002: Ship as a Claude Code plugin

## Status

Accepted

## Context

Two install routes exist for a skill set like this one. `npx skills@latest add
rewrite-rs/skills` works on any coding agent that understands the `skills` convention
— it writes editable files straight into the user's repo. The Claude Code plugin route
(`/plugin marketplace add` then `/plugin install`) only works inside Claude Code, but
gives that specific audience a managed, versioned install without editable files
sitting in their tree.

Neither route subsumes the other. Dropping the plugin route would leave Claude Code
users without the lower-friction, managed install that the platform expects for a
skill set of this shape. Dropping the `npx` route would restrict the set to one agent
when nothing about the content is Claude-specific.

## Decision

Ship both. Document them as exclusive in every place the install instructions appear
(see `.agents/install-block.md`) — a user picks one, never both. Keep
`.claude-plugin/marketplace.json` in this repo so the repo is its own marketplace,
rather than waiting on or depending on a listing in an external marketplace, until an
official listing in `anthropics/claude-plugins-official` lands.

## Consequences

Until the upstream listing PR merges, there is no one-step `claude plugins install
rewrite-rs-skills` command. The two-step marketplace form
(`/plugin marketplace add` then `/plugin install`) is what gets documented to users in
the meantime. The one-step form must not be written into any user-facing doc before
the listing exists — doing so would document a command that fails.
