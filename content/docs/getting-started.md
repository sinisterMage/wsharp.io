---
title: "Getting started"
description: "A first program, the three commands that act on it, and how to see what the compiler is thinking."
weight: 20
---

## A first program

Every program starts in `main`, which returns an `i64`.

```wsharp
fn main() i64 {
    print("hello");
    return 0;
}
```

```sh
wsharp run hello.ws
```

`print` needs no import. It is part of the **prelude**, which every module has
without asking: `print`, `print_int`, `print_uint`, `print_float`, `print_bool`,
`assert`, and a handful of collector counters. Everything else is imported.

## Three commands

```sh
wsharp run   hello.ws            # compile in memory and run main
wsharp check hello.ws            # everything but the code generation
wsharp build hello.ws -o hello   # compile to a native executable
```

`run` compiles into memory and runs there, which is what you want while writing
something. `build` writes a real program: the collector, the workers, TLS and the
rest of the runtime are linked into it, and it needs no compiler on the machine
that runs it.

`check` goes as far as monomorphisation and stops before code generation, so it
**accepts exactly what `run` accepts**. A file with no `main` is a library and is
fine to check.

Anything after the file belongs to your program rather than to the compiler, and
reaches it through `std/os`:

```sh
wsharp run prog.ws -- one two    # os.args() is ["one", "two"]
```

## Exit codes

The process exits with the low byte of `main`'s return value, as a C program
does, so `return 256;` exits 0.

| | |
|---|---|
| `0` to `255` | whatever `main` returned, low byte |
| `1` | a compile error |
| `101` | a W# panic, with `W# panic: <reason>` on stderr |

## Seeing what the compiler is thinking

`--emit` stops after a stage and prints it. It is the fastest way to answer "why
did it decide that", and `--emit=types` in particular is worth reaching for the
moment a type error surprises you.

```sh
wsharp check examples/inference.ws --emit=types    # inferred signatures
wsharp check examples/fib.ws       --emit=api      # the declared surface, versioned
wsharp check examples/fib.ws       --emit=ast      # parsed syntax tree
wsharp check examples/fib.ws       --emit=tokens
wsharp run   examples/fib.ws       --emit=hir      # typed, monomorphised IR
wsharp run   examples/fib.ws       --emit=clif     # generated Cranelift IR
```

Only one of those carries a promise. `--emit=api` is versioned, is printed after
type checking, and prints every name a program defines absolute, which is what a
tool that *generates* W# reads. Everything else on that list can change under you.
See [the wsharp command](/docs/reference/cli/).

`--emit=types` prints one line per top-level function, so an overload set shows up
as several:

```text
$ wsharp check examples/status.ws --emit=types
render: fn(Request, Status) str
render: fn(Request, Status2xx) str
render: fn(Request, Status4xx) str
render: fn(Request, NotFound404) str
render: fn(Request, Teapot418) str
serve: fn(Request, Status) void
main: fn() i64
```

## Something less trivial

This one uses the standard library, and every part of the TLS handshake it
performs is itself a `.ws` file compiled into your program:

```wsharp
const http = @import("std/http");
const text = @import("std/str");

fn main() i64 {
    const answer = http.get("https://wsharp.io/") catch return 1;
    print_int(answer.code);
    print_int(text.len(answer.body));
    return 0;
}
```

## A project

For anything with more than one file or a dependency, use
[ingot](/docs/packages/):

```sh
ingot init myapp
cd myapp
ingot add acme/json
ingot install
ingot run src/myapp.ws
```

## Next

The [tour](/docs/tour/) is eight short programs, each showing one thing W# does
differently. Start with [multiple dispatch](/docs/tour/dispatch/).
