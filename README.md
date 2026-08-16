# TaskSheet

A lightweight internal alternative to Jira, built around three things:

- an inline-editable, spreadsheet-style task sheet
- a per-assignee forecast timeline (Gantt)
- many-to-many BE↔UI ticket linking

Backend is Spring Boot 3 / Java 21; frontend is React + TypeScript (Vite). See
[`claude-code-prompt.md`](./claude-code-prompt.md) for the full original product spec, and
[`CLAUDE.md`](./CLAUDE.md) for where the implementation intentionally diverges from it.

## Layout

```
/backend   — Spring Boot 3 / Java 21 REST API
/frontend  — React + TypeScript (Vite) SPA
docker-compose.yml       — Postgres + backend + frontend, for running the whole stack in containers
/samples/jira-export.csv — sample Jira export used by the CSV import parsing test
```

`backend` and `frontend` are built/run independently — there is no root package manager.

## Quick start (Docker)

```
cp .env.example .env
docker compose up -d --build
```

This starts Postgres, the API, and the frontend (served by nginx). Once the backend is up:

- App: http://localhost:5180
- API: http://localhost:8080/api/v1

Flyway applies migrations automatically on backend startup. With `SPRING_PROFILES_ACTIVE=seed` (the
default in `.env.example`), demo data seeds on first boot — 4 users, 1 epic, ~10 tasks. Log in as any of:

| Email             | Password      |
|-------------------|---------------|
| alice@team.dev    | password123   |
| ben@team.dev      | password123   |
| cara@team.dev     | password123   |
| dan@team.dev      | password123   |

To rebuild after pulling changes: `docker compose up -d --build`.

## Local development (without Docker)

Start Postgres only, then run backend and frontend separately for hot-reload:

```
docker compose up -d db
```

**Backend** (`/backend`):

```
./mvnw spring-boot:run          # API on :8080
./mvnw test                     # run all tests
./mvnw test -Dtest=ClassName    # run a single test class
```

Reads DB connection info from `.env` (see `.env.example`). Schema changes go through a new
`V{n}__*.sql` migration in `backend/src/main/resources/db/migration` — never through Hibernate auto-DDL
(`ddl-auto: validate`).

**Frontend** (`/frontend`):

```
npm install
npm run dev      # Vite dev server on :5173, proxies /api -> http://localhost:8080
npm run build    # tsc -b && vite build
npm run lint     # tsc --noEmit (there is no separate ESLint config)
```

There is no frontend test runner configured.

## Configuration

Copy `.env.example` to `.env` and adjust as needed. Notable variables:

| Variable                | Purpose                                                              |
|--------------------------|-----------------------------------------------------------------------|
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_PORT` | Postgres connection                        |
| `BACKEND_PORT`           | API port (Docker only)                                                |
| `JWT_SECRET`             | Signs the auth cookie — generate a real value beyond local/demo use   |
| `JWT_COOKIE_SECURE`      | Set `true` when serving over HTTPS                                    |
| `CORS_ALLOWED_ORIGINS`   | Must match wherever the frontend is actually served from              |
| `SPRING_PROFILES_ACTIVE` | `seed` loads demo data on first boot (only if `users` is empty); set `""` to disable |
| `FRONTEND_PORT`          | Frontend port (Docker only)                                           |

## Architecture notes

For the deeper design decisions (dynamic task statuses, server-computed effort totals, many-to-many
BE↔UI linking, the three assignee roles and how workload is split between them, client-side Gantt
scheduling, JWT-in-cookie auth, CSV import behavior, API conventions), see
[`CLAUDE.md`](./CLAUDE.md#architecture) — it's kept up to date as the source of truth for how the code
actually behaves, including where that differs from the original spec.
