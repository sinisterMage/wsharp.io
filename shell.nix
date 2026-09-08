# Development shell for the wsharp.io documentation site.
#
# The site is built with Hugo and nothing else: no Go toolchain, because no
# Hugo Modules are used, and no npm, because there is no JavaScript to bundle.
#
# Usage:
#   nix-shell                        # interactive shell with hugo on PATH
#   nix-shell --run "hugo server -D"
#   nix-shell --run "hugo --minify --gc"
{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  name = "wsharp-doc-site";

  nativeBuildInputs = [
    # nixpkgs ships the extended build, which is what the asset pipeline wants.
    pkgs.hugo
    # `scripts/deploy.sh` uses these.
    pkgs.rsync
    pkgs.openssh
  ];

  shellHook = ''
    echo "wsharp.io: $(hugo version)"
  '';
}
