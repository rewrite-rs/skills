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
data at runtime, not by the shape of the code.

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
            .filter(|(from, _)| *from == id)
            .map(|(_, to)| &self.nodes[*to])
    }

    fn connect(&mut self, from: usize, to: usize) {
        self.edges.push((from, to));
    }
}
```

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
