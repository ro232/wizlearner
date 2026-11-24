/**
 * The proposed „Planificare calendaristică”: the thematic units of units.ts spread over the school
 * weeks of calendar.ts, for one class and one subject, plus the small edits the page allows.
 *
 * Invariants (tested): every week of courses is in exactly one row; the programme weeks („Școala
 * altfel”, „Săptămâna verde”) are rows of their own with no hours; a unit's hours are its weeks
 * times the hours per week until the teacher types another number; every specific competence of the
 * class appears in at least one unit that is not a recap.
 */
import { PROGRAMMES, competencesFor } from '@/lib/curriculum';
import { SHEET_PRESETS, presetConfig, type SheetPreset } from '@/lib/curriculum/presets';
import { sheetCompetences } from '@/lib/curriculum/sheet';
import { dayLabel, rangeLabel, schoolWeeks, weekdayName, type SchoolWeek } from './calendar';
import {
  DEFAULT_FEBRUARY_OPTION,
  DEFAULT_PROGRAM_WEEKS,
  PROGRAMS,
  type FebruaryOption,
  type ProgramId,
} from './school-year-2026-2027';
import { MAX_HOURS_PER_WEEK, planSubject, type PlanLevel, type SubjectId } from './subjects';
import { ALL_CODES, THEMATIC_UNITS, UNIT_PLANS, type ContentRef, type ThematicUnit, type UnitId } from './units';

export interface PlanOptions {
  level: PlanLevel;
  subject: SubjectId;
  hoursPerWeek?: number;
  february?: FebruaryOption['id'];
  programs?: Partial<Record<ProgramId, string | null>>;
}

export interface PlanRow {
  id: string;
  kind: 'unit' | 'recap' | 'program';
  module: number;
  title: string;
  /** specific competence codes, in the programme's order */
  codes: string[];
  /** the „Conținuturi” cell, one item per line */
  contents: string[];
  /** week numbers (1 … 36), ascending */
  weeks: number[];
  hours: number;
  /** preset ids (src/lib/curriculum/presets.ts) */
  sheets: string[];
  notes: string;
  /** the teacher typed the hours / the notes: a change of weeks no longer rewrites them */
  hoursEdited?: boolean;
  notesEdited?: boolean;
}

export interface Plan {
  level: PlanLevel;
  subject: SubjectId;
  hoursPerWeek: number;
  february: FebruaryOption['id'];
  programs: Record<ProgramId, string | null>;
  weeks: SchoolWeek[];
  rows: PlanRow[];
  /** programme weeks that could not be placed where they were asked */
  ignored: ProgramId[];
}

const clampHours = (h: number) => Math.max(1, Math.min(MAX_HOURS_PER_WEEK, Math.round(Number.isFinite(h) ? h : 1)));

// ── contents ─────────────────────────────────────────────────────────────────────────────────────

/** The groups of a class in the programme's order (the [group, item] pointers of units.ts index these). */
export function contentGroups(subject: SubjectId, level: PlanLevel) {
  return PROGRAMMES[planSubject(subject).programme].contents.filter((g) => g.level === level);
}

const SUBDOMAIN_PREFIX = /^Elemente intuitive privind:\s*/;

/**
 * The text of one content, word for word from the programme (only a trailing „,” or „;” of the
 * table cell is dropped). A sub-item („- de la 0 la 10”) is printed after the line it belongs to
 * (`head`); in mathematics the subdomain is put before items that do not name it themselves
 * („Lungime: Unități nonstandard”).
 */
export function contentParts(subject: SubjectId, level: PlanLevel, [g, i]: ContentRef): { head: string | null; text: string } | null {
  const group = contentGroups(subject, level)[g];
  const item = group?.items[i];
  if (!group || item === undefined) return null;
  const clean = (t: string) => t.trim().replace(/[,;]$/, '');
  const sub = group.subdomain?.replace(SUBDOMAIN_PREFIX, '');
  const prefix = sub ? `${sub}: ` : '';
  if (/^-\s/.test(item)) {
    let h = i - 1;
    while (h >= 0 && !group.items[h].trim().endsWith(':')) h--;
    if (h >= 0) return { head: `${prefix}${group.items[h].trim()}`, text: clean(item.replace(/^-\s*/, '')) };
  }
  return { head: null, text: `${prefix}${clean(item)}` };
}

export function contentText(subject: SubjectId, level: PlanLevel, ref: ContentRef): string | null {
  const p = contentParts(subject, level, ref);
  return p ? (p.head ? `${p.head} ${p.text}` : p.text) : null;
}

/** The „Conținuturi” lines of a unit: sub-items of the same line are joined („…: de la 0 la 100; de la 100 la 1000”). */
export function contentLines(subject: SubjectId, level: PlanLevel, refs: readonly ContentRef[]): string[] {
  const out: { head: string | null; texts: string[] }[] = [];
  for (const ref of refs) {
    const p = contentParts(subject, level, ref);
    if (!p) continue;
    const same = p.head ? out.find((o) => o.head === p.head) : undefined;
    if (same) same.texts.push(p.text);
    else out.push({ head: p.head, texts: [p.text] });
  }
  return [...new Set(out.map((o) => (o.head ? `${o.head} ${o.texts.join('; ')}` : o.texts[0])))];
}

// ── sheets ───────────────────────────────────────────────────────────────────────────────────────

/** Does this preset print one of these codes (of this subject) in this class? */
export function presetMatches(preset: SheetPreset, subject: SubjectId, level: PlanLevel, codes: string[]): boolean {
  if (preset.levels && !preset.levels.includes(level)) return false;
  const programme = planSubject(subject).programme;
  const all = codes.includes(ALL_CODES);
  return sheetCompetences(presetConfig(preset, level), level).some((r) => r.programme === programme && (all || codes.includes(r.code)));
}

function unitSheets(ids: string[] | undefined, subject: SubjectId, level: PlanLevel, codes: string[]): string[] {
  return (ids ?? []).filter((id) => {
    const p = SHEET_PRESETS.find((x) => x.id === id);
    return !!p && presetMatches(p, subject, level, codes);
  });
}

// ── weeks → units ────────────────────────────────────────────────────────────────────────────────

interface Slot {
  units: ThematicUnit[];
  weeks: SchoolWeek[];
}

/** Share `weeks` among `units` in order: fixed units first, the rest by weight, at least one week each. */
function share(units: ThematicUnit[], weeks: SchoolWeek[]): { unit: ThematicUnit[]; weeks: SchoolWeek[] }[] {
  if (!units.length || !weeks.length) return [];
  // fewer weeks than units: the last ones are merged into one row
  const groups = units.map((u) => [u]);
  while (groups.length > weeks.length) {
    const last = groups.pop()!;
    groups[groups.length - 1] = [...groups[groups.length - 1], ...last];
  }
  const n = weeks.length;
  const counts = groups.map(() => 1);
  let left = n - groups.length;
  // fixed units: up to their number of weeks
  groups.forEach((g, i) => {
    const fixed = g.length === 1 ? g[0].weeks : undefined;
    if (fixed && left > 0) {
      const extra = Math.min(fixed - 1, left);
      counts[i] += extra;
      left -= extra;
    }
  });
  const flexible = groups.map((g, i) => (g.length === 1 && g[0].weeks ? -1 : i)).filter((i) => i >= 0);
  if (left > 0 && flexible.length) {
    const weightOf = (i: number) => Math.max(groups[i].reduce((s, u) => s + (u.weight || 1), 0), 0.0001);
    const total = flexible.reduce((s, i) => s + weightOf(i), 0);
    const exact = flexible.map((i) => ({ i, v: (left * weightOf(i)) / total }));
    let given = 0;
    for (const e of exact) {
      const whole = Math.floor(e.v);
      counts[e.i] += whole;
      given += whole;
    }
    // largest remainder; on a tie the earlier unit
    exact.sort((a, b) => b.v - Math.floor(b.v) - (a.v - Math.floor(a.v)) || a.i - b.i);
    for (let k = 0; k < left - given; k++) counts[exact[k % exact.length].i]++;
  } else if (left > 0) {
    counts[counts.length - 1] += left;
  }
  const out: { unit: ThematicUnit[]; weeks: SchoolWeek[] }[] = [];
  let at = 0;
  groups.forEach((g, i) => {
    out.push({ unit: g, weeks: weeks.slice(at, at + counts[i]) });
    at += counts[i];
  });
  return out;
}

/** The units of one module and its teaching weeks, cut at the anchored units. */
function moduleSlots(module: number, teaching: SchoolWeek[]): { unit: ThematicUnit[]; weeks: SchoolWeek[] }[] {
  const units = THEMATIC_UNITS.filter((u) => u.module === module);
  const slots: Slot[] = [{ units: [], weeks: [] }];
  const anchored: { unit: ThematicUnit; week: SchoolWeek }[] = [];
  for (const u of units) {
    const week = u.anchor ? teaching.find((w) => w.first <= u.anchor! && u.anchor! <= w.last) : undefined;
    if (week) {
      anchored.push({ unit: u, week });
      slots.push({ units: [], weeks: [] });
    } else {
      slots[slots.length - 1].units.push(u.anchor ? { ...u, anchor: undefined, weight: 1 } : u);
    }
  }
  // the weeks between the anchors
  let s = 0;
  for (const w of teaching) {
    if (anchored[s] && w.n === anchored[s].week.n) {
      s++;
      continue;
    }
    slots[s].weeks.push(w);
  }
  const out: { unit: ThematicUnit[]; weeks: SchoolWeek[] }[] = [];
  slots.forEach((slot, i) => {
    // weeks with no unit before an anchor go to the anchored unit's neighbour… or, if none, to the anchored unit itself
    if (!slot.units.length && slot.weeks.length) {
      const target = i > 0 ? anchored[i - 1] : anchored[i];
      if (target) {
        out.push({ unit: [target.unit], weeks: slot.weeks });
        return;
      }
    }
    out.push(...share(slot.units, slot.weeks));
    if (anchored[i]) out.push({ unit: [anchored[i].unit], weeks: [anchored[i].week] });
  });
  // merge consecutive pieces of the same unit (an anchored unit that took the weeks around it)
  const merged: typeof out = [];
  for (const piece of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.unit.length === 1 && piece.unit.length === 1 && prev.unit[0].id === piece.unit[0].id) prev.weeks.push(...piece.weeks);
    else merged.push({ unit: piece.unit, weeks: [...piece.weeks] });
  }
  return merged.map((m) => ({ ...m, weeks: m.weeks.sort((a, b) => a.n - b.n) }));
}

// ── notes ────────────────────────────────────────────────────────────────────────────────────────

/** What the „Observații” cell says by itself: holidays, short weeks, programme weeks in between, the module's end. */
export function autoNotes(weeks: number[], all: SchoolWeek[], opts: { moduleEnd?: boolean } = {}): string {
  const notes: string[] = [];
  const mine = all.filter((w) => weeks.includes(w.n));
  for (const w of mine) {
    for (const h of w.holidays) notes.push(`${dayLabel(h.date)} (${weekdayName(h.date)}): ${h.name}, fără cursuri`);
    if (w.short) notes.push(`${rangeLabel(w.first, w.last)}: săptămână de ${w.days.length} zile`);
  }
  if (mine.length > 1) {
    const between = all.filter((w) => w.n > mine[0].n && w.n < mine[mine.length - 1].n && !weeks.includes(w.n) && w.program);
    for (const w of between) notes.push(`S${w.n}: ${PROGRAMS.find((p) => p.id === w.program)?.title}`);
  }
  if (opts.moduleEnd) notes.push('La final de modul: recapitulare și evaluare');
  return notes.join('\n');
}

const isModuleEnd = (row: PlanRow, rows: PlanRow[]) => {
  if (row.kind === 'program' || row.module === 5) return false;
  const units = rows.filter((r) => r.module === row.module && r.kind !== 'program');
  return units[units.length - 1]?.id === row.id;
};

function refreshRow(row: PlanRow, plan: Pick<Plan, 'weeks' | 'hoursPerWeek' | 'rows'>): PlanRow {
  if (row.kind === 'program') return row;
  return {
    ...row,
    hours: row.hoursEdited ? row.hours : row.weeks.length * plan.hoursPerWeek,
    notes: row.notesEdited ? row.notes : autoNotes(row.weeks, plan.weeks, { moduleEnd: isModuleEnd(row, plan.rows) }),
  };
}

// ── the plan ─────────────────────────────────────────────────────────────────────────────────────

export function defaultHours(subject: SubjectId, level: PlanLevel): number {
  return planSubject(subject).hours[level];
}

export function buildPlan(opts: PlanOptions): Plan {
  const { level, subject } = opts;
  const hoursPerWeek = clampHours(opts.hoursPerWeek ?? defaultHours(subject, level));
  const february = opts.february ?? DEFAULT_FEBRUARY_OPTION;
  const programs: Record<ProgramId, string | null> = { ...DEFAULT_PROGRAM_WEEKS, ...opts.programs };
  const { weeks, ignored } = schoolWeeks({ february, programs });
  const programme = planSubject(subject).programme;
  const order = competencesFor(programme, level).map((c) => c.code);
  const sortCodes = (codes: string[]) => (codes.includes(ALL_CODES) ? order : order.filter((c) => codes.includes(c)));

  const rows: PlanRow[] = [];
  for (const mod of [1, 2, 3, 4, 5]) {
    const inModule = weeks.filter((w) => w.module === mod);
    for (const w of inModule.filter((x) => x.program)) {
      const title = PROGRAMS.find((p) => p.id === w.program)!.title;
      rows.push({
        id: `program-${w.program}`, kind: 'program', module: mod, title, codes: [], weeks: [w.n], hours: 0, sheets: [],
        contents: ['Program stabilit de școală: activități educative extracurriculare și extrașcolare'],
        notes: 'Săptămâna din graficul școlii; fără ore din planificare',
      });
    }
    for (const piece of moduleSlots(mod, inModule.filter((w) => !w.program))) {
      const units = piece.unit;
      const plans = units.map((u) => UNIT_PLANS[subject][level][u.id]);
      const codes = sortCodes(plans.flatMap((p) => p.codes));
      const contents = [...new Set(plans.flatMap((p) => p.text ?? contentLines(subject, level, p.contents)))];
      const recap = units.every((u) => u.recap && UNIT_PLANS[subject][level][u.id].text);
      rows.push({
        id: units.map((u) => u.id).join('+'),
        kind: recap ? 'recap' : 'unit',
        module: mod,
        title: units.map((u) => u.title(level)).join(' / '),
        codes,
        contents,
        weeks: piece.weeks.map((w) => w.n),
        hours: 0,
        sheets: [...new Set(plans.flatMap((p) => unitSheets(p.sheets, subject, level, codes)))],
        notes: '',
      });
    }
  }
  rows.sort((a, b) => a.weeks[0] - b.weeks[0]);
  const plan: Plan = { level, subject, hoursPerWeek, february, programs, weeks, rows, ignored };
  plan.rows = rows.map((r) => refreshRow(r, plan));
  return plan;
}

// ── edits ────────────────────────────────────────────────────────────────────────────────────────

/** The unit rows of the same module, in order (programme rows are fixed). */
const moduleUnits = (plan: Plan, module: number) => plan.rows.filter((r) => r.module === module && r.kind !== 'program');

/**
 * One week more (+1) or less (−1) for a unit, taken from / given to its neighbour in the module
 * (the next unit; the previous one for the module's last unit, or when the next has one week left). Every unit keeps at least one
 * week and every week stays in exactly one row. Returns the same plan when the move is not possible.
 */
export function shiftWeek(plan: Plan, rowId: string, delta: 1 | -1): Plan {
  const row = plan.rows.find((r) => r.id === rowId);
  if (!row || row.kind === 'program') return plan;
  const units = moduleUnits(plan, row.module);
  const i = units.findIndex((r) => r.id === rowId);
  const next = units[i + 1];
  const prev = units[i - 1];
  // taking: from the next unit, or from the previous one when the next has a single week
  const neighbour = delta > 0 ? [next, prev].find((n) => n && n.weeks.length > 1) : next ?? prev;
  if (!neighbour) return plan;
  const giver = delta > 0 ? neighbour : row;
  const taker = delta > 0 ? row : neighbour;
  if (giver.weeks.length <= 1) return plan;
  // the week at the boundary between them
  const giverIsLater = giver.weeks[0] > taker.weeks[0];
  const moved = giverIsLater ? giver.weeks[0] : giver.weeks[giver.weeks.length - 1];
  const rows = plan.rows.map((r) => {
    if (r.id === giver.id) return { ...r, weeks: r.weeks.filter((w) => w !== moved) };
    if (r.id === taker.id) return { ...r, weeks: [...r.weeks, moved].sort((a, b) => a - b) };
    return r;
  });
  const out = { ...plan, rows };
  out.rows = rows.map((r) => (r.id === giver.id || r.id === taker.id ? refreshRow(r, out) : r));
  return out;
}

/** New hours per week: every unit whose hours were not typed by hand follows. */
export function setHoursPerWeek(plan: Plan, hours: number): Plan {
  const out = { ...plan, hoursPerWeek: clampHours(hours) };
  out.rows = plan.rows.map((r) => refreshRow(r, out));
  return out;
}

export type RowPatch = Partial<Pick<PlanRow, 'title' | 'codes' | 'contents' | 'hours' | 'notes'>>;

export function updateRow(plan: Plan, rowId: string, patch: RowPatch): Plan {
  return {
    ...plan,
    rows: plan.rows.map((r) =>
      r.id !== rowId
        ? r
        : {
            ...r,
            ...patch,
            ...(patch.hours !== undefined ? { hours: Math.max(0, Math.min(500, Math.round(patch.hours) || 0)), hoursEdited: true } : {}),
            ...(patch.notes !== undefined ? { notesEdited: true } : {}),
          },
    ),
  };
}

/** Restore a unit's automatic hours and notes. */
export function resetRow(plan: Plan, rowId: string): Plan {
  const out = { ...plan };
  out.rows = plan.rows.map((r) => (r.id === rowId ? refreshRow({ ...r, hoursEdited: false, notesEdited: false }, out) : r));
  return out;
}

// ── labels ───────────────────────────────────────────────────────────────────────────────────────

/** „S1–S2”, „S5, S7–S8” */
export function weekNumbers(weeks: number[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < weeks.length) {
    let j = i;
    while (j + 1 < weeks.length && weeks[j + 1] === weeks[j] + 1) j++;
    parts.push(i === j ? `S${weeks[i]}` : `S${weeks[i]}–S${weeks[j]}`);
    i = j + 1;
  }
  return parts.join(', ');
}

/** „7–18 septembrie” for the row's weeks (first day of courses to the last). */
export function periodLabel(weeks: number[], all: SchoolWeek[]): string {
  const mine = all.filter((w) => weeks.includes(w.n));
  if (!mine.length) return '';
  return rangeLabel(mine[0].first, mine[mine.length - 1].last);
}

/** The rows of some modules only (the free download is the first module). */
export function onlyModules(plan: Plan, modules: number[]): Plan {
  return { ...plan, rows: plan.rows.filter((r) => modules.includes(r.module)) };
}

/** Sanity checks used by the tests and by the page before a download. */
export function planProblems(plan: Plan): string[] {
  const problems: string[] = [];
  const seen = new Map<number, string>();
  for (const r of plan.rows) {
    if (!r.weeks.length) problems.push(`${r.title}: nicio săptămână`);
    for (const w of r.weeks) {
      if (seen.has(w)) problems.push(`S${w} apare de două ori (${seen.get(w)}, ${r.title})`);
      seen.set(w, r.title);
    }
  }
  return problems;
}

export type { UnitId };
