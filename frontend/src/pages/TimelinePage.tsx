import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useTasks, useReorderTasks } from '../hooks/useTasks';
import { useUsers } from '../hooks/useUsers';
import { useTimelineConfigs, useUpsertTimelineConfig } from '../hooks/useTimeline';
import { Topbar, Chip } from '../components/layout/Topbar';
import { TimelineGrid, type Lane } from '../components/timeline/TimelineGrid';
import {
  computeLaneSchedules,
  dateKey,
  defaultStartDateFor,
  formatLong,
  nextWorkingDay,
  parseDateKey,
  startOfDay,
} from '../lib/scheduling';
import type { SchedulableTask } from '../lib/scheduling';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';

export function TimelinePage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: tasks } = useTasks(epicId);
  const { data: users } = useUsers();
  const { data: configs } = useTimelineConfigs(epicId);
  const upsertConfig = useUpsertTimelineConfig(epicId!);
  const reorderTasks = useReorderTasks(epicId!);
  const toast = useToast();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [editingStartFor, setEditingStartFor] = useState<string | null>(null);

  const lanes: Lane[] = useMemo(() => {
    if (!tasks || !users) return [];
    const byUser = new Map<string, Lane>();
    for (const t of tasks) {
      if (t.status.category === 'DONE') continue;
      const assignee = t.type === 'BE' ? t.beAssignee : t.uiAssignee;
      if (!assignee) continue;
      const config = configs?.find((c) => c.userId === assignee.id);
      const startDate = config ? parseDateKey(config.startDate) : defaultStartDateFor(today);
      const gapDays = new Set(config?.gapDays ?? []);
      if (!byUser.has(assignee.id)) {
        byUser.set(assignee.id, { userId: assignee.id, name: assignee.name, tasks: [], startDate, gapDays });
      }
      byUser.get(assignee.id)!.tasks.push(t);
    }
    return Array.from(byUser.values())
      .map((lane) => ({ ...lane, tasks: lane.tasks.sort((a, b) => a.sortOrder - b.sortOrder) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, users, configs, today]);

  const windowStart = useMemo(() => {
    let earliest = today;
    for (const lane of lanes) if (lane.startDate < earliest) earliest = lane.startDate;
    return earliest;
  }, [lanes, today]);

  const windowDays = useMemo(() => {
    if (lanes.length === 0) return 14;
    const probe = computeLaneSchedules(
      lanes.map((l) => ({ userId: l.userId, name: l.name, tasks: l.tasks.map((t) => ({ id: t.id, effortDays: t.devEffort })) as SchedulableTask[], startDate: l.startDate, gapDayKeys: l.gapDays })),
      windowStart,
      180
    );
    let maxCol = 0;
    for (const r of probe) {
      for (const col of r.cellsByColumn.keys()) maxCol = Math.max(maxCol, col);
    }
    return Math.min(120, Math.max(14, maxCol + 4));
  }, [lanes, windowStart]);

  const scheduleSummary = useMemo(
    () =>
      computeLaneSchedules(
        lanes.map((l) => ({ userId: l.userId, name: l.name, tasks: l.tasks.map((t) => ({ id: t.id, effortDays: t.devEffort })) as SchedulableTask[], startDate: l.startDate, gapDayKeys: l.gapDays })),
        windowStart,
        windowDays
      ),
    [lanes, windowStart, windowDays]
  );

  const codeCompleteDate = scheduleSummary.reduce<Date | null>((latest, r) => {
    if (!r.finishDate) return latest;
    if (!latest || r.finishDate > latest) return r.finishDate;
    return latest;
  }, null);
  const demoReadyDate = codeCompleteDate ? nextWorkingDay(codeCompleteDate, 1) : null;

  async function toggleGap(userId: string, key: string) {
    const lane = lanes.find((l) => l.userId === userId);
    if (!lane) return;
    const next = new Set(lane.gapDays);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    try {
      await upsertConfig.mutateAsync({ userId, startDate: dateKey(lane.startDate), gapDays: Array.from(next) });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not update gap day', 'error');
    }
  }

  async function changeStartDate(userId: string, newDate: string) {
    const lane = lanes.find((l) => l.userId === userId);
    try {
      await upsertConfig.mutateAsync({ userId, startDate: newDate, gapDays: lane ? Array.from(lane.gapDays) : [] });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not update start date', 'error');
    } finally {
      setEditingStartFor(null);
    }
  }

  async function reorderLane(userId: string, newOrderedIds: string[]) {
    if (!tasks) return;
    const allSorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
    const allIds = allSorted.map((t) => t.id);
    const laneIdSet = new Set(newOrderedIds);
    const positions = allIds.map((id, idx) => (laneIdSet.has(id) ? idx : -1)).filter((idx) => idx !== -1);
    const newAllIds = [...allIds];
    positions.forEach((pos, i) => {
      newAllIds[pos] = newOrderedIds[i];
    });
    try {
      await reorderTasks.mutateAsync(newAllIds);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not reorder tasks', 'error');
    }
  }

  if (!epicId) return null;

  return (
    <div>
      <Topbar
        title="Timeline"
        subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined}
        right={
          <>
            <Chip label="Code complete" value={codeCompleteDate ? formatLong(codeCompleteDate) : '—'} />
            <Chip label="Demo-ready" value={demoReadyDate ? formatLong(demoReadyDate) : '—'} hero />
          </>
        }
      />

      <div className="rounded-[10px] border border-line bg-panel">
        <div className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3.5 text-[14px] text-ink2">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-be" /> BE task
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-ui" /> UI task
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-[repeating-linear-gradient(135deg,#DFE5E4,#DFE5E4_4px,#EDF1F0_4px,#EDF1F0_8px)]" />
            Gap (busy on another epic) — click a cell to toggle
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-wknd" /> Weekend (skipped)
          </span>
          <span className="flex-1" />
          <span>Click a lane's start date to edit · drag blocks to reorder within a lane</span>
        </div>

        {lanes.length === 0 && (
          <div className="p-10 text-center text-ink2">No active assigned tasks yet — assign tasks on the Sheet to see a timeline.</div>
        )}

        {lanes.length > 0 && (
          <>
            <div className="flex flex-wrap gap-3 border-b border-line px-4 py-3 text-[14px]">
              {lanes.map((lane) => (
                <div key={lane.userId} className="flex items-center gap-1.5">
                  <b>{lane.name}:</b>
                  {editingStartFor === lane.userId ? (
                    <input
                      type="date"
                      autoFocus
                      defaultValue={dateKey(lane.startDate)}
                      onBlur={(e) => e.target.value && changeStartDate(lane.userId, e.target.value)}
                      className="rounded border border-line px-1.5 py-0.5 font-mono text-[12px]"
                    />
                  ) : (
                    <button onClick={() => setEditingStartFor(lane.userId)} className="font-mono text-primary hover:underline">
                      {formatLong(lane.startDate)} ✎
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2">
              <TimelineGrid
                lanes={lanes}
                windowStart={windowStart}
                windowDays={windowDays}
                today={today}
                editable
                onToggleGap={toggleGap}
                onReorderLane={reorderLane}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
