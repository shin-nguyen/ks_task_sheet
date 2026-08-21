import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useCreateMeeting, useDeleteMeeting, useMeetings, useUpdateMeeting, type MeetingInput } from '../hooks/useMeetings';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import type { EpicMeeting } from '../types';

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function formatMeetingTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

interface MeetingFormState {
  title: string;
  scheduledAtLocal: string;
  link: string;
  agenda: string;
  minutes: string;
}

function emptyForm(): MeetingFormState {
  return { title: '', scheduledAtLocal: '', link: '', agenda: '', minutes: '' };
}

function formFromMeeting(m: EpicMeeting): MeetingFormState {
  return {
    title: m.title,
    scheduledAtLocal: toDatetimeLocalValue(m.scheduledAt),
    link: m.link ?? '',
    agenda: m.agenda ?? '',
    minutes: m.minutes ?? '',
  };
}

function MeetingModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: MeetingFormState;
  onClose: () => void;
  onSave: (input: MeetingInput) => void;
}) {
  const [form, setForm] = useState<MeetingFormState>(initial);

  if (!open) return null;

  const valid = form.title.trim() && form.scheduledAtLocal;

  function submit() {
    if (!valid) return;
    onSave({
      title: form.title.trim(),
      scheduledAt: fromDatetimeLocalValue(form.scheduledAtLocal),
      link: form.link.trim() || null,
      agenda: form.agenda.trim() || null,
      minutes: form.minutes.trim() || null,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Title</label>
          <Input autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Date &amp; time</label>
          <Input
            type="datetime-local"
            value={form.scheduledAtLocal}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAtLocal: e.target.value }))}
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Call link (optional)</label>
          <Input
            placeholder="https://…"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Agenda (optional)</label>
          <textarea
            placeholder="What to discuss…"
            className="h-20 w-full resize-none rounded-sm border border-line p-2.5 text-[14.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            value={form.agenda}
            onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Minutes (optional)</label>
          <textarea
            placeholder="What was discussed / decided…"
            className="h-20 w-full resize-none rounded-sm border border-line p-2.5 text-[14.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            value={form.minutes}
            onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  );
}

function MeetingCard({ meeting, onEdit, onDelete }: { meeting: EpicMeeting; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="mb-3 rounded-lg border border-line bg-panel p-4 shadow-card">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <b className="text-[15px] text-ink">{meeting.title}</b>
          <div className="mt-0.5 font-mono text-[12.5px] text-ink2">{formatMeetingTime(meeting.scheduledAt)}</div>
        </div>
        <div className="flex shrink-0 gap-1 text-[13.5px] text-ink2">
          <button onClick={onEdit} className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-primary-soft hover:text-primary">
            <Icon name="pencil" size={12} />
            Edit
          </button>
          <button onClick={onDelete} className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-danger-soft hover:text-danger">
            <Icon name="trash" size={12} />
            Delete
          </button>
        </div>
      </div>

      {meeting.link && (
        <a href={meeting.link} target="_blank" rel="noreferrer" className="mb-1.5 inline-flex items-center gap-1 text-[13.5px] text-primary hover:underline">
          <Icon name="link" size={12} />
          {meeting.link}
        </a>
      )}

      {meeting.agenda && (
        <div className="mt-1.5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink3">Agenda</div>
          <div className="whitespace-pre-wrap text-[14px] text-ink">{meeting.agenda}</div>
        </div>
      )}

      {meeting.minutes && (
        <div className="mt-1.5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink3">Minutes</div>
          <div className="whitespace-pre-wrap text-[14px] text-ink">{meeting.minutes}</div>
        </div>
      )}
    </div>
  );
}

export function MeetingsPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: meetings } = useMeetings(epicId);
  const toast = useToast();

  const createMeeting = useCreateMeeting(epicId!);
  const updateMeeting = useUpdateMeeting(epicId!);
  const deleteMeeting = useDeleteMeeting(epicId!);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EpicMeeting | null>(null);

  if (!epicId) return null;

  const now = Date.now();
  const upcoming = (meetings ?? []).filter((m) => new Date(m.scheduledAt).getTime() >= now);
  const past = (meetings ?? []).filter((m) => new Date(m.scheduledAt).getTime() < now);

  async function handleCreate(input: MeetingInput) {
    try {
      await createMeeting.mutateAsync(input);
      setCreating(false);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not create meeting', 'error');
    }
  }

  async function handleUpdate(id: string, input: MeetingInput) {
    try {
      await updateMeeting.mutateAsync({ id, input });
      setEditing(null);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not save meeting', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMeeting.mutateAsync(id);
      toast.show('Meeting deleted', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not delete meeting', 'error');
    }
  }

  return (
    <div>
      <Topbar title="Meetings" subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined} />

      <div className="max-w-[760px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink3">Upcoming ({upcoming.length})</h3>
          <Button variant="primary" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} />
            New meeting
          </Button>
        </div>
        {upcoming.length === 0 && <p className="mb-6 text-[14.5px] text-ink2">No upcoming meetings.</p>}
        {upcoming.map((m) => (
          <MeetingCard key={m.id} meeting={m} onEdit={() => setEditing(m)} onDelete={() => handleDelete(m.id)} />
        ))}

        {past.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-wide text-ink3">Past ({past.length})</h3>
            {past.map((m) => (
              <MeetingCard key={m.id} meeting={m} onEdit={() => setEditing(m)} onDelete={() => handleDelete(m.id)} />
            ))}
          </>
        )}
      </div>

      <MeetingModal open={creating} title="New meeting" initial={emptyForm()} onClose={() => setCreating(false)} onSave={handleCreate} />

      {editing && (
        <MeetingModal
          open={!!editing}
          title="Edit meeting"
          initial={formFromMeeting(editing)}
          onClose={() => setEditing(null)}
          onSave={(input) => handleUpdate(editing.id, input)}
        />
      )}
    </div>
  );
}
