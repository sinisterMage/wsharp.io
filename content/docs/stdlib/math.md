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
| `abs(x)`, `sign(x)` | `i64` and `f64` overloads |
| `min(a, b)`, `max(a, b)` | one function over the abstract type `Number` |
| `sqrt(f64) f64`, `pow(f64, f64) f64` | |
| `floor`, `ceil`, `round`, `trunc` | `f64` |
| `ipow(base, exp) i64` | integer exponentiation |

`min` and `max` are single functions written over `Number`, so they work at every
numeric type and are compiled once per type used.

`abs` and `sign` are `i64`/`f64` **overloads** rather than one function over
`Number`, so a narrow signed value needs a conversion: `math.abs(i64(x))`. One
generic version is not available because `Number` includes the unsigned types, and
negation is meaningless there. `Integer` would not help either, for the same
reason.

## std/bits

```wsharp
const bits = @import("std/bits");
```

| | |
|---|---|
| `rotl(x, n)`, `rotr(x, n)` | rotation, generic over `Integer` |

One instruction on both targets. This is what makes ChaCha20's quarter round a
test case rather than a thing the language could not express.

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

`%` is integer-only. Cranelift has no float remainder, and a float `%` is rejected
by inference rather than emulated.

There is no `f32`.
