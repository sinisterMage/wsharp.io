---
title: "Documentation"
description: "Install W#, learn what it does differently, and look things up."
weight: 1
---

W# is young, and so is this documentation. What follows is written against
version {{< param version >}} of the compiler and {{< param sharpieVersion >}} of
sharpie, and every claim in it is one the test suite makes too.

## If you are new here

Start with [Install](/docs/install/), which takes one line, then
[Getting started](/docs/getting-started/) for the shape of a program and the
three commands the compiler has. After that the [tour](/docs/tour/) is eight
short programs, each showing one thing W# does differently from the language you
already use. It is worth reading in order; later pages assume the earlier ones.

## If you are looking something up

The [language reference](/docs/reference/) is the precise version of the tour:
syntax, the type system, how an overload is selected, what an error set means,
and the compiler's own command line. The
[standard library](/docs/stdlib/) covers what you can import, from `std/str` up
to `std/tls`.

## If you want to know how it works

The [internals](/docs/internals/) pages are about the implementation rather than
the language: how the compiler is laid out, how dispatch compiles down to two
instructions, and how the collector reaches microsecond pauses. None of it is
needed to write W#, and all of it explains why the language is shaped the way it
is.

[Limitations](/docs/limitations/) is the honest list of what does not work yet,
each entry with the reason it was left. [Status](/docs/status/) is what has been
built so far.
