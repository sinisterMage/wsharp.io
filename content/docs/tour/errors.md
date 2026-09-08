---
title: "Optionals and errors"
description: "?T may be absent, !T may have failed, and !T says which failures it means."
weight: 30
---

`?T` is a value that may be absent. `!T` is one that may have failed. Both compile
to a tag next to the payload, in registers, with no allocation and no boxing.

{{< example "results.ws" >}}

```sh
wsharp run examples/results.ws
```

```text
5
-1
4
odd
3
5
0
-1
5
-99
```

## Optionals

`?i64` is either an `i64` or `null`. Four things act on one:

| | |
|---|---|
| `a orelse b` | the payload, or `b` if it is absent |
| `if (a) \|v\| { }` | binds the payload when present, with an optional `else` |
| `while (a) \|v\| { }` | the same, as a loop, which is how iterators end |
| `a.?` | the payload, and a panic if there is not one |

`.?` is an assertion. It is the right thing to write when absence would be a bug
rather than a case, and it fails loudly rather than quietly: the process prints
`W# panic: unwrapped a null optional` and exits 101.

## Error unions carry a set

`!i64` is either an `i64` or an error. What makes it worth more than a boolean is
that the type records *which* errors:

```wsharp
fn risky(n: i64) !i64 {            // inferred: fn(i64) !{Negative, Zero}i64
    if (n < 0) { return error.Negative; }
    if (n == 0) { return error.Zero; }
    return n;
}
```

The set is inferred from what the function raises and from what it propagates
with `try`. You can also write it down, in which case it is checked:

```wsharp
fn risky(n: i64) !{Negative, Zero}i64 { ... }        // exactly these two
fn risky(n: i64) !{Negative}i64 { ... }              // error: Zero escapes
```

Raising an error outside a declared set is a compile error. Nothing caps how many
errors a set may name.

Because the set is in the type, the `e` bound by `catch |e|` is worth testing
against:

```wsharp
const v = risky(n) catch |e| if (e == error.Negative) 0 else -1;
```

## Handling one

| | |
|---|---|
| `try f()` | the payload, or return this error from the current function |
| `f() catch 0` | the payload, or `0` |
| `f() catch \|e\| ...` | the payload, or an expression with the error bound |
| `f() catch return false` | `catch` takes any expression, including a `return` |
| `f() catch { log(); 0 }` | including a block, whose last expression is its value |

`try` propagates, so a function that uses it has to be fallible itself. That is
why `average` in the example is declared `!i64`: it calls `checked_div` with
`try`, and `checked_div` can fail.

## Coercion into either

A plain value coerces into an optional or an error union when the context wants
one, so `return n;` is legal in a function declared `!i64` and in one declared
`?i64`. You never write a constructor.

The same rule covers subtyping: a subtype coerces into its supertype, because
both are one pointer and a subtype's layout begins with a byte-identical copy of
its supertype's. That is [the next page](/docs/tour/structs/).

## What panics rather than returning an error

W# separates errors, which are values the type system makes you handle, from
failures the type system permits but the program must not perform. The second
kind panics: it prints `W# panic: <reason>` to stderr and exits 101.

- `.?` on a null optional
- a failed `assert`
- an array index outside the array
- integer division by zero, and signed `MIN / -1`
- a call no overload matches

Ordinary arithmetic overflow is not on that list. `+`, `-` and `*` wrap, which for
an unsigned type is the definition rather than a concession.
