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

Release notes live on
[the releases page]({{< param repo >}}/releases).
