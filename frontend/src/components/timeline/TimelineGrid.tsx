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
  type ScheduleCell,
  type SchedulableTask,
} from '../../lib/scheduling';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

// Faint diagonal weave, only visible inside a gap chip's own soft fill — never a loud hazard-stripe.
const GAP_TEXTURE =
  'bg-[repeating-linear-gradient(135deg,rgba(146,150,168,0.16),rgba(146,150,168,0.16)_5px,transparent_5px,transparent_10px)]';

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

  // Single entry point for every drop on a lane's row — whether it lands on empty grid
  // space or directly on top of another task's chip. The first task's position IS the
  // lane's start date, so dragging it always moves the start date, even when dropped on
  // a colored cell; dragging any other task to reorder still works normally.
  function handleCellDrop(targetLane: Lane, dateKeyStr: string, targetTaskId?: string) {
    const dragged = dragRef.current;
    dragRef.current = null;
    if (!dragged || dragged.userId !== targetLane.userId) return;

    if (dragged.taskId === targetLane.tasks[0]?.id) {
      onChangeStartDate?.(targetLane.userId, dateKeyStr);
      return;
    }
    if (!targetTaskId || targetTaskId === dragged.taskId || !onReorderLane) return;
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
        <div className="sticky top-0 left-0 z-30 border-b border-r border-line bg-panel" />
        {Array.from({ length: windowDays }).map((_, i) => {
          const date = addDays(windowStart, i);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          const isToday = i === todayCol;
          return (
            <div
              key={i}
              className={`sticky top-0 z-20 border-b border-line py-1.5 text-center font-mono text-[11.5px] transition-colors ${
                weekend ? 'bg-wknd text-ink3' : 'bg-panel text-ink2'
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
            onCellDrop={(dateKeyStr, targetTaskId) => {
              handleCellDrop(lane, dateKeyStr, targetTaskId);
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
      className="absolute left-1/2 top-full z-40 mt-1.5 w-44 origin-top -translate-x-1/2 animate-[scale-in_0.12s_ease-out] overflow-hidden rounded-md border border-line bg-white py-1 shadow-raised"
    >
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onSelect(opt.portion)}
          className={`block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-primary-soft ${
            opt.danger ? 'border-t border-line text-ink2 hover:bg-panel2 hover:text-danger' : 'text-ink'
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
  onCellDrop,
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
  onCellDrop: (dateKeyStr: string, targetTaskId?: string) => void;
}) {
  const taskById = new Map(lane.tasks.map((t) => [t.id, t]));
  const [openGapKey, setOpenGapKey] = useState<string | null>(null);
  const [editingStart, setEditingStart] = useState(false);

  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center gap-1 border-b border-r border-line bg-panel px-3.5 py-2">
        <b className="flex items-center gap-1.5 truncate text-[14px]">
          <Avatar name={lane.name} size={18} />
          <span className="truncate">{lane.name}</span>
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
              className="w-fit rounded-full border border-primary/40 bg-primary-soft px-2 py-0.5 font-mono text-[11px] text-primary outline-none"
            />
          ) : (
            <button
              onClick={() => setEditingStart(true)}
              className="group inline-flex w-fit items-center gap-1 rounded-full border border-line bg-panel2 py-0.5 pl-2 pr-1.5 font-mono text-[11px] text-ink2 transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
            >
              <Icon name="flag" size={9} className="opacity-60 group-hover:opacity-100" />
              starts {formatShort(lane.startDate)}
              <Icon name="pencil" size={9} className="opacity-0 transition-opacity group-hover:opacity-70" />
            </button>
          )
        ) : (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-panel2 py-0.5 pl-2 pr-2 font-mono text-[11px] text-ink2">
            <Icon name="flag" size={9} className="opacity-60" />
            starts {formatShort(lane.startDate)}
          </span>
        )}

        <div className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11.5px] text-ink2">
          <span>{result.remainingEffort.toFixed(1)}md left</span>
          {result.finishDate && (
            <>
              <span className="text-line" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center gap-0.5 font-semibold text-done">
                <Icon name="check" size={10} />
                {formatLong(result.finishDate)}
              </span>
            </>
          )}
        </div>
      </div>

      {Array.from({ length: windowDays }).map((_, i) => {
        const date = addDays(windowStart, i);
        const weekend = date.getDay() === 0 || date.getDay() === 6;
        const key = dateKey(date);
        const gapPortion = weekend ? undefined : lane.gapDays.get(key);
        const cells = result.cellsByColumn.get(i);
        const fullCell = cells?.find((c) => c.portion === 'full');
        const leftCell = cells?.find((c) => c.portion === 'left');
        const rightCell = cells?.find((c) => c.portion === 'right');
        const clickable = editable && !weekend && !!onSetGap;
        const dropTarget = editable && !weekend;
        const popoverOpen = openGapKey === key;

        return (
          <div
            key={i}
            onClick={() => clickable && setOpenGapKey(popoverOpen ? null : key)}
            onDragOver={(e) => dropTarget && e.preventDefault()}
            onDrop={(e) => {
              if (!dropTarget) return;
              e.preventDefault();
              onCellDrop(key);
            }}
            className={`relative h-[56px] border-b border-r border-dashed border-line2 transition-colors ${weekend ? 'bg-wknd' : ''} ${
              clickable ? 'cursor-pointer hover:bg-primary-soft/40' : ''
            }`}
          >
            {i === todayCol && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary opacity-65" />}

            {fullCell ? (
              <TaskChip
                full
                task={taskById.get(fullCell.taskId)}
                cell={fullCell}
                editable={editable}
                dropTarget={dropTarget}
                onDragStart={onDragStart}
                onDrop={(targetTaskId) => onCellDrop(key, targetTaskId)}
              />
            ) : gapPortion === 'FULL' ? (
              <GapChip full title="Busy all day" />
            ) : (
              <div className="absolute inset-1 grid grid-cols-2 gap-[3px]">
                {gapPortion === 'AM' ? (
                  <GapChip className="col-start-1" title="Busy morning" />
                ) : leftCell ? (
                  <TaskChip
                    className="col-start-1"
                    task={taskById.get(leftCell.taskId)}
                    cell={leftCell}
                    editable={editable}
                    dropTarget={dropTarget}
                    onDragStart={onDragStart}
                    onDrop={(targetTaskId) => onCellDrop(key, targetTaskId)}
                  />
                ) : null}
                {gapPortion === 'PM' ? (
                  <GapChip className="col-start-2" title="Busy afternoon" />
                ) : rightCell ? (
                  <TaskChip
                    className="col-start-2"
                    task={taskById.get(rightCell.taskId)}
                    cell={rightCell}
                    editable={editable}
                    dropTarget={dropTarget}
                    onDragStart={onDragStart}
                    onDrop={(targetTaskId) => onCellDrop(key, targetTaskId)}
                  />
                ) : null}
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

function TaskChip({
  task,
  cell,
  full,
  editable,
  dropTarget,
  className = '',
  onDragStart,
  onDrop,
}: {
  task: Task | undefined;
  cell: ScheduleCell;
  full?: boolean;
  editable: boolean;
  dropTarget: boolean;
  className?: string;
  onDragStart: (taskId: string) => void;
  onDrop: (taskId: string) => void;
}) {
  if (!task) return null;
  return (
    <div
      draggable={editable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        onDragStart(task.id);
      }}
      onDragOver={(e) => dropTarget && e.preventDefault()}
      onDrop={(e) => {
        if (!dropTarget) return;
        e.preventDefault();
        // Stop this from also bubbling to the day cell's own onDrop below it —
        // handleCellDrop already receives this chip's task id as the drop target.
        e.stopPropagation();
        onDrop(task.id);
      }}
      title={`${task.ticketId} · ${task.title} · ${task.devEffort} md`}
      className={`flex items-center justify-center overflow-hidden rounded-sm font-mono text-[11px] font-semibold text-white shadow-sm transition-transform hover:z-10 hover:scale-[1.05] hover:shadow-raised ${
        task.type === 'BE' ? 'bg-be' : 'bg-ui'
      } ${full ? 'absolute inset-1' : 'h-full'} ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    >
      {cell.isStart ? task.ticketId : ''}
    </div>
  );
}

function GapChip({ full, title, className = '' }: { full?: boolean; title?: string; className?: string }) {
  return (
    <div
      title={title}
      className={`relative overflow-hidden rounded-sm border border-dashed border-line2 bg-gap/15 ${
        full ? 'absolute inset-1 flex items-center justify-center' : 'h-full'
      } ${className}`}
    >
      <span className={`absolute inset-0 ${GAP_TEXTURE}`} aria-hidden="true" />
      {full && <span className="relative font-mono text-[10px] tracking-wide text-ink3">busy</span>}
    </div>
  );
}
