#!/usr/bin/env bash
set -euo pipefail

URL="${1:-${CINEMATIC_SCROLL_URL:-https://cinematic-scroll.matheusduarte.dev.br}}"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

curl -fsS --max-time 15 "$URL/" -o "$tmp"
grep -q "product-sequence" "$tmp"

frames="$(curl -fsS --max-time 15 "$URL/assets/sequence/frame-count.txt" | tr -d '[:space:]')"
test "$frames" -ge 100

echo "ok $URL frames=$frames"
