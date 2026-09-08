---
title: "Types"
description: "What a value costs, what coerces into what, and what a type is made of."
weight: 20
---

## Scalars

| | |
|---|---|
| `i8` `i16` `i32` `i64` | signed integers |
| `u8` `u16` `u32` `u64` | unsigned integers |
| `f64` | double-precision float; there is no `f32` |
| `bool` | |
| `void` | the type of a function that returns nothing |

A `u8` is a byte and `[]u8` is a byte array. Nothing is boxed and nothing is
tagged: a scalar is one machine value in a register.

There is no implicit conversion between any two of these. `u32(x)` converts.

## str

`str` is an immutable string. `==` compares contents, so a string built at run
time equals a literal.

A `str` is a heap object with its length in the header and its bytes inline, which
is the same shape an array has. `std/str` operates on it and `std/bytes` bridges
to and from `[]u8`.

## Arrays

`[]T` is a fixed-length array. Its count lives in the object header, and there is
no capacity beside it, so every `std/array` operation returns a new array.

```wsharp
const xs = []i64{ 3, 1, 4 };
xs[0]                        // a value, and a place: xs[0] += 1 works
for (xs) |x, i| { }
```

An index outside the array panics. An array index is an `i64`; every literal index
works without saying so, and `i64(i)` covers the rest.

`g[i][j] = v` is rejected, because the base of a place must be a variable or a
field chain. Write `var row = g[i]; row[j] = v;`, which is correct rather than
merely accepted, since an array is a reference.

For a growable sequence, use [`std/list`](/docs/stdlib/collections/).

## Optionals

`?T` is a `T` or `null`. It is a tag and a payload in registers: no boxing, no
allocation.

```wsharp
a orelse b         // the payload, or b
a.?                // the payload, or a panic
if (a) |v| { }     // binds the payload when present
while (a) |v| { }  // the same, as a loop
```

## Error unions

`!T` is a `T` or an error, and the type records **which** errors. See
[errors](/docs/reference/errors/).

## Functions

`fn(A) B` is a function value. A closure and a top-level `fn` have the same type
and are passed the same way, because every function takes an environment pointer
and top-level ones ignore it.

An overload set can be named. `const g: fn(i64) i64 = f;` picks the member with
that signature and gives you an ordinary function value. `const g = f;` binds an
alias that dispatches just as `f` does.

## Structs

Nominal, with fields in declaration order:

```wsharp
const Point = struct { x: i64, y: i64 };
const p = Point{ .x = 1, .y = 2 };
```

A struct with no fields is also a value: its sole instance.

A struct may declare a supertype, and **a subtype's fields are its supertype's,
first**:

```wsharp
const Sub = struct : Base { extra: i64 };
```

so a subtype widens into its supertype with no conversion emitted, and a field
read compiled against the supertype runs unchanged on any subtype.

The supertype is resolved as a bare name rather than a path, so a subtype of
another module's type has to be declared in that module. That is
[a limitation](/docs/limitations/).

## Abstract types

`Number` stands for every numeric type. `Integer` stands for the eight integer
ones. They exist to be written in a parameter position:

```wsharp
fn show(x: Integer) str { ... }
```

They are ordered by their member sets, so `Integer` is more specific than
`Number`. An abstract type is never the type of a value: a parameter annotated
with one is a generic parameter constrained to the members, compiled once per type
it is used at, with nothing tested at run time.

A body annotated `Number` has to work for every type it lists, so it may not use
`%` or negate.

## What coerces into what

Three coercions, and no others:

- a `T` into a `?T`
- a `T` into a `!T`
- a subtype into its supertype

All three are free. `return n;` is legal in a function declared `!i64` for the
first two reasons, and passing a `Finished` where an `Event` is wanted works for
the third.

Numeric conversions are not coercions. They are written.

## What a value costs

A value is a list of machine values rather than one. Scalars and pointers take one
slot; `?T` and `!T` are a tag followed by the payload. Generics are monomorphised,
so `fn(T) T` becomes one copy per instantiation and the unreachable ones are never
emitted.
