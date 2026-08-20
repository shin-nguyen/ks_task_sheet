# Epic Todos, BE-Ticket Requests, and Meeting Notes

*Status: planned, not yet implemented.*

## Context

TaskSheet currently tracks work only as formal Tasks (BE/UI tickets) plus a single freeform
per-epic Notes thread. In practice, day-to-day epic work also generates three other kinds of
record that don't fit either shape:

1. **Loose action items** ("update the wiki", "ask ops for DB access") that aren't worth a full
   ticket but still need an owner and a deadline.
2. **"This UI ticket will need a BE ticket eventually, but it doesn't exist yet"** — today the
   BE↔UI `TaskLink` join table can only link two *existing* Tasks, so there's no way to flag
   this intent before the BE ticket is actually created.
3. **Meeting scheduling and minutes** (syncups/discussions) — date/time, a call link, what to
   discuss, and what was decided/discussed afterward — none of which the app currently records
   anywhere.

The goal is to add these three as new epic-scoped features, each following the existing
`epic_notes` package's structure as closely as possible (package-by-feature, no new
abstractions), so the app gains a lightweight backlog/scratchpad layer alongside its formal
Task tracking.

**Confirmed scope decisions** (from user):
- Todos carry an optional assignee + optional due date (not just title/done).
- BE-ticket-needed notes get their own dedicated list page (a backlog), not just a badge in the
  Sheet.
- Meeting notes use a single combined `minutes` field for post-meeting content (agenda covers
  pre-meeting; no separate "outcome" field).
- All three are edit/delete-able by **any epic member** (like `Task`), not creator-restricted
  (unlike `Notes`) — `createdBy` is attribution only, not an authorization gate.

> **Migration numbering note**: this plan assumes `V6`/`V7`/`V8` are free (latest committed
> migration is `V5__test_assignee.sql`). There is also an separate, not-yet-implemented plan at
> `plans/epic-documents-plan.md` that claims `V6` for an `epic_documents` table. Whichever of the
> two features is implemented first gets the lower number; renumber the other at implementation
> time so there's no collision.

## Reference implementation to mirror

`backend/src/main/java/dev/kstasks/note/` (`EpicNote`, `EpicNoteRepository`, `NoteController`,
`dto/NoteRequest`, `dto/NoteResponse`) is the template: entity with `@PrePersist`/`@PreUpdate`
timestamps, a plain `JpaRepository`, a controller that calls `EpicAccessService.assertAccess(epicId)`
directly (no separate `@Service` — none of these 3 features need cross-entity orchestration like
`TaskService` does), DTO records with Bean Validation, errors via `ApiException` static factories.

`frontend/src/hooks/useNotes.ts` + `frontend/src/pages/NotesPage.tsx` is the frontend template:
one query hook keyed `[resource, epicId]`, separate create/update/delete mutation hooks that
invalidate that key, a page with inline "Add" (dashed-border expand button) and inline
edit-in-place.

---

## Feature 1 — Epic Todos (`dev.kstasks.todo`)

**Migration** `backend/src/main/resources/db/migration/V6__epic_todos.sql`:
```sql
CREATE TABLE epic_todos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id     UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    assignee_id UUID REFERENCES users(id),
    due_date    DATE,
    done        BOOLEAN NOT NULL DEFAULT false,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_todos_epic_id ON epic_todos(epic_id);
```

**Backend files**:
- `todo/EpicTodo.java` — entity: `id`, `epic` (M2O, `epic_id` NOT NULL), `title`, `assignee`
  (M2O `User`, nullable), `dueDate` (`LocalDate`, nullable), `done` (boolean, default false),
  `createdBy` (M2O `User`, NOT NULL), `createdAt`/`updatedAt` via `@PrePersist`/`@PreUpdate`.
- `todo/EpicTodoRepository.java` — `findAllByEpicIdOrderByCreatedAtAsc(UUID epicId)`.
- `todo/dto/TodoRequest.java` — `record TodoRequest(@NotBlank String title, UUID assigneeId, LocalDate dueDate, boolean done)`.
- `todo/dto/TodoResponse.java` — `record TodoResponse(UUID id, String title, UserResponse assignee, LocalDate dueDate, boolean done, UserResponse createdBy, Instant createdAt, Instant updatedAt)` with a `.from(EpicTodo)` factory.
- `todo/TodoController.java` (deps: `EpicTodoRepository`, `EpicRepository`, `UserRepository`, `EpicAccessService`):
  - `GET /api/v1/epics/{epicId}/todos`
  - `POST /api/v1/epics/{epicId}/todos` — resolve `assigneeId` via `userRepository.findById` if present (else `ApiException.badRequest("INVALID_ASSIGNEE", ...)`), force `done=false` on create, `createdBy = CurrentUser.get()`
  - `PUT /api/v1/todos/{id}` — any epic member may edit all fields including `done`
  - `DELETE /api/v1/todos/{id}` — any epic member

**Frontend files**:
- `frontend/src/types/index.ts` — add `EpicTodo` interface (`id, title, assignee: UserSummary | null, dueDate: string | null, done, createdBy: UserSummary, createdAt, updatedAt`).
- `frontend/src/hooks/useTodos.ts` — `useTodos(epicId)`, `useCreateTodo(epicId)`, `useUpdateTodo(epicId)`, `useDeleteTodo(epicId)`, mirroring `useNotes.ts`'s plain invalidate-on-success pattern.
- `frontend/src/pages/TodosPage.tsx` — checklist list: checkbox toggles `done` (strikethrough title when done), inline-edit title, assignee via `SearchableSelect` sourced from `useUsers()` (the same hook `SheetTable.tsx` uses for assignee pickers — **not** `useEpicMembers`), due date via the native `<input type="date">` pill-toggle pattern already used in `frontend/src/components/timeline/TimelineGrid.tsx` (reusing `dateKey`/`parseDateKey` from `frontend/src/lib/scheduling.ts`), "Add todo" dashed-border expand button (same as Notes), delete via trash icon.

---

## Feature 2 — Pending BE-Ticket Requests (`dev.kstasks.berequest`)

A dedicated backlog page listing "this existing UI task needs a new BE ticket for X" — references
a real UI-type `Task` by id but does **not** touch `TaskLink`/`TaskService.link` at all, so the
existing BE↔UI linking invariants are unaffected.

**Migration** `backend/src/main/resources/db/migration/V7__be_ticket_requests.sql`:
```sql
CREATE TABLE be_ticket_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id      UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    ui_task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    note         TEXT NOT NULL,
    resolved     BOOLEAN NOT NULL DEFAULT false,
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMP
);
CREATE INDEX idx_be_ticket_requests_epic_id ON be_ticket_requests(epic_id);
CREATE INDEX idx_be_ticket_requests_ui_task_id ON be_ticket_requests(ui_task_id);
```

**Backend files**:
- `berequest/BeTicketRequest.java` — entity: `id`, `epic` (M2O NOT NULL), `uiTask` (M2O `Task`,
  `ui_task_id` NOT NULL), `note` (TEXT NOT NULL), `resolved` (boolean, default false), `createdBy`
  (M2O `User` NOT NULL), `createdAt` (set on `@PrePersist` only), `resolvedAt` (nullable `Instant`).
- `berequest/BeTicketRequestRepository.java` — `findAllByEpicIdOrderByCreatedAtDesc(UUID epicId)`.
- `berequest/dto/BeTicketRequestCreateRequest.java` — `record(@NotNull UUID uiTaskId, @NotBlank String note)`.
- `berequest/dto/BeTicketRequestUpdateRequest.java` — `record(@NotBlank String note, boolean resolved)`.
- `berequest/dto/BeTicketRequestResponse.java` — `record(UUID id, TaskSummary uiTask, String note, boolean resolved, UserResponse createdBy, Instant createdAt, Instant resolvedAt)` with a nested `record TaskSummary(UUID id, String ticketId, String title)` (mirrors `TaskResponse.LinkedTaskSummary`) and a `.from(BeTicketRequest)` factory.
- `berequest/BeTicketRequestController.java` (deps: `BeTicketRequestRepository`, `EpicRepository`, `TaskRepository`, `EpicAccessService`):
  - `GET /api/v1/epics/{epicId}/be-requests`
  - `POST /api/v1/epics/{epicId}/be-requests` — resolve `uiTaskId` via `TaskRepository`, validate `task.getType() == Task.Type.UI` and `task.getEpic().getId().equals(epicId)` (mirrors the type/epic checks in `TaskService.link`), else `ApiException.badRequest("INVALID_TASK", ...)`; `createdBy = CurrentUser.get()`, `resolved=false`
  - `PUT /api/v1/be-requests/{id}` — update `note`/`resolved`; flipping `resolved` false→true sets `resolvedAt = Instant.now()`, flipping true→false (reopen) clears `resolvedAt = null`
  - `DELETE /api/v1/be-requests/{id}` — any epic member

**Frontend files**:
- `frontend/src/types/index.ts` — add `BeTicketRequestTaskSummary { id, ticketId, title }` and `BeTicketRequest { id, uiTask: BeTicketRequestTaskSummary, note, resolved, createdBy: UserSummary, createdAt, resolvedAt: string | null }`.
- `frontend/src/hooks/useBeRequests.ts` — `useBeRequests(epicId)`, `useCreateBeRequest(epicId)` (`{uiTaskId, note}`), `useUpdateBeRequest(epicId)` (`{note, resolved}`), `useDeleteBeRequest(epicId)`.
- `frontend/src/pages/BeRequestsPage.tsx` — "New request" opens a `Modal` (pattern from `frontend/src/components/sheet/TextEditModal.tsx`) with a `SearchableSelect` for the UI task, sourced from `useTasks(epicId)` filtered client-side to `t.type === 'UI'` (same source/filter `SheetTable.tsx`'s Link column already uses) + a note textarea. List splits into **Open** and **Resolved** (collapsed/secondary) sections, filtered client-side on `resolved`. Each row shows `uiTask.ticketId` + `uiTask.title` as a link to `/epics/{epicId}/sheet?focus={uiTask.id}` (see Sheet deep-link addition below), the note (inline-edit-in-place), requester + date, Resolve/Reopen + Delete actions.
- `frontend/src/pages/SheetPage.tsx` — **small addition**: read a `focus` query param via `useSearchParams`, and once tasks are loaded, `document.getElementById(`task-row-${focus}`)?.scrollIntoView(...)` plus a brief highlight class. `SheetTable.tsx` already renders `id="task-row-${id}"` on every row and has this exact scroll/highlight behavior internally (currently only reachable via `LinkPicker`) — no changes needed inside `SheetTable.tsx` itself.

---

## Feature 3 — Epic Meetings (`dev.kstasks.meeting`)

**Migration** `backend/src/main/resources/db/migration/V8__epic_meetings.sql`:
```sql
CREATE TABLE epic_meetings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id       UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    scheduled_at  TIMESTAMP NOT NULL,
    link          VARCHAR(1000),
    agenda        TEXT,
    minutes       TEXT,
    created_by    UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_meetings_epic_id ON epic_meetings(epic_id);
```

**Backend files**:
- `meeting/EpicMeeting.java` — entity: `id`, `epic` (M2O NOT NULL), `title`, `scheduledAt`
  (`Instant`, NOT NULL), `link` (nullable), `agenda`/`minutes` (TEXT, nullable), `createdBy`
  (M2O NOT NULL), `createdAt`/`updatedAt` via `@PrePersist`/`@PreUpdate`.
- `meeting/EpicMeetingRepository.java` — `findAllByEpicIdOrderByScheduledAtAsc(UUID epicId)`.
- `meeting/dto/MeetingRequest.java` — `record(@NotBlank String title, @NotNull Instant scheduledAt, String link, String agenda, String minutes)` — single DTO for create and update, any field editable.
- `meeting/dto/MeetingResponse.java` — `record(UUID id, String title, Instant scheduledAt, String link, String agenda, String minutes, UserResponse createdBy, Instant createdAt, Instant updatedAt)` with `.from(EpicMeeting)`.
- `meeting/MeetingController.java` (deps: `EpicMeetingRepository`, `EpicRepository`, `EpicAccessService`):
  - `GET /api/v1/epics/{epicId}/meetings`
  - `POST /api/v1/epics/{epicId}/meetings`
  - `PUT /api/v1/meetings/{id}` — any epic member, all fields
  - `DELETE /api/v1/meetings/{id}` — any epic member

**Frontend files**:
- `frontend/src/types/index.ts` — add `EpicMeeting { id, title, scheduledAt: string, link: string | null, agenda: string | null, minutes: string | null, createdBy: UserSummary, createdAt, updatedAt }`.
- `frontend/src/hooks/useMeetings.ts` — `useMeetings(epicId)`, `useCreateMeeting(epicId)`, `useUpdateMeeting(epicId)`, `useDeleteMeeting(epicId)`.
- `frontend/src/pages/MeetingsPage.tsx` — local `toDatetimeLocalValue`/`fromDatetimeLocalValue` helpers (no existing datetime-local precedent in the repo; kept local to this page rather than added to `scheduling.ts`, which is timeline-date-key-specific). Client-side split into **Upcoming**/**Past** by comparing `scheduledAt` to `new Date()`. "New meeting" opens a `Modal` with title `Input`, `<input type="datetime-local">`, optional link `Input`, optional agenda textarea. Each card shows title, formatted time, `link` as `<a target="_blank" rel="noreferrer">` when present, agenda, and minutes — given 5 editable fields, use a single "Edit meeting" modal (reusing the create modal, prefilled) rather than per-field inline editing. Delete via trash icon, immediate (no confirm step, matching `NotesPage.tsx`'s existing delete behavior).

---

## Shared frontend wiring

- `frontend/src/App.tsx` — add 3 routes inside the existing `RequireAuth`+`AppLayout` block:
  `/epics/:epicId/todos`, `/epics/:epicId/be-requests`, `/epics/:epicId/meetings`.
- `frontend/src/components/layout/Sidebar.tsx` — extend `NAV_ITEMS` with `{key:'todos', label:'Todos', icon:'check'}`, `{key:'be-requests', label:'BE Requests', icon:'flag'}`, `{key:'meetings', label:'Meetings', icon:'clock'}`, inserted after `notes`, before `members`.
- `frontend/src/components/ui/Icon.tsx` — `check` and `flag` already exist in `PATHS`. **`clock` does not exist and must be added** as one new SVG path (simple circle + hands, same 20×20 viewBox/stroke style as the other icons) — the only new icon needed across all three features.

## Verification

- Backend: `cd backend && ./mvnw test` (Flyway will pick up `V6`/`V7`/`V8` automatically against
  the dev Postgres via `docker compose up -d db`); manually exercise each new controller's 4
  endpoints per feature with `curl`/Postman against a running `./mvnw spring-boot:run` using a
  demo login (`alice@team.dev` / `password123`).
- Frontend: `cd frontend && npm run lint` (tsc typecheck) then `npm run dev`; log in, open an
  epic, and click through the 3 new sidebar entries — create/edit/toggle/delete a Todo, create a
  BE-request against an existing UI task and confirm clicking its ticket link scrolls/highlights
  the right row on the Sheet page, create a Meeting with a past and a future date and confirm the
  Upcoming/Past split and datetime round-trips correctly through the native `datetime-local`
  input.
