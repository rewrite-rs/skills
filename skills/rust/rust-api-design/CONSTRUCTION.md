# Construction

The depth for how a public type gets built: plain constructors, `Default`,
parameter groups, and builders. Naming of constructors (`new`, `with_*`, `from_*`)
is `/idiomatic-rust` (`NAMING.md`); this file decides which shape to offer.

## Pick the shape by how many knobs there are

| Situation | Offer | Why |
|---|---|---|
| Every input is required | `new(a, b)` | Nothing to configure, nothing to forget |
| One or two optional inputs | Inherent variants: `new`, `with_tls`, `with_proxy`, `with_tls_proxy` | The permutations stay countable and every one is discoverable in the docs |
| Four or more optional permutations | A separate `MailerBuilder` | The constructor family would double with each new option |
| Four or more required parameters | Group them into semantic types, then `new(account, amount)` | A call with a long run of same-typed arguments is unreadable and swappable by mistake |
| An all-public-field options struct | `impl Default`, callers write `..Default::default()` | No builder needed when every field is passive data |

A builder also pays off when the type has compound data, several flavours of the
same product, or side effects at creation time (opening a file, spawning a
thread) that you want delayed until an explicit finish. It is the answer to
"constructors multiplied" and to "I must add fields later without breaking
callers": a builder with private state grows new options as new methods, where a
constructor signature would have to change.

When a struct is a plain bag of options with every field public, skip the builder
and implement `Default` so callers fill in the few they care about. This is only
for options callers read and write directly; the moment a field carries an
invariant it must be private and the builder (or a validating constructor) takes
over.

## Shape of a builder

- The entry point is `Mailer::builder()`, returning `MailerBuilder`.
  `MailerBuilder::new` is not public, so there is one way in and the entry point is discoverable from
  the type callers already know.
- The builder collects only what must be supplied up front through the entry
  point, or takes required values as one grouped argument that converts from a
  small deps struct, so the optional setters never need to mention them.
- Setters are named after the field they set (`timeout`, not `set_timeout`) and
  are infallible: they store, they do not judge.
- All validation, including checks that span several fields, lives in the single
  terminal `build()` that returns `Result`. One place reports every problem, and
  a setter never fails halfway through a chain.
- Hand-writing the setters for a wide builder is mechanical; a derive crate such
  as `derive_builder` removes that boilerplate when the builder is a faithful
  mirror of the struct. Write it by hand when setters carry logic.

## Consuming or borrowing setters

```rust
#[derive(Default)]
pub struct RequestBuilder {
    retries: u32,
    verbose: bool,
}

pub struct Request {
    retries: u32,
    verbose: bool,
}

impl RequestBuilder {
    // borrowing: staged and reused, but needs a named binding
    pub fn retries(&mut self, n: u32) -> &mut Self {
        self.retries = n;
        self
    }

    // repeatable, so every call builds fresh values
    pub fn build(&self) -> Request {
        Request { retries: self.retries, verbose: self.verbose }
    }
}

fn demo() {
    let mut b = RequestBuilder::default();
    b.retries(3);
    if cfg!(debug_assertions) {
        b.retries(5); // conditional staging works
    }
    let one = b.build();
    let two = b.build();
    let _ = (one, two);
}
```

The two styles trade off the same way every time:

| Style | Setter signature | Good at | Bad at |
|---|---|---|---|
| Borrowing | `&mut self -> &mut Self`, terminal `&self` | Conditional staging, building several values from one builder, reuse | A one-line chain off a temporary fails: `let` the builder first if it is used past the statement |
| Consuming | `self -> Self`, terminal `self` | The tidiest one-expression chains | Cannot be configured inside an `if` without rebinding; cannot be reused |

Default to the borrowing style. Use the consuming style only when the terminal
method has to move a value out of the builder (a handle, a buffer, a channel
end), since a `&self` terminal cannot hand over ownership without cloning. The
typestate variant, where each call returns a different type, is consuming by
necessity; see `/type-driven-design`.

A terminal method that takes `&self` and may be called twice must construct fresh
values each time. Handing out a clone of one shared handle, or the same buffer,
turns "build another" into aliasing.
