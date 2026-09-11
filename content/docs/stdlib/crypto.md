---
title: "Bytes and cryptography"
description: "std/bytes, std/hash, std/cipher, std/crypto, std/bignum and std/inflate."
weight: 60
---

All of this is W#. Every hash, cipher and arithmetic routine here is a `.ws` file
compiled with your program, monomorphised per use and dropped when nothing calls
it. Each is checked against its published test vectors in the compiler's own
suite.

## std/bytes

```wsharp
const bytes = @import("std/bytes");
```

`[]u8` as a buffer, and the bridge to and from `str`.

| | |
|---|---|
| `new(n) []u8`, `of(s) []u8`, `to_str(b) str` | |
| `slice(b, from, to)`, `concat(a, b)`, `copy(dst, src)` | |
| `fill(b, v)`, `xor(a, b)`, `equal(a, b) bool` | |
| big- and little-endian word accessors | reading and writing `u16`/`u32`/`u64` at an offset |
| `to_hex(b) str`, `from_hex(s) []u8` | |
| `Buf`, which grows | `put_str` `put_bytes` `taken` `reset` |
| `open8`/`close8` through `open32`/`close32` | a length written before the thing it counts |

The `open`/`close` pair is for a frame whose length prefix cannot be known until
the body has been written: `open` reserves the field and hands back a mark, and
`close` goes back and fills it in. Four widths, because TLS needs 8, 16 and 24 and
a PostgreSQL frame header needs 32.

## std/hash

```wsharp
const hash = @import("std/hash");
```

SHA-256, SHA-384 and SHA-512, one-shot and incremental, plus `hmac`,
`hkdf_extract` and `hkdf_expand`.

The three are written **once**, over a `Hash` value that says a block size, a
digest size and how to hash. HMAC and HKDF are then written once as well, over the
same value, rather than once per digest.

## std/cipher

```wsharp
const cipher = @import("std/cipher");
```

ChaCha20, Poly1305 and ChaCha20-Poly1305; AES-128 and AES-256, GHASH, and AES-GCM.

**Constant-time by construction.** No table is indexed by a secret byte, so AES's
S-box is computed in GF(2^8) rather than looked up, and GHASH is 128 shifts rather
than a table of multiples. That is slower than the table version, and it is the
only version that does not leak the key to anything watching the cache.

## std/crypto

```wsharp
const crypto = @import("std/crypto");
```

`random(n) []u8`, from the system's generator, which is the kernel's. There is no
userspace PRNG to seed or to get wrong.

## std/bignum

```wsharp
const bignum = @import("std/bignum");
```

Fixed-width unsigned limbs and Montgomery arithmetic: `from_be` `to_be` `cmp`
`add` `sub` `mont` `mont_mul` `mont_add` `mont_sub` `to_mont` `from_mont`
`modexp`.

A limb is **32 bits**, which is what makes a 64-by-64 to 128 product unnecessary.
Everything above it, the NIST curves and RSA, is written over this one module.

## std/inflate

```wsharp
const inflate = @import("std/inflate");
```

DEFLATE decompression. It is what makes a git packfile and a `.tar.gz` readable,
which is what `ingot` and `sharpie` both needed before they could fetch anything.

## Why this is all in W#

The rule for the whole library is that a builtin may read and write bytes, and
anything that moves a reference from one object into another is written in W#.
Cryptography is almost entirely the second kind: it allocates buffers, slices
them, and hands them to the next stage.

The result is that `http.get("https://…")` is W# the whole way down, and that the
collector's barriers apply to every line of it by construction rather than by
review.
