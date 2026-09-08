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

{{< note title="A supertype is a name, not a path" >}}
`struct : Base` resolves `Base` unqualified, so a subtype of a type another
module declares has to be declared in that module. Every other position accepts
`pkg.Base`. This one is
[a known limitation](/docs/limitations/) rather than a design decision.
{{< /note >}}

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

## What is missing

`==` works on the integer types, `f64`, `bool` and `str`, and not on structs.
Whether two structs are equal when their fields are, or only when they are the
same object, is a decision that has not been made yet rather than one that has
been made against you.
