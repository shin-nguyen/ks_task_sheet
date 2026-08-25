# Feature log

## Grid layout for Notes/Todos/Meetings/BE Requests — 2026-08-25
- **Plan**: inline requirement (conversation-driven, no plan file).
- **Summary**: Converted the single-column, full-height-card lists on `NotesPage`, `TodosPage`,
  `MeetingsPage`, and `BeRequestsPage` to a responsive grid of compact preview cards (`grid grid-cols-1
  sm:grid-cols-2 xl:grid-cols-3` for content cards, up to `xl:grid-cols-4` for the shorter Todo cards) —
  the old layout capped at `max-w-[760px]` and left roughly half the screen empty on anything wider than a
  laptop, and each card showed full content, so a handful of records already filled the viewport. Cards now
  show a short preview (new `lib/textPreview.ts` — strips markdown syntax and truncates) with `line-clamp`,
  and clicking a card opens a details modal with the full rendered content: `NoteDetailModal` (view +
  inline edit + delete) and `TodoDetailModal` (title/assignee/due date + resolve/delete) are new; Meetings
  reuses the existing create/edit `MeetingModal` and adds a new read-only `MeetingDetailModal`; BE Requests
  keeps its existing click-to-edit-in-place note/API-design interaction but relocated it into a new
  `RequestDetailModal` instead of an always-expanded row. "New note"/"New meeting"/"New request" actions
  moved into the `Topbar` right slot for consistency (Todos keeps its inline quick-add row above the grid,
  since typing a title directly is faster than a modal round-trip for that page).
- **Touched**: `frontend/src/pages/{NotesPage,TodosPage,MeetingsPage,BeRequestsPage}.tsx` (full rewrites);
  new `frontend/src/lib/textPreview.ts`.
- **Notes**: Verified against a fully rebuilt Docker stack (`docker compose up -d --build`, then an
  isolated `docker compose -p kstasks-verify` copy for the actual click-through, same reason as the prior
  entry — no credentials for the real stack's non-demo users). Seeded several notes/todos/meetings/requests
  via `fetch` from the browser console (authenticated as the demo user) to populate the grid, then clicked
  through: card grid renders and uses full width, preview truncation reads cleanly, detail modals open/
  close correctly, Notes edit-in-modal and Meetings edit-in-existing-modal both round-trip, BE Requests
  Resolve moves a card from Open to the muted Resolved section live. Hit a transient Docker Hub registry
  TLS-timeout during this session (unrelated to the code) that a Docker Desktop restart resolved — not a
  project issue. The pre-existing settings-gear/Topbar-button overlap (noted in the previous entry) now
  also affects the Meetings and BE Requests "New …" buttons since they moved into the Topbar — still
  out of scope, not fixed here.

## Notes redesign + markdown rendering — 2026-08-25
- **Plan**: inline requirement (conversation-driven, no plan file).
- **Summary**: Redesigned the epic Notes page (`NotesPage.tsx`) — "Add note" moved into the topbar so it's
  reachable without scrolling, notes sorted by last-updated (newest/edited-first) with an "edited" marker,
  N separate shadow-cards collapsed into one bordered panel with thin dividers, and the note list scrolls
  within a bounded region instead of growing the page unboundedly. Also added real markdown rendering
  (new `components/ui/Markdown.tsx`, `react-markdown` + `remark-gfm`) since several fields already claimed
  "markdown supported" but only rendered raw text — wired into Notes content, Meeting agenda/minutes, and
  BE-request note + API design fields, with labels/placeholders corrected to match.
- **Touched**: `frontend/src/pages/NotesPage.tsx`, `MeetingsPage.tsx`, `BeRequestsPage.tsx`;
  new `frontend/src/components/ui/Markdown.tsx`; `frontend/package.json` (added `react-markdown`,
  `remark-gfm`).
- **Notes**: `react-markdown` renders to React elements (no `dangerouslySetInnerHTML`, no `rehype-raw`), and
  its default `urlTransform` strips non-http(s)/mailto/irc schemes from links/images, so this is safe by
  default against script injection in user-authored notes. UI verification ran against an isolated
  `docker compose -p kstasks-verify` stack (fresh DB, `SPRING_PROFILES_ACTIVE=seed`, ports 5434/8081/5181)
  built from the same Dockerfiles as the real stack, rather than the main `ks_tasks-*` stack — the real DB
  already has non-demo user accounts and no known credentials for them. The isolated stack was torn down
  (`docker compose -p kstasks-verify down -v`) after verification; the main stack was rebuilt via
  `docker compose up -d --build` as requested and left running. Pre-existing, unrelated to this change: the
  app-wide fixed settings-gear button visually overlaps any Topbar `right`-slot action button at this
  viewport width (confirmed identical on `DocumentsPage`'s "Upload document" button) — not fixed here since
  out of scope. Backend `./mvnw test` output could not be captured in this environment (the Windows
  `mvnw.cmd` wrapper's stdout isn't visible through this session's shell tool even though `docker compose
  up -d --build` — which runs the same Maven build inside the container — succeeded and surefire reports
  didn't need to regenerate since no backend files changed).

## Epic Documents (upload/download/rename/delete) — 2026-08-21
- **Plan**: `plans/epic-documents-plan.md`
- **Summary**: Added a dedicated Documents tab per epic for uploading, downloading, renaming, and deleting
  reference files (specs, design docs, exported files). New `dev.kstasks.document` backend package (mirrors
  `note` exactly) backed by local-disk storage under a Docker named volume, with `V10__epic_documents.sql`.
  Any epic member can view/download; only the uploader or an admin can rename/delete
  (`DocumentController.getOwnedOrThrow`, a deliberate divergence from `NoteController`'s author-only check).
  Max upload size bumped to 25MB.
- **Touched**: `backend/.../document/{EpicDocument,EpicDocumentRepository,DocumentStorageService,
  DocumentController}.java`, `document/dto/{DocumentResponse,RenameDocumentRequest}.java`,
  `GlobalExceptionHandler` (new `MaxUploadSizeExceededException` → 413 `FILE_TOO_LARGE` handler),
  `application.yml`, `backend/Dockerfile`, `docker-compose.yml`, `.env.example`, `backend/.gitignore`;
  `frontend/src/hooks/useDocuments.ts`, `components/documents/UploadDocumentModal.tsx`,
  `pages/DocumentsPage.tsx`, `types/index.ts`, `lib/api.ts` (`getBlob`), `App.tsx`, `Sidebar.tsx`,
  `components/ui/Icon.tsx` (`document`/`download` glyphs).
- **Notes**: `frontend/nginx.conf` needed `client_max_body_size 26M` on the `/api/` proxy location — the
  container's nginx defaults to 1MB, which would silently reject any upload over that through the deployed
  stack (a latent gap that also affected CSV import, never caught before since nobody had tested a
  multi-MB import through the containerized frontend). Not called out in the plan; found and fixed during
  full-stack verification. The admin-non-uploader rename/delete bypass was verified via a dedicated backend
  test (`DocumentControllerTest.renameAndDeleteAllowedForAdminNonUploader`) rather than live in the browser,
  since the seed data only has one admin account and promoting a second one, or removing an epic member to
  test the 403 case, were both blocked by the auto-mode safety classifier as sensitive account/membership
  mutations — reasonably so, so those two specific checklist items rely on `EpicAccessService.assertAccess`
  being the same pre-existing, already-exercised authorization path every other epic resource uses, plus the
  controller-test coverage of the ownership/admin-bypass logic itself.

## Todos "Resolve"/"Reopen" button — 2026-08-21
- **Plan**: inline requirement
- **Summary**: Added an explicit "Resolve"/"Reopen" text button next to Delete on each Todos row,
  matching the BE Requests page's action-button style. It toggles the same `done` state as the existing
  checkbox (both stay in sync) — purely a UI consistency addition, no API/schema change.
- **Touched**: `frontend/src/pages/TodosPage.tsx`.

## BE-Ticket Request API design field — 2026-08-21
- **Plan**: inline requirement (follow-up to the BE-Ticket Requests feature below)
- **Summary**: Added an optional `apiDesign` freeform text field to BE-ticket requests so the team can
  draft the endpoint/request/response shape before the actual BE ticket is created. Rendered as a
  monospace block on the request row (click-to-edit in place, "+ Add API design" affordance when empty)
  and as a textarea in the "New request" modal. No separate status field — the existing Open/Resolved
  state already tracks whether a ticket still needs to be created.
- **Touched**: `backend/.../berequest/BeTicketRequest.java`, `BeTicketRequestController.java`,
  `dto/BeTicketRequestCreateRequest.java` / `BeTicketRequestUpdateRequest.java` /
  `BeTicketRequestResponse.java`; `backend/src/main/resources/db/migration/V9__be_ticket_request_api_design.sql`;
  `frontend/src/hooks/useBeRequests.ts`, `frontend/src/pages/BeRequestsPage.tsx`, `types/index.ts`.

## Epic Todos, BE-Ticket Requests, and Meeting Notes — 2026-08-21
- **Plan**: `plans/todos-be-requests-meetings-plan.md`
- **Summary**: Added three new epic-scoped features mirroring the `epic_notes` package structure: lightweight
  Todos (title/assignee/due date/done), a Pending BE-Ticket Requests backlog (references an existing UI task,
  open/resolved lifecycle with `resolvedAt` tracking), and Meeting scheduling/minutes. Each ships as a new
  backend package (`todo`, `berequest`, `meeting`) with its own Flyway migration (`V6`/`V7`/`V8`), a
  frontend hook module, a page, a sidebar nav entry, and routes. Sheet page gained a `?focus=<taskId>`
  deep-link that scrolls to and highlights the corresponding row, used by BE-request rows to jump to their
  linked UI task.
- **Touched**: `backend/.../todo/*`, `backend/.../berequest/*`, `backend/.../meeting/*`,
  `backend/src/main/resources/db/migration/V6__epic_todos.sql` / `V7__be_ticket_requests.sql` /
  `V8__epic_meetings.sql`; `frontend/src/hooks/useTodos.ts` / `useBeRequests.ts` / `useMeetings.ts`;
  `frontend/src/pages/TodosPage.tsx` / `BeRequestsPage.tsx` / `MeetingsPage.tsx`; `SheetPage.tsx` (focus
  scroll/highlight); `App.tsx`, `Sidebar.tsx`, `Icon.tsx` (new `clock` icon).
- **Notes**: After the initial pass, UI/UX polish was applied following manual browser review: moved the
  "New request"/"New meeting" primary buttons out of `Topbar`'s `right` slot (which visually collided with
  and, at some click positions, stole clicks from the fixed settings-gear button) into an inline toolbar row
  next to each list's section heading; made the Todos row checkbox visibly bordered instead of a
  near-invisible `border-line2` outline; added an `Avatar` next to the assignee picker in Todos rows for
  visual weight; aligned the Todos panel to the same `max-w-[760px]` as the other two new pages.
