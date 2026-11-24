/**
 * The school weeks of the year, built from the order's dates (school-year-2026-2027.ts).
 *
 * A week is Monday–Friday inside one course interval. The two short weeks the order counts as
 * weeks of courses (Monday–Tuesday 21–22 December, Wednesday–Friday 5–7 May) are weeks here too, so
 * the year has the order's 36 weeks. A week keeps its holidays (5 October, 30 November – 1 December,
 * 1 June) and says so; vacations are never weeks.
 */
import {
  FREE_DAYS,
  PROGRAM_WINDOW,
  courseIntervals,
  type FebruaryOption,
  type ProgramId,
} from './school-year-2026-2027';

export interface SchoolWeek {
  /** 1 … 36, in order through the year */
  n: number;
  module: number;
  /** Monday of the week */
  monday: string;
  /** the school days of the week (holidays left out) */
  days: string[];
  /** first and last day of courses in it (a short week starts or ends inside it) */
  first: string;
  last: string;
  holidays: { date: string; name: string }[];
  /** fewer than five days of courses because the interval starts or ends inside the week */
  short: boolean;
  /** „Școala altfel” or „Săptămâna verde”, when the school placed one here */
  program?: ProgramId;
}

const DAY = 86_400_000;
const toTime = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => toIso(toTime(iso) + n * DAY);
/** 0 = Monday … 6 = Sunday */
const weekday = (iso: string) => (new Date(toTime(iso)).getUTCDay() + 6) % 7;
const mondayOf = (iso: string) => addDays(iso, -weekday(iso));

/** Every week of courses, before the programme weeks are placed. */
export function courseWeeks(february?: FebruaryOption['id']): SchoolWeek[] {
  const weeks: SchoolWeek[] = [];
  for (const iv of courseIntervals(february)) {
    for (let mon = mondayOf(iv.start); mon <= iv.end; mon = addDays(mon, 7)) {
      const inside: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = addDays(mon, i);
        if (d >= iv.start && d <= iv.end) inside.push(d);
      }
      const holidays = FREE_DAYS.filter((h) => inside.includes(h.date));
      weeks.push({
        n: weeks.length + 1,
        module: iv.module,
        monday: mon,
        days: inside.filter((d) => !holidays.some((h) => h.date === d)),
        first: inside[0],
        last: inside[inside.length - 1],
        holidays,
        short: inside.length < 5,
      });
    }
  }
  return weeks;
}

/** Can a programme week go here? Five full days of courses, no holiday, inside the window (Art. 4). */
export function canHostProgram(w: SchoolWeek): boolean {
  return !w.short && w.holidays.length === 0 && w.first >= PROGRAM_WINDOW.start && w.last <= PROGRAM_WINDOW.end;
}

export interface CalendarOptions {
  february?: FebruaryOption['id'];
  /** the Monday of each programme week, or null when the school has not placed it (or holds it otherwise) */
  programs?: Partial<Record<ProgramId, string | null>>;
}

/**
 * The year's weeks with the programme weeks placed. A programme week that cannot go where it was
 * asked (a holiday week, after 23 April, the same module as the other one) is left out and named in
 * `ignored`, so the page can say so instead of printing a plan the order does not allow.
 */
export function schoolWeeks(opts: CalendarOptions = {}): { weeks: SchoolWeek[]; ignored: ProgramId[] } {
  const weeks = courseWeeks(opts.february);
  const ignored: ProgramId[] = [];
  const usedModules = new Set<number>();
  for (const id of ['saptamana-verde', 'scoala-altfel'] as ProgramId[]) {
    const monday = opts.programs?.[id];
    if (!monday) continue;
    const w = weeks.find((x) => x.monday === monday);
    if (!w || !canHostProgram(w) || w.program || usedModules.has(w.module)) {
      ignored.push(id);
      continue;
    }
    w.program = id;
    usedModules.add(w.module);
  }
  return { weeks, ignored };
}

const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const parts = (iso: string) => ({ y: +iso.slice(0, 4), m: +iso.slice(5, 7) - 1, d: +iso.slice(8, 10) });

/** „7–11 septembrie”, „28 septembrie – 2 octombrie”, „28 decembrie 2026 – 8 ianuarie 2027” (with the year when asked or needed). */
export function rangeLabel(from: string, to: string, withYear = false): string {
  const a = parts(from);
  const b = parts(to);
  const year = (y: number) => (withYear ? ` ${y}` : '');
  if (from === to) return `${a.d} ${MONTHS[a.m]}${year(a.y)}`;
  if (a.y !== b.y) return `${a.d} ${MONTHS[a.m]} ${a.y} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS[b.m]}${year(b.y)}`;
  return `${a.d} ${MONTHS[a.m]} – ${b.d} ${MONTHS[b.m]}${year(b.y)}`;
}

/** „5 octombrie” */
export function dayLabel(iso: string): string {
  const p = parts(iso);
  return `${p.d} ${MONTHS[p.m]}`;
}

const WEEKDAYS = ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'];
export const weekdayName = (iso: string) => WEEKDAYS[weekday(iso)];
