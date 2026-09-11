---
title: "Strings"
description: "std/str, and what str is made of."
weight: 10
---

```wsharp
const str = @import("std/str");
```

A `str` is a heap object with its length in the header and its bytes inline,
which is the same shape an array has. It is immutable, and `==` compares
contents, so a string built at run time equals a literal.

## Functions

| | |
|---|---|
| `len(s) i64` | the length in bytes |
| `concat(a, b) str` | |
| `eq(a, b) bool` | the same answer as `==`, as a function value |
| `substr(s, from, to) str` | half-open, so `substr(s, 0, len(s))` is `s` |
| `find(haystack, needle) i64` | the index, or `-1` |
| `split(s, sep) []str` | |
| `join(parts, sep) str` | linear: it measures, allocates once and copies |
| `repeat(s, n) str` | the same shape |
| `replace(s, from, to) str` | two passes, so it is linear by construction |
| `starts_with(s, prefix) bool` | |
| `from_int(i64) str`, `from_float(f64) str` | |
| `parse_int(s) !i64` | |
| `byte_at(s, i) u8`, `from_byte(u8) str` | |
| `to_lower(s) str`, `to_upper(s) str` | |
| `trim(s) str` | leading and trailing whitespace |
| `hash(s) u64` | FNV-1a with the SplitMix64 finaliser, which is what `std/map` keys on |

### join and repeat are linear

Both were `concat` in a loop, which copies the accumulator on every iteration.
Joining 150,000 pieces into 600 KB took 9.4 seconds. They measure, allocate once
and copy now, and the same call takes about 0.08 seconds with compilation
included.

That matters because building output from pieces is what a program does. Before
the fix, `bytes.Buf` was around 190 times faster at the same job, so anything that
reached for the obvious spelling was paying for it.

`str.hash` is a builtin rather than W#, because hashing in W# would be one
`str.byte_at` per byte and therefore one stack walk per byte under `--gc-stress`.

## Using it

```wsharp
const str = @import("std/str");

fn main() i64 {
    const greeting = str.concat("hello, ", "world");
    print(greeting);
    print_int(str.len(greeting));
    print_bool(greeting == "hello, world");
    print(str.substr(greeting, 7, str.len(greeting)));

    for (str.split("id,name,email", ",")) |field| { print(field); }
    print(str.join(str.split("a b c", " "), " | "));
    return 0;
}
```

## Bytes

`str` is bytes, not characters. `len` counts bytes and `byte_at` returns one, so
a multi-byte UTF-8 character is several of both. There is no character type and no
decoder in the library yet.

To work on a string as a buffer, cross to `[]u8` through
[`std/bytes`](/docs/stdlib/crypto/):

```wsharp
const bytes = @import("std/bytes");

const b = bytes.of("hello");     // str to []u8
const s = bytes.to_str(b);       // []u8 back to str
```

`split` is written in W# rather than as a builtin, because it produces an array of
strings and therefore moves references between objects. That is the rule the whole
library follows.
