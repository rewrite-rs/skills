# Smell baseline

The judgment calls no lint can make — what the review adds beyond clippy.
Each row names the smell, how it shows up in a diff, why it is a defect rather
than a preference, and the skill that owns the standard. A row is a trigger,
not a verdict: the named skill owns the rule, and the cases where context
flips the call are at the bottom of this file.

| Smell | How it shows up in a diff | Why it is a defect, not a preference | Owning skill |
|---|---|---|---|
| `clone` with no explaining reason at the call site | A `.clone()` added to silence a borrow error, no comment, no local need for the copy | A clone that only silences an error is a deferred design decision; the ownership structure is wrong, and every reader inherits the allocation plus the unasked why | `/ownership-not-clone` |
| `Rc<RefCell<_>>` or `Arc<Mutex<_>>` introduced to resolve a borrow error | A new indirection layer where a plain reference, or a shorter borrow, would do | Shared machinery bought to appease the checker adds refcount or lock cost, a deadlock surface, and `Send`/`Sync` friction to every use | `/ownership-not-clone` |
| `unwrap`/`expect` on caller-controlled input, or anywhere in a library path | A new `.unwrap()` on a value a caller can influence, in library code | A library panic turns a caller-recoverable failure into a crash; the failure belongs in a `Result` the caller can match | `/rust-errors` |
| An error enum with one variant carrying a `String` for everything | A new error type shaped like `Failed(String)`, or a match arm that parses the message | Callers cannot tell apart the failure classes the code already knows — retryable from fatal — so the type is a log line, not a contract | `/rust-errors` |
| `bool` or `&str` parameters that encode a mode | `fn render(pretty: bool)`, or callers passing `"strict"` and `"lenient"` | The type admits every combination, most of them nonsense; the impossible combination is a latent bug the compiler cannot name | `/type-driven-design` |
| A constructor that can build a state the domain forbids | A public literal or `new` accepting a field combination the invariants rule out | Every constructible invalid state forces a runtime check at every call site; one forgotten check ships the bug | `/type-driven-design` |
| `pub` on an item with no caller outside the crate | A new `pub` fn or type whose only uses are in-crate | `pub` is a semver promise to every downstream; an item with no external caller is a commitment with no counterparty | `/rust-api-design` |
| A public function taking `String`/`Vec<T>` where `&str`/`&[T]` would do | A new or changed signature that takes an owned collection it only reads | It forces a clone at every caller that holds a reference; the allocation lands at the call site, but the defect is in the signature | `/rust-api-design` |
| A new public enum or struct field without `#[non_exhaustive]` consideration | A new variant or field on a released type, with no attribute and no note | Without it, the next additive change is a breaking one; the attribute is the cheap way to keep the type evolvable | `/rust-api-design` |
| Blocking I/O, `std::thread::sleep`, or a `std::sync` guard held across `.await` | A sync call or a sleep inside an `async fn`; a live guard over an await point | It stalls the executor thread and starves every other task on it; the failure shows up as latency on unrelated code | `/async-rust` |
| `unsafe` without `// SAFETY:`, a `// SAFETY:` that restates the code, or a `pub unsafe fn` without `# Safety` | A new unsafe block or fn whose invariant is not written down, or whose comment only repeats what the code does | The written invariant is what makes the block sound; unwritten, or restated instead of stated, it cannot be checked, and the next caller change can break it silently | `/unsafe-rust` |
| An index loop that is a `map`/`filter`/`collect` in disguise | `for i in 0..v.len()` where the body only reads `v[i]` and accumulates | The iterator form fails to compile on a bounds mistake instead of panicking at runtime, and it reads like Rust to a Rust reader | `/idiomatic-rust` |
| A behaviour change with no test that would fail without it | A diff that changes observable behaviour and adds no test, or only tests that pass against the old code | The regression is unfalsifiable: the next refactor breaks the behaviour and nothing says so | `/rust-testing` |
| A test asserting on `Display` output where a variant match is the contract | `assert_eq!(err.to_string(), "...")` where the callers would match on the variant | The string is formatting, not a contract; the test breaks on a wording change and stays green on a variant change | `/rust-testing` |
| A public error enum variant carrying a type from a dependency | A new variant shaped like `Parse(toml::de::Error)` on a published error type | The variant pins the dependency into the contract, and the next failure mode added to the enum breaks every caller match | `/rust-errors` |
| An `Arc`, `Rc`, `Box` or `RefCell` in a public signature | A new or changed `pub fn` that takes or returns one of the four | The pointer is how the crate stores the thing, not what the caller has; exposed, the storage shape becomes semver and every caller imports the machinery | `/rust-api-design` |
| A `pub` item with no doc comment, a `Result`-returning public function with no `# Errors`, a `pub unsafe fn` with no `# Safety` | A new public item, error function, or `unsafe` fn shipped without the section rustdoc would render for callers | The doc comment is the API contract: a caller matching the error has nowhere to read the variants, and an `unsafe` fn without `# Safety` asks for trust in what is not written | `/rust-docs` |
| `println!` in library code, or a log call interpolating values into the message instead of passing fields | A `println!` in a library crate, or `warn!("failed for {id}")` where the value belongs in a named field | The library writes to a channel it does not own, and a value interpolated into a message is text, not data: it cannot be queried, filtered, or redacted, which is what the field is for | `/rust-observability` |
| An `as` between integer types where `try_from` was available | A new `n as u32`, or a narrowing `as i8`, added to make a type mismatch compile | The cast discards the overflow without a trace; the value wraps silently where `try_from` would have made the failure a `Result` someone handles | `/type-driven-design` |
| A guard held across a call that can lock again | A live `MutexGuard` across a call that acquires the same lock, or across a callback that reaches it | Re-acquiring a lock the thread already holds is a self-deadlock: the program stops on a line that reads like ordinary refactoring | `/rust-concurrency` |
| A committed `target-cpu` or `panic = "abort"` in a library profile | A `[profile.release]` section in a library crate setting either | The library ships code tuned to the machine it was built on, or aborts a panic the downstream binary meant to catch: a profile setting becomes a promise to every consumer | `/rust-performance` |

## Read these first: correctness and soundness

The priority order in `SKILL.md` puts these above every row of the table
above. A defect here is blocking by default; a style row never outranks one.

| Smell | How it shows up in a diff | Why it comes first | Owning skill |
|---|---|---|---|
| UB behind a safe signature | A safe `fn` that hands out a reference or pointer whose validity depends on a call order the caller is not forced into; `transmute` used to widen a lifetime or cast an enum; `unsafe impl Send`/`Sync` added to make an error go away | Safe code must never cause UB; once it can, every caller is unsound without having written `unsafe` | `/unsafe-rust` |
| A reachable panic on outside input | `slice[start..end]` on offsets from a request, `v[i]` after a length read elsewhere, `n as u8` on a parsed value, `a + b` on untrusted integers | Debug builds panic, release builds wrap: the same input crashes in one profile and corrupts data in the other | `/rust-errors` |
| `Ord` hand-written beside a derived `PartialEq`, or `Hash` over different fields than `Eq` | An `impl Ord for Ticket` comparing priority only, while `#[derive(PartialEq, Eq)]` compares every field | `sort`, `dedup`, `BTreeMap`, and `HashMap` assume the traits agree; when they do not, entries vanish or duplicate with no error | `/rust-api-design` |
| A lock guard across `.await`, or returned to a caller | A `MutexGuard` alive over an await point; a method returning the guard | The task can resume on another thread, or never; the guard outlives the code that reasoned about it | `/async-rust`, `/rust-concurrency` |
| A caller-supplied closure run while a lock is held | `with_state(\|s\| callback(s))` where the callback can reach the same lock | The library cannot know what the callback does: self-deadlock, or a long hold that serialises every other thread | `/rust-concurrency` |
| Poison swallowed with `into_inner` and no repair | `lock().unwrap_or_else(\|e\| e.into_inner())` on state a panicking writer left half-updated | The data may break its own invariant, and the next reader trusts it | `/rust-concurrency` |
| A `Drop` that can panic, block, or fail | `drop` that calls `unwrap`, joins a thread, or does network I/O | A panic inside unwinding aborts the process, and a blocked drop hangs whatever scope exits; failure has no channel to report through | `/unsafe-rust`, `/rust-errors` |

## Error handling, then API and idiom rows

Rows not already in the main table, in the order the review reads them:

| Smell | How it shows up in a diff | Owning skill |
|---|---|---|
| A public library function whose error type is `()`, `String`, or `Box<dyn Error>`, or a custom error enum missing `Display` and the `Error` trait | `Result<T, String>` on a `pub fn` | `/rust-errors` |
| `anyhow::Error` in a library public signature | A published function returning it | `/rust-errors` |
| `map_err(\|_\| ...)` that drops the source, or an error naming no path, line, or value | The cause disappears; the message says only "invalid input" | `/rust-errors` |
| `catch_unwind` as control flow, or a panic for an expected failure | A panic caught to continue the loop | `/rust-errors` |
| `&String`, `&Vec<T>`, `&Box<T>` parameters | The clippy lint `ptr_arg` covers the plain cases; look for the wrapped ones | `/rust-api-design` |
| A `get_` prefix on a getter, an `as_`/`to_`/`into_` name that misstates cost or ownership | `fn get_name(&self)`; `to_x` that consumes self | `/rust-api-design` |
| Missing `Debug` on a public type, or `Default` beside a no-argument `new` | A new public struct with neither | `/rust-api-design` |
| Testing an `Option` and then unwrapping it | `if opt.is_none() { return; } let v = opt.unwrap();` | `/idiomatic-rust` |
| Output or a test that depends on `HashMap` ordering | A report built by looping a map, then compared as text | `/idiomatic-rust` |
| `#![deny(warnings)]` in source | The build breaks on the next compiler release; enforce it in CI instead | `/setup-rust-skills` |
| A `#[allow]` with no reason | Prefer `#[expect(lint, reason = "...")]` when the MSRV is 1.81 or later; below that, keep `#[allow]` with a `//` comment giving the reason | `/idiomatic-rust` |
| A doc example that unwraps instead of using `?` | Readers copy it | `/rust-docs` |
| Untested logic, or tests whose assertions only echo constants | An assertion equal to the literal it was built from | `/rust-testing` |

## Smells that come from generated code

These are review lenses, not topics, which is why they live here rather than
in a skill of their own:

| Smell | What it looks like | Where it is settled |
|---|---|---|
| A test asserting ground truth it computed itself | the expected value derived from the logic under test | `/rust-testing` |
| The same item public at two paths | a `pub use` added beside the original rather than replacing it, so both keep working | `/rust-api-design` |
| Design journal or compliance table in user-facing docs | "\| Rule \| Applied \|" tables, iteration narration, or rationale in item docs | `/rust-docs` |
| A port shaped like its source | `throw_if_null`-style helpers, a class hierarchy transliterated to traits, a striking structural similarity to the original | `/port-to-rust` |

They pass review because they look like diligence, and they are what an agent
produces when it optimises for resembling correct work.

## Smells that are not defects in every repo

The same line can be right in context: a `clone` in a startup path that runs
once, where the allocation is noise; `unwrap` in a test, or in a `main` that
documents its own preconditions; `pub` on a crate that is deliberately a
facade for its internals. The rule: when the context is genuinely ambiguous,
the reviewer asks rather than asserts, and the finding is filed as a note.

One named exception the baseline must not flag: a service type that holds an
`Arc<Inner>` and derives `Clone` clones one pointer, so every task gets its
own handle to the same thing. `/ownership-not-clone` names that handle clone
the rule passing, not a defect.
