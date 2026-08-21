import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useDeleteDocument, useDocuments, useRenameDocument, downloadDocument } from '../hooks/useDocuments';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Topbar } from '../components/layout/Topbar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { UploadDocumentModal } from '../components/documents/UploadDocumentModal';
import { ApiError } from '../lib/api';
import type { EpicDocument } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: documents } = useDocuments(epicId);
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const renameDocument = useRenameDocument(epicId!);
  const deleteDocument = useDeleteDocument(epicId!);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  if (!epicId) return null;

  async function handleDownload(doc: EpicDocument) {
    try {
      await downloadDocument(doc);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Download failed', 'error');
    }
  }

  async function handleDelete(doc: EpicDocument) {
    if (!confirm(`Delete "${doc.displayName}"? This can't be undone.`)) return;
    try {
      await deleteDocument.mutateAsync(doc.id);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Could not delete document', 'error');
    }
  }

  function commitRename(doc: EpicDocument, value: string) {
    setEditingId(null);
    if (!value.trim() || value.trim() === doc.displayName) return;
    renameDocument.mutate({ id: doc.id, displayName: value.trim() });
  }

  return (
    <div>
      <Topbar
        title="Documents"
        subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined}
        right={
          <Button variant="primary" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1.5">
            <Icon name="upload" size={14} />
            Upload document
          </Button>
        }
      />

      <div className="max-w-[760px] rounded-lg border border-line bg-panel shadow-card">
        {documents?.map((doc) => {
          const canManage = user?.id === doc.uploadedBy.id || isAdmin;
          return (
            <div key={doc.id} className="flex items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-b-0">
              <Icon name="document" size={20} className="shrink-0 text-ink3" />
              <div className="min-w-0 flex-1">
                {editingId === doc.id ? (
                  <input
                    autoFocus
                    className="w-full rounded-sm border-2 border-primary bg-white px-1.5 py-1 text-[15.5px] outline-none"
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onBlur={() => commitRename(doc, editDraft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <div className="truncate text-[15.5px] font-semibold text-ink">{doc.displayName}</div>
                )}
                <div className="truncate text-[13.5px] text-ink2">
                  {doc.originalFilename} · {formatSize(doc.sizeBytes)} ·{' '}
                  <span className="inline-flex items-center gap-1 align-middle">
                    <Avatar name={doc.uploadedBy.name} size={16} />
                    {doc.uploadedBy.name}
                  </span>{' '}
                  · {formatDate(doc.createdAt)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[13.5px] text-ink2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-primary-soft hover:text-primary"
                >
                  <Icon name="download" size={12} />
                  Download
                </button>
                {canManage && editingId !== doc.id && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(doc.id);
                        setEditDraft(doc.displayName);
                      }}
                      className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-primary-soft hover:text-primary"
                    >
                      <Icon name="pencil" size={12} />
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="flex items-center gap-1 rounded-sm px-2 py-1 hover:bg-danger-soft hover:text-danger"
                    >
                      <Icon name="trash" size={12} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {documents && documents.length === 0 && <p className="p-6 text-center text-[14.5px] text-ink2">No documents yet.</p>}
      </div>

      <UploadDocumentModal epicId={epicId} open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={() => setUploadOpen(false)} />
    </div>
  );
}
