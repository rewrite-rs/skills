## What it does

Routes a decision to the skill that owns it: which Rust skill covers which
decision, how the installed skills relate, and which one to reach for from
where you are. The defining constraint: the map carries no guidance of its
own — every sentence names a skill or distinguishes two of them — so running
the map is never the same as running the work; the map ends where the named
skill begins.

## When to reach for it

User-invoked: it is a map you consult on purpose — `/rust-skills-map` — not
one the model reaches for mid-task. The trigger boundary: holding a question
about which skill applies, being new to the set and wanting the lay of the
land before starting work, or settling which of two similar skills a given
decision belongs to. It does not settle the questions it points at — it
points, and the named skill, typed as a `/skill-name`, does the work.

## The decision table

| You are asking | Skill | Not to be confused with |
|---|---|---|
| Does this read like Rust? | `/idiomatic-rust` | `/type-driven-design` — that one changes the model, this one changes the expression |
| Is this `clone` necessary? | `/ownership-not-clone` | `/idiomatic-rust` — expression shape, not ownership structure |
| What should this return on failure? | `/rust-errors` | `/rust-api-design` — whether the error type is a breaking change |
| Can this state exist at all? | `/type-driven-design` | `/rust-errors` — invalid states versus runtime failures |
| Should this be `pub`, generic, or `dyn`? | `/rust-api-design` | `/idiomatic-rust` — public surface versus internal shape |
| Is this safe to `.await` here? | `/async-rust` | `/ownership-not-clone` — the across-`.await` rule only |
| Is this `unsafe` block sound? | `/unsafe-rust` | `/rust-code-review` — soundness versus review process |
| Does this change deserve a test, and which kind? | `/rust-testing` | `/rust-code-review` — designing the test versus judging its absence |
| How do I move this code into Rust without losing behaviour? | `/port-to-rust` | `/rust-testing` — the harness mechanism, not what the harness has to prove |
| What does this Python construct become in Rust? | `/port-from-python` | `/port-to-rust` — the process and the contract, not the construct |
| What does this TypeScript or JavaScript construct become in Rust? | `/port-from-typescript` | `/port-to-rust` — the process and the contract, not the construct |
| What does this Go construct become in Rust? | `/port-from-go` | `/async-rust` — the runtime rules, not the goroutine-to-task mapping |
| What does this Java construct become in Rust? | `/port-from-java` | `/type-driven-design` — the enum rules, not the hierarchy mapping |
| What does this C++ construct become in Rust? | `/port-from-cpp` | `/ownership-not-clone` — the sharing rules, not the smart-pointer mapping |
| What does this C construct become in Rust? | `/port-from-c` | `/port-from-cpp` — RAII, templates, and the STL are the other skill |
| Is this diff ready to merge? | `/rust-code-review` | every craft skill — review routes to them, it does not restate them |
| How should this repo be configured? | `/setup-rust-skills` | user-invoked; nothing else writes to the repo |

## Flows

Three routes, in `FLOWS.md` with the situation, the ordered skills, and the
handoff signal between each step:

- **Starting fresh in a Rust repo** — `/setup-rust-skills` to configure and
  record posture, the craft skills as the code demands them, `/rust-testing`
  alongside, and `/rust-code-review` before merge.
- **Reviewing someone else code** — `/rust-code-review` first; it dispatches
  to the craft skills itself, and a craft skill is reached for directly only
  when the review already named it and the depth is wanted.
- **Porting from another language** — `/port-to-rust` for the parity
  contract, the seam, and the phase sequence, then the matching
  `/port-from-<language>` skill for the construct mapping and the
  boundary, `/rust-testing` for the differential harness, the craft
  skills, and `/rust-code-review` before merge.

The tie-breaker when two skills both seem right: which one names the decision
as its defining constraint, stated on each docs page under `## What it does`.

## Common questions

**Can the model invoke the skill on its own?** No. Both harness flags are set,
as in `setup-rust-skills` — the map is a person-facing instrument. It is
consulted to choose what to run, and a model mid-task does not consult a map;
it runs the skill whose description matches the work.

**What happens when a new skill lands?** The map is updated in the same
change — a router that names a skill nobody can run is worse than no router.

**Is this the place to ask a Rust question?** No. The map answers which
skill; the named skill answers the question. The handoff is a directly
typeable `/skill-name`, and typing it is the next step, not an option.

## It's working if

- Every skill named in the map exists and can be run.
- Every installed skill other than this map appears in exactly one row of the
  decision table.
- The map was updated in the same change as the last skill added, renamed, or
  removed.

## Where it fits

`rust-skills-map` is the router in the workflow group — the skill every other
docs page in the set points to for the full picture, and the one that gets
re-synced in the same change as any skill added, renamed, or removed. It is
the second user-invoked skill, alongside `setup-rust-skills`, and the only one
in the set that owns no guidance at all.
