---
title: "Structs and closures"
description: "Nominal records, implicit widening to a supertype, and functions as values."
weight: 40
---

{{< example "shapes.ws" >}}

```sh
wsharp run examples/shapes.ws
```

```text
40
12
60
160
200
```

## Declaring and building

A struct type is a `const` bound to a `struct` expression, and an instance names
the type and its fields:

```wsharp
const Point = struct { x: i64, y: i64 };
const p = Point{ .x = 2, .y = 3 };
print_int(p.x);
```

Fields are mutable through a `var` binding, and `r.width += 5` writes through the
field. A `const` binding does not allow it.

Field types can be inferred from the literal, so `Box{ .value = 42 }` fixes a
generic `Box[T]` to `Box[i64]` without you saying so. That is
[generics](/docs/tour/generics/).

## Subtyping is one pointer

A struct may declare a supertype:

```wsharp
const Event    = struct { at: i64 };
const Finished = struct : Event { count: i64 };
```

A `Finished` widens implicitly wherever an `Event` is wanted. No conversion is
emitted, because **a subtype's fields are its supertype's, first**: `Finished` is
laid out as a byte-identical copy of `Event` followed by `count`. A field read
compiled against `Event` runs unchanged on any subtype, with no adjustment and no
vtable.

This is also what makes dispatch cheap, and the two features are the same
feature: the lattice that widening walks is the lattice type ids are assigned
over.

A supertype is an ordinary type expression, so `struct : pkg.Base` and
`struct : inner.Base` work as well as a bare name. Aliasing runs first, which
means a facade's name for a type reaches the same type as the original and the two
produce siblings rather than two separate lattices.

A struct with no fields is also a value: its sole instance. That is how the HTTP
status types work, and it is why `http.NotFound404` can be passed as an argument
as well as written as a type.

## Closures

`fn (a, b) { ... }` is an expression. It captures by value, generalises like a
declaration, and can be passed anywhere a `fn(A) B` is wanted:

```wsharp
const margin = 100;
const pad = fn (n) { return n + margin; };
print_int(twice(pad, 0));
```

`twice` takes `f: fn(i64) i64` and calls it. A plain top-level `fn` can be passed
the same way, because **every function takes an environment pointer** and
top-level ones ignore it and are called with null. That uniformity means passing
a `fn` as a value needs no wrapper to be generated.

A closure may also name itself, which is how a recursive local function is
written.

Struct instances and closures are both heap objects with the same 16-byte header,
allocated through the same entry point. That is what lets the collector trace a
closure's captures exactly as it traces a struct's fields.

## Comparing two structs

`==` compares a struct **field by field**, each field by its own type's rule, so a
struct field recurses and an `f64` field makes a `NaN` unequal to itself.

Two values of different concrete types are never equal. That answers the awkward
half of "identity or structure" without the surprising part: `x == x` is true
whatever `x` holds, because the same object is tested for first, and two subtypes
held at their supertype compare the fields they actually have rather than only the
part the supertype declares.

```wsharp
const a = Finished{ .at = 1, .count = 5 };
const b = Finished{ .at = 1, .count = 5 };
print_bool(a == b);              // true
```

An optional field compares, so an absent one differs from a present one and two
absent ones agree. An **array**, a **function** or an **error union** field does
not, and makes the whole struct uncomparable at compile time, with the compiler
saying which field. That reaches down the lattice too: a subtype with such a field
makes its supertype uncomparable, because a comparison written at the supertype is
what will be handed the subtype.

A value that reaches itself recurses for ever, as derived equality does everywhere
it exists, and that is [on the list](/docs/limitations/).

Under the hood this is a *function* per concrete type rather than an inline
sequence, because a type that reaches itself would otherwise expand for ever
during compilation: a dispatching entry point that answers identity, nulls and
unequal type ids and then picks within the declared type's subtree, and an exact
comparison per type. The field reads go through the same load barrier and the same
rooting as every other field read, because they are built as W# would build them.
