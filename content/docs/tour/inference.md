---
title: "Type inference"
description: "Not a single type is written down, and every one of them is still checked."
weight: 20
---

W# is Zig-flavoured with one deliberate departure: **type annotations are
optional everywhere.** They are checked when written and inferred when not. This
program writes none at all.

{{< example "inference.ws" >}}

Ask the compiler what it decided:

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

This is Hindley-Milner inference over the whole program, so `fn add(a, b)` has a
signature rather than a hope. `--emit=types` is the fastest way to find out what
the compiler thinks, and it is worth reaching for whenever a type error surprises
you.

## Where each of those came from

`add` uses `+`, which is defined on the numeric types, and nothing narrows it
further, so the integer literals at the call site settle it: `+` defaults to
`i64`.

`scale` multiplies by `2.0`. A float literal is an `f64` and nothing else, so `x`
must be one too, and that flows out through the return type.

`id` puts no constraint on its argument at all, so it generalises to `fn(T) T`.
Because values are unboxed, this cannot be compiled once. Inference records the
type arguments at each call site and a later pass emits **one copy per
instantiation**, so `id(7)`, `id(true)` and `id("generic")` are three functions in
the emitted program, and any instantiation nothing calls is never emitted at all.

`first` ignores its second argument, which is why the second type variable never
appears in the result.

## Three things that follow

**An integer literal takes the type it is used at**, and defaults to `i64` when
nothing says otherwise. So `const b: u8 = 255;` needs no conversion, and `0xff`
is a `u8` in a `u8` context and an `i64` in an `i64` one.

**A float literal is never an integer, and an integer literal is never a float.**
`1.0` has to be written where an `f64` is wanted. This is a real limitation
rather than a rule with a reason, and it is [on the list](/docs/limitations/).

**Conversions are written, never inferred.** `u32(x)` converts. There is no
implicit widening between numeric types, so a mismatch is an error you fix by
saying which type you meant.

## Annotations still work, and are still checked

Writing a type down does not turn inference off; it adds a constraint that has to
hold.

```wsharp
fn add(a: i64, b: i64) i64 { return a + b; }   // the same function
fn add(a: i64, b) { return a + b; }            // b is i64 too, by unification
fn add(a: f64, b) i64 { return a + b; }        // error: f64 is not i64
```

Annotate for the reader, or to pin a type that would otherwise default. Do not
annotate because the compiler needs it, because usually it does not.

## When it cannot decide

Two cases come up in practice.

**A field read needs a known type.** Structs are nominal and there is no row
polymorphism, so `fn getx(p) { return p.x; }` cannot be inferred: any struct with
an `x` would satisfy it, and W# has no way to say that. Annotate the parameter.

**A generic call with nothing to pin it.** `var b = array.new(32);` says how many
elements but not of what, and the error says `cannot tell what type main is being
used at`. Give it something to work from, such as a use of `b` that fixes the
element type, or an annotation.

{{< note title="check and run can disagree" >}}
That second case passes `wsharp check` and fails `wsharp run`, because `check`
does not monomorphise and so never has to answer the question. The diagnostic is
right; which command reports it is not, and it is
[a known limitation](/docs/limitations/).
{{< /note >}}

## How it is organised, briefly

Top-level functions are grouped into strongly connected components of the call
graph, inferred with their types held monomorphic, and generalised only once the
whole group is done. That is what makes `fib` calling itself check, and mutually
recursive functions too. An overload set lands in one group, so its members
generalise together. There is more of this in
[the internals](/docs/internals/architecture/).
