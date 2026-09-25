#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
if [ "$(id -u)" -ne 0 ]; then
  echo "Run: sudo bash scripts/install-native.sh"
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y postgresql nginx ffmpeg curl ca-certificates build-essential openssl
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@10.12.1 --activate
fi
id cypherstream >/dev/null 2>&1 || useradd --system --home "$ROOT_DIR" --shell /usr/sbin/nologin cypherstream
mkdir -p "$ROOT_DIR"/media/{movies,series,subtitles,artwork}
chown -R cypherstream:cypherstream "$ROOT_DIR/media"
DB_PASSWORD="$(openssl rand -hex 24)"
install -m 600 /dev/null /etc/cypher-stream-local.env
printf 'DATABASE_URL=postgresql://cypher_stream:%s@127.0.0.1:5432/cypher_stream_local\n' "$DB_PASSWORD" > /etc/cypher-stream-local.env
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='cypher_stream'" | grep -q 1 || sudo -u postgres psql -c "CREATE ROLE cypher_stream LOGIN PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='cypher_stream_local'" | grep -q 1 || sudo -u postgres createdb -O cypher_stream cypher_stream_local
sudo -u postgres psql -d cypher_stream_local -f "$ROOT_DIR/deploy/postgres/001-local-schema.sql"
corepack pnpm install --no-frozen-lockfile
corepack pnpm --filter @workspace/cypher-stream run build
corepack pnpm --filter @workspace/api-server run build
chown -R cypherstream:cypherstream "$ROOT_DIR/artifacts/api-server/dist" "$ROOT_DIR/artifacts/cypher-stream/dist"
install -m 644 deploy/systemd/cypher-stream-api.service /etc/systemd/system/cypher-stream-api.service
install -m 644 deploy/nginx/lan.conf /etc/nginx/sites-available/cypher-stream-local
ln -sf /etc/nginx/sites-available/cypher-stream-local /etc/nginx/sites-enabled/cypher-stream-local
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable nginx
systemctl enable cypher-stream-api
systemctl restart nginx
systemctl restart cypher-stream-api
echo "Native LAN installation complete."
hostname -I
