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
an error (`/rust-errors`). The user can run it directly, as `/rust-docs`.

## The contract test

Each doc comment answers what a caller must know to call the item correctly,
and nothing more. The first sentence carries the load — roughly fifteen
words, one line, no trailing detail — because it is all the module index
shows. The canonical sections — `# Examples`, `# Errors`, `# Panics`,
`# Safety` — appear in that order, each on its own trigger, and the absence
of `# Panics` is itself a claim that the function cannot panic. Design
journals, changelog narration, and compliance tables stay out of the rendered
docs; the page documents the end state, with a README section on enduring
architectural goals as the one fine exception. Each doc comment is a capitalised,
punctuated sentence. A module doc says what it contains, when to use it, an
example, and observable side effects, and the crate root is the thorough front
page. Examples aim at every kind of public item, including macros and type
aliases, within reason, and show why to use the item. `# Errors` also covers
trait methods whose implementations may fail, `# Abort` covers process aborts,
and parameters are described in prose, not in a table.

## Doctests that run

A doctest is a test: it compiles and runs under `cargo test`, so it shows the
code a caller would actually write — `?` rather than `.unwrap()` or the old `try!` macro, with setup
hidden on `#` lines instead of dropped into a fragment. `ignore` is honest
only when the example is a deliberate fragment; `no_run` when it must compile
but must not execute; `compile_fail` when not compiling is the point. Heavy
setup goes in a hidden helper function taking the prepared values as
parameters, so the example compiles without running its assertions.
`#[doc(inline)]` is for crate-internal re-exports, never std or third-party
types, and `#[doc(hidden)]` fits impls no user triggers by name.

## Comments, packaging, and magic values

Magic values get a named `const` whose doc comment gives the reason, the effect
of changing it, and any outside system the value ties to. Plain `//` carries
implementation notes, TODOs, and disabled code, may sit under a `///` on the
same item, and a doc comment never restates the item name or explains language
basics: omit it, or allow `missing_docs` locally, rather than write filler.
Enum variant docs are often omittable, and hand-written docs beat
macro-generated ones. A published crate fills in `authors`, `description`,
`license`, `repository`, `keywords`, and `categories`, adds `documentation`
only when docs are not on docs.rs and `homepage` only when it differs from
`repository`, keeps release notes with breaking changes marked, and tags
releases with annotated tags. Docs serve agents as well as people. The details
are in `COMMENTS.md` and `PACKAGING.md`.

## Common questions

**Is `missing_docs` worth turning on?** For a library, usually yes — it turns
an undocumented public item from a discovery into a warning. Propose it where
the crate has not opted in, do not impose it, and never add it to a binary
crate. Do not quiet it with rushed docs that restate the name.

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

- `cargo doc --no-deps` is warning-free, and the rendered pages (`--open`) read well.
- Every public function returning `Result` has an `# Errors` section naming
  the conditions that produce the failure.
- Every `pub unsafe fn` has a `# Safety` section stating the invariant the
  caller upholds, and every `unsafe trait` states what implementers must uphold.
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
