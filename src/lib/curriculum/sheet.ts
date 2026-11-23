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

type Rule = Partial<Record<SchoolLevel, CompetenceRef | CompetenceRef[] | null>>;

/** Tracing letters, words and names. */
function lettersRule(config: WorksheetConfig, level: SchoolLevel): CompetenceRef | null {
  const cursive = config.script === 'cursive' || config.fontStyle === 'cursive';
  if (level === 'presc') return cursive ? null : presc('D', '3.4');
  // CP traces print letters („Desenarea literelor de tipar”); handwriting letters start in clasa I
  if (level === 'CP') return cursive ? null : school(CLR, 'CP', '4.1'); // „Trasarea elementelor grafice și a contururilor literelor”
  if (level === 'I') return cursive ? school(CLR, 'I', '4.1') : null; // „Scrierea literelor de mână”
  // clasa a II-a: „Scrierea unor mesaje” — a traced word or name is not a message, so no code
  return null;
}

const RULES: Record<string, Rule> = {
  // digits 0–9 are below clasa a II-a („numerelor până la 1000”)
  numbers: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.1'), I: school(MEM, 'I', '1.1') },
  // E 2.2 „…informații despre mărime, formă…”; CP/I 2.2 name only pătrat, triunghi, dreptunghi, cerc (see BASIC_SHAPES)
  shapes: { presc: presc('E', '2.2'), CP: school(MEM, 'CP', '2.2'), I: school(MEM, 'I', '2.2') },
  prewrite: { presc: presc('D', '3.4'), CP: school(CLR, 'CP', '4.1') },
  // math exercises
  // the signs <, >, = belong to school (MEM I 1.6), not to preschool
  cmp: { CP: school(MEM, 'CP', '1.2'), I: school(MEM, 'I', '1.2'), II: school(MEM, 'II', '1.2') },
  add: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  sub: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  mix: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  addpic: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4') },
  missing: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  seq: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.3'), I: school(MEM, 'I', '1.3'), II: school(MEM, 'II', '1.3') },
  nbr: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.3'), I: school(MEM, 'I', '1.3'), II: school(MEM, 'II', '1.3') },
  // „Bani”: count, compare, pay, exchange notes of 1, 5, 10 (and 50) lei.
  // CP 6.3 „Realizarea unor schimburi echivalente valoric folosind reprezentări neconvenționale în
  // probleme-joc simple de tip venituri-cheltuieli, cu numere din concentrul 0-31” (contents: „Leul
  // (bancnotele de 1 leu, 5 lei, 10 lei)”); I 6.3 the same „…cu numere din concentrul 0-100”.
  // Clasa a II-a works with 200 and 500 de lei and euro, which the sheet does not draw: no code.
  money: { CP: school(MEM, 'CP', '6.3'), I: school(MEM, 'I', '6.3') },
  // games
  // finding a letter is not phonetic (D 3.2): it is an element of writing (D 3.4)
  find: { presc: presc('D', '3.4') },
  count: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.1') },
  // the dot pictures go past 10 dots: beyond preschool counting
  dots: { CP: school(MEM, 'CP', '1.3') },
  // „Sunete și silabe” (phonology-pages.ts): the child names the picture and listens to it.
  // D 3.2 „Discriminează/diferențiează fonetic cuvinte, silabe, sunete și asociază sunete cu litere”;
  // CLR CP 1.3 „Identificarea sunetului inițial și/ sau final dintr-un cuvânt, a silabelor și a cuvintelor
  // din propoziții rostite clar și rar”; CLR I 1.3 „Identificarea unor sunete, silabe, cuvinte în enunțuri
  // rostite cu claritate”. Not CP 4.1: tracing a syllable is not „trasarea elementelor grafice” as such.
  sound: { presc: presc('D', '3.2'), CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  first: { presc: presc('D', '3.2'), CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  syl: { presc: presc('D', '3.2'), CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  // writing the syllables is school work, not preschool
  split: { CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  // Sorting, grouping, orientation (sorting-pages.ts).
  // E 2.4 „Efectuează operații de seriere, grupare, clasificare, măsurare a obiectelor”; MEM CP 5.1
  // „Sortarea/clasificarea unor obiecte/ materiale etc., pe baza unui criteriu dat” (the group boxes give
  // the criterion). Not I 5.1 („…pe baza a două criterii”): every sheet sorts by one criterion.
  sort: { presc: presc('E', '2.4'), CP: school(MEM, 'CP', '5.1') },
  // the odd one out is classifying (E 2.4), but the criterion is not given: not CP 5.1 „…criteriu dat”
  odd: { presc: presc('E', '2.4') },
  // counting each kind (E 2.1, CP 1.1 „Recunoașterea și scrierea numerelor în concentrul 0-31”) after
  // grouping the pictures by kind (E 2.4, CP 5.1); counts of 2–8 are below clasa I / a II-a
  group: { presc: [presc('E', '2.1'), presc('E', '2.4')], CP: [school(MEM, 'CP', '1.1'), school(MEM, 'CP', '5.1')] },
  // MEM 2.1 CP „Orientarea și mișcarea în spațiu în raport cu repere/direcții precizate, folosind sintagme de
  // tipul: în, pe, deasupra, dedesubt, lângă, în fața, în spatele, sus, jos, stânga, dreapta…”, I „…în raport
  // cu repere/direcții date…”. Not II 2.1 (coordinates in a reference system), nor a preschool behaviour
  // (A 2.2 „Se orientează în spațiu pe baza simțurilor” is about the senses, not a worksheet).
  pos: { CP: school(MEM, 'CP', '2.1'), I: school(MEM, 'I', '2.1') },
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
/** The four plane shapes the programme names for CP and clasa I. */
const BASIC_SHAPES = new Set(['circle', 'square', 'triangle', 'rectangle']);
/** CP additions and subtractions add or take away 1–5 elements: only the 0–10 sheets fit. */
const CP_OPERATIONS = new Set(['add', 'sub', 'mix', 'addpic', 'missing']);

export function sheetCompetences(config: WorksheetConfig, level: SchoolLevel | undefined | null): CompetenceRef[] {
  if (!level) return [];
  if (config.category === 'math' && (config.mathRange ?? 10) > NUMBER_LIMIT[level]) return [];
  if (config.category === 'shapes' && level !== 'presc' && !config.selectedItems.every((s) => BASIC_SHAPES.has(s))) return [];
  const refs: CompetenceRef[] = [];
  if (config.category === 'letters') {
    const r = lettersRule(config, level);
    if (r) refs.push(r);
  } else {
    for (const key of ruleKeys(config)) {
      // …except 0–31, where one term is always 1–5 (math.ts): CP 1.4 „Efectuarea de adunări și
      // scăderi în concentrul 0-31, prin adăugarea /extragerea a 1-5 elemente dintr-o mulțime dată”
      const cpOperations31 = level === 'CP' && config.mathRange === 31;
      if (level === 'CP' && CP_OPERATIONS.has(key) && (config.mathRange ?? 10) > 10 && !cpOperations31) continue;
      const r = RULES[key]?.[level];
      if (r) refs.push(...(Array.isArray(r) ? r : [r]));
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
  'et-presc': 'Curriculum pentru educație timpurie',
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
 * The line printed on the sheet: „Competența specifică 4.1 · Comunicare în limba română, clasa pregătitoare”,
 * „Competențele specifice 1.2, 1.4 · …”, „Comportament vizat D.3.4 · Curriculum pentru educație timpurie,
 * nivel preșcolar”. Null when nothing fits.
 */
export function sheetCompetenceLabel(config: WorksheetConfig, level: SchoolLevel | undefined | null): string | null {
  const refs = sheetCompetences(config, level);
  if (!refs.length) return null;
  const first = refs[0];
  const where = `${SUBJECT[first.programme]}, ${LEVEL_NAME[first.level]}`;
  if (first.programme === 'et-presc') {
    // as teachers write it in their plans: „Comportament vizat D.3.4”
    const codes = refs.map((r) => `${r.domain}.${r.code}`).join(', ');
    return `${refs.length === 1 ? 'Comportament vizat' : 'Comportamente vizate'} ${codes} · ${where}`;
  }
  // „specifică”: never mistaken for general competence 4
  const codes = refs.map((r) => r.code).join(', ');
  return `${refs.length === 1 ? 'Competența specifică' : 'Competențele specifice'} ${codes} · ${where}`;
}
