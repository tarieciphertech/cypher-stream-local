# Cypher-Stream Local — LAN Edition

Private local-network deployment for the Cypher-Stream application.

## Stack

- React/Vite web application
- Node API
- PostgreSQL 16
- Nginx reverse proxy
- Local media volume
- Local PostgreSQL user schema
- No public DNS required
- No router port forwarding required

## Start

```bash
cp .env.lan.example .env.lan
nano .env.lan
chmod +x scripts/*.sh
./scripts/start-lan.sh
```

The default LAN port is 8080. Find the server address with:

```bash
hostname -I
```

Open:

```
http://SERVER_LAN_IP:8080/
```

## Media folders

```
media/movies/
media/series/
media/subtitles/
media/artwork/
```

Example:

```
media/movies/Movie Name/movie.mp4
media/series/Series Name/Season 01/S01E01.mp4
```

Nginx serves local media from /media/ with byte-range support.

## Network model

Only Nginx is published to the LAN. PostgreSQL and the Node API stay inside the Docker network.

Do not expose PostgreSQL or the API directly. Do not configure router port forwarding.

## Current migration boundary

The local schema replaces the source project's Supabase auth.users foreign-key dependency with public.local_users. Application-level local login, media scanning, metadata extraction, playback-progress APIs, and admin library management are the next application layer to implement on top of this LAN foundation.
