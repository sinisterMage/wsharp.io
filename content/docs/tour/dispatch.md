---
title: "Multiple dispatch"
description: "A response renderer written as a set of small overloads rather than a growing switch."
weight: 10
---

An overload set is several top-level functions sharing a name. The call picks the
most specific one that applies, looking at every argument rather than only the
first. That is the whole idea, and most of what makes W# different follows from
taking it seriously enough to compile it.

{{< example "status.ws" >}}

Run it:

```sh
wsharp run examples/status.ws
```

```text
HTTP/1.1 200 OK
HTTP/1.1 404 Not Found
HTTP/1.1 418 I'm a teapot
HTTP/1.1 400 Bad Request
HTTP/1.1 500 Internal Server Error
HTTP/1.1 404 Not Found
HTTP/1.1 200 OK
HTTP/1.1 500 Internal Server Error
```

## Adding a case means adding a function

Five `render` functions, and the call site names none of them. `Forbidden403` has
no overload of its own, so it falls to `Status4xx`, and `ServiceUnavailable503`
falls all the way to `Status`.

Now suppose 503 deserves its own message. In a `switch` you would open the
existing function and insert a branch, which means touching code that already
works and that other cases depend on. Here you add:

```wsharp
fn render(r: Request, s: http.ServiceUnavailable503) str {
    return "HTTP/1.1 503 Service Unavailable";
}
```

Nothing existing is edited. The compiler checks that the new overload is
unambiguously more specific than the ones it refines, and if it is not, it says
so rather than quietly changing which code runs.

## Two of these calls are not dispatch at all

Look at the two groups in `main`. The first five calls name a status directly, so
inference knows the argument's exact type, and it knows that type has no subtypes
that could change the answer. The winner is decided during compilation and the
call lowers to an ordinary direct call. There is no dispatch code in the emitted
program at all.

`serve` is the other case. Its parameter is declared `http.Status`, so by the
time the body runs, `s` could be any status at all. This is where the compiler
emits a real runtime decision, and it is worth knowing what that costs:

```text
0   Status
1     Status1xx
3     Status2xx
8     Status3xx
12    Status4xx           ┐
13      BadRequest400     │
16      NotFound404       │  ids 12 through 20
19      Teapot418         │
20      TooManyRequests429 ┘
21    Status5xx
```

Type ids are assigned in a preorder walk of the subtype lattice, so every type's
subtypes occupy a **contiguous** range of ids. Asking "is this a `Status4xx`" is
therefore `id - 12 <= 8`, evaluated unsigned so that the underflow on a smaller
id gives a large number and fails the compare. One subtract, one unsigned
compare. No vtable, no inline cache, no method-table lookup, and no hash.

## Overloading is not only for structs

An **abstract type** stands for a set of concrete ones. `Number` is every numeric
type, `Integer` the eight integer ones and `Signed` the four signed ones, so a
general case can sit beside a specific one:

```wsharp
fn show(x: i64)     str { return "an integer"; }
fn show(x: Integer) str { return "some width of integer"; }
fn show(x: Number)  str { return "a number"; }   // catches f64
```

Abstract types are ordered by their member sets, so `Integer` is more specific
than `Number` and wins wherever both apply, and `Signed` beats both.

A body annotated `Number` has to work for *every* type it lists, which is why it
may not use a bit operator (`f64` has no bit pattern to ask for) or negate (there
are no unsigned negatives). `Integer` and `Signed` are what such bodies claim
instead, which is why `std/math`'s `abs` and `sign` are one definition over
`Signed` rather than an overload set.

A conversion inside such a body does not narrow it: `fn f(v: Integer) { .. i64(v)
.. }` stays generic over all eight widths.

An abstract type classifies values for dispatch and is never one itself. A
parameter annotated with it is a generic parameter constrained to the members,
compiled once per type it is used at, exactly as an unannotated parameter is.
Nothing is tested at run time, because a scalar's type is always known during
compilation.

## Ambiguity is a compile error

Selection is by specificity. An overload wins if it is at least as specific as
every other applicable one in every argument, and strictly more specific in at
least one. Two overloads that could both match the same call, with neither more
specific, are rejected:

```wsharp
fn pick(a: Sub,  b: Base) i64 { return 1; }
fn pick(a: Base, b: Sub)  i64 { return 2; }
// pick(Sub, Sub) matches both: error, this call to `pick` is ambiguous
fn pick(a: Sub,  b: Sub)  i64 { return 3; }   // and this settles it
```

This is the safety net that makes the "just add a function" style workable. You
cannot accidentally shadow a case or create a silent tie.

## One rule to remember

**Every parameter of an overloaded function must be annotated.** Dispatch chooses
*by* parameter type, so those types cannot themselves be inferred from the calls
being resolved. Everywhere else, annotations stay optional, which is the subject
of [the next page](/docs/tour/inference/).
