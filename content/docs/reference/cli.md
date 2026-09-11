---
title: "The wsharp command"
description: "run, check and build, what --emit prints, and every environment variable."
weight: 70
---

```sh
wsharp run   <file.ws> [-- args]   # compile in memory and run main
wsharp check <file.ws>             # type-check only
wsharp build <file.ws> -o <prog>   # compile to a native executable
```

## run

Compiles into memory and runs there, which is what you want while writing
something. The process exits with the low byte of `main`'s return value.

Anything after `--` belongs to your program and reaches it through `os.args()`:

```sh
wsharp run prog.ws -- one two      # os.args() is ["one", "two"]
```

`--gc-stress` collects at every allocation and validates every root the stack
maps describe. It is slow and it is the fastest way to find a collector bug in
your own code.

## check

Everything but the code generation. It goes as far as monomorphisation, which is
where a generic call nothing pinned is reported, and stops before Cranelift is
asked for anything, so **`check` accepts exactly what `run` accepts**.

A file with no `main` is a library and is fine to check.

## build

Writes a real program. The collector, the workers, TLS and the rest of the runtime
are linked into it, and it needs no compiler on the machine that runs it.

```sh
wsharp build hello.ws -o hello
wsharp build --module ingot/main -o ingot     # root at a library module instead
```

Linking is done by `$CC`, or `cc`, against a runtime archive that `wsharp` looks
for beside itself and under `../lib`. **An installation is a directory rather than
a single file** for that reason. The archive is `libwsharp_start.a`, or
`wsharp_start.lib` where MSVC named it; both spellings are looked for, because
cargo names a staticlib after the platform rather than after the crate.

`--emit=obj` stops at the relocatable object, which is the half that needs no C
compiler. It is `build`'s alone and is refused elsewhere.

## --emit

Stops after a stage and prints it. The fastest way to see what the compiler is
thinking.

| | |
|---|---|
| `tokens` | the lexer's output |
| `ast` | the parsed syntax tree. A debugging aid, with no promise attached |
| `api` | the declared surface, resolved and versioned. The one with a promise |
| `types` | one line per top-level function, so an overload set is several |
| `hir` | typed, monomorphised IR |
| `clif` | generated Cranelift IR |
| `obj` | the relocatable object, `build` only |

```sh
wsharp check examples/inference.ws --emit=types
```

```text
add: fn(i64, i64) i64
scale: fn(f64) f64
id: fn(T) T
first: fn(T, U) T
main: fn() i64
```

## --emit=api

**This is the one emit with a promise attached, and the only one.** A tool that
generates W#, a router built from the route types an application declares or a
migration runner built from a schema, has to read the program somehow, and
reading it through the compiler is what keeps the tool and the type checker from
disagreeing.

```text
$ wsharp check app/main.ws --emit=api
(api 1)
(module "main"
  (import fw "app/fw")
  (pub const ROUTE_Show (str "GET /users/:id"))
  (pub struct Show (parent "app/fw".Route)
    (field id i64)
    (field page (optional i64)))
  (pub fn action
    (param r "main".Show)
    (ret "app/fw".Response)))
```

Four things are promised.

**It is versioned.** The first line is `(api 1)`, and a change that could make an
existing reader wrong bumps the number. Adding a new form inside an existing one
does not, because a reader that does not know a form skips it.

**It is a surface, not a program.** Declarations and their types: no bodies, no
expressions, no spans. Top-level `const` literals come through verbatim, which is
what lets a convention be overridden in source rather than by a comment.

**Every name a program defines is absolute.** A type written `fw.Route` prints as
`"app/fw".Route` and one declared here prints with this module's own path, so a
reader never follows an import or guesses a scope, and a bare name is one the
language provides. A module is named by the path it resolved to, `std/net` for a
library module and the file for a local one, with `/` separators on every
platform; the root is `"main"`. A re-export prints as `(alias "module".name)`,
naming what it is a second name for.

**It describes a program the compiler accepted**, because it is printed after
type checking.

`--emit=ast` is **not** this. It prints whatever the syntax tree happens to hold,
it is shared with the parser tests, it renames a node whenever the parser does,
and it leaves every qualified name for the reader to resolve. It is a debugging
aid and carries no promise at all.

## Exit codes

| | |
|---|---|
| `0` to `255` | the low byte of what `main` returned |
| `1` | a compile error |
| `101` | a W# panic, printed as `W# panic: <reason>` on stderr |

`return 256;` exits 0, as a C program does.

## Environment

| | |
|---|---|
| `WSHARP_GC_STATS=1` | print collector statistics on exit, including the number of pauses and the longest |
| `WSHARP_GC_TRACE=1` | print every frame the root walk visits |
| `WSHARP_GC_STRESS=1` | collect at every allocation, as `--gc-stress` does |
| `WSHARP_RUNTIME_LIB` | the runtime archive `build` links against |
| `WSHARP_HOME` | `ingot`'s package store, `~/.wsharp` by default |
| `INGOT_REGISTRY` | a registry directory or git URL |

All three collector variables are off when unset, empty or `0`.

`SHARPIE_HOME` is a different variable belonging to a different program. See
[toolchains](/docs/toolchains/layout/).
