---
title: "Packages"
description: "ingot resolves and installs, Foundry is the registry, and a hash rather than a host is what gets trusted."
weight: 70
---

`ingot` is the package manager. `wsharp` stays the compiler, and the split is on
purpose: one of them has to work on a machine with no network and no store, and
the other is the thing that fills the store.

```sh
ingot init myapp                    # write an ingot.toml here
ingot add acme/json                 # record a dependency, from the registry
ingot add util --path ../util       # or on a directory
ingot resolve                       # choose versions and write ingot.lock
ingot install                       # make the store satisfy it
ingot verify                        # 0 ready, 1 install, 2 resolve, 3 broken
ingot why core                      # the paths that pulled it in
```

Resolving, installing and building are separate verbs, so nothing compiles because
something else was fetched.

## Commands

```text
ingot -- the W# package manager

  init [name]              write an ingot.toml here
  add <name> [version]     record a dependency, newest by default
  add <name> --path <dir>  record a dependency on a directory
  remove <name>            take one out
  update                   fetch the registry index again
  search [text]            what the registry holds
  resolve                  choose versions and write ingot.lock
  install                  make the store satisfy ingot.lock
  verify                   0 ready, 1 install, 2 resolve, 3 broken
  list                     what the lockfile holds
  why <name>               the paths that pulled it in
  gc                       drop store entries nothing reaches
  store                    where the store is, and what is in it
  run <file.ws> [args]     compile and run a program
```

`-C <dir>` before any verb changes directory first. Output is tab-separated, one
record a line, and `verify` answers with its exit status.

## A manifest

```toml
[package]
name = "myapp"
version = "0.1.0"
root = "src/myapp.ws"

[dependencies]
"acme/json" = "^1.2.0"
util = { path = "../util" }
```

A dependency is a version, a directory, or a git revision. A package presents
exactly **one** file, the `root`, and what else it shows is what that file
re-exports.

## The resolver says why

Resolution is PubGrub over version *sets* as unions of intervals, so a conflict
comes back as the derivation that caused it rather than as the bare fact that
there was one:

```text
Because no versions of core match >=2.0.0 <3.0.0 and util 0.3.0 depends on
core >=2.0.0 <3.0.0, util 0.3.0 cannot be used.
```

## A hash rather than a host

A registry release records the hash of its own tree, and that hash is the store
key. So `resolve` chooses versions and writes a lockfile **having fetched no
package at all**, and the fetch `install` does afterwards is checked against that
hash.

The client trusts a hash rather than a host, and the registry's CI is what makes
the hash a promise: every entry is fetched and hashed before it is merged.

Packages are W# source. Nothing is precompiled, because `wsharp build` is
ahead-of-time and the machine that installs is the machine that compiles.

## The store

Packages live in a content-addressed store under `~/.wsharp`, named by the hash of
their tree, so two projects that want the same tree share one copy. `ingot gc`
drops what no lockfile reaches, and `WSHARP_HOME` moves the whole thing.

`WSHARP_HOME` is not `SHARPIE_HOME`. See
[what a toolchain is](/docs/toolchains/layout/).

## Using a package

After `ingot install`, a package is just a module path:

```wsharp
const util = @import("util");

fn main() i64 { return util.twice(21); }
```

That works under plain `wsharp run` as well as `ingot run`. `install` writes an
`ingot.env` beside the lockfile saying where each package's files ended up, and
the compiler reads it. A module may import only what its own `ingot.toml` asked
for, even though the lockfile holds the whole graph.

## The registry

[Foundry]({{< param foundryRepo >}}) is an index of plain TOML in a git
repository, in the shape of Julia's General.

```sh
ingot add acme/json          # the newest published version, as a caret
ingot search json            # what is published
ingot update                 # fetch the index again
```

A registry is a **directory**, and cloning one over git is only how the directory
arrives. `INGOT_REGISTRY` naming a directory is used where it lies and never
fetched, which is what a private registry is, an offline one, and how this project
tests the whole path with no server at all. A path or git dependency overrides the
registry for the name it supplies.

To publish something, see [publishing](/docs/packages/publishing/).

## ingot is a W# program

That was the point rather than a flourish: a resolver, a hash, a protocol and a
file format is a broad enough program to find out what the language is actually
missing.

It is now written in W# **all the way out**. There is no Rust driver behind it and
`cargo build` does not produce it; `wsharp build --module ingot/main -o ingot`
does, which makes the package manager the first real user of the compiler's own
`build`. Its `-C` is `os.chdir`, its diagnostics go to stderr, and `ingot run`
becomes `wsharp run` through `os.exec` rather than embedding a compiler a W#
program cannot have.

Git is spoken rather than shelled out to: SHA-1, zlib inflate, pkt-line framing
and a packfile with both kinds of delta resolved, all of it W#, replayed against a
conversation a real `git upload-pack` took part in.
