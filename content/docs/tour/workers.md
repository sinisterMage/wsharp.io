---
title: "Workers and the broker"
description: "Threads that own their heaps, talking by typed calls or through a partitioned log."
weight: 80
---

A worker is an OS thread with a heap of its own. Nothing either side allocates is
ever reachable from the other, which is what lets their collectors pause
independently, and what makes everything sent a copy.

{{< example "workers.ws" >}}

```sh
wsharp run examples/workers.ws
```

## A service is an ordinary module

`@spawn(counter, 0, "orders")` starts a thread running the module `counter`,
passing `0` and `"orders"` to its `init`. From then on, any function in that
module taking the state as its first parameter is something the worker can be
asked to do, reached as a method on the handle:

```wsharp
const orders = @spawn(counter, 0, "orders") catch return 1;
const total  = orders.add(7) catch |e| -1;
@join(orders) catch return 2;
```

No new declaration form was needed for this, and the reason is worth knowing: W#
has no mutable globals, so a worker's state had to be an explicit value passed in
and out. Once it is, the functions that take it are exactly the things the worker
can be asked to do. A function that does not take the state, like `counter.helper`,
is not reachable through a handle at all.

## A call returns an error union

`orders.add(i)` has type `!i64`, because a worker can die, and that is not an
exceptional case worth a second mechanism:

```wsharp
const total = orders.add(i) catch |e| if (e == error.WorkerDied) -1 else -2;
```

`@join` waits for the worker and is fallible for the same reason.

## The broker

RPC is for when the caller needs the answer. `std/broker` is for when it does
not, or when more than one worker wants the same message. It is shaped like
Kafka: named topics, partitioned logs, consumer groups with their own offsets,
and replay.

```wsharp
var audit: broker.Topic[Event] = broker.topic("audit", 2);
broker.publish(audit, "orders", Finished{ .at = 1, .count = 5 });

var reader: broker.Consumer[Event] = broker.subscribe(audit, "report");
while (broker.next(reader)) |e| { report(e); }
broker.commit(reader);
```

The second argument to `publish` is the partition key, and `2` is how many
partitions the topic has. `next` returns `?Event`, which is why the loop is a
`while` with a payload capture, and `commit` records how far this consumer got.

## The subscriber set is an overload set

This is where the two halves of the language meet. `report` is three functions:

```wsharp
fn report(e: Event)    void { print("something happened"); }
fn report(e: Finished) void { print(...e.count...); }
fn report(e: Failed)   void { print(...e.why...); }
```

`Finished` and `Failed` are subtypes of `Event`, so both publish into a
`Topic[Event]`. What comes back out of `next` is statically an `Event`, so
choosing which `report` runs is a dispatch, and it is the same two instructions as
everywhere else: one subtract and one unsigned compare on the type id the message
carried with it. Nothing in the broker knows the three `report` functions exist.

## Blocking is safe here

A builtin that blocks does so inside a **safe region**, so the collector can walk
this worker's stack and run its pauses while the thread waits on the network. A
blocking read is therefore safe rather than merely tolerated, and
`net.poller` is for serving many connections from one worker rather than for
keeping the collector alive.
