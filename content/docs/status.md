---
title: "Status"
description: "Eleven numbered items, all of them done, and what is next."
weight: 95
---

W# is young. The first release was cut on 7 September 2026 and the current one is
{{< param version >}}. What is here is tested end to end, and the whole case suite
runs a second time under a collector that collects at every allocation and
validates every root.

The items are numbered by the original feature list. All eleven are done.

**1. Core language, Zig-style syntax.**

**2. Hindley-Milner type inference.**

**3. Garbage collector.** Reference counting, a concurrent mark trace for cycles,
and compaction. See [the collector](/docs/internals/collector/).

**4. Multiple dispatch over a subtype lattice**, with the HTTP status types as its
standard-library instance, abstract types for scalars, and overload sets as
values.

**5. Arrays, `for` loops, a growable array**, and explicit generic parameters on
functions, structs and `fn` literals.

**6. Standard library** behind a module system: strings, arrays, math and I/O.

**7. Multithreading.** Workers with their own heaps, talking by typed RPC or
through a Kafka-shaped message broker.

**8. The operating system declared by hand.** Files and sockets on Linux,
macOS/BSD and Windows arms, a readiness API, and a safe region that lets a thread
block in a syscall while its collector walks the stack it left behind. `std/net`
and `std/http` are on top of it.

**9. Sized and unsigned integers, and bitwise operators.** `i8` through `u64`,
`& | ^ << >> ~`, a rotate, and integer literals that take the type they are used
at. `i64` was the right default and the wrong only choice the moment a program
computed on bytes; ChaCha20's quarter round is now a test case rather than a thing
the language could not say.

**10. TLS 1.3, written in W#**, with certificate chains verified against the
platform's own root store, which is what turns `https://` from
`error.NotSupported` into a connection. Every hash, cipher, curve, signature
scheme and X.509 structure is a `.ws` file, and the whole client and server are
replayed against RFC 8448's published traces byte for byte.

**11. Package management, in a tool called ingot.** Git spoken rather than shelled
out to, a content-addressed store, and a resolver that says *why* a version was
ruled out rather than that it was. The resolver is PubGrub over version sets as
unions of intervals, and it found a real bug in the garbage collector on its way
in. TOML 1.0 is read and written in W#; the store can tell "not installed" from
"damaged". And there is a registry,
[Foundry]({{< param foundryRepo >}}), recording per version the commit to fetch
and the tree it must hash to, so resolving is arithmetic over a file and
installing is checked against a hash somebody's CI already verified.

## Since the list ran out

**sharpie**, the version manager, is the second real program written in W#. See
[toolchains](/docs/toolchains/).

**Windows is a release target**, so there are four of them. It had been out since
the first release, and the reason written down here was the wrong one.
`fs.mkdir_all` was blamed and was never at fault: the collector's root walk
followed the frame pointer across the Rust frames, which Win64 neither promises nor
provides, so it found no roots at all and freed the live heap. It crosses those
frames with the unwind tables now, and takes its capture inside the frame it
describes rather than after that frame has been popped.

`0.1.3` put the arm back with the bug still in it, because `cargo test` passed on
Windows and had for two releases. What caught it was the first W# program anyone
ran from a Windows shell rather than from a test harness. `0.1.4` is the fix, and
nothing else changed in it. [The collector](/docs/internals/collector/) has the
detail.

**The edge cases two real programs found.** One was a database wire-protocol
driver in pure W#, the other an MVC framework's design, and both were written
*against* the language rather than in it: every "can W# do this?" was settled by
running the compiler. Each ended with a list of what it had worked around, and
both lists are closed.

Between them: coercions that compose, so `!?T` is a type worth writing; `%` on
`f64`; `Signed`, so `math.abs` is one definition; any integer type indexing;
`g[i][j] = v`; re-raising a caught error with `return e`; a supertype reached
through the module that declares it; `check` that monomorphises; `--emit=api`,
the one emit with a promise attached; `std/map`; a linear `str.join`;
`net.shutdown` and `os.exit`; `fs.modified_at`; `==` on a struct; and `main`
returning ending the process.

Three compiler bugs came out with them, and none of them said anything. One
compiled a dispatched call on an argument nothing had pinned into a static call to
the most specific overload, so three subtypes held at their supertype all printed
what the most specific one said. One let a conversion inside a body annotated with
an abstract type pin that parameter, which with a second overload beside it got
past inference and handed the code generator a `u8` where an `i64` was declared.
And a worker's `init` ran with its arguments pinned on the runtime's root list, so
any blocking call inside it parked with runtime roots on the thread, which is the
shape every acceptor has.

Items 13 and 14 of [ROADMAP.md]({{< param repo >}}/blob/main/ROADMAP.md) are the
write-ups.

## What is left

The honest list of what does not work is on
[Limitations](/docs/limitations/). The last outstanding item in TLS is a
certificate chain through a P-521 key.

The full development log, organised by item, with what was built, the decisions
worth recording, and what each left open, is in
[ROADMAP.md]({{< param repo >}}/blob/main/ROADMAP.md).

## Releases

| Version | | |
|---|---|---|
| `0.1.0` | 7 September 2026 | The first release. `wsharp`, `ingot`, and `lib/libwsharp_start.a` |
| `0.1.1` | 8 September 2026 | ingot learns a registry: version dependencies resolve out of Foundry, `INGOT_REGISTRY`, and the verbs `update` and `search` |
| `0.1.2` | 8 September 2026 | The edge cases a wire-protocol driver found: coercions compose, `%` on `f64`, `Signed`, any integer type indexes, `g[i][j] = v`, `catch return e`, a supertype as a path, and `check` that monomorphises |
| `0.1.3` | 9 September 2026 | Windows back in the release matrix, the first release with four targets |
| `0.1.4` | 9 September 2026 | `0.1.3` with a root walk that reads a frame while it is still there, which is what the Windows arm had been missing all along |
| `0.1.5` | 10 September 2026 | `--emit=api`, `std/map`, `==` on a struct, a linear `str.join` and `str.repeat`, `net.shutdown`, `os.exit`, `fs.modified_at`, `str.to_upper`, `str.replace`, and `main` returning ends the process |

Release notes live on
[the releases page]({{< param repo >}}/releases).
