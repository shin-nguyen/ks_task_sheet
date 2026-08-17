import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEpics } from '../../hooks/useEpics';
import { Avatar } from '../ui/Avatar';

const NAV_ITEMS = [
  { key: 'sheet', label: 'Sheet', icon: '▦' },
  { key: 'timeline', label: 'Timeline', icon: '📅' },
  { key: 'report', label: 'Report', icon: '📊' },
  { key: 'notes', label: 'Notes', icon: '✎' },
  { key: 'members', label: 'Members', icon: '👥' },
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
    <aside className="flex w-[240px] shrink-0 flex-col gap-1.5 bg-sidebar px-3.5 py-5 text-[#C8D4D0]">
      <div className="mb-1 font-display text-[21px] font-bold text-white">
        KS<span className="text-[#3ED8AE]">Tasks</span>
      </div>

      <div className="relative my-2.5 mb-4" ref={ref}>
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="w-full rounded-lg border border-[#2A3E3A] bg-[#1B2B28] px-3 py-2.5 text-left transition-colors hover:border-[#3A5049]"
        >
          {currentEpic ? (
            <>
              <div className="font-mono text-[13px] text-[#3ED8AE]">{currentEpic.ticketId}</div>
              <div className="mt-0.5 text-[14.5px] font-medium text-white">{currentEpic.name} ▾</div>
            </>
          ) : (
            <div className="text-[14.5px] font-medium text-white">Select an epic ▾</div>
          )}
        </button>
        {pickerOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 origin-top animate-[scale-in_0.14s_ease-out] overflow-auto rounded-lg border border-[#2A3E3A] bg-[#152420] shadow-xl">
            {epics?.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setPickerOpen(false);
                  navigate(`/epics/${e.id}/sheet`);
                }}
                className="block w-full px-3 py-2.5 text-left text-[14px] text-[#C8D4D0] transition-colors hover:bg-[#1B2B28]"
              >
                <span className="font-mono text-[#3ED8AE]">{e.ticketId}</span> · {e.name}
              </button>
            ))}
            <button
              onClick={() => {
                setPickerOpen(false);
                navigate('/epics');
              }}
              className="block w-full border-t border-[#2A3E3A] px-3 py-2.5 text-left text-[14px] text-[#9FB1AC] transition-colors hover:bg-[#1B2B28]"
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
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] transition-colors duration-150 ${
              isActive ? 'bg-sidebar-active font-semibold text-white' : 'text-[#9FB1AC] hover:bg-sidebar-hover hover:text-white'
            }`
          }
        >
          <span className="w-[17px] text-center">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}

      <div className="mt-auto border-t border-[#223531] pt-3 text-[13.5px] text-[#5F736E]">
        {user && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              <Avatar name={user.name} size={24} />
              <span className="truncate">{user.email}</span>
            </span>
          </div>
        )}
        <button onClick={() => logout()} className="mt-1.5 text-left transition-colors hover:text-white">
          Log out
        </button>
      </div>
    </aside>
  );
}
