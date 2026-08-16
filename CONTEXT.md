# CONTEXT.md

The vocabulary this repo uses. Skill prose, docs pages, and commit messages use these
terms consistently — prefer the term here over the "avoid" alternatives listed with
it, so a reader never has to wonder whether two different words mean the same thing.

- **Skill** — a directory under `skills/<bucket>/` holding a `SKILL.md` and an
  `agents/openai.yaml`.

- **Promoted** — living in a bucket whose skills ship in the plugin
  (`skills/rust/`, `skills/porting/`, `skills/workflow/`, `skills/misc/`).
  Avoid: "published", "released" — those imply a release event; promotion
  is a bucket membership fact.

- **Misc** — a skill in `skills/misc/`: promoted, shipped through both install
  routes, and as finished as any other promoted skill. What makes a skill
  `misc` is frequency of use, not availability — occasional, not everyday.
  Avoid: "unshipped", "unfinished", "experimental" — those read the split as
  readiness; it is frequency of use, not completeness.

- **In-progress** — public but unshipped from both routes: not listed in the
  plugin manifest, and every in-progress skill carries `metadata.internal: true`
  in its `SKILL.md` frontmatter, which the `npx skills` installer skips unless
  the user sets `INSTALL_INTERNAL_SKILLS=1`.

- **Verification step** — the command a skill instructs the agent to run to settle a
  claim a machine can settle, e.g. `cargo clippy`, `cargo test`, `cargo miri test`.
  Avoid: "test step", "check" — too generic, and "check" collides with `npm run
  check`, the harness command this repo runs.

- **Parity contract** — in porting work, the crisply stated definition of what
  "done" means for a given port. Once stated, it is never narrowed without explicit
  user approval.

- **Source language** — the language a port moves code *from*. Avoid: "origin",
  "legacy" — both carry connotations (legacy implies deprecated, origin is vague)
  that "source language" doesn't.

- **Escape hatch** — `clone`, `unwrap`, `expect`, `Rc<RefCell<_>>`, and similar
  constructs that resolve a borrow-checker or type-system objection without
  resolving the design problem behind it. Using one is sometimes the right call;
  the term names the tradeoff so a skill can flag it rather than silently
  endorsing it.
