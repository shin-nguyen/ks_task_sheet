# PROMPT FOR CLAUDE CODE — Feature & Task Management Webapp ("TaskSheet")

## 1. Context & goals

Our team uses Jira but finds it heavy and inconvenient, and we only use a fraction of its features. Build a small, fast webapp focused on the 3 things Jira does poorly for us:

1. **Sheet view** — the main page shows all tasks of a feature as a spreadsheet-like grid with **direct inline editing on every cell** (no modals or separate edit pages needed for common edits).
2. **Forecast timeline (per-assignee Gantt)** — from the effort of assigned tasks, render a timeline per person showing when they will finish their work given current workload. Automatically **skip Saturdays & Sundays**, and allow marking **gap days** (days the assignee is busy on another feature) directly on the chart; tasks after a gap shift back automatically.
3. **BE ↔ UI ticket linking** — every task has type BE or UI, and one BE ticket can be linked 1-to-1 with its corresponding UI ticket.

Priorities: simple, fast, beautiful modern UI, information-dense but readable. Do NOT rebuild all of Jira (no complex workflows, no sprints/epics, no granular permissions).

## 2. Tech stack (required)

- **Frontend**: React + TypeScript (Vite). Tailwind CSS + shadcn/ui (or equivalent headless components). TanStack Query (React Query) for data fetching with **optimistic updates** (critical for the inline-editing sheet). TanStack Table for the sheet grid. React Router for routing. Timeline/Gantt is custom-built with CSS grid or SVG (day-cell fill style, see section 6) — do not pull in a heavy Gantt library.
- **Backend**: **Java 21 + Spring Boot 3** (Web, Data JPA, Validation, Security). REST API with JSON. Flyway for DB migrations. Package structure by feature (auth, features, tasks, timeline, notes, reports).
- **Database**: **PostgreSQL** (preferred; MySQL 8 acceptable — pick one and stick to it). Provide `docker-compose.yml` that starts the DB (and optionally the whole stack).
- **Auth**: simple email + password. BCrypt hashing. Session-based auth with httpOnly cookie **or** JWT (access token in httpOnly cookie) via Spring Security — choose the simpler to implement correctly. No OAuth, no email verification, no password reset (out of scope).
- **API style**: `/api/v1/...`, consistent error envelope `{ "error": { "code", "message", "fieldErrors" } }`, validation with Bean Validation.
- Monorepo layout:
  ```
  /backend   — Spring Boot app
  /frontend  — React app (dev proxy to backend)
  docker-compose.yml
  README.md
  ```

## 3. Data model (JPA entities / SQL)

```sql
users (
  id          UUID PK,
  email       VARCHAR UNIQUE NOT NULL,
  name        VARCHAR NOT NULL,
  password    VARCHAR NOT NULL,          -- bcrypt hash
  created_at  TIMESTAMP
)

features (
  id          UUID PK,
  ticket_id   VARCHAR NOT NULL,          -- user input, e.g. "FEAT-123"
  name        VARCHAR NOT NULL,
  created_by  UUID FK -> users,
  created_at  TIMESTAMP
)

tasks (
  id             UUID PK,
  feature_id     UUID FK -> features (cascade delete),
  ticket_id      VARCHAR NOT NULL,       -- user input, e.g. "BE-101", "UI-55"
  title          VARCHAR NOT NULL,
  description    TEXT,
  type           VARCHAR NOT NULL,       -- 'BE' | 'UI'
  note           TEXT,
  be_assignee_id UUID NULL FK -> users,
  ui_assignee_id UUID NULL FK -> users,
  dev_effort     NUMERIC(4,1) DEFAULT 0, -- man-days, allow 0.5 steps
  test_effort    NUMERIC(4,1) DEFAULT 0,
  total_effort   NUMERIC(4,1) NOT NULL,  -- always = dev + test, computed server-side
  linked_task_id UUID NULL UNIQUE FK -> tasks,  -- BE <-> UI link, symmetric
  status         VARCHAR NOT NULL DEFAULT 'TODO',      -- TODO | IN_PROGRESS | DONE
  sort_order     INT NOT NULL,           -- order in sheet AND packing order on timeline
  created_at     TIMESTAMP,
  updated_at     TIMESTAMP
)

feature_notes (
  id          UUID PK,
  feature_id  UUID FK -> features,
  content     TEXT NOT NULL,             -- markdown
  author_id   UUID FK -> users,
  created_at  TIMESTAMP,
  updated_at  TIMESTAMP
)

timeline_configs (                       -- per assignee, per feature
  id          UUID PK,
  feature_id  UUID FK -> features,
  user_id     UUID FK -> users,
  start_date  DATE NOT NULL,             -- chosen "start coding" date
  gap_days    JSONB / JSON,              -- ["2026-08-10","2026-08-11"]
  UNIQUE (feature_id, user_id)
)
```

Rules:
- `total_effort` is recomputed server-side whenever dev/test effort changes; it is never directly editable.
- **BE↔UI link**: linking task A (BE) to task B (UI) sets the relation on both. Only BE↔UI pairs allowed (reject BE-BE / UI-UI with a validation error). Unlinking clears both sides. Deleting a task clears the link on the partner.

## 4. Pages & routes (frontend)

```
/login, /signup                — auth
/features                      — feature list + create feature (ticket ID + name)
/features/:id/sheet            — MAIN PAGE: task sheet
/features/:id/timeline        — per-assignee timeline
/features/:id/report          — workload + combined team timeline (single page)
/features/:id/notes           — general feature notes
```

Layout: fixed left sidebar with app logo, current feature switcher, and nav (Sheet, Timeline, Report, Notes) + logged-in user / logout at the bottom. Top bar shows page title and the "Code complete" / "Demo-ready" date chips (visible on timeline & report).

## 5. Sheet view (main page) — detailed requirements

- Spreadsheet-style grid with columns: `#`, `Ticket ID`, `Title`, `Type (BE/UI)`, `Link`, `BE Assignee`, `UI Assignee`, `Dev Effort`, `Test Effort`, `Total`, `Status`, `Note`, `Description`.
- **Inline edit every cell**: click a cell → it becomes the matching editor (text input, number input step 0.5, select for assignee from user list, select for type/status). Enter or blur saves, Esc cancels. Optimistic update; toast + rollback on API error.
- Long Description/Note: cell shows truncated text; click opens a popover textarea.
- Add task: a Google-Sheets-style "+ New task" empty row at the bottom, and/or an Add button. Delete: "⋯" row menu with confirm dialog.
- **Filter & sort**: filter by assignee, type, status; text search on ticket ID/title; sort by clicking column headers.
- Table footer: sum of Dev / Test / Total effort for the currently visible (filtered) rows.
- Linked tasks show a 🔗 badge with the partner's ticket ID; clicking scrolls to and highlights that row.
- Keyboard: Tab moves between editable cells (nice-to-have).

## 6. Timeline view — detailed requirements (most important feature)

Purpose: given current workload, show how long each person needs and their expected finish date → derive the team's code-complete date → derive the demo-ready date.

- One **swimlane per assignee**: left column shows name + remaining effort + finish date; the right side is a **day grid** (one column per calendar day). Weekend columns are rendered dimmed/hatched and are **never counted** toward effort.
- User picks a **start date per assignee** (default: today or the next working day). Persist in `timeline_configs`.
- Packing algorithm: take the person's assigned tasks (via BE assignee or UI assignee depending on task type), status ≠ DONE, ordered by `sort_order`. Task A with effort 4 → fill 4 consecutive working-day cells (skipping weekends + gap days), then task B, etc. Support 0.5 efforts (half-filled cell).
- **Gap days**: click a day cell in a lane → toggle it as a gap (hatched gray, tooltip "Busy — other feature"); all subsequent tasks shift back automatically. Persist gaps in `timeline_configs`.
- **Editing on the chart**: drag-and-drop task blocks within a lane to reorder (updates `sort_order`). Resizing a block to change effort is nice-to-have (if implemented, sync back to the task's effort).
- Task blocks: colored by type (BE blue, UI amber), show ticket ID, tooltip with title / effort / start–end dates.
- Per lane: show that person's **finish date**. Page header shows **"Code complete: <latest finish date across lanes>"** and **"Demo-ready: <next working day after code complete>"** (demo offset configurable as +N working days).
- Vertical "Today" marker line on the grid.
- The timeline packs by `dev_effort` (goal: code-complete date). Optional toggle to view by `test_effort` or `total_effort` is nice-to-have.

## 7. Report page

A single page covering the whole team:
- **Workload summary**: per person — task count, total dev effort, total test effort, total, % done. Render as a table plus horizontal bar chart.
- **Combined timeline**: all swimlanes in one compact read-only chart showing the whole team + the overall finish date.
- Highlights/alerts: the person with the latest finish date (bottleneck), tasks with no assignee, tasks with zero effort.
- Filters: assignee + type.

## 8. Notes page

- General feature notes: a list of markdown notes with author + timestamp; edit/delete allowed for the author.
- Additionally, a feature-level pinned note can be shown as a collapsible panel on the sheet/timeline pages (nice-to-have).

## 9. CSV import (from Jira)

Allow importing an existing ticket list exported from Jira (CSV) into a feature, so the team can migrate without retyping.

Flow (frontend):
1. On the sheet page: **"Import CSV"** button → dialog with file upload (drag & drop or browse).
2. Parse the file client-side for preview; show the first ~10 rows.
3. **Column mapping step**: map CSV columns to app fields (`Ticket ID`, `Title`, `Description`, `Type`, `BE Assignee`, `UI Assignee`, `Dev Effort`, `Test Effort`, `Note`). Auto-detect common Jira export headers ("Issue key" → Ticket ID, "Summary" → Title, "Description", "Assignee", "Issue Type", "Labels", "Story Points", custom fields). Unmapped app fields fall back to defaults (Type default selectable in the dialog, efforts default 0, status TODO).
4. Show an import preview with per-row validation, then confirm.
5. After import: summary toast/panel — X created, Y skipped, Z errors (with row numbers + reasons).

Backend:
- `POST /api/v1/features/{id}/tasks/import` — multipart file + mapping config (JSON). Parse with **Apache Commons CSV** (or OpenCSV). Must handle: UTF-8 with BOM, quoted fields containing commas and newlines (Jira descriptions are multiline), varying column order.
- **Type resolution**: from the mapped column value if it contains "BE"/"backend" or "UI"/"frontend" (case-insensitive); otherwise use the dialog's default type.
- **Assignee matching**: match CSV assignee to existing users by email first, then by exact name (case-insensitive); unmatched → left unassigned (reported in the summary).
- **Duplicate handling**: if a task with the same ticket ID already exists in the feature, skip it (default) or update it — user picks the strategy in the dialog.
- Effort values: parse numbers with `.` or `,` decimal separators; invalid → 0 and reported as a warning.
- Import is transactional per file: on unexpected server error, nothing is partially saved.

Nice-to-have: **Export CSV** button on the sheet exporting the current (filtered) view.

## 10. UI/UX guidelines

- Entire UI in **English**. Modern, clean, information-dense but not cluttered. Clear sans-serif typography; use tabular numerals for numbers.
- Consistent color coding across the whole app: **BE = blue, UI = amber, gap = hatched gray, weekend = dimmed**. Status: Todo gray, In progress blue, Done green.
- Dark minimal sidebar, light content area. Desktop-first (this is a work tool); basic responsiveness is enough.
- All edits use optimistic updates — never a full page reload. Clear error toasts.
- Actionable empty states (e.g. "No tasks yet — add your first task").

## 11. Out of scope

- No realtime multi-user sync (refetch on window focus is enough).
- No granular permissions — any logged-in user can view/edit any feature.
- No email, notifications, attachments, comment threads, audit log.

## 12. Acceptance criteria (self-verify checklist)

- [ ] Sign up, login, logout work; API and routes are protected.
- [ ] Create feature with ticket ID + name; feature list page.
- [ ] Full task CRUD on the sheet; every field inline-editable; total effort auto-computed server-side.
- [ ] Link one BE ticket to one UI ticket, shown on both rows, unlinkable; BE-BE/UI-UI rejected.
- [ ] Filter (assignee/type/status) + sort + search work on the sheet.
- [ ] Timeline: per-assignee start date, correct effort packing, weekends skipped, gap-day toggle shifts later tasks, 0.5 efforts supported.
- [ ] Per-person finish dates, code-complete date, and demo-ready date displayed.
- [ ] Report: per-person workload + combined team timeline on one page + alerts.
- [ ] Feature notes page works (create/edit/delete markdown notes).
- [ ] CSV import: upload a Jira export, map columns (with auto-detection), preview, import; duplicates skipped/updated per chosen strategy; multiline quoted descriptions and UTF-8 BOM handled; import summary shown. Include a sample Jira-export CSV in the repo (`/samples/jira-export.csv`) used in a test.
- [ ] Seed data: 3–4 demo users + 1 feature + ~10 tasks (SQL seed via Flyway or a CommandLineRunner behind a `seed` profile).
- [ ] One-command startup documented in README: `docker compose up -d db`, then backend (`./mvnw spring-boot:run`) and frontend (`npm i && npm run dev`) — app usable immediately with seeded demo accounts.

## 13. Working approach

- Start with project setup + DB migrations + seed, then build in order: auth → feature list → sheet view → CSV import → timeline → report → notes.
- After each part, run the app and verify against the checklist.
- When a design trade-off appears, pick the simpler option and document it in the README.
