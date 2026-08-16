## What it does

Treats serde as the parse boundary — the point where untrusted input becomes a
domain type — covering `rename_all`, `default`, `skip_serializing_if`,
`flatten`, the four enum representations, `deny_unknown_fields`, and
`try_from` validation, decided per type rather than by habit. The defining
constraint: the type you deserialize into is the type the rest of the program
trusts, so it is the last place validation is cheap. A `Config` that
deserializes with a `String` port and checks it in `run()` has moved the
failure past every layer that could have reported it usefully.

## When to reach for it

Model-invoked: the agent pulls this in on its own when deriving `Serialize`
or `Deserialize`, when choosing an enum wire representation, when a JSON or
YAML shape does not match the Rust type, or when the user asks how to validate
deserialized data. It is not the domain model itself — what the validated type
should be is `/type-driven-design` — and it is not derive mechanics: a custom
derive that goes beyond what the serde attributes cover is `/rust-macros`. The
user can run it directly, as `/rust-serde`.

## The parse boundary

The mechanism for validation at the parse is `#[serde(try_from = "...")]`:
deserialize into a raw shape, convert with `TryFrom` into the validated type,
and the conversion failure becomes a deserialization error — the payload
fails at the read, not at the first use of the value. The `TryFrom` error
must implement `std::error::Error`.

The surrounding decisions, per type:

- **Naming.** `rename_all` on the type, not `rename` on every field — the Rust
  name follows Rust convention, the attribute carries the wire convention, so
  neither side distorts the other.
- **Optionality.** Three meanings that are different: `#[serde(default)]` —
  the field may be absent and has a sensible zero, and an explicit null is
  still an error; `Option<T>` — absent and null both land in `None`, erasing
  the distinction, so when the code must say which it means the field is not a
  bare `Option`; `skip_serializing_if` — do not emit the key at all on the way
  out. Getting these wrong produces a round-trip that is not one — the bug
  that shows up in a system you do not run, failing on a payload you produced.
- **Unknown fields.** `deny_unknown_fields` is a decision, not a default: a
  config file usually denies (a silently ignored key is a support ticket), a
  message from a service you do not control usually accepts (a producer may add
  a field without breaking every consumer).
- **Composition.** `flatten` composes a shared struct into several types
  without repeating the fields, but it disables `deny_unknown_fields` on the
  containing type and forces buffering during deserialization — worth it for
  composition, not for saving four lines.
- **Errors.** A deserialization failure is user-facing input error, not a bug:
  it carries the reason — and, in JSON, a line and column once the failure
  sits in a nested field — and it goes into the crate error type as its own
  kind, not as a stringified message. The shape of that error kind is
  `/rust-errors`.

## Enum representations

| Representation | On the wire | Constraint |
|---|---|---|
| External — the default | `{"Named": "x"}`: a one-key wrapper around the variant | the wrapper key is noise when the payload already says what it is |
| Internal — `tag = "type"` | `{"type": "Named", "name": "x"}`: the tag inside the variant | cannot hold a newtype variant over a non-struct |
| Adjacent — `tag` plus `content` | `{"type": "Named", "value": "x"}`: tag and payload as siblings | the tag key is reserved in the envelope — a wire shape that already spends it at the top level cannot use this representation |
| Untagged | the variant shape as-is, no marker | tries every variant in order and reports a useless error when all fail — last resort, never for input you must diagnose |

External is the default; internal and adjacent are what a self-describing
message needs; untagged is for a shape no representation fits.

## Common questions

**`#[serde(default)]` or `Option<T>`?** Different questions. `default` says
the field may be absent and has a sensible zero, with an explicit null still an
error. A bare `Option` says absent and null are both fine and both mean the
same thing. When the code must say which it means, the field is not a bare
`Option`.

**Should I deny unknown fields?** Per type, deliberately: deny in a config file
the user writes, where a silently ignored key is a support ticket; accept in a
message from a producer that may add a field without breaking every consumer.
A type where the choice was never made ships accepting, because that is what
serde does.

**Why is my untagged enum error useless?** Untagged tries every variant in
order and, when all fail, reports the failure of the last attempt — no marker,
no account of what was tried. That is why untagged is a last resort and never the
representation for input you must diagnose.

**Does `flatten` cost anything?** Twice: it disables `deny_unknown_fields` on
the containing type, and it forces buffering during deserialization. Worth it
for composition, not for saving four lines.

## It's working if

- Every deserialized type is valid by construction — validation happens at the
  parse, not at the first call site after it.
- `rename_all` sits on the type rather than `rename` on every field.
- A round-trip test exists against a payload the other side produced — a
  round-trip of only your own output proves the type agrees with itself.

## Where it fits

`rust-serde` is the wire-format boundary skill in the `misc` bucket — the one
that keeps untrusted input from entering the domain as an unvalidated type. It
hands the shape of the validated type to `/type-driven-design`, the
public-surface question to `/rust-api-design`, the shape of the error kind to
`/rust-errors`, and derive mechanics to `/rust-macros`. See `rust-skills-map` for how the full set
of Rust skills relates.
