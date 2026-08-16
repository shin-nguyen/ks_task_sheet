import { useEffect, useRef, useState } from 'react';
import type { Task } from '../../types';

export function LinkPicker({
  task,
  candidates,
  onLink,
  onUnlink,
  onScrollTo,
}: {
  task: Task;
  candidates: Task[];
  onLink: (targetId: string) => void;
  onUnlink: (targetId: string) => void;
  onScrollTo: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {task.linkedTasks.map((partner) => (
        <span key={partner.id} className="inline-flex items-center gap-1">
          <button
            onClick={() => onScrollTo(partner.id)}
            className="inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 font-mono text-[11.5px] text-primary"
            title="Jump to linked task"
          >
            🔗 {partner.ticketId}
          </button>
          <button onClick={() => onUnlink(partner.id)} className="text-[11px] text-ink2 hover:text-red-600" title="Unlink">
            ✕
          </button>
        </span>
      ))}
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((o) => !o)} className="text-[12px] text-[#C4CECB] hover:text-primary">
          ＋ link
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 max-h-56 w-48 overflow-auto rounded-md border border-line bg-white shadow-lg">
            {candidates.length === 0 && <div className="px-3 py-2 text-[12px] text-ink2">No {task.type === 'BE' ? 'UI' : 'BE'} tasks available</div>}
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onLink(c.id);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-primary-soft"
              >
                <span className="font-mono">{c.ticketId}</span> · {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
