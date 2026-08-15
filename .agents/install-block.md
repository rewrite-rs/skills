# Install block

One wording for the install instructions exists, and it lives here. Every place that
tells a user how to install this skill set — `README.md`, docs pages, release notes —
copies one of the two blocks below verbatim. Do not paraphrase, reformat, or
re-order them. If the wording needs to change, change it here first; every consumer
picks the change up from this file, not the other way around.

## `npx-whole-set`

```bash
npx skills@latest add rewrite-rs/skills
```

Pick the skills you want, and which coding agents to install them on.

## `claude-code`

```
/plugin marketplace add rewrite-rs/skills
/plugin install rewrite-rs-skills@rewrite-rs
```

## The one-step form is not ready

A third route, `claude plugins install rewrite-rs-skills`, would let a user skip the
marketplace-add step entirely. It requires this plugin to be listed in
`anthropics/claude-plugins-official`, which has not happened. **Do not document the
one-step form to users until that listing lands.** Only the two blocks above are
canonical until then.

## The two routes are exclusive

Pick one. The plugin route installs a managed, read-only bundle that Claude Code
updates on its own schedule. The `npx` route writes editable files directly into the
user's repo, which the user then owns and can modify. Installing both leaves every
skill duplicated, and the two copies will drift. Every consumer of this block must say
"pick one," never present both as if they stack.
