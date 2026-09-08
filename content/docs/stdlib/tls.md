---
title: "TLS and certificates"
description: "std/curve25519, std/nistec, std/rsa, std/der, std/x509 and std/tls."
weight: 70
---

TLS 1.3, client and server, written in W#. The whole client and server are
replayed against RFC 8448's published traces byte for byte in the compiler's test
suite.

You do not normally reach for these directly. `http.get("https://…")` is what they
are for.

## std/curve25519

```wsharp
const curve25519 = @import("std/curve25519");
```

`x25519` and `x25519_base` for key agreement, and Ed25519 signing and
verification.

The small-order check is on the **output** rather than on a list of bad
encodings, which is the check a list of bad encodings misses.

## std/nistec

```wsharp
const nistec = @import("std/nistec");
```

`p256` `p384` `derive` `ecdh` `valid` `ecdsa_verify`: the NIST prime curves,
one implementation over [`std/bignum`](/docs/stdlib/crypto/), with the key-share
validation RFC 8446 requires.

## std/rsa

```wsharp
const rsa = @import("std/rsa");
```

`public_key`, `verify_pkcs1`, `verify_pss`. **Verification only**, since TLS 1.3
does no RSA key exchange. The encoded message is built and compared rather than
parsed, which is the shape that does not have a padding oracle in it.

## std/der

```wsharp
const der = @import("std/der");
```

A strict DER reader: `read_value` `read_seq` `read_uint` `read_oid`
`read_bitstring` `read_time`. Strict means a non-minimal length or a non-canonical
encoding is rejected rather than accepted and normalised.

## std/x509

```wsharp
const x509 = @import("std/x509");
```

| | |
|---|---|
| `SigKey` and its three subtypes | RSA, an ECDSA curve, or Ed25519 |
| `parse_spki`, `verify_signature` | |
| `matches_host(cert, host) bool` | |
| `verify_chain(chain, roots, host) !void` | |
| `pem_certificates(text) []Certificate` | |
| `system_roots() []Certificate` | the trust anchors the machine already has |

`SigKey` having three subtypes is dispatch again: which verification runs is
chosen by the key's type rather than by a tag the parser wrote down.

## std/tls

```wsharp
const tls = @import("std/tls");
```

| | |
|---|---|
| `client(...)`, `server(...)` | a handshake state machine |
| `feed(s, bytes)`, `pending(s)` | drive it with bytes, take bytes out |
| `Session` | the blocking version, over a `std/net` socket |

The state machine is separate from the socket on purpose: `feed` and `pending` are
what let the RFC 8448 traces be replayed as bytes, with no network in the test.

## What works and what does not

`example.com`, `github.com`, `nixos.org`, `www.cloudflare.com` and `crates.io` all
work, which between them cover RSA, P-256 and P-384 chains.

What does not is a chain through a **P-521** key. There is one such root in a
typical store, and it is the last item still open on the roadmap.
