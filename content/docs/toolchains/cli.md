---
title: "sharpie command reference"
description: "Every verb, what it takes, and what it prints."
weight: 30
---

```text
sharpie -- the W# version manager

  init                          make ~/.sharpie and its proxies
  install <version|channel>     fetch a toolchain and keep it
  uninstall <toolchain>         take one away
  update                        re-ask the channel and follow it
  show                          what would run here, and why
  which <command>               where that command actually is
  default <toolchain>           use this one when nothing else says
  toolchain list                what is installed and what is linked
  toolchain link <name> <dir>   name a directory that holds a toolchain
  override set <toolchain>      pin this directory to one
  override unset | list         drop one, or show them all
  version                       which sharpie this is
  help                          this
```

Output is **tab-separated, one record a line**, as `ingot`'s is, so it composes
with `cut` instead of needing a `--json` that would have to be kept in step with
it.

`-C <dir>` is accepted before any verb and changes directory first.

## The verbs

### init

Creates `~/.sharpie` and writes the three proxies. The installer runs it for you;
you would run it yourself only to repair a broken `bin/`.

```text
proxy	/home/you/.sharpie/bin/sharpie
proxy	/home/you/.sharpie/bin/wsharp
proxy	/home/you/.sharpie/bin/ingot
home	/home/you/.sharpie
bin	/home/you/.sharpie/bin
```

### install

Takes exactly one version or channel.

```sh
sharpie install stable
sharpie install 0.1.0
```

```text
installed	0.1.1-x86_64-unknown-linux-gnu
default	0.1.1-x86_64-unknown-linux-gnu
```

`already` replaces `installed` when the toolchain is present. The `default` record
appears only when this install adopted the default, which happens when there was
not one.

### update

Re-asks the channel this installation follows and installs what it now names.
An exact version is left alone.

```text
current	stable	0.1.1-x86_64-unknown-linux-gnu
```

### uninstall

```text
removed	0.1.0-x86_64-unknown-linux-gnu
warning	that was the default; set another with `sharpie default`
```

### show

What would run in this directory, and which rung of
[the ladder](/docs/toolchains/resolution/) decided it.

```text
home	/home/you/.sharpie
target	x86_64-unknown-linux-gnu
toolchain	0.1.1-x86_64-unknown-linux-gnu	default
directory	/home/you/project
```

### which

Where a proxied command actually is, after resolution.

```sh
sharpie which wsharp
```

### default

Sets the toolchain used when nothing more specific says. Refuses a name that is
not installed.

### toolchain

```sh
sharpie toolchain list
sharpie toolchain link dev ../WSharp/target/release
```

```text
installed	0.1.1-x86_64-unknown-linux-gnu	default
installed	0.1.0-x86_64-unknown-linux-gnu
linked	dev	/home/you/WSharp/target/release
```

### override

```sh
sharpie override set 0.1.0            # this directory
sharpie override set 0.1.0 ~/work     # a named one
sharpie override unset [directory]
sharpie override list
```

```text
override	/home/you/work	0.1.0-x86_64-unknown-linux-gnu
```

## Exit codes

| | |
|---|---|
| `0` | it worked |
| `1` | nothing is wrong; the answer is just no |
| `2` | it failed, and the reason is on stderr, prefixed `sharpie: ` |

The middle one matters for scripting. `sharpie which` when there is no toolchain,
and `sharpie show` when nothing has been chosen, are not errors, so they do not
exit like one.
