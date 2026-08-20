import { useState } from 'react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Icon } from '../components/ui/Icon';
import {
  useCreateStatus,
  useDeleteStatus,
  useReorderStatuses,
  useStatuses,
  useUpdateStatus,
  type StatusInput,
} from '../hooks/useStatuses';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import type { TaskStatus } from '../types';

function StatusRow({ status, index, total, onMove }: { status: TaskStatus; index: number; total: number; onMove: (from: number, to: number) => void }) {
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();
  const toast = useToast();
  const [name, setName] = useState(status.name);
  const [color, setColor] = useState(status.color);
  const [category, setCategory] = useState(status.category);

  async function save(next: Partial<StatusInput>) {
    const input: StatusInput = { name, color, category, ...next };
    setName(input.name);
    setColor(input.color);
    setCategory(input.category);
    try {
      await updateStatus.mutateAsync({ id: status.id, input });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not update status', 'error');
    }
  }

  async function remove() {
    if (!confirm(`Delete status "${status.name}"? This only works if no tasks currently use it.`)) return;
    try {
      await deleteStatus.mutateAsync(status.id);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not delete status', 'error');
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-line2 px-4 py-3 transition-colors hover:bg-panel2/60">
      <div className="flex flex-col gap-0.5">
        <button disabled={index === 0} onClick={() => onMove(index, index - 1)} className="rounded-sm text-ink3 hover:bg-panel2 hover:text-primary disabled:opacity-30">
          <Icon name="chevron-up" size={15} />
        </button>
        <button disabled={index === total - 1} onClick={() => onMove(index, index + 1)} className="rounded-sm text-ink3 hover:bg-panel2 hover:text-primary disabled:opacity-30">
          <Icon name="chevron-down" size={15} />
        </button>
      </div>
      <input type="color" value={color} onChange={(e) => save({ color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-sm border border-line" />
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => save({ name })} className="w-56" />
      <Select value={category} onChange={(e) => save({ category: e.target.value as 'ACTIVE' | 'DONE' })} className="w-48">
        <option value="ACTIVE">Active (counts in timeline)</option>
        <option value="DONE">Done (excluded from timeline)</option>
      </Select>
      {status.system && <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[12.5px] font-semibold text-primary">default</span>}
      <span className="flex-1" />
      <button onClick={remove} className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13.5px] text-ink2 hover:bg-danger-soft hover:text-danger">
        <Icon name="trash" size={13} />
        Delete
      </button>
    </div>
  );
}

export function StatusSettingsPage() {
  const { data: statuses } = useStatuses();
  const createStatus = useCreateStatus();
  const reorderStatuses = useReorderStatuses();
  const toast = useToast();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#7C3AED');
  const [newCategory, setNewCategory] = useState<'ACTIVE' | 'DONE'>('ACTIVE');

  async function addStatus() {
    if (!newName.trim()) return;
    try {
      await createStatus.mutateAsync({ name: newName.trim(), color: newColor, category: newCategory });
      setNewName('');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not create status', 'error');
    }
  }

  function move(from: number, to: number) {
    if (!statuses || to < 0 || to >= statuses.length) return;
    const ids = statuses.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorderStatuses.mutate(ids);
  }

  return (
    <div>
      <Topbar title="Statuses" subtitle="workspace-wide — used across all epics" />
      <p className="mb-4 max-w-2xl text-[14.5px] text-ink2">
        Rename, recolor, reorder, or add task statuses. Every epic shares this list. Mark a status <b>Done</b> to exclude tasks in it from
        the timeline &amp; workload calculations — everything else counts as active work.
      </p>

      <div className="rounded-lg border border-line bg-panel shadow-card">
        {statuses?.map((s, i) => (
          <StatusRow key={s.id} status={s} index={i} total={statuses.length} onMove={move} />
        ))}

        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded-sm border border-line" />
          <Input placeholder="New status name…" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-56" />
          <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value as 'ACTIVE' | 'DONE')} className="w-44">
            <option value="ACTIVE">Active</option>
            <option value="DONE">Done</option>
          </Select>
          <Button variant="primary" onClick={addStatus} disabled={!newName.trim() || createStatus.isPending} className="inline-flex items-center gap-1.5">
            <Icon name="plus" size={14} />
            Add status
          </Button>
        </div>
      </div>
    </div>
  );
}
