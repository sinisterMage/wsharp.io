---
title: "Generics"
description: "Written or inferred, always monomorphised."
weight: 50
---

## The three forms

```wsharp
fn first[T](a: []T) T { return a[0]; }              // a function
const Box = struct[T] { value: T };                 // a struct
const pick = fn [T](a: []T) T { return a[0]; };     // a fn literal
```

Type parameters are written when they have to be named and inferred when they do
not, so `fn id(x) { return x; }` is `fn(T) T` without the brackets.

## Everything is monomorphised

A generic function is compiled once per type it is used at. A generic struct is
laid out once per instantiation. Unreachable instantiations are never emitted.

This is forced rather than chosen. Values are unboxed, so `i64`, `f64` and `bool`
live in registers and `fn(T) T` cannot be one function; and a `?T` field is two
slots or three depending on `T`, so `Box[T]` cannot be one layout.

Inference records the type arguments at each call site, and a worklist pass emits
the copies.

## Instantiating a struct

A struct literal's type arguments come from its field values:

```wsharp
const b = Box{ .value = 42 };            // Box[i64]
const s = Box{ .value = "boxed" };       // Box[str]
```

An annotation reaches the literal's fields, so the ordinary coercions apply
inside it:

```wsharp
const maybe: Pair[?i64, str] = Pair{ .first = 5, .second = "five" };
```

`5` coerces into `?i64` exactly as it would in any other annotated binding.

## A const bound to a fn literal generalises

```wsharp
const first = fn [T](a: []T) T { return a[0]; };
print_int(first([]i64{ 7, 8 }));
print(first([]str{ "seven", "eight" }));
```

A `const` bound to a `fn` literal is a **definition**, not a value, so it
generalises exactly as a declaration does and those two calls get two copies. It
has to: a closure value is one code pointer, and these two uses need two.

The same holds without written parameters, and such a literal may capture. The
captured value is shared by every instantiation, because its type belongs to the
enclosing frame rather than to the literal.

What a constraint still owns stays monomorphic:

```wsharp
const add = fn (a, b) { return a + b; };    // fn(i64, i64) i64
```

for the same reason `fn add(a, b)` is: `+` is solved with the binding group.

## Recursion

A generic function may call itself. The inner call records no type arguments while
its binding group is being inferred, and inference fills in the group's own
variables once it has generalised. Mutual recursion works for the same reason.

## Abstract types are constrained generics

A parameter annotated `Number`, `Integer` or `Signed` is a generic parameter
restricted to that type's members, compiled once per type it is used at. Nothing
is tested at run time. The difference from an unannotated parameter is that the
accepted set is written down and checked, and that the parameter can then take
part in [dispatch](/docs/reference/dispatch/).

A conversion inside such a body does not narrow it. `fn f(v: Integer) { .. i64(v)
.. }` stays generic over all eight, and is compiled once for each width a caller
uses.

## When inference needs help

`var b = array.new(32);` says how many elements but not of what, and there is
nothing else in the program to say. The error is
`cannot tell what type main is being used at`. Pin it with an annotation or a use.

`wsharp check` reports it too. `check` goes as far as monomorphisation, which is
exactly where the question is asked, so it accepts what `run` accepts.
