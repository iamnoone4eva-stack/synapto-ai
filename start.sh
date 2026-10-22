#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3001}"
echo "▶ Synapto (API + app) on :$PORT"
cd "$ROOT/synapto-backend"
STATIC_DIR="$ROOT" PORT="$PORT" node server.js
