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

Type-checks and stops. It does not monomorphise, which is why it can accept a
program `run` rejects when a generic call's type variable is never pinned. See
[limitations](/docs/limitations/).

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
compiler.

## --emit

Stops after a stage and prints it. The fastest way to see what the compiler is
thinking.

| | |
|---|---|
| `tokens` | the lexer's output |
| `ast` | the parsed syntax tree |
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
