---
title: "Publishing to Foundry"
description: "Make a release in your own repository, then add one block to the registry."
weight: 10
---

Two steps: make a release in your own repository, then open a pull request
against [Foundry]({{< param foundryRepo >}}) adding one block.

## 1. Your package

A package is a directory with an `ingot.toml` and the source it names.

```toml
[package]
name = "acme/json"
version = "1.2.0"
root = "src/json.ws"      # optional; `acme/json` defaults to src/json.ws

[dependencies]
"acme/http" = "^1.0.0"
```

The registry enforces four rules, so it is cheaper to know them now.

**The name is two lowercase segments**, `owner/name`, each matching
`[a-z0-9][a-z0-9-]*`. Lowercase because a case-insensitive filesystem would
otherwise make two names one directory, and two segments because a bare name in a
shared registry is a landgrab. `std/…` and `ingot/…` are not available: the
compiler resolves those before it looks at any package.

**`version` must match the version you publish.**

**`root` must exist.** It is the one file an `@import` of your package resolves
to. A package presents one file, and what else it shows is what that file
re-exports.

**Dependencies must themselves be in the registry.** A published package cannot
depend on a `path` or a `git` revision, because nobody else can resolve those.

Then commit, and note the **full 40-character commit id**. A tag is good practice
and is not what the registry records: a tag can be moved and a commit cannot.

## 2. The hash

The registry records what your package's tree hashes to, so that everybody who
installs it can check they got the same bytes. Ask `ingot` for it:

```sh
ingot -C path/to/your/package resolve
ingot -C path/to/your/package list
```

The `tree` column of your own package's row is the value: `sha256:` and 64 hex
characters. It is a hash of the *files* rather than of the git objects, sorted by
name, with sizes, and with permissions and timestamps deliberately left out,
because a package is its text.

## 3. The pull request

Add or edit exactly two files.

`packages/acme/json/package.toml`, once, when the package is new:

```toml
[package]
name = "acme/json"
repo = "https://github.com/acme/json.git"
description = "JSON, read and written."
```

`repo` must be `https://`. The git client speaks HTTP and HTTPS and nothing else:
no `ssh://`, no `git@host:path`.

`packages/acme/json/versions.toml`, **appending** a block at the end, because
versions ascend:

```toml
[[version]]
version = "1.2.0"
rev = "8f2c4e1a9b3d5f7061c2a4e6b8d0f2a4c6e8b0d2"
tree = "sha256:9f3ad0..."

[version.dependencies]
"acme/http" = "^1.0.0"
```

Foundry's CI fetches the commit, hashes the tree, and refuses the pull request if
the hash disagrees. That check is what makes the hash a promise rather than a
claim.

## A published version is never edited

Once a `[[version]]` block is merged, its `version`, `rev` and `tree` do not
change. Not to fix a typo, and not to repoint at a better commit.

This is not tidiness. `ingot` memoises a source string to a tree digest and never
invalidates that memo, because `reg+acme/json@1.2.0` is supposed to name one tree
for ever. A version edited after the fact would be a stale entry on every machine
that had already fetched it, with nothing able to clear it, and the people holding
the old bytes are exactly the people who already depend on you.

A mistake is a **new version**. That is what patch numbers are for.

## Yanking

The one permitted edit to an existing block is adding `yanked = true`.

```toml
[[version]]
version = "1.2.0"
rev = "..."
tree = "sha256:..."
yanked = true
```

A yanked version is not offered to the resolver, so `ingot add` will not pick it
and a fresh `ingot resolve` will not choose it. It stays readable, so a lockfile
that already names it still installs. Deleting the entry instead would break
builds somebody already shipped, and a registry that can retroactively do that is
not one worth depending on.

Yank when a version is broken or was published in error. Yanking is **not** how a
security problem is fixed: publish the fix as a new version *and* yank the bad
one, so that people are moved forward rather than merely stopped.

The full policy is in [Foundry's own docs]({{< param foundryRepo >}}/blob/main/docs/POLICY.md).
