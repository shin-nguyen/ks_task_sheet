import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo, type TodoInput } from '../hooks/useTodos';
import { useUsers } from '../hooks/useUsers';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Avatar } from '../components/ui/Avatar';
import { formatShort, parseDateKey } from '../lib/scheduling';
import type { EpicTodo } from '../types';

function toInput(t: EpicTodo): TodoInput {
  return { title: t.title, assigneeId: t.assignee?.id ?? null, dueDate: t.dueDate, done: t.done };
}

function InlineTitle({ value, done, onCommit }: { value: string; done: boolean; onCommit: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full rounded-sm border-2 border-primary bg-white px-1.5 py-1 text-[14.5px] outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft !== value) onCommit(draft.trim());
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
      className={`cursor-text truncate rounded-sm px-1.5 py-1 text-[14.5px] hover:bg-panel2 ${done ? 'text-ink3 line-through' : 'text-ink'}`}
    >
      {value}
    </div>
  );
}

function DuePill({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={value ?? ''}
        onBlur={(e) => {
          onChange(e.target.value ? e.target.value : null);
          setEditing(false);
        }}
        className="w-fit rounded-full border border-primary/40 bg-primary-soft px-2 py-0.5 font-mono text-[11px] text-primary outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-line bg-panel2 py-0.5 pl-2 pr-1.5 font-mono text-[11px] text-ink2 transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
    >
      <Icon name="flag" size={9} className="opacity-60 group-hover:opacity-100" />
      {value ? formatShort(parseDateKey(value)) : 'no due date'}
      <Icon name="pencil" size={9} className="opacity-0 transition-opacity group-hover:opacity-70" />
    </button>
  );
}

export function TodosPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: todos } = useTodos(epicId);
  const { data: users } = useUsers();
  const createTodo = useCreateTodo(epicId!);
  const updateTodo = useUpdateTodo(epicId!);
  const deleteTodo = useDeleteTodo(epicId!);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  if (!epicId) return null;

  const userOptions = (users ?? []).map((u) => ({ id: u.id, label: u.name }));

  function patch(todo: EpicTodo, changes: Partial<TodoInput>) {
    updateTodo.mutate({ id: todo.id, input: { ...toInput(todo), ...changes } });
  }

  return (
    <div>
      <Topbar title="Todos" subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined} />

      <div className="max-w-[760px] rounded-lg border border-line bg-panel shadow-card">
        {todos?.map((todo) => (
          <div key={todo.id} className="flex items-center gap-3 border-b border-line2 px-4 py-3 last:border-b-0">
            <button
              onClick={() => patch(todo, { done: !todo.done })}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                todo.done ? 'border-done bg-done text-white' : 'border-ink3/50 bg-white hover:border-primary'
              }`}
            >
              {todo.done && <Icon name="check" size={12} strokeWidth={2.2} />}
            </button>

            <div className="min-w-0 flex-1">
              <InlineTitle value={todo.title} done={todo.done} onCommit={(v) => patch(todo, { title: v })} />
            </div>

            <div className="flex w-40 shrink-0 items-center gap-1.5">
              {todo.assignee && <Avatar name={todo.assignee.name} size={18} />}
              <SearchableSelect
                variant="ghost"
                className="min-w-0 flex-1"
                value={todo.assignee?.id ?? ''}
                onChange={(id) => patch(todo, { assigneeId: id || null })}
                options={userOptions}
                emptyOption={{ id: '', label: '— unassigned —' }}
                placeholder="Unassigned"
              />
            </div>

            <DuePill value={todo.dueDate} onChange={(v) => patch(todo, { dueDate: v })} />

            <button
              onClick={() => deleteTodo.mutate(todo.id)}
              className="shrink-0 rounded-sm p-1.5 text-ink3 transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}

        {todos && todos.length === 0 && !adding && <p className="p-6 text-center text-[14.5px] text-ink2">No todos yet.</p>}

        <div className="p-2">
          {adding ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                await createTodo.mutateAsync({ title: draft.trim(), assigneeId: null, dueDate: null, done: false });
                setDraft('');
                setAdding(false);
              }}
              className="flex items-center gap-2 p-1"
            >
              <input
                autoFocus
                placeholder="Todo title…"
                className="flex-1 rounded-sm border border-line bg-white px-3 py-2 text-[14.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setAdding(false);
                    setDraft('');
                  }
                }}
              />
              <Button variant="primary" type="submit" disabled={!draft.trim()}>
                Add
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setDraft('');
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-line bg-transparent p-3 text-[14.5px] text-ink2 transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
            >
              <Icon name="plus" size={14} />
              Add todo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
