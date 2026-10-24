#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/synapto-complete.html"
rm -f "$OUT"
while IFS= read -r f; do
  [ -z "$f" ] && continue
  cat "$DIR/complete-parts/$f" >> "$OUT"
done < "$DIR/complete-parts/MANIFEST.txt"
echo "Assembled $OUT ($(wc -c < "$OUT") bytes)"
