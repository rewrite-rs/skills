## What it does

Treats rustdoc as API contract: the first sentence, the module doc, and the
`# Examples`, `# Errors`, `# Panics`, and `# Safety` sections tell the caller
what an item does, requires, returns, and how it fails — and the doctests run
under `cargo test` to keep the contract honest. The defining constraint: a
doc comment never narrates the implementation. A comment that could not be
kept true if the body were rewritten is describing code, and it rots at the
first refactor.

## When to reach for it

Model-invoked: the agent pulls this in on its own when writing or reviewing
doc comments, when a public item is undocumented, when a doctest is failing
or marked `ignore`, or when a magic value appears with no recorded reason. It
does not cover whether the item should be public at all
(`/rust-api-design`) or whether the function should panic rather than return
an error (`/rust-errors`).

## The contract test

Each doc comment answers what a caller must know to call the item correctly,
and nothing more. The first sentence carries the load — roughly fifteen
words, one line, no trailing detail — because it is all the module index
shows. The canonical sections — `# Examples`, `# Errors`, `# Panics`,
`# Safety` — appear in that order, each on its own trigger, and the absence
of `# Panics` is itself a claim that the function cannot panic. Design
journals, changelog narration, and compliance tables stay out of the rendered
docs.

## Doctests that run

A doctest is a test: it compiles and runs under `cargo test`, so it shows the
code a caller would actually write — `?` rather than `.unwrap()`, with setup
hidden on `#` lines instead of dropped into a fragment. `ignore` is honest
only when the example is a deliberate fragment; `no_run` when it must compile
but must not execute; `compile_fail` when not compiling is the point.

## Common questions

**Is `missing_docs` worth turning on?** For a library, usually yes — it turns
an undocumented public item from a discovery into a warning. Propose it where
the crate has not opted in, do not impose it, and never add it to a binary
crate.

**When is `ignore` on a doctest honest?** When the example is a deliberate
fragment — it names a type the surrounding prose defines, or shows a signature
with no body. When the example could be made to run, `ignore` means nothing
checks it, and that is rot waiting to happen.

**Do private items need docs?** The contract rules do not reach them —
`missing_docs` fires on the public surface only. A private item that is hard
to read still earns a comment stating the invariant or the reason, but that
is a code-comment question, not an API-contract one.

**Where do architecture notes go if not in the crate docs?** Into the repo —
a design record, an ADR, a note beside the code — anywhere that never renders
into the docs a user reads. A reader looking up a function signature has no
use for the writing process.

## It's working if

- `cargo doc --no-deps` is warning-free.
- Every public function returning `Result` has an `# Errors` section naming
  the conditions that produce the failure.
- Every `pub unsafe fn` has a `# Safety` section stating the invariant the
  caller upholds.
- `cargo test --doc` runs a non-zero number of tests.
- No design journal, changelog narration, or compliance table appears in the
  rendered output.

## Where it fits

`rust-docs` is the documentation skill in the language-craft group — the one
a review pass invokes for doc comments and doctests, and the one a port
invokes when the new public surface has to be written down. It defers panic
policy to `/rust-errors`, the depth of a `# Safety` section to
`/unsafe-rust`, and public-surface questions to `/rust-api-design`. See
`rust-skills-map` for how the full set of Rust skills relates.
