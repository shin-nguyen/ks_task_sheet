import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useTasks } from '../hooks/useTasks';
import { useBeRequests, useCreateBeRequest, useDeleteBeRequest, useUpdateBeRequest } from '../hooks/useBeRequests';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Markdown } from '../components/ui/Markdown';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import type { BeTicketRequest } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function RequestRow({
  request,
  onUpdate,
  onDelete,
}: {
  request: BeTicketRequest;
  onUpdate: (id: string, changes: { note: string; apiDesign: string | null; resolved: boolean }) => void;
  onDelete: (id: string) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(request.note);
  const [editingDesign, setEditingDesign] = useState(false);
  const [designDraft, setDesignDraft] = useState(request.apiDesign ?? '');
  const { epicId } = useParams<{ epicId: string }>();

  function saveNote() {
    setEditingNote(false);
    if (noteDraft.trim() && noteDraft !== request.note) {
      onUpdate(request.id, { note: noteDraft.trim(), apiDesign: request.apiDesign, resolved: request.resolved });
    }
  }

  function saveDesign() {
    setEditingDesign(false);
    const trimmed = designDraft.trim();
    if (trimmed !== (request.apiDesign ?? '')) {
      onUpdate(request.id, { note: request.note, apiDesign: trimmed || null, resolved: request.resolved });
    }
  }

  return (
    <div className="border-b border-line2 p-4 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link
          to={`/epics/${epicId}/sheet?focus=${request.uiTask.id}`}
          className="font-mono text-[13px] font-medium text-primary hover:underline"
        >
          {request.uiTask.ticketId} · {request.uiTask.title}
        </Link>
        <div className="flex items-center gap-1 text-[13px] text-ink2">
          <button
            onClick={() => onUpdate(request.id, { note: request.note, apiDesign: request.apiDesign, resolved: !request.resolved })}
            className={`flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-primary-soft hover:text-primary ${
              request.resolved ? '' : 'text-done'
            }`}
          >
            <Icon name="check" size={12} />
            {request.resolved ? 'Reopen' : 'Resolve'}
          </button>
          <button onClick={() => onDelete(request.id)} className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-danger-soft hover:text-danger">
            <Icon name="trash" size={12} />
            Delete
          </button>
        </div>
      </div>

      {editingNote ? (
        <textarea
          autoFocus
          className="h-20 w-full resize-none rounded-sm border border-line p-2 text-[14.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={saveNote}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setNoteDraft(request.note);
              setEditingNote(false);
            }
          }}
        />
      ) : (
        <div
          onClick={() => {
            setNoteDraft(request.note);
            setEditingNote(true);
          }}
          className="cursor-text rounded-sm px-1 py-1 hover:bg-panel2"
        >
          <Markdown content={request.note} />
        </div>
      )}

      <div className="mt-2.5">
        <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-ink3">API design (markdown supported)</div>
        {editingDesign ? (
          <textarea
            autoFocus
            placeholder="Endpoint, request/response shape, edge cases… (markdown supported)"
            className="h-32 w-full resize-none rounded-sm border border-line bg-panel2 p-2 font-mono text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            value={designDraft}
            onChange={(e) => setDesignDraft(e.target.value)}
            onBlur={saveDesign}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDesignDraft(request.apiDesign ?? '');
                setEditingDesign(false);
              }
            }}
          />
        ) : request.apiDesign ? (
          <div
            onClick={() => {
              setDesignDraft(request.apiDesign ?? '');
              setEditingDesign(true);
            }}
            className="cursor-text rounded-sm bg-panel2 p-2 hover:bg-primary-soft"
          >
            <Markdown content={request.apiDesign} className="text-[13.5px]" />
          </div>
        ) : (
          <button
            onClick={() => {
              setDesignDraft('');
              setEditingDesign(true);
            }}
            className="w-full rounded-sm border border-dashed border-line px-2 py-1.5 text-left text-[13px] text-ink3 transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
          >
            + Add API design (endpoint, request/response shape…)
          </button>
        )}
      </div>

      <div className="mt-2.5 text-[12.5px] text-ink3">
        {request.createdBy.name} · {formatDate(request.createdAt)}
        {request.resolved && request.resolvedAt && <> · resolved {formatDate(request.resolvedAt)}</>}
      </div>
    </div>
  );
}

export function BeRequestsPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: tasks } = useTasks(epicId);
  const { data: requests } = useBeRequests(epicId);
  const toast = useToast();

  const createRequest = useCreateBeRequest(epicId!);
  const updateRequest = useUpdateBeRequest(epicId!);
  const deleteRequest = useDeleteBeRequest(epicId!);

  const [modalOpen, setModalOpen] = useState(false);
  const [uiTaskId, setUiTaskId] = useState('');
  const [note, setNote] = useState('');
  const [apiDesign, setApiDesign] = useState('');

  const uiTaskOptions = useMemo(
    () => (tasks ?? []).filter((t) => t.type === 'UI').map((t) => ({ id: t.id, label: `${t.ticketId} · ${t.title}` })),
    [tasks]
  );

  const open = requests?.filter((r) => !r.resolved) ?? [];
  const resolved = requests?.filter((r) => r.resolved) ?? [];

  async function handleUpdate(id: string, changes: { note: string; apiDesign: string | null; resolved: boolean }) {
    try {
      await updateRequest.mutateAsync({ id, ...changes });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not save change', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRequest.mutateAsync(id);
      toast.show('Request deleted', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not delete request', 'error');
    }
  }

  async function submit() {
    if (!uiTaskId || !note.trim()) return;
    try {
      await createRequest.mutateAsync({ uiTaskId, note: note.trim(), apiDesign: apiDesign.trim() || null });
      setUiTaskId('');
      setNote('');
      setApiDesign('');
      setModalOpen(false);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not create request', 'error');
    }
  }

  if (!epicId) return null;

  return (
    <div>
      <Topbar title="BE Requests" subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined} />

      <div className="max-w-[760px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink3">Open ({open.length})</h3>
          <Button variant="primary" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} />
            New request
          </Button>
        </div>
        <div className="mb-6 rounded-lg border border-line bg-panel shadow-card">
          {open.length === 0 && <p className="p-6 text-center text-[14.5px] text-ink2">No open BE-ticket requests.</p>}
          {open.map((r) => (
            <RequestRow key={r.id} request={r} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>

        {resolved.length > 0 && (
          <>
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink3">Resolved ({resolved.length})</h3>
            <div className="rounded-lg border border-line bg-panel opacity-70 shadow-card">
              {resolved.map((r) => (
                <RequestRow key={r.id} request={r} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New BE-ticket request"
        width={560}
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit} disabled={!uiTaskId || !note.trim()}>
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink2">UI task</label>
            <SearchableSelect
              value={uiTaskId}
              onChange={setUiTaskId}
              options={uiTaskOptions}
              placeholder="Select a UI task…"
              searchPlaceholder="Search UI tasks…"
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink2">Note (markdown supported)</label>
            <textarea
              autoFocus
              placeholder="What BE ticket will this need?"
              className="h-20 w-full resize-none rounded-sm border border-line p-2.5 text-[14.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink2">API design (optional, markdown supported)</label>
            <textarea
              placeholder="Endpoint, request/response shape, edge cases…"
              className="h-32 w-full resize-none rounded-sm border border-line bg-panel2 p-2.5 font-mono text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              value={apiDesign}
              onChange={(e) => setApiDesign(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
