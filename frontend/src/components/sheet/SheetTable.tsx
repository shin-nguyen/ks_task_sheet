import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnSizingState,
  type SortingState,
} from '@tanstack/react-table';
import type { Task, TaskStatus, TaskWriteInput, UserSummary } from '../../types';
import { LinkPicker } from './LinkPicker';
import { TextEditModal } from './TextEditModal';
import { Tooltip } from '../ui/Tooltip';
import { SearchableSelect } from '../ui/SearchableSelect';

const columnHelper = createColumnHelper<Task>();

// Columns pinned to the left edge while the sheet scrolls horizontally.
const STICKY_COLUMN_IDS = ['idx', 'ticketId'];

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

function loadColumnSizing(epicId: string): ColumnSizingState {
  try {
    const raw = localStorage.getItem(`sheet-col-widths:${epicId}`);
    return raw ? (JSON.parse(raw) as ColumnSizingState) : {};
  } catch {
    return {};
  }
}

function TruncatedText({ value, placeholder }: { value: string; placeholder?: string }) {
  if (!value) return <span className="text-[#C4CECB]">{placeholder ?? '—'}</span>;
  // Column widths are user-resizable, so whether text actually overflows can't be
  // known from length alone — show the tooltip for any non-empty value, same as a native title.
  return (
    <Tooltip label={value}>
      <span className="block truncate">{value}</span>
    </Tooltip>
  );
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
      className="block w-full min-w-0 cursor-text rounded px-0.5 py-0.5 hover:bg-gray-50"
    >
      <TruncatedText value={value} placeholder={placeholder} />
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
  epicId,
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
  epicId: string;
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
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => loadColumnSizing(epicId));
  const persistTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setColumnSizing(loadColumnSizing(epicId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epicId]);

  function handleColumnSizingChange(updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) {
    setColumnSizing((old) => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        localStorage.setItem(`sheet-col-widths:${epicId}`, JSON.stringify(next));
      }, 250);
      return next;
    });
  }

  function patch(task: Task, changes: Partial<TaskWriteInput>) {
    onUpdate(task.id, { ...toWriteInput(task), ...changes });
  }

  const userOptions = useMemo(() => users.map((u) => ({ id: u.id, label: u.name })), [users]);

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
        size: 42,
        minSize: 36,
        maxSize: 64,
        cell: (ctx) => <span className="text-ink2">{ctx.row.index + 1}</span>,
      }),
      columnHelper.accessor('ticketId', {
        header: 'Ticket ID',
        size: 112,
        minSize: 80,
        maxSize: 220,
        cell: (ctx) => <span className="font-num text-[13.5px] font-medium">{ctx.getValue()}</span>,
      }),
      columnHelper.accessor('title', {
        header: 'Title',
        size: 240,
        minSize: 120,
        maxSize: 600,
        cell: (ctx) => <InlineText value={ctx.getValue()} onCommit={(v) => patch(ctx.row.original, { title: v })} />,
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        size: 90,
        minSize: 80,
        maxSize: 130,
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
        size: 170,
        minSize: 100,
        maxSize: 320,
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
        size: 150,
        minSize: 100,
        maxSize: 260,
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <SearchableSelect
              variant="ghost"
              value={task.beAssignee?.id ?? ''}
              onChange={(id) => patch(task, { beAssigneeId: id || null })}
              options={userOptions}
              emptyOption={{ id: '', label: '— unassigned —' }}
              placeholder="— unassigned —"
            />
          );
        },
      }),
      columnHelper.display({
        id: 'uiAssignee',
        header: 'UI assignee',
        size: 150,
        minSize: 100,
        maxSize: 260,
        cell: (ctx) => {
          const task = ctx.row.original;
          if (task.type === 'BE') {
            return <span className="text-[13px] text-ink2">—</span>;
          }
          return (
            <SearchableSelect
              variant="ghost"
              value={task.uiAssignee?.id ?? ''}
              onChange={(id) => patch(task, { uiAssigneeId: id || null })}
              options={userOptions}
              emptyOption={{ id: '', label: '— unassigned —' }}
              placeholder="— unassigned —"
            />
          );
        },
      }),
      columnHelper.display({
        id: 'testAssignee',
        header: 'Test assignee',
        size: 150,
        minSize: 100,
        maxSize: 260,
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <SearchableSelect
              variant="ghost"
              value={task.testAssignee?.id ?? ''}
              onChange={(id) => patch(task, { testAssigneeId: id || null })}
              options={userOptions}
              emptyOption={{ id: '', label: '— unassigned —' }}
              placeholder="— unassigned —"
            />
          );
        },
      }),
      columnHelper.accessor('devEffort', {
        header: 'Dev',
        size: 76,
        minSize: 60,
        maxSize: 120,
        cell: (ctx) => <InlineNumber value={ctx.getValue()} onCommit={(v) => patch(ctx.row.original, { devEffort: v })} />,
      }),
      columnHelper.accessor('testEffort', {
        header: 'Test',
        size: 76,
        minSize: 60,
        maxSize: 120,
        cell: (ctx) => <InlineNumber value={ctx.getValue()} onCommit={(v) => patch(ctx.row.original, { testEffort: v })} />,
      }),
      columnHelper.accessor('totalEffort', {
        header: 'Total',
        size: 84,
        minSize: 64,
        maxSize: 120,
        cell: (ctx) => <span className="block text-right font-num font-semibold">{ctx.getValue().toFixed(1)}</span>,
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        size: 150,
        minSize: 100,
        maxSize: 260,
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <select
              value={task.status.id}
              onChange={(e) => patch(task, { statusId: e.target.value })}
              className="w-full rounded border-0 bg-transparent text-[13.5px] font-medium"
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
        size: 200,
        minSize: 100,
        maxSize: 500,
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <button
              onClick={() => setTextEdit({ id: task.id, field: 'note' })}
              className="block w-full min-w-0 cursor-pointer text-left text-ink2 hover:text-ink"
              title="Click to edit"
            >
              <TruncatedText value={task.note ?? ''} />
            </button>
          );
        },
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        size: 200,
        minSize: 100,
        maxSize: 500,
        cell: (ctx) => {
          const task = ctx.row.original;
          return (
            <button
              onClick={() => setTextEdit({ id: task.id, field: 'description' })}
              className="block w-full min-w-0 cursor-pointer text-left text-ink2 hover:text-ink"
              title="Click to edit"
            >
              <TruncatedText value={task.description ?? ''} />
            </button>
          );
        },
      }),
      columnHelper.display({
        id: 'menu',
        header: '',
        size: 44,
        minSize: 44,
        maxSize: 44,
        enableResizing: false,
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
                <div className="absolute right-0 top-full z-30 mt-1 w-32 origin-top-right animate-[scale-in_0.12s_ease-out] rounded-md border border-line bg-white shadow-lg">
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
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: handleColumnSizingChange,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const leafColumns = table.getVisibleLeafColumns();
  const stickyLeft = useMemo(() => {
    const offsets: Record<string, number> = {};
    let acc = 0;
    for (const col of leafColumns) {
      if (STICKY_COLUMN_IDS.includes(col.id)) offsets[col.id] = acc;
      acc += col.getSize();
    }
    return offsets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafColumns, columnSizing]);

  function stickyCellProps(columnId: string) {
    if (!STICKY_COLUMN_IDS.includes(columnId)) return {};
    return {
      className: 'sticky z-20 shadow-[2px_0_4px_rgba(15,27,25,0.06)]',
      style: { left: stickyLeft[columnId] },
    };
  }

  const sums = tasks.reduce(
    (acc, t) => ({ dev: acc.dev + t.devEffort, test: acc.test + t.testEffort, total: acc.total + t.totalEffort }),
    { dev: 0, test: 0, total: 0 }
  );

  const editingTask = textEdit ? tasks.find((t) => t.id === textEdit.id) ?? allTasksInEpic.find((t) => t.id === textEdit.id) : null;

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[14px]" style={{ width: table.getTotalSize(), tableLayout: 'fixed' }}>
        <colgroup>
          {leafColumns.map((col) => (
            <col key={col.id} style={{ width: col.getSize() }} />
          ))}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className={`group/th relative whitespace-nowrap border-b border-line bg-[#F7FAF9] px-2.5 py-2.5 text-left text-[12.5px] uppercase tracking-wide text-ink2 ${
                    STICKY_COLUMN_IDS.includes(header.column.id) ? 'sticky z-20 shadow-[2px_0_4px_rgba(15,27,25,0.06)]' : ''
                  }`}
                  style={STICKY_COLUMN_IDS.includes(header.column.id) ? { left: stickyLeft[header.column.id] } : undefined}
                >
                  <span onClick={header.column.getToggleSortingHandler()} className="cursor-pointer hover:text-primary">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                  </span>
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute right-0 top-0 z-30 h-full w-1.5 cursor-col-resize touch-none select-none opacity-0 group-hover/th:opacity-100 ${
                        header.column.getIsResizing() ? 'bg-primary opacity-100' : 'bg-line'
                      }`}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} id={`task-row-${row.original.id}`} className="group border-b border-[#EDF1F0] transition-colors hover:bg-[#F7FBFA]">
              {row.getVisibleCells().map((cell) => {
                const sticky = stickyCellProps(cell.column.id);
                return (
                  <td
                    key={cell.id}
                    {...sticky}
                    className={`px-2.5 py-2 align-middle ${sticky.className ?? ''} ${
                      STICKY_COLUMN_IDS.includes(cell.column.id) ? 'bg-white transition-colors group-hover:bg-[#F7FBFA]' : ''
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={leafColumns.length} className="px-3 py-10 text-center text-ink2">
                No tasks match the current filters.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} className="border-t-2 border-line bg-[#F7FAF9] px-2.5 py-2 font-semibold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-[fade-in_0.12s_ease-out]" onClick={() => setConfirmDeleteId(null)}>
          <div className="w-80 origin-center animate-[scale-in_0.15s_ease-out] rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
