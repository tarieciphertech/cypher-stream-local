#!/usr/bin/env bash
set -euo pipefail
mkdir -p media/movies media/series media/subtitles media/artwork
if [ ! -f .env.lan ]; then cp .env.lan.example .env.lan; fi
echo "LAN directories ready."
echo "Edit .env.lan and set a strong POSTGRES_PASSWORD."
