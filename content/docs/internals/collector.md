---
title: "The collector"
description: "Reference counting for the common case, a concurrent mark trace for cycles, and compaction that runs while the program does."
weight: 30
---

The design follows LXR: Zuo, Blackburn, Zigman and Yang, *Low-Latency,
High-Throughput Garbage Collection*, PLDI 2022.

The headline: **the longest pause measured 40 microseconds on 120,000 live
objects, and the same on 15,000**, because a pause visits what the program changed
rather than what it holds. The previous stop-the-world collector took 1.2
milliseconds on 30,000 and did not finish 60,000 at all.

## An Immix-style heap

32 KiB blocks, 256-byte lines. Blocks come from over-aligned reservations, so an
object's block and line follow from arithmetic on its address rather than from a
table lookup. Objects over 8 KiB get their own allocation and are never moved.

## Coalescing reference counting

The write barrier snapshots an object's outgoing references the first time it is
modified in a cycle, and the collector compares that snapshot against the current
state.

A field written a thousand times between collections therefore costs **one**
decrement and **one** increment, not a thousand of each. The fast path is a load,
a test, and a not-taken branch.

## Precise roots

Every heap pointer the code generator produces is declared to Cranelift as a
stack-map root. The collector finds them by walking frames and looking each return
address up in the emitted maps.

Because the roots are precise and updatable in place, **objects can move**. That is
what makes compaction possible at all, and it is why
`-Cforce-frame-pointers=yes` is not negotiable.

### The walk has two halves, and only the first has arms

The collector starts inside a runtime function that generated code called into, so
it has to *reach* generated code before it can walk it. Those are genuinely
different problems and they are separate functions.

**Reaching generated code** means crossing the handful of Rust frames in between,
and this is the half with platform arms. The SysV targets follow `rbp`: every frame
does `push rbp; mov rbp, rsp`, and the ABI requires the outermost frame pointer to
be zero, which is what stops the walk. **Neither half holds on Win64.** A prologue
there records its frame register in the function's *unwind info* and may establish
it as `lea rbp, [rsp + n]`, for which `[rbp]` is a local; and nothing marks the
outermost frame. So the Windows arm asks `RtlVirtualUnwind`, which is what the
unwind tables are for. `-Cforce-frame-pointers=yes` does reach that target and does
not make the chain followable.

**Walking generated code** has no arms at all. Cranelift's prologue really is
`push rbp; mov rbp, rsp` whatever the calling convention, because its x64 backend
ignores the call conv entirely. So the half that reads stack maps cannot drift.

Two things follow from the split rather than needing their own fix. A parked worker
records the generated frame *itself*, because crossing the Rust frames needs that
thread's own frame pointers or its own registers and a collector has neither; what
it is handed is the far side of the crossing, which any thread may walk. And
nothing outside a confirmed generated frame is ever dereferenced, so a broken chain
is a stopped walk rather than a wild read.

{{< note title="A walk that finds no roots" >}}
This is the failure the project had already warned itself about, and it happened
anyway. On Windows the old walk crossed about two Rust frames, reached no generated
code, found **zero** roots, and then climbed off the end of the stack. Told the
stack held nothing, the collector freed the live heap; what crashed was whatever
touched a freed object next, a long way from the fault.

It shipped in `0.1.3` with a green test matrix, because `cargo test` and the
ahead-of-time pass leave different things in the memory the walk was reading. What
caught it was the first W# program anyone ran from a Windows shell rather than from
a test harness. `0.1.4` is the fix.
{{< /note >}}

## A concurrent mark trace for cycles

Two objects pointing at each other keep each other's counts above zero for ever.
Only reachability reclaims them, and reachability is a walk over the whole live
heap. That walk runs on a collector thread while the program continues.

Marking is snapshot-at-the-beginning, and three things make that work:

- The write barrier's snapshot of overwritten references is exactly the record the
  marker needs, so no second barrier was required.
- Objects allocated during the mark are born marked. The mark bit is a **parity**
  that flips per trace, so nothing is ever cleared.
- Nothing is freed while the marker runs.

The sweep afterwards runs on the collector thread too, a block at a time.

## Compaction, also concurrent

Freeing works a line at a time, so a block pinned by a few scattered survivors
stays mostly unusable. The trace copies those survivors out and releases the
block, and the copying runs while the program does.

That is what the **load barrier** is for: every reference read out of a heap object
is resolved to wherever that object lives now, so the program can never hold an
address the collector has abandoned. Whoever reaches an object first, the collector
or the program through the barrier, moves it, and one compare-and-swap on the
header decides whose copy wins.

When nothing is moving, the load barrier costs a load, a test, and a branch that
falls through.

## Holes are refilled

A block with free lines is allocated into again rather than waiting for a trace to
come and evacuate it. On a heap of 300 survivors scattered through 33,000
allocations, that is the difference between holding 28 blocks and holding 8.

## Allocation takes no lock

Each thread bumps through a buffer of its own, publishing the object-start bit and
the line counts atomically and batching the statistics until the buffer is
replaced. The heap lock is for handing out a new buffer, freeing, sweeping and
evacuating, so an allocating thread and a sweeping collector no longer queue behind
each other on every object.

## Three short pauses

Only the mutator can walk its own stack, so the parts that need the stack run on
it:

1. take a root snapshot;
2. finish marking, and move what the roots point at;
3. repoint the references the marker noted.

The third visits a **list**, because the marker records every reference it sees
into a block being emptied, rather than the live heap. So the pause is
proportional to what the program did rather than to what it holds, which is why
120,000 live objects and 15,000 cost the same.

What is left in the pause and *does* grow is the counting collection: reconciling
the write barrier's buffers costs what the program has modified since the last
one, so a program that rewrites a large structure between traces will see
milliseconds rather than microseconds there.

## Interruptible loops

Cranelift makes every call a safepoint and nothing else, so a loop that calls
nothing would be uninterruptible. Each back edge carries a three-instruction poll,
which is also how the collector thread asks the program to stop for its next
pause.

## Blocking is not stopping

A builtin that blocks does so inside a **safe region**, so the collector can walk
that thread's stack and run its pauses while it waits on a syscall. That is what
lets a worker sit on a socket without stalling anybody's collection.

Workers share no heap at all. Nothing one allocates is ever reachable from
another, which is what lets their collectors pause independently, and what makes
everything sent between them a copy.

## Checking it

```sh
wsharp run prog.ws --gc-stress        # collect at every allocation
WSHARP_GC_STATS=1 wsharp run prog.ws  # what the collector did, on exit
WSHARP_GC_TRACE=1 wsharp run prog.ws  # every frame the root walk visits
```

`--gc-stress` collects at every allocation and validates every root the maps
describe. Under it the whole heap is walked after each pause and the run aborts if
the repointing list missed anything.

The end-to-end suite runs twice, once under it, and traces start on the same
allocation schedule in both runs so that the concurrent paths are covered both
ways.

`WSHARP_GC_STATS` reports the number of pauses and the longest, which is how the
numbers on this page are produced.

The prelude exposes the collector directly for tests: `gc_collect`, `gc_trace`,
`gc_trace_start`, `gc_trace_finish`, and the counters `gc_live_objects`,
`gc_live_bytes`, `gc_collections` and `gc_traces`.
