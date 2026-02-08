# Khu Phaen Sync Server

Rust-based WebSocket sync server for Khu Phaen Task Tracker

## Features

- 🏠 **Host Mode**: รัน server เองแล้วให้คนอื่นเชื่อมต่อ
- 🔄 **Real-time Sync**: WebSocket สำหรับ sync แบบ real-time
- 📱 **Cross-device**: คนละเครื่องก็ sync ได้
- 🔒 **No central server**: Host ควบคุมข้อมูลเอง

## Quick Start

### 1. Build & Run

```bash
cd sync-server
cargo run --release
```

Server จะรันที่ `http://0.0.0.0:3001`

### 2. หรือ Build Binary

```bash
cargo build --release
# Binary จะอยู่ที่ target/release/sync-server
./target/release/sync-server
```

### 3. ตั้งค่า Port

```bash
PORT=8080 cargo run
```

## API Endpoints

### Create Room
```bash
POST /api/rooms

Response:
{
  "success": true,
  "room_code": "BQ95B8",
  "room_id": "...",
  "host_id": "host_...",
  "websocket_url": "ws://localhost:3001/ws"
}
```

### Get Room Info
```bash
GET /api/rooms/:room_code

Response:
{
  "success": true,
  "room_code": "BQ95B8",
  "host_id": "host_...",
  "peers": [...],
  "peer_count": 2
}
```

### WebSocket
```
WS /ws
```

## WebSocket Protocol

### Client → Server

```json
// Join room
{
  "action": "join",
  "room_code": "BQ95B8",
  "peer_id": "peer_xxx",
  "is_host": false,
  "metadata": {"name": "John"}
}

// Broadcast data
{
  "action": "broadcast",
  "data": "..."
}

// Sync document (host only)
{
  "action": "sync_document",
  "document": "..."
}

// Request sync
{
  "action": "request_sync"
}

// Leave room
{
  "action": "leave"
}

// Ping
{
  "action": "ping"
}
```

### Server → Client

```json
// Connected
{
  "type": "connected",
  "peer_id": "peer_xxx",
  "room_code": "BQ95B8"
}

// Room info
{
  "type": "room_info",
  "room_code": "BQ95B8",
  "host_id": "host_...",
  "peers": [...]
}

// Peer joined
{
  "type": "peer_joined",
  "peer": {"id": "...", "is_host": false, ...}
}

// Peer left
{
  "type": "peer_left",
  "peer_id": "peer_xxx"
}

// Document sync
{
  "type": "document_sync",
  "document": "..."
}

// Data from peer
{
  "type": "data",
  "from": "peer_xxx",
  "data": "..."
}

// Error
{
  "type": "error",
  "message": "Room not found"
}

// Pong
{
  "type": "pong"
}
```

## Deployment

### With Docker

```dockerfile
FROM rust:1.75-slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates
COPY --from=builder /app/target/release/sync-server /usr/local/bin/
EXPOSE 3001
CMD ["sync-server"]
```

### With systemd

Create `/etc/systemd/system/khu-phaen-sync.service`:

```ini
[Unit]
Description=Khu Phaen Sync Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/khu-phaen-sync
ExecStart=/opt/khu-phaen-sync/sync-server
Restart=on-failure
Environment="PORT=3001"

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable khu-phaen-sync
sudo systemctl start khu-phaen-sync
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `RUST_LOG` | `info` | Log level |

## License

MIT
