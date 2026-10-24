#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/synapto.js"
rm -f "$OUT"
while IFS= read -r f; do
  [ -z "$f" ] && continue
  cat "$DIR/parts/$f" >> "$OUT"
done < "$DIR/parts/MANIFEST.txt"
echo "Assembled $OUT ($(wc -c < "$OUT") bytes)"
