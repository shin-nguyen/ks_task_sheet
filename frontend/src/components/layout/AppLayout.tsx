import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../ui/Icon';

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 p-7 md:p-9">
        <Outlet />
      </main>
      {user && (
        <button
          onClick={() => navigate('/settings')}
          title="Settings"
          className="fixed right-6 top-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-ink2 shadow-card transition-all duration-200 hover:rotate-45 hover:text-primary hover:shadow-raised"
        >
          <Icon name="gear" size={17} />
        </button>
      )}
    </div>
  );
}
