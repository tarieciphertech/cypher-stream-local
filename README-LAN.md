# Cypher-Stream Local — LAN Edition

Cypher-Stream Local runs directly on a Linux LAN server **without Docker or Nginx**.

## Stack

- React/Vite frontend
- Node.js 22 HTTP server
- PostgreSQL 16 (local-only)
- FFmpeg / FFprobe
- systemd
- Local filesystem media
- No Supabase, Render, Docker, or Nginx
- No public DNS or router port forwarding required

## Install

From the repository directory:

```bash
sudo bash scripts/install-native.sh
```

The installer installs native dependencies, creates PostgreSQL database `cypher_stream_local`, applies the local schema, builds the frontend/API, and registers the Node server with systemd.

## Start / stop

```bash
bash scripts/start-lan.sh
bash scripts/stop-lan.sh
```

Check the service:

```bash
systemctl status cypher-stream-api
journalctl -u cypher-stream-api -f
```

## LAN access

Find the server address:

```bash
hostname -I
```

Open:

```
http://SERVER_LAN_IP:3000/
```

Node serves the React frontend, API, and local media directly. PostgreSQL remains local-only.

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

The Node static server supports HTTP byte ranges for video seeking. FFmpeg/FFprobe are installed for the media scanner and metadata extraction layer.

## Architecture

```
LAN clients
    |
    v
Node.js :3000
    +--> /          React frontend
    +--> /api       application API
    +--> /media     local media files
                     |
                     v
                 PostgreSQL
```

## Network model

Keep port 3000 reachable only from the trusted LAN. Do not forward it from the router to the public internet.

## Next application layer

The next implementation is the native media scanner: discover movies/series, run FFprobe, create catalog records, and expose playable media to the frontend.
