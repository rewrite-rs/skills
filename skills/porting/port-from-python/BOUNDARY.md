If the end state is A — a standalone Rust replacement, no Python importing
anything afterwards — the rest of this file does not apply, and the seam is
the process boundary described in the last section. Read `/port-to-rust`
for the end-state decision and come back only under B or C.

Under C the binding layer is scaffolding and may be crude, because it is
deleted at cut-over; under B it is the product surface, and every choice
below is a public API decision that outlives the port.

## PyO3 plus maturin, the route under B and C

The extension module is a `cdylib` that PyO3 exposes to the interpreter.
For a new module, `maturin init --bindings pyo3` scaffolds the crate and
the `pyproject.toml`. A minimal module:

```rust
use pyo3::prelude::*;

#[pyfunction]
fn normalize(input: &str) -> PyResult<String> {
    Ok(input.trim().to_lowercase())
}

#[pymodule]
fn fastcore(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(normalize, m)?)?;
    Ok(())
}
```

with the build fragments beside it — `Cargo.toml` declares the crate type,
`pyproject.toml` declares maturin as the build backend:

```toml
[lib]
name = "fastcore"
crate-type = ["cdylib"]

[dependencies]
pyo3 = { version = "0.23", features = ["extension-module"] }
```

```toml
[build-system]
requires = ["maturin>=1.5,<2.0"]
build-backend = "maturin"

[project]
name = "fastcore"
version = "0.1.0"
```

`maturin develop` builds the extension and installs it into the active
virtualenv under the module name, which is what makes the swap invisible to
the rest of the app: the existing `import fastcore` finds the Rust
implementation, and no call site changes beyond the import.

Classes cross the same way, because under B the package keeps its class
signatures: a `#[pyclass]` with a `#[pymethods]` block, where `__init__`
becomes `#[new]`, registered with `m.add_class::<Counter>()?` in the
module function:

```rust
#[pyclass]
struct Counter {
    value: i64,
}

#[pymethods]
impl Counter {
    #[new]
    fn new(start: i64) -> Self {
        Counter { value: start }
    }

    fn increment(&mut self) {
        self.value += 1;
    }
}
```

## Errors across the boundary

A Rust `Err` becomes a Python exception, and which exception is a parity
decision: the existing callers catch specific types, so a port that raises
a generic exception breaks `except ValueError:` blocks that the corpus
never covers. Map the error enum to exception types explicitly — the
`pyo3::exceptions` types, `PyValueError`, `PyIOError`, `PyTypeError` —
rather than accepting the default. PyO3 also catches a panic at the
boundary and turns it into a Python exception, so a panic never unwinds
into the interpreter.

## The GIL, and what it costs

Holding the GIL blocks every other Python thread, and PyO3 holds it by
default across a call. Releasing it around long computations with
`Python::allow_threads` is what makes the port faster than the code it
replaced. The inverse is a real cost: a small function that crosses the
boundary inside a tight Python loop can be slower than the Python it
replaced, because the call overhead dominates. Port the loop, not the loop
body. And the positive case is the mirror: the module worth moving is the
CPU-bound one with a clean boundary — that is where the port amortizes the
boundary cost — while I/O-bound code that `asyncio` already served well
stays in Python.

## Data crossing the boundary

`bytes` can cross zero-copy through the buffer protocol, and so can lists
and NumPy arrays; every copy that is not avoided is a conversion somewhere
in the profile. The rule: the boundary type is a design decision, not a
translation. Accepting `&[u8]` where the source accepted a list of ints
avoids a conversion nobody sees in the profile until it is the profile.

## The no-bindings route, for end state A

The seam is a process boundary the system already has: a CLI invocation, an
HTTP route, a queue consumer, or a cron entry point. The Rust binary takes
one of them at a time while Python keeps the rest, and the differential
harness runs process-to-process — same argv and stdin through both, outputs
and exit codes compared — rather than in-process. What this costs relative
to bindings: no shared memory, so the comparison is over serialized output,
and the granularity is whatever the existing boundary is, which may be
coarser than a function. What it buys: no PyO3 in the tree, no wheels to
build, no GIL to reason about, and a port that ends with one language
rather than two.

## Packaging and CI

Under B this is a deliverable: wheels per platform, the `abi3` option for
one wheel across Python versions, and matching every platform the existing
package supported — a B port that ships one wheel where the source shipped
four has not cut over. Under C it is throwaway build glue, and the only
requirement is that the differential job builds the extension rather than
testing a stale one. Under A there is nothing to package beyond the Rust
binary itself.
