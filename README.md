# wsharp.io

The documentation site for [W#](https://github.com/sinisterMage/WSharp), built
with Hugo and deployed to a VPS by GitHub Actions on every push to `main`.

```sh
nix-shell --run "hugo server -D"      # http://localhost:1313
nix-shell --run "hugo --minify --gc"  # a production build, into public/
./scripts/check-style.sh              # the house-style gate
```

Outside Nix, any Hugo 0.146 or newer will do, and it has to be the **extended**
build. There is no Go toolchain to install, because no Hugo Modules are used, and
no npm, because there is no JavaScript to bundle.

## House style

**No em-dashes and no en-dashes.** Use a comma, a colon, a semicolon, parentheses,
or two sentences. Almost every paragraph this site is adapted from has one, so the
rule is enforced rather than remembered: `scripts/check-style.sh` fails the build,
and it runs in CI before anything else.

ASCII `--` inside a `.ws` code sample is not an em-dash and is left alone.

British spelling, to match the compiler's own prose: *organise*, *monomorphised*,
*behaviour*.

## Layout

| | |
|---|---|
| `content/` | every page, as Markdown with `weight` deciding sidebar order |
| `layouts/` | the theme; there is no `themes/` directory, and no third-party theme |
| `assets/css/` | `main.css` is the design system, `chroma.css` is syntax colouring |
| `assets/js/` | the theme toggle, the sidebar disclosure, and search. No framework |
| `assets/examples/` | the compiler's `examples/*.ws`, vendored; see below |
| `scripts/` | the style gate, the example sync, and a manual deploy |

## The examples are vendored

The tour quotes `examples/*.ws` from the compiler's repository verbatim, through
the `{{< example "status.ws" >}}` shortcode. CI has no checkout of WSharp, so the
files live here too. To update them:

```sh
./scripts/sync-examples.sh ../WSharp
```

Edit them upstream, never here.

## W# syntax highlighting

Chroma has no W# lexer and writing one would mean a Go build, so
`layouts/_markup/render-codeblock.html` maps a ` ```wsharp ` fence onto Zig's
lexer, which is a close fit: `const` `var` `fn` `pub` `struct` `try` `catch`
`orelse`, `error.Name`, `@import`, `//` comments and the `for (xs) |x, i|` capture
syntax all tokenise correctly. The label the reader sees still says W#, and
`assets/js/nav.js` repaints the two abstract type names Zig has never heard of.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds, runs the style gate and an
internal link check, and rsyncs `public/` to the server. Pull requests build and
are checked but never reach it.

Five repository secrets are needed: `DEPLOY_KEY`, `KNOWN_HOSTS`, `DEPLOY_HOST`,
`DEPLOY_USER` and `DEPLOY_PATH`.

`scripts/deploy.sh` does the same thing from a laptop.

## Licence

MIT, as W# is.
