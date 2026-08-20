export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dow(d: Date): string {
  return DOW[d.getDay()];
}

export function formatShort(d: Date): string {
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

export function formatLong(d: Date): string {
  const w = DOW[d.getDay()];
  return `${w.charAt(0)}${w.slice(1).toLowerCase()} ${formatShort(d)}`;
}

export function defaultStartDateFor(today: Date): Date {
  return isWeekend(today) ? nextWorkingDay(today, 1) : today;
}

export function nextWorkingDay(d: Date, offset = 1): Date {
  let result = startOfDay(d);
  let remaining = offset;
  while (remaining > 0) {
    result = addDays(result, 1);
    if (!isWeekend(result)) remaining--;
  }
  return result;
}

export type GapPortion = 'FULL' | 'AM' | 'PM';

/** Decodes a stored gap-day entry ("2026-08-17" or "2026-08-17:AM"/":PM") into date + portion. */
export function parseGapEntry(entry: string): { date: string; portion: GapPortion } {
  const [date, suffix] = entry.split(':');
  return { date, portion: suffix === 'AM' || suffix === 'PM' ? suffix : 'FULL' };
}

export function encodeGapEntry(date: string, portion: GapPortion): string {
  return portion === 'FULL' ? date : `${date}:${portion}`;
}

export interface ScheduleCell {
  taskId: string;
  /** Which part of the day column this chunk occupies (half chunks render at half width). */
  portion: 'full' | 'left' | 'right';
  isStart: boolean;
}

export interface LaneSchedule {
  /** Each column holds one full-day cell, or up to two half-day cells (one 'left', one 'right'). */
  cellsByColumn: Map<number, ScheduleCell[]>;
  finishDate: Date | null;
  remainingEffort: number;
}

export interface SchedulableTask {
  id: string;
  effortDays: number;
}

export interface ScheduleLaneInput {
  userId: string;
  name: string;
  tasks: SchedulableTask[];
  startDate: Date;
  gapDays: Map<string, GapPortion>;
}

export interface ScheduleLaneOutput extends LaneSchedule {
  userId: string;
  name: string;
}

export function computeLaneSchedules(lanes: ScheduleLaneInput[], windowStart: Date, maxColumn: number): ScheduleLaneOutput[] {
  return lanes.map((lane) => ({
    userId: lane.userId,
    name: lane.name,
    ...scheduleLane(lane.tasks, lane.startDate, windowStart, lane.gapDays, maxColumn),
  }));
}

/**
 * Packs `tasks` (in order) into working-day columns of a shared grid, starting at `laneStartDate`.
 * Columns are indexed relative to `windowStart` so multiple lanes can share one calendar header.
 */
export function scheduleLane(
  tasks: SchedulableTask[],
  laneStartDate: Date,
  windowStart: Date,
  gapDays: Map<string, GapPortion>,
  maxColumn: number
): LaneSchedule {
  const cellsByColumn = new Map<number, ScheduleCell[]>();
  let col = Math.max(0, daysBetween(windowStart, laneStartDate));
  let finishDate: Date | null = null;
  const remainingEffort = tasks.reduce((s, t) => s + t.effortDays, 0);

  // Capacity still open in the column currently being filled (0 = column not opened yet,
  // or fully consumed). Carries across tasks so a half-day gap frees its other half for
  // whichever task needs it next, instead of always jumping to the next calendar day.
  let openCapacity = 0;
  let openSide: 'left' | 'right' = 'left';

  function addCell(cell: ScheduleCell) {
    const list = cellsByColumn.get(col);
    if (list) list.push(cell);
    else cellsByColumn.set(col, [cell]);
  }

  for (const task of tasks) {
    let left = task.effortDays;
    let started = false;
    while (left > 0 && col < maxColumn) {
      if (openCapacity === 0) {
        const date = addDays(windowStart, col);
        if (isWeekend(date)) {
          col++;
          continue;
        }
        const gapPortion = gapDays.get(dateKey(date));
        if (gapPortion === 'FULL') {
          col++;
          continue;
        }
        if (gapPortion === 'AM') {
          openCapacity = 0.5;
          openSide = 'right'; // morning busy, afternoon free
        } else if (gapPortion === 'PM') {
          openCapacity = 0.5;
          openSide = 'left'; // afternoon busy, morning free
        } else {
          openCapacity = 1;
          openSide = 'left';
        }
      }

      const date = addDays(windowStart, col);
      const amount = Math.min(left, openCapacity);
      const portion: ScheduleCell['portion'] = openCapacity === 1 && amount === 1 ? 'full' : openSide;
      addCell({ taskId: task.id, portion, isStart: !started });
      started = true;
      left -= amount;
      finishDate = date;
      openCapacity -= amount;

      if (openCapacity <= 0) {
        openCapacity = 0;
        col++;
      } else {
        // Only half of a free day was used — the other half opens up for the next allocation.
        openSide = 'right';
      }
    }
  }

  return { cellsByColumn, finishDate, remainingEffort };
}
