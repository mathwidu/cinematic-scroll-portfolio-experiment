#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIDEO_PATH="$(cat "$ROOT/fal-results/latest-video-path.txt")"
OUT_DIR="$ROOT/assets/sequence"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

ffmpeg -y -i "$VIDEO_PATH" \
  -vf "fps=24,scale=1280:-1:flags=lanczos" \
  -q:v 3 \
  "$OUT_DIR/axon_%04d.jpg"

COUNT="$(find "$OUT_DIR" -type f -name 'axon_*.jpg' | wc -l | tr -d ' ')"
echo "$COUNT" > "$OUT_DIR/frame-count.txt"
du -sh "$OUT_DIR"
echo "Extracted $COUNT frames to $OUT_DIR"
