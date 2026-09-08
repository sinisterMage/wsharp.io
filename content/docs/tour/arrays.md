---
title: "Arrays and lists"
description: "A fixed-length array whose count is in its header, and the growable type built on it."
weight: 50
---

## Arrays

An array is a heap object with its length in the header and its elements inline,
which is the same shape a string literal has.

{{< example "arrays.ws" >}}

```sh
wsharp run examples/arrays.ws
```

```text
3, 1, 4, 1, 5
14
3
a
3, 1, 4, 1, 5, 9
1, 4, 1
3, 1, 4, 1, 5, 9, 2
1, 12, 3
```

Three things to notice.

**`for` binds an index if you ask for one.** `for (xs) |x|` walks the elements and
`for (xs) |x, i|` walks them with their positions.

**`a[i]` is a place as well as a value**, so `ys[1] += 10` writes back. An index
outside the array panics, exactly as `.?` on a null optional does: a failure the
type system permits but the program must not perform.

**Every `std/array` operation returns a new array.** The length lives in the
header and there is no capacity beside it, so `array.push` allocates a whole new
array every call. That is fine for building something once and wrong for a loop,
which is what the next section is about.

An array index is an `i64`. Every literal index works without saying so, and
`i64(i)` covers the rest.

## Lists

`list.List[T]` is the second object that length needs: a backing array whose
header length is the *capacity*, and a count of how much of it is in use. Pushing
writes into the spare tail, only a full list reallocates, and it doubles when it
does, so a run of pushes is amortised constant time.

{{< example "list.ws" >}}

```sh
wsharp run examples/list.ws
```

```text
7 -> 22 -> 11 -> 34 -> 17 -> 52 -> 26 -> 13 -> 40 -> 20 -> 10 -> 5 -> 16 -> 8 -> 4 -> 2 -> 1
17
32
the,quick,brown,fox,jumps
jumps
the
3
```

`for` over a list works, and nothing in the type checker knows what a list is.
**`for` over anything that is not an array calls `iter` and `next` from the module
that declares its type**, so `std/list` says how a list is iterated by writing two
functions, and any type you write can do the same.

`pop` and `remove` hand a value back and panic on an empty list rather than
returning `?T`, for the same reason `a[i]` does: asking for element zero of an
empty list is a bug, not a case.

`std/list` is written in W# rather than in Rust, and the reason is the rule that
draws the line for the whole standard library: **a builtin may read and write
bytes, and anything that moves a reference from one object into another is
written in W#**, where the write barrier, the load barrier and the stack maps all
apply by construction. A list growth copies references, so it is W#.

See [the standard library](/docs/stdlib/collections/) for everything `std/list` and
`std/array` provide.
