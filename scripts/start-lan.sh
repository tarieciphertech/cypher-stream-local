#!/usr/bin/env bash
set -euo pipefail
./scripts/setup-lan.sh
docker compose --env-file .env.lan -f docker-compose.lan.yml up -d --build
echo
echo "Cypher-Stream Local is starting."
echo "Server LAN addresses:"
hostname -I
echo "Open http://SERVER_LAN_IP:8080/"
