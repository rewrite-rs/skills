A row in this table is a starting point, not a rewrite rule: the third
column names the decision the row hides, and the decision is made per site,
with the source in front of you. The C corollary sharpens that — nearly every
row hides a decision C never wrote down, so the mapping is a set of questions
rather than a translation table.

| C | Rust | The decision |
|---|---|---|
| `T*` (owning) | `Box<T>` | Who frees it, which the header did not say |
| `T*` (borrowing) | `&T` / `&mut T` | How long it stays valid |
| `T*` (nullable) | `Option<&T>` / `Option<Box<T>>` | Whether null is a real case or an invariant violation |
| `T*` + `size_t len` | `&[T]` / `&mut [T]` | Whether the length was in elements or bytes |
| `char*` | `&CStr` / `CString` / `&str` / `&[u8]` | Encoding and NUL termination |
| `void*` | A generic, an enum, or `*mut c_void` | The set of types that actually reach the site |
| Fixed array `T[N]` | `[T; N]` | Whether it decays anywhere |
| `malloc` / `free` | `Box`, `Vec`, or an allocator API | Whether the allocation was for one value or many |
| `realloc` | `Vec` growth | Whether pointers into the buffer were held across it |
| `memcpy` between structs | Assignment / `Clone` | Whether the types were really compatible |
| `struct` | `struct` | `#[repr(C)]` only if it crosses the boundary |
| Bitfields | `bitflags`, or explicit masking | `#[repr(C)]` does not reproduce bitfield layout |
| `union` | `enum` with data | Tag plus union is an enum — the big row |
| Bare `union` (no tag) | `union` (unsafe) or an enum | Whether the reader can know the active arm |
| `enum` | `enum` | C enums accept out-of-range values; the port narrows, and that is recorded |
| `typedef` | Type alias or newtype | Whether the alias carried meaning — `/type-driven-design` |
| Function pointer | `fn` pointer / `Box<dyn Fn>` | Whether a context pointer travelled alongside |
| Callback + `void* user_data` | A closure or a trait object | The lifetime of the captured data |
| `int` return code | `Result<(), E>` | The code-to-variant mapping |
| Out-parameter | The return value | Whether it was written on the error path too |
| `errno` | Error enum variants | Which codes callers actually branch on |
| `goto cleanup` | `?` + `Drop` | Whether the cleanup order mattered |
| `static` file-scope variable | `OnceLock` / a context struct | Whether the state was per-process or per-caller |
| `extern` global | A field, or a `OnceLock` | Same |
| `#define` constant | `const` | Type, which the macro did not have |
| Function-like `#define` | `fn` / `const fn` | Whether it was called with side-effecting arguments |
| Code-generating macro | `macro_rules!` / build script | Whether the generated code is still needed |
| `#ifdef` | `#[cfg(...)]` / features | Which combinations are actually built |
| `#include` | Modules and `use` | What was really public |
| `size_t` | `usize` | Nothing hidden |
| `int` / `long` | `i32` / `i64` | Platform width, and that C signed overflow is undefined while Rust is defined-or-panicking |
| Unsigned wraparound | `wrapping_*` | Whether the wrap was intentional |
| Implicit conversion / promotion | Explicit `as` or `TryFrom` | Every truncation the source never showed |
| `volatile` | `read_volatile` / `write_volatile` | Whether it was memory-mapped IO or a threading mistake |
| `pthread` | `std::thread` | Nothing hidden |
| `pthread_mutex` | `Mutex<T>` | Rust guards data, so fields move inside |
| `atomic` builtins | `std::sync::atomic` | Memory ordering, which both expose |
| `setjmp` / `longjmp` | No mapping | The control flow is redesigned |
| Signal handler | `signal_hook` and a channel | Async-signal safety, which the C handler may have violated |
| `FILE*` / `open` | `std::fs` / `std::io` | Buffering behaviour, if observable |

## The rows that are traps rather than mappings

- A pointer whose ownership genuinely varies at runtime — the C API is the
  bug; the port fixes it at the boundary and records the change.
- Any struct whose layout is relied on by another language or by serialized
  data — `#[repr(C)]` is mandatory, and a test must pin the layout.
- Anything that was undefined behaviour in C — no mapping; a contract
  decision, recorded.
