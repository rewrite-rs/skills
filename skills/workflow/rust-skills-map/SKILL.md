---
name: rust-skills-map
description: The router for this skill set — which Rust skill covers which decision, how they relate, and which one to reach for from where you are.
disable-model-invocation: true
---

# Rust Skills Map

This map contains no guidance of its own: every sentence in it either names a
skill or explains how to choose between two of them. What it settles is the
choice — which skill owns the decision in front of you, and which neighbour it
is not. It runs only when the user invokes it, as `/rust-skills-map`: a map
you consult on purpose, not one the model reaches for mid-task.

## How to use this map

Pick the row in the decision table matching the decision in front of you, run
that skill, and come back here only if the skill hands you off. Skills invoke
each other in prose, so following a handoff means typing the named skill —
every handoff in this set is a directly typeable `/skill-name`.

## The three buckets, one line each

- `rust/` — language craft: how the code should be shaped.
- `workflow/` — process: testing, review, and repo setup.
- `porting/` — migration from another language. Not shipped yet: the
  per-language skills for C, C++, Python, TypeScript, Go, and Java, and the
  process skill they route through, land in a later wave, and nothing in this
  map presents one as installed.

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
| Is this diff ready to merge? | `/rust-code-review` | every craft skill — review routes to them, it does not restate them |
| How should this repo be configured? | `/setup-rust-skills` | user-invoked; nothing else writes to the repo |

## The three flows, one line each

The full route for each — the situation, the ordered skills, and the handoff
signal that moves between them — is in `FLOWS.md`.

- **Starting fresh in a Rust repo:** `/setup-rust-skills` to configure and
  record posture, then the craft skills as the code demands them,
  `/rust-testing` alongside, and `/rust-code-review` before merge.
- **Reviewing someone else code:** `/rust-code-review` first — it dispatches
  to the craft skills itself; a craft skill directly only when the review
  already named it and the depth is wanted.
- **Porting from another language:** partly forthcoming — the process skill
  and the per-language skills land in a later wave; until they do, the route
  runs through `/rust-testing` for the differential harness, then the craft
  skills, then `/rust-code-review`.

## Keeping this map honest

When a skill is added, renamed, or removed from the set, this map is updated
in the same change — a router that names a skill nobody can run is worse than
no router.

## No verification step, and why

This skill makes no claim a machine can settle — it routes between skills, and
there is no code to run a check against — which is the exemption the
verification rule for this set allows, and no `cargo` command is invented to
satisfy the pattern.
