import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '../../types';
import {
  addDays,
  computeLaneSchedules,
  dateKey,
  daysBetween,
  dow,
  formatShort,
  formatLong,
  type GapPortion,
  type LaneSchedule,
  type SchedulableTask,
} from '../../lib/scheduling';
import { Avatar } from '../ui/Avatar';

const GAP_STRIPE = 'bg-[repeating-linear-gradient(135deg,#DFE5E4,#DFE5E4_6px,#EDF1F0_6px,#EDF1F0_12px)]';

export interface Lane {
  userId: string;
  name: string;
  tasks: Task[]; // ordered by sort_order, active (non-DONE) only, already filtered to this assignee
  startDate: Date;
  gapDays: Map<string, GapPortion>;
}

export function TimelineGrid({
  lanes,
  windowStart,
  windowDays,
  today,
  editable,
  effortField = 'devEffort',
  onSetGap,
  onReorderLane,
  onChangeStartDate,
}: {
  lanes: Lane[];
  windowStart: Date;
  windowDays: number;
  today: Date;
  editable: boolean;
  effortField?: 'devEffort' | 'testEffort' | 'totalEffort';
  onSetGap?: (userId: string, dateKeyStr: string, portion: GapPortion | null) => void;
  onReorderLane?: (userId: string, orderedTaskIds: string[]) => void;
  onChangeStartDate?: (userId: string, newDateKey: string) => void;
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
      gapDays: lane.gapDays,
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

  function handleDropOnDay(targetLane: Lane, dateKeyStr: string) {
    const dragged = dragRef.current;
    dragRef.current = null;
    if (!dragged || dragged.userId !== targetLane.userId || !onChangeStartDate) return;
    // Dragging onto empty grid space only makes sense for the lane's first task —
    // it's the only task whose position actually maps to the lane's start date.
    if (dragged.taskId !== targetLane.tasks[0]?.id) return;
    onChangeStartDate(targetLane.userId, dateKeyStr);
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid"
        style={{ gridTemplateColumns: `172px repeat(${windowDays}, minmax(58px, 1fr))`, minWidth: 172 + windowDays * 58 }}
      >
        <div className="sticky top-0 left-0 z-30 border-b border-r border-line bg-panel" />
        {Array.from({ length: windowDays }).map((_, i) => {
          const date = addDays(windowStart, i);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          const isToday = i === todayCol;
          return (
            <div
              key={i}
              className={`sticky top-0 z-20 border-b border-line py-1.5 text-center font-mono text-[11.5px] transition-colors ${
                weekend ? 'bg-wknd text-[#ADB8B5]' : 'bg-panel text-ink2'
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
            onSetGap={onSetGap}
            onChangeStartDate={onChangeStartDate}
            onDragStart={(taskId) => {
              dragRef.current = { userId: lane.userId, taskId };
            }}
            onDrop={(taskId) => {
              handleDrop(lane, taskId);
              forceRender((n) => n + 1);
            }}
            onDropOnDay={(dateKeyStr) => {
              handleDropOnDay(lane, dateKeyStr);
              forceRender((n) => n + 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function GapPopover({ onSelect, onClose }: { onSelect: (portion: GapPortion | null) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  const options: { label: string; portion: GapPortion | null; danger?: boolean }[] = [
    { label: 'Busy morning (AM)', portion: 'AM' },
    { label: 'Busy afternoon (PM)', portion: 'PM' },
    { label: 'Busy all day', portion: 'FULL' },
    { label: 'Clear', portion: null, danger: true },
  ];

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-1/2 top-full z-40 mt-1.5 w-44 origin-top -translate-x-1/2 animate-[scale-in_0.12s_ease-out] overflow-hidden rounded-lg border border-line bg-white py-1 shadow-xl"
    >
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onSelect(opt.portion)}
          className={`block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-primary-soft ${
            opt.danger ? 'border-t border-line text-ink2 hover:bg-gray-50 hover:text-red-600' : 'text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
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
  onSetGap,
  onChangeStartDate,
  onDragStart,
  onDrop,
  onDropOnDay,
}: {
  lane: Lane;
  result: LaneSchedule;
  windowDays: number;
  windowStart: Date;
  todayCol: number;
  editable: boolean;
  onSetGap?: (userId: string, dateKeyStr: string, portion: GapPortion | null) => void;
  onChangeStartDate?: (userId: string, newDateKey: string) => void;
  onDragStart: (taskId: string) => void;
  onDrop: (taskId: string) => void;
  onDropOnDay?: (dateKeyStr: string) => void;
}) {
  const taskById = new Map(lane.tasks.map((t) => [t.id, t]));
  const [openGapKey, setOpenGapKey] = useState<string | null>(null);
  const [editingStart, setEditingStart] = useState(false);

  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center gap-0.5 border-b border-r border-line bg-panel px-3.5 py-2.5">
        <b className="flex items-center gap-1.5 text-[14.5px]">
          <Avatar name={lane.name} />
          {lane.name}
        </b>
        {onChangeStartDate && editable ? (
          editingStart ? (
            <input
              type="date"
              autoFocus
              defaultValue={dateKey(lane.startDate)}
              onBlur={(e) => {
                if (e.target.value) onChangeStartDate(lane.userId, e.target.value);
                setEditingStart(false);
              }}
              className="w-fit rounded border border-line px-1 py-0.5 font-mono text-[11px]"
            />
          ) : (
            <button
              onClick={() => setEditingStart(true)}
              className="w-fit font-mono text-[11.5px] text-primary hover:underline"
            >
              starts {formatShort(lane.startDate)} ✎
            </button>
          )
        ) : (
          <small className="font-mono text-[11.5px] text-ink2">starts {formatShort(lane.startDate)}</small>
        )}
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
        const gapPortion = weekend ? undefined : lane.gapDays.get(key);
        const cell = result.cellsByColumn.get(i);
        const task = cell ? taskById.get(cell.taskId) : undefined;
        const clickable = editable && !weekend && !!onSetGap;
        const dropTarget = editable && !weekend && !!onDropOnDay;
        const popoverOpen = openGapKey === key;

        return (
          <div
            key={i}
            onClick={() => clickable && setOpenGapKey(popoverOpen ? null : key)}
            onDragOver={(e) => dropTarget && e.preventDefault()}
            onDrop={(e) => {
              if (!dropTarget) return;
              e.preventDefault();
              onDropOnDay!(key);
            }}
            className={`relative h-[56px] border-b border-r border-dashed border-[#EEF2F1] transition-colors ${weekend ? 'bg-wknd' : ''} ${
              clickable ? 'cursor-pointer hover:bg-primary-soft/40' : ''
            }`}
          >
            {i === todayCol && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary opacity-65" />}

            {gapPortion === 'FULL' && (
              <span className={`absolute inset-0 flex items-center justify-center text-[10.5px] tracking-wide text-[#7C8C89] ${GAP_STRIPE}`}>
                busy
              </span>
            )}
            {(gapPortion === 'AM' || gapPortion === 'PM') && (
              <span
                className={`absolute inset-y-0 w-1/2 ${GAP_STRIPE}`}
                style={{ left: gapPortion === 'AM' ? 0 : '50%' }}
                title={gapPortion === 'AM' ? 'Busy morning' : 'Busy afternoon'}
              />
            )}

            {task && cell && (
              <div
                draggable={editable}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', task.id);
                  onDragStart(task.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDrop(task.id);
                }}
                title={`${task.ticketId} · ${task.title} · ${task.devEffort} md`}
                className={`absolute inset-1.5 flex items-center justify-center overflow-hidden rounded-md font-mono text-[11px] font-semibold text-white transition-transform hover:scale-[1.03] ${
                  task.type === 'BE' ? 'bg-be' : 'bg-ui'
                } ${cell.portion !== 'full' ? 'w-[calc(50%-3px)]' : ''} ${editable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ left: cell.portion === 'right' ? '50%' : undefined }}
              >
                {cell.isStart ? task.ticketId : ''}
              </div>
            )}

            {popoverOpen && (
              <GapPopover
                onSelect={(portion) => {
                  onSetGap!(lane.userId, key, portion);
                  setOpenGapKey(null);
                }}
                onClose={() => setOpenGapKey(null)}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
