#!/usr/bin/env bash
set -euo pipefail
docker compose --env-file .env.lan -f docker-compose.lan.yml down
