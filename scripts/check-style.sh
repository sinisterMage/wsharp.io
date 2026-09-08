#!/usr/bin/env sh
# House style, enforced rather than remembered.
#
# The rule is that no em-dash (U+2014) and no en-dash (U+2013) appears anywhere
# in the site. Almost every paragraph this site is adapted from has one, so the
# only way the rule survives contact with the source material is a gate that
# fails the build.
#
# ASCII "--" is not an em-dash and is left alone: the W# examples use it in
# their comments, and those are quoted verbatim on purpose.
#
# Usage: scripts/check-style.sh   (exit 0 clean, 1 with one line per hit)
set -eu

cd "$(dirname "$0")/.."

# U+2014 EM DASH, U+2013 EN DASH, and the three quote characters that come with
# them when prose is pasted rather than typed.
pattern='—|–'

found=0
for dir in content layouts assets/js static; do
    [ -d "$dir" ] || continue
    if grep -rnP "$pattern" "$dir" 2>/dev/null; then
        found=1
    fi
done

if [ "$found" -ne 0 ]; then
    echo >&2
    echo >&2 "check-style: em-dashes or en-dashes found in the lines above."
    echo >&2 "Use a comma, a colon, a semicolon, parentheses, or two sentences."
    exit 1
fi

echo "check-style: clean."
