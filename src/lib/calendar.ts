/**
 * A suggested plan for the school year: one theme and up to two letters per week.
 * The first two weeks are for the child's name and getting used to the pencil; the
 * letters then follow the usual order of a Romanian primer (M, A, N, U, E, I, R, C, O, L …),
 * and the second half of the year revisits them in pairs.
 *
 * It is a suggestion, not the curriculum: the teacher can always pick another week.
 */
export interface PlanWeek {
  week: number;
  themeId: string;
  letters: string[];
}

export const LETTER_ORDER = ['M', 'A', 'N', 'U', 'E', 'I', 'R', 'C', 'O', 'L', 'Ă', 'S', 'T', 'Î', 'Â', 'P', 'Ș', 'Ț', 'D', 'V', 'B', 'F', 'Z', 'G', 'J', 'H', 'X', 'K', 'Q', 'W', 'Y'];

export const WEEKS_IN_YEAR = 34;

/** Monday of the first school week (2026–2027). */
export const SCHOOL_YEAR_START = '2026-09-07';

const THEME_BY_TERM: string[][] = [
  ['familia', 'toamna', 'fructe-legume', 'animale-domestice'], // weeks 1–12: autumn
  ['iarna', 'animale-salbatice', 'familia', 'mijloace-de-transport'], // weeks 13–24: winter
  ['primavara', 'animale-domestice', 'fructe-legume', 'mijloace-de-transport'], // weeks 25–34: spring
];

function pairs(): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < LETTER_ORDER.length; i += 2) out.push(LETTER_ORDER.slice(i, i + 2));
  return out;
}

export const SCHOOL_YEAR: PlanWeek[] = (() => {
  const p = pairs(); // 16 pairs, the last one is just "Y"
  const weeks: PlanWeek[] = [];
  for (let w = 1; w <= WEEKS_IN_YEAR; w++) {
    const term = w <= 12 ? 0 : w <= 24 ? 1 : 2;
    const themes = THEME_BY_TERM[term];
    const themeId = w <= 2 ? 'familia' : themes[(w - 1) % themes.length];
    // weeks 1–2: no letters; 3–18: new letters; 19–34: the same pairs again, for practice
    const letters = w <= 2 ? [] : p[(w - 3) % p.length];
    weeks.push({ week: w, themeId, letters });
  }
  return weeks;
})();

/** Which plan week a date falls in (1 … 34), or null outside the school year. */
export function weekOfSchoolYear(date: Date, start = SCHOOL_YEAR_START): number | null {
  const s = new Date(`${start}T00:00:00`);
  const days = Math.floor((date.getTime() - s.getTime()) / 86_400_000);
  if (days < 0) return null;
  const w = Math.floor(days / 7) + 1;
  return w <= WEEKS_IN_YEAR ? w : null;
}

/** "7–11 septembrie" for a plan week. */
export function weekLabel(week: number, start = SCHOOL_YEAR_START): string {
  const s = new Date(`${start}T00:00:00`);
  const mon = new Date(s.getTime() + (week - 1) * 7 * 86_400_000);
  const fri = new Date(mon.getTime() + 4 * 86_400_000);
  const month = (d: Date) => d.toLocaleDateString('ro-RO', { month: 'long' });
  return month(mon) === month(fri)
    ? `${mon.getDate()}–${fri.getDate()} ${month(fri)}`
    : `${mon.getDate()} ${month(mon)} – ${fri.getDate()} ${month(fri)}`;
}
