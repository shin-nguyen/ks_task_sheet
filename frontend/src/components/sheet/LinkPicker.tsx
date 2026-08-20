import { useEffect, useRef, useState } from 'react';
import type { Task } from '../../types';
import { Icon } from '../ui/Icon';

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
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11.5px] text-primary"
            title="Jump to linked task"
          >
            <Icon name="link" size={11} />
            {partner.ticketId}
          </button>
          <button onClick={() => onUnlink(partner.id)} className="rounded-sm p-0.5 text-ink3 hover:text-danger" title="Unlink">
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-[12px] text-ink3 transition-colors hover:text-primary"
        >
          <Icon name="plus" size={11} />
          link
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 max-h-56 w-48 origin-top-left animate-[scale-in_0.12s_ease-out] overflow-auto rounded-md border border-line bg-white shadow-raised">
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
