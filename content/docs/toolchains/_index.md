---
title: "Toolchains"
description: "sharpie installs W# toolchains, keeps several side by side, and lets a directory pin the one it wants."
weight: 60
---

**sharpie** is the version manager for W#, in the mould of `rustup` and
`juliaup`. It installs toolchains, keeps several side by side, puts proxies on
`PATH`, and lets a directory pin the version it wants.

It is written in W#. That is the point rather than a constraint: `ingot` was the
first real program in the language, this is the second, and it leans on
`std/http`, `std/tls`, `std/toml` and `std/inflate` hard enough to find out where
they bend.

## Installing sharpie

```sh
curl -fsSL https://raw.githubusercontent.com/sinisterMage/sharpie/main/install.sh | sh
export PATH="$HOME/.sharpie/bin:$PATH"
```

There is more about what that script does on the [install page](/docs/install/).

Upgrading sharpie is running the same line again. It drops a new binary in and
`init` rewrites the proxies as copies of it, which is why there is no
`self update` verb.

## Using it

```sh
sharpie install stable      # fetch a toolchain and make it the default
wsharp build hello.ws       # through the proxy, into that toolchain
sharpie show                # what would run here, and why
sharpie update              # re-ask the channel and follow it
```

## Channels and versions are different things

```sh
sharpie install stable      # the newest release that is not a prerelease
sharpie install latest      # the newest release of any kind
sharpie install 0.1.0       # exactly that one
```

`stable` and `latest` are **channels**, and `update` re-asks them and follows
wherever they have moved. An exact version is a one-off and is left alone. That
distinction is recorded at install time, so somebody who asked for `0.1.0` is
never quietly moved off it.

## Where versions come from

sharpie reads the tags of the compiler's GitHub repository over git's smart HTTP
protocol, using `ls-refs`. It does not use the forge's REST API, and the reason is
specific: the REST API answers in JSON, W# has no JSON reader, and writing one
would be a few hundred lines standing between sharpie and its first useful act.
Tags matching `v*` are parsed as versions and sorted, and the archive URL is
spelled from the version and the triple rather than looked up. Two plain HTTP
conversations, no new parser.

The archive's `.sha256` sidecar is fetched **first**, because a tag exists before
its assets do. If the sidecar is missing you get a message saying the release may
still be building rather than a confusing download failure. The digest is checked
before anything is unpacked.

## What is here

- [Which toolchain runs](/docs/toolchains/resolution/), the five things that can
  decide and the order they are asked in.
- [What a toolchain is](/docs/toolchains/layout/), the directory layout and why
  the proxies are copies rather than symlinks.
- [Command reference](/docs/toolchains/cli/), every verb and what it prints.
