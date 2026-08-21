# Feature log

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
