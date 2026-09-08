---
title: "Arrays and lists"
description: "std/array on fixed-length arrays, std/list on the growable one."
weight: 20
---

## std/array

```wsharp
const array = @import("std/array");
```

`[]T` is fixed-length. Its count lives in the object header and there is no
capacity beside it, so **every one of these returns a new array**.

| | |
|---|---|
| `len(a) i64` | |
| `new(n) []T` | `n` elements, zeroed; the element type comes from the context |
| `concat(a, b) []T` | |
| `push(a, v) []T` | a new array one longer |
| `slice(a, from, to) []T` | half-open |
| `repeat(a, n) []T` | |

`array.push` in a loop allocates a whole new array every call. Use `std/list` for
that.

`array.new(32)` needs the context to say what the elements are. `var b =
array.new(32);` on its own fails with `cannot tell what type main is being used
at`, which is [a known rough edge](/docs/limitations/).

## std/list

```wsharp
const list = @import("std/list");
```

`List[T]` is the second object that length needs: a backing array whose header
length is the *capacity*, and a count of how much of it is in use. Pushing writes
into the spare tail, only a full list reallocates, and it doubles when it does, so
a run of pushes is amortised constant time.

| | |
|---|---|
| `new() List[T]`, `with_capacity(n) List[T]`, `from(a) List[T]` | |
| `len(l) i64`, `capacity(l) i64` | |
| `get(l, i) T`, `set(l, i, v) void` | |
| `push(l, v) void`, `pop(l) T` | |
| `insert(l, i, v) void`, `remove(l, i) T` | |
| `extend(l, a) void`, `clear(l) void` | |
| `to_array(l) []T` | |
| `iter(l)`, `next(it)` | what `for` calls |

```wsharp
var steps: list.List[i64] = list.new();
list.push(steps, 7);
for (steps) |v, i| { }
print_int(list.len(steps));
```

`pop` and `remove` hand a value back and **panic** on an empty list rather than
returning `?T`, for the same reason `a[i]` panics: asking for element zero of an
empty list is a bug, not a case.

## for over anything

`for` over an array walks it by index. Over anything else it calls `iter` and
`next` from the module that declares its type. That is how `std/list` is iterable
without the type checker knowing what a list is, and it is how a container you
write becomes iterable too: write those two functions.

`next` returns `?T`, which is why a manual loop is
`while (list.next(it)) |v| { }`.

## Why these are W#

Both modules move references from one object into another: an array `concat`
copies elements, and a list growth copies them into a new backing array. Anything
that does that is written in W#, where the write barrier, the load barrier and the
stack maps apply by construction. A builtin may read and write bytes, and that is
the line.
