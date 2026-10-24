#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
export STATIC_DIR="${STATIC_DIR:-$ROOT}"
export PORT="${PORT:-3001}"
cd "$ROOT/synapto-backend"
exec node server.js
