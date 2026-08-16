import type { Holiday, Project, WorkWeek } from "./types.js";
import { DEFAULT_WORK_WEEK } from "./types.js";

export function cloneDate(d: Date): Date {
  return new Date(d.getTime());
}

export function startOfDay(d: Date): Date {
  const x = cloneDate(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = cloneDate(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function iso(d: Date): string {
  return d.toISOString();
}

export function parseIso(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function workDayMinutes(week: WorkWeek, day: number): { start: number; end: number }[] {
  const spec = week.days[day];
  if (!spec) return [];
  const blocks = [{ start: spec.startMinutes, end: spec.endMinutes }];
  if (spec.startMinutes2 != null && spec.endMinutes2 != null) {
    blocks.push({ start: spec.startMinutes2, end: spec.endMinutes2 });
  }
  return blocks;
}

function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const key = date.toISOString().slice(0, 10);
  return holidays.some((h) => h.date.slice(0, 10) === key);
}

export function isWorkingDay(date: Date, project: Project): boolean {
  const week = project.workWeek ?? DEFAULT_WORK_WEEK;
  if (isHoliday(date, project.holidays)) return false;
  return workDayMinutes(week, date.getDay()).length > 0;
}

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function setMinutes(date: Date, minutes: number): Date {
  const x = startOfDay(date);
  x.setMinutes(minutes);
  return x;
}

export function snapToWork(date: Date, project: Project, direction: 1 | -1 = 1): Date {
  const week = project.workWeek ?? DEFAULT_WORK_WEEK;
  let cursor = cloneDate(date);
  for (let i = 0; i < 366; i++) {
    if (isWorkingDay(cursor, project)) {
      const blocks = workDayMinutes(week, cursor.getDay());
      const m = minutesOf(cursor);
      if (direction === 1) {
        for (const b of blocks) {
          if (m < b.start) return setMinutes(cursor, b.start);
          if (m >= b.start && m < b.end) return cursor;
        }
        cursor = addDays(startOfDay(cursor), 1);
        continue;
      }
      for (let bi = blocks.length - 1; bi >= 0; bi--) {
        const b = blocks[bi];
        if (m > b.end) return setMinutes(cursor, b.end);
        if (m > b.start && m <= b.end) return cursor;
      }
      cursor = addDays(startOfDay(cursor), -1);
      cursor.setHours(23, 59, 0, 0);
      continue;
    }
    cursor = direction === 1 ? addDays(startOfDay(cursor), 1) : addDays(startOfDay(cursor), -1);
    if (direction === -1) cursor.setHours(23, 59, 0, 0);
  }
  return date;
}

export function addWorkSeconds(start: Date, seconds: number, project: Project): Date {
  if (seconds <= 0) return snapToWork(start, project, 1);
  const week = project.workWeek ?? DEFAULT_WORK_WEEK;
  let remaining = seconds;
  let cursor = snapToWork(start, project, 1);
  let guard = 0;
  while (remaining > 0 && guard++ < 20000) {
    const blocks = workDayMinutes(week, cursor.getDay());
    const m = minutesOf(cursor);
    let progressed = false;
    for (const b of blocks) {
      if (m >= b.end) continue;
      const from = Math.max(m, b.start);
      const available = (b.end - from) * 60;
      if (available <= 0) continue;
      if (remaining <= available) {
        return setMinutes(cursor, from + remaining / 60);
      }
      remaining -= available;
      cursor = setMinutes(cursor, b.end);
      progressed = true;
    }
    cursor = addDays(startOfDay(cursor), 1);
    if (!progressed && !isWorkingDay(cursor, project)) {
      // skip
    }
  }
  return cursor;
}

export function subtractWorkSeconds(end: Date, seconds: number, project: Project): Date {
  if (seconds <= 0) return snapToWork(end, project, -1);
  const week = project.workWeek ?? DEFAULT_WORK_WEEK;
  let remaining = seconds;
  let cursor = snapToWork(end, project, -1);
  let guard = 0;
  while (remaining > 0 && guard++ < 20000) {
    const blocks = workDayMinutes(week, cursor.getDay());
    const m = minutesOf(cursor);
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (m <= b.start) continue;
      const to = Math.min(m, b.end);
      const available = (to - b.start) * 60;
      if (available <= 0) continue;
      if (remaining <= available) {
        return setMinutes(cursor, to - remaining / 60);
      }
      remaining -= available;
      cursor = setMinutes(cursor, b.start);
    }
    cursor = addDays(startOfDay(cursor), -1);
    cursor.setHours(23, 59, 0, 0);
  }
  return cursor;
}

export function workSecondsBetween(start: Date, end: Date, project: Project): number {
  if (end <= start) return 0;
  let total = 0;
  let cursor = snapToWork(start, project, 1);
  const week = project.workWeek ?? DEFAULT_WORK_WEEK;
  let guard = 0;
  while (cursor < end && guard++ < 20000) {
    const blocks = workDayMinutes(week, cursor.getDay());
    const m = minutesOf(cursor);
    let moved = false;
    for (const b of blocks) {
      const from = Math.max(m, b.start);
      const blockEnd = setMinutes(cursor, b.end);
      if (from >= b.end) continue;
      const toDate = end < blockEnd ? end : blockEnd;
      const toMin = minutesOf(toDate);
      if (toMin <= from) continue;
      total += (toMin - from) * 60;
      moved = true;
      if (end <= blockEnd) return total;
    }
    cursor = addDays(startOfDay(cursor), 1);
    if (!moved && cursor >= end) break;
  }
  return total;
}

export function addElapsedSeconds(start: Date, seconds: number): Date {
  return new Date(start.getTime() + seconds * 1000);
}

export function workingMinutesInDay(date: Date, project: Project): number {
  const week = project.workWeek ?? DEFAULT_WORK_WEEK;
  if (!isWorkingDay(date, project)) return 0;
  return workDayMinutes(week, date.getDay()).reduce((s, b) => s + (b.end - b.start), 0);
}
