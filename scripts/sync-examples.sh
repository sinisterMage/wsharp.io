#!/usr/bin/env sh
# Vendor the compiler's example programs into the site.
#
# The tour quotes examples/*.ws verbatim, and CI has no checkout of WSharp, so
# the files live here too. This copies them across and is the only supported way
# to change assets/examples: edit them upstream, then run this.
#
# Usage: scripts/sync-examples.sh [path-to-WSharp]
set -eu

cd "$(dirname "$0")/.."

src="${1:-../WSharp}"
if [ ! -d "$src/examples" ]; then
    echo >&2 "sync-examples: no examples directory under $src"
    echo >&2 "usage: scripts/sync-examples.sh [path-to-WSharp]"
    exit 1
fi

mkdir -p assets/examples/modules
cp "$src"/examples/*.ws assets/examples/
cp "$src"/examples/modules/*.ws assets/examples/modules/

printf 'synced\t%s\n' "$(ls assets/examples/*.ws | wc -l) programs from $src"
