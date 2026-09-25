#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
mkdir -p media/movies media/series media/subtitles media/artwork
if [ ! -f .env.lan ]; then
  cp .env.lan.example .env.lan
  echo "Created .env.lan."
fi
echo "LAN directories ready."
