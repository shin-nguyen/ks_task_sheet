import { useMemo, useState, type KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '../hooks/useNotes';
import { useAuth } from '../context/AuthContext';
import { Topbar } from '../components/layout/Topbar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Markdown } from '../components/ui/Markdown';

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

export function NotesPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: notes } = useNotes(epicId);
  const { user } = useAuth();
  const createNote = useCreateNote(epicId!);
  const updateNote = useUpdateNote(epicId!);
  const deleteNote = useDeleteNote(epicId!);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const sortedNotes = useMemo(
    () => (notes ? [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : undefined),
    [notes],
  );

  if (!epicId) return null;

  async function submitDraft() {
    if (!draft.trim()) return;
    await createNote.mutateAsync(draft);
    setDraft('');
    setAdding(false);
  }

  function submitEdit(id: string) {
    updateNote.mutate({ id, content: editDraft });
    setEditingId(null);
  }

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void, onCancel: () => void) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }

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

      <div className="max-w-[760px] overflow-hidden rounded-lg border border-line bg-panel shadow-card">
        {adding && (
          <div className="animate-[slide-down_0.16s_ease-out] border-b border-line bg-panel2 p-4">
            <textarea
              autoFocus
              placeholder="Write a note (markdown supported)…"
              className="h-24 w-full resize-none rounded-sm border border-line bg-white p-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) =>
                handleComposerKeyDown(
                  e,
                  () => submitDraft(),
                  () => {
                    setAdding(false);
                    setDraft('');
                  },
                )
              }
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] text-ink3">Ctrl+Enter to save · Esc to cancel</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setAdding(false);
                    setDraft('');
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" disabled={!draft.trim()} onClick={submitDraft}>
                  Add note
                </Button>
              </div>
            </div>
          </div>
        )}

        {sortedNotes && sortedNotes.length === 0 && !adding && (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Icon name="notes" size={22} className="text-ink3" />
            <p className="text-[14.5px] font-semibold text-ink">No notes yet</p>
            <p className="max-w-[320px] text-[13px] text-ink2">Add the first note to start tracking context for this epic.</p>
          </div>
        )}

        {sortedNotes && sortedNotes.length > 0 && (
          <div className="max-h-[62vh] divide-y divide-line overflow-y-auto">
            {sortedNotes.map((note) => {
              const edited = note.updatedAt !== note.createdAt;
              const isOwner = user?.id === note.author.id;
              return (
                <div key={note.id} className="px-4 py-3.5">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-[13px] text-ink2">
                      <Avatar name={note.author.name} size={20} />
                      <span className="truncate font-semibold text-ink">{note.author.name}</span>
                      <span className="text-ink3">·</span>
                      <span title={formatFull(note.updatedAt)}>{formatRelative(note.updatedAt)}</span>
                      {edited && (
                        <span className="text-ink3" title={`Edited ${formatFull(note.updatedAt)}`}>
                          · edited
                        </span>
                      )}
                    </div>
                    {isOwner && editingId !== note.id && (
                      <div className="flex shrink-0 items-center gap-0.5 text-ink2">
                        <button
                          title="Edit note"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditDraft(note.content);
                          }}
                          className="flex items-center rounded-sm p-1.5 hover:bg-primary-soft hover:text-primary"
                        >
                          <Icon name="pencil" size={13} />
                        </button>
                        <button
                          title="Delete note"
                          onClick={() => deleteNote.mutate(note.id)}
                          className="flex items-center rounded-sm p-1.5 hover:bg-danger-soft hover:text-danger"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingId === note.id ? (
                    <div>
                      <textarea
                        autoFocus
                        className="h-24 w-full resize-none rounded-sm border border-line p-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => handleComposerKeyDown(e, () => submitEdit(note.id), () => setEditingId(null))}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[12px] text-ink3">Ctrl+Enter to save · Esc to cancel</span>
                        <div className="flex gap-2">
                          <Button onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button variant="primary" onClick={() => submitEdit(note.id)}>
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Markdown content={note.content} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
