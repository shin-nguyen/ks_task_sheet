import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EpicsListPage } from './pages/EpicsListPage';
import { SheetPage } from './pages/SheetPage';
import { TimelinePage } from './pages/TimelinePage';
import { ReportPage } from './pages/ReportPage';
import { NotesPage } from './pages/NotesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { TodosPage } from './pages/TodosPage';
import { BeRequestsPage } from './pages/BeRequestsPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { StatusSettingsPage } from './pages/StatusSettingsPage';
import { TeamPage } from './pages/TeamPage';
import { EpicMembersPage } from './pages/EpicMembersPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';
import { SettingsPage } from './pages/SettingsPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-ink2">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }
  if (!user.mustChangePassword && location.pathname === '/force-password-change') {
    return <Navigate to="/epics" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/epics" replace />;
  return <>{children}</>;
}

function SettingsIndexRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/settings/statuses' : '/settings/password'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/force-password-change" element={<RequireAuth><ForcePasswordChangePage /></RequireAuth>} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/epics" replace />} />
        <Route path="/epics" element={<EpicsListPage />} />
        <Route path="/epics/:epicId/sheet" element={<SheetPage />} />
        <Route path="/epics/:epicId/timeline" element={<TimelinePage />} />
        <Route path="/epics/:epicId/report" element={<ReportPage />} />
        <Route path="/epics/:epicId/notes" element={<NotesPage />} />
        <Route path="/epics/:epicId/documents" element={<DocumentsPage />} />
        <Route path="/epics/:epicId/todos" element={<TodosPage />} />
        <Route path="/epics/:epicId/be-requests" element={<BeRequestsPage />} />
        <Route path="/epics/:epicId/meetings" element={<MeetingsPage />} />
        <Route path="/epics/:epicId/members" element={<EpicMembersPage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route index element={<SettingsIndexRedirect />} />
          <Route path="password" element={<ChangePasswordPage />} />
          <Route
            path="statuses"
            element={
              <RequireAdmin>
                <StatusSettingsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="team"
            element={
              <RequireAdmin>
                <TeamPage />
              </RequireAdmin>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
