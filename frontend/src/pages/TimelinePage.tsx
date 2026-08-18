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
  encodeGapEntry,
  formatLong,
  nextWorkingDay,
  parseDateKey,
  parseGapEntry,
  startOfDay,
} from '../lib/scheduling';
import type { GapPortion, SchedulableTask } from '../lib/scheduling';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import { Input } from '../components/ui/Input';

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
  const [search, setSearch] = useState('');

  const lanes: Lane[] = useMemo(() => {
    if (!tasks || !users) return [];
    const byUser = new Map<string, Lane>();
    for (const t of tasks) {
      if (t.status.category === 'DONE') continue;
      const assignee = t.type === 'BE' ? t.beAssignee : t.uiAssignee;
      if (!assignee) continue;
      const config = configs?.find((c) => c.userId === assignee.id);
      const startDate = config ? parseDateKey(config.startDate) : defaultStartDateFor(today);
      const gapDays = new Map<string, GapPortion>((config?.gapDays ?? []).map((entry) => {
        const { date, portion } = parseGapEntry(entry);
        return [date, portion];
      }));
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
      lanes.map((l) => ({ userId: l.userId, name: l.name, tasks: l.tasks.map((t) => ({ id: t.id, effortDays: t.devEffort })) as SchedulableTask[], startDate: l.startDate, gapDays: l.gapDays })),
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
        lanes.map((l) => ({ userId: l.userId, name: l.name, tasks: l.tasks.map((t) => ({ id: t.id, effortDays: t.devEffort })) as SchedulableTask[], startDate: l.startDate, gapDays: l.gapDays })),
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

  const visibleLanes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? lanes.filter((l) => l.name.toLowerCase().includes(q)) : lanes;
  }, [lanes, search]);

  async function setGap(userId: string, key: string, portion: GapPortion | null) {
    const lane = lanes.find((l) => l.userId === userId);
    if (!lane) return;
    const next = new Map(lane.gapDays);
    if (portion === null) next.delete(key);
    else next.set(key, portion);
    const encoded = Array.from(next.entries()).map(([date, p]) => encodeGapEntry(date, p));
    try {
      await upsertConfig.mutateAsync({ userId, startDate: dateKey(lane.startDate), gapDays: encoded });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not update gap day', 'error');
    }
  }

  async function changeStartDate(userId: string, newDate: string) {
    const lane = lanes.find((l) => l.userId === userId);
    try {
      const encoded = lane ? Array.from(lane.gapDays.entries()).map(([date, p]) => encodeGapEntry(date, p)) : [];
      await upsertConfig.mutateAsync({ userId, startDate: newDate, gapDays: encoded });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not update start date', 'error');
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
            Gap (busy on another epic) — click a cell to set AM / PM / full day
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-wknd" /> Weekend (skipped)
          </span>
          <span className="flex-1" />
          <span>Click a lane's start date to edit · drag the first block onto a day to move it · drag blocks to reorder within a lane</span>
        </div>

        {lanes.length === 0 && (
          <div className="p-10 text-center text-ink2">No active assigned tasks yet — assign tasks on the Sheet to see a timeline.</div>
        )}

        {lanes.length > 0 && (
          <>
            {lanes.length > 6 && (
              <div className="border-b border-line px-4 py-2.5">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Filter ${lanes.length} people by name…`}
                  className="w-64"
                />
              </div>
            )}
            {visibleLanes.length === 0 && <div className="px-4 py-3 text-[14px] text-ink2">No match for "{search}"</div>}
            <div className="p-2">
              <TimelineGrid
                lanes={visibleLanes}
                windowStart={windowStart}
                windowDays={windowDays}
                today={today}
                editable
                onSetGap={setGap}
                onReorderLane={reorderLane}
                onChangeStartDate={changeStartDate}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
