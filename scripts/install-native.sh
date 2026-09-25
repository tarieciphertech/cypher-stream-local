#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
if [ "$(id -u)" -ne 0 ]; then
  echo "Run: sudo bash scripts/install-native.sh"
  exit 1
fi

# The installer is run with sudo, but the source tree normally belongs to the
# invoking desktop user. Keep the repository user-owned so Corepack/pnpm can
# read and write it without creating root-owned files.
INSTALL_USER="${SUDO_USER:-}"
if [ -n "$INSTALL_USER" ] && id "$INSTALL_USER" >/dev/null 2>&1; then
  INSTALL_GROUP="$(id -gn "$INSTALL_USER")"
  chown -R "$INSTALL_USER:$INSTALL_GROUP" "$ROOT_DIR"
else
  INSTALL_USER="root"
  INSTALL_GROUP="root"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y postgresql ffmpeg curl ca-certificates build-essential openssl

# Ubuntu may install PostgreSQL without leaving the cluster running.
# Start it before creating the local role/database or applying the schema.
systemctl enable --now postgresql
until sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; do
  sleep 1
done

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
printf 'DATABASE_URL=postgresql://cypher_stream:%s@127.0.0.1:5432/cypher_stream_local
' "$DB_PASSWORD" > /etc/cypher-stream-local.env
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='cypher_stream'" | grep -q 1 || sudo -u postgres psql -c "CREATE ROLE cypher_stream LOGIN PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='cypher_stream_local'" | grep -q 1 || sudo -u postgres createdb -O cypher_stream cypher_stream_local

# psql -f opens the file as the postgres user. On a normal Linux home directory,
# postgres cannot traverse /home/cipher, so stream the schema through stdin instead.
cat "$ROOT_DIR/deploy/postgres/001-local-schema.sql" | sudo -u postgres psql -d cypher_stream_local

# Run pnpm as the original desktop user. This prevents Corepack/pnpm from
# creating root-owned node_modules, workspace files, or build artifacts.
sudo -u "$INSTALL_USER" -H env HOME="/home/$INSTALL_USER" corepack pnpm install --no-frozen-lockfile
sudo -u "$INSTALL_USER" -H env HOME="/home/$INSTALL_USER" corepack pnpm --filter @workspace/cypher-stream run build
sudo -u "$INSTALL_USER" -H env HOME="/home/$INSTALL_USER" corepack pnpm --filter @workspace/api-server run build

chown -R cypherstream:cypherstream "$ROOT_DIR/artifacts/api-server/dist" "$ROOT_DIR/artifacts/cypher-stream/dist"
install -m 644 deploy/systemd/cypher-stream-api.service /etc/systemd/system/cypher-stream-api.service
systemctl daemon-reload
systemctl enable cypher-stream-api
systemctl restart cypher-stream-api
echo "Native LAN installation complete."
hostname -I
echo "Open: http://SERVER_LAN_IP:3000/"
