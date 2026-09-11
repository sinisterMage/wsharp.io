---
title: "Install"
description: "One line through sharpie, a release tarball, or a build from source."
weight: 10
---

## Through sharpie

[sharpie](/docs/toolchains/) is the version manager for W#, in the mould of
`rustup` and `juliaup`. It is the recommended way in, because it is also the only
way that makes upgrading and per-project pinning possible later.

```sh
curl -fsSL https://raw.githubusercontent.com/sinisterMage/sharpie/main/install.sh | sh
export PATH="$HOME/.sharpie/bin:$PATH"
sharpie install stable
```

The installer prints that `PATH` line with the right directory already in it, so
you can copy it from your terminal rather than from here. Put it in your shell's
profile to make it stick.

Then check that everything answers:

```sh
sharpie show
wsharp --help
ingot --help
```

Piping a script into a shell deserves an explanation, so here is what that one
does. It needs only `uname`, `tar` and one of `curl` or `wget`. It works out your
platform triple from `uname -s` and `uname -m`, follows the redirect on
sharpie's `releases/latest` to find the newest version, downloads one tarball and
its published `.sha256` sidecar, and **refuses to continue if it cannot check the
digest**: it will not install from an unverified download even if you have no
`sha256sum`. It then copies a single binary into `~/.sharpie/bin` and hands over
to `sharpie init`.

Two environment variables change what it does. `SHARPIE_HOME` says where to
install, and `SHARPIE_VERSION` pins a version instead of taking the newest. You
need `SHARPIE_VERSION` if you have `wget` but not `curl`, because finding the
latest version is a redirect that only `curl` is asked to follow.

Upgrading sharpie is running the same line again. It drops a new binary in and
`init` rewrites the proxies as copies of it, which is why there is no
`self update` verb.

{{< note title="What you just installed" >}}
sharpie is itself a W# program, built by `wsharp` and linked against the runtime,
so it needs no W# installation to run. `ingot` is one too. That is the point
rather than a flourish: a resolver, a hash, a protocol and a file format is a
broad enough program to find out what the language is actually missing.
{{< /note >}}

## From a release tarball

If you would rather not pipe a script into a shell, take the toolchain directly.
Releases are published on
[GitHub]({{< param repo >}}/releases), one tarball per platform with a `.sha256`
beside it.

```sh
version=0.1.5
triple=x86_64-unknown-linux-gnu

curl -fsSLO "https://github.com/sinisterMage/WSharp/releases/download/v${version}/wsharp-${version}-${triple}.tar.gz"
curl -fsSLO "https://github.com/sinisterMage/WSharp/releases/download/v${version}/wsharp-${version}-${triple}.tar.gz.sha256"
sha256sum -c "wsharp-${version}-${triple}.tar.gz.sha256"
tar xzf "wsharp-${version}-${triple}.tar.gz"
```

What comes out is a **directory, not one binary**:

```text
wsharp-0.1.5-x86_64-unknown-linux-gnu/
├── wsharp
├── ingot
├── lib/libwsharp_start.a
├── README.md
└── LICENSE
```

The archive matters. `wsharp build` links your program against it, and `wsharp`
looks for it beside itself and under `../lib`, so moving `wsharp` out of that
directory and onto your `PATH` on its own will break `build` while leaving
`run` and `check` working. Put the whole directory somewhere and add its top
level to `PATH`, or let sharpie handle it.

`ingot` finds `wsharp` beside itself before consulting `PATH`, for the same
reason.

## From source

You need Rust 1.95 or newer and a C toolchain, because rustc shells out to `cc`
to link.

```sh
git clone https://github.com/sinisterMage/WSharp
cd WSharp
cargo test --workspace
cargo run -p wsharp-cli -- run examples/status.ws
```

On a bare NixOS box there is no `cc` on `PATH`, so the repository provides a dev
shell:

```sh
nix-shell                         # rustc and cargo from the system, cc from nixpkgs
nix-shell --run "cargo run -p wsharp-cli -- run examples/status.ws"
```

{{< note title="Do not remove the frame pointers" >}}
`.cargo/config.toml` sets `-Cforce-frame-pointers=yes` for the whole workspace.
The collector finds its roots by walking frames, and it needs every frame between
itself and the generated code it is looking for. A build without it compiles and
then collects the wrong objects. It reaches the Windows target too, and does not
by itself make the chain followable there, which is why that half of the walk asks
the unwind tables instead. See [the collector](/docs/internals/collector/).
{{< /note >}}

`ingot` is not built by cargo. It is a W# program, bootstrapped by the compiler
you just built:

```sh
cargo run -p wsharp-cli -- build --module ingot/main -o ingot
```

## Platforms

Four:

| Triple | |
|---|---|
| `x86_64-unknown-linux-gnu` | Linux on x86-64 |
| `aarch64-apple-darwin` | macOS on Apple silicon |
| `x86_64-apple-darwin` | macOS on Intel |
| `x86_64-pc-windows-msvc` | Windows on x86-64 |

Windows was out of the release matrix until `0.1.3`, and the reason recorded here
for a long time was the wrong one. `fs.mkdir_all` was blamed and was never at
fault; the collector's root walk was. See [status](/docs/status/).

On Windows the runtime archive is named `wsharp_start.lib`, because cargo names a
staticlib after the platform rather than after the crate, and `wsharp` looks for
both spellings. Linking wants **clang** rather than MSVC's `cl.exe`, which does
not understand the `-o` the linker driver passes, so set `CC=clang` if `cc` is
not on `PATH`.

Architectures other than x86-64 and aarch64 do not build at all: the collector
reads the frame pointer with inline assembly, and everything else gets a
`compile_error!`.

## Next

[Getting started](/docs/getting-started/) is a first program and the three
commands that act on it.
