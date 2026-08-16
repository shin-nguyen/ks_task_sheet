import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import type { Task, TaskStatus, TaskWriteInput, UserSummary } from '../../types';
import { LinkPicker } from './LinkPicker';
import { TextEditModal } from './TextEditModal';

const columnHelper = createColumnHelper<Task>();

function toWriteInput(t: Task): TaskWriteInput {
  return {
    ticketId: t.ticketId,
    title: t.title,
    description: t.description,
    type: t.type,
    note: t.note,
    beAssigneeId: t.beAssignee?.id ?? null,
    uiAssigneeId: t.uiAssignee?.id ?? null,
    testAssigneeId: t.testAssignee?.id ?? null,
    devEffort: t.devEffort,
    testEffort: t.testEffort,
    statusId: t.status.id,
  };
}

function InlineText({ value, onCommit, mono, placeholder }: { value: string; onCommit: (v: string) => void; mono?: boolean; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        className={`w-full rounded border-2 border-primary bg-white px-1.5 py-1 text-[14px] outline-none ${mono ? 'font-num' : ''}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="cursor-text rounded px-0.5 py-0.5 hover:bg-gray-50"
    >
      {value || <span className="text-[#C4CECB]">{placeholder ?? '—'}</span>}
    </div>
  );
}

function InlineNumber({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step={0.5}
        min={0}
        className="w-16 rounded border-2 border-primary bg-white px-1.5 py-1 text-right font-num text-[14px] outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const num = parseFloat(draft);
          const safe = Number.isFinite(num) && num >= 0 ? num : 0;
          if (safe !== value) onCommit(safe);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(String(value));
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="cursor-text rounded px-0.5 py-0.5 text-right font-num hover:bg-gray-50"
    >
      {value.toFixed(1)}
    </div>
  );
}

export function SheetTable({
  tasks,
  allTasksInEpic,
  users,
  statuses,
  onUpdate,
  onDelete,
  onLink,
  onUnlink,
  filteredCount,
}: {
  tasks: Task[];
  allTasksInEpic: Task[];
  users: UserSummary[];
  statuses: TaskStatus[];
  onUpdate: (id: string, input: TaskWriteInput) => void;
  onDelete: (id: string) => void;
  onLink: (id: string, targetId: string) => void;
  onUnlink: (id: string, targetId: string) => void;
  filteredCount: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [textEdit, setTextEdit] = useState<{ id: string; field: 'note' | 'description' } | null>(null);

  function patch(task: Task, changes: Partial<TaskWriteInput>) {
    onUpdate(task.id, { ...toWriteInput(task), ...changes });
  }

  function scrollTo(taskId: string) {
    const el = document.getElementById(`task-row-${taskId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-primary-soft');
      setTimeout(() => el.classList.remove('bg-primary-soft'), 1200);
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'idx',
        header: '#',
        cell: (ctx) => <span className="text-ink2">{ctx.row.index + 1}</span>,
      }),
      columnHelper.accessor('ticketId', {
        header: 'Ticket ID',
        cell: (ctx) => <span className="font-num text-[13.5px] font-medium">{ctx.getValue()}</span>,
      }),
      columnHelper.accessor('title', {
        header: 'Title',
        cell: (ctx) => <InlineText value={ctx.getValue()} onCommit={(v) => patch(ctx.row.original, { title: v })} />,
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (ctx) => {
          const task = ctx.row.original;
          const locked = task.linkedTasks.length > 0;
          return (
            <select
              value={task.type}
              disabled={locked}
              title={locked ? 'Unlink to change type' : undefined}
              onChange={(e) => {
                const type = e.target.value as 'BE' | 'UI';
                patch(task, { type, ...(type === 'BE' ? { uiAssigneeId: null } : {}) });
              }}
              className={`rounded px-1.5 py-0.5 text-[12.5px] font-semibold disabled:opacity-60 ${
                task.type === 'BE' ? 'bg-be-soft text-be' : 'bg-ui-soft text-ui'
              }`}
            >
              <option value="BE">BE</option>
              <option value="UI">UI</option>
            </select>
          );
        },
      }),
      columnHelper.display({
        id: 'link',
        header: 'Link',
        cell: (ctx) => {
          const task = ctx.row.original;
          const candidates = allTasksInEpic.filter(
            (t) => t.type !== task.type && t.id !== task.id && !task.linkedTasks.some((l) => l.id === t.id)
          );
          return (
            <LinkPicker
              task={task}
              candidates={candidates}
              onLink={(targetId) => onLink(task.id, targetId)}
              onUnlink={(targetId) => onUnlink(task.id, targetId)}
              onScrollTo={scrollTo}
            />
          );
        },
      }),
      columnHelper.display({
        id: 'beAssignee',
        header: 'BE assignee',
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <select
              value={task.beAssignee?.id ?? ''}
              onChange={(e) => patch(task, { beAssigneeId: e.target.value || null })}
              className="rounded border-0 bg-transparent text-[13.5px]"
            >
              <option value="">— unassigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.display({
        id: 'uiAssignee',
        header: 'UI assignee',
        cell: (ctx) => {
          const task = ctx.row.original;
          if (task.type === 'BE') {
            return <span className="text-[13px] text-ink2">—</span>;
          }
          return (
            <select
              value={task.uiAssignee?.id ?? ''}
              onChange={(e) => patch(task, { uiAssigneeId: e.target.value || null })}
              className="rounded border-0 bg-transparent text-[13.5px]"
            >
              <option value="">— unassigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.display({
        id: 'testAssignee',
        header: 'Test assignee',
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <select
              value={task.testAssignee?.id ?? ''}
              onChange={(e) => patch(task, { testAssigneeId: e.target.value || null })}
              className="rounded border-0 bg-transparent text-[13.5px]"
            >
              <option value="">— unassigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.accessor('devEffort', {
        header: 'Dev',
        cell: (ctx) => <InlineNumber value={ctx.getValue()} onCommit={(v) => patch(ctx.row.original, { devEffort: v })} />,
      }),
      columnHelper.accessor('testEffort', {
        header: 'Test',
        cell: (ctx) => <InlineNumber value={ctx.getValue()} onCommit={(v) => patch(ctx.row.original, { testEffort: v })} />,
      }),
      columnHelper.accessor('totalEffort', {
        header: 'Total',
        cell: (ctx) => <span className="block text-right font-num font-semibold">{ctx.getValue().toFixed(1)}</span>,
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <select
              value={task.status.id}
              onChange={(e) => patch(task, { statusId: e.target.value })}
              className="rounded border-0 bg-transparent text-[13.5px] font-medium"
              style={{ color: task.status.color }}
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id} style={{ color: '#17252A' }}>
                  {s.name}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.accessor('note', {
        header: 'Note',
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <span
              onClick={() => setTextEdit({ id: task.id, field: 'note' })}
              className="block max-w-[190px] cursor-pointer truncate text-ink2 hover:text-ink"
              title="Click to edit"
            >
              {task.note || <i className="text-[#C4CECB]">—</i>}
            </span>
          );
        },
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <span
              onClick={() => setTextEdit({ id: task.id, field: 'description' })}
              className="block max-w-[190px] cursor-pointer truncate text-ink2 hover:text-ink"
              title="Click to edit"
            >
              {task.description || <i className="text-[#C4CECB]">—</i>}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'menu',
        header: '',
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <div className="relative text-right">
              <button
                onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                className="px-1 text-ink2 hover:text-ink"
              >
                ⋯
              </button>
              {openMenuId === task.id && (
                <div className="absolute right-0 top-full z-30 mt-1 w-32 rounded-md border border-line bg-white shadow-lg">
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      setConfirmDeleteId(task.id);
                    }}
                    className="block w-full px-3 py-2 text-left text-[13.5px] text-red-600 hover:bg-red-50"
                  >
                    Delete task
                  </button>
                </div>
              )}
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTasksInEpic, users, statuses, openMenuId]
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sums = tasks.reduce(
    (acc, t) => ({ dev: acc.dev + t.devEffort, test: acc.test + t.testEffort, total: acc.total + t.totalEffort }),
    { dev: 0, test: 0, total: 0 }
  );

  const editingTask = textEdit ? tasks.find((t) => t.id === textEdit.id) ?? allTasksInEpic.find((t) => t.id === textEdit.id) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1300px] border-collapse text-[14px]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer whitespace-nowrap border-b border-line bg-[#F7FAF9] px-2.5 py-2.5 text-left text-[12.5px] uppercase tracking-wide text-ink2 hover:text-primary"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} id={`task-row-${row.original.id}`} className="border-b border-[#EDF1F0] transition-colors hover:bg-[#F7FBFA]">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-2.5 py-2 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-ink2">
                No tasks match the current filters.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={7} className="border-t-2 border-line bg-[#F7FAF9] px-2.5 py-2 font-semibold">
              Total ({filteredCount} task{filteredCount === 1 ? '' : 's'} shown)
            </td>
            <td className="border-t-2 border-line bg-[#F7FAF9] px-2.5 py-2 text-right font-num font-semibold">{sums.dev.toFixed(1)}</td>
            <td className="border-t-2 border-line bg-[#F7FAF9] px-2.5 py-2 text-right font-num font-semibold">{sums.test.toFixed(1)}</td>
            <td className="border-t-2 border-line bg-[#F7FAF9] px-2.5 py-2 text-right font-num font-semibold">{sums.total.toFixed(1)}</td>
            <td colSpan={4} className="border-t-2 border-line bg-[#F7FAF9]" />
          </tr>
        </tfoot>
      </table>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDeleteId(null)}>
          <div className="w-80 rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm text-ink">Delete this task? This also removes its BE↔UI link, if any.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="rounded-md border border-line px-3.5 py-2 text-[14px]">
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-md bg-red-600 px-3.5 py-2 text-[14px] font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {textEdit && editingTask && (
        <TextEditModal
          key={`${textEdit.id}-${textEdit.field}`}
          open
          title={textEdit.field === 'note' ? 'Edit note' : 'Edit description'}
          initialValue={(textEdit.field === 'note' ? editingTask.note : editingTask.description) ?? ''}
          onClose={() => setTextEdit(null)}
          onSave={(value) => patch(editingTask, { [textEdit.field]: value } as Partial<TaskWriteInput>)}
        />
      )}
    </div>
  );
}
