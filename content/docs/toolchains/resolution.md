---
title: "Which toolchain runs"
description: "Five things can decide, and the first that answers wins."
weight: 10
---

When you type `wsharp`, you reach a proxy in `~/.sharpie/bin` rather than a
compiler. It works out which toolchain you meant and `exec`s into it. Five things
can decide, and the first that answers wins:

1. **`+name` in front of a proxied command**, as in `wsharp +0.1.0 build x.ws`
2. **`SHARPIE_TOOLCHAIN`** in the environment
3. **`wsharp-toolchain.toml`**, looked for from the working directory upwards
4. **a directory override**, set with `sharpie override set 0.1.0`
5. **the default**, set with `sharpie default 0.1.0`

The order is rustup's, and each rung is more specific and more deliberate than the
one below it.

```sh
sharpie show
```

```text
home	/home/you/.sharpie
target	x86_64-unknown-linux-gnu
toolchain	0.1.1-x86_64-unknown-linux-gnu	default
directory	/home/you/project
```

`show` prints which rung answered, because that is the first question when the
answer surprises somebody.

## A missing toolchain stops the search

A rung naming a toolchain that is not installed **stops there** rather than
falling through to the next one. Quietly running a different compiler than the one
that was asked for, and saying nothing about it, is worse than refusing.

So `wsharp +0.1.0 build x.ws` with `0.1.0` not installed is an error, not a build
with `0.1.1`.

## Pinning a project

`wsharp-toolchain.toml` is looked for from the working directory upwards, to the
filesystem root, so it pins a whole tree. Two spellings are accepted:

```toml
toolchain = "0.1.0"
```

```toml
[toolchain]
channel = "stable"
```

Commit it, and everybody building the project gets the compiler it was written
for.

## Pinning a directory without a file

An override records the pin in sharpie's own settings rather than in the project:

```sh
sharpie override set 0.1.0          # this directory
sharpie override set 0.1.0 ~/work   # a named one
sharpie override unset
sharpie override list
```

Overrides match on whole path components and the **longest matching path wins**,
so an override on `~/work/api` beats one on `~/work`.

Use a file when the pin belongs to the project and everyone should have it. Use an
override when it belongs to you.

## Naming a directory you built yourself

A compiler checkout is a toolchain if it has a `wsharp` in it:

```sh
sharpie toolchain link dev ../WSharp/target/release
wsharp +dev check x.ws
```

`link` copies nothing and checks at link time that there is a `wsharp` inside. It
is how you test a change to the compiler against a real project without
installing anything.

## Everything sharpie reads

| | |
|---|---|
| `SHARPIE_HOME` | where toolchains live, `~/.sharpie` by default |
| `SHARPIE_TOOLCHAIN` | rung 2 above |
| `SHARPIE_VERSION` | which sharpie the installer fetches |
| `SHARPIE_REPO` | which repository the installer fetches it from |

`WSHARP_HOME` is a different variable belonging to a different program. See
[what a toolchain is](/docs/toolchains/layout/).
