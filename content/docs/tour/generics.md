---
title: "Generics"
description: "Explicit type parameters on functions, structs and fn literals, all monomorphised."
weight: 60
---

Type parameters are written when they have to be named and inferred when they do
not. Either way they are monomorphised: a generic function is compiled once per
type it is used at, and a generic struct is laid out once per instantiation.

That is not an optimisation choice. It is forced by unboxing. `i64`, `f64` and
`bool` live in registers, so `fn(T) T` cannot be one function, and a `?T` field is
two slots or three depending on what `T` is, so `Box[T]` cannot be one layout.

{{< example "generics.ws" >}}

```sh
wsharp run examples/generics.ws
```

```text
42
boxed
one
1
5
3
3
7
seven
picked
1
picked
x
5
```

## The three forms

```wsharp
fn unwrap[T](b: Box[T]) T { return b.value; }     // on a function
const Box = struct[T] { value: T };               // on a struct
const first = fn [T](a: []T) T { return a[0]; };  // on a fn literal
```

A struct literal's type arguments come from its field values, so
`Box{ .value = 42 }` is a `Box[i64]` without being told. An annotation reaches the
literal's fields too, which is why `Pair[?i64, str]` accepts `.first = 5`: the `5`
coerces into `?i64` exactly as it would in any other annotated binding.

## A const bound to a fn literal is a definition

This is the subtle one, and the example leans on it twice:

```wsharp
const first = fn [T](a: []T) T { return a[0]; };
print_int(first([]i64{ 7, 8 }));
print(first([]str{ "seven", "eight" }));
```

`first` generalises exactly as a top-level declaration does, so those two calls
get two specialised copies. It has to work this way: a closure *value* is one code
pointer, and these two uses need two different ones.

The same holds without written parameters, and such a literal may still capture.
The captured value is shared by every instantiation, because its type belongs to
the enclosing frame rather than to the literal.

What a *constraint* still owns stays monomorphic, again exactly as for a
declaration. `const add = fn (a, b) { return a + b; };` is `fn(i64, i64) i64` for
the same reason `fn add(a, b)` is: `+` is solved with the binding group.

## Recursion

`count` calls itself. The inner call records no type arguments while its binding
group is being inferred, and inference fills in the group's own variables once it
has generalised. Mutual recursion works for the same reason, and so does an
overload set, whose members all land in one group and generalise together.

## Abstract types are generics with a constraint

`Number` and `Integer` are covered on [the dispatch page](/docs/tour/dispatch/),
but they belong here too. A parameter annotated with an abstract type is a generic
parameter constrained to that type's members, compiled once per type it is used
at. Nothing is tested at run time, because a scalar's type is always known during
compilation. The only difference from an unannotated parameter is that the set of
types it will accept is written down and checked.
