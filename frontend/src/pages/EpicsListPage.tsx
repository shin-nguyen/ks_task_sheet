import { useState, type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEpic, useDeleteEpic, useEpics } from '../hooks/useEpics';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Topbar } from '../components/layout/Topbar';
import { isApiError, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function EpicsListPage() {
  const { data: epics, isLoading } = useEpics();
  const createEpic = useCreateEpic();
  const deleteEpic = useDeleteEpic();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [ticketId, setTicketId] = useState('');
  const [name, setName] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const epic = await createEpic.mutateAsync({ ticketId, name });
      setTicketId('');
      setName('');
      setFormOpen(false);
      navigate(`/epics/${epic.id}/sheet`);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not create epic', 'error');
    }
  }

  async function onDelete(e: MouseEvent, epicId: string, epicName: string) {
    e.stopPropagation();
    if (!confirm(`Delete epic "${epicName}"? This permanently removes all its tasks, notes, and timeline data.`)) return;
    try {
      await deleteEpic.mutateAsync(epicId);
      toast.show('Epic deleted', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not delete epic', 'error');
    }
  }

  return (
    <div>
      <Topbar title="Epics" subtitle="all feature epics" />

      <div className="card mb-5 rounded-[10px] border border-line bg-panel p-4">
        {formOpen ? (
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
              Ticket ID
              <Input className="mt-1 w-40" value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="PAY-88" required />
            </label>
            <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-ink2">
              Name
              <Input className="mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Payment Refund Flow" required />
            </label>
            <Button variant="primary" type="submit" disabled={createEpic.isPending}>
              Create epic
            </Button>
            <Button type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            + New epic
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-ink2">Loading…</p>}

      {epics && epics.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-line bg-panel p-10 text-center text-ink2">
          No epics yet — create your first epic to start tracking tasks.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {epics?.map((epic) => (
          <div
            key={epic.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/epics/${epic.id}/sheet`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/epics/${epic.id}/sheet`)}
            className="relative cursor-pointer rounded-[10px] border border-line bg-panel p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md"
          >
            {isAdmin && (
              <button
                onClick={(e) => onDelete(e, epic.id, epic.name)}
                title="Delete epic"
                className="absolute right-3 top-3 rounded-md px-1.5 py-1 text-[13px] text-ink2 hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            )}
            <div className="font-mono text-[13px] font-medium text-primary">{epic.ticketId}</div>
            <div className="mt-1 pr-6 font-display text-[16.5px] font-semibold text-ink">{epic.name}</div>
            <div className="mt-2 text-[14px] text-ink2">
              {epic.taskCount} task{epic.taskCount === 1 ? '' : 's'}
              {epic.createdByName && <> · created by {epic.createdByName}</>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
