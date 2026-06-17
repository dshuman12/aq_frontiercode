# Lecturn

A self-hosted lecture hall for your video courses.

Lecturn imports a folder of course videos and gives you a clean library, a focused player, and progress tracking — built as a feature-sliced TypeScript monorepo on Bun, Fastify, Postgres, and Next.js.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Bun |
| API | Fastify + Zod |
| ORM / DB | Drizzle + PostgreSQL 16 |
| Web | Next.js 15 (App Router, RSC) + React 19 |
| Styling | Tailwind v4 + shadcn/ui |
| Player | Vidstack |
| Data fetching | TanStack Query |
| Client state | Zustand |

## Project layout

```
lecturn/
├── backend/      Fastify API, Drizzle schema, library scanner
├── frontend/     Next.js app, feature-sliced UI
├── docker-compose.yml
└── .env.example
```

## Quick start

1. Copy env: `cp .env.example .env` and edit `LIBRARY_ROOT` to point at your courses folder.
2. `docker compose up -d` — brings up Postgres, API, and web.
3. Open http://localhost:3000.

## Development

```bash
# Backend
cd backend && bun install && bun run dev

# Frontend (in another shell)
cd frontend && bun install && bun run dev
```

## Library layout

Each immediate subfolder of `LIBRARY_ROOT` is a course. Episodes can be flat or grouped into chapter subfolders. Numeric prefixes determine order.

```
courses/
├── Advanced TypeScript/
│   ├── 01 Intro/
│   │   ├── 01 Welcome.mp4
│   │   └── 02 Setup.mp4
│   └── 02 Generics/
│       └── ...
└── WebGPU Crash Course/
    ├── 001 Why WebGPU.mp4
    └── 002 Pipelines.mp4
```

Only `.mp4` is supported in v1.

## License

MIT
