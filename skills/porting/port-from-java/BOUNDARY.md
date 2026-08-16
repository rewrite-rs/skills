Under end state A there is no binding layer — only the process-seam
section applies. Under C, JNI carries the migration and is deleted at
cut-over. Under B, the JNI surface is the product and every signature is
public API. The end-state decision is `/port-to-rust`.

## The process seam, which is the default for Java

Put the Rust binary behind a boundary the system already has — one HTTP
or gRPC endpoint, one queue consumer, one batch job — with both
implementations reachable and traffic mirrored or split. The differential
harness runs request-to-request. Why this is the default: it costs no
JNI, it keeps the JVM crash surface at zero, and JVM systems almost
always already have such a boundary.

## JNI, and what it costs

The `jni` crate, `#[no_mangle] extern "system"` entry points, and the
mechanics of attaching a native thread to the JVM. The costs, plainly:
every object crossing is a JNI call, local references leak if not
managed, a Rust panic crossing into the JVM is undefined behaviour and
must be caught at the boundary with `catch_unwind`, and a mistake here
aborts the JVM rather than raising an exception. The `unsafe` involved is
`/unsafe-rust`; whether the boundary earns its keep is a `/port-to-rust`
strategy question.

```rust,ignore
#[no_mangle]
pub extern "system" fn Java_com_example_Engine_normalize(
    mut env: JNIEnv,
    _class: JClass,
    input: JString,
) -> jstring {
    // Catch panics here: a panic unwinding into the JVM is undefined behaviour.
    ...
}
```

The Foreign Function and Memory API is the modern alternative on recent
JDKs: it moves the unsafety to the Java side and requires a JDK floor the
project may not have.

## Errors across the boundary

A Rust `Err` becomes a thrown Java exception, and which exception
matters: the existing `catch (SomeSpecificException e)` blocks are the
contract. Map the error enum to the exception classes callers already
catch, and never let a Rust panic be the mechanism.

## Data crossing the boundary

Strings re-encode between UTF-16 and UTF-8 at every crossing; byte arrays
can be borrowed with care; and a chatty interface across JNI is slower
than the Java it replaced. Port the loop, not the loop body.

## Packaging and CI

Under B the native library ships per platform and classifier, matching
every platform the JAR supported, with the loading strategy — bundled in
the JAR and extracted, or installed separately — decided rather than
discovered. Under C it is throwaway build glue. Under A there is nothing
beyond the Rust binary. In all three, the differential job builds both
sides fresh.
