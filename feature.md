# Feature log

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
