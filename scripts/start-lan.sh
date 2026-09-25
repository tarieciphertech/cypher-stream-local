#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
./scripts/setup-lan.sh
if [ ! -f /etc/cypher-stream-local.env ]; then
  echo "Native services are not installed yet."
  echo "Run: sudo bash scripts/install-native.sh"
  exit 1
fi
sudo systemctl enable --now cypher-stream-api
echo "Cypher-Stream Local is running."
hostname -I
echo "Open: http://SERVER_LAN_IP:3000/"
