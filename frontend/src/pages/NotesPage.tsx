import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '../hooks/useNotes';
import { useAuth } from '../context/AuthContext';
import { Topbar } from '../components/layout/Topbar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  if (!epicId) return null;

  return (
    <div>
      <Topbar title="Notes" subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined} />

      <div className="max-w-[760px]">
        {notes?.map((note) => (
          <div key={note.id} className="mb-3 rounded-lg border border-line bg-panel p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13.5px] text-ink2">
                <Avatar name={note.author.name} />
                <b className="text-ink">{note.author.name}</b> · {formatDate(note.createdAt)}
              </div>
              {user?.id === note.author.id && editingId !== note.id && (
                <div className="flex gap-1 text-[13.5px] text-ink2">
                  <button
                    onClick={() => {
                      setEditingId(note.id);
                      setEditDraft(note.content);
                    }}
                    className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-primary-soft hover:text-primary"
                  >
                    <Icon name="pencil" size={12} />
                    Edit
                  </button>
                  <button onClick={() => deleteNote.mutate(note.id)} className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-danger-soft hover:text-danger">
                    <Icon name="trash" size={12} />
                    Delete
                  </button>
                </div>
              )}
            </div>
            {editingId === note.id ? (
              <div>
                <textarea
                  autoFocus
                  className="h-28 w-full resize-none rounded-sm border border-line p-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      updateNote.mutate({ id: note.id, content: editDraft });
                      setEditingId(null);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{note.content}</div>
            )}
          </div>
        ))}

        {notes && notes.length === 0 && !adding && <p className="mb-4 text-[14.5px] text-ink2">No notes yet.</p>}

        {adding ? (
          <div className="rounded-lg border border-line bg-panel p-4 shadow-card">
            <textarea
              autoFocus
              placeholder="Write a note (markdown supported)…"
              className="h-28 w-full resize-none rounded-sm border border-line p-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                onClick={() => {
                  setAdding(false);
                  setDraft('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!draft.trim()}
                onClick={async () => {
                  await createNote.mutateAsync(draft);
                  setDraft('');
                  setAdding(false);
                }}
              >
                Add note
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-line bg-transparent p-4 text-[14.5px] text-ink2 transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
          >
            <Icon name="plus" size={14} />
            Add note (markdown supported)
          </button>
        )}
      </div>
    </div>
  );
}
