---
title: "Networking and messages"
description: "std/net, std/http and std/broker."
weight: 50
---

## std/net

```wsharp
const net = @import("std/net");
```

TCP, UDP and readiness, over the syscalls the runtime declares by hand. IPv4 or
IPv6, with the family the resolver's choice.

**TCP.** `Socket` and `Listener`, with `connect` `listen` `accept` `read` `write`
`write_all` `read_exactly` `read_all` `set_nonblocking` `shutdown` `close`.

**UDP.** `Datagrams` `Peer` and `Datagram`, with `udp` `send_to` `receive`
`reply`.

**Readiness.** `Poller` and `Event`, with `poller` `watch` `wait`.

```wsharp
const net = @import("std/net");

fn main() i64 {
    const l = net.listen("127.0.0.1", 8080, 16) catch return 1;
    const c = net.accept(l) catch return 2;
    net.write_all(c, "hello\n") catch return 3;
    net.close(c);
    return 0;
}
```

A blocking read is safe rather than merely tolerated: a builtin that blocks does
so inside a safe region, so the collector can walk this worker's stack and run its
pauses while the thread waits on the network. `net.poller` is for serving many
connections from **one** worker, not for keeping the collector alive.

### shutdown, and stopping an acceptor

`shutdown(s, read, write)` is the half-close `close` cannot say, and what a
protocol that does not frame its own end needs. Two bools rather than a constant,
as `watch` takes two, because shutting down *neither* direction is the one
combination `shutdown(2)` cannot spell, and here it does nothing rather than being
given an invented meaning.

**On a connected socket it means the same thing on every system. On a `Listener`
it does not**, which is why there is no `shutdown_listener`: Linux wakes a thread
parked in `accept`, and the BSDs answer `ENOTCONN` and leave it parked. So it is
not promised there.

An acceptor that has to be stoppable is a `poller` with a tick, and the stop
signal is whatever the program already has, a `std/broker` topic being the usual
one because it crosses heaps. `@join` on a worker parked in `accept` waits for
ever, which is a program waiting on its own worker. `main` returning ends the
process and takes such a worker with it. See [workers](/docs/tour/workers/).

## std/http

```wsharp
const http = @import("std/http");
```

An HTTP/1.1 client and server, and the 27 status types that
[dispatch](/docs/tour/dispatch/) is demonstrated on.

| | |
|---|---|
| `get(url) !Response`, `post(url, body) !Response`, `request(...) !Response` | client |
| `read_request(conn) !Request`, `respond(conn, code, type, body) !void` | server |
| `header(r, name) ?str` | |
| `status_of(code) Status` | the code as its type |
| `Status`, `Status1xx` to `Status5xx`, and 22 exact codes | the lattice |

`https://` works, over [`std/tls`](/docs/stdlib/tls/), with the chain verified
against the root store the machine already has. Every part of that handshake is a
`.ws` file compiled into your program.

```wsharp
const http = @import("std/http");
const text = @import("std/str");

fn main() i64 {
    const answer = http.get("https://wsharp.io/") catch return 1;
    print_int(answer.code);
    print_int(text.len(answer.body));
    return 0;
}
```

A server:

```wsharp
const net  = @import("std/net");
const http = @import("std/http");

fn main() i64 {
    const l = net.listen("127.0.0.1", 8080, 16) catch return 1;
    const c = http.connection(net.accept(l) catch return 2);
    const request = http.read_request(c) catch return 3;
    http.respond(c, 200, "text/plain", request.path) catch return 4;
    return 0;
}
```

The status types are materialised on first mention, so a program that never names
one pays nothing for the other 26.

## std/broker

```wsharp
const broker = @import("std/broker");
```

Kafka's shape: named topics, partitioned logs, consumer groups with their own
offsets, and replay. It is the counterpart to a worker call, for when the caller
does not need the answer or when more than one worker wants the same message.

| | |
|---|---|
| `topic(name, partitions) Topic[M]` | |
| `publish(t, key, message) void` | the key chooses the partition |
| `subscribe(t, group) Consumer[M]` | |
| `next(c) ?M` | which is why the loop is a `while` with a capture |
| `commit(c) void`, `seek(c, offset) void` | |
| `len(t) i64` | |

```wsharp
var audit: broker.Topic[Event] = broker.topic("audit", 2);
broker.publish(audit, "orders", Finished{ .at = 1, .count = 5 });

var reader: broker.Consumer[Event] = broker.subscribe(audit, "report");
while (broker.next(reader)) |e| { report(e); }
broker.commit(reader);
```

A subscriber set is an overload set. `report` being three functions over `Event`
and its subtypes means choosing between them is the dispatcher, one subtract and
one unsigned compare on the type id the message carried with it. Nothing in the
broker knows those functions exist. See [workers](/docs/tour/workers/).
