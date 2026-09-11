---
title: "Numbers and time"
description: "std/math, std/bits and std/time."
weight: 30
---

## std/math

```wsharp
const math = @import("std/math");
```

| | |
|---|---|
| `abs(x)`, `sign(x)` | one definition over `Signed`, plus an `f64` overload |
| `min(a, b)`, `max(a, b)` | one function over the abstract type `Number` |
| `rem(a, b) f64` | what `%` on `f64` compiles to, and a name for it as well |
| `sqrt(f64) f64`, `pow(f64, f64) f64` | |
| `floor`, `ceil`, `round`, `trunc` | `f64` |
| `ipow(base, exp) i64` | integer exponentiation |

`min` and `max` are single functions written over `Number`, so they work at every
numeric type and are compiled once per type used.

`abs` and `sign` are one definition each over **`Signed`**, the four signed
integers, so a narrow signed value needs no conversion. `Number` would not do: it
includes the unsigned types, and negation is meaningless there. `f64` keeps an
overload of its own, disjoint from the generic one, so there is nothing for the
dispatcher to call ambiguous.

## std/bits

```wsharp
const bits = @import("std/bits");
```

| | |
|---|---|
| `rotl(x, n)`, `rotr(x, n)` | rotation, generic over `Integer` |
| `f64_bits(f64) u64`, `f64_from_bits(u64) f64` | an `f64`'s representation |

The rotations are one instruction on both targets. This is what makes ChaCha20's
quarter round a test case rather than a thing the language could not express.

`f64_bits` is not `u64(x)`. A conversion converts a *value* and rounds to say so;
these two answer what the value is made of, which is the only question an
IEEE-754 codec can use, because a wire format carries the eight bytes and not the
number. Two `bitcast`s, and they replaced ninety lines of exact arithmetic in the
first program that needed them.

The bitwise operators themselves are in the language: `&` `|` `^` `<<` `>>` `~`,
on integers only. See [syntax](/docs/reference/syntax/).

## std/time

```wsharp
const time = @import("std/time");
```

| | |
|---|---|
| `now() i64` | seconds since the Unix epoch |

That is the whole module. There is no calendar, no formatting and no monotonic
clock yet.

## Integer behaviour worth remembering

`+`, `-` and `*` **wrap**. For an unsigned type that is the definition rather than
a concession, and for a signed one it is the choice that was made.

`/` and `%` panic on a zero divisor, and signed `MIN / -1` panics too.

`%` works on `f64` as well. Cranelift has no float remainder, so it is a call to
the runtime, which is the shape `str ==` already had. Not the obvious inline form,
`l - trunc(l / r) * r`: `l / r` rounds, so a large quotient loses the low bits the
answer is made of. `10000000000000000.0 % 3.0` is `1.0`, and the inline form says
`0.0`.

There is no `f32`.
