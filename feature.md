# Feature log

Organized by feature area, not chronologically — **one section per feature**. When you touch a feature
again, update its existing section in place (revise Summary/Gotchas/Files to reflect current state) instead
of appending a new dated entry. Only add a new section when the work doesn't belong to any existing one.
Keep each section factual and reuse-oriented: what the feature is, non-obvious decisions, and real gotchas
found by testing — not a step-by-step narration of how each change was verified.

## Epics: universal visibility + self-join/self-leave
*(Last updated 2026-08-26)*
- **What it is**: Every authenticated user can see every epic on `/epics` (previously non-admins only saw
  epics they were a member of). Members join/leave epics themselves instead of only an admin adding/removing
  them.
- **Backend**: `GET /api/v1/epics` returns all epics to all users, with a per-epic `isMember` boolean
  (`EpicResponse`) so the frontend can distinguish member vs non-member. Self-service endpoints:
  `POST /api/v1/epics/{epicId}/members/me` (join), `DELETE /api/v1/epics/{epicId}/members/me` (leave) — both
  `authenticated()`, not admin-gated. `EpicMemberController.add`/`remove` (admin adding/removing *other*
  users) stay admin-only, enforced both in the controller (`requireAdmin()`) and in `SecurityConfig` at the
  filter-chain level (`POST/DELETE .../members[/*]` → `hasRole("ADMIN")`) — defense-in-depth, not new.
- **Gotcha**: `SecurityConfig`'s wildcard `DELETE /api/v1/epics/*/members/*` rule also matched the new
  `.../members/me` path. Fixed by adding the more specific `.../members/me` → `authenticated()` rule *ahead
  of* the wildcard rule — Spring Security matches rules in declaration order.
- **Frontend**: `EpicsListPage` shows a "Join epic" button (instead of opening the epic) on cards the
  current user isn't a member of; admins bypass this and open directly, matching `EpicAccessService`'s
  existing all-access rule. `EpicMembersPage` has a self-service "Leave" action next to the signed-in user's
  own row.
- **Files**: `backend/.../epic/{EpicService,EpicController,EpicMemberController,EpicRepository}.java`,
  `epic/dto/EpicResponse.java`, `config/SecurityConfig.java`; `frontend/src/types/index.ts`,
  `hooks/useEpicMembers.ts`, `pages/{EpicsListPage,EpicMembersPage}.tsx`.

## Notes / Todos / BE-Ticket Requests / Meetings pages
*(Last updated 2026-08-27)*
- **What it is**: Four epic-scoped collaboration pages — free-form Notes, lightweight Todos, a Pending
  BE-Ticket Requests backlog, and Meeting scheduling/minutes. They share layout and markdown conventions and
  tend to get built out/polished together.
- **Backend**: `todo` (title/assignee/due date/done), `berequest` (`BeTicketRequest`: note + optional
  `apiDesign`, references a UI task, open/resolved lifecycle with `resolvedAt`), `meeting`
  (title/`scheduledAt`/link/agenda/minutes) — each a package mirroring `note`'s CRUD shape. Migrations:
  `V6__epic_todos.sql`, `V7__be_ticket_requests.sql`, `V8__epic_meetings.sql`,
  `V9__be_ticket_request_api_design.sql` (added the `apiDesign` column after the fact).
- **Layout**: All four render as a responsive grid of compact preview cards (`grid-cols-1 sm:grid-cols-2
  xl:grid-cols-3`, Todos up to `xl:grid-cols-4`) rather than full-content stacked cards — clicking a card
  opens a detail modal with the full content (`NoteDetailModal`, `TodoDetailModal`, `MeetingDetailModal`,
  `RequestDetailModal`). "New note"/"New meeting"/"New request" live in the `Topbar` right slot; Todos keeps
  an inline quick-add row above the grid instead (typing a title directly is faster than a modal round-trip
  for that page). Sheet page supports a `?focus=<taskId>` deep link (scrolls to + highlights a row), used by
  BE-request cards to jump to their linked UI task. Todos has an explicit "Resolve"/"Reopen" button next to
  Delete, syncing the same `done` state as the row checkbox.
- **Markdown**: Any field labeled "markdown supported" (Notes content, Meeting agenda/minutes, BE-request
  note + API design) renders through `components/ui/Markdown.tsx` (`react-markdown` + `remark-gfm` — renders
  to React elements, no `dangerouslySetInnerHTML`/`rehype-raw`, default `urlTransform` strips
  non-http(s)/mailto/irc link schemes — safe by default against script injection in user-authored content).
  Editing goes through `components/ui/MarkdownEditor.tsx` (bold/italic/heading/quote/code/list/link toolbar +
  Write/Preview tabs over the same `Markdown` renderer, taller `resize-y` textareas). **Card-grid previews**
  render through a `compact` mode of `Markdown` plus a `MarkdownPreview` wrapper (headings collapse to bold
  text, tighter spacing, inert links/images, fixed-height `overflow-hidden` container with a bottom fade mask
  via `.md-preview-fade` in `index.css`) instead of a flattened-plain-text truncation — the old
  `lib/textPreview.ts` helper was deleted, no longer exists. Because previews now render real block markup,
  the note/meeting/request cards are `role="button"`+`tabIndex`+`onClick`/`onKeyDown` divs (matching
  `TodosPage`'s `TodoCard`), not `<button>` (which can't validly contain block-level children).
- **Note edit permissions**: Unlike Todos/BE-Requests/Meetings (unchanged, no cross-user edit), any epic
  member can now edit any other member's `EpicNote` — not just the author. `EpicNote` gained an
  `updated_by_id` FK (`V13__epic_notes_updated_by.sql`; backfilled to `author_id` for existing rows) set
  explicitly in `NoteController` (create sets it to the author, update sets it to `CurrentUser.get()`) —
  not a JPA lifecycle callback, since `@PreUpdate` has no request/security context. `NoteResponse` carries
  it as `updatedBy`. **Delete stays author-only** (`NoteController.delete`'s explicit author check) — only
  edit was opened up, per the request. `NotesPage.tsx`'s `NoteDetailModal` always shows the Edit button now;
  Delete is gated by a `canDelete` prop (`user.id === note.author.id`), replacing the old `isOwner` prop that
  gated both. The "· edited" badge (shown whenever `updatedAt !== createdAt`) becomes "· edited by {name}"
  only when `updatedBy.id !== author.id`, so a self-edit still reads as plain "edited".
- **Gotchas**:
  - BE-Requests detail modal's inline note/API-design fields use `MarkdownEditor`'s
    `showPreviewToggle={false}` (toolbar only) because that flow saves on textarea blur — a Preview-tab click
    would unmount the textarea and fire the save-and-exit handler. Toolbar buttons everywhere use
    `onMouseDown` preventDefault so clicking them doesn't blur/lose the current text selection.
  - The app-wide fixed settings-gear button visually overlaps/steals clicks from any `Topbar` `right`-slot
    button at some viewport widths (also seen on `DocumentsPage`'s "Upload document"). Known, not fixed, out
    of scope every time it's come up — worth a real fix if touched again.
- **Files**: `backend/.../{todo,berequest,meeting}/*`; `frontend/src/components/ui/{Markdown,
  MarkdownEditor}.tsx`, `index.css` (`.md-preview-fade`); `frontend/src/pages/{NotesPage,TodosPage,
  MeetingsPage,BeRequestsPage}.tsx`; `hooks/{useTodos,useBeRequests,useMeetings}.ts`.

## Auto Notify (Rocket.Chat)
*(Last updated 2026-08-27)*
- **What it is**: Server-side, per-epic Rocket.Chat notifications — meeting reminders (15 min before
  `EpicMeeting.scheduledAt`), daily BE/UI task-status-count reports, and git-merge notifications (polls a
  shelled-out `git` clone, diffs against the last-seen commit SHA) — replacing two manual PowerShell scripts
  that used to live under `samples/`. A system-wide admin master toggle sits above three
  independently-toggleable per-epic flags. Runs on three independent 1-minute `@Scheduled` ticks
  (`NotifyScheduler`, `@EnableScheduling`) — not something anyone has to remember to leave running.
- **Config UI**: Lives entirely in the admin-only Settings > Notifications tab (`NotifySettingsPage.tsx`) —
  global toggle plus an epic picker; picking an epic renders the room/meeting-reminder/daily-report/git-merge
  form inline below the picker. There is no standalone per-epic `/epics/:epicId/notify` route or sidebar
  "Notify" item anymore — moved here because an admin-only config screen didn't belong in the per-epic nav
  alongside Sheet/Timeline/etc.
- **Backend**: package `dev.kstasks.notify` — `EpicNotifyConfig`/`EpicNotifyState` (admin-edited vs.
  scheduler-mutated, kept in separate tables so an admin save and a scheduler tick never contend on the same
  row) / `NotifyGlobalSettings` entities, `NotifyConfigService`, `NotifyDispatchService`, `GitPollingService`,
  `client/RocketChatClient`. Chat room name is resolved once via Rocket.Chat's `rooms.get` and cached, with
  an explicit re-resolve action. `V12__notify.sql`; `EpicMeeting` gained `reminderSentAt`. Admin-only end to
  end (`hasRole("ADMIN")` at the `SecurityConfig` filter-chain level, `RequireAdmin`-wrapped frontend routes)
  — never exposed to non-admins even read-only.
- **Gotchas (real bugs, found only by testing against the live stack, not by compile/lint)**:
  - `RocketChatClient`'s `RestClient` had no connect/read timeout — an unreachable Rocket.Chat host hung the
    request thread indefinitely. Fixed with an explicit 10s connect / 15s read timeout
    (`SimpleClientHttpRequestFactory`).
  - `GitPollingService` always attached an `Authorization: Bearer <token>` header even when
    `GIT_ACCESS_TOKEN` was unset — an *empty* bearer token breaks `git clone`/`fetch` even against a fully
    public repo. The header is now added via `-c http.extraHeader` only when the token is actually non-blank.
  - Real Rocket.Chat send to the production host (`chat.tma.com.vn`) isn't reachable from the dev/CI
    environment — only the failure path (timeout → error toast, config not persisted) can be verified there.
    To verify message content changes, temporarily add a `log.warn` of the built message in
    `sendToEpicRoom` before the outbound call, trigger the scheduler tick against a manually-inserted
    `epic_notify_configs` row (a real `room_id` requires resolving against a live Rocket.Chat room and
    can't be created through the API in this environment), then revert the log line.
  - `NotifyDispatchService.buildMeetingReminderMessage` originally formatted `meeting.getScheduledAt()`
    in `ZoneOffset.UTC` and labeled it "UTC" — correct for *when* the reminder fires (`checkMeetingReminders`
    compares `Instant`s directly, so firing was never timezone-wrong), but the displayed clock time in the
    Rocket.Chat message didn't match Vietnam wall-clock time users actually expect. Now formats and shows
    both: `"starts at HH:mm (VN) / HH:mm UTC"`, using `ZoneId.of("Asia/Ho_Chi_Minh")` alongside the existing
    UTC formatter. `checkDailyReports`' `dailyReportTime` comparison still runs against
    `ZoneOffset.UTC` — same underlying VN/UTC ambiguity, but out of scope for this fix (admin picks a plain
    `HH:mm` in `NotifySettingsPage.tsx` with no zone attached); worth revisiting if daily-report timing is
    ever reported as wrong.
- **Files**: `backend/.../notify/*`, `client/RocketChatClient`, `V12__notify.sql`,
  `EpicMeeting`/`EpicMeetingRepository` (+`reminderSentAt`), `SecurityConfig`, `KsTasksApplication`
  (`@EnableScheduling`), `application.yml`, `backend/Dockerfile` (+git), `.env.example`, `docker-compose.yml`
  (+git-repos volume); `frontend/src/components/ui/Toggle.tsx`, `hooks/{useNotifyConfig,
  useNotifyGlobalSettings}.ts`, `pages/NotifySettingsPage.tsx` (replaces the deleted `NotifyConfigPage.tsx`/
  `NotifyGlobalSettingsPage.tsx`), `Sidebar.tsx`, `SettingsPage.tsx`, `App.tsx`, `types/index.ts`.

## Epic Documents (upload/download/rename/delete)
*(Last updated 2026-08-21)*
- **What it is**: A Documents tab per epic for uploading, downloading, renaming, and deleting reference
  files (specs, design docs, exports). Backend package `dev.kstasks.document` mirrors `note` exactly, storing
  files on local disk under a Docker named volume (`V10__epic_documents.sql`).
- **Permissions**: Any epic member can view/download; only the uploader or an admin can rename/delete
  (`DocumentController.getOwnedOrThrow`) — a deliberate divergence from `NoteController`'s author-only check.
- **Gotcha**: Max upload size is 25MB app-side, but `frontend/nginx.conf`'s `/api/` proxy location needed an
  explicit `client_max_body_size 26M` — the container nginx default of 1MB silently rejected larger uploads
  through the deployed stack (a latent gap that also affected CSV import before this was found).
- **Files**: `backend/.../document/{EpicDocument,EpicDocumentRepository,DocumentStorageService,
  DocumentController}.java`, `document/dto/*`, `GlobalExceptionHandler` (`MaxUploadSizeExceededException` →
  413 `FILE_TOO_LARGE`), `application.yml`, `backend/Dockerfile`, `docker-compose.yml`, `.env.example`,
  `backend/.gitignore`; `frontend/src/hooks/useDocuments.ts`, `components/documents/UploadDocumentModal.tsx`,
  `pages/DocumentsPage.tsx`, `types/index.ts`, `lib/api.ts` (`getBlob`), `App.tsx`, `Sidebar.tsx`,
  `components/ui/Icon.tsx`.

## Account: self-service name change + admin user deletion
*(Last updated 2026-08-27)*
- **What it is**: Any signed-in user can rename themselves from Settings → Account. Admins can permanently
  delete another user from Settings → Team.
- **Backend**: `PATCH /api/v1/auth/name` (`AuthController.updateName`, `authenticated()`, no admin gate) sets
  the caller's own name — mirrors the existing self-service `PATCH /api/v1/auth/password` shape.
  `DELETE /api/v1/users/{id}` (`UserController.delete`, admin-only via `SecurityConfig`) hard-deletes a
  `User` row. Two guard checks before deletion, matching the existing `demotingLastAdmin` pattern in
  `updateRole`: rejects deleting yourself (`CANNOT_DELETE_SELF`) and rejects deleting the last remaining
  admin (`LAST_ADMIN`). Most FK columns onto `users` (`tasks.be_assignee_id`, `epic_notes.author_id`,
  `epic_documents.uploaded_by`, `epic_todos.created_by`, etc.) have no `ON DELETE CASCADE`, so deleting a
  user who has ever created or been assigned anything throws a Postgres FK violation — caught as
  `DataIntegrityViolationException` and surfaced as `409 USER_HAS_DATA` rather than a raw 500. There is no
  reassignment/cascade flow; in practice this means only genuinely unused accounts (never assigned a task,
  never authored a note/todo/request/meeting/document) can actually be deleted today.
- **Frontend**: `ChangePasswordPage.tsx` (still mounted at `/settings/password`, tab relabeled "Account" in
  `SettingsPage.tsx`) now stacks a new `components/auth/NameChangeForm.tsx` above the existing
  `PasswordChangeForm.tsx`; `AuthContext.updateName` calls the endpoint and updates the local `user` state
  (same pattern as `changePassword`). `TeamPage.tsx`'s `TeamRow` gets a `Delete` button (danger variant,
  `window.confirm` gate, same pattern as `DocumentsPage`'s delete) next to the role `Select` — hidden for the
  signed-in user's own row; a `USER_HAS_DATA`/`LAST_ADMIN`/`CANNOT_DELETE_SELF` failure surfaces via the
  existing toast + `isApiError` pattern, not a dedicated error UI.
- **Files**: `backend/.../auth/{AuthController,UserController,CurrentUser}.java`,
  `auth/dto/UpdateNameRequest.java`, `config/SecurityConfig.java`; `frontend/src/context/AuthContext.tsx`,
  `components/auth/NameChangeForm.tsx`, `pages/{ChangePasswordPage,SettingsPage,TeamPage}.tsx`,
  `hooks/useUsers.ts`.
