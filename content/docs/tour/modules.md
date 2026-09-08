---
title: "Modules"
description: "@import binds a module to a name, pub says what another module may see."
weight: 70
---

{{< example "library.ws" >}}

```sh
wsharp run examples/library.ws
```

```text
hello, world
12
true
world
3
id | name | email
7
1.4142135623730951
3
1024
could not read it
404 not found
400 bad request
500 server error
```

## Importing

`@import` binds a module to a name, and everything in it is reached through that
name:

```wsharp
const str  = @import("std/str");      // a library module
const util = @import("./helper.ws");  // a file next to this one
const json = @import("acme/json");    // a package this project depends on
```

Library paths and package paths are extensionless. A relative path names a file
and keeps its extension.

The name is yours to choose. `const text = @import("std/str");` is fine, and the
example programs use whichever name reads best at the call site.

Two files may each declare a `helper` without colliding, and the 27 HTTP status
types no longer occupy the global namespace, which is what the module system was
for.

## Visibility

Everything in a module is private to it unless it says `pub`:

```wsharp
pub const State = struct { total: i64, label: str };
pub fn add(s: State, n: i64) i64 { ... }
fn internal() i64 { ... }            // not reachable from outside
```

Only a *qualified* lookup checks visibility. An unqualified name can only mean
this module's own or the prelude's, and both are always visible, so `pub` costs
nothing to resolve.

## Re-export

A `const` may be a second name for something another module declares, which is
what lets a package of several files present one of them:

```wsharp
const inner = @import("./inside.ws");

pub const Pair  = inner.Pair;      // a type
pub const twice = inner.twice;     // a function, or a whole overload set
```

The alias and the original are the same type and the same function set rather
than copies, so a value made through one is usable through the other, and an
overload set renamed once still dispatches on every member.

## What a program pays for

**A library module is read only if something imports it.** A program that mentions
nothing pays for nothing: `wsharp check` on a ten-line file takes about five
milliseconds however far the library grows.

The HTTP status types go further. They are materialised on first mention, so a
program that never names one carries none of them.

## Modules are also workers

There is no separate declaration form for a service. A module with an `init` that
makes its state, and functions taking that state as their first parameter, is
something `@spawn` can start:

{{< example "modules/counter.ws" >}}

`helper` does not take the state, so no caller can reach it through a handle. That
is [the next page](/docs/tour/workers/).
