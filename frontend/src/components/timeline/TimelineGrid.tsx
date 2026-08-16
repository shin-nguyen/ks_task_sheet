import { useMemo, useRef, useState } from 'react';
import type { Task } from '../../types';
import { addDays, computeLaneSchedules, dateKey, daysBetween, dow, formatShort, formatLong, type LaneSchedule, type SchedulableTask } from '../../lib/scheduling';
import { Avatar } from '../ui/Avatar';

export interface Lane {
  userId: string;
  name: string;
  tasks: Task[]; // ordered by sort_order, active (non-DONE) only, already filtered to this assignee
  startDate: Date;
  gapDays: Set<string>;
}

export function TimelineGrid({
  lanes,
  windowStart,
  windowDays,
  today,
  editable,
  effortField = 'devEffort',
  onToggleGap,
  onReorderLane,
}: {
  lanes: Lane[];
  windowStart: Date;
  windowDays: number;
  today: Date;
  editable: boolean;
  effortField?: 'devEffort' | 'testEffort' | 'totalEffort';
  onToggleGap?: (userId: string, dateKeyStr: string) => void;
  onReorderLane?: (userId: string, orderedTaskIds: string[]) => void;
}) {
  const todayCol = daysBetween(windowStart, today);
  const dragRef = useRef<{ userId: string; taskId: string } | null>(null);
  const [, forceRender] = useState(0);

  const laneResults = useMemo(() => {
    const scheduleInputs = lanes.map((lane) => ({
      userId: lane.userId,
      name: lane.name,
      tasks: lane.tasks.map((t) => ({ id: t.id, effortDays: t[effortField] })) as SchedulableTask[],
      startDate: lane.startDate,
      gapDayKeys: lane.gapDays,
    }));
    const results = computeLaneSchedules(scheduleInputs, windowStart, windowDays);
    return lanes.map((lane, i) => ({ lane, result: results[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, windowStart, windowDays, effortField]);

  function handleDrop(targetLane: Lane, targetTaskId: string) {
    const dragged = dragRef.current;
    dragRef.current = null;
    if (!dragged || dragged.userId !== targetLane.userId || dragged.taskId === targetTaskId || !onReorderLane) return;
    const ids = targetLane.tasks.map((t) => t.id);
    const from = ids.indexOf(dragged.taskId);
    const to = ids.indexOf(targetTaskId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragged.taskId);
    onReorderLane(targetLane.userId, ids);
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid"
        style={{ gridTemplateColumns: `172px repeat(${windowDays}, minmax(58px, 1fr))`, minWidth: 172 + windowDays * 58 }}
      >
        <div className="border-r border-line" />
        {Array.from({ length: windowDays }).map((_, i) => {
          const date = addDays(windowStart, i);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          const isToday = i === todayCol;
          return (
            <div
              key={i}
              className={`border-b border-line py-1.5 text-center font-mono text-[11.5px] ${
                weekend ? 'bg-wknd text-[#ADB8B5]' : 'text-ink2'
              } ${isToday ? 'font-bold text-primary' : ''}`}
            >
              <span className="block text-[10.5px] tracking-wide">{dow(date)}</span>
              {formatShort(date)}
            </div>
          );
        })}

        {laneResults.map(({ lane, result }) => (
          <FragmentLane
            key={lane.userId}
            lane={lane}
            result={result}
            windowDays={windowDays}
            windowStart={windowStart}
            todayCol={todayCol}
            editable={editable}
            onToggleGap={onToggleGap}
            onDragStart={(taskId) => {
              dragRef.current = { userId: lane.userId, taskId };
            }}
            onDrop={(taskId) => {
              handleDrop(lane, taskId);
              forceRender((n) => n + 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentLane({
  lane,
  result,
  windowDays,
  windowStart,
  todayCol,
  editable,
  onToggleGap,
  onDragStart,
  onDrop,
}: {
  lane: Lane;
  result: LaneSchedule;
  windowDays: number;
  windowStart: Date;
  todayCol: number;
  editable: boolean;
  onToggleGap?: (userId: string, dateKeyStr: string) => void;
  onDragStart: (taskId: string) => void;
  onDrop: (taskId: string) => void;
}) {
  const taskById = new Map(lane.tasks.map((t) => [t.id, t]));

  return (
    <>
      <div className="flex flex-col justify-center gap-0.5 border-b border-r border-line px-3.5 py-2.5">
        <b className="flex items-center gap-1.5 text-[14.5px]">
          <Avatar name={lane.name} />
          {lane.name}
        </b>
        <small className="text-[12.5px] text-ink2">{result.remainingEffort.toFixed(1)} md remaining</small>
        {result.finishDate ? (
          <span className="font-mono text-[12px] font-semibold text-primary">✓ done {formatLong(result.finishDate)}</span>
        ) : (
          <small className="text-ink2">—</small>
        )}
      </div>

      {Array.from({ length: windowDays }).map((_, i) => {
        const date = addDays(windowStart, i);
        const weekend = date.getDay() === 0 || date.getDay() === 6;
        const key = dateKey(date);
        const isGap = lane.gapDays.has(key);
        const cell = result.cellsByColumn.get(i);
        const task = cell ? taskById.get(cell.taskId) : undefined;
        const clickable = editable && !weekend && onToggleGap;

        return (
          <div
            key={i}
            onClick={() => clickable && onToggleGap!(lane.userId, key)}
            className={`relative h-[56px] border-b border-r border-dashed border-[#EEF2F1] ${
              weekend
                ? 'bg-wknd'
                : isGap
                ? 'bg-[repeating-linear-gradient(135deg,#DFE5E4,#DFE5E4_6px,#EDF1F0_6px,#EDF1F0_12px)]'
                : ''
            } ${clickable ? 'cursor-pointer' : ''}`}
          >
            {i === todayCol && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary opacity-65" />}
            {isGap && !weekend && (
              <span className="absolute inset-0 flex items-center justify-center text-[10.5px] tracking-wide text-[#7C8C89]">busy</span>
            )}
            {task && cell && !isGap && (
              <div
                draggable={editable}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', task.id);
                  onDragStart(task.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(task.id);
                }}
                title={`${task.ticketId} · ${task.title} · ${task.devEffort} md`}
                className={`absolute inset-1.5 flex items-center justify-center overflow-hidden rounded-md font-mono text-[11px] font-semibold text-white ${
                  task.type === 'BE' ? 'bg-be' : 'bg-ui'
                } ${cell.half ? 'w-[calc(50%-3px)]' : ''} ${editable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ left: cell.half && !cell.isStart ? '50%' : undefined }}
              >
                {cell.isStart ? task.ticketId : ''}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
