# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"TaskSheet" — a lightweight internal alternative to Jira, focused on three things: an inline-editable
spreadsheet-style task sheet, a per-assignee forecast timeline (Gantt), and many-to-many BE↔UI ticket
linking. The full original product spec (data model, page-by-page UX requirements, CSV import rules,
acceptance checklist) lives in `claude-code-prompt.md` at the repo root — read it when a requirement's
rationale isn't obvious from the code, or when asked to change behavior described there.

**Naming note**: the spec calls the top-level grouping a "feature"; the implementation calls it an **Epic**
throughout (backend package `epic`, frontend `Epic` type, routes `/epics/:epicId/...`). Follow the code's
naming (`epic`), not the spec's, when adding to either side.

**Linking-cardinality note**: the spec describes BE↔UI linking as "1-to-1"; the implementation was
deliberately changed to many-to-many (one BE task can link to many UI tasks and vice versa). Follow the
code's behavior (see the BE↔UI linking bullet below), not the spec's, until the spec is updated.

## Monorepo layout

```
/backend   — Spring Boot 3 / Java 21 REST API
/frontend  — React + TypeScript (Vite) SPA
docker-compose.yml  — Postgres + backend + frontend, for running the whole stack in containers
/samples/jira-export.csv — sample Jira export used by the CSV import parsing test
```

There is no root package manager — `backend` and `frontend` are built/run independently.

## Commands

### Backend (`/backend`)

```
./mvnw spring-boot:run          # run the API on :8080 (needs Postgres reachable, see below)
./mvnw test                     # run all tests
./mvnw test -Dtest=ClassName    # run a single test class
./mvnw clean package            # build the jar (used by Dockerfile)
```

The backend needs Postgres running first: `docker compose up -d db` (reads DB name/user/password from
`.env`, see `.env.example`). Flyway runs migrations automatically on startup (`ddl-auto: validate` — schema
changes must go through a new `V{n}__*.sql` migration in `backend/src/main/resources/db/migration`, never
through Hibernate auto-DDL).

To seed demo data (4 users, 1 epic, ~10 tasks), run with the `seed` Spring profile active
(`SPRING_PROFILES_ACTIVE=seed`, see `application-seed.yml` / `DemoDataSeeder`). Seeding only runs when the
`users` table is empty. Demo login: any of `alice@team.dev` / `ben@team.dev` / `cara@team.dev` /
`dan@team.dev`, password `password123`.

### Frontend (`/frontend`)

```
npm install
npm run dev      # Vite dev server on :5173, proxies /api -> http://localhost:8080 (override via VITE_API_PROXY_TARGET)
npm run build    # tsc -b && vite build
npm run lint     # tsc --noEmit (there is no separate ESLint config — "lint" is the TS type-check)
```

There is no frontend test runner configured.

### Full stack via Docker

```
docker compose up -d          # db + backend + frontend, frontend on :5180 (nginx serving the built SPA)
```

Env vars for compose come from `.env` (copy `.env.example`). Notable ones: `JWT_SECRET`,
`CORS_ALLOWED_ORIGINS` (must match wherever the frontend is actually served from), `SPRING_PROFILES_ACTIVE`.

## Architecture

### Backend — package-by-feature, thin controller / service / repository per package

`backend/src/main/java/dev/kstasks/` has one package per domain area: `auth`, `epic`, `task`, `status`
(task statuses), `timeline`, `note`, `csvimport`, plus cross-cutting `common` (API error envelope) and
`config` (security/JWT/CORS). Each feature package generally follows: `Entity` (JPA, explicit
getters/setters — Lombok is a dependency but unused in entities), `Repository` (Spring Data), `Service`
(business rules + `@Transactional`), `Controller` (`@RestController`), and a `dto/` subpackage of Java
`record`s for request/response shapes with Bean Validation annotations.

Key architectural decisions that diverge from a naive reading of the spec:

- **Every epic is visible to every authenticated user, but working in one requires membership.**
  `GET /api/v1/epics` returns all epics to everyone (`EpicService.list`), each tagged with an `isMember`
  flag; a non-member self-joins via `POST /api/v1/epics/{epicId}/members/me` and self-leaves via
  `DELETE .../members/me` (`EpicMemberController`). `EpicAccessService.assertAccess` — the gate every
  epic-scoped controller/service calls before reading or writing tasks/notes/timeline/documents/etc. —
  is unchanged: it still requires an actual `epic_members` row (or the global admin role) before letting a
  request through, so the frontend only opens an epic's contents directly for members/admins and shows a
  "Join epic" affordance otherwise. Admin/non-admin add-or-remove-*another*-user endpoints
  (`POST`/`DELETE /api/v1/epics/{epicId}/members[/{userId}]`) are admin-only, enforced in **two** places
  that must stay in sync if touched: `EpicMemberController`'s own `requireAdmin()` checks, and
  `SecurityConfig`'s `hasRole("ADMIN")` matchers for those same paths — the latter's wildcard
  (`DELETE /api/v1/epics/*/members/*`) also covers `/members/me`, so the self-leave route needs its own
  more-specific `authenticated()` matcher declared *before* that wildcard rule.
- **Task status is dynamic, not a fixed enum.** `task_statuses` is its own table (`status` package) with
  `name`, `color`, `category` (`ACTIVE`/`DONE`), `sort_order`, `is_system`, fully CRUD-able via
  `/api/v1/statuses` and reorderable via `PATCH /api/v1/statuses/reorder`. `Task.status` is a FK, not an
  enum column. The frontend has a dedicated `/settings/statuses` admin page for this.
- **`total_effort` is always server-computed** (`dev_effort + test_effort`) in `TaskService.applyFields` —
  never trust or accept a client-supplied total.
- **BE↔UI linking is many-to-many**, backed by a `task_links` join table (`TaskLink`/`TaskLinkRepository`),
  not a self-referencing FK — one BE task can link to many UI tasks and vice versa. `TaskService.link`
  rejects same-type pairs, cross-epic pairs, and duplicate pairs (`ALREADY_LINKED` is scoped to that
  specific BE/UI pair, not "either side already has any link"). Unlink is target-specific —
  `DELETE /api/v1/tasks/{id}/link/{targetTaskId}` — since a task can have several partners. Deleting a task
  relies on `task_links`' `ON DELETE CASCADE`, no manual partner-clearing needed.
- **Tasks have three independent assignee roles**: `be_assignee_id`, `ui_assignee_id`, `test_assignee_id`.
  `TaskService.applyFields` server-enforces that a BE-type task's `ui_assignee_id` is always nulled out
  (a BE ticket has no UI assignee, regardless of what the client sends); a UI-type task may still carry
  both a UI assignee and a BE assignee (the BE assignee is an informational "investigating" collaborator
  on UI tickets, not a data-entry mistake). In workload calculations (`ReportPage.tsx`'s `workload` memo),
  `dev_effort` credits whichever of BE/UI assignee matches the task's own `type`; `test_effort` credits
  `test_assignee_id` independently, regardless of task type — a task with `test_effort > 0` and no test
  assignee surfaces as an "unassigned test effort" warning rather than falling back to the dev assignee.
- **Timeline packing (the Gantt scheduling algorithm) lives entirely on the frontend**
  (`frontend/src/lib/scheduling.ts`), not the backend. The backend's `timeline` package is just CRUD for
  `timeline_configs` (per-epic-per-user `start_date` + `gap_days` JSON array) via
  `PUT /api/v1/epics/{epicId}/timeline-configs/{userId}`. All "pack tasks into working-day columns, skip
  weekends/gaps, compute finish date" logic is client-side in `scheduleLane()`/`computeLaneSchedules()`.
  When changing scheduling behavior, that file is the source of truth, not anything in
  `backend/.../timeline`.
- **Auth is stateless JWT-in-httpOnly-cookie**, not server sessions (`SecurityConfig`:
  `SessionCreationPolicy.STATELESS`, CSRF disabled since there's no session, `JwtAuthFilter` runs before
  `UsernamePasswordAuthenticationFilter`). Cookie name/secure flag/expiration are in `application.yml` under
  `app.jwt.*`. Only `POST /api/v1/auth/signup`, `/login`, `/logout`, and `/actuator/health` are public;
  everything else under `/api/v1/**` requires a valid cookie. Password change is
  `PATCH /api/v1/auth/password` (current + new password; rejects with `400 INVALID_PASSWORD` if the current
  password doesn't match) — see `AuthController.changePassword`.
- **CSV import** (`csvimport` package) parses with Apache Commons CSV, strips a UTF-8 BOM manually, resolves
  BE/UI type by substring match on the mapped type column (falls back to the dialog's default), matches
  assignees by email then exact name (case-insensitive), and either skips or updates existing tasks by
  ticket ID per the caller's `duplicateStrategy`. Per-row errors/warnings are collected into `ImportResult`
  rather than aborting the whole import; only unexpected exceptions abort the transaction. The parsing
  behavior is pinned by `JiraCsvSampleParsingTest`, which reads `/samples/jira-export.csv` — if you touch
  parsing logic, that test (and likely the sample CSV) is the thing to check.
- **Epic documents** (`document` package) is the only feature that persists files to disk — everything else
  is DB-only. Storage is local filesystem under `app.storage.documents-dir`
  (`DocumentStorageService`), backed by a Docker named volume (`ks_tasks_documents_data`), not S3/blob
  storage. `stored_filename` is always a server-generated UUID-based name; the client's filename is never
  trusted as a path component. Any epic member can view/download; only the **uploader or an admin** can
  rename/delete (`DocumentController.getOwnedOrThrow`) — a deliberate divergence from `NoteController`'s
  author-only check. Multipart upload limits must stay in sync across **three** places if changed:
  `spring.servlet.multipart.max-file-size`/`max-request-size` in `application.yml`, and
  `client_max_body_size` in `frontend/nginx.conf` (set slightly *above* the Spring limit, e.g. 26M vs 25MB,
  so Spring's own `MaxUploadSizeExceededException` → `413 FILE_TOO_LARGE` JSON handler is what rejects
  oversized uploads through the deployed stack, not nginx's default 1MB cap returning a raw HTML error page).
- **Auto Notify** (`notify` package) is the only feature with a background scheduler, an outbound HTTP
  client, or a shelled-out subprocess — everything else in the backend is request/response only. Three
  independent `@Scheduled(fixedRate = 60_000)` methods on `NotifyScheduler` (`@EnableScheduling` on
  `KsTasksApplication`) drive meeting reminders, daily BE/UI status reports, and git-merge polling; code
  reachable from them must never call `CurrentUser.get()` (no request context exists outside an HTTP call).
  `client/RocketChatClient` wraps a `RestClient` with an explicit connect/read timeout (`SimpleClientHttpRequestFactory`) —
  an outbound call to an unreachable chat host must fail fast, not hang the caller (request thread or
  scheduler tick) indefinitely. `GitPollingService` shells out to the real `git` CLI via `ProcessBuilder`
  (argv lists, never a shell string) into `app.storage.git-repos-dir`, one working clone per epic; the
  `Authorization: Bearer <token>` header is added via `-c http.extraHeader` only when
  `GIT_ACCESS_TOKEN` is actually set — an empty/blank bearer token breaks git's HTTP layer even against a
  fully public repo. Config split across two tables: `epic_notify_configs` (admin-edited, Bean-Validated)
  vs. `epic_notify_state` (scheduler-mutated runtime state — last-sent dates, last-seen commit SHA, git
  clone status) so an admin save and a scheduler tick never contend on the same row. The whole feature
  (page, routes, both controllers) is admin-only and hidden entirely from non-admins, same as
  `/settings/statuses`.

### API conventions

- All routes are `/api/v1/...`. Errors always come back as `{ "error": { "code", "message", "fieldErrors" } }`
  (`ApiErrorResponse`, assembled by `GlobalExceptionHandler`). `ApiException` carries an HTTP status + code;
  throw it (via its static factories like `ApiException.notFound(...)`, `.badRequest(code, msg)`,
  `.conflict(code, msg)`) from services rather than returning nulls or booleans for error cases.
- Routes nest resources under their parent where that matches the DB relationship (e.g.
  `/api/v1/epics/{epicId}/tasks`, `/api/v1/epics/{epicId}/timeline-configs/{userId}`), but mutate-by-id
  routes for tasks/notes are flat (`/api/v1/tasks/{id}`, `/api/v1/notes/{id}`) since the id alone identifies
  the resource. Follow whichever pattern the existing controller in that package already uses.

### Frontend — hooks-per-resource wrapping TanStack Query

`frontend/src/hooks/` has one hook module per resource (`useEpics`, `useTasks`, `useTimeline`, `useNotes`,
`useStatuses`, `useUsers`), each wrapping `@tanstack/react-query` calls through the shared `api` client in
`src/lib/api.ts` (thin `fetch` wrapper: JSON in/out, `credentials: 'include'` for the auth cookie, throws
`ApiError` with `code`/`fieldErrors` parsed from the error envelope). Inline-edit flows on the sheet
(`components/sheet/SheetTable.tsx`) use optimistic updates through these hooks — when adding a new editable
field, follow the existing optimistic-update + rollback-on-error pattern rather than a plain refetch.

`src/pages/` is one component per route (see `App.tsx` for the route table — all routes except
`/login`/`/signup` are wrapped in `RequireAuth` + `AppLayout`). `src/components/ui/` holds small
hand-rolled primitives (Button, Input, Select, Modal, Badge, Avatar) — there is no shadcn/ui or other
component library installed despite the original spec suggesting one; extend these rather than adding a
new UI dependency. The one exception is content rendering: any field whose label/placeholder says
"markdown supported" (epic Notes content, Meeting agenda/minutes, BE-request note + API design) renders
through `components/ui/Markdown.tsx` (`react-markdown` + `remark-gfm`) rather than a plain
`whitespace-pre-wrap` div — reuse that component for any new long-form text field rather than adding
another markdown renderer or hand-rolling formatting. `src/lib/scheduling.ts` is pure date-math with no UI/React dependency — the Gantt
rendering component (`components/timeline/TimelineGrid.tsx`) consumes its output but the scheduling logic
itself is unit-testable in isolation if tests are ever added.

Auth state is a React context (`context/AuthContext.tsx`) that calls `GET /api/v1/auth/me` on load; there's
also a `ToastContext` for the error/success toasts used across optimistic-update flows.

## Git commits

Commit messages are short and simple: **one line, imperative mood, no body, no `Co-Authored-By` trailer**
(`attribution.commit` is set to `""` in `.claude/settings.json` to suppress it). Match the existing log
style, e.g. `Add Resolve/Reopen button to Todos rows`, `Stop tracking frontend/tsconfig.tsbuildinfo`. A
`PreToolUse` hook in `.claude/settings.json` blocks `git commit` calls that use a heredoc body or more than
one `-m` flag — write `git commit -m "Short imperative summary"`, nothing more.
