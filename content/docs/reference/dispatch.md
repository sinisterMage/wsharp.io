---
title: "Dispatch rules"
description: "How an overload is selected, when it is decided, and what an ambiguity costs."
weight: 30
---

An overload set is several **top-level** functions sharing a name.

## Every parameter must be annotated

Dispatch chooses *by* parameter type, so the types of an overloaded function's
parameters cannot themselves be inferred from the calls being resolved. Annotate
all of them.

This is the only place in the language where an annotation is required.

## Selection is by specificity

An overload is **applicable** to a call if every argument's type is the parameter
type or a subtype of it.

Among the applicable ones, an overload **wins** if it is at least as specific as
every other applicable overload in every argument, and strictly more specific in
at least one.

Specificity is the subtype lattice for struct types, and the member-set ordering
for abstract types, so `Integer` beats `Number` and `NotFound404` beats
`Status4xx` beats `Status`.

## Ambiguity is a compile error

```wsharp
fn pick(a: Sub,  b: Base) i64 { return 1; }
fn pick(a: Base, b: Sub)  i64 { return 2; }
```

`pick(Sub, Sub)` matches both, and neither is more specific, so the call is
rejected: `error: this call to pick is ambiguous`. Adding
`fn pick(a: Sub, b: Sub) i64` settles it.

The error is at the **call**, not at the declaration, because two overloads that
could tie are only a problem if something actually asks.

## When it is decided

**At compile time** when inference pins every argument to a type whose subtypes
cannot change the answer. The call lowers to an ordinary direct call, and there is
no dispatch code in the emitted program at all.

**At run time** otherwise. The compiler emits a decision chain over the runtime
type id, read out of the object's header.

Type ids are assigned in a **preorder walk of the subtype lattice**, so every
type's subtypes occupy a contiguous range. Testing membership of that range is one
subtract and one unsigned compare: the subtract underflows for an id below the
range, giving a large unsigned value that fails the compare. No vtable, no inline
cache, no method-table lookup, no hash.

A call that reaches the end of the chain with nothing matching panics with
`W# panic: no matching overload`.

## Abstract types are not run-time tests

A parameter annotated `Number` or `Integer` is a generic parameter constrained to
that type's members. It is compiled once per type it is used at, and nothing is
tested at run time, because a scalar's type is always known during compilation.

## An overload set as a value

```wsharp
const g: fn(i64) i64 = f;   // picks the member with that signature
const g = f;                // an alias that dispatches just as f does
```

An overload set renamed through a module re-export is the same set rather than a
copy, so every member still dispatches.

## Where the set lives

An overload set lands in one strongly connected component of the call graph
during inference, so its members generalise together. That is why the members can
call each other.

The 27 HTTP status types are the standard library's instance of all of this. They
come from a table in the compiler, are materialised on first mention, and a
program that never names one pays nothing for them.
