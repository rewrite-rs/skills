<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/surface.svg?title=rewrite-rs%2Fskills&subtitle=The+most+comprehensive+Rust+agent+skills+for+idiomatic+Rust+and+porting&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiByb2xlPSJpbWciIGFyaWEtbGFiZWw9InJld3JpdGUucnMiPgogIDx0aXRsZT5yZXdyaXRlLnJzIOKAlCBhdmF0YXIsIHRyYW5zcGFyZW50PC90aXRsZT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMCAyMCkgc2NhbGUoMC42KSI%2BCiAgPHBvbHlnb24gcG9pbnRzPSIxMCwxMCA3OCwxMCAxMCw3OCIgZmlsbD0iIzVjNTM0ZCI%2BPC9wb2x5Z29uPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsOTAgOTAsMTggOTAsOTAiIGZpbGw9IiNiYzQ3MTAiPjwvcG9seWdvbj4KICA8L2c%2BCjwvc3ZnPg%3D%3D&align=center&logoColor=f2723f&bg=0c1015&titleColor=f2723f&subtitleColor=b0b5bd&font=jetbrains-mono&mode=dark" />
  <img alt="rewrite-rs/skills: the most comprehensive Rust agent skills for idiomatic Rust and porting" src="https://shieldcn.dev/header/surface.svg?title=rewrite-rs%2Fskills&subtitle=The+most+comprehensive+Rust+agent+skills+for+idiomatic+Rust+and+porting&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiByb2xlPSJpbWciIGFyaWEtbGFiZWw9InJld3JpdGUucnMiPgogIDx0aXRsZT5yZXdyaXRlLnJzIOKAlCBhdmF0YXIsIHRyYW5zcGFyZW50PC90aXRsZT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMCAyMCkgc2NhbGUoMC42KSI%2BCiAgPHBvbHlnb24gcG9pbnRzPSIxMCwxMCA3OCwxMCAxMCw3OCIgZmlsbD0iIzVjNTM0ZCI%2BPC9wb2x5Z29uPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsOTAgOTAsMTggOTAsOTAiIGZpbGw9IiNiYzQ3MTAiPjwvcG9seWdvbj4KICA8L2c%2BCjwvc3ZnPg%3D%3D&align=center&logoColor=5c534d&bg=fcfdff&titleColor=bc4710&subtitleColor=61666e&font=jetbrains-mono&mode=light" />
</picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/group/github/release/rewrite-rs/skills+github/ci/rewrite-rs/skills+github/license/rewrite-rs/skills+github/last-commit/rewrite-rs/skills+github/stars/rewrite-rs/skills.svg?variant=secondary&mode=dark" />
    <img alt="Release, CI, license, last commit, stars" src="https://shieldcn.dev/group/github/release/rewrite-rs/skills+github/ci/rewrite-rs/skills+github/license/rewrite-rs/skills+github/last-commit/rewrite-rs/skills+github/stars/rewrite-rs/skills.svg?variant=secondary&mode=light" />
  </picture>
  <br />
  <a href="#skills">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/skills-28-f2723f.svg?variant=secondary&logo=rust&mode=dark" />
      <img alt="28 skills" src="https://shieldcn.dev/badge/skills-28-bc4710.svg?variant=secondary&logo=rust&mode=light" />
    </picture>
  </a>
</p>

The most comprehensive Rust agent skills for writing real, idiomatic Rust and porting
code from other languages. 28 skills that teach judgment, not snippets: use the
ownership system instead of working around it, design errors and APIs that survive
review, and port code into Rust without losing behaviour.

Four areas. **Rust craft:** idioms, ownership, errors, types, async, unsafe,
performance, concurrency, observability, docs. **Porting:** one skill per source
language (C, C++, Go, Java, Python, TypeScript) over a shared migration spine.
**Workflow:** review, testing, setup, and a router that picks the skill for you.
**Misc:** the occasional setup and audit skills.

> ⭐ **Found this useful? Give it a star.** rewrite-rs/skills is free and open source. A star takes one click, tells us the work is worth continuing, and helps other Rust developers, and teams porting code into Rust, find the project.

## How it works

Skills fire on their own. Each model-invoked skill carries a description, and the
agent loads the skill when the task matches it: write an error type and
`rust-errors` loads, start a port and `port-to-rust` loads. User-invoked skills
never fire on their own, so you type them (`setup-rust-skills`, `rust-skills-map`,
`setup-rust-ci`, `setup-rust-pre-commit`). Not sure which skill owns a decision?
Run `rust-skills-map`, the router over the set.

## What changes with the skills

An illustrative contrast, not a measured run. The task: read a port number from
a config string. Without the skills, an agent often reaches for the shortest
thing that compiles:

```rust,ignore
fn parse_port(s: &String) -> Result<u16, String> {
    let n: u32 = s.trim().parse().map_err(|_| "bad port".to_string())?;
    if n == 0 || n > 65535 {
        return Err(format!("port {} out of range", n));
    }
    Ok(n as u16)
}

let port = parse_port(&raw).unwrap();
```

The borrow is `&String`, the error is a string the caller can only print, and
the `unwrap` turns bad input into a panic. With `idiomatic-rust` and
`rust-errors` loaded, the same function reads like this:

```rust,ignore
#[derive(Debug, thiserror::Error)]
enum PortError {
    #[error("port is not a number: {0:?}")]
    NotANumber(String),
    #[error("port {0} is outside 1..=65535")]
    OutOfRange(u32),
}

fn parse_port(s: &str) -> Result<u16, PortError> {
    let n: u32 = s
        .trim()
        .parse()
        .map_err(|_| PortError::NotANumber(s.to_owned()))?;
    u16::try_from(n)
        .ok()
        .filter(|&p| p != 0)
        .ok_or(PortError::OutOfRange(n))
}

let port = parse_port(&raw)?;
```

The parameter accepts any string slice, the error is a type the caller can
match on, the cast is checked, and failure propagates instead of panicking.

## Installation

Pick one route. The managed plugin routes (Claude Code, and Codex, untested) install a read-only bundle
that updates on its own schedule. The file-copy routes (npx, GitHub CLI, Gemini CLI,
manual copy) write editable files you own. Installing through both leaves every skill
duplicated, and the copies drift apart.

<details>
<summary>Claude Code</summary>

Inside a session:

```
/plugin marketplace add rewrite-rs/skills
/plugin install rewrite-rs-skills@rewrite-rs
```

Or from a terminal:

```bash
claude plugin marketplace add rewrite-rs/skills
claude plugin install rewrite-rs-skills@rewrite-rs
```

Run these in a terminal instead of inside a session. Add `--scope project` to the
install command to share the plugin with everyone on a repo.

</details>

<details>
<summary>Any agent (npx)</summary>

```bash
npx skills@latest add rewrite-rs/skills
```

Pick the skills you want, and which coding agents to install them on.

</details>

<details>
<summary>GitHub CLI (Copilot and others)</summary>

```bash
gh skill install rewrite-rs/skills --all
```

To install one skill, name it:

```bash
gh skill install rewrite-rs/skills rust/idiomatic-rust
```

Project scope is the default; `--scope user` installs for your account, and
`--agent <name>` picks the target agent.

</details>

<details>
<summary>Gemini CLI</summary>

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

</details>

<details>
<summary>OpenAI Codex</summary>

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

</details>

<details>
<summary>Copy the folders by hand</summary>

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

</details>

<details>
<summary>claude.ai</summary>

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

</details>

## Skills

Every skill in the set can be invoked by the user, by typing its name. The
label under each bucket decides whether the agent may also pull the skill in
on its own: **model-invoked** skills are pulled in automatically when the
task matches the description; **user-invoked** skills never are — the agent
may suggest one, but the user starts it.

### Rust

Language-craft skills for writing and reviewing Rust.

**Model-invoked**

- [idiomatic-rust](./skills/rust/idiomatic-rust/SKILL.md) — Rust that reads like Rust, without boilerplate.
- [ownership-not-clone](./skills/rust/ownership-not-clone/SKILL.md) — Ownership and borrowing instead of clone, Rc, and RefCell.
- [rust-errors](./skills/rust/rust-errors/SKILL.md) — Result over unwrap, and error types callers can act on.
- [type-driven-design](./skills/rust/type-driven-design/SKILL.md) — Make illegal states unrepresentable in the type system.
- [rust-api-design](./skills/rust/rust-api-design/SKILL.md) — Public surface, trait design, and semver discipline.
- [async-rust](./skills/rust/async-rust/SKILL.md) — Runtimes, Send bounds, cancellation safety, and blocking work.
- [unsafe-rust](./skills/rust/unsafe-rust/SKILL.md) — Justify, document, and verify unsafe blocks with Miri.
- [rust-performance](./skills/rust/rust-performance/SKILL.md) — Profile first, cut allocation, and treat codegen flags as the last five percent.
- [rust-concurrency](./skills/rust/rust-concurrency/SKILL.md) — Threads, channels, locks, and atomics — the model that fits the workload.
- [rust-observability](./skills/rust/rust-observability/SKILL.md) — Structured events with named fields, spans, and no secrets in logs.
- [rust-docs](./skills/rust/rust-docs/SKILL.md) — Doc comments as API contract, with doctests that actually run.

**User-invoked**

None yet in this bucket.

### Porting

**Model-invoked**

- [port-to-rust](./skills/porting/port-to-rust/SKILL.md) — Parity contract, phase sequence, and differential proof for a port.
- [port-from-python](./skills/porting/port-from-python/SKILL.md) — Python-to-Rust construct mapping and the PyO3 boundary.
- [port-from-typescript](./skills/porting/port-from-typescript/SKILL.md) — TypeScript and JavaScript mapping, with the napi-rs and wasm boundaries.
- [port-from-go](./skills/porting/port-from-go/SKILL.md) — Go-to-Rust mapping — goroutines, channels, interfaces, and error values.
- [port-from-java](./skills/porting/port-from-java/SKILL.md) — Java-to-Rust mapping — hierarchies to enums, exceptions to Result.
- [port-from-cpp](./skills/porting/port-from-cpp/SKILL.md) — C++-to-Rust mapping — RAII, smart pointers, templates, and the cxx bridge.
- [port-from-c](./skills/porting/port-from-c/SKILL.md) — C-to-Rust mapping — pointers, ownership, unions, and the bindgen boundary.

**User-invoked**

None yet in this bucket.

### Workflow

**Model-invoked**

- [rust-testing](./skills/workflow/rust-testing/SKILL.md) — Tests that fail when behaviour changes, including port parity.
- [rust-code-review](./skills/workflow/rust-code-review/SKILL.md) — Two-axis review — standards and spec — over a Rust diff.

**User-invoked**

- [setup-rust-skills](./skills/workflow/setup-rust-skills/SKILL.md) — Lint, format, and recorded project posture for a Rust repo.
- [rust-skills-map](./skills/workflow/rust-skills-map/SKILL.md) — Router over the skill set — which skill owns which decision.

### Misc

Occasional setup and audit skills: CI, hooks, and the dependency tree.

**Model-invoked**

- [rust-supply-chain](./skills/misc/rust-supply-chain/SKILL.md) — Dependency advisories, licences, and duplicates, each ending in a decision.
- [rust-macros](./skills/misc/rust-macros/SKILL.md) — Macros as a last resort, by-example first, with errors that point at the caller.
- [rust-serde](./skills/misc/rust-serde/SKILL.md) — Serde as the validating boundary between a wire format and a domain type.
- [rust-ffi](./skills/misc/rust-ffi/SKILL.md) — A translating FFI boundary with explicit ownership and no panics crossing it.

**User-invoked**

- [setup-rust-ci](./skills/misc/setup-rust-ci/SKILL.md) — A GitHub Actions workflow that runs what the skills run locally.
- [setup-rust-pre-commit](./skills/misc/setup-rust-pre-commit/SKILL.md) — Fast format-and-lint hooks, with CI left as the gate.

## Why these skills exist

### Rust that reads like a translation

Code ported or written without idioms native to Rust compiles and runs, but reads like
whatever language it came from — index loops instead of iterators, hand-written
conversions instead of `From`/`Into`, hand-written impls instead of derives. These
skills push toward the shape a Rust reader expects, not just code that the compiler
accepts.

### `clone` and `unwrap` as design smells

`clone`, `unwrap`, `expect`, and `Rc<RefCell<_>>` all resolve a borrow-checker or
type-system objection without resolving the design problem behind it. Sometimes
that's the right call — but reaching for one by reflex, rather than as a deliberate
tradeoff, is usually a sign the ownership structure needs rethinking rather than
routing around.

### States that compile, and invariants that hold

The compiler accepts every constructible combination of fields, and the test
suite covers only the paths it was told to. An illegal state that compiles — a
post that is draft and published at once, a connection that sends before it
connects — and an `unsafe` block whose invariant holds for every current caller
but not for the next one both pass every check until they do not. The skills in
this set push the first into the type system, where the state cannot be
constructed, and keep the second behind a written invariant and Miri, where a
violation is a report rather than a production incident.

### Ports that drift from parity

A port that compiles is not a port that matches the behaviour of its source. Without a
crisply stated parity contract — what "done" means for this port — and discipline
about never narrowing it silently, a port drifts: edge cases the original handled
quietly stop being handled, and nobody notices until production.

### Ports that never choose an end state

A port ends one of three ways: replacement, with the source implementation deleted;
a permanent binding that the existing callers keep importing; or scaffold, deleted
at cut-over. That choice fixes the seam and the contract before either is written,
and choosing it late is what leaves a codebase stuck in two languages — Rust that
was never agreed to stay, and source code that is no longer maintained but still
decides what runs.

### Advice that nothing enforces

The craft skills name the standard — the shape, the ownership, the error type —
but a standard nothing enforces is a standard the next contributor forgets.
Lint and format configuration the tooling applies, tests that fail when
behaviour changes, a review that ends in a verdict, and a recorded posture file
every agent reads on opening the repo are what make the standard the state
the repo lives in, not advice about it.

## How the skills are tested

The `evals/` directory holds eval cases that run the skills against realistic
tasks and grade the result. There is one case per porting skill (C, C++, Go,
Java, Python, TypeScript, and `port-to-rust`) and two cases for
`rust-code-review`.

Each case is a directory:

- `case.yaml` — the name, the scaffold script, and the expected outcome.
- `prompt.md` — the task given to the agent, with the tool allowlist and turn limit in its frontmatter.
- `inputs/` — the source files the task starts from.
- `stage-inputs.sh` — the scaffold script that copies the inputs into a clean working directory.
- `graders/` — one Markdown file per check, each scored by an LLM judge.

Run them with `claude plugin eval`. Scaffold scripts and tools such as `Bash`
and `Write` are opt-in, so pass them explicitly:

```bash
claude plugin eval . --scaffold --allow-tools Bash Write Edit
claude plugin eval . --scaffold --allow-tools Bash Write Edit --case 'port-c-*' --runs 1
```

The first form runs every case with a no-plugin baseline arm to report the score
delta. Narrow it with `--case` or `--tag`. Only run it on a checkout you trust,
since the scaffold scripts run as you. No benchmark results are published yet.

## Contributing

Open an issue before building anything; `docs/contributing.md` explains why and
covers the branch model. `CLAUDE.md` holds the rules for authoring, editing, and
reviewing a skill, and `CONTEXT.md` the vocabulary. Run `npm run check` before
sending a change.
