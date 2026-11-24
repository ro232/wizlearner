/**
 * The plan being edited, kept in this browser only (localStorage), so a reload or a visit to a
 * sheet does not lose it. Nothing here is sent anywhere. Every read and write may fail (private
 * windows, blocked storage): the page then simply starts from a fresh proposal.
 */
import { buildPlan, type Plan, type PlanRow } from './plan';
import { FEBRUARY_OPTIONS, type ProgramId } from './school-year-2026-2027';
import { PLAN_LEVELS, PLAN_SUBJECTS } from './subjects';

const KEY = 'ww-planificare-v1';

export interface PlanDraft {
  plan: Plan;
  school: string;
  teacher: string;
  withSheets: boolean;
}

interface Stored {
  level: string;
  subject: string;
  hoursPerWeek: number;
  february: string;
  programs: Partial<Record<ProgramId, string | null>>;
  rows: Pick<PlanRow, 'id' | 'title' | 'codes' | 'contents' | 'weeks' | 'hours' | 'notes' | 'hoursEdited' | 'notesEdited'>[];
  school: string;
  teacher: string;
  withSheets: boolean;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const strList = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 60).map((x) => x.slice(0, max)) : []);

/** Rebuild the plan from the stored settings and put the stored edits back, if they still fit its weeks. */
export function restoreDraft(raw: unknown): PlanDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<Stored>;
  const level = PLAN_LEVELS.find((l) => l.id === s.level)?.id;
  const subject = PLAN_SUBJECTS.find((x) => x.id === s.subject)?.id;
  const february = FEBRUARY_OPTIONS.find((f) => f.id === s.february)?.id;
  if (!level || !subject || !february) return null;
  const programs: Partial<Record<ProgramId, string | null>> = {};
  for (const id of ['scoala-altfel', 'saptamana-verde'] as ProgramId[]) {
    const v = s.programs?.[id];
    programs[id] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  }
  const plan = buildPlan({ level, subject, february, programs, hoursPerWeek: typeof s.hoursPerWeek === 'number' ? s.hoursPerWeek : undefined });
  const rows = Array.isArray(s.rows) ? s.rows : [];
  // the edits fit only if they are the same rows over the same weeks
  const sameRows = rows.length === plan.rows.length && rows.every((r, i) => r && r.id === plan.rows[i].id);
  const weeksOf = (list: { weeks?: unknown }[]) => list.flatMap((r) => (Array.isArray(r.weeks) ? r.weeks : [])).filter((n) => typeof n === 'number').sort((a, b) => a - b).join(',');
  const fits = sameRows && weeksOf(rows) === weeksOf(plan.rows) && new Set(weeksOf(rows).split(',')).size === plan.weeks.length && rows.every((r) => Array.isArray(r.weeks) && r.weeks.length > 0);
  if (fits) {
    plan.rows = plan.rows.map((r, i) => {
      const e = rows[i];
      return {
        ...r,
        title: str(e.title, 200) || r.title,
        codes: strList(e.codes, 12),
        contents: strList(e.contents, 600),
        weeks: (e.weeks as number[]).slice().sort((a, b) => a - b),
        hours: typeof e.hours === 'number' && Number.isFinite(e.hours) ? Math.max(0, Math.min(500, Math.round(e.hours))) : r.hours,
        notes: str(e.notes, 2000),
        hoursEdited: !!e.hoursEdited,
        notesEdited: !!e.notesEdited,
      };
    });
  }
  return { plan, school: str(s.school, 200), teacher: str(s.teacher, 200), withSheets: !!s.withSheets };
}

export function loadDraft(): PlanDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? restoreDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function storeDraft(d: PlanDraft): void {
  try {
    const stored: Stored = {
      level: d.plan.level,
      subject: d.plan.subject,
      hoursPerWeek: d.plan.hoursPerWeek,
      february: d.plan.february,
      programs: d.plan.programs,
      rows: d.plan.rows.map(({ id, title, codes, contents, weeks, hours, notes, hoursEdited, notesEdited }) => ({ id, title, codes, contents, weeks, hours, notes, hoursEdited, notesEdited })),
      school: d.school,
      teacher: d.teacher,
      withSheets: d.withSheets,
    };
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // storage full or blocked: the page keeps working without it
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
