---
title: "Internals"
description: "How the compiler is laid out, how dispatch compiles to two instructions, and how the collector reaches microsecond pauses."
weight: 80
---

None of this is needed to write W#. All of it explains why the language is shaped
the way it is, and most of the language's constraints turn out to be one of these
three decisions seen from the other side.

- [Architecture](/docs/internals/architecture/): the five crates, the pipeline
  between them, and the decisions worth knowing about.
- [Dispatch](/docs/internals/dispatch/): why a runtime dispatch is one subtract
  and one unsigned compare.
- [The collector](/docs/internals/collector/): reference counting, a concurrent
  mark trace for cycles, and compaction that runs while the program does.

Contributor conventions and the invariants worth not breaking live in
[CLAUDE.md]({{< param repo >}}/blob/main/CLAUDE.md) in the compiler's repository.
