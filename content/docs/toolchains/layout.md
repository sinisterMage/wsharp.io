---
title: "What a toolchain is"
description: "Not one binary: the directory layout, and why the proxies are copies rather than symlinks."
weight: 20
---

Not one binary. `wsharp` needs something to link against, so an installation is a
directory.

```text
~/.sharpie/
├── bin/{sharpie,wsharp,ingot}     proxies, dispatching on their own name
├── toolchains/<version>-<triple>/ wsharp, ingot, lib/libwsharp_start.a
├── downloads/                     tarballs, kept so a retry need not refetch
├── tmp/                           staging, renamed into place atomically
└── settings.toml
```

`SHARPIE_HOME` moves all of it.

A toolchain directory is named `<version>-<triple>`, with the triple in the name
so that a home directory shared over a network cannot collide.

## Two existing rules make this work

sharpie needed no change to either program it manages, because of two rules that
were already true:

- **`wsharp` looks for its runtime archive beside itself and under `../lib`.**
- **`ingot` looks for `wsharp` beside itself before consulting `PATH`.**

A toolchain directory satisfies both, so a proxy can `exec` straight into one and
everything downstream finds what it needs.

## Why the proxies are copies

The three files in `bin/` are copies of one binary, not symlinks. sharpie reads
which program it should be from `self_exe`, and on Linux that follows a symlink to
its target, so a symlinked `wsharp` would look at itself and see `sharpie`. Three
copies of one binary is the same trade rustup makes.

After `os.exec`, which is `execvp`, there is no sharpie left in the process at
all. It is not a wrapper that stays in the way.

## SHARPIE_HOME is not WSHARP_HOME

These are two variables for two programs, and the split is deliberate:

| | |
|---|---|
| `SHARPIE_HOME` | `~/.sharpie`, where **toolchains** live |
| `WSHARP_HOME` | `~/.wsharp`, `ingot`'s content-addressed **package** store |

It is the same split as `RUSTUP_HOME` and `CARGO_HOME`. Putting them in one tree
would make `ingot gc` and `sharpie uninstall` two programs with an opinion about
the same directory.

## settings.toml

You should not have to edit this, but knowing its shape helps when something is
wrong:

```toml
version = "1"
default = "0.1.1-x86_64-unknown-linux-gnu"
channel = "stable"

[[override]]
path = "/home/you/work/api"
toolchain = "0.1.0-x86_64-unknown-linux-gnu"

[[link]]
name = "dev"
dir = "/home/you/WSharp/target/release"
```

Writes are staged to `settings.toml.new` and renamed, so an interrupted write
cannot leave you with half a file.

`downloads/` keeps tarballs so that a retry after a broken connection does not
refetch, and `tmp/` is where an archive is unpacked before being renamed into
`toolchains/`. An unpack that fails half way leaves nothing behind in
`toolchains/`, which is what lets `sharpie` tell "not installed" from "damaged".
