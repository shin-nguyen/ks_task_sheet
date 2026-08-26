# Auto Notify Feature (Rocket.Chat)

## Context

The team currently relies on two manual PowerShell scripts (`samples/checking_new_commit_shared.ps1`,
`samples/get-rooms-shared.ps1`) run by hand on someone's machine to watch one hardcoded git branch and post
merge notifications to one hardcoded Rocket.Chat room. Room lookup is a fully manual "dump `rooms.get` to a
JSON file, eyeball it, copy the id" step. There's no meeting-reminder or daily-report equivalent at all.

We're replacing this with a first-class TaskSheet feature: each **epic** gets its own notify configuration
(chat room, and three independently-toggleable notification types — meeting reminders, daily reports, git
merge notifications), admin-managed from within the app, running server-side on a schedule instead of a
script someone has to remember to leave running. A system-wide admin kill switch exists on top of the
per-epic flags. Rocket.Chat credentials and the git access token are global secrets from `.env`, not
per-epic.

## Confirmed decisions

- **Config scope**: per-epic for everything (room name, repo URL/branch/interval, all three enable flags) —
  matches TaskSheet's epic-per-branch domain model. Plus one global admin master toggle.
- **Git access**: backend clones/fetches the repo itself (via `git` CLI shelled out from Java) into its own
  storage dir, using a global `GIT_ACCESS_TOKEN` — not a pre-mounted local path, since the backend runs in a
  Docker container.
- **Daily report content**: task status-count summary only, **split into separate BE and UI sections** (no
  overdue-item section — `Task` has no due-date field, and the user confirmed a plain summary is enough).
- **Room resolution**: resolved via Rocket.Chat's `rooms.get` and cached (`room_id`) at save time, with an
  explicit "Re-resolve room" action for when the name lookup fails or the room was renamed. Never resolved
  on every send.
- **Send-failure handling**: meeting-reminder and daily-report both mark themselves "sent" even if the
  Rocket.Chat call fails, to avoid retry storms during an outage; failures are logged server-side only.
- **Access**: the whole per-epic notify-config page/route/API is **admin-only**, hidden entirely from
  non-admins (same as `/settings/statuses`) — not a read-only view for members.

## Ground truth confirmed by reading the code

- `Task` (`backend/.../task/Task.java`) has no due-date column — confirmed via grep. Only `EpicTodo` has
  `due_date`, but per the confirmed decision above we're not using it; the report is status counts only,
  split by `Task.type` (BE/UI).
- `backend/Dockerfile` is `eclipse-temurin:21-jre-alpine` — no `git` binary present, must be added.
- `SecurityConfig.java` has no `@PreAuthorize`/method-security anywhere — all authorization is either a
  `hasRole("ADMIN")` URL-pattern rule in `authorizeHttpRequests`, or a manual
  `CurrentUser.get().getRole() == User.Role.ADMIN` / `EpicAccessService.assertAccess(epicId)` check inside a
  service/controller. New routes must follow this, not introduce annotation-based security.
- No `@Scheduled`/`@EnableScheduling`, no outbound HTTP client (`RestTemplate`/`WebClient`), and no
  `@ConfigurationProperties` class exist anywhere in the backend today — all three are net-new for this
  feature; config binding must stay in the existing constructor-`@Value` + `application.yml`
  `${ENV_VAR:default}` style (see `JwtService`), and the HTTP client should be Spring's synchronous
  `RestClient` (available via `spring-boot-starter-web` alone, no extra dependency).
- `CurrentUser.get()` reads `SecurityContextHolder`, populated only per-HTTP-request — code invoked from
  `@Scheduled` methods must never call it (no "who sent this" attribution needed anyway; these are
  system-generated messages).
- Migrations run up to `V11__admin_password_reset.sql` → next is `V12`. `V8__epic_meetings.sql` is the style
  reference for a new table (UUID PK `gen_random_uuid()`, FK `ON DELETE CASCADE`, `created_at`/`updated_at
  TIMESTAMP DEFAULT now()`, index on the FK column).
- No UI `Toggle`/`Switch` primitive exists in `frontend/src/components/ui/` — must be built from scratch.

## Database schema — `backend/src/main/resources/db/migration/V12__notify.sql`

Split admin-edited config from scheduler-mutated runtime state, so a concurrent admin save and a scheduler
tick never contend on the same row, and runtime state never goes through Bean Validation:

```sql
CREATE TABLE epic_notify_configs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id                     UUID NOT NULL UNIQUE REFERENCES epics(id) ON DELETE CASCADE,
    room_name                   VARCHAR(200) NOT NULL,
    room_id                     VARCHAR(100),
    room_resolved_at            TIMESTAMP,
    meeting_reminder_enabled    BOOLEAN NOT NULL DEFAULT false,
    daily_report_enabled        BOOLEAN NOT NULL DEFAULT false,
    daily_report_time           TIME NOT NULL DEFAULT '09:00:00',
    merge_notify_enabled        BOOLEAN NOT NULL DEFAULT false,
    git_repo_url                VARCHAR(1000),
    git_branch                  VARCHAR(200),
    git_poll_interval_minutes   INT NOT NULL DEFAULT 15,
    updated_by                  UUID REFERENCES users(id),
    created_at                  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_notify_configs_epic_id ON epic_notify_configs(epic_id);

CREATE TABLE epic_notify_state (
    epic_id                 UUID PRIMARY KEY REFERENCES epics(id) ON DELETE CASCADE,
    last_report_sent_date   DATE,
    last_seen_commit_sha    VARCHAR(64),
    last_git_check_at       TIMESTAMP,
    git_clone_status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    git_last_error          TEXT,
    updated_at               TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE epic_meetings ADD COLUMN reminder_sent_at TIMESTAMP;
CREATE INDEX idx_epic_meetings_scheduled_at ON epic_meetings(scheduled_at) WHERE reminder_sent_at IS NULL;

CREATE TABLE notify_global_settings (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled     BOOLEAN NOT NULL DEFAULT true,
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
INSERT INTO notify_global_settings (id, enabled) VALUES (1, true);
```

## Backend — new package `dev.kstasks.notify`

Package-by-feature, mirrors `meeting/`/`document/`:

- `EpicNotifyConfig.java` / `EpicNotifyConfigRepository.java` — entity + repo for `epic_notify_configs`
  (`@OneToOne` to `Epic`, explicit getters/setters, no Lombok, matching the rest of the codebase). Repo adds
  `findByEpicId`, `findAllByDailyReportEnabledTrue`, `findAllByMergeNotifyEnabledTrue`.
- `EpicNotifyState.java` / `EpicNotifyStateRepository.java` — flat entity keyed by `epicId` directly (no
  `@GeneratedValue`, no `Epic` association — avoids a join in the scheduler's tight loop).
- `NotifyGlobalSettings.java` / `NotifyGlobalSettingsRepository.java` — singleton row (id=1).
- `NotifyConfigService.java` (`@Transactional`) — CRUD + validation:
  - `get(epicId)`: returns config or an "unconfigured" default DTO (everything off) rather than 404 — a
    not-yet-configured epic is a normal state.
  - `save(epicId, request)`: if any of the three `*_enabled` flags is true, `roomName` is required. If
    `mergeNotifyEnabled`, requires `gitRepoUrl` (must be `http(s)://`, rejecting `git@` SSH form since the
    token-injection scheme below is HTTPS-specific), non-blank `gitBranch`, `gitPollIntervalMinutes >= 1`.
    Only re-resolves the room via `RocketChatClient.findRoomByName` when the row is new or `roomName`
    changed (skip an external call on unrelated edits); on no match, throws
    `ApiException.badRequest("ROOM_NOT_FOUND", ...)` and does **not** persist — never save an
    enabled-but-unresolved config. On first-ever save for an epic, also creates the matching all-null
    `EpicNotifyState` row in the same transaction.
  - `reresolveRoom(epicId)`: unconditionally re-resolves against the stored `roomName`.
  - `getGlobalSettings()` / `setGlobalSettings(enabled)`: trivial CRUD on the singleton row.
- `NotifyDispatchService.java`:
  - `sendToEpicRoom(config, message)`: shared guard — checks the global toggle and `config.roomId != null`
    before calling `RocketChatClient.sendMessage`; catches and logs send failures (WARN), never propagates,
    so one epic's failure doesn't abort the scheduler tick for others.
  - `checkMeetingReminders(now)`: queries meetings where `reminderSentAt IS NULL AND scheduledAt` falls in
    `(now, now + 15min]` (new `EpicMeetingRepository` query method). For each, loads its epic's config;
    skips silently if missing/disabled/unresolved (safe — the meeting naturally drops out of the query once
    `scheduledAt` passes, no retry loop needed). Composes a reminder message, sends, sets `reminderSentAt =
    now` regardless of send outcome (per confirmed decision).
  - `checkDailyReports(now)`: iterates enabled configs; skips weekends, skips if already sent today
    (`state.lastReportSentDate`), skips if local time-of-day hasn't reached `config.dailyReportTime` yet
    (UTC by convention — matches how `EpicMeeting.scheduledAt` is already treated app-wide, no timezone
    concept exists anywhere in this codebase). Builds the report by loading the epic's tasks + statuses and
    grouping counts **separately for `type == BE` and `type == UI`** (per confirmed decision — no overdue
    section). Sends, then sets `lastReportSentDate = today` regardless of outcome.
- `GitPollingService.java`:
  - `@Value("${app.storage.git-repos-dir}")`, `@PostConstruct` creates the base dir (mirrors
    `DocumentStorageService`). One working clone per epic at `<baseDir>/<epicId>/`. `@Value("${app.notify
    .git-access-token}")` for the global token.
  - `checkAllDueEpics(now)`: for each merge-enabled config, computes whether `gitPollIntervalMinutes` has
    elapsed since `state.lastGitCheckAt` — this is how per-epic custom intervals are handled without one
    Spring `@Scheduled` per epic: a single 1-minute tick scans all enabled epics and compares timestamps.
    Sets `lastGitCheckAt = now` unconditionally (even on error) so a broken repo retries only at its own
    interval, not every tick.
  - `checkOneEpic`: clones on first run (`git -c http.extraHeader="Authorization: Bearer <token>" clone
    --branch <branch> --single-branch <url> <dir>`) or fetches (`git ... fetch origin <branch>`) otherwise,
    then `git rev-parse origin/<branch>`. Token is injected via `-c http.extraHeader`, never embedded in the
    URL, kept out of process listings and logs. First-ever poll for an epic just baselines
    `last_seen_commit_sha` without sending (mirrors the reference script's "initial commit reference"
    behavior — avoids dumping full history the moment merge-notify is turned on). On a changed SHA, runs
    `git log --pretty=format:%an|%s <old>..<new>`, formats `author: subject` lines (falls back to a generic
    "branch was updated" message if this fails, e.g. after a force-push), sends via
    `NotifyDispatchService.sendToEpicRoom`. All `ProcessBuilder` calls use an argv list (never a shell
    string), run with a timeout + forcible kill, and any stderr captured into `git_last_error` has the raw
    token string redacted before persisting/logging.
  - Add `RUN apk add --no-cache git` to `backend/Dockerfile`, plus a boot-time `git --version` sanity check
    that logs a WARN (not a crash) if git is missing.
- `NotifyScheduler.java`: `@EnableScheduling` on `KsTasksApplication`, three independent
  `@Scheduled(fixedRate = 60_000)` methods — `meetingReminders()`, `dailyReports()`, `gitPolling()` —
  delegating to the services above. 1 minute is fine-grained enough for the 15-minute reminder window and
  the daily time-of-day check; git's own per-epic interval is enforced inside `GitPollingService`, not by
  varying the tick rate.
- `NotifyConfigController.java` — `GET/PUT /api/v1/epics/{epicId}/notify-config`,
  `POST /api/v1/epics/{epicId}/notify-config/reresolve-room`. All three **admin-only** (per the confirmed
  "hidden entirely from non-admins" decision) — add to `SecurityConfig.authorizeHttpRequests`:
  ```java
  .requestMatchers("/api/v1/epics/*/notify-config", "/api/v1/epics/*/notify-config/**").hasRole("ADMIN")
  ```
  Controller still calls `epicAccessService.assertAccess(epicId)` first for consistency with other
  controllers (redundant with the URL rule for non-admins, but keeps the pattern uniform).
- `NotifyGlobalSettingsController.java` — `GET/PUT /api/v1/notify/global-settings`, PUT admin-only via the
  same URL-rule mechanism, GET under the existing authenticated catch-all.
- `client/RocketChatClient.java` — constructor-`@Value`-injected (`app.notify.rocketchat.base-url/token
  /user-id`), builds a `RestClient` with default `X-Auth-Token`/`X-User-Id` headers.
  `findRoomByName(name)`: `GET /api/v1/rooms.get` → deserializes `{ update: [...] }` into
  `@JsonIgnoreProperties(ignoreUnknown = true)` records (`_id`, `name`, `fname`, defensive since the sample
  script never inspected individual room fields), matches case-insensitively. `sendMessage(roomId, msg)`:
  `POST /api/v1/chat.sendMessage` with `{"message":{"rid":roomId,"msg":msg}}`.
- `dto/` — `NotifyConfigRequest`/`Response`, `GlobalSettingsRequest`/`Response` records with Bean Validation.

## Config additions

`application.yml` (new keys, `${ENV_VAR:default}` style):
```yaml
app:
  storage:
    git-repos-dir: ${GIT_REPOS_STORAGE_DIR:./data/git-repos}
  notify:
    rocketchat:
      base-url: ${NOTIFY_ROCKETCHAT_BASE_URL:https://chat.tma.com.vn}
      token: ${NOTIFY_ROCKETCHAT_TOKEN:}
      user-id: ${NOTIFY_ROCKETCHAT_USER_ID:}
    git-access-token: ${GIT_ACCESS_TOKEN:}
```
`.env.example`: add `GIT_REPOS_STORAGE_DIR`, `NOTIFY_ROCKETCHAT_BASE_URL`, `NOTIFY_ROCKETCHAT_TOKEN`,
`NOTIFY_ROCKETCHAT_USER_ID`, `GIT_ACCESS_TOKEN`.
`docker-compose.yml`: new named volume for git repos (mirrors the existing `ks_tasks_documents_data`
volume/pattern) + pass through the new env vars to the `backend` service.
`backend/Dockerfile`: `RUN apk add --no-cache git` + create/chown `/app/data/git-repos`.

## Frontend

- `components/ui/Toggle.tsx` — new controlled switch primitive (`{checked, onChange, disabled?}`), styled
  consistent with `Button.tsx`'s existing Tailwind vocabulary — needed since none exists today and this
  feature needs four independent toggles.
- `components/ui/Icon.tsx` — add a `bell` path to the `PATHS` registry.
- `hooks/useNotifyConfig.ts` — epic-scoped, mirrors `hooks/useMeetings.ts`: `useNotifyConfig(epicId)` (GET,
  `queryKey: ['notify-config', epicId]`), `useSaveNotifyConfig(epicId)` (PUT), `useReresolveRoom(epicId)`
  (POST), both mutations invalidating the query key.
- `hooks/useNotifyGlobalSettings.ts` — `useNotifyGlobalSettings()` / `useSaveNotifyGlobalSettings()`.
- `pages/NotifyConfigPage.tsx` — route `/epics/:epicId/notify`, wrapped in the existing `RequireAdmin`
  wrapper from `App.tsx` (hard-redirects non-admins, same as `/settings/statuses` — per confirmed decision).
  Single-card form (not a modal — one config per epic), local `useState` synced from query data via
  `useEffect`. Sections, each gated by its own `Toggle`:
  1. Room name `Input` + "Re-resolve room" `Button` + resolved-status line — shared prerequisite for all
     three notify types.
  2. Meeting reminder — `Toggle` only (reuses each meeting's own `scheduledAt`, no extra fields).
  3. Daily report — `Toggle` + `<input type="time">` for `dailyReportTime` (backend serializes
     `LocalTime` as `HH:mm:ss`; needs a small local `toTimeInputValue`/`fromTimeInputValue` helper, no
     existing one to reuse — `MeetingsPage.tsx`'s datetime-local helpers are the closest precedent but for
     a different input type).
  4. Git merge notify — `Toggle` + repo URL `Input` + branch `Input` + interval `Input[type=number]`, plus
     a status line surfacing `gitCloneStatus`/`gitLastError` when present.
  One Save button → `useSaveNotifyConfig`, `useToast()` + `isApiError()` on failure (standard pattern).
- `pages/NotifyGlobalSettingsPage.tsx` — new "Notifications" tab under `/settings` (added to
  `SettingsPage.tsx`'s admin-only tab list, alongside Statuses/Team), route wrapped in `RequireAdmin` same
  as the other two admin settings tabs. One `Toggle` + explanatory copy + Save.
- `components/layout/Sidebar.tsx` — add a `notify` nav item (icon `bell`), filtered out for non-admins
  (`NAV_ITEMS.filter(item => item.key !== 'notify' || isAdmin)` — first per-item visibility rule in this
  file, small explicit addition).
- `App.tsx` — add `/epics/:epicId/notify` route (wrapped in `RequireAdmin`) and the `/settings/notify`
  sub-route.
- `types/index.ts` — add `NotifyConfig`, `NotifyConfigInput`, `NotifyGlobalSettings` interfaces matching the
  backend DTOs.

## Verification

1. `cd backend && ./mvnw test` — confirm existing suite still passes after the new migration/entities.
2. `docker compose up -d db && cd backend && ./mvnw spring-boot:run` — confirm `V12__notify.sql` applies
   cleanly and the app boots with `@EnableScheduling` active (check logs for the boot-time `git --version`
   sanity check).
3. Manually configure a test epic's notify config via the new UI (or `curl`) with a real/test Rocket.Chat
   room name, verify `room_id` gets resolved and persisted; use "Re-resolve room" and confirm it updates.
4. Create a meeting `scheduledAt` ~16 minutes in the future, wait for the 1-minute scheduler tick to cross
   the 15-minute mark, confirm a Rocket.Chat message arrives once (not repeated) and `reminder_sent_at` is
   set.
5. Enable daily report with `dailyReportTime` set a minute or two in the future, confirm a BE/UI split
   summary message arrives once per day.
6. Enable merge-notify against a real test repo/branch reachable with the configured `GIT_ACCESS_TOKEN`,
   confirm first poll baselines silently, then push a commit and confirm the next poll (within the
   configured interval) sends a commit-list message.
7. `cd frontend && npm run lint && npm run build` — type-check the new page/hooks/components.
8. In the browser: confirm a non-admin logged-in user cannot reach `/epics/:epicId/notify` (redirected) and
   doesn't see the nav item or the `/settings` "Notifications" tab; confirm an admin can toggle each of the
   four switches independently and they persist across a page reload.
