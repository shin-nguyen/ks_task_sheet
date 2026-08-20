import { useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEpic } from '../hooks/useEpics';
import { useCreateTask, useDeleteTask, useLinkTask, useTasks, useUnlinkTask, useUpdateTask, tasksKey } from '../hooks/useTasks';
import { useUsers } from '../hooks/useUsers';
import { useStatuses } from '../hooks/useStatuses';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SheetTable } from '../components/sheet/SheetTable';
import { ImportCsvModal } from '../components/sheet/ImportCsvModal';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import type { TaskType } from '../types';

export function SheetPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: tasks, isLoading } = useTasks(epicId);
  const { data: users } = useUsers();
  const { data: statuses } = useStatuses();
  const toast = useToast();
  const queryClient = useQueryClient();

  const createTask = useCreateTask(epicId!);
  const updateTask = useUpdateTask(epicId!);
  const deleteTask = useDeleteTask(epicId!);
  const linkTask = useLinkTask(epicId!);
  const unlinkTask = useUnlinkTask(epicId!);

  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [importOpen, setImportOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTicket, setNewTicket] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TaskType>('BE');

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (search && !`${t.ticketId} ${t.title}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && t.status.id !== statusFilter) return false;
      if (
        assigneeFilter !== 'ALL' &&
        t.beAssignee?.id !== assigneeFilter &&
        t.uiAssignee?.id !== assigneeFilter &&
        t.testAssignee?.id !== assigneeFilter
      )
        return false;
      return true;
    });
  }, [tasks, search, typeFilter, statusFilter, assigneeFilter]);

  async function handleUpdate(id: string, input: Parameters<typeof updateTask.mutateAsync>[0]['input']) {
    try {
      await updateTask.mutateAsync({ id, input });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not save change', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask.mutateAsync(id);
      toast.show('Task deleted', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not delete task', 'error');
    }
  }

  async function handleLink(id: string, targetId: string) {
    try {
      await linkTask.mutateAsync({ id, targetTaskId: targetId });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not link tasks', 'error');
    }
  }

  async function handleUnlink(id: string, targetId: string) {
    try {
      await unlinkTask.mutateAsync({ id, targetTaskId: targetId });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not unlink', 'error');
    }
  }

  async function submitNewTask(e: FormEvent) {
    e.preventDefault();
    if (!statuses || statuses.length === 0) return;
    try {
      await createTask.mutateAsync({
        ticketId: newTicket,
        title: newTitle,
        description: null,
        type: newType,
        note: null,
        beAssigneeId: null,
        uiAssigneeId: null,
        testAssigneeId: null,
        devEffort: 0,
        testEffort: 0,
        statusId: statuses[0].id,
      });
      setNewTicket('');
      setNewTitle('');
      setAdding(false);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not create task', 'error');
    }
  }

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    tasks?.forEach((t) => {
      if (t.beAssignee) map.set(t.beAssignee.id, t.beAssignee.name);
      if (t.uiAssignee) map.set(t.uiAssignee.id, t.uiAssignee.name);
      if (t.testAssignee) map.set(t.testAssignee.id, t.testAssignee.name);
    });
    return Array.from(map.entries());
  }, [tasks]);

  if (!epicId) return null;

  return (
    <div>
      <Topbar title="Sheet" subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined} />

      <div className="rounded-lg border border-line bg-panel shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative">
            <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink3" />
            <Input
              placeholder="Search ticket / title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 pl-8"
            />
          </div>
          <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="ALL">Assignee: All</option>
            {assignees.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">Type: All</option>
            <option value="BE">BE</option>
            <option value="UI">UI</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Status: All</option>
            {statuses?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <span className="text-xs text-ink3">Click a header to sort</span>
          <span className="flex-1" />
          <Button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5">
            <Icon name="upload" size={14} />
            Import CSV
          </Button>
          <Button variant="primary" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} />
            Task
          </Button>
        </div>

        {isLoading && <p className="p-6 text-sm text-ink2">Loading tasks…</p>}

        {!isLoading && tasks && tasks.length === 0 && !adding && (
          <div className="p-10 text-center text-ink2">
            No tasks yet — add your first task.
            <div className="mt-3">
              <Button variant="primary" onClick={() => setAdding(true)}>
                + Task
              </Button>
            </div>
          </div>
        )}

        {!isLoading && tasks && tasks.length > 0 && users && statuses && (
          <SheetTable
            epicId={epicId}
            tasks={filtered}
            allTasksInEpic={tasks}
            users={users}
            statuses={statuses}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onLink={handleLink}
            onUnlink={handleUnlink}
            filteredCount={filtered.length}
          />
        )}

        <div className="border-t border-line p-2">
          {adding ? (
            <form onSubmit={submitNewTask} className="flex flex-wrap items-center gap-2 p-1.5">
              <Input placeholder="Ticket ID (e.g. BE-107)" value={newTicket} onChange={(e) => setNewTicket(e.target.value)} required className="w-40" />
              <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className="flex-1 min-w-[200px]" />
              <Select value={newType} onChange={(e) => setNewType(e.target.value as TaskType)}>
                <option value="BE">BE</option>
                <option value="UI">UI</option>
              </Select>
              <Button variant="primary" type="submit" disabled={createTask.isPending}>
                Add
              </Button>
              <Button type="button" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-2 rounded-sm border border-dashed border-line p-2.5 text-left text-ink2 transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
            >
              <Icon name="plus" size={14} />
              New task — type directly, Google-Sheets style…
            </button>
          )}
        </div>
      </div>

      {epicId && (
        <ImportCsvModal
          epicId={epicId}
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: tasksKey(epicId) })}
        />
      )}
    </div>
  );
}
