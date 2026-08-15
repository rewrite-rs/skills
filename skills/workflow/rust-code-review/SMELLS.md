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
| `unsafe` without `// SAFETY:`, or a `pub unsafe fn` without `# Safety` | A new unsafe block or fn whose invariant is not written down | The written invariant is what makes the block sound; unwritten, it cannot be checked, and the next caller change can break it silently | `/unsafe-rust` |
| An index loop that is a `map`/`filter`/`collect` in disguise | `for i in 0..v.len()` where the body only reads `v[i]` and accumulates | The iterator form fails to compile on a bounds mistake instead of panicking at runtime, and it reads like Rust to a Rust reader | `/idiomatic-rust` |
| A behaviour change with no test that would fail without it | A diff that changes observable behaviour and adds no test, or only tests that pass against the old code | The regression is unfalsifiable: the next refactor breaks the behaviour and nothing says so | `/rust-testing` |
| A test asserting on `Display` output where a variant match is the contract | `assert_eq!(err.to_string(), "...")` where the callers would match on the variant | The string is formatting, not a contract; the test breaks on a wording change and stays green on a variant change | `/rust-testing` |

## Smells that are not defects in every repo

The same line can be right in context: a `clone` in a startup path that runs
once, where the allocation is noise; `unwrap` in a test, or in a `main` that
documents its own preconditions; `pub` on a crate that is deliberately a
facade for its internals. The rule: when the context is genuinely ambiguous,
the reviewer asks rather than asserts, and the finding is filed as a note.
