/**
 * The structure of school year 2026–2027, as the planner uses it. ONE FILE TO CORRECT if the
 * ministry changes the calendar: every date of the „Planificare calendaristică” comes from here.
 *
 * Source: Ordinul ministrului educației și cercetării nr. 3.194/09.02.2026 privind structura anului
 * școlar 2026–2027, publicat în Monitorul Oficial nr. 126 din 16.02.2026, Partea I.
 *   - text of the order (copy published by ISJ Vrancea):
 *     https://isjvrancea.ro/wp-content/uploads/2026/02/ORDIN-nr.-3.194-din-2026-structua-an-sc.-26-27.pdf
 *   - ministry press release (12.02.2026): https://edu.ro/press_rel_10_2026
 *   (read 24.11.2026; no amending order found)
 *
 * What the order says (Art. 1–4):
 *   - 36 weeks of courses for the primary classes, 7 September 2026 – 18 June 2027;
 *   - five course intervals (teachers call them „module”), with the vacations between them;
 *   - intervals 3 and 4 are split by one vacation week that each county inspectorate (ISJ / ISMB)
 *     chooses between 15 February and 7 March 2027 — three possible weeks (FEBRUARY_OPTIONS);
 *   - 5 October (Ziua Internațională a Educației) and the legal holidays have no classes;
 *   - „Școala altfel” and „Săptămâna verde”: 5 consecutive working days each, between 7 September
 *     2026 and 23 April 2027, in different course intervals; each school chooses its weeks.
 *
 * The legal holidays that fall on a school day (Codul muncii, art. 139; 2027 calendar checked on
 * https://observatornews.ro/social/zile-libere-in-2027-cand-pica-sarbatorile-legale-si-cate-minivacante-sunt-665245.html):
 * 30 November 2026 (Monday), 1 December 2026 (Tuesday), 1 June 2027 (Tuesday). The others
 * (1–2 and 6–7 January, 24 January, Good Friday 30 April, 1 May, Easter 2–3 May, Rusalii 20–21 June)
 * fall in a vacation or on a weekend. Other denominations' holidays are not listed: the teacher adds them.
 *
 * Dates are ISO days ("YYYY-MM-DD"), read as calendar days (no time zone).
 */

export const SCHOOL_YEAR_LABEL = '2026–2027';

export const SCHOOL_YEAR_SOURCES = [
  {
    title: 'Ordinul nr. 3.194/09.02.2026 privind structura anului școlar 2026–2027 (M. Of. nr. 126/16.02.2026)',
    url: 'https://isjvrancea.ro/wp-content/uploads/2026/02/ORDIN-nr.-3.194-din-2026-structua-an-sc.-26-27.pdf',
  },
  { title: 'Ministerul Educației și Cercetării – comunicat, 12.02.2026', url: 'https://edu.ro/press_rel_10_2026' },
] as const;

/** The order's short name, as printed in the document's note. */
export const SCHOOL_YEAR_ORDER = 'OMEC nr. 3.194/2026';

export interface CourseInterval {
  /** 1 … 5 */
  module: number;
  start: string;
  end: string;
}

/** The vacation week of February/March, chosen by the county inspectorate. */
export interface FebruaryOption {
  id: 'feb-15' | 'feb-22' | 'mar-01';
  /** e.g. „15–19 februarie 2027” */
  label: string;
  /** last day of course interval 3 */
  module3End: string;
  /** first day of course interval 4 */
  module4Start: string;
}

export const FEBRUARY_OPTIONS: FebruaryOption[] = [
  { id: 'feb-15', label: '15–19 februarie 2027', module3End: '2027-02-12', module4Start: '2027-02-22' },
  { id: 'feb-22', label: '22–26 februarie 2027', module3End: '2027-02-19', module4Start: '2027-03-01' },
  { id: 'mar-01', label: '1–5 martie 2027', module3End: '2027-02-26', module4Start: '2027-03-08' },
];

export const DEFAULT_FEBRUARY_OPTION: FebruaryOption['id'] = 'feb-15';

/** The five course intervals for a February choice (Art. 2 (1) a). */
export function courseIntervals(february: FebruaryOption['id'] = DEFAULT_FEBRUARY_OPTION): CourseInterval[] {
  const f = FEBRUARY_OPTIONS.find((o) => o.id === february) ?? FEBRUARY_OPTIONS[0];
  return [
    { module: 1, start: '2026-09-07', end: '2026-10-23' },
    { module: 2, start: '2026-11-02', end: '2026-12-22' },
    { module: 3, start: '2027-01-11', end: f.module3End },
    { module: 4, start: f.module4Start, end: '2027-04-23' },
    { module: 5, start: '2027-05-05', end: '2027-06-18' },
  ];
}

/** The vacation after each module (Art. 2 (1) b), as printed between the modules. */
export function vacationAfter(module: number, february: FebruaryOption['id'] = DEFAULT_FEBRUARY_OPTION): string | null {
  const f = FEBRUARY_OPTIONS.find((o) => o.id === february) ?? FEBRUARY_OPTIONS[0];
  switch (module) {
    case 1: return 'Vacanță: 24 octombrie – 1 noiembrie 2026';
    case 2: return 'Vacanța de iarnă: 23 decembrie 2026 – 10 ianuarie 2027';
    case 3: return `Vacanța de schi (stabilită de inspectorat): ${f.label}`;
    case 4: return 'Vacanța de primăvară: 24 aprilie – 4 mai 2027';
    case 5: return 'Vacanța de vară: 19 iunie – 5 septembrie 2027';
    default: return null;
  }
}

/** School days without classes inside the course intervals (Art. 3). */
export const FREE_DAYS: { date: string; name: string }[] = [
  { date: '2026-10-05', name: 'Ziua Internațională a Educației' },
  { date: '2026-11-30', name: 'Sfântul Andrei' },
  { date: '2026-12-01', name: 'Ziua Națională a României' },
  { date: '2027-06-01', name: 'Ziua Copilului' },
];

/** „Școala altfel” and „Săptămâna verde” (Art. 4). */
export type ProgramId = 'scoala-altfel' | 'saptamana-verde';

export const PROGRAMS: { id: ProgramId; title: string }[] = [
  { id: 'scoala-altfel', title: 'Școala altfel' },
  { id: 'saptamana-verde', title: 'Săptămâna verde' },
];

/** The window in which the two programmes can be placed. */
export const PROGRAM_WINDOW = { start: '2026-09-07', end: '2027-04-23' } as const;

/**
 * A starting suggestion only (the Monday of the week): every school sets its own weeks, and the
 * page asks the teacher to pick them. Both are full weeks without a holiday, in different modules,
 * whatever the county's February choice.
 */
export const DEFAULT_PROGRAM_WEEKS: Record<ProgramId, string | null> = {
  'saptamana-verde': '2026-10-12',
  'scoala-altfel': '2027-04-12',
};

/** Weeks of courses the order gives the primary classes (Art. 1 (1)); a test checks the calendar adds up to it. */
export const COURSE_WEEKS = 36;
