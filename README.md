# Khu Phaen (ขุนแผน)

Offline Task Management System - ระบบจัดการงานแบบ Offline ที่ไม่ต้องพึ่ง internet ก็ใช้ได้

> **Khu Phaen** (ขุนแผน) - ตั้งชื่อตามวรรณคดีไทย หมายถึงผู้วางแผนเชี่ยวชาญ สามารถบริหารจัดการงานต่างๆ ได้อย่างมีประสิทธิภาพ

## ✨ Features

- ✅ **Task Management** - เพิ่ม แก้ไข ลบงาน
- 👥 **Team Management** - จัดการสมาชิกทีมและมอบหมายงาน
- 📁 **Project Management** - จัดกลุ่มงานตามโปรเจค
- 📅 **Calendar View** - ดูงานในรูปแบบปฏิทิน
- 🎯 **Kanban Board** - จัดการงานแบบลาก-วาง (Drag & Drop)
- 📊 **Task Statistics** - สถิติและรายงาน
- 📤 **Export/Import** - ส่งออก/นำเข้า CSV และ PDF
- 💾 **Local Storage** - เก็บข้อมูลใน browser (IndexedDB)
- 🌙 **Dark Mode** - โหมดกลางคืน
- 🔄 **Real-time Sync** - ซิงค์ข้อมูล real-time ผ่าน WebSocket (ต้องรัน Sync Server)

## 🏗️ Project Structure

```
.
├── src/                    # SvelteKit Frontend
├── sync-server/            # Rust WebSocket Sync Server
├── wasm-compress/          # WASM: LZ4 Compression
├── wasm-crdt/              # WASM: CRDT for collaborative editing
├── wasm-search/            # WASM: Full-text search
├── static/                 # Static assets
└── build/                  # Build output (static files)
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
- [Rust](https://rustup.rs/) (ถ้าต้องการ build sync-server หรือ WASM)

### 1. Install Dependencies

```sh
npm install
```

### 2. Run Development Server

```sh
# Run frontend dev server
npm run dev

# หรือเปิด browser อัตโนมัติ
npm run dev -- --open
```

Frontend จะรันที่ `http://localhost:5173`

### 3. Run Sync Server (Optional - สำหรับ Real-time Sync)

ใน terminal อีกอัน:

```sh
cd sync-server
cargo run --release
```

Sync Server จะรันที่ `http://localhost:3001`

### 4. Build WASM Modules (Optional)

ถ้าต้องการ build WASM เอง:

```sh
# Build wasm-compress
cd wasm-compress
cargo build --release --target wasm32-unknown-unknown

# Build wasm-crdt
cd ../wasm-crdt
cargo build --release --target wasm32-unknown-unknown

# Build wasm-search
cd ../wasm-search
cargo build --release --target wasm32-unknown-unknown
```

## 🧪 Testing

### ทำไมต้องรันเทส

- ลดโอกาสพังหลังแก้โค้ด โดยเฉพาะ flow สำคัญอย่างเพิ่ม/แก้ไขงาน, filter, และ bulk actions
- ช่วยจับ regression เร็ว ก่อนขึ้น production
- ทำให้ refactor ได้มั่นใจขึ้น เพราะมีชุดเทสคอยยืนยัน behavior เดิม

### เทสทำงานยังไง (แบบเร็วๆ)

- โปรเจกต์นี้ใช้ `Vitest` เป็น test runner
- ชุด `unit` ใช้สำหรับ logic test และ component/UI test
- รันแล้วระบบจะโหลดไฟล์ `*.test.ts` ใน `src/` และรายงานว่าเคสไหนผ่าน/ไม่ผ่าน
- ถ้าใช้ watch mode เทสจะ rerun อัตโนมัติเมื่อมีการแก้ไฟล์

### Run all tests

```sh
npm test
```

### Run DB unit tests (logic-focused)

```sh
npx vitest run src/lib/db.unit.test.ts
```

### ทำไม DB tests นี้สำคัญ

- ป้องกัน regression ใน flow หลักของระบบงาน เช่น เพิ่ม/แก้ไข/ลบ/กรองงาน
- ลดความเสี่ยงข้อมูลเพี้ยนตอน import/export/merge/sync
- ช่วยเช็คพฤติกรรม migration และ lifecycle ของฐานข้อมูลให้ปลอดภัยขึ้น

### DB tests ทำงานยังไง (สั้นๆ)

- ใช้ `vitest` รัน unit test ที่ `src/lib/db.unit.test.ts`
- mock ชั้น SQLite/Storage เพื่อเทสต์ logic ใน `src/lib/db.ts` โดยตรง
- ตรวจทั้ง CRUD, stats, project/assignee, CSV import/export, merge และ binary export

### วิธีเขียน DB test แบบเร็วๆ ง่ายๆ

1. เปิดไฟล์ `src/lib/db.unit.test.ts`
2. สร้างเคสด้วย pattern `describe -> it -> expect`
3. Arrange: เตรียมข้อมูลด้วย `addProject / addAssignee / addTask`
4. Act: เรียกฟังก์ชันที่อยากเทสต์ (เช่น `updateTask`, `importFromCSV`)
5. Assert: เช็คผลด้วย `getTaskById`, `getTasks`, `getStats` แล้ว `expect(...)`

ตัวอย่างสั้น:

```ts
it('updates task status', async () => {
  const id = await addTask({
    title: 'T1',
    project: 'Core',
    duration_minutes: 10,
    date: '2026-02-12',
    status: 'todo',
    category: 'อื่นๆ',
    notes: '',
    assignee_id: null,
    sprint_id: null,
    is_archived: false
  });

  await updateTask(id, { status: 'done' });
  const task = await getTaskById(id);
  expect(task?.status).toBe('done');
});
```

### Run unit/component tests only

```sh
npx vitest run --project unit
```

### Run specific test file

```sh
npx vitest run --project unit src/lib/components/TaskForm.test.ts
npx vitest run --project unit src/lib/components/TableView.test.ts
```

### Run in watch mode (unit/component)

```sh
npx vitest --project unit
```

### วิธีเขียนเทสแบบเร็วๆง่ายๆ

1. สร้างไฟล์เทสกับไฟล์จริง เช่น `src/lib/components/TaskForm.test.ts`
2. ตั้งชื่อเคสให้บอกพฤติกรรม เช่น `it('shows edit mode values', ...)`
3. ยึดหลัก "เทสพฤติกรรมที่ผู้ใช้เห็น" ก่อนรายละเอียดภายใน
4. เริ่มจาก happy path 1 เคส แล้วค่อยเพิ่ม edge case

ตัวอย่างโครงสั้นๆ:

```ts
// @vitest-environment jsdom
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent.svelte';

describe('MyComponent', () => {
	it('updates UI after click', async () => {
		const { getByRole, getByText } = render(MyComponent);
		await fireEvent.click(getByRole('button', { name: 'Save' }));
		expect(getByText('Saved')).toBeTruthy();
	});
});
```

### แนะนำ workflow สั้นๆ

1. ตอนพัฒนา component ให้เปิด watch mode: `npx vitest --project unit`
2. ก่อน commit ให้รันเต็ม: `npm test`
3. ถ้ามีเทสพัง ให้แก้จนผ่านทั้งหมดก่อน push

## 📚 Storybook (UI Documentation)

### ทำไม Storybook สำคัญ

- ทำให้ทีมเห็นหน้าตาและ behavior ของแต่ละ component ได้โดยไม่ต้องไล่เปิดทั้งแอป
- ลด regression ด้าน UI เพราะเทียบ state ต่างๆ ของ component ได้ชัดเจน
- ใช้เป็นเอกสารกลางของ props/args สำหรับ dev และ reviewer

### Storybook ทำงานยังไง (แบบเร็วๆ)

- Storybook จะรวบรวมไฟล์ `*.stories.svelte` แล้ว render component เป็นแต่ละ state
- สามารถปรับ props ผ่าน controls เพื่อดูผลลัพธ์ทันที
- หน้าเอกสาร overview อยู่ที่ `src/storybook/UI-Overview.mdx`

### Run Storybook (Local UI docs)

```sh
npm run storybook
```

เปิดที่ `http://localhost:6006`

### Build Storybook (สำหรับ deploy เอกสาร)

```sh
npm run build-storybook
```

ไฟล์ output จะอยู่ที่ `storybook-static/`

### วิธีเขียน Story แบบเร็วๆง่ายๆ

1. สร้างไฟล์ข้าง component เช่น `src/lib/components/MyComponent.stories.svelte`
2. ใส่ `defineMeta` เพื่อกำหนด `title`, `component`, และ `args` เริ่มต้น
3. เพิ่มอย่างน้อย 2 story: `Default` และ state พิเศษ (เช่น Empty/Loading/Error)
4. เปิด `npm run storybook` แล้วปรับ props ผ่าน controls เพื่อเช็ก UI ทันที

ตัวอย่างสั้นๆ:

```svelte
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MyComponent from './MyComponent.svelte';

	const { Story } = defineMeta({
		title: 'Components/MyComponent',
		component: MyComponent,
		tags: ['autodocs'],
		args: { label: 'Hello' }
	});
</script>

<Story name="Default" />
<Story name="Empty" args={{ label: '' }} />
```

## 🏭 Build for Production

### Build Frontend

```sh
npm run build
```

ไฟล์ static จะอยู่ในโฟลเดอร์ `build/`

### Build Sync Server Binary

```sh
cd sync-server
cargo build --release
# Binary จะอยู่ที่ target/release/sync-server
```

## 🐳 Docker / Podman Deployment (Sync Server Only)

> **Frontend** ใช้ Static Files จาก `npm run build` แล้วนำไป host บน nginx/apache ได้เลย
> 
> **Sync Server** รันผ่าน Docker หรือ Podman ตามด้านล่าง

### Option 1: ใช้ Pre-built Image จาก GHCR (แนะนำ)

```sh
podman run -d \
  --name khu-phaen-sync \
  --memory=100m \
  -p 3002:3001 \
  ghcr.io/watchakorn-18k/khun-phaen-tracker-offline/sync-server:latest
```

หรือใช้ Docker:

```sh
docker run -d \
  --name khu-phaen-sync \
  --memory=100m \
  -p 3002:3001 \
  ghcr.io/watchakorn-18k/khun-phaen-tracker-offline/sync-server:latest
```

หลังรันเสร็จจะเข้าได้ที่:

- REST API: `http://localhost:3002`
- WebSocket: `ws://localhost:3002/ws`

### Option 2: Docker Compose

```yaml
version: '3.8'

services:
  khu-phaen-sync:
    image: ghcr.io/watchakorn-18k/khun-phaen-tracker-offline/sync-server:latest
    ports:
      - "3002:3001"
    environment:
      - PORT=3001
      - RUST_LOG=info
    restart: unless-stopped
```

รันด้วย:

```sh
docker-compose up -d
```

### Option 3: Build Image เอง

```sh
cd sync-server

# Build image
docker build -t khu-phaen-sync .

# Run (host 3002 -> container 3001)
docker run -d \
  --name khu-phaen-sync \
  --memory=100m \
  -p 3002:3001 \
  khu-phaen-sync
```

## 🌐 Render (HTTPS / WSS)

ถ้าจะ deploy บน Render ให้ใช้ URL แบบ `https` เท่านั้น เช่น:

```txt
https://khu-phaen-sync.onrender.com
```

วิธีใช้งาน:

1. สร้าง Render Web Service จาก image `ghcr.io/watchakorn-18k/khun-phaen-tracker-offline/sync-server:latest`
2. ให้ service bind กับ `PORT` (Render จะ inject ค่าให้อัตโนมัติ)
3. ในหน้าแอป ใส่ Server URL เป็น `https://<your-service>.onrender.com`
4. ตัวแอปจะเปลี่ยนเป็น `wss://<your-service>.onrender.com/ws` ให้อัตโนมัติเมื่อเชื่อมต่อ WebSocket

## ⚙️ Configuration

### Environment Variables

#### Frontend (Build Time)

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_SYNC_SERVER_URL` | `http://localhost:3001` | Base URL ของ Sync Server (`http://` หรือ `https://`) |

#### Sync Server (Runtime)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port ที่ server จะรัน |
| `RUST_LOG` | `info` | Log level (error, warn, info, debug, trace) |

## 📡 Sync Server API

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server info |
| GET | `/health` | Health check |
| POST | `/api/rooms` | สร้างห้องใหม่ |
| GET | `/api/rooms/:room_code` | ดูข้อมูลห้อง |

### WebSocket Endpoint

```
WS /ws
```

ดูรายละเอียดเพิ่มเติมได้ที่ [sync-server/README.md](sync-server/README.md)

## 📁 Project Details

### Tech Stack

- **Frontend**: SvelteKit 5 + TypeScript + Tailwind CSS 4
- **State Management**: Svelte Stores
- **Database**: IndexedDB (via idb library)
- **Sync Server**: Rust + Axum + WebSocket
- **WASM**: Rust (compression, CRDT, search)
- **Calendar**: FullCalendar
- **PDF Export**: jsPDF
- **Icons**: Lucide Svelte

### Build Targets

- **Frontend**: Static files (adapter-static)
- **Base Path**: `/khun-phaen-tracker-offline` (สำหรับ GitHub Pages)

## 📄 License

MIT

---

<p align="center">
  สร้างด้วย ❤️ สำหรับการจัดการงานแบบ Offline-First
</p>
