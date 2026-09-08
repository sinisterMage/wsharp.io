#!/usr/bin/env sh
# Build and publish wsharp.io from this machine.
#
# GitHub Actions does this on every push to main; this is the same rsync for
# when a browser tab and a two-second turnaround beat waiting for CI.
#
# Usage: scripts/deploy.sh
set -eu

cd "$(dirname "$0")/.."

HOST="${DEPLOY_HOST:-147.93.56.183}"
USER="${DEPLOY_USER:-www-deploy}"
PATH_ON_HOST="${DEPLOY_PATH:-/var/www/wsharp.io}"
KEY="${DEPLOY_KEY_FILE:-$HOME/.ssh/vps}"

./scripts/check-style.sh
hugo --minify --gc --printPathWarnings

printf 'publishing to %s@%s:%s\n' "$USER" "$HOST" "$PATH_ON_HOST"
rsync -az --delete --chmod=D755,F644 \
      -e "ssh -i $KEY -o IdentitiesOnly=yes" \
      public/ "${USER}@${HOST}:${PATH_ON_HOST}/"

printf 'done\thttps://wsharp.io/\n'
