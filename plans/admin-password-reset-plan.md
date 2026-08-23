# Admin Password Reset + Forced Change

*Status: planned, not yet implemented.*

## Context

There's currently no way to recover a forgotten password — a user who forgets their password is stuck, and there's no email infrastructure in the codebase to build a self-service "email me a reset link" flow (no `spring-boot-starter-mail`, no SMTP config, nothing). Per discussion with the user, we're building the simple version first: **an admin sets a new password for the locked-out user directly** (communicated to them out-of-band, e.g. Slack), and **the user is forced to change that password on their next login** so the admin-chosen password doesn't linger. Self-service email-based reset is deferred to a documented future phase — no code for it now.

The app already has everything needed for the admin side: a `User.Role` (`ADMIN`/`MEMBER`) system, `RequireAdmin`-gated routes, and an existing `TeamPage.tsx` admin user-management surface with the exact per-row-mutation pattern (`useUpdateUserRole`) to clone.

**Migration numbering note**: latest committed migration is `V10__epic_documents.sql`, so this plan claims `V11`. If another in-flight plan claims `V11` first, renumber at implementation time so there's no collision.

## Backend

**1. Migration** — new file `backend/src/main/resources/db/migration/V11__admin_password_reset.sql`:
```sql
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
```

**2. `User.java`** (`backend/src/main/java/dev/kstasks/auth/User.java`) — add field + explicit getter/setter (matches existing no-Lombok style):
```java
@Column(name = "must_change_password", nullable = false)
private boolean mustChangePassword = false;
```

**3. New DTO** `backend/src/main/java/dev/kstasks/auth/dto/AdminResetPasswordRequest.java`:
```java
public record AdminResetPasswordRequest(@NotBlank @Size(min = 6, max = 100) String newPassword) {}
```
No `currentPassword` field — deliberately asymmetric with `ChangePasswordRequest` since this is admin-initiated.

**4. New DTO** `backend/src/main/java/dev/kstasks/auth/dto/AuthUserResponse.java` — same shape as `UserResponse` plus the flag:
```java
public record AuthUserResponse(UUID id, String email, String name, User.Role role, boolean mustChangePassword) {
    public static AuthUserResponse from(User u) { ... }
}
```
Do **not** add `mustChangePassword` to the existing `UserResponse` record — it's reused as the embedded "public user" shape in six unrelated DTOs (`TaskResponse.beAssignee/uiAssignee/testAssignee`, `NoteResponse.author`, `DocumentResponse.uploadedBy`, `TodoResponse.assignee/createdBy`, `MeetingResponse.createdBy`, `BeTicketRequestResponse.createdBy`) — leaking a session-only flag onto every teammate/assignee object would be pointless blast radius. `AuthUserResponse` is used only by `AuthController`'s session-producing endpoints.

**5. `UserController.java`** — inject `PasswordEncoder` in the constructor alongside `UserRepository`; add, directly parallel to the existing `PATCH /{id}/role`:
```java
@PatchMapping("/{id}/password")
public ResponseEntity<Void> resetPassword(@PathVariable UUID id, @Valid @RequestBody AdminResetPasswordRequest req) {
    User target = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
    target.setPassword(passwordEncoder.encode(req.newPassword()));
    target.setMustChangePassword(true);
    userRepository.save(target);
    return ResponseEntity.noContent().build();
}
```
No self-reset block — mirrors how `updateRole` only blocks the last-admin case, not self-action, on `id == currentUser.id`.

**6. `SecurityConfig.java`** (line 55 area) — add one matcher right after the existing role one:
```java
.requestMatchers(HttpMethod.PATCH, "/api/v1/users/*/role").hasRole("ADMIN")
.requestMatchers(HttpMethod.PATCH, "/api/v1/users/*/password").hasRole("ADMIN")
```

**7. `AuthController.java`**:
- Change `signup`, `login`, `me` return types from `ResponseEntity<UserResponse>` to `ResponseEntity<AuthUserResponse>`, swapping `UserResponse.from(user)` → `AuthUserResponse.from(user)`.
- In `changePassword` (existing `PATCH /auth/password`), after `user.setPassword(...)` add `user.setMustChangePassword(false);` before save. This is the *only* place the flag gets cleared — reusing this endpoint means no new backend endpoint is needed for the forced-change flow, since the user knows their "current password" (the admin-communicated temp one).
- `UserController.list()`/`updateRole()` keep returning plain `UserResponse` — unchanged, team list doesn't need the flag.

## Frontend

**8. `src/types/index.ts`** — add near `UserSummary`:
```ts
export interface AuthUser extends UserSummary { mustChangePassword: boolean; }
```

**9. `src/context/AuthContext.tsx`** — change `user` state/`AuthContextValue.user` type from `UserSummary | null` to `AuthUser | null` (and the three `api.*<...>()` generics in the mount effect / `login` / `signup`). In `changePassword`, clear the flag client-side after the API call succeeds (avoids an extra `/auth/me` round trip):
```ts
await api.patch('/auth/password', { currentPassword, newPassword });
setUser((u) => (u ? { ...u, mustChangePassword: false } : u));
```

**10. Extract `src/components/auth/PasswordChangeForm.tsx`** (new) — pull the state/handler/JSX currently inline in `ChangePasswordPage.tsx` (lines 8-88) into a reusable component: `{ onSuccess?: () => void; submitLabel?: string }`, same fields, same `useAuth().changePassword` call, same toast-on-success, calling `onSuccess?.()` after. **`ChangePasswordPage.tsx`** shrinks to `<Topbar/>` + card wrapping `<PasswordChangeForm/>` (pixel-identical to today).

**11. New `src/pages/ForcePasswordChangePage.tsx`** — standalone centered card (no `Topbar`/sidebar), explains an admin reset their password, renders `<PasswordChangeForm submitLabel="Continue" onSuccess={() => navigate('/epics', {replace:true})} />`, plus a "Log out instead" link calling `useAuth().logout()`.

**12. `src/App.tsx`**:
- `RequireAuth` becomes the single choke point enforcing the redirect (it already wraps the entire authenticated route tree including `AppLayout`, so it's the one place that guarantees no nested route — including direct URL nav — can render while flagged):
```tsx
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div ...>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }
  if (!user.mustChangePassword && location.pathname === '/force-password-change') {
    return <Navigate to="/epics" replace />;
  }
  return <>{children}</>;
}
```
- Add a new top-level route, sibling of `/login`/`/signup` (**outside** the `AppLayout` group, so no sidebar renders):
```tsx
<Route path="/force-password-change" element={<RequireAuth><ForcePasswordChangePage /></RequireAuth>} />
```
- Logout always works from this page regardless of the flag, since the button is on the page itself, not the (unrendered) sidebar.
- Note for implementer: an already-open session in another tab won't see the flag until its next `/auth/me` refresh (page reload) — matches "next login," not a bug.

**13. `src/hooks/useUsers.ts`** — add, mirroring `useUpdateUserRole` exactly:
```ts
export function useAdminResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.patch<void>(`/users/${id}/password`, { newPassword }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
```

**14. `src/pages/TeamPage.tsx`** — add a `ResetPasswordModal` component in the same file (matches the existing inline-`TeamRow` convention): new-password + confirm-password `Input`s inside a `Modal` (`width={420}`), footer with Cancel/Reset `Button`s (submit button needs `form="reset-password-form"` since `Modal`'s footer sits outside the `<form>` DOM node — confirmed `Button` spreads native props so `form`/`type` pass through), client-side mismatch check, `useAdminResetPassword()` mutation, `toast.show(...)` success/error. In `TeamRow`, add a ghost `<Button>Reset password</Button>` next to the role `<Select>` that opens the modal (local `useState` for open/closed). No new icon needed — plain text button, consistent with the role `Select` also having no icon.

## Deferred (not implemented): self-service email reset

Documented as a future phase only: `spring-boot-starter-mail` + SMTP env vars, a `password_reset_tokens` table (user_id, hashed token, expires_at, used_at) via a new Flyway migration, and two new **public** `AuthController` endpoints — `POST /auth/forgot-password` (always 204, avoids user enumeration) and `POST /auth/reset-password` (validates token, sets password, clears `mustChangePassword`, marks token used).

## CLAUDE.md

After implementation, update the "Auth is stateless JWT-in-httpOnly-cookie" bullet to mention the new `PATCH /api/v1/users/{id}/password` admin-reset endpoint, the `must_change_password` column, and why `AuthUserResponse` is split from `UserResponse` (so a future reader doesn't "helpfully" merge them back). Standard last step per the `implement-feature` skill (log to feature.md, update CLAUDE.md, commit) — not done in this planning pass.

## Critical files

- `backend/src/main/java/dev/kstasks/auth/UserController.java`
- `backend/src/main/java/dev/kstasks/auth/AuthController.java`
- `backend/src/main/java/dev/kstasks/config/SecurityConfig.java`
- `backend/src/main/resources/db/migration/V11__admin_password_reset.sql`
- `frontend/src/App.tsx`
- `frontend/src/pages/TeamPage.tsx`
- `frontend/src/context/AuthContext.tsx`

## Verification

1. Backend: `cd backend && ./mvnw test` (Flyway migration applies cleanly against the test DB; no existing test asserts on `UserResponse`/`AuthUserResponse` shape today, but double-check `JiraCsvSampleParsingTest` and any auth-adjacent tests still pass).
2. Manual end-to-end: `docker compose up -d db`, run backend (`./mvnw spring-boot:run`) and frontend (`npm run dev`), log in as `alice@team.dev`/`password123` (admin per seed data). Go to `/settings/team`, click "Reset password" on another seeded user (e.g. Ben), set a new password. Log out, log in as that user with the new password — should immediately land on `/force-password-change` with no sidebar. Try navigating directly to `/epics` or `/settings/statuses` while in this state — should bounce back to `/force-password-change`. Complete the form — should land on `/epics` normally, and a subsequent login should not force the change again.
3. Confirm logout works from the forced-change page.
4. `npm run lint` (tsc typecheck) in `frontend/` after the `AuthUser`/`UserSummary` type changes to make sure no other consumer of `useAuth().user` breaks.
