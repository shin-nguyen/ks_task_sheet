import { useMemo, useState, type KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '../hooks/useNotes';
import { useAuth } from '../context/AuthContext';
import { Topbar } from '../components/layout/Topbar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Markdown, MarkdownPreview } from '../components/ui/Markdown';
import { MarkdownEditor } from '../components/ui/MarkdownEditor';
import type { EpicNote } from '../types';

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const sameYear = new Date(then).getFullYear() === new Date().getFullYear();
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void, onCancel: () => void) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    onSubmit();
  } else if (e.key === 'Escape') {
    onCancel();
  }
}

function NewNoteModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (content: string) => Promise<void> }) {
  const [draft, setDraft] = useState('');

  async function submit() {
    if (!draft.trim()) return;
    await onCreate(draft.trim());
    setDraft('');
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setDraft('');
        onClose();
      }}
      title="New note"
      width={560}
      footer={
        <>
          <span className="mr-auto self-center text-[12px] text-ink3">Ctrl+Enter to save</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!draft.trim()} onClick={submit}>
            Add note
          </Button>
        </>
      }
    >
      <MarkdownEditor
        autoFocus
        placeholder="Write a note (markdown supported)…"
        minHeightClass="min-h-[200px]"
        value={draft}
        onChange={setDraft}
        onKeyDown={(e) => handleComposerKeyDown(e, submit, onClose)}
      />
    </Modal>
  );
}

function NoteDetailModal({
  note,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  note: EpicNote;
  canDelete: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);

  function save() {
    if (draft.trim()) onSave(draft.trim());
    setEditing(false);
  }

  const edited = note.updatedAt !== note.createdAt;

  return (
    <Modal
      open
      onClose={onClose}
      title="Note"
      width={620}
      footer={
        editing ? (
          <>
            <span className="mr-auto self-center text-[12px] text-ink3">Ctrl+Enter to save</span>
            <Button
              onClick={() => {
                setDraft(note.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" disabled={!draft.trim()} onClick={save}>
              Save
            </Button>
          </>
        ) : (
          <>
            {canDelete && (
              <Button variant="danger" onClick={onDelete} className="mr-auto">
                Delete
              </Button>
            )}
            <Button onClick={() => setEditing(true)}>Edit</Button>
          </>
        )
      }
    >
      <div className="mb-3 flex items-center gap-2 text-[13px] text-ink2">
        <Avatar name={note.author.name} size={22} />
        <span className="font-semibold text-ink">{note.author.name}</span>
        <span className="text-ink3">·</span>
        <span title={formatFull(note.updatedAt)}>{formatRelative(note.updatedAt)}</span>
        {edited && (
          <span className="text-ink3">
            · edited{note.updatedBy.id !== note.author.id ? ` by ${note.updatedBy.name}` : ''}
          </span>
        )}
      </div>
      {editing ? (
        <MarkdownEditor
          autoFocus
          minHeightClass="min-h-[260px]"
          value={draft}
          onChange={setDraft}
          onKeyDown={(e) => handleComposerKeyDown(e, save, () => setEditing(false))}
        />
      ) : (
        <Markdown content={note.content} />
      )}
    </Modal>
  );
}

export function NotesPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: notes } = useNotes(epicId);
  const { user } = useAuth();
  const createNote = useCreateNote(epicId!);
  const updateNote = useUpdateNote(epicId!);
  const deleteNote = useDeleteNote(epicId!);

  const [adding, setAdding] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  const sortedNotes = useMemo(
    () => (notes ? [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : undefined),
    [notes],
  );
  const openNote = sortedNotes?.find((n) => n.id === openNoteId) ?? null;

  if (!epicId) return null;

  return (
    <div>
      <Topbar
        title="Notes"
        subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined}
        right={
          <>
            {sortedNotes && sortedNotes.length > 0 && (
              <span className="self-center text-[13px] text-ink2">
                {sortedNotes.length} note{sortedNotes.length === 1 ? '' : 's'}
              </span>
            )}
            <Button variant="primary" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5">
              <Icon name="plus" size={14} />
              Add note
            </Button>
          </>
        }
      />

      {sortedNotes && sortedNotes.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-panel px-6 py-14 text-center shadow-card">
          <Icon name="notes" size={22} className="text-ink3" />
          <p className="text-[14.5px] font-semibold text-ink">No notes yet</p>
          <p className="max-w-[320px] text-[13px] text-ink2">Add the first note to start tracking context for this epic.</p>
        </div>
      )}

      {sortedNotes && sortedNotes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedNotes.map((note) => {
            const edited = note.updatedAt !== note.createdAt;
            return (
              <div
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenNoteId(note.id)}
                onKeyDown={(e) => e.key === 'Enter' && setOpenNoteId(note.id)}
                className="flex flex-col rounded-lg border border-line bg-panel p-4 text-left shadow-card transition-all duration-150 hover:border-primary/40 hover:shadow-raised"
              >
                <div className="mb-1.5 flex items-center gap-2 text-[12.5px] text-ink2">
                  <Avatar name={note.author.name} size={18} />
                  <span className="truncate font-semibold text-ink">{note.author.name}</span>
                  <span className="shrink-0 text-ink3">·</span>
                  <span className="shrink-0">{formatRelative(note.updatedAt)}</span>
                  {edited && (
                    <span className="shrink-0 text-ink3">
                      · edited{note.updatedBy.id !== note.author.id ? ` by ${note.updatedBy.name}` : ''}
                    </span>
                  )}
                </div>
                <MarkdownPreview content={note.content} maxHeight={92} emptyText="Empty note." className="flex-1" />
              </div>
            );
          })}
        </div>
      )}

      <NewNoteModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={async (content) => {
          await createNote.mutateAsync(content);
          setAdding(false);
        }}
      />

      {openNote && (
        <NoteDetailModal
          note={openNote}
          canDelete={user?.id === openNote.author.id}
          onClose={() => setOpenNoteId(null)}
          onSave={(content) => updateNote.mutate({ id: openNote.id, content })}
          onDelete={() => {
            deleteNote.mutate(openNote.id);
            setOpenNoteId(null);
          }}
        />
      )}
    </div>
  );
}
