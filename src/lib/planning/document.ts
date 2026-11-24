/**
 * The plan as a document: header fields, the table (one section per module, with the vacation
 * after it) and the note. The Word file and the PDF are both drawn from this, so they say the same.
 *
 * The teacher's name and school are only used here, in the browser, to fill the header: they are
 * never sent anywhere.
 */
import { PROGRAMMES } from '@/lib/curriculum';
import { presetById } from '@/lib/curriculum/presets';
import { rangeLabel } from './calendar';
import { periodLabel, weekNumbers, type Plan, type PlanRow } from './plan';
import { SCHOOL_YEAR_LABEL, SCHOOL_YEAR_ORDER, courseIntervals, vacationAfter } from './school-year-2026-2027';
import { HOURS_SOURCE, planLevel, planSubject } from './subjects';

export interface PlanMeta {
  school?: string;
  teacher?: string;
  /** add the „Fișe WorksheetWiz” column */
  withSheets?: boolean;
  /** the free download: only these modules, with a line saying so */
  modules?: number[];
}

export interface DocCell {
  lines: string[];
  bold?: boolean;
  align?: 'left' | 'center';
}

export interface DocSection {
  /** „MODULUL 1 · 7 septembrie – 23 octombrie 2026 · 7 săptămâni” */
  title: string;
  rows: DocCell[][];
  /** the vacation after the module */
  after?: string;
}

export interface PlanDocument {
  title: string;
  /** left block of the header */
  fields: { label: string; value: string }[];
  /** right block: the approvals, always blank lines to sign */
  approvals: string[];
  columns: { title: string; /** share of the table's width */ width: number; align?: 'left' | 'center' }[];
  sections: DocSection[];
  /** printed under the table */
  note: string[];
  /** short line in each page's footer */
  footer: string;
  /** set on the free download */
  partial?: string;
}

const COLUMNS = [
  { title: 'Nr. crt.', width: 9, align: 'center' as const },
  { title: 'Unitatea de învățare', width: 40 },
  { title: 'Competențe specifice', width: 24, align: 'center' as const },
  { title: 'Conținuturi', width: 96 },
  { title: 'Nr. ore', width: 12, align: 'center' as const },
  { title: 'Săptămâna', width: 34, align: 'center' as const },
  { title: 'Observații', width: 58 },
];
const SHEETS_COLUMN = { title: 'Fișe WorksheetWiz', width: 40 };

export function noteLines(plan: Pick<Plan, 'subject'>): string[] {
  const p = PROGRAMMES[planSubject(plan.subject).programme];
  return [
    `Propunere orientativă, generată cu WorksheetWiz pe baza programei școlare pentru disciplina ${p.subject} (${p.order.replace(/^Anexa nr\. 2 la ordinul ministrului educației naționale nr\. /, 'OMEN nr. ')}), a planului-cadru (${HOURS_SOURCE.replace(/^.*, /, '')}) și a structurii anului școlar ${SCHOOL_YEAR_LABEL} (${SCHOOL_YEAR_ORDER}).`,
    'Nu este un document aprobat de Ministerul Educației. Cadrul didactic o adaptează clasei: ordinea și durata unităților, competențele și conținuturile, săptămânile „Școala altfel” și „Săptămâna verde” din graficul școlii, vacanța din februarie stabilită de inspectoratul școlar județean și numărul de ore.',
  ];
}

const codesText = (row: PlanRow) => row.codes.join(', ');

export function planDocument(plan: Plan, meta: PlanMeta = {}): PlanDocument {
  const subject = planSubject(plan.subject);
  const level = planLevel(plan.level);
  const withSheets = !!meta.withSheets;
  const columns = withSheets
    ? [...COLUMNS.slice(0, 3), { ...COLUMNS[3], width: 80 }, COLUMNS[4], { ...COLUMNS[5], width: 31 }, { ...COLUMNS[6], width: 42 }, SHEETS_COLUMN]
    : COLUMNS;
  const modules = meta.modules ?? [1, 2, 3, 4, 5];
  const intervals = courseIntervals(plan.february);

  let nr = 0;
  const sections: DocSection[] = [];
  for (const iv of intervals.filter((i) => modules.includes(i.module))) {
    const weeks = plan.weeks.filter((w) => w.module === iv.module).length;
    const rows = plan.rows.filter((r) => r.module === iv.module);
    sections.push({
      title: `MODULUL ${iv.module} · ${rangeLabel(iv.start, iv.end, true)} · ${weeks} ${weeks === 1 ? 'săptămână' : 'săptămâni'}`,
      rows: rows.map((r) => {
        const program = r.kind === 'program';
        const cells: DocCell[] = [
          { lines: [program ? '–' : String(++nr)], align: 'center' },
          { lines: [r.title], bold: true },
          { lines: [program ? '–' : codesText(r)], align: 'center' },
          { lines: r.contents.map((c) => (program ? c : `• ${c}`)) },
          { lines: [program ? '–' : String(r.hours)], align: 'center' },
          { lines: [weekNumbers(r.weeks), periodLabel(r.weeks, plan.weeks)], align: 'center' },
          { lines: r.notes ? r.notes.split('\n').filter((l) => l.trim()) : [''] },
        ];
        if (withSheets) cells.push({ lines: r.sheets.map((id) => presetById(id)?.title).filter((t): t is string => !!t) });
        return cells;
      }),
      after: vacationAfter(iv.module, plan.february) ?? undefined,
    });
  }

  const hoursTotal = plan.rows.filter((r) => modules.includes(r.module)).reduce((s, r) => s + r.hours, 0);
  return {
    title: 'PLANIFICARE CALENDARISTICĂ',
    fields: [
      { label: 'Unitatea de învățământ', value: meta.school?.trim() ?? '' },
      { label: 'Cadrul didactic', value: meta.teacher?.trim() ?? '' },
      { label: 'Clasa', value: level.name },
      { label: 'Disciplina', value: subject.title },
      { label: 'An școlar', value: SCHOOL_YEAR_LABEL },
      { label: 'Nr. ore/săptămână', value: String(plan.hoursPerWeek) },
      { label: 'Total ore', value: String(hoursTotal) },
    ],
    approvals: ['Avizat director', 'Avizat responsabil comisie metodică / șef de catedră'],
    columns,
    sections,
    note: noteLines(plan),
    footer: `Propunere orientativă pe baza programei școlare; se adaptează de cadrul didactic · ${subject.title}, clasa ${level.name}, ${SCHOOL_YEAR_LABEL}`,
    partial: meta.modules && meta.modules.length < 5 ? 'Varianta gratuită: primul modul. Planificarea pe tot anul, în PDF și Word, este în varianta completă WorksheetWiz.' : undefined,
  };
}

/** A file name without diacritics: planificare-clr-clasa-II-2026-2027 */
export function planFilename(plan: Pick<Plan, 'subject' | 'level'>, ext: 'pdf' | 'docx', partial = false): string {
  return `planificare-${plan.subject}-clasa-${plan.level}-2026-2027${partial ? '-modulul-1' : ''}.${ext}`;
}
