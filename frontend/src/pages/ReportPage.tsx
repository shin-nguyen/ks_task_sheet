import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useTasks } from '../hooks/useTasks';
import { useTimelineConfigs } from '../hooks/useTimeline';
import { Topbar, Chip } from '../components/layout/Topbar';
import { Select } from '../components/ui/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { TimelineGrid, type Lane } from '../components/timeline/TimelineGrid';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/ui/Icon';
import { computeLaneSchedules, defaultStartDateFor, formatLong, parseDateKey, parseGapEntry, startOfDay } from '../lib/scheduling';
import type { GapPortion, SchedulableTask } from '../lib/scheduling';

export function ReportPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: allTasks } = useTasks(epicId);
  const { data: configs } = useTimelineConfigs(epicId);
  const today = useMemo(() => startOfDay(new Date()), []);

  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    allTasks?.forEach((t) => {
      if (t.beAssignee) map.set(t.beAssignee.id, t.beAssignee.name);
      if (t.uiAssignee) map.set(t.uiAssignee.id, t.uiAssignee.name);
      if (t.testAssignee) map.set(t.testAssignee.id, t.testAssignee.name);
    });
    return Array.from(map.entries());
  }, [allTasks]);

  const tasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter((t) => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (
        assigneeFilter !== 'ALL' &&
        t.beAssignee?.id !== assigneeFilter &&
        t.uiAssignee?.id !== assigneeFilter &&
        t.testAssignee?.id !== assigneeFilter
      )
        return false;
      return true;
    });
  }, [allTasks, typeFilter, assigneeFilter]);

  const lanes: Lane[] = useMemo(() => {
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
      if (!byUser.has(assignee.id)) byUser.set(assignee.id, { userId: assignee.id, name: assignee.name, tasks: [], startDate, gapDays });
      byUser.get(assignee.id)!.tasks.push(t);
    }
    return Array.from(byUser.values())
      .map((lane) => ({ ...lane, tasks: lane.tasks.sort((a, b) => a.sortOrder - b.sortOrder) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, configs, today]);

  const windowStart = useMemo(() => {
    let earliest = today;
    for (const lane of lanes) if (lane.startDate < earliest) earliest = lane.startDate;
    return earliest;
  }, [lanes, today]);

  const scheduleSummary = useMemo(() => {
    const probe = computeLaneSchedules(
      lanes.map((l) => ({ userId: l.userId, name: l.name, tasks: l.tasks.map((t) => ({ id: t.id, effortDays: t.devEffort })) as SchedulableTask[], startDate: l.startDate, gapDays: l.gapDays })),
      windowStart,
      180
    );
    return probe;
  }, [lanes, windowStart]);

  const windowDays = useMemo(() => {
    let maxCol = 0;
    for (const r of scheduleSummary) for (const col of r.cellsByColumn.keys()) maxCol = Math.max(maxCol, col);
    return Math.min(120, Math.max(14, maxCol + 4));
  }, [scheduleSummary]);

  const codeCompleteDate = scheduleSummary.reduce<Date | null>((latest, r) => {
    if (!r.finishDate) return latest;
    if (!latest || r.finishDate > latest) return r.finishDate;
    return latest;
  }, null);

  const workload = useMemo(() => {
    const byPerson = new Map<string, { name: string; count: number; dev: number; test: number; done: number }>();
    function row(person: { id: string; name: string }) {
      if (!byPerson.has(person.id)) byPerson.set(person.id, { name: person.name, count: 0, dev: 0, test: 0, done: 0 });
      return byPerson.get(person.id)!;
    }
    for (const t of tasks) {
      const devAssignee = t.type === 'BE' ? t.beAssignee : t.uiAssignee;
      if (devAssignee) {
        const r = row(devAssignee);
        r.count++;
        r.dev += t.devEffort;
        if (t.status.category === 'DONE') r.done++;
      }
      if (t.testAssignee) {
        row(t.testAssignee).test += t.testEffort;
      }
    }
    return Array.from(byPerson.values()).sort((a, b) => b.dev + b.test - (a.dev + a.test));
  }, [tasks]);

  const maxWl = Math.max(1, ...workload.map((w) => w.dev + w.test));

  const bottleneck = scheduleSummary.reduce<{ name: string; finishDate: Date } | null>((acc, r) => {
    if (!r.finishDate) return acc;
    if (!acc || r.finishDate > acc.finishDate) return { name: r.name, finishDate: r.finishDate };
    return acc;
  }, null);

  const doneCount = tasks.filter((t) => t.status.category === 'DONE').length;
  const doneEffort = tasks.filter((t) => t.status.category === 'DONE').reduce((s, t) => s + t.totalEffort, 0);
  const totalEffort = tasks.reduce((s, t) => s + t.totalEffort, 0);

  const statusCounts = useMemo(() => {
    const byStatus = new Map<string, { name: string; color: string; count: number }>();
    for (const t of tasks) {
      const row = byStatus.get(t.status.id) ?? { name: t.status.name, color: t.status.color, count: 0 };
      row.count++;
      byStatus.set(t.status.id, row);
    }
    return Array.from(byStatus.values()).sort((a, b) => b.count - a.count);
  }, [tasks]);

  const hasQuestion = (t: (typeof tasks)[number]) => !!t.description && t.description.trim() !== '';
  const openQuestions = tasks.filter((t) => hasQuestion(t) && t.status.category !== 'DONE');
  const doneWithOpenQuestion = tasks.filter((t) => hasQuestion(t) && t.status.category === 'DONE');
  const uiMissingBe = tasks.filter((t) => t.type === 'UI' && !t.linkedTasks.some((l) => l.type === 'BE'));

  if (!epicId) return null;

  return (
    <div>
      <Topbar
        title="Report"
        subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined}
        right={<Chip label="Code complete" value={codeCompleteDate ? formatLong(codeCompleteDate) : '—'} hero />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchableSelect
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          options={assignees.map(([id, name]) => ({ id, label: name }))}
          emptyOption={{ id: 'ALL', label: 'Assignee: All' }}
          className="w-52"
        />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">Type: All</option>
          <option value="BE">BE</option>
          <option value="UI">UI</option>
        </Select>
      </div>

      <div className="mb-4 rounded-lg border border-line bg-panel shadow-card">
        <h3 className="border-b border-line px-3.5 py-3 font-display text-[15px] font-semibold">Tickets by status</h3>
        <div className="flex flex-wrap items-center gap-2 p-3.5">
          {statusCounts.length === 0 && <p className="text-sm text-ink2">No tasks match the current filters.</p>}
          {statusCounts.map((s) => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-3 text-[13px] font-medium"
              style={{ background: `${s.color}1A`, color: s.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.name}
              <b className="font-num">{s.count}</b>
            </span>
          ))}
          {statusCounts.length > 0 && <span className="ml-auto text-[12.5px] text-ink2">{tasks.length} tickets total</span>}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel shadow-card">
          <h3 className="border-b border-line px-3.5 py-3 font-display text-[15px] font-semibold">Workload by member</h3>
          <div className="p-3.5">
            {workload.length === 0 && <p className="text-sm text-ink2">No tasks match the current filters.</p>}
            {workload.map((w) => (
              <div key={w.name} className="mb-3.5 grid grid-cols-[150px_1fr_150px] items-center gap-2.5">
                <span className="flex items-center gap-1.5 truncate">
                  <Avatar name={w.name} />
                  {w.name} <small className="text-ink3">· {w.count} tasks</small>
                </span>
                <div className="flex h-[20px] overflow-hidden rounded-full bg-line2">
                  <div className="h-full bg-be" style={{ width: `${(w.dev / maxWl) * 100}%` }} />
                  <div className="h-full bg-ui" style={{ width: `${(w.test / maxWl) * 100}%` }} />
                </div>
                <span className="text-right font-num text-[13px] text-ink2">
                  {w.dev.toFixed(1)} dev + {w.test.toFixed(1)} test = <b className="text-ink">{(w.dev + w.test).toFixed(1)} md</b>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel shadow-card">
          <h3 className="border-b border-line px-3.5 py-3 font-display text-[15px] font-semibold">Needs attention</h3>
          <div className="flex flex-col gap-2.5 p-3.5">
            {bottleneck && (
              <div className="flex gap-2.5 rounded-md bg-danger-soft px-3.5 py-2.5 text-[14px] text-[#A0303A]">
                <Icon name="flag" size={16} className="mt-0.5 shrink-0" />
                <span>
                  <b>Bottleneck:</b> {bottleneck.name} finishes last — <b>{formatLong(bottleneck.finishDate)}</b>.
                </span>
              </div>
            )}
            {uiMissingBe.length > 0 && (
              <div className="flex gap-2.5 rounded-md bg-warn-soft px-3.5 py-2.5 text-[14px] text-warn">
                <Icon name="link" size={16} className="mt-0.5 shrink-0" />
                <span>
                  {uiMissingBe.length} UI ticket{uiMissingBe.length === 1 ? '' : 's'} {uiMissingBe.length === 1 ? 'has' : 'have'} no BE ticket linked:{' '}
                  <span className="font-mono">{uiMissingBe.map((t) => t.ticketId).join(', ')}</span>
                </span>
              </div>
            )}
            {doneWithOpenQuestion.length > 0 && (
              <div className="flex gap-2.5 rounded-md bg-danger-soft px-3.5 py-2.5 text-[14px] text-[#A0303A]">
                <Icon name="question" size={16} className="mt-0.5 shrink-0" />
                <span>
                  {doneWithOpenQuestion.length} ticket{doneWithOpenQuestion.length === 1 ? '' : 's'} marked done still{' '}
                  {doneWithOpenQuestion.length === 1 ? 'has' : 'have'} an open question:{' '}
                  <span className="font-mono">{doneWithOpenQuestion.map((t) => t.ticketId).join(', ')}</span>
                </span>
              </div>
            )}
            {openQuestions.length > 0 && (
              <div className="flex gap-2.5 rounded-md bg-primary-soft px-3.5 py-2.5 text-[14px] text-primary">
                <Icon name="question" size={16} className="mt-0.5 shrink-0" />
                <span>
                  {openQuestions.length} ticket{openQuestions.length === 1 ? '' : 's'} {openQuestions.length === 1 ? 'has' : 'have'} an open question:{' '}
                  <span className="font-mono">{openQuestions.map((t) => t.ticketId).join(', ')}</span>
                </span>
              </div>
            )}
            <div className="flex gap-2.5 rounded-md bg-done-soft px-3.5 py-2.5 text-[14px] text-[#0F7A48]">
              <Icon name="check" size={16} className="mt-0.5 shrink-0" />
              <span>
                Progress: {doneCount}/{tasks.length} tasks done ({tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0}%) ·{' '}
                {doneEffort.toFixed(1)} / {totalEffort.toFixed(1)} man-days completed
              </span>
            </div>
            {!bottleneck &&
              uiMissingBe.length === 0 &&
              doneWithOpenQuestion.length === 0 &&
              openQuestions.length === 0 && <p className="text-sm text-ink2">Nothing needs attention right now.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel shadow-card">
        <h3 className="border-b border-line px-3.5 py-3 font-display text-[15px] font-semibold">Combined timeline — all members (read-only)</h3>
        <div className="p-2">
          {lanes.length === 0 ? (
            <p className="p-6 text-center text-ink2">No active assigned tasks to chart.</p>
          ) : (
            <TimelineGrid lanes={lanes} windowStart={windowStart} windowDays={windowDays} today={today} editable={false} />
          )}
        </div>
      </div>
    </div>
  );
}
