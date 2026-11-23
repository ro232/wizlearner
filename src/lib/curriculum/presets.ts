/**
 * The sheets the generator can make, as ready-made starting points, and which curriculum
 * competences each one covers in each class. Used by the „Fișe pe programă” pages: for every
 * competence of a class they list the sheets that practise it (computed with the same mapping
 * that prints the code on the sheet, so a page never promises a code the sheet will not print).
 */
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { PROGRAMMES, type CompetenceRef, type ProgrammeId, type SpecificCompetence } from './index';
import { sheetCompetences, type SchoolLevel } from './sheet';

export interface SheetPreset {
  id: string;
  title: string;
  /** One line: what the child does on it. */
  text: string;
  /** The generator settings it opens with (the class is added by the link). */
  config: Partial<WorksheetConfig>;
  /** Only these classes list it (unset: every class whose codes it prints). */
  levels?: SchoolLevel[];
}

/** The free items are used where possible, so anyone can try the sheet straight away. */
export const SHEET_PRESETS: SheetPreset[] = [
  { id: 'litere-tipar', title: 'Litere de tipar de trasat', text: 'Litera, apoi rânduri de urmărit și de scris singur.', config: { category: 'letters', selectedItems: ['A', 'B', 'C'], letterMode: 'uppercase', script: 'print' } },
  { id: 'litere-perechi', title: 'Litere mari și mici de tipar', text: 'Aa, Bb, Cc: litera mare și cea mică pe același rând.', config: { category: 'letters', selectedItems: ['Aa', 'Bb', 'Cc'], letterMode: 'paired', script: 'print' } },
  { id: 'litere-mana', title: 'Litere de mână', text: 'Scrisul de mână de la școală, pe liniatură tip I.', config: { category: 'letters', selectedItems: ['Aa', 'Bb', 'Cc'], letterMode: 'paired', script: 'cursive' } },
  { id: 'grafisme', title: 'Elemente grafice', text: 'Linii, zigzag, valuri: mâna se pregătește pentru litere.', config: { category: 'prewrite', selectedItems: ['vertical', 'zigzag', 'waves'] } },
  { id: 'cifre', title: 'Cifre de trasat', text: 'Cifrele cu ordinea liniilor, de urmărit și de scris.', config: { category: 'numbers', selectedItems: ['1', '2', '3'] } },
  { id: 'forme', title: 'Forme geometrice de trasat', text: 'Cerc, pătrat, triunghi, dreptunghi.', config: { category: 'shapes', selectedItems: ['circle', 'square', 'triangle', 'rectangle'] } },
  { id: 'mate-compara', title: 'Compară numerele', text: 'Pune semnul potrivit: <, > sau =.', config: { category: 'math', selectedItems: ['cmp'] } },
  { id: 'mate-adunari', title: 'Adunări', text: 'Adunări cu rezultatul în concentrul clasei.', config: { category: 'math', selectedItems: ['add'] } },
  { id: 'mate-scaderi', title: 'Scăderi', text: 'Scăderi fără rezultat negativ.', config: { category: 'math', selectedItems: ['sub'] } },
  { id: 'mate-imagini', title: 'Adunări cu imagini', text: 'Numără obiectele desenate și scrie suma.', config: { category: 'math', selectedItems: ['addpic'] } },
  { id: 'mate-lipsa', title: 'Numărul care lipsește', text: 'Află termenul necunoscut.', config: { category: 'math', selectedItems: ['missing'] } },
  { id: 'mate-sir', title: 'Completează șirul', text: 'Numerele în ordine, cu golurile de completat.', config: { category: 'math', selectedItems: ['seq'] } },
  { id: 'mate-vecini', title: 'Vecinii numerelor', text: 'Numărul dinainte și cel de după.', config: { category: 'math', selectedItems: ['nbr'] } },
  { id: 'mate-bani', title: 'Banii', text: 'Numără, compară și schimbă bancnote de 1 leu, 5 lei, 10 lei.', config: { category: 'math', selectedItems: ['money'] } },
  { id: 'mate-probleme', title: 'Probleme cu imagini', text: 'Probleme scurte de adunare și scădere, cu obiectele desenate.', config: { category: 'math', selectedItems: ['problems'] } },
  { id: 'mate-adunari-31', title: 'Adunări 0–31', text: 'Adaugi 1–5 unități, fără și cu trecere peste ordin.', config: { category: 'math', selectedItems: ['add'], mathRange: 31 }, levels: ['CP'] },
  { id: 'gaseste-litera', title: 'Găsește litera', text: 'Colorează litera căutată printre celelalte.', config: { category: 'games', selectedItems: ['find:A'] } },
  { id: 'numara', title: 'Numără și scrie', text: 'Numără obiectele și scrie numărul.', config: { category: 'games', selectedItems: ['count:5'] } },
  { id: 'uneste-punctele', title: 'Unește punctele', text: 'Unește punctele în ordinea numerelor.', config: { category: 'games', selectedItems: ['dots:star'] } },
  // „Sunete și silabe”
  { id: 'sunetul-initial', title: 'Sunetul de la început', text: 'Încercuiește imaginile care încep cu sunetul dat.', config: { category: 'games', selectedItems: ['sound:A'] } },
  { id: 'primul-sunet', title: 'Primul sunet', text: 'Scrie sub imagine litera cu care începe cuvântul.', config: { category: 'games', selectedItems: ['first:1'] } },
  { id: 'cate-silabe', title: 'Câte silabe are cuvântul?', text: 'Colorează câte o bulină pentru fiecare silabă.', config: { category: 'games', selectedItems: ['syl:1'] } },
  { id: 'desparte-silabe', title: 'Desparte în silabe', text: 'Urmărește silabele, apoi scrie-le singur în căsuțe.', config: { category: 'games', selectedItems: ['split:1'] } },
  // Sortare, grupare, orientare în spațiu
  { id: 'sorteaza', title: 'Sortează', text: 'Unește fiecare imagine cu grupa ei: fructe sau legume.', config: { category: 'games', selectedItems: ['sort:1'] }, levels: ['presc', 'CP'] },
  { id: 'intrusul', title: 'Ce nu se potrivește?', text: 'Taie imaginea care nu face parte din grupă.', config: { category: 'games', selectedItems: ['odd:1'] }, levels: ['presc'] },
  { id: 'grupeaza-numara', title: 'Grupează și numără', text: 'Numără fiecare fel de fruct și scrie numărul în tabel.', config: { category: 'games', selectedItems: ['group:1'] }, levels: ['presc', 'CP'] },
  { id: 'orientare', title: 'Unde se află?', text: 'Pe masă, sub masă, deasupra, în cutie, în stânga: încercuiește.', config: { category: 'games', selectedItems: ['pos:1'] }, levels: ['CP', 'I'] },
];

/** The number range a class works in, for the math sheets it opens (programme contents). */
const MATH_RANGE: Record<SchoolLevel, number> = { presc: 10, CP: 10, I: 100, II: 100 };

/** The full generator settings of a preset for a class. */
export function presetConfig(preset: SheetPreset, level: SchoolLevel): WorksheetConfig {
  return {
    ...DEFAULT_CONFIG,
    ...preset.config,
    ...(preset.config.category === 'math' ? { mathRange: MATH_RANGE[level] } : {}),
    ...(preset.config.mathRange ? { mathRange: preset.config.mathRange } : {}),
    customWords: [],
    curriculumLevel: level,
  };
}

/** The class pages: address, title, and the programmes they show. */
export interface ClassPage {
  slug: string;
  level: SchoolLevel;
  title: string;
  /** e.g. „la clasa pregătitoare” */
  at: string;
  programmes: ProgrammeId[];
}

export const CLASS_PAGES: ClassPage[] = [
  { slug: 'gradinita', level: 'presc', title: 'Grădiniță', at: 'la grădiniță', programmes: ['et-presc'] },
  { slug: 'clasa-pregatitoare', level: 'CP', title: 'Clasa pregătitoare', at: 'la clasa pregătitoare', programmes: ['clr-p-ii', 'mem-p-ii'] },
  { slug: 'clasa-1', level: 'I', title: 'Clasa I', at: 'la clasa I', programmes: ['clr-p-ii', 'mem-p-ii'] },
  { slug: 'clasa-2', level: 'II', title: 'Clasa a II-a', at: 'la clasa a II-a', programmes: ['clr-p-ii', 'mem-p-ii'] },
];

export function classPage(slug: string): ClassPage | undefined {
  return CLASS_PAGES.find((c) => c.slug === slug);
}

/** The level code of the data for a class ("3-6" for preschool). */
function dataLevel(level: SchoolLevel): string {
  return level === 'presc' ? '3-6' : level;
}

export interface CompetenceCoverage {
  programme: ProgrammeId;
  competence: SpecificCompetence;
  /** The code as teachers write it: „4.1”, or „D.3.4” in preschool. */
  code: string;
  presets: SheetPreset[];
}

/** One group per programme (preschool: per domain), in the programme's order. */
export interface CoverageGroup {
  title: string;
  items: CompetenceCoverage[];
}

const sameRef = (a: CompetenceRef, b: SpecificCompetence, programme: ProgrammeId) =>
  a.programme === programme && a.code === b.code && (programme !== 'et-presc' || a.domain === b.domain);

/**
 * Every specific competence of a class with the sheets that practise it. Preschool shows
 * only domains D (language, pre-reading and pre-writing, mother-tongue variant) and E
 * (cognitive development, numbers and shapes): the others are not worksheet matters.
 */
export function classCoverage(page: ClassPage): CoverageGroup[] {
  const covered = SHEET_PRESETS.filter((p) => !p.levels || p.levels.includes(page.level)).map((p) => ({ preset: p, refs: sheetCompetences(presetConfig(p, page.level), page.level) }));
  const groups: CoverageGroup[] = [];
  for (const id of page.programmes) {
    const prog = PROGRAMMES[id];
    const competences = prog.specificCompetences.filter(
      (c) => c.level === dataLevel(page.level) && (id !== 'et-presc' || (c.kind === 'comportament' && (c.domain === 'D' ? c.variant === 'a' : c.domain === 'E'))),
    );
    const item = (c: SpecificCompetence): CompetenceCoverage => ({
      programme: id,
      competence: c,
      code: id === 'et-presc' ? `${c.domain}.${c.code}` : c.code,
      presets: covered.filter((x) => x.refs.some((r) => sameRef(r, c, id))).map((x) => x.preset),
    });
    if (id === 'et-presc') {
      for (const d of ['D', 'E']) {
        const domain = prog.generalCompetences.find((g) => g.code === d);
        groups.push({ title: `${d}. ${sentenceCase(domain?.text ?? d)}`, items: competences.filter((c) => c.domain === d).map(item) });
      }
    } else {
      groups.push({ title: prog.subject, items: competences.map(item) });
    }
  }
  return groups;
}

/** „DEZVOLTAREA COGNITIVĂ ȘI…” → „Dezvoltarea cognitivă și…” (the document prints domains in capitals). */
function sentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase('ro');
  return lower.charAt(0).toLocaleUpperCase('ro') + lower.slice(1);
}

/** The generator link for a preset in a class: the generator opens with these settings. */
export function presetHref(preset: SheetPreset, level: SchoolLevel): string {
  return `/generator?fisa=${encodeURIComponent(preset.id)}&clasa=${level}`;
}

export function presetById(id: string): SheetPreset | undefined {
  return SHEET_PRESETS.find((p) => p.id === id);
}
