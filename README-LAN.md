# Cypher-Stream Local — LAN Edition

Cypher-Stream Local runs directly on a Linux LAN server **without Docker**.

## Stack

- React/Vite frontend
- Node.js 22 API
- PostgreSQL 16
- Nginx
- FFmpeg / FFprobe
- systemd
- Local filesystem media
- No Supabase, Render, or Docker
- No public DNS or router port forwarding required

## Install

From the repository directory:

```bash
sudo bash scripts/install-native.sh
```

The installer installs native dependencies, creates PostgreSQL database `cypher_stream_local`, applies the local schema, builds the frontend/API, and registers the API with systemd.

## Start / stop

```bash
bash scripts/start-lan.sh
bash scripts/stop-lan.sh
```

Check services:

```bash
systemctl status cypher-stream-api
systemctl status nginx
journalctl -u cypher-stream-api -f
```

## LAN access

```bash
hostname -I
```

Open:

```
http://SERVER_LAN_IP/
```

Only Nginx is exposed to the LAN. The API listens on `127.0.0.1:3000`; PostgreSQL is local-only.

## Media

```
media/movies/
media/series/
media/subtitles/
media/artwork/
```

Examples:

```
media/movies/Movie Name/movie.mp4
media/series/Series Name/Season 01/S01E01.mp4
```

Nginx serves `/media/` with byte-range support. FFmpeg/FFprobe are installed for the media scanner and metadata extraction layer.

## Architecture

```
LAN clients
   |
   v
Nginx :80
   +--> /        React static files
   +--> /api     Node API -> PostgreSQL
   +--> /media   local media files
```

Docker is deliberately not part of this deployment.

## Next application layer

The next implementation is the native media scanner: discover movies/series, run FFprobe, create catalog records, and expose playable media to the frontend.
