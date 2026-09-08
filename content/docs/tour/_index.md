---
title: "The tour"
description: "Eight short programs, each showing one thing W# does differently."
weight: 30
---

Every program on these pages is a real file in the compiler's repository, run by
its test suite on every commit, and quoted here in full rather than trimmed. You
can follow along:

```sh
git clone https://github.com/sinisterMage/WSharp
cd WSharp
wsharp run examples/status.ws
```

The order matters a little. [Dispatch](/docs/tour/dispatch/) and
[Inference](/docs/tour/inference/) are the two ideas the rest of the language is
arranged around, so read those first. After that the pages are largely
independent.
