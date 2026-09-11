---
title: "Errors"
description: "What an error set is, how it is inferred, and what panics instead."
weight: 40
---

## An error value

`error.Name` makes one. The name is not declared anywhere: writing
`return error.NotFound;` is what brings `NotFound` into existence, and the set it
belongs to is worked out from where it is raised.

## The type carries the set

`!T` is a `T` or an error, and which errors it may be is part of the type:

```wsharp
fn risky(n: i64) !i64 {            // fn(i64) !{Negative, Zero}i64
    if (n < 0) { return error.Negative; }
    if (n == 0) { return error.Zero; }
    return n;
}
```

The set is the union of what the function raises directly and what it propagates
with `try`. Nothing caps how many errors a set may name.

Written down, it is checked:

```wsharp
fn risky(n: i64) !{Negative, Zero}i64 { ... }   // exactly these
fn risky(n: i64) !{Negative}i64 { ... }         // error: Zero escapes
```

Raising an error outside a declared set is a compile error, which is what makes
the declaration worth writing.

Because the set is in the type, the `e` bound by `catch |e|` is worth testing:

```wsharp
const v = risky(n) catch |e| if (e == error.Negative) 0 else -1;
```

## Handling

| | |
|---|---|
| `try f()` | the payload, or return this error from the current function |
| `f() catch v` | the payload, or `v` |
| `f() catch \|e\| expr` | the payload, or `expr` with the error bound |
| `f() catch \|e\| return e` | the payload, or hand this error on |
| `f() catch return false` | `catch` takes any expression, including `return` |
| `f() catch { log(); 0 }` | including a block, whose last expression is its value |

`try` propagates, so a function using it has to be fallible itself.

## Re-raising a caught error

An error bound by `catch |e|` can be returned. That is what lets a function handle
one case and pass the rest on:

```wsharp
fn only_one(n: i64) !i64 {
    return risky(n) catch |e| {
        if (e == error.One) { return 111; }
        return e;                          // hand the rest on
    };
}
```

`catch |e| return e` works inline too, without the block.

An `error` value and an `!T` share their first slot and its encoding, the error's
index plus one so that zero can mean success, so this costs one move rather than a
constructor. The set is held to the same subset rule `try` is: an error handed on
this way has to be in the declared set as well.

Before this, a function that wanted to handle one case and pass the rest along had
to ask enough questions *before* the call to be sure it would not raise. That is
why `std/fs.mkdir_all` tests for a directory rather than catching
`AlreadyExists`.

## Coercion

A plain value coerces into an error union when the context wants one, so
`return n;` is legal in a function declared `!i64`. There is no constructor to
write.

The coercions compose, so `return Sub{ .. };` is legal in a function declared
`!Base`, and `!?T` is a type worth writing: a value, nothing, or a failure, in one
return. See [types](/docs/reference/types/).

`==` works on an error value, because an error is its tag and comparing two is
comparing two integers. That is what makes the `e` a `catch |e|` binds worth
testing now that its set says what it can be.

## What panics instead

W# separates errors, which the type system makes you handle, from failures the
type system permits but the program must not perform. The second kind prints
`W# panic: <reason>` to stderr and exits **101**:

- `.?` on a null optional
- a failed `assert`
- an array index outside the array
- integer division by zero
- signed `MIN / -1`
- a call no overload matches

Arithmetic overflow is not one of them. `+`, `-` and `*` wrap.

A container written in W# can raise the same out-of-bounds panic that `a[i]` does,
by calling the prelude's `panic_index(i, len)`, so a bad index into a
`list.List[T]` reports exactly as a bad index into an array.

## Two other compile-time checks in the same family

A function that can reach the end of its body without returning a value is a
compile error, not a function returning something unspecified.

An ambiguous pair of overloads is a compile error at the call site. See
[dispatch](/docs/reference/dispatch/).
