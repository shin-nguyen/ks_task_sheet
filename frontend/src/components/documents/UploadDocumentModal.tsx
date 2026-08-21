import { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Icon } from '../ui/Icon';
import { ApiError } from '../../lib/api';
import { useUploadDocument } from '../../hooks/useDocuments';
import { useToast } from '../../context/ToastContext';

export function UploadDocumentModal({ epicId, open, onClose, onUploaded }: { epicId: string; open: boolean; onClose: () => void; onUploaded: () => void }) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const uploadDocument = useUploadDocument(epicId);

  function handleFile(f: File) {
    setFile(f);
    setDisplayName(f.name);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function reset() {
    setFile(null);
    setDisplayName('');
    onClose();
  }

  async function doUpload() {
    if (!file || !displayName.trim()) return;
    try {
      await uploadDocument.mutateAsync({ file, displayName: displayName.trim() });
      toast.show('Document uploaded', 'success');
      onUploaded();
      reset();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Upload failed', 'error');
    }
  }

  return (
    <Modal
      open={open}
      onClose={reset}
      title="Upload document"
      footer={
        <>
          <Button onClick={reset}>Cancel</Button>
          <Button variant="primary" disabled={!file || !displayName.trim() || uploadDocument.isPending} onClick={doUpload}>
            {uploadDocument.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </>
      }
    >
      {!file ? (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border border-dashed border-line bg-panel2 p-6 text-center text-[13px] text-ink2 transition-colors hover:border-primary/50"
        >
          <Icon name="upload" size={18} className="mx-auto mb-2 text-ink3" />
          Drag &amp; drop a file here, or <b className="text-primary">browse…</b>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div>
          <div className="mb-4 rounded-lg border border-dashed border-line bg-panel2 p-4 text-center text-[13px] text-ink2">
            <span className="inline-block rounded-full bg-primary-soft px-2.5 py-1 font-mono text-[12px] text-primary">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </span>
            <button className="ml-3 text-[12px] text-ink2 underline" onClick={() => setFile(null)}>
              choose another file
            </button>
          </div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink2">Display name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full" autoFocus />
        </div>
      )}
    </Modal>
  );
}
