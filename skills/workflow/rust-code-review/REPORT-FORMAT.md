# Report format

What a finished review looks like, in both shapes, and how it opens and
closes. `SKILL.md` holds the rules; this file holds the templates.

## Which shape

| Situation | Shape |
|---|---|
| A diff, a pull request, a short review | One-line findings |
| A whole file, a module, a crate, an audit, or the user asks for a report | Long report with per-finding blocks |

The severity levels are the same in both: blocking, should-fix, note.

## Opening, in both shapes

Lead with the verdict, then the scope decisions, then what ran:

- **Verdict** — blocking issues present, or none, and the single most
  important fix.
- **Scope** — the subject reviewed; whether a library or an application was
  assumed, and the bar that implies; the edition and MSRV found in `Cargo.toml`.
- **Tools** — which of fmt check, clippy, and tests ran, at what lint level,
  with the grouped results, and which could not run and why.

## One-line shape

```
src/ledger.rs:57 — blocking: slice index on a caller-supplied offset panics past the end; use get(..) and return the error.
src/ledger.rs:90 — should-fix: Ord is hand-written but PartialEq is derived, so sort and BTreeMap can disagree on equality; derive neither or compare the same fields in both.
src/ledger.rs:12 — note: pub field on a type only built in this crate; documented as intentional, so the cost is a later semver pin.
```

## Long report shape

~~~markdown
# Findings for <subject of the review>

**Verdict:** <blocking present / none>. Most important fix: <one sentence>.
**Scope:** <subject>; assumed <library|application>; edition <e>, MSRV <v>.
**Tools:** <what ran, at what level, grouped results; what could not run>.

## Blocking

### 1. <Short title> (`src/queue.rs:64`, `:71`)
**Consequence:** <what goes wrong in practice, and for whom; at most two sentences>
**Standard:** <clippy lint name, or the owning skill such as `/rust-concurrency`>
**Change:**
```rust,ignore
<the fewest lines that resolve it>
```

## Should-fix
### 2. ...

## Note
### 3. ...

## Keep
- <load-bearing choice the fixes above could undo, and why it must stay>

## Next
<only when the repo has no lint configuration; see below>
~~~

Use the long block when one line cannot carry the fix. A finding whose
fix is a one-token change can still be a one-liner inside the long report.

## The keep list

The one-line shape and the praise ban stay as they are: a review does not
soften itself. The long report may carry a keep list of two to four items, and
only for choices the author could undo while applying the fixes — a deliberate
`Arc<Inner>` handle clone, a private field behind an invariant, a test that
pins a subtle ordering. Each item names the choice and what would break. It
tells the author what not to touch; it is never there to balance the tone. If
nothing is load-bearing in that way, omit the section.

## Closing

When the repo has no lint configuration, end with one short paragraph
recommending `/setup-rust-skills` and citing two or three items in this
report that the lints it installs would have flagged — for example, the
unchecked indexing and the unwrap on parsed input. When a configuration
exists, say nothing about it beyond any finding about the config itself.

Do not rewrite the reviewed code in the report beyond the fix lines, and do
not leave a reformatted copy behind: the review reads the tree, it does not
change it.
