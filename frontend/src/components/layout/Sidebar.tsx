import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEpics } from '../../hooks/useEpics';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

const NAV_ITEMS = [
  { key: 'sheet', label: 'Sheet', icon: 'sheet' as const },
  { key: 'timeline', label: 'Timeline', icon: 'timeline' as const },
  { key: 'report', label: 'Report', icon: 'report' as const },
  { key: 'notes', label: 'Notes', icon: 'notes' as const },
  { key: 'todos', label: 'Todos', icon: 'check' as const },
  { key: 'be-requests', label: 'BE Requests', icon: 'flag' as const },
  { key: 'meetings', label: 'Meetings', icon: 'clock' as const },
  { key: 'members', label: 'Members', icon: 'members' as const },
];

export function Sidebar() {
  const { epicId } = useParams();
  const { data: epics } = useEpics();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentEpic = epics?.find((e) => e.id === epicId);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <aside className="flex w-[248px] shrink-0 flex-col gap-1.5 bg-sidebar px-3.5 py-5 text-sidebar-ink">
      <div className="mb-1 flex items-center gap-2 px-0.5 font-display text-[21px] font-bold text-white">
        <span className="inline-block h-6 w-6 rounded-md bg-rail" />
        KS<span className="rail-text">Tasks</span>
      </div>

      <div className="relative my-2.5 mb-4" ref={ref}>
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="w-full rounded-md border border-sidebar-line bg-sidebar-hover px-3 py-2.5 text-left transition-colors hover:border-sidebar-ink2"
        >
          {currentEpic ? (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-mono text-[12.5px] text-ui">{currentEpic.ticketId}</span>
                <span className="mt-0.5 block truncate text-[14.5px] font-medium text-white">{currentEpic.name}</span>
              </span>
              <Icon name="chevron-down" size={14} className="shrink-0 text-sidebar-ink2" />
            </div>
          ) : (
            <div className="flex items-center justify-between text-[14.5px] font-medium text-white">
              Select an epic
              <Icon name="chevron-down" size={14} className="text-sidebar-ink2" />
            </div>
          )}
        </button>
        {pickerOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 origin-top animate-[scale-in_0.14s_ease-out] overflow-auto rounded-md border border-sidebar-line bg-[#181B2C] shadow-raised">
            {epics?.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setPickerOpen(false);
                  navigate(`/epics/${e.id}/sheet`);
                }}
                className="block w-full px-3 py-2.5 text-left text-[14px] text-sidebar-ink transition-colors hover:bg-sidebar-hover"
              >
                <span className="font-mono text-ui">{e.ticketId}</span> · {e.name}
              </button>
            ))}
            <button
              onClick={() => {
                setPickerOpen(false);
                navigate('/epics');
              }}
              className="block w-full border-t border-sidebar-line px-3 py-2.5 text-left text-[14px] text-sidebar-ink2 transition-colors hover:bg-sidebar-hover"
            >
              All epics…
            </button>
          </div>
        )}
      </div>

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={epicId ? `/epics/${epicId}/${item.key}` : '/epics'}
          className={({ isActive }) => {
            const active = isActive && !!epicId;
            return `group relative flex items-center gap-2.5 rounded-md py-2.5 pl-3 pr-3 text-[15px] transition-colors duration-150 ${
              active ? 'bg-sidebar-active font-semibold text-white' : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-white'
            }`;
          }}
        >
          {({ isActive }) => {
            const active = isActive && !!epicId;
            return (
              <>
                {active && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-rail-v" />}
                <Icon name={item.icon} size={16} className={active ? 'text-white' : 'text-sidebar-ink2 group-hover:text-white'} />
                {item.label}
              </>
            );
          }}
        </NavLink>
      ))}

      <div className="mt-auto border-t border-sidebar-line pt-3 text-[13.5px] text-sidebar-ink2">
        {user && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              <Avatar name={user.name} size={24} />
              <span className="truncate">{user.email}</span>
            </span>
          </div>
        )}
        <button onClick={() => logout()} className="mt-1.5 flex items-center gap-1.5 text-left transition-colors hover:text-white">
          <Icon name="logout" size={13} />
          Log out
        </button>
      </div>
    </aside>
  );
}
