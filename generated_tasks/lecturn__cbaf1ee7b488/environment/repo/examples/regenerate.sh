#!/usr/bin/env bash
# Regenerates the sample mp4 + vtt fixtures using ffmpeg's built-in
# `testsrc2` source so we don't have to bundle external assets.
# Re-running is idempotent (deterministic output).

set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$dir/sample-library/Welcome to Lecturn"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install it: brew install ffmpeg" >&2
  exit 1
fi

mkdir -p "$out"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "testsrc2=duration=6:size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:duration=6" \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -shortest -movflags +faststart \
  "$out/01_Welcome.mp4"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "testsrc2=duration=6:size=1280x720:rate=30,negate" \
  -f lavfi -i "sine=frequency=523:duration=6" \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -shortest -movflags +faststart \
  "$out/02_Sync.mp4"

cat > "$out/01_Welcome.en.vtt" <<'EOF'
WEBVTT

00:00:00.500 --> 00:00:03.000
Welcome to Lecturn.

00:00:03.500 --> 00:00:06.000
A self-hosted lecture player.
EOF

echo "Wrote:"
ls -lh "$out"
