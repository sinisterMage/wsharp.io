---
title: "Architecture"
description: "Five crates, one pipeline, and the decisions that shaped them."
weight: 10
---

```text
source ──► wsharp-syntax ──► wsharp-sema ──► wsharp-codegen ──► native code
           lex, parse         infer, mono      Cranelift: JIT
                                               or object file
                                  │
                            wsharp-runtime
                    heap, collector, header, builtins
```

The compiler is Rust, edition 2024, pinned to rustc 1.95. The backend is
Cranelift, pinned hard so the workspace builds offline.

## The crates

| Crate | Job |
|---|---|
| `wsharp-syntax` | Lexer, recursive-descent parser with Pratt-style precedence, spans, diagnostic rendering |
| `wsharp-sema` | Name resolution, Hindley-Milner inference, the subtype lattice, overload selection, typed HIR, monomorphisation, value layout |
| `wsharp-codegen` | HIR to Cranelift IR, the dispatcher, the write barrier, stack-map harvesting, and both backends over one lowering |
| `wsharp-runtime` | Object header, block and line heap, reference counting, the mark trace and its thread, evacuation, stack walker, type registry, builtins. A leaf crate with no dependencies at all |
| `wsharp-cli` | The `wsharp` binary, the module loader, the linker driver, and the end-to-end test suites |
| `wsharp-start` | The `main` a compiled program starts in, and the archive it links against |

`wsharp-runtime` also holds the standard library and `ingot`, as `.ws` files
compiled with your program rather than as Rust.

## Two backends over one lowering

`wsharp-codegen` emits Cranelift IR once and hands it either to the JIT, for
`wsharp run`, or to the object writer, for `wsharp build`. The lowering is the
same code, so a program cannot behave one way when run and another when built. The
end-to-end suite checks exactly that: every case is also built to a native
executable and held to the same expected output.

## Decisions worth knowing about

**Inference runs per binding group.** Top-level functions are grouped into
strongly connected components of the call graph, inferred with their types held
monomorphic, and generalised only once the whole group is done. That is what makes
`fib` calling itself, and mutually recursive functions, check. An overload set
lands in one group, so its members generalise together.

**Subtyping is not in unification.** Making `unify` directional would mean
threading a polarity through every recursive call, including function types, where
parameters are contravariant. Instead `coerce` consults the lattice after
unification fails, which works because unification binds whichever side is still a
variable, so anything reaching the subtype check is already concrete.

**Levels, not environment scans.** Type variables carry Rémy levels, so
generalisation is a walk over one type rather than a scan of the environment.

**Monomorphisation, because values are unboxed.** `i64`, `f64` and `bool` live in
registers, so `fn(T) T` cannot be compiled once. Inference records the type
arguments at each call site and a worklist pass emits one copy per instantiation.
Unreachable functions fall out as dead code.

**A value is a list of machine values, not one.** Scalars and pointers take one
slot; `?T` and `!T` are a tag followed by the payload. No boxing, and no
allocation for an optional.

**A subtype's fields are its supertype's, first.** That is what lets a field read
compiled against a supertype run unchanged on any subtype, with no adjustment and
no vtable.

**Every function takes an environment pointer.** Top-level functions ignore it and
are called with null. That uniformity lets a plain `fn` be passed as a value
without generating a wrapper.

**A standard library entry is one table row, or one line of W#.** `builtins.rs`
holds `(module, name, parameters, return type, function pointer)`; inference reads
it to seed each module's environment and code generation reads the same table to
register JIT symbols. The HTTP status lattice is a second such table, and a
program pays only for the statuses it names. Anything that moves a reference
between objects is a `.ws` file instead, compiled with your program so that the
collector's barriers apply to it.

**A module is a prefix on a name.** Names are stored qualified in one flat table,
and an unqualified lookup tries the current module and then the prelude. What a
module cannot see is what it has no key for. Re-export falls out of that shape:
`pub const T = other.T;` is one more key in the same table holding the same type,
so nothing below the type checker knows it happened. Files are laid end to end in
one offset space, so a span stays two `u32`s with no file in it and the renderer
works out which file a span fell in.

## Frame pointers are not optional

`.cargo/config.toml` sets `-Cforce-frame-pointers=yes` for the whole workspace.
The collector walks frames out of the runtime to find its roots, and it needs every
frame between itself and the generated code it is looking for. Removing it produces
a build that compiles and then collects the wrong objects.

It is necessary and not sufficient. On Win64 a frame pointer may be established as
`lea rbp, [rsp + n]` and nothing marks the outermost frame, so the chain is not
followable there however it was compiled, and that half of the walk asks the unwind
tables instead. See [the collector](/docs/internals/collector/).

## Testing

240 end-to-end cases, around 60 of them negative cases checking that a bad program
is rejected with the right message. The whole suite runs a second time under a
collector that collects at every allocation and validates every root, and traces
start on the same allocation schedule in both runs so the concurrent paths are
covered both ways.

A few of those cases assert by **hanging** if they regress, which is the only way
an assertion about a process exiting can be made: `worker_daemon_exit.ws` is
`main` returning with a worker alive that cannot be stopped, and
`worker_blocking_init.ws` is a blocking call inside a worker's `init`.

A few others are named so that they join the subset the suite runs *built* and
under stress, which is the only thing that drives a generated equality function's
stack maps through serialisation.
