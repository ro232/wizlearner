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
  /** Settings that differ by class (merged over `config`). */
  byLevel?: Partial<Record<SchoolLevel, Partial<WorksheetConfig>>>;
  /** An „Evaluare” (config.evaluation): listed apart on the class page, not under each competence. */
  evaluation?: boolean;
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
  { id: 'mate-bani', title: 'Banii', text: 'Numără, compară și schimbă bancnote de 1 leu, 5 lei, 10 lei; la clasa a II-a și de 100, 200, 500 de lei.', config: { category: 'math', selectedItems: ['money'] } },
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
  // „Citire și scriere”: the set written for each class (a set prints its code only in its class)
  { id: 'citire-uneste', title: 'Unește cuvântul cu imaginea', text: 'Citește cuvântul și unește-l cu imaginea lui.', config: { category: 'games', selectedItems: ['read:match:1'] }, byLevel: { I: { selectedItems: ['read:match:4'] } }, levels: ['CP', 'I'] },
  { id: 'citire-litera-lipsa', title: 'Ce literă lipsește?', text: 'Scrie litera care lipsește din numele imaginii.', config: { category: 'games', selectedItems: ['read:gap:1'] }, byLevel: { I: { selectedItems: ['read:gap:3'] }, II: { selectedItems: ['read:gap:5'] } }, levels: ['CP', 'I', 'II'] },
  { id: 'citire-deseneaza', title: 'Citește și desenează', text: 'Citește „un nor”, „doi nori” și desenează în căsuță.', config: { category: 'games', selectedItems: ['read:draw:1'] }, byLevel: { I: { selectedItems: ['read:draw:4'] } }, levels: ['CP', 'I'] },
  { id: 'citire-completeaza', title: 'Completează propoziția', text: 'Alege cuvântul potrivit și scrie-l pe linie.', config: { category: 'games', selectedItems: ['read:fill:1'] }, levels: ['I'] },
  { id: 'citire-ordoneaza', title: 'Ordonează cuvintele', text: 'Așază cuvintele în ordine și scrie propoziția de mână.', config: { category: 'games', selectedItems: ['read:order:1'] }, byLevel: { II: { selectedItems: ['read:order:4'] } }, levels: ['I', 'II'] },
  { id: 'citire-copiaza', title: 'Copiază', text: 'Cuvinte de tipar la pregătitoare; propoziții de mână, pe liniatura caietului, la clasa I și a II-a.', config: { category: 'games', selectedItems: ['read:copy:1'] }, byLevel: { I: { selectedItems: ['read:copy:3'] }, II: { selectedItems: ['read:copy:5'] } }, levels: ['CP', 'I', 'II'] },
  { id: 'citire-text', title: 'Citește și răspunde', text: 'Un text scurt și trei întrebări despre el.', config: { category: 'games', selectedItems: ['read:text:1'] }, byLevel: { II: { selectedItems: ['read:text:4'] } }, levels: ['I', 'II'] },
  // Înmulțire și împărțire, ceasul, calendarul, măsurări, figuri (multiply.ts … figures.ts)
  { id: 'mate-grupe', title: 'Grupe egale', text: '3 grupe a câte 4: 4 + 4 + 4; la clasa a II-a și 3 · 4.', config: { category: 'math', selectedItems: ['groups'] }, levels: ['CP', 'I', 'II'] },
  { id: 'mate-inmultiri', title: 'Înmulțiri', text: 'Tabla înmulțirii: una aleasă (2–10) sau toate amestecate.', config: { category: 'math', selectedItems: ['mul'] }, levels: ['II'] },
  { id: 'mate-impartiri', title: 'Împărțiri', text: 'Împărțiri exacte din tabla împărțirii, numere până la 100.', config: { category: 'math', selectedItems: ['div'] }, levels: ['II'] },
  { id: 'mate-factor-lipsa', title: 'Numărul lipsă la înmulțire și împărțire', text: '3 · □ = 12, □ : 4 = 5.', config: { category: 'math', selectedItems: ['mulmiss'] }, levels: ['II'] },
  {
    id: 'mate-ceas', title: 'Cât este ceasul?', text: 'Citește ora pe ceas și scrie-o: ora fixă și jumătatea; la clasa a II-a și sferturi, minute.',
    config: { category: 'math', selectedItems: ['clock'] }, levels: ['I', 'II'], byLevel: { I: { mathClock: 'half' }, II: { mathClock: 'five' } },
  },
  {
    id: 'mate-ceas-acele', title: 'Desenează acele ceasului', text: 'Ora scrisă sub ceas, acele de desenat.',
    config: { category: 'math', selectedItems: ['clockdraw'] }, levels: ['I', 'II'], byLevel: { I: { mathClock: 'half' }, II: { mathClock: 'five' } },
  },
  { id: 'mate-saptamana', title: 'Zilele săptămânii', text: 'Zilele în ordine, ziua de după și cea dinainte, ieri și mâine.', config: { category: 'math', selectedItems: ['week'] }, levels: ['CP', 'I', 'II'] },
  { id: 'mate-luni', title: 'Lunile anului și anotimpurile', text: 'Lunile și anotimpurile în ordine, anotimpul fiecărei luni.', config: { category: 'math', selectedItems: ['months'] }, levels: ['I', 'II'] },
  { id: 'mate-calendar', title: 'Calendarul lunii', text: 'Citește calendarul: ziua săptămânii, poimâine, alaltăieri.', config: { category: 'math', selectedItems: ['calmonth'] }, levels: ['II'] },
  { id: 'mate-lungimi', title: 'Măsoară cu cuburi sau agrafe', text: 'Câte unități are fiecare obiect; cel mai lung, cel mai scurt.', config: { category: 'math', selectedItems: ['length'] }, levels: ['presc', 'CP', 'I', 'II'] },
  { id: 'mate-balanta', title: 'Mai greu, mai ușor', text: 'Balanța coboară spre obiectul mai greu: încercuiește.', config: { category: 'math', selectedItems: ['mass'] }, levels: ['presc', 'II'] },
  { id: 'mate-rigla', title: 'Măsoară cu rigla', text: 'Lungimi în centimetri pe riglă, linii de desenat.', config: { category: 'math', selectedItems: ['ruler'] }, levels: ['I', 'II'] },
  { id: 'mate-unitati', title: 'Unități de măsură', text: 'Metrul, centimetrul, litrul, kilogramul; instrumente; 1 m = 100 cm.', config: { category: 'math', selectedItems: ['units'] }, levels: ['II'] },
  { id: 'mate-figuri', title: 'Figuri geometrice în desen', text: 'Numără pătratele, dreptunghiurile, triunghiurile și cercurile.', config: { category: 'math', selectedItems: ['figures'] }, levels: ['presc', 'CP', 'I'] },
  // Fișe distractive și „Explorarea mediului” (fun-pages.ts, explore-pages.ts): set 1 of each, free
  { id: 'coloreaza-dupa-cod', title: 'Colorează după cod', text: 'Un desen cu numere de la 1 la 5: fiecare parte cu culoarea numărului ei.', config: { category: 'games', selectedItems: ['color:1'] }, levels: ['presc'] },
  { id: 'calculeaza-coloreaza', title: 'Calculează și colorează', text: 'Adunări și scăderi cu rezultatul 1–5: fiecare parte cu culoarea rezultatului.', config: { category: 'games', selectedItems: ['colsum:1'] }, levels: ['CP'] },
  { id: 'urmareste-linia', title: 'Urmărește linia', text: 'Linii punctate de la imagine la imagine, de urmărit cu creionul.', config: { category: 'games', selectedItems: ['trace:1'] }, levels: ['presc', 'CP'] },
  { id: 'partile-plantei', title: 'Părțile plantei', text: 'Rădăcină, tulpină, frunză, floare, fruct: scrie sau lipește cuvântul în căsuță.', config: { category: 'games', selectedItems: ['plant:1'] }, levels: ['presc', 'CP'] },
  { id: 'partile-corpului', title: 'Părțile corpului', text: 'Cap, gât, trunchi, mâini, picioare: scrie sau lipește cuvântul în căsuță.', config: { category: 'games', selectedItems: ['body:1'] }, levels: ['presc', 'CP'] },
  { id: 'simturile', title: 'Simțurile', text: 'Unește ochiul, urechea, nasul, limba și mâna cu simțul lor.', config: { category: 'games', selectedItems: ['senses:1'] }, levels: ['presc', 'CP'] },
  { id: 'cine-unde-traieste', title: 'Cine unde trăiește?', text: 'În pădure, la fermă sau în apă: încercuiește locul fiecărui animal.', config: { category: 'games', selectedItems: ['home:1'] }, levels: ['presc', 'CP'] },
  { id: 'cum-se-deplaseaza', title: 'Cum se deplasează?', text: 'Zboară, înoată, merge sau se târăște: încercuiește.', config: { category: 'games', selectedItems: ['move:1'] }, levels: ['presc', 'CP'] },
  { id: 'mediile-de-viata', title: 'Mediile de viață', text: 'Pădurea, deșertul, Polul Nord, Polul Sud, Marea Neagră: un X în tabel pentru fiecare animal.', config: { category: 'games', selectedItems: ['habitat:1'] }, levels: ['II'] },
  { id: 'puiul-cui-este', title: 'Puiul cui este?', text: 'Vaca și vițelul, oaia și mielul, calul și mânzul: unește.', config: { category: 'games', selectedItems: ['baby:1'] }, levels: ['presc'] },
  { id: 'anotimpurile', title: 'Anotimpurile', text: 'Încercuiește anotimpul fiecărei imagini: primăvara, vara, toamna, iarna.', config: { category: 'games', selectedItems: ['season:1'] }, levels: ['presc', 'CP'] },
  { id: 'vremea', title: 'Vremea', text: 'Soare, nori, ploaie, ninsoare, vânt, fulger: unește semnul cu numele lui.', config: { category: 'games', selectedItems: ['weather:1'] }, levels: ['presc', 'CP'] },
  { id: 'ce-iei-cu-tine', title: 'Ce iei cu tine?', text: 'Dacă plouă, iei umbrela: unește vremea cu ce îți trebuie.', config: { category: 'games', selectedItems: ['wear:1'] }, levels: ['presc', 'CP'] },
  { id: 'apa-solida-lichida', title: 'Apa: solidă sau lichidă?', text: 'Gheață, zăpadă, ploaie, valuri: încercuiește cum este apa.', config: { category: 'games', selectedItems: ['water:1'] }, levels: ['I'] },
  { id: 'ce-se-intampla-cu-apa', title: 'Ce se întâmplă cu apa?', text: 'Se topește, îngheață, fierbe sau se evaporă: citește și încercuiește.', config: { category: 'games', selectedItems: ['melt:1'] }, levels: ['I'] },
  // Evaluări: the items of the class's programme as a short test, with the answers page (evaluation.ts)
  {
    id: 'evaluare-mate', title: 'Evaluare la matematică', text: 'Comparare, adunări și scăderi, probleme cu imagini, bani (la clasa a II-a: înmulțiri și ceasul); cu răspunsuri și calificative orientative.',
    config: { category: 'math', selectedItems: ['cmp', 'mix', 'problems', 'money'], evaluation: true }, levels: ['CP', 'I', 'II'], evaluation: true,
    // clasa a II-a: 0–1000, „Adunarea și scăderea în concentrul 0 – 1000, fără trecere peste ordin”; the
    // missing number instead of money
    // clasa a II-a also: the tables (II 1.5) and the clock with quarters and minutes (II 6.2)
    byLevel: { II: { selectedItems: ['cmp', 'mix', 'missing', 'mul', 'clock', 'problems'], mathCarry: 'without', mathClock: 'five' } },
  },
  {
    id: 'evaluare-clr', title: 'Evaluare: sunete și silabe', text: 'Sunetul de la început, primul sunet, câte silabe, despărțirea în silabe; cu răspunsuri și calificative orientative.',
    config: { category: 'games', selectedItems: ['sound:C', 'first:1', 'syl:1', 'split:1'], evaluation: true }, levels: ['CP', 'I'], evaluation: true,
    // clasa pregătitoare reads the capitals first; clasa I the small letters too
    byLevel: { I: { letterMode: 'lowercase' } },
  },
  {
    id: 'evaluare-gradinita', title: 'Evaluare la grădiniță', text: 'Sortează, numără, ce nu se potrivește, sunetul de la început; cu răspunsuri și fișă de observare.',
    config: { category: 'games', selectedItems: ['sort:1', 'count:5', 'odd:1', 'sound:A'], evaluation: true }, levels: ['presc'], evaluation: true,
  },
  {
    id: 'evaluare-citire', title: 'Evaluare: citire și scriere', text: 'Unește cuvântul cu imaginea, litera care lipsește, completează propoziția, un text cu întrebări; cu răspunsuri și calificative orientative.',
    config: { category: 'games', selectedItems: ['read:match:4', 'read:gap:3', 'read:fill:1', 'read:text:1'], evaluation: true }, levels: ['I', 'II'], evaluation: true,
    // clasa a II-a: its own sets (the sentences put in order instead of the pictures to join)
    byLevel: { II: { selectedItems: ['read:gap:5', 'read:order:4', 'read:fill:4', 'read:text:4'] } },
  },
];

/** The number range a class works in, for the math sheets it opens (programme contents). */
const MATH_RANGE: Record<SchoolLevel, number> = { presc: 10, CP: 10, I: 100, II: 1000 };

/** The full generator settings of a preset for a class. */
export function presetConfig(preset: SheetPreset, level: SchoolLevel): WorksheetConfig {
  return {
    ...DEFAULT_CONFIG,
    ...preset.config,
    ...(preset.config.category === 'math' ? { mathRange: MATH_RANGE[level] } : {}),
    ...(preset.config.mathRange ? { mathRange: preset.config.mathRange } : {}),
    ...preset.byLevel?.[level],
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
  const covered = SHEET_PRESETS.filter((p) => !p.evaluation && (!p.levels || p.levels.includes(page.level))).map((p) => ({ preset: p, refs: sheetCompetences(presetConfig(p, page.level), page.level) }));
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

/** The evaluations of a class, with the codes they print (as teachers write them: „1.2”, „D.3.2”). */
export function classEvaluations(page: ClassPage): { preset: SheetPreset; codes: string[] }[] {
  return SHEET_PRESETS.filter((p) => p.evaluation && p.levels?.includes(page.level)).map((preset) => ({
    preset,
    codes: sheetCompetences(presetConfig(preset, page.level), page.level).map((r) => (r.programme === 'et-presc' ? `${r.domain}.${r.code}` : r.code)),
  }));
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
