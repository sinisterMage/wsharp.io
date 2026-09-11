---
title: "Limitations"
description: "What does not work yet, and the reason each one was left."
weight: 90
---

These are deliberate limitations rather than bugs. Each has a clear fix, and the
reason it has not been taken is written down.

## Computed top-level const

Only literals and `fn` values are allowed at the top level. Anything computed is
rejected with a message saying so. Supporting the general case needs global
storage plus a startup initialiser, and the collector would need those globals as
roots.

## Field access needs a known type

Structs are nominal with no row polymorphism, so `fn getx(p) { return p.x; }`
cannot be inferred and asks for an annotation instead.

## A struct that reaches itself cannot be compared

`==` on a struct compares field by field and a struct field recurses, so a value
that reaches itself recurses for ever. That is what derived equality does
everywhere it exists, and it is said out loud rather than guarded against.

A field the comparison cannot reach at all is caught at compile time instead: an
array, a function or an error union field makes the struct uncomparable, and the
diagnostic says which field. That reaches down the lattice, so a subtype with such
a field makes its supertype uncomparable too.

## x86-64 and aarch64 only

The collector reads the frame pointer with inline assembly. Other architectures
get a `compile_error!`.

## A top-level const array can be written through an alias

`K[0] = 1` is rejected and `var a = K; a[0] = 1;` is not: the second is a local
holding the same address, and W# has no way to say that a reference is read-only.
The data is emitted writable for that reason, so the mistake is a shared table
quietly changing rather than a fault with no message.

## shutdown does not stop an acceptor everywhere

`net.shutdown(s, read, write)` means the same thing on every system on a
**connected** socket. On a `Listener` it does not: Linux wakes a thread parked in
`accept`, and the BSDs answer `ENOTCONN` and leave it parked, so it is not
promised there and the library does not claim it.

An acceptor that has to be stoppable is a `net.poller` with a tick. `@join` on a
worker parked in `accept` waits for ever, which is a program waiting on its own
worker rather than anything the exit path can answer for. A worker whose `init`
never returns is abandoned at exit instead, and `main` returning is what ends the
process.

## No P-521 chain

TLS works against RSA, P-256 and P-384 chains. A chain through a P-521 key does
not verify. There is one such root in a typical store.

## Closed since 0.1.1

Ten entries stood on this page at `0.1.1` and do not now. They are kept as one
line each, so that a reader who remembers the limitation finds out where it went.

| Was | Is |
|---|---|
| A supertype is a name, not a path | a parent is a type expression, so `struct Sub : pkg.Base` resolves as every other type position does |
| `==` works on scalars and `str`, not on structs | it compares a struct field by field, each field by its own type's rule, recursing into struct fields |
| An integer literal is never an `f64` | it is, when the `f64` holds the value exactly |
| `%` is integer-only | `f64` has one, through a call, because Cranelift still has no instruction for it |
| `math.abs` and `math.sign` are overloads | one definition over `Signed`, the four signed integers, beside the `f64` one |
| An array index is an `i64` | any integer type indexes |
| `g[i][j] = v` is rejected | the base is evaluated once into a hidden local, which is what the restriction was standing in for |
| `wsharp check` accepts a program `run` rejects | `check` monomorphises, so it accepts exactly what `run` accepts |
| A facade cannot present one name from two files | two re-exports of one name merge into one overload set |
| No Windows release | the fault was the collector's root walk rather than `fs.mkdir_all`, and Windows is the fourth release target |

Eight of them closed in `0.1.2`, `==` in `0.1.5`, and Windows in `0.1.4`.
[Status](/docs/status/) has the releases in order.

---

The full development log, with what was built and why it was built that way, is in
[ROADMAP.md]({{< param repo >}}/blob/main/ROADMAP.md).
