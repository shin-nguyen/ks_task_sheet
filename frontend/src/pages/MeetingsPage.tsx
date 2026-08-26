import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useCreateMeeting, useDeleteMeeting, useMeetings, useUpdateMeeting, type MeetingInput } from '../hooks/useMeetings';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Markdown, MarkdownPreview } from '../components/ui/Markdown';
import { MarkdownEditor } from '../components/ui/MarkdownEditor';
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
          <label className="mb-1 block text-[13px] font-medium text-ink2">Agenda (optional, markdown supported)</label>
          <MarkdownEditor
            placeholder="What to discuss…"
            minHeightClass="min-h-[140px]"
            value={form.agenda}
            onChange={(agenda) => setForm((f) => ({ ...f, agenda }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Minutes (optional, markdown supported)</label>
          <MarkdownEditor
            placeholder="What was discussed / decided…"
            minHeightClass="min-h-[140px]"
            value={form.minutes}
            onChange={(minutes) => setForm((f) => ({ ...f, minutes }))}
          />
        </div>
      </div>
    </Modal>
  );
}

function MeetingDetailModal({
  meeting,
  onClose,
  onEdit,
  onDelete,
}: {
  meeting: EpicMeeting;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={meeting.title}
      width={620}
      footer={
        <>
          <Button variant="danger" onClick={onDelete} className="mr-auto">
            Delete
          </Button>
          <Button onClick={onEdit}>Edit</Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink2">
        <span className="inline-flex items-center gap-1 font-mono text-[12.5px]">
          <Icon name="clock" size={13} />
          {formatMeetingTime(meeting.scheduledAt)}
        </span>
        {meeting.link && (
          <a href={meeting.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            <Icon name="link" size={12} />
            {meeting.link}
          </a>
        )}
      </div>

      {meeting.agenda && (
        <div className="mb-3">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink3">Agenda</div>
          <Markdown content={meeting.agenda} />
        </div>
      )}

      {meeting.minutes && (
        <div>
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink3">Minutes</div>
          <Markdown content={meeting.minutes} />
        </div>
      )}

      {!meeting.agenda && !meeting.minutes && <p className="text-[14px] text-ink2">No agenda or minutes recorded yet.</p>}
    </Modal>
  );
}

function MeetingCard({ meeting, onOpen }: { meeting: EpicMeeting; onOpen: () => void }) {
  const preview = meeting.agenda || meeting.minutes || '';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="flex flex-col rounded-lg border border-line bg-panel p-4 text-left shadow-card transition-all duration-150 hover:border-primary/40 hover:shadow-raised"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <b className="line-clamp-1 text-[15px] text-ink">{meeting.title}</b>
        {meeting.link && <Icon name="link" size={13} className="mt-0.5 shrink-0 text-ink3" />}
      </div>
      <div className="mb-2 font-mono text-[12px] text-ink2">{formatMeetingTime(meeting.scheduledAt)}</div>
      <MarkdownPreview content={preview} maxHeight={68} emptyText="No agenda or minutes yet." className="flex-1" />
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
  const [openId, setOpenId] = useState<string | null>(null);

  if (!epicId) return null;

  const now = Date.now();
  const upcoming = (meetings ?? []).filter((m) => new Date(m.scheduledAt).getTime() >= now);
  const past = (meetings ?? []).filter((m) => new Date(m.scheduledAt).getTime() < now);
  const openMeeting = (meetings ?? []).find((m) => m.id === openId) ?? null;

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
      setOpenId(null);
      toast.show('Meeting deleted', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not delete meeting', 'error');
    }
  }

  return (
    <div>
      <Topbar
        title="Meetings"
        subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined}
        right={
          <Button variant="primary" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} />
            New meeting
          </Button>
        }
      />

      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink3">Upcoming ({upcoming.length})</h3>
      {upcoming.length === 0 ? (
        <p className="mb-6 text-[14.5px] text-ink2">No upcoming meetings.</p>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {upcoming.map((m) => (
            <MeetingCard key={m.id} meeting={m} onOpen={() => setOpenId(m.id)} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink3">Past ({past.length})</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((m) => (
              <MeetingCard key={m.id} meeting={m} onOpen={() => setOpenId(m.id)} />
            ))}
          </div>
        </>
      )}

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

      {openMeeting && !editing && (
        <MeetingDetailModal
          meeting={openMeeting}
          onClose={() => setOpenId(null)}
          onEdit={() => {
            setEditing(openMeeting);
            setOpenId(null);
          }}
          onDelete={() => handleDelete(openMeeting.id)}
        />
      )}
    </div>
  );
}
