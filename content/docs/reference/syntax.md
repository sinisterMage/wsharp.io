---
title: "Syntax"
description: "Bindings, control flow, literals, operators, and the whole surface on one page."
weight: 10
---

## The whole surface

| | |
|---|---|
| Bindings | `const x = 1;` immutable, `var y: i64 = 2;` mutable |
| Types | `i8` `i16` `i32` `i64` `u8` `u16` `u32` `u64` `f64` `bool` `void` `str`, `[]T` array, `?T` optional, `!T` error union, `fn(A) B` |
| Functions | `fn add(a, b) { return a + b; }`, `fn add(a: i64, b: i64) i64 { ... }` |
| Overloads | several `fn`s may share a name; the call picks the most specific |
| Abstract types | `Number` stands for every numeric type, `Integer` for the eight integer ones, `Signed` for the four signed ones |
| Control flow | `if (c) { } else { }`, `while (c) : (i += 1) { }`, `for (xs) \|x\| { }`, `break`, `continue` |
| Expressions | `if (c) a else b`, and `fn (a, b) { ... }` closures |
| Closures | `const id = fn (x) { return x; };` generalises, may name itself; `fn [T](a: []T) T` writes the parameters out |
| Literals | `42`, `0xff`, `0b1010`, `0o17`, `1_000_000`, `2.5`, `"text"` with `\n \t \r \0 \\ \"`; an integer literal takes the type it is used at, including `f64` where the value is exact |
| Arrays | `[]i64{ 1, 2, 3 }`, `a[i]` at any integer type, `g[i][j] = v`, `for (a) \|v, i\| { }`; an index out of range panics |
| Structs | `const P = struct { x: i64 };`, `P{ .x = 1 }`, `p.x` |
| Subtyping | `const Sub = struct : Base { };`, or `struct : pkg.Base`; a subtype widens implicitly |
| Singletons | a struct with no fields is also a value: its sole instance |
| Generics | `fn first[T](a: []T) T`, `const Box = struct[T] { value: T };`, `fn [T](x: T) T` |
| Optionals | `null`, `a orelse b`, `a.?`, `if (a) \|v\| { }`, `while (a) \|v\| { }` |
| Errors | `error.Name`, `try f()`, `f() catch 0`, `f() catch \|e\| ...`, `f() catch return e`, `f() catch return false` |
| Error sets | `!i64` infers which errors; `!{NotFound, IoFailed}str` writes them down and is checked |
| Modules | `const http = @import("std/http");`, then `http.NotFound404`; `pub` is what another module may name, and `pub const parse = inner.parse;` renames one |
| Workers | `@spawn(counter, 0)` starts a thread with a heap of its own, `w.add(5)` calls into it, `@join(w)` waits |
| Operators | `+ - * / %`, `& \| ^ << >> ~` (integers only), `== != < <= > >=` (non-chaining), `and or !`; `u32(x)` converts |

## Bindings

```wsharp
const x = 1;          // immutable
var y: i64 = 2;       // mutable
y += 1;
```

A `const` binds a value that cannot be reassigned. It does not make what the value
points at read-only: `var a = K; a[0] = 1;` writes through to a top-level `const`
array, which is [a known limitation](/docs/limitations/).

At the top level, only literals and `fn` values may be bound. Anything computed is
rejected with a message saying so.

## Control flow

```wsharp
if (c) { } else if (d) { } else { }
const v = if (c) a else b;              // if is also an expression

while (c) { }
while (c) : (i += 1) { }                // continue expression, run before each retest
while (opt) |v| { }                     // loops while the optional is present

for (xs) |x| { }
for (xs) |x, i| { }                     // element and index

break;
continue;
```

`for` over an array walks it by index. Over anything else it calls `iter` and
`next` from the module that declares its type, which is how `std/list` is
iterable without the type checker knowing what a list is.

## Literals

```wsharp
42            // i64 unless the context says another type
0xff  0b1010  0o17  1_000_000
2.5           // f64, and never an integer
"text"        // str, escapes \n \t \r \0 \\ \"
true  false
null
```

**An integer literal takes the type it is used at** and defaults to `i64`. That
includes `f64`: `const x: f64 = 1;` is legal, and so is a `1` in a body annotated
`Number` that is compiled at `f64` as well as at `i64`. Only for a value the
`f64` *is*, though, because above 2^53 the integers are no longer all
representable, and the check is the round trip rather than a range: rounding a
written constant silently is not a thing to do.

A float literal is always an `f64` and never an integer.

## Operators

| | |
|---|---|
| Arithmetic | `+` `-` `*` `/` `%` on every numeric type |
| Bitwise | `&` `\|` `^` `<<` `>>` `~`, integers only |
| Comparison | `==` `!=` `<` `<=` `>` `>=`, and they do not chain |
| Logical | `and` `or` `!` |
| Optional | `orelse`, `.?` |
| Error | `try`, `catch` |
| Conversion | `u32(x)`, `i64(x)`, `f64(x)` |

`+`, `-` and `*` **wrap** on overflow. For an unsigned type that is the definition
rather than a concession. Division by zero and signed `MIN / -1` panic.

`%` works on `f64` as well as on the integers. Cranelift has no instruction for
it, so it is a call to the runtime, which is the shape `str ==` already had. The
obvious inline form, `l - trunc(l / r) * r`, is wrong: `l / r` rounds, so a large
quotient loses the low bits the answer is made of.

`==` compares `str` by contents, so a string built at run time equals a literal,
and it compares a **struct field by field**. See
[types](/docs/reference/types/).

Comparisons do not chain: write `a < b and b < c`.

## Conversions

`u32(x)` is a conversion, written rather than inferred. There is no implicit
widening between numeric types, so mixing widths is an error you fix by saying
which you meant.

There is one exception, and it is not numeric: a plain value coerces into `?T`,
into `!T`, and into a supertype, whenever the context asks for one. **The steps
compose**, so `return Sub{ .. };` is legal in a function declared `!Base`, and
`!?T` is a type worth writing.

## Comments

`//` to end of line. There is no block comment. `///` is a doc comment by
convention throughout the standard library, and nothing extracts it yet.
