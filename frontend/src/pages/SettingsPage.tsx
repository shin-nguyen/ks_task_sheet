import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { isAdmin } = useAuth();
  const tabs = [
    ...(isAdmin
      ? [
          { to: '/settings/statuses', label: 'Statuses' },
          { to: '/settings/team', label: 'Team' },
          { to: '/settings/notify', label: 'Notifications' },
        ]
      : []),
    { to: '/settings/password', label: 'Account' },
  ];

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-line">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `relative -mb-px border-b-2 px-4 py-2.5 text-[14.5px] font-medium transition-colors ${
                isActive ? 'border-primary text-primary' : 'border-transparent text-ink2 hover:border-line hover:text-ink'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
