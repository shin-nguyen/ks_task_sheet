import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { api, ApiError } from '../../lib/api';
import type { ImportResult } from '../../types';
import { useToast } from '../../context/ToastContext';

const TARGET_FIELDS = [
  { value: 'IGNORE', label: '— Ignore —' },
  { value: 'TICKET_ID', label: 'Ticket ID' },
  { value: 'TITLE', label: 'Title' },
  { value: 'DESCRIPTION', label: 'Description' },
  { value: 'TYPE', label: 'Type (BE / UI)' },
  { value: 'ASSIGNEE', label: 'BE / UI Assignee (by type)' },
  { value: 'DEV_EFFORT', label: 'Dev Effort' },
  { value: 'TEST_EFFORT', label: 'Test Effort' },
  { value: 'NOTE', label: 'Note' },
];

const AUTO_DETECT: [RegExp, string][] = [
  [/issue\s*key/i, 'TICKET_ID'],
  [/^key$/i, 'TICKET_ID'],
  [/summary/i, 'TITLE'],
  [/^title$/i, 'TITLE'],
  [/description/i, 'DESCRIPTION'],
  [/assignee/i, 'ASSIGNEE'],
  [/labels?/i, 'TYPE'],
  [/issue\s*type/i, 'TYPE'],
  [/story\s*points?/i, 'DEV_EFFORT'],
  [/test\s*(points|effort)/i, 'TEST_EFFORT'],
  [/note/i, 'NOTE'],
];

function autoDetect(header: string): string {
  for (const [re, field] of AUTO_DETECT) {
    if (re.test(header)) return field;
  }
  return 'IGNORE';
}

export function ImportCsvModal({ epicId, open, onClose, onImported }: { epicId: string; open: boolean; onClose: () => void; onImported: () => void }) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [autoFlags, setAutoFlags] = useState<Record<string, boolean>>({});
  const [defaultType, setDefaultType] = useState<'BE' | 'UI'>('BE');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'UPDATE'>('SKIP');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hdrs = res.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(res.data.slice(0, 10));
        setTotalRows(res.data.length);
        const map: Record<string, string> = {};
        const auto: Record<string, boolean> = {};
        for (const h of hdrs) {
          const detected = autoDetect(h);
          map[h] = detected;
          auto[h] = detected !== 'IGNORE';
        }
        setMapping(map);
        setAutoFlags(auto);
      },
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  const mappedTicketCount = useMemo(() => Object.values(mapping).filter((v) => v === 'TICKET_ID').length, [mapping]);

  async function doImport() {
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append(
        'mapping',
        JSON.stringify({
          columnMap: mapping,
          defaultType,
          duplicateStrategy,
        })
      );
      const res = await api.postForm<ImportResult>(`/epics/${epicId}/tasks/import`, form);
      setResult(res);
      onImported();
      toast.show(
        `Import complete — ${res.created} created · ${res.updated} updated · ${res.skipped} skipped · ${res.errors.length} errors`,
        res.errors.length > 0 ? 'error' : 'success'
      );
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setResult(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={reset}
      title="Import tasks from Jira CSV"
      width={760}
      footer={
        <>
          <Button onClick={reset}>{result ? 'Close' : 'Cancel'}</Button>
          {!result && (
            <Button variant="primary" disabled={!file || mappedTicketCount === 0 || importing} onClick={doImport}>
              {importing ? 'Importing…' : `Import ${totalRows || ''} task${totalRows === 1 ? '' : 's'}`}
            </Button>
          )}
        </>
      }
    >
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="mb-4 cursor-pointer rounded-lg border border-dashed border-[#B9C7C3] bg-[#FBFDFC] p-6 text-center text-[13px] text-ink2"
        >
          Drag & drop your Jira export here, or <b className="text-primary">browse…</b>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {file && !result && (
        <>
          <div className="mb-4 rounded-lg border border-dashed border-[#B9C7C3] bg-[#FBFDFC] p-4 text-center text-[13px] text-ink2">
            <span className="inline-block rounded-md bg-primary-soft px-2.5 py-1 font-mono text-[12px] text-primary">
              {file.name} · {totalRows} row{totalRows === 1 ? '' : 's'} detected
            </span>
            <button className="ml-3 text-[12px] text-ink2 underline" onClick={() => setFile(null)}>
              choose another file
            </button>
          </div>

          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink2">Column mapping</div>
          <div className="max-h-64 overflow-auto rounded-md border border-line">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-[#F7FAF9] text-left text-[11px] uppercase tracking-wide text-ink2">
                  <th className="px-2.5 py-1.5">CSV column</th>
                  <th className="px-2.5 py-1.5">Sample value</th>
                  <th className="px-2.5 py-1.5">Maps to</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h) => (
                  <tr key={h} className="border-t border-[#EDF1F0]">
                    <td className="whitespace-nowrap px-2.5 py-1.5 font-mono">{h}</td>
                    <td className="max-w-[220px] truncate px-2.5 py-1.5 text-ink2">{rows[0]?.[h] ?? ''}</td>
                    <td className="whitespace-nowrap px-2.5 py-1.5">
                      <Select
                        value={mapping[h] ?? 'IGNORE'}
                        onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                        className="py-1"
                      >
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </Select>
                      {autoFlags[h] && <span className="ml-1.5 rounded bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-primary">auto</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-[13px]">
            <label className="flex items-center gap-2">
              Default type for unresolved rows:
              <Select value={defaultType} onChange={(e) => setDefaultType(e.target.value as 'BE' | 'UI')}>
                <option value="BE">BE</option>
                <option value="UI">UI</option>
              </Select>
            </label>
            <label className="flex items-center gap-2">
              If ticket ID already exists:
              <Select value={duplicateStrategy} onChange={(e) => setDuplicateStrategy(e.target.value as 'SKIP' | 'UPDATE')}>
                <option value="SKIP">Skip row</option>
                <option value="UPDATE">Update existing task</option>
              </Select>
            </label>
          </div>
          {mappedTicketCount === 0 && <p className="mt-3 text-[12.5px] text-red-600">Map at least one column to "Ticket ID" to continue.</p>}
          <p className="mt-3 text-[12px] text-ink2">
            Unmatched assignees are left unassigned · multiline descriptions and UTF-8 BOM are handled · invalid effort → 0 (warned).
          </p>
        </>
      )}

      {result && (
        <div>
          <div className="mb-3 rounded-lg bg-primary-soft px-4 py-3 text-[13px] text-primary">
            ✅ {result.created} created · {result.updated} updated · {result.skipped} skipped (duplicate ticket ID) · {result.errors.length} errors
          </div>
          {(result.errors.length > 0 || result.warnings.length > 0) && (
            <div className="max-h-56 overflow-auto rounded-md border border-line text-[12.5px]">
              {result.errors.map((e, i) => (
                <div key={`e${i}`} className="border-b border-[#EDF1F0] px-3 py-1.5 text-red-700">
                  Row {e.row}: {e.reason}
                </div>
              ))}
              {result.warnings.map((w, i) => (
                <div key={`w${i}`} className="border-b border-[#EDF1F0] px-3 py-1.5 text-amber-700">
                  Row {w.row}: {w.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
