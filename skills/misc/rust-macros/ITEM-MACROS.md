# Item macros

A checklist for a `macro_rules!` that emits items — structs, consts, impls,
modules. Users judge it by how much it feels like writing the item by hand.

## The input looks like the output

Invocation syntax should echo the item it produces. A macro that makes a
newtype reads like a struct declaration, and one that makes constants ends
each entry with `;` the way a `const` does. Invented punctuation makes every
call site a puzzle and defeats editor formatting.

## Attributes and visibility pass through

Accept `$(#[$meta:meta])*` before each item and re-emit it, so `#[cfg(..)]`,
`#[derive(..)]`, and doc comments work per item. Visibility follows the input:
capture `$vis:vis` and emit it. The emitted item is private unless the caller
wrote `pub`; a macro never makes items public on its own.

```rust
macro_rules! id_types {
    ($($(#[$meta:meta])* $vis:vis struct $name:ident($inner:ty);)*) => {
        $(
            $(#[$meta])*
            $vis struct $name($inner);

            impl $name {
                $vis fn get(&self) -> $inner { self.0 }
            }
        )*
    };
}

id_types! {
    /// A user key.
    #[derive(Clone, Copy, Debug)]
    pub struct UserId(u64);

    struct SessionId(u32);
}
```

## Works at module scope and inside a function

An item macro may be invoked at the top of a module or in a function body, so
test both. Items emitted inside a function sit in a block, not a module: a
path such as `super::Other` that resolves in a module fails there. Emit
paths through `$crate` or take the type from the caller instead of assuming
the module layout. For the same reason, do not wrap the output in a
`pub mod` of its own; such a module cannot see types defined locally at the
call site.

## A `ty` fragment accepts every type the caller can write

A `$t:ty` capture must work with primitives, relative paths, absolute paths,
`super::` paths, and generic types such as `Vec<Option<u8>>`. Write one test
invocation for each form; a macro that handles only plain identifiers fails
the first time someone passes a path.
