/**
 * Which curriculum competences a sheet practises, for the class the teacher picks.
 *
 * The mapping is deliberately conservative: a sheet gets a code only when the official text
 * of the competence plainly describes what the child does on it. When nothing fits (print
 * letters in clasa a II-a, numbers beyond 0–31 in clasa pregătitoare…) the sheet gets no
 * label at all rather than a loose one — a wrong code on a teacher's sheet is worse than none.
 */
import type { WorksheetConfig } from '@/types';
import { findCompetence, type CompetenceRef, type Level, type ProgrammeId } from './index';

/** The class picked in the generator. "presc" = grădiniță. */
export type SchoolLevel = 'presc' | 'CP' | 'I' | 'II';

export const SCHOOL_LEVELS: { id: SchoolLevel; label: string }[] = [
  { id: 'presc', label: 'Grădiniță' },
  { id: 'CP', label: 'Clasa pregătitoare' },
  { id: 'I', label: 'Clasa I' },
  { id: 'II', label: 'Clasa a II-a' },
];

const CLR = 'clr-p-ii' as const;
const MEM = 'mem-p-ii' as const;

function school(programme: ProgrammeId, level: Exclude<SchoolLevel, 'presc'>, code: string): CompetenceRef {
  return { programme, level, code };
}
function presc(domain: 'D' | 'E', code: string): CompetenceRef {
  return { programme: 'et-presc', level: '3-6', domain, code };
}

type Rule = Partial<Record<SchoolLevel, CompetenceRef | null>>;

/** Tracing letters, words and names. */
function lettersRule(config: WorksheetConfig, level: SchoolLevel): CompetenceRef | null {
  const cursive = config.script === 'cursive' || config.fontStyle === 'cursive';
  const hasWords = (config.customWords ?? []).length > 0;
  if (level === 'presc') return cursive ? null : presc('D', '3.4');
  if (level === 'CP') return school(CLR, 'CP', '4.1'); // „Trasarea elementelor grafice și a contururilor literelor”
  if (level === 'I') return cursive ? school(CLR, 'I', '4.1') : null; // „Scrierea literelor de mână”
  return cursive && hasWords ? school(CLR, 'II', '4.1') : null; // „Scrierea unor mesaje…”
}

const RULES: Record<string, Rule> = {
  numbers: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.1'), I: school(MEM, 'I', '1.1'), II: school(MEM, 'II', '1.1') },
  shapes: { presc: presc('E', '2.3'), CP: school(MEM, 'CP', '2.2'), I: school(MEM, 'I', '2.2') },
  prewrite: { presc: presc('D', '3.4'), CP: school(CLR, 'CP', '4.1') },
  // math exercises
  cmp: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.2'), I: school(MEM, 'I', '1.2'), II: school(MEM, 'II', '1.2') },
  add: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  sub: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  mix: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  addpic: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4') },
  missing: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.6'), II: school(MEM, 'II', '1.4') },
  seq: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.3'), I: school(MEM, 'I', '1.3'), II: school(MEM, 'II', '1.3') },
  nbr: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.3'), I: school(MEM, 'I', '1.3'), II: school(MEM, 'II', '1.3') },
  // games
  find: { presc: presc('D', '3.2') },
  count: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.1') },
  dots: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.3') },
};

/** The largest number each class works with, per the programme's contents. */
const NUMBER_LIMIT: Record<SchoolLevel, number> = { presc: 10, CP: 31, I: 100, II: 1000 };

function ruleKeys(config: WorksheetConfig): string[] {
  if (config.category === 'math') return config.selectedItems;
  if (config.category === 'games') return config.selectedItems.map((i) => i.split(':')[0]);
  return [config.category];
}

/**
 * The competences of this sheet for the given class: unique, all from one programme, all
 * existing in the programme data. Empty when nothing fits.
 */
export function sheetCompetences(config: WorksheetConfig, level: SchoolLevel | undefined | null): CompetenceRef[] {
  if (!level) return [];
  if (config.category === 'math' && (config.mathRange ?? 10) > NUMBER_LIMIT[level]) return [];
  const refs: CompetenceRef[] = [];
  if (config.category === 'letters') {
    const r = lettersRule(config, level);
    if (r) refs.push(r);
  } else {
    for (const key of ruleKeys(config)) {
      const r = RULES[key]?.[level];
      if (r) refs.push(r);
    }
  }
  const seen = new Set<string>();
  const unique = refs.filter((r) => {
    const k = `${r.programme}|${r.domain ?? ''}|${r.code}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return Boolean(findCompetence(r));
  });
  // one programme per label: keep the programme of the first match
  return unique.filter((r) => r.programme === unique[0]?.programme).sort((a, b) => `${a.domain ?? ''}${a.code}`.localeCompare(`${b.domain ?? ''}${b.code}`, 'ro', { numeric: true }));
}

const SUBJECT: Record<ProgrammeId, string> = {
  'et-presc': 'Educație timpurie',
  'clr-p-ii': 'Comunicare în limba română',
  'mem-p-ii': 'Matematică și explorarea mediului',
  'llr-iii-iv': 'Limba și literatura română',
  'mate-iii-iv': 'Matematică',
};
const LEVEL_NAME: Record<Level, string> = {
  '3-6': 'nivel preșcolar',
  CP: 'clasa pregătitoare',
  I: 'clasa I',
  II: 'clasa a II-a',
  III: 'clasa a III-a',
  IV: 'clasa a IV-a',
};

/**
 * The line printed on the sheet: „Competența 4.1 · Comunicare în limba română, clasa pregătitoare”,
 * „Competențele 1.2, 1.4 · …”, „Comportament D 3.4 · Educație timpurie, nivel preșcolar”. Null when nothing fits.
 */
export function sheetCompetenceLabel(config: WorksheetConfig, level: SchoolLevel | undefined | null): string | null {
  const refs = sheetCompetences(config, level);
  if (!refs.length) return null;
  const first = refs[0];
  const where = `${SUBJECT[first.programme]}, ${LEVEL_NAME[first.level]}`;
  if (first.programme === 'et-presc') {
    const codes = refs.map((r) => `${r.domain} ${r.code}`).join(', ');
    return `${refs.length === 1 ? 'Comportament' : 'Comportamente'} ${codes} · ${where}`;
  }
  const codes = refs.map((r) => r.code).join(', ');
  return `${refs.length === 1 ? 'Competența' : 'Competențele'} ${codes} · ${where}`;
}
