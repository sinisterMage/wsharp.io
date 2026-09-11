---
title: "How dispatch compiles"
description: "Preorder type ids, contiguous ranges, and a test that is one subtract and one unsigned compare."
weight: 20
---

## Most calls are not dispatch

When inference pins every argument to a type whose subtypes cannot change the
answer, the winning overload is known during compilation and the call lowers to an
ordinary direct call. There is no dispatch code in the emitted program at all, and
the call is as cheap as any other.

This covers more than it sounds like it should, because inference is
whole-program. A value only becomes "some `Status`" when a function's signature
says so, or when something genuinely decides at run time.

## The rest is two instructions

When it cannot be decided, the compiler emits a decision chain over the runtime
type id, read out of the object's header.

Type ids are assigned in a **preorder walk of the subtype lattice**. A preorder
walk visits a node and then its whole subtree, so every type's subtrees are
consecutive, and therefore every type's subtypes occupy a **contiguous range of
ids**.

The HTTP status lattice, with the ids the compiler's own table produces:

```text
0   Status
1     Status1xx
2       Continue100
3     Status2xx
4       Ok200
5       Created201
6       Accepted202
7       NoContent204
8     Status3xx
...
12    Status4xx           ┐
13      BadRequest400     │
14      Unauthorized401   │
15      Forbidden403      │  Status4xx is 12 through 20
16      NotFound404       │
17      MethodNotAllowed405
18      Conflict409       │
19      Teapot418         │
20      TooManyRequests429┘
21    Status5xx
```

So "is this a `Status4xx`" is:

```text
(id - 12) <= 8      unsigned
```

The subtract underflows for any id below 12, giving a very large unsigned value
that fails the compare. One subtract, one unsigned compare, and no branch
mispredicted on a type that never varies.

No vtable, because there is no per-type table to load. No inline cache, because
there is no lookup to memoise. No hash, because the ids were arranged rather than
assigned arbitrarily.

## The chain

An overload set with several applicable members becomes a chain of those tests,
ordered most specific first, so the first that matches is the winner. Reaching the
end matches nothing and panics with `W# panic: no matching overload`.

The ordering is the same specificity relation the type checker used to reject
ambiguity, so the chain cannot disagree with what the checker promised.

## Why ambiguity has to be an error

If two overloads could both match and neither is more specific, there is no
ordering that makes the chain deterministic. Picking one would mean picking by
declaration order, which would make adding a function somewhere else in the
program silently change which code runs. That is precisely the failure mode
multiple dispatch is supposed to remove, so it is a compile error at the call
site.

## Abstract types are not this

`Number`, `Integer` and `Signed` never reach the runtime at all. A parameter
annotated with one is a generic parameter constrained to that type's members,
compiled once per type it is used at. A scalar's type is always known during
compilation, so there is nothing to test.

## Where the lattice comes from

Two sources. Struct declarations with a `: Base` supertype, and the compiler's own
table of HTTP status types, which sema injects ahead of the user's declarations.
A parent must appear before its children so the lattice is well founded, which is
also what makes the preorder walk trivial to perform on the table as written.

The status types are materialised on first mention, so a program that never names
one carries none of the 27, and the ids above shift accordingly.
