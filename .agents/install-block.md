# Install block

One wording for the install instructions exists, and it lives here. Every place that
tells a user how to install this skill set — `README.md`, docs pages, release notes —
copies the named blocks below verbatim. Do not paraphrase, reformat, or
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

## `claude-code-shell`

```bash
claude plugin marketplace add rewrite-rs/skills
claude plugin install rewrite-rs-skills@rewrite-rs
```

Run these in a terminal instead of inside a session. Add `--scope project` to the
install command to share the plugin with everyone on a repo.

## `gh-skill`

```bash
gh skill install rewrite-rs/skills --all
```

To install one skill, name it:

```bash
gh skill install rewrite-rs/skills rust/idiomatic-rust
```

Project scope is the default; `--scope user` installs for your account, and
`--agent <name>` picks the target agent.

## `gemini-cli`

```bash
for skill in \
  rust/async-rust rust/idiomatic-rust rust/ownership-not-clone rust/rust-api-design \
  rust/rust-concurrency rust/rust-docs rust/rust-errors rust/rust-observability \
  rust/rust-performance rust/type-driven-design rust/unsafe-rust \
  porting/port-from-c porting/port-from-cpp porting/port-from-go porting/port-from-java \
  porting/port-from-python porting/port-from-typescript porting/port-to-rust \
  workflow/rust-code-review workflow/rust-skills-map workflow/rust-testing \
  workflow/setup-rust-skills \
  misc/rust-ffi misc/rust-macros misc/rust-serde misc/rust-supply-chain \
  misc/setup-rust-ci misc/setup-rust-pre-commit
do
  gemini skills install https://github.com/rewrite-rs/skills.git --path "skills/$skill" --consent
done
```

This installs for your user. Add `--scope workspace` to install for the current project
only.

## `codex`

**Untested: this Codex plugin route has not been run end to end.**

```bash
codex plugin marketplace add rewrite-rs/skills
```

Then open the `/plugins` browser in Codex, install `rewrite-rs-skills` from the
`rewrite-rs` marketplace, and start a new session. The plugin manifest points Codex at
`./skills/`; whether Codex discovers the nested `skills/<bucket>/<name>` folders from
there is unconfirmed. If the skills do not appear, remove the plugin and use the
`manual-copy` block instead. Codex reads skills from `.agents/skills/` in a repo, or from
`~/.agents/skills/` for your user.

## `manual-copy`

```bash
git clone https://github.com/rewrite-rs/skills rewrite-rs-skills
mkdir -p ~/.agents/skills
for dir in rewrite-rs-skills/skills/*/*/; do
  case "$dir" in */in-progress/*) continue ;; esac
  cp -R "$dir" ~/.agents/skills/
done
```

This flattens each `skills/<bucket>/<name>` folder into one skills directory. Replace
`~/.agents/skills` with the directory for your agent:

Where each agent looks, for your user and for a single project:

- Claude Code: `~/.claude/skills/` for you, `.claude/skills/` in a project.
- OpenAI Codex: `~/.agents/skills/` for you, `.agents/skills/` in a project.
- GitHub Copilot: `~/.copilot/skills/` or `~/.agents/skills/` for you; `.github/skills/` or `.agents/skills/` in a project.
- Cursor: `~/.cursor/skills/` or `~/.agents/skills/` for you; `.cursor/skills/` or `.agents/skills/` in a project.
- Gemini CLI: `~/.gemini/skills/` or `~/.agents/skills/` for you; `.gemini/skills/` or `.agents/skills/` in a project.

Claude Code ignores `.agents/skills/`. Give it `.claude/skills/` or `~/.claude/skills/`,
or take the plugin route. If a freshly copied skill is missing, restart the agent.

## `claude-ai-zip`

```bash
git clone https://github.com/rewrite-rs/skills rewrite-rs-skills
mkdir -p skill-zips
for dir in rewrite-rs-skills/skills/*/*/; do
  case "$dir" in */in-progress/*) continue ;; esac
  name=$(basename "$dir")
  (cd "$(dirname "$dir")" && zip -r "$OLDPWD/skill-zips/$name.zip" "$name" -x '*.DS_Store')
done
```

Each zip has a single skill folder at its root. Turn on code execution first, then
upload every zip from the **Customize > Skills** page.

## The one-step form is not ready

A route, `claude plugins install rewrite-rs-skills`, would let a user skip the
marketplace-add step entirely. It requires this plugin to be listed in
`anthropics/claude-plugins-official`, which has not happened. **Do not document the
one-step form to users until that listing lands.** That includes the `--marketplace`
flag of `claude plugin install`, which is the same shortcut in one command. Only the
two-step blocks above are canonical until then.

## The routes are exclusive

Pick one. The plugin routes (`claude-code`, `claude-code-shell`, `codex`) install a managed,
read-only bundle that Claude Code updates on its own schedule. The file-copy routes
(`npx-whole-set`, `gh-skill`, `gemini-cli`, `manual-copy`) write editable files that the
user then owns and can modify. Installing through both families leaves every skill
duplicated, and the two copies will drift. The same holds for two file-copy routes aimed
at one directory. Every consumer of these blocks must say "pick one," never present
them as if they stack. The `claude-ai-zip` route uploads to claude.ai, a separate
product, and does not overlap with the local routes.
