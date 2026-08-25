import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo, type TodoInput } from '../hooks/useTodos';
import { useUsers } from '../hooks/useUsers';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Avatar } from '../components/ui/Avatar';
import { formatShort, parseDateKey } from '../lib/scheduling';
import type { EpicTodo } from '../types';

function toInput(t: EpicTodo): TodoInput {
  return { title: t.title, assigneeId: t.assignee?.id ?? null, dueDate: t.dueDate, done: t.done };
}

function TodoCard({ todo, onToggle, onOpen }: { todo: EpicTodo; onToggle: () => void; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="flex flex-col gap-2.5 rounded-lg border border-line bg-panel p-3.5 text-left shadow-card transition-all duration-150 hover:border-primary/40 hover:shadow-raised"
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
            todo.done ? 'border-done bg-done text-white' : 'border-ink3/50 bg-white hover:border-primary'
          }`}
        >
          {todo.done && <Icon name="check" size={12} strokeWidth={2.2} />}
        </button>
        <p className={`line-clamp-2 flex-1 text-[14px] leading-snug ${todo.done ? 'text-ink3 line-through' : 'text-ink'}`}>{todo.title}</p>
      </div>
      <div className="flex items-center justify-between gap-2 pl-[30px]">
        {todo.assignee ? (
          <span className="inline-flex min-w-0 items-center gap-1 text-[12.5px] text-ink2">
            <Avatar name={todo.assignee.name} size={16} />
            <span className="truncate">{todo.assignee.name}</span>
          </span>
        ) : (
          <span className="text-[12.5px] text-ink3">Unassigned</span>
        )}
        {todo.dueDate && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel2 py-0.5 pl-1.5 pr-2 font-mono text-[10.5px] text-ink2">
            <Icon name="flag" size={9} className="opacity-60" />
            {formatShort(parseDateKey(todo.dueDate))}
          </span>
        )}
      </div>
    </div>
  );
}

function TodoDetailModal({
  todo,
  userOptions,
  onPatch,
  onDelete,
  onClose,
}: {
  todo: EpicTodo;
  userOptions: { id: string; label: string }[];
  onPatch: (changes: Partial<TodoInput>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(todo.title);

  return (
    <Modal
      open
      onClose={onClose}
      title="Todo"
      width={480}
      footer={
        <>
          <Button variant="danger" onClick={onDelete} className="mr-auto">
            Delete
          </Button>
          <Button onClick={() => onPatch({ done: !todo.done })} className={todo.done ? '' : 'text-done'}>
            {todo.done ? 'Reopen' : 'Resolve'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Title</label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== todo.title) onPatch({ title: title.trim() });
              else setTitle(todo.title);
            }}
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Assignee</label>
          <SearchableSelect
            value={todo.assignee?.id ?? ''}
            onChange={(id) => onPatch({ assigneeId: id || null })}
            options={userOptions}
            emptyOption={{ id: '', label: '— unassigned —' }}
            placeholder="Unassigned"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Due date</label>
          <Input
            type="date"
            value={todo.dueDate ?? ''}
            onChange={(e) => onPatch({ dueDate: e.target.value ? e.target.value : null })}
            className="w-full"
          />
        </div>
      </div>
    </Modal>
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
  const [openId, setOpenId] = useState<string | null>(null);

  if (!epicId) return null;

  const userOptions = (users ?? []).map((u) => ({ id: u.id, label: u.name }));
  const openTodo = todos?.find((t) => t.id === openId) ?? null;

  function patch(todo: EpicTodo, changes: Partial<TodoInput>) {
    updateTodo.mutate({ id: todo.id, input: { ...toInput(todo), ...changes } });
  }

  return (
    <div>
      <Topbar title="Todos" subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined} />

      <div className="mb-3">
        {adding ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              await createTodo.mutateAsync({ title: draft.trim(), assigneeId: null, dueDate: null, done: false });
              setDraft('');
              setAdding(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-line bg-panel p-2.5 shadow-card"
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

      {todos && todos.length === 0 && <p className="text-[14.5px] text-ink2">No todos yet.</p>}

      {todos && todos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {todos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onToggle={() => patch(todo, { done: !todo.done })} onOpen={() => setOpenId(todo.id)} />
          ))}
        </div>
      )}

      {openTodo && (
        <TodoDetailModal
          todo={openTodo}
          userOptions={userOptions}
          onPatch={(changes) => patch(openTodo, changes)}
          onDelete={() => {
            deleteTodo.mutate(openTodo.id);
            setOpenId(null);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
