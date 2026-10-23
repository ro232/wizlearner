import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { ALPHABETS, LETTER_HINTS } from '@/lib/glyphs/data';
import { THEMES } from '@/lib/themes';
import { DOT_SHAPES } from '@/lib/worksheet/activities';

/**
 * Fixed sheets with their own address, for what parents and teachers type into Google:
 * „fișe litera A”, „fișă cifra 3”, „fișe tema toamna”. Each page shows the sheet and
 * gives it away as a one-page PDF; changing it (the child's name, more pages, other
 * letters) happens in the generator, which is where the paid plan starts.
 *
 * Everything here is static data, so the pages are built ahead of time.
 */

export type SeoKind = 'litere' | 'cifre' | 'teme' | 'jocuri';

export interface SeoSheet {
  slug: string;
  kind: SeoKind;
  /** Short name used in lists and links: „Litera Ș”. */
  label: string;
  /** Page heading. */
  h1: string;
  /** <title> and meta description. */
  title: string;
  description: string;
  /** Two or three sentences for the page, written for people, not robots. */
  intro: string[];
  config: WorksheetConfig;
}

export const KIND_TITLES: Record<SeoKind, string> = {
  litere: 'Litere de trasat',
  cifre: 'Cifre de trasat',
  teme: 'Fișe pe teme',
  jocuri: 'Jocuri pe hârtie',
};

const base: WorksheetConfig = { ...DEFAULT_CONFIG, alphabet: 'ro', fillPage: true, dateField: true };

/** ASCII slugs for the Romanian letters with diacritics (URLs stay readable when shared). */
const DIACRITIC_SLUG: Record<string, string> = {
  Ă: 'a-breve',
  Â: 'a-circumflex',
  Î: 'i-circumflex',
  Ș: 's-virgula',
  Ț: 't-virgula',
};

export function letterSlug(letter: string): string {
  return `litera-${DIACRITIC_SLUG[letter] ?? letter.toLowerCase()}`;
}

const DIACRITIC_NOTE: Record<string, string> = {
  Ă: 'Ă se scrie ca A, cu o căciuliță rotundă deasupra.',
  Â: 'Â se scrie ca A, cu o căciuliță ascuțită deasupra; o găsim în mijlocul cuvintelor, ca în „pâine”.',
  Î: 'Î se scrie ca I, cu o căciuliță ascuțită; o găsim la începutul și la sfârșitul cuvintelor, ca în „înghețată”.',
  Ș: 'Ș se scrie ca S, cu o virguliță dedesubt (nu cu sedilă).',
  Ț: 'Ț se scrie ca T, cu o virguliță dedesubt (nu cu sedilă).',
};

function letterSheet(upper: string): SeoSheet {
  const lower = upper.toLowerCase();
  const hint = LETTER_HINTS.ro[upper];
  const word = hint?.word ?? '';
  return {
    slug: letterSlug(upper),
    kind: 'litere',
    label: `Litera ${upper}`,
    h1: `Fișă de scris: litera ${upper}${lower}`,
    title: `Fișe litera ${upper} de trasat (${upper} mare și ${lower} mic) – PDF gratuit`,
    description: `Fișă gratuită pentru litera ${upper}${lower}: litera mare și mică cu ordinea liniilor, puncte de start și săgeți${word ? `, plus cuvântul „${word}” cu imagine` : ''}. Pentru grădiniță și clasa pregătitoare.`,
    intro: [
      `Copilul trasează litera ${upper} mare și ${lower} mic pe liniatură de caiet, urmând cifrele care arată de unde începe fiecare linie.`,
      ...(DIACRITIC_NOTE[upper] ? [DIACRITIC_NOTE[upper]] : []),
      word ? `La final scrie cuvântul „${word}”, cu imaginea alături, ca să lege litera de un sunet cunoscut.` : 'La final scrie litera de mai multe ori pe tot rândul.',
    ],
    config: {
      ...base,
      category: 'letters',
      letterMode: 'paired',
      selectedItems: [`${upper}${lower}`],
      customWords: word ? [word] : [],
      wordPictures: word && hint ? { [word]: hint.emoji } : undefined,
      customTitle: `Litera ${upper}${lower}`,
      showLetterIcons: true,
      repetitionsPerItem: 2,
    },
  };
}

const NUMBER_WORDS = ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece'];

function numberSheet(n: number): SeoSheet {
  const s = String(n);
  const isDigit = n < 10;
  return {
    slug: isDigit ? `cifra-${s}` : `numarul-${s}`,
    kind: 'cifre',
    label: isDigit ? `Cifra ${s}` : `Numărul ${s}`,
    h1: isDigit ? `Fișă de scris: cifra ${s}` : `Fișă de scris: numărul ${s}`,
    title: `Fișă ${isDigit ? 'cifra' : 'numărul'} ${s} (${NUMBER_WORDS[n]}) de trasat – PDF gratuit`,
    description: `Fișă gratuită pentru ${isDigit ? 'cifra' : 'numărul'} ${s}: se trasează pe linii, cu ordinea liniilor, puncte de start și săgeți. Pentru grădiniță și clasa pregătitoare.`,
    intro: [
      `${isDigit ? 'Cifra' : 'Numărul'} ${s} (${NUMBER_WORDS[n]}), de trasat de la model până la rândul liber.`,
      'Punctele numerotate arată de unde pornește fiecare linie, iar săgețile arată încotro. Pe ultimele rânduri modelul se estompează, ca cel mic să scrie singur.',
    ],
    config: {
      ...base,
      category: 'numbers',
      selectedItems: [s],
      customTitle: isDigit ? `Cifra ${s}` : `Numărul ${s}`,
      repetitionsPerItem: 2,
    },
  };
}

function themeSheet(id: string): SeoSheet {
  const t = THEMES.find((x) => x.id === id)!;
  const words = t.words.map((w) => w.word);
  const list = words.map((w) => w.toLowerCase()).join(', ');
  return {
    slug: `tema-${t.id}`,
    kind: 'teme',
    label: `Tema ${t.title}`,
    h1: `Fișă pe tema „${t.title}”`,
    title: `Fișe tema ${t.title} pentru grădiniță – cuvinte de trasat cu imagini`,
    description: `Fișă gratuită pe tema „${t.title}”: cuvintele ${list}, de trasat cu litere mari, fiecare cu imaginea lui. PDF gata de printat.`,
    intro: [
      `Cuvinte din tema „${t.title}” (de obicei ${t.when}): ${list}.`,
      'Fiecare cuvânt are imaginea alături, ca cel mic să-l recunoască înainte să-l poată citi. Cuvintele sunt scrise cu litere mari, cum se învață la început.',
    ],
    config: {
      ...base,
      category: 'letters',
      letterMode: 'uppercase',
      selectedItems: [],
      customWords: words,
      wordPictures: Object.fromEntries(t.words.map((w) => [w.word, w.emoji])),
      customTitle: `Tema: ${t.title}`,
      showLetterIcons: true,
      fillPage: false,
      rowsPerPage: 6,
      repetitionsPerItem: 1,
    },
  };
}

const DOT_NAMES: Record<string, string> = { star: 'steaua', heart: 'inima', house: 'căsuța', fish: 'peștele', boat: 'bărcuța', tree: 'bradul' };

function gameSheets(): SeoSheet[] {
  const dots = DOT_SHAPES.map((shape): SeoSheet => ({
    slug: `uneste-punctele-${shape}`,
    kind: 'jocuri',
    label: `Unește punctele: ${DOT_NAMES[shape] ?? shape}`,
    h1: `Unește punctele: ${DOT_NAMES[shape] ?? shape}`,
    title: `Fișă unește punctele (${DOT_NAMES[shape] ?? shape}) pentru preșcolari – PDF gratuit`,
    description: `Fișă gratuită „Unește punctele”: copilul trage linii de la 1 în ordine și descoperă ${DOT_NAMES[shape] ?? 'desenul'}. Exersează cifrele și controlul creionului.`,
    intro: [
      `Copilul unește punctele în ordinea cifrelor și la final apare ${DOT_NAMES[shape] ?? 'un desen'}, pe care îl poate colora.`,
      'E un exercițiu bun înainte de scris: ține creionul corect, urmărește o direcție și recunoaște cifrele.',
    ],
    config: { ...base, category: 'games', selectedItems: [`dots:${shape}`], customTitle: '' },
  }));
  const find: SeoSheet = {
    slug: 'gaseste-litera',
    kind: 'jocuri',
    label: 'Găsește litera',
    h1: 'Găsește litera: fișă de recunoaștere a literelor',
    title: 'Fișă „Găsește litera” pentru grădiniță – PDF gratuit',
    description: 'Fișă gratuită „Găsește litera”: copilul colorează toate literele A dintr-o grilă cu litere care seamănă (Ă, Â, V, H). Recunoaștere vizuală, înainte de citit.',
    intro: [
      'O grilă de litere în care cel mic caută și colorează litera cerută, apoi scrie câte a găsit.',
      'Literele din jur seamănă cu cea căutată (A printre Ă, Â, V, H), așa că trebuie să se uite atent la detalii, exact ce îi trebuie la citit.',
    ],
    config: { ...base, category: 'games', selectedItems: ['find:A'], customTitle: '' },
  };
  return [find, ...dots];
}

export const SEO_SHEETS: SeoSheet[] = [
  ...ALPHABETS.ro.map(letterSheet),
  ...Array.from({ length: 11 }, (_, n) => numberSheet(n)),
  ...THEMES.map((t) => themeSheet(t.id)),
  ...gameSheets(),
];

export function seoSheetBySlug(slug: string): SeoSheet | undefined {
  return SEO_SHEETS.find((s) => s.slug === slug);
}

/** Neighbours in the same group first (previous and next letter …), then one from each other group. */
export function relatedSheets(slug: string, count = 6): SeoSheet[] {
  const me = seoSheetBySlug(slug);
  if (!me) return [];
  const same = SEO_SHEETS.filter((s) => s.kind === me.kind);
  const i = same.findIndex((s) => s.slug === slug);
  const near = [same[i - 1], same[i + 1], same[i + 2], same[i - 2]].filter((s): s is SeoSheet => !!s);
  const others = (Object.keys(KIND_TITLES) as SeoKind[]).filter((k) => k !== me.kind).map((k) => SEO_SHEETS.find((s) => s.kind === k)!);
  return [...near, ...others].slice(0, count);
}
