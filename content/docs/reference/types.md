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

An index outside the array panics. **Any integer type indexes**, because an index
is an `i64` at the machine level and the widening is emitted where it is used.
Conversions between numeric types are written and never inferred, and this is not
that: an index is not a value the program keeps, it is an argument to one
operation whose type is fixed. A `u64` past `i64`'s range arrives negative and is
caught anyway, because the bounds check is one *unsigned* compare.

`g[i][j] = v` works. The base of a place is evaluated once into a hidden local, so
a compound assignment can read the place and write it back without the base
appearing twice.

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

The supertype is a **type expression**, as every other type position is, so
`struct Sub : pkg.Base` and `struct Sub : inner.Base` both work. Aliasing runs
first, so a facade's name for a type reaches the same type as the original, and
the two produce siblings rather than two separate lattices.

## Struct equality

`==` on a struct compares it **field by field**, each field by its own type's
rule, so a struct field recurses and an `f64` field makes a `NaN` unequal to
itself.

Two values of different concrete types are never equal. That is what makes two
subtypes compared through their supertype compare the fields they actually have
rather than only the part the supertype declares, and it is also why `x == x` is
true whatever `x` holds: the same object is tested for first.

Every field has to be comparable in its own right: an integer type, `f64`, `bool`,
`str`, an error, an optional of one of those, or a struct whose own fields are all
of those. An **array**, a **function** or an **error union** field makes the whole
struct uncomparable, and the compiler says which field.

That reaches down the lattice, because a comparison written at a supertype has to
work on every subtype it will be handed: a subtype with a field `==` cannot
compare makes the *supertype* uncomparable too, and the diagnostic says which
subtype and which field.

A value that reaches itself recurses for ever, as derived equality does everywhere
it exists, and that is [on the list](/docs/limitations/).

The comparison is compiled into a *function* per concrete type rather than an
inline sequence, because a type that reaches itself would otherwise expand for
ever during compilation.

## Abstract types

Three, and they exist to be written in a parameter position:

| | |
|---|---|
| `Number` | every numeric type: `i8` through `u64`, and `f64` |
| `Integer` | the eight integer ones |
| `Signed` | the four signed integers |

```wsharp
fn show(x: Integer) str { ... }
```

They are ordered by their member sets, so `Integer` is more specific than
`Number` and wins wherever both apply. An abstract type is never the type of a
value: a parameter annotated with one is a generic parameter constrained to the
members, compiled once per type it is used at, with nothing tested at run time.

A body annotated `Number` has to work for every type it lists, so it may not use
a bit operator (`f64` has no bit pattern to ask for) or negate (no unsigned
negatives). `Integer` and `Signed` are what such bodies claim instead, which is
why `std/math`'s `abs` and `sign` are one definition over `Signed`.

## What coerces into what

Three coercions, and no others:

- a `T` into a `?T`
- a `T` into a `!T`
- a subtype into its supertype

All three are free. `return n;` is legal in a function declared `!i64` for the
first two reasons, and passing a `Finished` where an `Event` is wanted works for
the third.

**They compose.** A coercion is a sequence of steps and the wrapping step
recurses, so `Sub` reaches `!Base` by widening and then wrapping, and `T` reaches
`!?T` by wrapping twice. That is what makes `!?T` a type worth writing: a value,
nothing, or a failure, in one return.

`!?T` is three machine words, over the two x86-64 hands back, so a return that
wide goes through a pointer the caller provides. It is an ordinary parameter
placed after the environment, not Cranelift's `StructReturn`, because W# owns both
sides of every call.

Numeric conversions are not coercions. They are written.

## What a value costs

A value is a list of machine values rather than one. Scalars and pointers take one
slot; `?T` and `!T` are a tag followed by the payload. Generics are monomorphised,
so `fn(T) T` becomes one copy per instantiation and the unreachable ones are never
emitted.
