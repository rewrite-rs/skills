# Shared state

The decision material for `Rc`, `Arc`, `RefCell`, `Mutex`, and the models that
replace them. This is not an argument that shared ownership is always wrong —
`Arc<Mutex<T>>` is simply correct for state that threads genuinely share and
mutate concurrently. It is the test for telling the two cases apart.

## The four tools, and what each one costs

`Rc<T>` — single-thread shared ownership. `Arc<T>` — the same, `Send + Sync`,
with an atomic reference count. Pick by whether the value crosses a thread:
`Rc` where it cannot, `Arc` where it can. An `Arc` used on a single thread is
paying for atomicity that never fires.

`RefCell<T>` — interior mutability through shared ownership, checked at runtime.
`Mutex<T>` — the same idea, with the check plus thread safety. `RwLock<T>` —
multiple concurrent readers, one writer. The cost of the `RefCell` family is the
important thing to keep in view: it does not remove the borrow-checker error, it
moves it from compile time to runtime. A `RefCell` that is borrowed mutably and
then read panics in the user process, where the `E0502` used to stop the build.
Reach for it only when the borrow structure is genuinely dynamic — determined by
data at runtime, not by the shape of the code. Where a panic is not acceptable,
`try_borrow` and `try_borrow_mut` return a `Result` instead of aborting the
operation; handle the `Err` as the signal that the structure is more tangled than
planned.

The nesting order picks the mutation granularity. `Rc<RefCell<Vec<T>>>` locks the
whole collection for any change, so one borrow blocks every other. `Rc<Vec<RefCell<T>>>`
lets each element be borrowed on its own while the collection stays fixed in
length. Choose the finer grain only when the elements really are touched
independently; otherwise the extra cells are more runtime checks to get wrong.

Pointer-choice guidance for ordinary references and `Box` is in `LIFETIMES.md`.
Prefer unique ownership wherever it fits. Shared ownership is the right call when
the alternative is unreasonably complex, and cloning an `Rc` or `Arc` handle is
cheap and expected rather than a smell. A reference cycle between `Rc`s is never
freed, so back-pointers in a tree or graph (a child pointing at its parent) hold a
`Weak<T>`, upgraded to an `Rc` only for the moment of use:

```rust
use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Folder {
    name: String,
    parent: RefCell<Weak<Folder>>,
    children: RefCell<Vec<Rc<Folder>>>,
}

fn add_child(parent: &Rc<Folder>, name: &str) -> Rc<Folder> {
    let child = Rc::new(Folder {
        name: name.to_string(),
        parent: RefCell::new(Rc::downgrade(parent)),
        children: RefCell::new(Vec::new()),
    });
    parent.children.borrow_mut().push(Rc::clone(&child));
    child
}
```

The owning direction (parent to children) is strong and the back direction is
weak, so dropping the root frees the whole tree.

## The handle clone

A service type that owns a connection pool, a client, or a background task does not
get copied when you clone it. It holds an `Arc<Inner>`, and `#[derive(Clone)]` on
the outer type clones one pointer. Every task gets its own handle to the same
thing, which is the shape `tokio::spawn` and axum state want, and it is the reason
those APIs ask for `Clone` types without asking you to copy your database.

```rust
use std::sync::Arc;

struct Inner {
    endpoint: String,
}

#[derive(Clone)]
pub struct ApiClient {
    inner: Arc<Inner>,
}

impl ApiClient {
    pub fn new(endpoint: String) -> Self {
        Self { inner: Arc::new(Inner { endpoint }) }
    }

    pub fn endpoint(&self) -> &str {
        &self.inner.endpoint
    }
}
```

The boundary, stated plainly so this does not become a loophole: this is not an
exception to the rule, it is the rule passing. The test has always been "can you
explain the clone in one sentence" — "each task needs its own handle to the shared
client" is that sentence. What fails the test is unchanged: cloning a `Vec` because
a borrow was inconvenient, cloning a `String` to hand to a function that wanted
`&str`, and wrapping data in an `Arc` because a borrow error appeared rather than
because two owners genuinely exist.

## The four-question test before `Rc<RefCell<T>>`

1. **Does the data genuinely have multiple owners?** A single owner with an
   inconvenient name is an ownership problem, not a shared-ownership problem.
2. **Do those owners have unrelated lifetimes?** If one owner clearly outlives
   the rest, make it the owner and hand the others references.
3. **Is interior mutability actually needed, or is the mutation confined to one
   place?** Mutation confined to one place can stay behind `&mut`.
4. **Would an index into a `Vec` model the same graph without the runtime borrow
   check?** If yes, the arena is cheaper and cannot panic.

A `Rc<RefCell<T>>` is the answer when the honest answers are yes, yes, yes, no.

## The arena alternative

A graph does not need pointers between its nodes. A node reference can be a
`usize` into a `Vec`, which removes the reference counting, the runtime borrow
check, and the cycle-leak risk (a `Rc` cycle is a leak, not freed even at
shutdown):

```rust
struct Node;

struct Graph {
    nodes: Vec<Node>,
    edges: Vec<(usize, usize)>, // (from, to) by index
}

impl Graph {
    fn add_node(&mut self, node: Node) -> usize {
        self.nodes.push(node);
        self.nodes.len() - 1
    }

    fn neighbours(&self, id: usize) -> impl Iterator<Item = &Node> {
        self.edges
            .iter()
            .filter(move |(from, _)| *from == id)
            .map(|(_, to)| &self.nodes[*to])
    }

    fn connect(&mut self, from: usize, to: usize) {
        self.edges.push((from, to));
    }
}
```

The arena has a weak spot of its own: a plain `usize` is not tied to the element
it named. After a removal, or an id carried over from a different graph, the index
can point at the wrong node or past the end. Keep the `Vec` append-only, or pair
the index with a generation counter or a typed id wrapper, so a stale handle is
caught instead of silently reading the wrong thing.

The index pays a bounds check per hop and a cache miss per node; the `Rc` pays
an atomic counter, a possible runtime panic, and a possible cycle leak. For most
internal graphs the arena wins, and it wins by making the failure modes
unrepresentable rather than by being faster.

## When `Arc<Mutex<T>>` is simply correct

State shared across threads with real concurrent mutation — a cache several
worker threads read and write, a counter updated from a signal handler and a
main loop — is exactly what `Arc<Mutex<T>>` is for. The test that makes it
legitimate is the runtime-structure test from `SKILL.md`: multiple owners, no
single one outliving the rest, mutation that is not confined to one place.

One async-specific rule changes which mutex is right: a `std::sync::MutexGuard`
held across an `.await` blocks the executor thread for the duration of the wait,
which is a deadlock waiting to happen on a single-threaded runtime. The
async-specific treatment of locks, channels, and blocking work lives in the
`/async-rust` skill.
