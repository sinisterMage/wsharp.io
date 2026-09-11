---
title: "Arrays, lists and maps"
description: "std/array on fixed-length arrays, std/list on the growable one, std/map on str keys."
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
at`, under `wsharp check` as well as `wsharp run`. Pin it with an annotation or a
use.

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

## std/map

```wsharp
const map = @import("std/map");
```

`Map[V]` is a hash table with `str` keys. The value type comes from what the map
is used at, so a local binding needs no annotation: `set` is what pins `V`.

| | |
|---|---|
| `new() Map[V]`, `with_capacity(n) Map[V]` | |
| `len(m) i64` | how many entries it holds |
| `get(m, key) ?V` | the value, or null |
| `has(m, key) bool` | beside `get`, because `?V` of an optional value type cannot be told from a missing entry |
| `set(m, key, value) void` | |
| `remove(m, key) bool` | whether it was there |
| `keys(m) []str` | in the table's order, which is the hash's: neither insertion order nor sorted |
| `clear(m) void` | forget everything, keeping the capacity |
| `iter(m)`, `next(it) ?Entry[V]` | what `for` calls; an `Entry` is a `key` and a `value` |

```wsharp
var seen = map.new();
map.set(seen, "orders", 7);
print_int(map.get(seen, "orders") orelse 0);
for (seen) |e| { print(e.key); }
```

**Open addressing with tombstones.** A removal marks its slot dead rather than
empty, because emptying it would end a probe run that other keys are still reached
through. The load factor watches the live count *plus* the tombstones, so a table
that filled and emptied repeatedly grows rather than probing through a run of dead
slots for ever.

Two things worth knowing. Adding to a map while walking it is not a thing to do:
an insert may grow the table, and then the walk's index means nothing. And a
removed key and value stay reachable until the slot is reused, exactly as
`list.pop` leaves a dead reference in the tail, which is documented rather than
fixed by pretending otherwise.

An association list is right for a handful of HTTP headers and wrong for a
prepared-statement cache, which is the shape of program this module exists for.

## for over anything

`for` over an array walks it by index. Over anything else it calls `iter` and
`next` from the module that declares its type. That is how `std/list` and
`std/map` are iterable without the type checker knowing what either is, and it is
how a container you write becomes iterable too: write those two functions.

`next` returns `?T`, which is why a manual loop is
`while (list.next(it)) |v| { }`.

## Why these are W#

All three modules move references from one object into another: an array `concat`
copies elements, a list growth copies them into a new backing array, and a map
rehashes into a bigger one. Anything that does that is written in W#, where the
write barrier, the load barrier and the stack maps apply by construction. A
builtin may read and write bytes, and that is the line.

`str.hash` is the exception that shows where the line is: it reads bytes and moves
no reference, so it is a builtin. Written in W# it would be one `str.byte_at` per
byte, and therefore one stack walk per byte under `--gc-stress`.
