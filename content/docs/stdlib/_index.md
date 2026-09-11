---
title: "Standard library"
description: "What you can import, from std/str up to std/tls, and the prelude that needs no import at all."
weight: 50
---

Most of the library is written in W# rather than in Rust. `std/array`, `std/list`,
`std/map`, `std/math`, `std/net`, `std/http`, all of the cryptography and
`str.split` are `.ws` files compiled with your program, monomorphised per element
type and dropped when nothing calls them.

The rule that draws the line is worth knowing if you add to it: **a builtin may
read and write bytes, and anything that moves a reference from one object into
another is written in W#**, where the write barrier, the load barrier and the
stack maps all apply by construction.

A library module is read only if something imports it, so a program that mentions
nothing pays for nothing.

## The modules

| Module | |
|---|---|
| `std/str` | `len` `concat` `eq` `substr` `find` `split` `join` `repeat` `replace` `starts_with` `from_int` `from_float` `byte_at` `from_byte` `parse_int` `to_lower` `to_upper` `trim` `hash`. `join` and `repeat` measure, allocate once and copy, so building output from pieces is linear |
| `std/array` | `len` `new` `concat` `push` `slice` `repeat` |
| `std/map` | `Map[V]`, a hash table with `str` keys: `new` `with_capacity` `len` `get` `has` `set` `remove` `keys` `clear` `iter` `next`. Open addressing with tombstones, so a removal does not break the probe run other keys are reached through |
| `std/list` | `List[T]`, a growable array: `new` `with_capacity` `from` `len` `capacity` `get` `set` `push` `pop` `insert` `remove` `extend` `clear` `iter` `next` `to_array` |
| `std/math` | `abs` `min` `max` `sign` `rem` `sqrt` `pow` `floor` `ceil` `round` `trunc` `ipow` |
| `std/bits` | `rotl` `rotr`, rotation, generic over `Integer`, one instruction on both targets; `f64_bits` `f64_from_bits`, an `f64`'s representation, which is what a wire format carries |
| `std/io` | `read_file` `read_line` `write_file` `exists`; the fallible ones name their errors, such as `!{NotFound, PermissionDenied, IoFailed}str` |
| `std/fs` | `mkdir` `mkdir_all` `read_dir` `rename` `remove` `chmod` `is_executable` `modified_at`, and enough of a stat to tell a directory from a file and say how big one is |
| `std/path` | the arithmetic above `std/io` and `std/fs`, and it makes no syscall at all |
| `std/os` | `args` `get` `home` `temp_dir` `cwd` `chdir` `exec` `exit` `self_exe` `target` |
| `std/toml` | TOML 1.0, read and written |
| `std/time` | `now`, seconds since the Unix epoch |
| `std/net` | TCP: `Socket` `Listener`, `connect` `listen` `accept` `read` `write` `write_all` `read_exactly` `read_all` `set_nonblocking` `shutdown` `close`. UDP: `Datagrams` `Peer` `Datagram`, `udp` `send_to` `receive` `reply`. Readiness: `Poller` `Event`, `poller` `watch` `wait` |
| `std/http` | the 27 HTTP status types, plus an HTTP/1.1 client and server: `get` `post` `request` `read_request` `respond` `header` `status_of`, and `https://` over `std/tls` |
| `std/broker` | `Topic[M]` `Consumer[M]`, `topic` `publish` `subscribe` `next` `commit` `seek` `len` |
| `std/bytes` | `[]u8` as a buffer and the bridge to and from `str`: `new` `of` `to_str` `slice` `concat` `copy` `fill` `xor` `equal`, the big- and little-endian word accessors, `to_hex` `from_hex`; and `Buf`, which grows, with `open8`/`close8` through `open32`/`close32` for a length written before what it counts |
| `std/inflate` | DEFLATE decompression, which is what makes a git packfile and a `.tar.gz` readable |
| `std/hash` | SHA-256, SHA-384 and SHA-512, one-shot and incremental, plus `hmac` `hkdf_extract` `hkdf_expand` |
| `std/cipher` | ChaCha20, Poly1305, ChaCha20-Poly1305; AES-128/256, GHASH, AES-GCM. Constant-time by construction |
| `std/crypto` | `random`, the system's generator, which is the kernel's |
| `std/bignum` | fixed-width unsigned limbs and Montgomery arithmetic: `from_be` `to_be` `cmp` `add` `sub` `mont` `mont_mul` `mont_add` `mont_sub` `to_mont` `from_mont` `modexp` |
| `std/curve25519` | `x25519` `x25519_base`, and Ed25519 signing and verification |
| `std/nistec` | `p256` `p384` `derive` `ecdh` `valid` `ecdsa_verify`, the NIST prime curves over `std/bignum` |
| `std/rsa` | `public_key` `verify_pkcs1` `verify_pss`, verification only |
| `std/der` | a strict DER reader: `read_value` `read_seq` `read_uint` `read_oid` `read_bitstring` `read_time` |
| `std/x509` | `SigKey` and its three subtypes, `parse_spki` `verify_signature`, certificates, `matches_host` `verify_chain` `pem_certificates` `system_roots` |
| `std/tls` | TLS 1.3, both ends: `client` `server` `feed` `pending`, and a blocking `Session` over a socket |

## The prelude

Every module has these without importing anything.

| | |
|---|---|
| `print(s: str)`, `print_int(i64)`, `print_uint(u64)`, `print_float(f64)`, `print_bool(bool)` | write a line to stdout; a narrower value is written `print_int(i64(x))`, because conversions are written rather than inferred |
| `assert(c: bool)` | panic if `c` is false |
| `panic_index(i: i64, len: i64)` | the out-of-bounds panic, so a container written in W# reports a bad index exactly as `a[i]` does |
| `gc_collect()` | one reference-counting collection |
| `gc_trace()` | a whole mark trace, synchronously: cycles are reclaimed when it returns |
| `gc_trace_start()`, `gc_trace_finish()` | the two halves of a trace, so a program can mutate the heap while the collector thread marks it |
| `gc_live_objects()`, `gc_live_bytes()`, `gc_collections()`, `gc_traces()` | the collector's counters, for asserting on it |
