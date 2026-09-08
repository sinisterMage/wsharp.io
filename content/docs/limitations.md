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

## A supertype is a name, not a path

`struct Sub : Base` resolves `Base` unqualified, so a subtype of a type another
module declares, including one a package facade re-exports, has to be declared in
that module. Every other position takes `pkg.Base`; the declaration's parent field
would have to become a full type expression for this one to.

## Field access needs a known type

Structs are nominal with no row polymorphism, so `fn getx(p) { return p.x; }`
cannot be inferred and asks for an annotation instead.

## == is limited

It works on the integer types, `f64`, `bool` and `str`. Structs still need a
decision about identity versus structural equality.

## An integer literal is never an f64

A literal takes the integer type it is used at, but not a float one, so `1.0` must
be written where an `f64` is wanted. The diagnostic says so in those words rather
than reporting a bare mismatch.

## % is integer-only

Cranelift has no float remainder, and a float `%` is rejected by inference rather
than emulated.

## math.abs and math.sign are overloads

They are `i64` and `f64` overloads, so a narrow signed value needs a conversion.
One version generic over `Number` is not available, because that abstract type
includes the unsigned types and negation is meaningless there.

## An array index is an i64

Every literal index works without saying so, and `i64(i)` covers the rest.

## x86-64 and aarch64 only

The collector reads the frame pointer with inline assembly. Other architectures
get a `compile_error!`.

## g[i][j] = v is rejected

The base of a place must be a variable or a field chain. A compound assignment
evaluates its target twice, and restricting the base is what keeps that
unobservable.

`var row = g[i]; row[j] = v;` is the spelling, and it is correct rather than
merely accepted, since an array is a reference. This was found while writing
AES, where it cost nothing: the state is a flat sixteen-byte buffer, which is how
AES is written anyway.

## check accepts a program run rejects

When a generic call's type variable is never pinned. `var b = array.new(32);` with
nothing to say what the elements are passes `wsharp check` and fails `wsharp run`
with `cannot tell what type main is being used at`, because `check` does not
monomorphise. The diagnostic is right; which command reports it is not.

## A top-level const array can be written through an alias

`K[0] = 1` is rejected and `var a = K; a[0] = 1;` is not: the second is a local
holding the same address, and W# has no way to say that a reference is read-only.
The data is emitted writable for that reason, so the mistake is a shared table
quietly changing rather than a fault with no message.

## No Windows release

The compiler builds and links on Windows, but `fs.mkdir_all` reports success
without creating the last component of a path, so `ingot install` fails for any
package with a `src/` directory. Shipping that would be shipping a toolchain whose
package manager does not work.

## No P-521 chain

TLS works against RSA, P-256 and P-384 chains. A chain through a P-521 key does
not verify. There is one such root in a typical store.

---

The full development log, with what was built and why it was built that way, is in
[ROADMAP.md]({{< param repo >}}/blob/main/ROADMAP.md).
