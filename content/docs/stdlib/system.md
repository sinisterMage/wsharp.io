---
title: "Files and the system"
description: "std/io, std/fs, std/path, std/os and std/toml."
weight: 40
---

The operating system is declared by hand, on three platform arms: Linux,
macOS with the BSDs, and Windows. The runtime crate has no dependencies at all.

## std/io

```wsharp
const io = @import("std/io");
```

Whole files, and one line at a time.

| | |
|---|---|
| `read_file(path) !{NotFound, PermissionDenied, IoFailed}str` | |
| `write_file(path, contents) !...void` | |
| `read_line() !str` | from stdin |
| `exists(path) bool` | |

The fallible ones name their errors, which is the point of error sets: the `e`
bound by `catch |e|` is worth testing against.

```wsharp
const text = io.read_file("config.toml") catch |e|
    if (e == error.NotFound) "" else return 1;
```

## std/fs

```wsharp
const fs = @import("std/fs");
```

The tree the files sit in.

| | |
|---|---|
| `mkdir(path)`, `mkdir_all(path)` | |
| `read_dir(path)` | |
| `rename(from, to)`, `remove(path)` | |
| `chmod(path, mode)`, `is_executable(path) bool` | |
| `modified_at(path) !i64` | seconds since the Unix epoch, the clock `time.now()` reads |

`chmod` and `is_executable` are what a program that *writes another program*
needs: a file written by `io.write_file` is `0o644`, and `0o644` is not a thing
that can be run.

There is no mode *reader*. That would mean a `struct stat`, whose layout differs
on every system in the BSD family, and the question worth asking is "will this
start" rather than "which bits are set". `modified_at` below is the one question
this layer asks that a system may make the runtime read one for, and it is asked
anyway.

Windows has no permission bits, so `chmod` succeeds there without doing anything
and `is_executable` is `exists`. A path that is not there is an error on every
platform, though: "succeeded and did nothing" is honest about permissions this
system does not keep and a lie about a file that does not exist.

Enough of a stat exists to tell a directory from a file and to say how big one is.

### modified_at

This is the one question in this layer that does not have a one-number answer
everywhere, and it is asked anyway: a tool watching files it just wrote would
otherwise have to hash the whole tree on every tick.

`is_dir` is `opendir` succeeding, `size` is `lseek` to the end, and
`is_executable` is `access(X_OK)`, so those three cost nothing. For this one,
Linux uses `statx`, whose struct is kernel UAPI and so has one layout on every
architecture; macOS uses `getattrlist`, which hands back the attributes asked for
and no struct at all; and Windows reads a field `GetFileAttributesExW` was already
fetching and throwing away. Only the BSDs meet `struct stat`, as one offset each.

## std/path

```wsharp
const path = @import("std/path");
```

The arithmetic above the other two, and it makes **no syscall at all**: joining,
splitting, extensions, and the difference between a path that begins at a root and
one that does not. A Windows path begins at its drive, not at `/`, which is why
this is a module rather than string concatenation.

## std/os

```wsharp
const os = @import("std/os");
```

What the process knows about itself.

| | |
|---|---|
| `args() []str` | everything after `--` on the command line |
| `get(name) ?str` | an environment variable |
| `home() str`, `temp_dir() str`, `cwd() str` | |
| `chdir(path) !void` | |
| `exec(program, args) !void` | `execvp`: on success it does not return |
| `exit(code: i64) void` | stop this process, low byte, stopping nothing first |
| `self_exe() str` | the path of the running program |
| `target() str` | the triple this binary was built for |

`os.exec` is what makes sharpie's proxies work: after it, there is no sharpie left
in the process at all.

`os.exit` **stops nothing**, deliberately: an exit a worker can block is not an
exit. `main` returning is the ordinary way out, and it stops the workers it can on
the way; this is the one for a program that wants out from somewhere else, or from
inside a worker. Sockets are released and `WSHARP_GC_STATS=1` still reports, so
the exit looks the same from outside however it was reached. Like `exec`, it never
returns, which is a thing the type system cannot say: code after a call to it is
dead and W# will not tell you so.

## std/toml

```wsharp
const toml = @import("std/toml");
```

TOML 1.0, read and written, in W#. It is what `ingot.toml`, `ingot.lock` and
sharpie's `settings.toml` are made of.

## Blocking is safe

A builtin that blocks does so inside a **safe region**, so the collector can walk
that thread's stack and run its pauses while it waits. A blocking read is
therefore safe rather than merely tolerated, and it is why a worker can sit on a
socket without stalling anybody's collection.
