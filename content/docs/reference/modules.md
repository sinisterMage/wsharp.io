---
title: "Modules"
description: "@import, pub, re-export, and what a program pays for."
weight: 60
---

## Importing

```wsharp
const http = @import("std/http");     // a library module
const util = @import("./helper.ws");  // a file next to this one
const json = @import("acme/json");    // a package this project depends on
```

Library and package paths are extensionless. A relative path names a file and
keeps its `.ws`.

`@import` binds the module to a name of your choosing, and everything in it is
reached through that name. There is no wildcard import and no implicit namespace.

A package path resolves through `ingot.env`, written beside the lockfile by
`ingot install`, so `@import("acme/json")` works under plain `wsharp run` as well
as under `ingot run`. A module may import only what its own `ingot.toml` asked
for, even though the lockfile holds the whole graph.

## Visibility

Everything is private to its module unless it says `pub`:

```wsharp
pub const State = struct { total: i64, label: str };
pub fn add(s: State, n: i64) i64 { ... }
fn internal() i64 { ... }
```

Only a **qualified** lookup checks visibility. An unqualified name can only mean
this module's own or the prelude's, and both are always visible.

## Re-export

A `const` may be a second name for something another module declares:

```wsharp
const inner = @import("./inside.ws");

pub const Pair  = inner.Pair;      // a type
pub const twice = inner.twice;     // a function, or a whole overload set
```

The alias and the original are **the same** type and the same function set, not
copies. A value made through one is usable through the other, and an overload set
renamed once still dispatches on every member.

This is what lets a package of several files present one of them: a package
presents exactly one file, the `root` in its manifest, and what else it shows is
what that file re-exports.

## What a program pays for

A library module is read only if something imports it, so `wsharp check` on a
ten-line file takes about five milliseconds however far the library grows.

The HTTP status types go further: they are materialised on first mention, so a
program that never names one carries none of the 27.

## A module is a worker

There is no separate form for a service. A module with an `init` that makes its
state, and functions taking that state as their first parameter, is something
`@spawn` can start. Any such function is a method on the handle; a function that
does not take the state is not reachable through one.

```wsharp
const w = @spawn(counter, 0, "orders") catch return 1;
const n = w.add(5) catch |e| -1;
@join(w) catch return 2;
```

See [workers](/docs/tour/workers/).

## How it works, briefly

A module is a prefix on a name. Names are stored qualified in one flat table, and
an unqualified lookup tries the current module and then the prelude. Re-export
falls out of that shape: `pub const T = other.T;` is one more key in the same
table, holding the same type or the same function set, so nothing below the type
checker knows it happened.

Files are laid end to end in one offset space, so a span stays two `u32`s with no
file in it, and the diagnostic renderer works out which file a span fell in.
