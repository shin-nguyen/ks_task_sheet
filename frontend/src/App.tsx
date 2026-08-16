import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EpicsListPage } from './pages/EpicsListPage';
import { SheetPage } from './pages/SheetPage';
import { TimelinePage } from './pages/TimelinePage';
import { ReportPage } from './pages/ReportPage';
import { NotesPage } from './pages/NotesPage';
import { StatusSettingsPage } from './pages/StatusSettingsPage';
import { TeamPage } from './pages/TeamPage';
import { EpicMembersPage } from './pages/EpicMembersPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-ink2">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/epics" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
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
        <Route path="/epics/:epicId/members" element={<EpicMembersPage />} />
        <Route path="/settings/password" element={<ChangePasswordPage />} />
        <Route
          path="/settings/statuses"
          element={
            <RequireAdmin>
              <StatusSettingsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/settings/team"
          element={
            <RequireAdmin>
              <TeamPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
