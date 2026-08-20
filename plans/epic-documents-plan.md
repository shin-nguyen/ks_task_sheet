# Epic Documents (upload / download / delete / rename reference files)

## Context

Every epic currently has Sheet, Timeline, Report, Notes, and Members tabs, but no place to attach
reference material — specs, design files, exported docs — that the team needs while working the epic.
The user wants a dedicated, visually clean section on the epic for uploading, downloading, deleting, and
renaming these documents, with the display name editable both at upload time and afterward.

The backend has **no existing file-storage mechanism at all** — the only prior `MultipartFile` consumer
(CSV import) parses in-memory and never persists anything to disk — so this introduces a new small piece
of infrastructure (local-disk storage + a Docker volume), not just a new CRUD package.

Decisions locked in with the user before this plan:
- **Storage**: local filesystem inside the backend container, mounted via a Docker named volume (same
  pattern as the existing `ks_tasks_db_data` volume for Postgres) — not S3/MinIO, not DB blobs.
- **Permissions**: any epic member can view/download/upload; only the **uploader or an admin** can
  rename/delete.
- **Max size**: 25MB per file (bumped up from the current global 10MB multipart limit).

## Backend — new `dev.kstasks.document` package (mirrors `dev.kstasks.note` exactly)

**Migration** `backend/src/main/resources/db/migration/V6__epic_documents.sql`:
```sql
CREATE TABLE epic_documents (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id           UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    display_name      VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename   VARCHAR(255) NOT NULL UNIQUE,
    content_type      VARCHAR(150) NOT NULL,
    size_bytes        BIGINT NOT NULL,
    uploaded_by       UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_documents_epic_id ON epic_documents(epic_id);
```
`display_name` is the user-editable label; `original_filename` is the raw uploaded filename (kept for
reference/fallback); `stored_filename` is a server-generated UUID-based on-disk name — the client's
filename is never trusted as a path component.

**Files to add** (mirrors `note/`'s entity/repository/controller/dto split):
- `document/EpicDocument.java` — JPA entity, same style as `EpicNote.java` (`@ManyToOne` epic + uploadedBy
  lazy, `@PrePersist`/`@PreUpdate` timestamps).
- `document/EpicDocumentRepository.java` — `findAllByEpicIdOrderByCreatedAtDesc(UUID epicId)`.
- `document/DocumentStorageService.java` — **new infrastructure, nothing to reuse**:
  - `@Value("${app.storage.documents-dir}")` base dir, created via `@PostConstruct` (`Files.createDirectories`).
  - `store(MultipartFile file)`: generates `UUID`, derives a safe extension from the original filename
    (rejects/strips `/`, `\`, `..`), writes to `baseDir/<uuid>.<ext>`, asserts the resolved path stays
    under `baseDir` (defense in depth even though the name is server-generated). Returns stored filename,
    size, content type (fallback `application/octet-stream`).
  - `load(String storedFilename)` → `Resource`, 404 via `ApiException.notFound(...)` if missing.
  - `delete(String storedFilename)` — best-effort; log and swallow I/O errors rather than blocking the
    DB-row delete on a stray filesystem issue.
- `document/DocumentController.java` — `@RestController @RequestMapping("/api/v1") @Transactional`:

  | Verb | Path | Access | Notes |
  |---|---|---|---|
  | GET | `/epics/{epicId}/documents` | `assertAccess(epicId)` | list |
  | POST | `/epics/{epicId}/documents` | `assertAccess(epicId)` | multipart `file` + optional `displayName`; defaults display name to the original filename |
  | GET | `/documents/{id}/download` | `assertAccess(doc's epic)` | streams bytes, `Content-Disposition` with RFC 5987 `filename*` for non-ASCII names |
  | PATCH | `/documents/{id}` | `getOwnedOrThrow` | `{ displayName }` only |
  | DELETE | `/documents/{id}` | `getOwnedOrThrow` | deletes DB row + calls `storageService.delete(...)` |

  `getOwnedOrThrow` follows `NoteController`'s private helper shape but — **unlike notes, which have no
  admin bypass today** — adds one, since the user explicitly asked for "uploader or admin":
  ```java
  private EpicDocument getOwnedOrThrow(UUID id) {
      EpicDocument doc = repo.findById(id).orElseThrow(() -> ApiException.notFound("Document not found"));
      epicAccessService.assertAccess(doc.getEpic().getId());
      User current = CurrentUser.get();
      boolean owner = doc.getUploadedBy().getId().equals(current.getId());
      if (!owner && current.getRole() != User.Role.ADMIN) {
          throw ApiException.badRequest("NOT_OWNER", "Only the uploader or an admin can rename or delete this document");
      }
      return doc;
  }
  ```
  This is a deliberate, scoped divergence from `note/NoteController.java`'s author-only check — call it
  out as intentional in the PR description, not a silent inconsistency.

- `document/dto/DocumentResponse.java` (record: `id, displayName, originalFilename, contentType,
  sizeBytes, uploadedBy: UserResponse, createdAt, updatedAt` — deliberately omits `storedFilename`) and
  `document/dto/RenameDocumentRequest.java` (`@NotBlank @Size(max=255) String displayName`).

**Error handling**: `GlobalExceptionHandler` (`backend/src/main/java/dev/kstasks/common/`) has no handler
for `MaxUploadSizeExceededException` today, so an oversized upload currently falls through to a generic
500. Add one handler returning `413` with the existing `{error:{code,message}}` envelope
(`ApiErrorResponse`) — small, low-risk addition that also fixes this gap for CSV import.

**Config**:
- `application.yml`: bump `spring.servlet.multipart.max-file-size`/`max-request-size` to `25MB`; add
  `app.storage.documents-dir: ${DOCUMENTS_STORAGE_DIR:./data/documents}`.
- `backend/Dockerfile`: `RUN mkdir -p /app/data/documents && chown -R app:app /app/data` before switching
  to the non-root user, so the Docker volume mount point isn't root-owned.
- `docker-compose.yml`: add `DOCUMENTS_STORAGE_DIR: ${DOCUMENTS_STORAGE_DIR:-/app/data/documents}` to the
  `backend` service env, mount `ks_tasks_documents_data:/app/data/documents`, declare the new named volume
  alongside `ks_tasks_db_data`.
- `.env.example`: add `DOCUMENTS_STORAGE_DIR=/app/data/documents` for consistency with the other backend vars.
- `backend/.gitignore`: ensure the local-dev `data/` directory is ignored.

## Frontend

- `types/index.ts`: add `EpicDocument { id, displayName, originalFilename, contentType, sizeBytes,
  uploadedBy: UserSummary, createdAt, updatedAt }`.
- `lib/api.ts`: add `api.getBlob(path): Promise<Blob>` (raw `fetch` + `credentials: 'include'`, same
  `ApiError` parsing as `request<T>`) — needed because downloads aren't JSON and the app has no existing
  blob-fetch helper; going through `fetch`+`blob()` (vs. a raw `<a href>` navigation) keeps failures
  (403/404) flowing through the same `ApiError`/toast handling every other mutation uses.
- `hooks/useDocuments.ts` (new, follows `useNotes.ts`'s shape exactly):
  `useDocuments(epicId)`, `useUploadDocument(epicId)` (via `api.postForm`, `FormData` with `file` +
  optional `displayName`), `useRenameDocument(epicId)` (`api.patch`), `useDeleteDocument(epicId)`
  (`api.delete`) — all invalidate `['documents', epicId]` on success — plus a plain exported
  `downloadDocument(doc)` function (not a query/mutation) that fetches the blob, creates an object URL,
  and clicks a programmatic `<a download>`.
- `components/documents/UploadDocumentModal.tsx` (new): dropzone modeled directly on
  `components/sheet/ImportCsvModal.tsx` (hidden `<input type="file">`, `onDrop`/`onDragOver`, click-to-
  browse), plus a text input pre-filled with the chosen file's name that the user can edit before
  confirming — this is what satisfies "editable name at upload time." Calls
  `useUploadDocument(epicId).mutateAsync({ file, displayName })`, toasts success/`ApiError` (e.g.
  `FILE_TOO_LARGE`) via `useToast()`.
- `pages/DocumentsPage.tsx` (new): `Topbar` + bordered-panel row list (styling matches
  `EpicMembersPage.tsx`), one row per document showing an icon, `displayName`, a secondary line
  (`originalFilename · size · uploaded by · date`), a download button visible to all members, and
  rename/delete controls gated by `user?.id === doc.uploadedBy.id || isAdmin` (mirrors `NotesPage`'s
  ownership gate, extended with `isAdmin` from `useAuth()`). Rename is inline-edit-in-place (same pattern
  `NotesPage` uses for its own content edit) rather than a modal, since it's one short field. Delete uses
  `window.confirm(...)`, matching `EpicMembersPage.handleRemove` — no custom confirm-modal component
  exists in this codebase. Empty state: `No documents yet.` (matches `NotesPage`'s empty-state wording
  convention).
- `App.tsx`: add `<Route path="/epics/:epicId/documents" element={<DocumentsPage />} />` next to the other
  flat epic-scoped routes (after `/notes`).
- `components/layout/Sidebar.tsx`: add `{ key: 'documents', label: 'Documents', icon: 'document' as const }`
  to `NAV_ITEMS`.
- `components/ui/Icon.tsx`: add two new entries to the `PATHS` record — `document`/`file` (for the nav
  item and per-row icon) and `download` (mirrors the existing `upload` glyph, flipped) — same 20×20
  viewBox / stroke style as the rest of the set.

## Verification

- Backend: `cd backend && ./mvnw test` (no regressions expected; existing suite is just
  `JiraCsvSampleParsingTest`). Add a minimal controller-level test for `DocumentController` covering
  upload→download→rename→delete happy path plus one 403/400 case for a non-owner, non-admin rename
  attempt (first controller test in the repo — keep it small).
- `docker compose up -d` full stack: log in, open an epic's new Documents tab, upload a file, confirm
  default display name = original filename, rename it inline and re-download to confirm the browser saves
  it under the *current* display name with byte-identical content. Upload a >25MB file and confirm a
  clean `413`/`FILE_TOO_LARGE` toast rather than a crash. As a second non-uploader member, confirm
  download works but rename/delete controls are hidden; as an admin (non-uploader), confirm they *are*
  visible and functional. Delete a document and confirm the on-disk file under
  `docker compose exec backend ls /app/data/documents` is actually removed, not just the DB row. Recreate
  the stack (`docker compose down && docker compose up -d`) and confirm previously uploaded files persist
  via the named volume. Remove a member from the epic and confirm they lose access (`403`) to that epic's
  documents.
- Frontend: `cd frontend && npm run lint` (tsc typecheck) and `npm run build` to confirm the new type,
  hooks, page, and icon keys all compile cleanly.
