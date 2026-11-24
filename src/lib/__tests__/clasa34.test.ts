import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import type { PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { numberWords, numberWordsLarge, hasSettledWords } from '@/lib/worksheet/number-words';
import {
  M34_KINDS, M34_SETS, evaluate, fromRoman, inmColumns, isFreeM34Item, isM34Item, m34Data, m34Fractions, m34Items, m34Patterns, m34Perimeter, m34Problems,
  m34Sheet, m34SetLevel, patternValues, perimeter, roundTo, toRoman, fractionWords,
} from '@/lib/worksheet/m34';
import { m34KeySection, m34Label } from '@/lib/worksheet/m34-pages';
import { DICT_SETS, LECT_TEXTS, AUD_TEXTS, R34_KINDS, R34_SETS, dictPlain, dictWords, isFreeR34Item, isR34Item, lectQuestions, r34Items, r34Sheet, r34SetLevel } from '@/lib/worksheet/r34';
import { r34KeySection, r34Label, r34Pages } from '@/lib/worksheet/r34-pages';
import { blockAnswers, type Block } from '@/lib/worksheet/blocks34';
import { fmtNum, mathExercises, carriesAny, borrowsAny, MATH_RANGES } from '@/lib/worksheet/math';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { isItemAllowed } from '@/lib/access';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { findCompetence } from '@/lib/curriculum';
import { NUMBER_LIMIT, SCHOOL_LEVELS, sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage, coverageCount, headlineItems, presetById, presetConfig } from '@/lib/curriculum/presets';
import { LANDING_CLASSES, classLandingPages } from '@/lib/seo/landing';
import sitemap from '@/app/sitemap';
import { absoluteUrl } from '@/lib/seo/site';
import { opsOutside } from './bounds';
import { textOverlaps } from './drawn';

const games = (items: string[], extra: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, ...extra });
const texts = (p: PageOps) => flattenOps(p.ops).flatMap((o) => (o.t === 'text' ? [o.text] : []));
const M34 = m34Items();
const R34 = r34Items();
const ALL = [...M34, ...R34];
const CEDILLA = /[şţŞŢ]/;
const n = (s: string) => Number(s.replace(/ /g, ''));
/** The A4 page inside its 12 mm margins (the footer line and the curriculum label sit in the bottom margin). */
const MARGINS = { minX: 11.5, minY: 11.5, maxX: 198.5, maxY: 297 - 7 };

describe('clasa a III-a și a IV-a: the classes', () => {
  it('are in the generator, the store, the class pages and the sitemap', () => {
    expect(SCHOOL_LEVELS.map((l) => l.id)).toEqual(['presc', 'CP', 'I', 'II', 'III', 'IV']);
    expect(SCHOOL_LEVELS.slice(4).map((l) => l.label)).toEqual(['Clasa a III-a', 'Clasa a IV-a']);
    for (const level of ['III', 'IV'] as const) expect(sanitizeConfig({ ...DEFAULT_CONFIG, curriculumLevel: level }).curriculumLevel).toBe(level);
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, curriculumLevel: 'V' }).curriculumLevel).toBeUndefined();
    expect(NUMBER_LIMIT.III).toBe(10000);
    expect(NUMBER_LIMIT.IV).toBe(1000000);
    expect(CLASS_PAGES.map((c) => c.slug)).toEqual(['gradinita', 'clasa-pregatitoare', 'clasa-1', 'clasa-2', 'clasa-3', 'clasa-4']);
    expect(CLASS_PAGES.slice(4).map((c) => c.programmes)).toEqual([['llr-iii-iv', 'mate-iii-iv'], ['llr-iii-iv', 'mate-iii-iv']]);
    const urls = new Set(sitemap().map((e) => e.url));
    for (const slug of ['clasa-3', 'clasa-4']) {
      expect(urls.has(absoluteUrl(`/programa/${slug}`)), slug).toBe(true);
      expect(urls.has(absoluteUrl(`/fise-de-lucru/${slug}`)), slug).toBe(true);
    }
    // the sitemap: 6 class pages, 6 landing classes, every landing page of III and IV
    expect(sitemap().filter((e) => /\/programa\/[a-z0-9-]+$/.test(e.url))).toHaveLength(6);
    expect(LANDING_CLASSES).toHaveLength(6);
    for (const slug of ['clasa-3', 'clasa-4']) for (const p of classLandingPages(slug)) expect(urls.has(absoluteUrl(p.path)), p.path).toBe(true);
    // the generator accepts the links of the class pages (/generator?fisa=…&clasa=III)
    expect(readFileSync('src/app/generator/page.tsx', 'utf8')).toContain('isSchoolLevel(level)');
  });

  it('the labels name the subject and the class: „Competența specifică … · Limba și literatura română, clasa a III-a”', () => {
    expect(sheetCompetenceLabel(games(['orto:1']), 'III')).toBe('Competența specifică 4.1 · Limba și literatura română, clasa a III-a');
    expect(sheetCompetenceLabel(games(['parti:3']), 'IV')).toBe('Competența specifică 3.5 · Limba și literatura română, clasa a IV-a');
    expect(sheetCompetenceLabel(games(['nr:1']), 'III')).toBe('Competențele specifice 2.1, 2.2, 2.3 · Matematică, clasa a III-a');
    expect(sheetCompetenceLabel({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['add'], mathRange: 1000000 }, 'IV')).toBe('Competența specifică 2.4 · Matematică, clasa a IV-a');
    // a range above the class: no code
    expect(sheetCompetenceLabel({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['add'], mathRange: 1000000 }, 'III')).toBeNull();
  });

  it('„Avem fișe pentru X din Y”: limba română and matematică, counted together', () => {
    const at = (slug: string) => CLASS_PAGES.find((c) => c.slug === slug)!;
    for (const slug of ['clasa-3', 'clasa-4']) {
      const groups = classCoverage(at(slug));
      expect(groups.map((g) => [g.title, g.items.length])).toEqual([['Limba și literatura română', 21], ['Matematică', 14]]);
      expect(groups.every((g) => g.headline)).toBe(true);
      expect(coverageCount(headlineItems(at(slug)))).toEqual({ covered: 26, total: 35 });
      // every competence of matematică has a sheet; limba română: all but the oral and attitude ones
      expect(coverageCount(groups[1].items)).toEqual({ covered: 14, total: 14 });
      expect(groups[0].items.filter((i) => !i.presets.length).map((i) => i.code)).toEqual(['1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '2.5', '4.5']);
    }
  });
});

describe('the items of clasa a III-a și a IV-a', () => {
  it('are activities with a label, the store keeps exactly these, each written for one class', () => {
    expect(M34).toHaveLength(Object.values(M34_SETS).reduce((a, b) => a + b.length, 0));
    expect(R34).toHaveLength(Object.values(R34_SETS).reduce((a, b) => a + b.length, 0));
    for (const i of ALL) {
      expect(isActivityItem(i), i).toBe(true);
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
      expect(activityLabel(i)).toBe(isM34Item(i) ? m34Label(i) : r34Label(i));
      expect(['III', 'IV']).toContain(isM34Item(i) ? m34SetLevel(i) : r34SetLevel(i));
    }
    const tries = [...M34_KINDS, ...R34_KINDS].flatMap((k) => Array.from({ length: 9 }, (_, x) => `${k}:${x}`).concat([`${k}:`, k, `${k}:1x`]));
    for (const t of tries) expect(itemFitsCategory(t, 'games'), t).toBe(isActivityItem(t));
  });

  it('the free plan: the first set of each class of each kind', () => {
    expect(M34.filter(isFreeM34Item)).toEqual(['nr:1', 'nr:3', 'rom:1', 'rom:3', 'rot:1', 'rot:3', 'ops:1', 'ops:3', 'inm:1', 'inm:3', 'prob:1', 'prob:3', 'fr:1', 'fr:3', 'per:1', 'per:2', 'geo:1', 'geo:2', 'mas:1', 'mas:3', 'date:1', 'date:2', 'sir:1', 'sir:2']);
    expect(R34.filter(isFreeR34Item)).toEqual(['lect:1', 'lect:4', 'aud:1', 'aud:2', 'parti:1', 'parti:3', 'orto:1', 'orto:3', 'punct:1', 'punct:2', 'voc:1', 'voc:2', 'comp:1', 'comp:3', 'func:1', 'func:3', 'dict:1', 'dict:2', 'carte:1', 'carte:2']);
    for (const i of ALL) expect(isItemAllowed(i, 'games', 'free'), i).toBe(isM34Item(i) ? isFreeM34Item(i) : isFreeR34Item(i));
  });

  it('every page: the same every time, inside the A4 margins, no text over another, ș and ț', () => {
    for (const i of ALL) {
      const pages = buildWorksheetPages(games([i], { mathAnswers: true }), 'full');
      expect(pages.length, i).toBeGreaterThan(0);
      expect(JSON.stringify(buildWorksheetPages(games([i], { mathAnswers: true }), 'full'))).toBe(JSON.stringify(pages));
      pages.forEach((p, k) => {
        expect(opsOutside(p, MARGINS), `${i} page ${k + 1}`).toEqual([]);
        expect(textOverlaps(p), `${i} page ${k + 1}`).toEqual([]);
        for (const t of texts(p)) expect(t, i).not.toMatch(CEDILLA);
      });
    }
  });

  it('the answers page: every item with something to check has its answers, the open writing tasks have none', () => {
    for (const i of M34) expect(m34KeySection(i)?.entries.length, i).toBeGreaterThan(0);
    for (const i of R34) {
      const key = r34KeySection(i);
      if (/^(comp|func|carte):/.test(i)) expect(key, i).toBeNull();
      else expect(key?.entries.length, i).toBeGreaterThan(0);
    }
  });
});

describe('the codes of clasa a III-a și a IV-a: each set in its class only, verbatim from the programme', () => {
  const EXPECTED: Record<string, string[]> = {
    nr: ['2.1', '2.2', '2.3'], rom: ['2.1'], rot: ['2.2'], ops: ['2.4', '2.5'], inm: ['2.5'], prob: ['5.1', '5.3'], per: ['3.2'], geo: ['3.2'], date: ['5.2'], sir: ['1.1', '1.2'],
    'fr:1': ['2.1'], 'fr:2': ['2.2', '2.3', '2.4'], 'fr:3': ['2.1', '2.2', '2.4'], 'fr:4': ['2.1', '2.2'],
    'mas:1': ['4.1', '4.2'], 'mas:2': ['4.1', '4.2'], 'mas:3': ['4.2'], 'mas:4': ['4.1', '4.2'],
    aud: ['1.1', '1.2'], parti: ['3.5'], orto: ['4.1'], punct: ['4.1'], dict: ['4.1'], func: ['4.2'], carte: ['3.6'], voc: [],
    'lect:1': ['3.1', '3.2', '3.3', '3.4'], 'lect:2': ['3.1', '3.2', '3.3', '3.4'], 'lect:3': ['3.1', '3.4'], 'lect:4': ['3.1', '3.2', '3.3', '3.4'], 'lect:5': ['3.1', '3.2', '3.3', '3.4'], 'lect:6': ['3.1', '3.2', '3.3', '3.4'],
    'comp:1': ['4.4'], 'comp:2': ['4.3'], 'comp:3': ['4.3'], 'comp:4': ['4.4'],
  };
  // the quoted texts the codes stand for (a change of programme data would fail here)
  const QUOTED: [string, 'III' | 'IV', string, string][] = [
    ['llr-iii-iv', 'III', '4.1', 'Aplicarea regulilor de despărțire în silabe la capăt de rând, de ortografie și de punctuație în redactarea de text'],
    ['llr-iii-iv', 'IV', '4.1', 'Recunoașterea și remedierea greșelilor de ortografie și de punctuație în redactarea de text'],
    ['llr-iii-iv', 'III', '3.5', 'Sesizarea unor regularități ale limbii pe baza textului citit'],
    ['llr-iii-iv', 'IV', '3.5', 'Sesizarea abaterilor din textele citite în vederea corectării acestora'],
    ['llr-iii-iv', 'III', '4.2', 'Redactarea unor texte funcționale simple care conțin limbaj vizual și verbal'],
    ['llr-iii-iv', 'IV', '4.3', 'Redactarea unei descrieri tip portret pe baza unui plan simplu'],
    ['llr-iii-iv', 'IV', '1.1', 'Realizarea de deducții simple pe baza audierii unui text literar sau informativ accesibil'],
    ['mate-iii-iv', 'III', '2.5', 'Efectuarea de înmulțiri de numere în concentrul 0 - 10 000 și de împărțiri folosind tabla înmulțirii, respectiv tabla împărțirii'],
    ['mate-iii-iv', 'IV', '2.5', 'Efectuarea de înmulțiri de numere în concentrul 0 - 1 000 000 când factorii au cel mult trei cifre și de împărțiri la numere de o cifră sau două cifre'],
    ['mate-iii-iv', 'III', '4.2', 'Operarea cu unități de măsură standardizate, fără transformări'],
    ['mate-iii-iv', 'IV', '4.2', 'Operarea cu unități de măsură standardizate, folosind transformări'],
    ['mate-iii-iv', 'III', '3.2', 'Explorarea caracteristicilor simple ale figurilor și corpurilor geometrice în contexte familiare'],
    ['mate-iii-iv', 'IV', '5.2', 'Organizarea datelor în tabele și reprezentarea lor grafică'],
  ];

  it('print exactly the expected codes in their class, none in the other', () => {
    for (const i of ALL) {
      const level = (isM34Item(i) ? m34SetLevel(i) : r34SetLevel(i))!;
      const other: SchoolLevel = level === 'III' ? 'IV' : 'III';
      const want = EXPECTED[i] ?? EXPECTED[i.split(':')[0]];
      expect(want, i).toBeDefined();
      const refs = sheetCompetences(games([i]), level);
      expect(refs.map((r) => r.code), i).toEqual(want);
      for (const r of refs) {
        expect(r.programme).toBe(isM34Item(i) ? 'mate-iii-iv' : 'llr-iii-iv');
        expect(findCompetence(r), `${i} ${r.code}`).toBeTruthy();
      }
      expect(sheetCompetences(games([i]), other), i).toEqual([]);
      for (const younger of ['presc', 'CP', 'I', 'II'] as const) expect(sheetCompetences(games([i]), younger), i).toEqual([]);
    }
    for (const [programme, level, code, text] of QUOTED) expect(findCompetence({ programme: programme as 'llr-iii-iv', level, code })?.text, `${level} ${code}`).toBe(text);
  });

  it('the existing sheets that fit clasa a III-a / a IV-a print its codes (and keep the old ones)', () => {
    const math = (items: string[], range: number, extra: Partial<WorksheetConfig> = {}) => ({ ...DEFAULT_CONFIG, category: 'math' as const, selectedItems: items, mathRange: range, ...extra });
    const codes = (c: WorksheetConfig, l: SchoolLevel) => sheetCompetences(c, l).map((r) => `${r.programme === 'mate-iii-iv' ? 'M' : r.programme}:${r.code}`);
    expect(codes(math(['cmp'], 10000), 'III')).toEqual(['M:2.2']);
    expect(codes(math(['add', 'sub', 'mix', 'missing'], 10000, { mathCarry: 'with' }), 'III')).toEqual(['M:2.4']);
    expect(codes(math(['seq', 'nbr'], 1000000), 'IV')).toEqual(['M:2.3']);
    expect(codes(math(['mul', 'div', 'mulmiss'], 10000), 'III')).toEqual(['M:2.5']);
    expect(codes(math(['mul'], 1000000), 'IV')).toEqual([]);
    expect(codes(math(['clock'], 10000, { mathClock: 'five' }), 'III')).toEqual(['M:4.1']);
    expect(codes(math(['clock'], 1000000), 'IV')).toEqual([]);
    expect(codes(games(['coord:1']), 'III')).toEqual(['M:3.1']);
    expect(codes(games(['coord:1']), 'IV')).toEqual(['M:3.1']);
    expect(codes(games(['sides:1']), 'III')).toEqual(['M:3.2']);
    // the old classes are as they were
    expect(codes(games(['coord:1']), 'II')).toEqual(['mem-p-ii:2.1']);
    expect(codes(math(['add'], 1000), 'II')).toEqual(['mem-p-ii:1.4']);
    // money, picture problems, groups: no code in III / IV
    expect(codes(math(['money', 'problems', 'groups', 'addpic'], 10000), 'III')).toEqual([]);
  });
});

describe('the presets of clasa a III-a și a IV-a', () => {
  const UPPER = SHEET_PRESETS.filter((p) => p.levels?.some((l) => l === 'III' || l === 'IV'));
  /** The presets that open a paid set on purpose (the second set of a class); every other one opens a free set. */
  const PAID = new Set(['impartire-34', 'fractii-34-2', 'timp-bani-34', 'text-informativ', 'compunere-2', 'texte-functionale-2']);

  it('open a free set where intended, build a sheet in each of their classes and print its codes', () => {
    for (const p of UPPER)
      for (const level of p.levels!.filter((l): l is 'III' | 'IV' => l === 'III' || l === 'IV')) {
        const config = presetConfig(p, level);
        expect(config.curriculumLevel).toBe(level);
        expect(buildWorksheetPages(config, 'full').length, `${p.id} ${level}`).toBeGreaterThan(0);
        const games34 = config.selectedItems.filter((i) => isM34Item(i) || isR34Item(i));
        for (const i of games34) expect(isM34Item(i) ? m34SetLevel(i) : r34SetLevel(i), `${p.id} ${level} ${i}`).toBe(level);
        if (!p.evaluation && p.id !== 'sinonime-antonime') expect(sheetCompetences(config, level).length, `${p.id} ${level}`).toBeGreaterThan(0);
        if (games34.length && !p.evaluation) expect(games34.every((i) => isItemAllowed(i, 'games', 'free')), `${p.id} ${level}`).toBe(!PAID.has(p.id));
      }
    expect(sheetCompetences(presetConfig(presetById('sinonime-antonime')!, 'III'), 'III')).toEqual([]);
    // the math presets open in the class range
    expect(presetConfig(presetById('mate-adunari')!, 'III').mathRange).toBe(10000);
    expect(presetConfig(presetById('mate-adunari')!, 'IV').mathRange).toBe(1000000);
  });

  it('the evaluations: 2–3 pages each, one subject each, every item with a short form', () => {
    for (const id of ['evaluare-mate-34', 'evaluare-romana-34'])
      for (const level of ['III', 'IV'] as const) {
        const config = presetConfig(presetById(id)!, level);
        const refs = sheetCompetences(config, level);
        expect(new Set(refs.map((r) => r.programme)).size, `${id} ${level}`).toBe(1);
        expect(refs[0].programme).toBe(id === 'evaluare-mate-34' ? 'mate-iii-iv' : 'llr-iii-iv');
      }
  });
});

describe('Matematică III–IV: the numbers are right', () => {
  it('number words to 1 000 000 (DOOM forms), unchanged up to 1000', () => {
    for (let x = 0; x <= 1000; x++) expect(numberWordsLarge(x)).toBe(numberWords(x));
    const cases: [number, string][] = [
      [1001, 'o mie unu'], [2000, 'două mii'], [4352, 'patru mii trei sute cincizeci și doi'], [6108, 'șase mii o sută opt'], [10000, 'zece mii'],
      [11000, 'unsprezece mii'], [12000, 'douăsprezece mii'], [20000, 'douăzeci de mii'], [21000, 'douăzeci și una de mii'], [22021, 'douăzeci și două de mii douăzeci și unu'],
      [100000, 'o sută de mii'], [112500, 'o sută douăsprezece mii cinci sute'], [120000, 'o sută douăzeci de mii'], [456789, 'patru sute cincizeci și șase de mii șapte sute optzeci și nouă'],
      [999999, 'nouă sute nouăzeci și nouă de mii nouă sute nouăzeci și nouă'], [1000000, 'un milion'],
    ];
    for (const [x, w] of cases) expect(numberWordsLarge(x), String(x)).toBe(w);
    expect(hasSettledWords(101000)).toBe(false);
    expect(hasSettledWords(302500)).toBe(false);
    expect(hasSettledWords(456789)).toBe(true);
    // the sheets never ask for an unsettled form
    for (const i of ['nr:1', 'nr:2', 'nr:3', 'nr:4']) for (const b of m34Sheet(i).blocks) if (b.t === 'fill') for (const f of b.items) {
      const m = f.text.match(/^([a-zăâîșț ]+) = \{\}$/);
      if (m) expect(hasSettledWords(n(f.answers[0])), f.text).toBe(true);
    }
  });

  it('nr: words ↔ digits, place value, compare and order agree with the numbers printed', () => {
    for (const item of ['nr:1', 'nr:2', 'nr:3', 'nr:4']) {
      const iii = m34SetLevel(item) === 'III';
      for (const b of m34Sheet(item).blocks) {
        if (b.t !== 'fill') continue;
        for (const f of b.items) {
          let m = f.text.match(/^([a-zăâîșț ]+) = \{\}$/);
          if (m) {
            expect(numberWordsLarge(n(f.answers[0]))).toBe(m[1]);
            expect(n(f.answers[0])).toBeLessThanOrEqual(iii ? 10000 : 1000000);
            continue;
          }
          m = f.text.match(/^([\d ]+) = \{_\}$/);
          if (m) {
            expect(f.answers[0]).toBe(numberWordsLarge(n(m[1])));
            continue;
          }
          m = f.text.match(/^([\d ]+) \{\} ([\d ]+)$/);
          if (m) {
            const [a, c] = [n(m[1]), n(m[2])];
            expect(f.answers[0]).toBe(a < c ? '<' : a > c ? '>' : '=');
            continue;
          }
          m = f.text.match(/^(\d{4}) = \{\} mii/);
          if (m) {
            expect(f.answers.map(Number)).toEqual([...m[1]].map(Number));
            continue;
          }
          m = f.text.match(/^În ([\d ]+), cifra zecilor de mii/);
          if (m) {
            const x = n(m[1]);
            expect(f.answers.map(Number)).toEqual([Math.floor(x / 10000) % 10, Math.floor(x / 100) % 10, x % 10]);
            continue;
          }
          m = f.text.match(/^\{\} < ([\d ]+) < \{\}$/);
          if (m) {
            expect(f.answers).toEqual([fmtNum(n(m[1]) - 1), fmtNum(n(m[1]) + 1)]);
            continue;
          }
          m = f.text.match(/^(.+):\s+\{_\}$/);
          if (m) {
            const nums = m[1].split(';').map((x) => n(x.trim()));
            const up = /ordine crescătoare/.test(b.heading);
            expect(f.answers[0]).toBe([...nums].sort((x, y) => (up ? x - y : y - x)).map(fmtNum).join(', '));
            continue;
          }
          throw new Error(`unchecked: ${f.text}`);
        }
      }
    }
  });

  it('Roman numerals both ways, the subtractive forms, only I, V, X in clasa a III-a', () => {
    for (let x = 1; x <= 3999; x++) expect(fromRoman(toRoman(x))).toBe(x);
    expect([4, 9, 14, 19, 39, 40, 49, 90, 400, 900, 1999, 2026].map(toRoman)).toEqual(['IV', 'IX', 'XIV', 'XIX', 'XXXIX', 'XL', 'XLIX', 'XC', 'CD', 'CM', 'MCMXCIX', 'MMXXVI']);
    expect(() => fromRoman('IIII')).toThrow();
    expect(() => fromRoman('VX')).toThrow();
    for (const item of ['rom:1', 'rom:2', 'rom:3', 'rom:4']) {
      const iii = m34SetLevel(item) === 'III';
      for (const b of m34Sheet(item).blocks) {
        if (b.t === 'fill') for (const f of b.items) {
          let m = f.text.match(/^([\d ]+) = \{\}$/);
          if (m) expect(f.answers[0]).toBe(toRoman(n(m[1])));
          m = f.text.match(/^([IVXLCDM]+) = \{\}$/);
          if (m) expect(n(f.answers[0])).toBe(fromRoman(m[1]));
          m = f.text.match(/^([IVX]+) \+ ([IVX]+) = \{\}$/);
          if (m) expect(fromRoman(f.answers[0])).toBe(fromRoman(m[1]) + fromRoman(m[2]));
          m = f.text.match(/^anul (\d+) = \{\}$/);
          if (m) expect(f.answers[0]).toBe(toRoman(Number(m[1])));
          m = f.text.match(/^secolul ([IVXLC]+) = secolul \{\}$/);
          if (m) expect(Number(f.answers[0])).toBe(fromRoman(m[1]));
          if (iii) for (const a of [f.text, ...f.answers]) expect(a.replace(/[^A-Z]/g, ''), f.text).toMatch(/^[IVX]*$/);
        }
        if (b.t === 'choice') for (const c of b.items) {
          const x = n(c.text.replace(': {}', ''));
          expect(c.options[c.answer]).toBe(toRoman(x));
          expect(() => fromRoman(c.options[1 - c.answer])).toThrow();
        }
      }
    }
  });

  it('rounding: from 5 up, upwards; every answer is the rounded number', () => {
    expect(roundTo(4350, 100)).toBe(4400);
    expect(roundTo(4349, 100)).toBe(4300);
    expect(roundTo(9500, 1000)).toBe(10000);
    expect(roundTo(347812, 10000)).toBe(350000);
    const PLACE: Record<string, number> = { zeci: 10, sute: 100, mii: 1000, 'zeci de mii': 10000, 'sute de mii': 100000 };
    for (const item of ['rot:1', 'rot:2', 'rot:3', 'rot:4'])
      for (const b of m34Sheet(item).blocks) {
        if (b.t === 'fill' && /^Rotunjește la (.+)\.$/.test(b.heading)) {
          const to = PLACE[b.heading.match(/^Rotunjește la (.+)\.$/)![1]];
          for (const f of b.items) expect(n(f.answers[0])).toBe(roundTo(n(f.text.replace(' ≈ {}', '')), to));
        }
        if (b.t === 'choice') for (const c of b.items) {
          const [, x, place] = c.text.match(/^([\d ]+) rotunjit la (.+): \{\}$/)!;
          expect(n(c.options[c.answer])).toBe(roundTo(n(x), PLACE[place]));
        }
      }
  });

  it('the order of operations: every answer is the value in school order, every step a natural number', () => {
    expect(evaluate('24 + 6 · 3')).toBe(42);
    expect(evaluate('(24 + 6) · 3')).toBe(90);
    expect(evaluate('[(2 + 3) · 4 − 5] · 2')).toBe(30);
    expect(() => evaluate('7 : 2')).toThrow();
    expect(() => evaluate('3 − 5')).toThrow();
    for (const item of ['ops:1', 'ops:2', 'ops:3', 'ops:4']) {
      const iii = m34SetLevel(item) === 'III';
      for (const b of m34Sheet(item).blocks) {
        if (b.t === 'fill') for (const f of b.items) {
          const m = f.text.match(/^(.+) = \{\}$/);
          if (m) {
            expect(n(f.answers[0]), f.text).toBe(evaluate(m[1]));
            if (iii) expect(f.text).not.toMatch(/\[/);
          } else {
            const [expr, value] = f.answers[0].split(' = ');
            expect(evaluate(expr)).toBe(Number(value));
          }
        }
        if (b.t === 'tf') for (const t of b.items) {
          const [expr, value] = t.text.split(' = ');
          expect(t.answer, t.text).toBe(evaluate(expr) === Number(value));
        }
      }
    }
  });

  it('multiplication and division: the products, quotients and remainders of the numbers printed', () => {
    for (const k of [1, 2, 3, 4]) {
      const item = `inm:${k}`;
      for (const c of inmColumns(k)) {
        const [a, op, b] = c.text.replace(' =', '').split(/ ([·:]) /);
        if (op === '·') {
          expect(n(c.answer)).toBe(n(a) * n(b));
          expect(n(c.answer)).toBeLessThanOrEqual(k <= 2 ? 10000 : 1000000);
          if (k === 3) expect(Math.max(n(a), n(b))).toBeLessThan(1000);
        } else {
          const [q, r] = c.answer.split(', rest ');
          expect(n(q) * n(b) + Number(r)).toBe(n(a));
          expect(Number(r)).toBeLessThan(n(b));
          expect(n(b)).toBeLessThan(100);
        }
      }
      for (const b of m34Sheet(item).blocks) if (b.t === 'fill') for (const f of b.items) {
        // fill each box with its answer and check the equality
        let i = 0;
        const done = f.text.replace(/\{\}/g, () => f.answers[i++]).replace(/ rest (\d+)/, ' r $1');
        const eq = done.match(/^(\d[\d ]*\d|\d) ([·:]) (\d[\d ]*\d|\d)(?: ([·]) (\d+))? = (\d[\d ]*\d|\d)(?: r (\d+))?/);
        if (!eq) continue;
        const [, a, op, b2, op2, c2, res, rest] = eq;
        if (op === '·') expect(n(a) * n(b2) * (op2 ? n(c2) : 1), done).toBe(n(res));
        else expect(n(res) * n(b2) + Number(rest ?? 0), done).toBe(n(a));
      }
    }
    // clasa a III-a: division only in 0–100, remainder 0
    for (const b of m34Sheet('inm:2').blocks) if (b.t === 'fill') for (const f of b.items) for (const x of f.text.match(/\d+/g) ?? []) expect(Number(x)).toBeLessThan(100);
  });

  it('problems: every step of each solution is right, the answer is its result', () => {
    for (const k of [1, 2, 3, 4])
      for (const p of m34Problems(k)) {
        const steps = [...p.solution.matchAll(/([\d ]+(?: [+−·:] [\d ]+)+) = ([\d ]+)/g)];
        expect(steps.length, p.text).toBeGreaterThan(0);
        for (const [, expr, value] of steps) expect(evaluate(expr), `${p.text}: ${expr}`).toBe(n(value));
        const last = steps[steps.length - 1];
        expect(p.answer.replace(/ /g, '')).toContain(last[2].replace(/ /g, ''));
        // the numbers of the text are those of the solution
        for (const x of p.text.match(/\d[\d ]*\d|\d/g) ?? []) if (n(x) > 9) expect(p.solution.replace(/ /g, ''), p.text).toContain(String(n(x)));
        expect(p.text).not.toMatch(/\b1 de\b|\b(1\d|[2-9]) de (lei|pomi|meri)/);
      }
  });

  it('fractions: the shaded parts, comparisons, sums and words agree', () => {
    expect(fractionWords(3, 8)).toBe('trei optimi');
    expect(fractionWords(1, 2)).toBe('o doime');
    expect(fractionWords(37, 100)).toBe('treizeci și șapte de sutimi');
    expect(fractionWords(21, 100)).toBe('douăzeci și una de sutimi');
    expect(fractionWords(12, 100)).toBe('douăsprezece sutimi');
    for (const k of [1, 2, 3, 4]) {
      const s = m34Fractions(k);
      for (const f of s.figures) {
        expect(f.shaded).toBeGreaterThan(0);
        expect(f.shaded).toBeLessThan(f.parts);
        if (k <= 2) expect(f.parts).toBeLessThanOrEqual(10);
      }
      for (const b of s.blocks) if (b.t === 'expr') for (const it of b.items) {
        const a = it.answer;
        let m = a.match(/^(\d+)\/(\d+) ([<>=]) (\d+)\/(\d+)$/);
        if (m) {
          const [x, y] = [Number(m[1]) / Number(m[2]), Number(m[4]) / Number(m[5])];
          expect(m[3], a).toBe(x < y ? '<' : x > y ? '>' : '=');
          if (k === 2) expect(m[2]).toBe(m[5]);
        }
        m = a.match(/^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = (\d+)\/(\d+)$/);
        if (m) {
          expect(m[2]).toBe(m[5]);
          expect(m[7]).toBe(m[2]);
          expect(Number(m[6])).toBe(m[3] === '+' ? Number(m[1]) + Number(m[4]) : Number(m[1]) - Number(m[4]));
          if (k <= 2) expect(Number(m[6])).toBeLessThanOrEqual(Number(m[7]));
        }
        m = a.match(/^(\d+)\/(\d+) (subunitară|echiunitară|supraunitară)$/);
        if (m) expect(m[3]).toBe(Number(m[1]) < Number(m[2]) ? 'subunitară' : Number(m[1]) === Number(m[2]) ? 'echiunitară' : 'supraunitară');
        const words = it.toks.find((t) => typeof t === 'string' && / =$/.test(t)) as string | undefined;
        m = a.match(/^(\d+)\/(\d+)$/);
        if (m && words && !/%/.test(words)) expect(words).toBe(`${fractionWords(Number(m[1]), Number(m[2]))} =`);
      }
    }
    // only 25 %, 50 %, 75 % („scrierea procentuală (numai pentru 25%, 50%, 75%)”)
    const pct = JSON.stringify(m34Sheet('fr:4').blocks.map((b) => (b.t === 'expr' ? b.items.map((i) => i.answer) : [])));
    expect(pct.match(/\d+%/g)!.every((x) => ['25%', '50%', '75%'].includes(x))).toBe(true);
  });

  it('perimeter and area: the sums of the sides, the cells counted', () => {
    for (const k of [1, 2]) {
      const s = m34Perimeter(k);
      const draw = s.blocks[0];
      expect(draw.t).toBe('draw');
      s.figures.forEach((f, i) => {
        if (f.shape === 'triangle') {
          const [a, b, c] = f.sides;
          expect(a + b > c && a + c > b && b + c > a).toBe(true);
        }
        expect((draw as Extract<Block, { t: 'draw' }>).answers[i]).toMatch(new RegExp(`= ${perimeter(f)} cm$`));
      });
      s.areas.forEach((a) => expect(new Set(a.cells.map((c) => c.join())).size).toBe(a.cells.length));
    }
    expect(perimeter({ shape: 'rectangle', sides: [7, 4], unit: 'cm' })).toBe(22);
    expect(perimeter({ shape: 'square', sides: [5], unit: 'cm' })).toBe(20);
  });

  it('measures, data and patterns: conversions, totals and rules', () => {
    const K: Record<string, number> = { 'm cm': 100, 'km m': 1000, 'dm cm': 10, 'm mm': 1000, 'kg g': 1000, 't kg': 1000, 'q kg': 100, 'l ml': 1000, 'hl l': 100, 'l dl': 10, 'ore minute': 60, 'minute secunde': 60, 'săptămâni zile': 7, 'ani luni': 12, 'zile ore': 24 };
    for (const item of ['mas:3', 'mas:4']) for (const b of m34Sheet(item).blocks) if (b.t === 'fill') for (const f of b.items) {
      let m = f.text.match(/^(\d+) ([a-zăâîșț]+) = \{\}(?: de)? ([a-zăâîșț]+)$/);
      if (m && K[`${m[2]} ${m[3]}`]) expect(n(f.answers[0]), f.text).toBe(Number(m[1]) * K[`${m[2]} ${m[3]}`]);
      m = f.text.match(/^(\d+) (m|kg|km) (\d+) (cm|g|m) = \{\} /);
      if (m) expect(n(f.answers[0])).toBe(Number(m[1]) * K[`${m[2]} ${m[4]}`] + Number(m[3]));
      m = f.text.match(/^(\d+) m \{\} (\d+) cm$/);
      if (m) expect(f.answers[0]).toBe(Number(m[1]) * 100 < Number(m[2]) ? '<' : Number(m[1]) * 100 > Number(m[2]) ? '>' : '=');
    }
    const d = m34Data(1);
    expect(blockAnswers(d.blocks[1])).toContain(`d) ${d.values.reduce((a, b) => a + b, 0)}`);
    const d2 = m34Data(2);
    expect(d2.values.every((v) => v % 10 === 0 && v <= 100)).toBe(true);
    for (const k of [1, 2]) for (const b of m34Patterns(k).blocks) if (b.t === 'fill') for (const f of b.items) {
      const shown = f.text.split('{}')[0].split(',').map((x) => x.trim()).filter((x) => /^\d/.test(x)).map(n);
      if (shown.length >= 4 && /^\d/.test(f.answers[0]) && !/greșeala|trebuie/.test(b.heading + f.text)) {
        const diffs = shown.slice(1).map((x, i) => x - shown[i]);
        const ratio = shown[1] / shown[0];
        const next = n(f.answers[0]);
        const ok = diffs.every((x) => x === diffs[0]) ? next === shown[shown.length - 1] + diffs[0] : shown.every((x, i) => !i || x === shown[i - 1] * ratio) ? next === shown[shown.length - 1] * ratio : next === shown[shown.length - 1] * 2 + 1;
        expect(ok, f.text).toBe(true);
      }
    }
    expect(patternValues({ start: 3, rule: 'double1', k: 0 }, 4)).toEqual([3, 7, 15, 31]);
  });

  it('0–10 000 and 0–1 000 000: every exercise right, carrying as chosen, the numbers grouped by three', () => {
    expect(MATH_RANGES).toContain(10000);
    expect(fmtNum(4387)).toBe('4387');
    expect(fmtNum(10000)).toBe('10 000');
    expect(fmtNum(1000000)).toBe('1 000 000');
    for (const range of [10000, 1000000] as const)
      for (const carry of ['with', 'without'] as const)
        for (const seed of [1, 2, 3]) {
          for (const e of mathExercises('add', range, seed, 16, carry)) {
            const [a, , b] = e.cells.map((c) => n(c ?? ''));
            expect(a + b).toBe(n(e.answer));
            expect(a + b).toBeLessThanOrEqual(range);
            expect(carriesAny(a, b)).toBe(carry === 'with');
            for (const c of [...e.cells, e.answer]) if (c && /\d/.test(c)) expect(c).toBe(fmtNum(n(c)));
          }
          for (const e of mathExercises('sub', range, seed, 16, carry)) {
            const [a, , b] = e.cells.map((c) => n(c ?? ''));
            expect(a - b).toBe(n(e.answer));
            expect(borrowsAny(a, b)).toBe(carry === 'with');
          }
        }
    // the free plan stays at 10
    const free = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['add'], mathRange: 1000000 }, 'free');
    expect(texts(free[0]).some((t) => t.includes('(0–10)'))).toBe(true);
    // legible: the six-digit sheets are one exercise a line, inside the page
    const big = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['cmp', 'add', 'sub', 'mix', 'missing', 'seq', 'nbr'], mathRange: 1000000, mathAnswers: true }, 'full');
    for (const p of big) {
      expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height })).toEqual([]);
      expect(textOverlaps(p)).toEqual([]);
    }
  });
});

describe('Limba și literatura română III–IV: the texts and the answers', () => {
  it('the texts are original and long enough, every detail question answered in the text', () => {
    for (const t of [...LECT_TEXTS, ...AUD_TEXTS]) {
      const words = t.paragraphs.join(' ').split(/\s+/).length;
      expect(words, t.title).toBeGreaterThan(110);
      expect(words, t.title).toBeLessThan(260);
      expect(t.paragraphs.join(' ')).not.toMatch(CEDILLA);
    }
    // the right option of every detail question is (in its words) in the text
    const KEYWORD: Record<number, string[]> = {
      1: ['ghiozdanul', 'scaunul din hol', 'Irina'], 2: ['bunicul', 'zgardă roșie', 'Fulg'], 3: ['colonii', 'Regina', 'șase laturi'],
      4: ['bunici', 'teamă să nu cadă', 'două cuie'], 5: ['Orașul meu peste o sută de ani', 'paharul cu apă', 'originalitate'], 6: ['Marea Neagră', 'plaur', 'Chilia, Sulina'],
    };
    for (let k = 1; k <= 6; k++) {
      const text = LECT_TEXTS[k - 1].paragraphs.join(' ');
      KEYWORD[k].forEach((w) => expect(text, `lect:${k} ${w}`).toContain(w));
      const q = lectQuestions(k);
      for (const d of q.details) expect(d.options).toHaveLength(3);
      // the events to number are each a different event, the answer a permutation of 1–4
      if (q.order.length) expect([...q.shown].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('every orthogram choice has one form that fits the sentence (written out a second time here)', () => {
    const RIGHT: Record<string, string> = {
      'Mama {} dus la piață.': 's-a', 'Ana își caută cartea {}.': 'sa', 'Bunicul {} bucurat de vizită.': 's-a', 'Copiii {} jucat în parc.': 's-au', 'Vrei mere {} pere?': 'sau',
      'Frunzele {} îngălbenit.': 's-au', 'Bunica {} dat o carte nepotului.': 'i-a', 'Tata {} umbrela din cuier.': 'ia', 'Doamna învățătoare {} lăudat desenul.': 'i-a',
      'Eu {} trenul de la gară.': 'iau', 'Colegii {} trimis o felicitare.': 'i-au', 'Mâine {} o carte de la bibliotecă.': 'iau',
      'Merg {} școală în fiecare dimineață.': 'la', 'Mama {} chemat acasă.': 'l-a', 'Câinele {} urmat până la poartă.': 'l-a', 'Mâine {} ploua toată ziua.': 'va',
      'Cine {} ajutat la teme?': 'v-a', 'Trenul {} pleca la ora opt.': 'va', 'Ea este {} mai bună prietenă a mea.': 'cea', 'Nu știu {} spus doamna.': 'ce-a',
      '{} doi frați s-au împăcat.': 'Cei', 'Spune-mi {} trebuie pentru drum.': 'ce-i', 'Am ales rochia {} albastră.': 'cea', '{} mai mici copii stau în față.': 'Cei',
      'Vântul {} oprit spre seară.': 's-a', 'Ei {} întors târziu de la munte.': 's-au', 'Poți veni azi {} mâine.': 'sau', 'Prietenii {} adus flori bunicii.': 'i-au',
      'Eu {} cu mine o sticlă cu apă.': 'iau', 'Pescarul {} prins un crap mare.': 'a', 'Copiii {} coarda în curte.': 'sar', '{} putea să plouă diseară.': 'S-ar',
      'Ciobanul cântă la {}.': 'nai', 'De ce {} venit la film?': 'n-ai', 'Ieri {} jucat fotbal.': 'ne-am', 'Noi doi suntem din același {}.': 'neam',
    };
    const seenSides = new Set<number>();
    let checked = 0;
    for (const i of ['orto:1', 'orto:2', 'orto:3', 'orto:4'])
      for (const p of r34Pages(i)) for (const b of p.blocks) if (b.t === 'choice') for (const c of b.items) {
        expect(RIGHT[c.text], c.text).toBeDefined();
        expect(c.options[c.answer], c.text).toBe(RIGHT[c.text]);
        expect(c.options).toHaveLength(2);
        seenSides.add(c.answer);
        checked++;
      }
    expect(checked).toBe(Object.keys(RIGHT).length);
    // the right form is not always on the same side
    expect(seenSides).toEqual(new Set([0, 1]));
    // the corrections: the wrong word is in the sentence, the answer is the other form of its pair
    const PAIRS = [['sa', 's-a'], ['sau', 's-au'], ['ia', 'i-a'], ['iau', 'i-au'], ['la', 'l-a'], ['va', 'v-a'], ['neam', 'ne-am'], ['nai', 'n-ai'], ['sar', 's-ar']];
    for (const i of ['orto:3', 'orto:4']) for (const p of r34Pages(i)) for (const b of p.blocks) if (b.t === 'fill' && /greșeală/.test(b.heading)) for (const f of b.items) {
      const fixed = f.answers[0].toLowerCase();
      const pair = PAIRS.find((x) => x.includes(fixed))!;
      expect(pair, f.text).toBeDefined();
      const wrong = pair.find((x) => x !== fixed)!;
      expect(f.text.toLowerCase().split(/[\s.?!→]+/), f.text).toContain(wrong);
    }
  });

  it('parts of speech: the table words are in the text, each in one column', () => {
    for (const i of ['parti:1', 'parti:3']) {
      const [page] = r34Pages(i);
      const text = page.blocks.find((b) => b.t === 'text') as Extract<Block, { t: 'text' }>;
      const table = page.blocks.find((b) => b.t === 'table') as Extract<Block, { t: 'table' }>;
      const all = table.answers.flat();
      expect([...all].sort()).toEqual([...table.bank].sort());
      for (const w of table.bank) expect(text.paragraphs.join(' ').toLowerCase(), w).toContain(w);
    }
    // no numeral: the programme names substantiv, adjectiv calificativ, pronume personal, verb
    for (const i of ['parti:1', 'parti:2', 'parti:3', 'parti:4']) expect(JSON.stringify(r34Sheet(i)).toLowerCase()).not.toContain('numeral');
  });

  it('the dictation: the words left blank are those of the text read out, which is on the answers page', () => {
    for (const k of [1, 2]) {
      const set = DICT_SETS[k - 1];
      for (const s of set.sentences) {
        expect(dictWords(s).length).toBeGreaterThan(0);
        expect(dictPlain(s)).not.toMatch(/[[\]]/);
      }
      const key = r34KeySection(`dict:${k}`)!;
      expect(key.entries[0]).toContain(dictPlain(set.sentences[0]));
    }
  });

  it('„Ascultă și răspunde”: the pupils’ page has no text, the teacher’s page has it', () => {
    for (const k of [1, 2]) {
      const pages = r34Pages(`aud:${k}`);
      expect(pages).toHaveLength(2);
      expect(pages[0].blocks.some((b) => b.t === 'text')).toBe(false);
      expect(pages[1].teacher).toBe(true);
      expect(pages[1].blocks[0].t).toBe('text');
    }
  });

  it('writing pages: tip II rows in clasa a III-a, dictando in clasa a IV-a', () => {
    for (const i of ['comp:1', 'comp:2', 'func:1', 'dict:1', 'comp:3', 'comp:4', 'func:3', 'dict:2'])
      for (const p of r34Pages(i)) for (const b of p.blocks) if (b.t === 'write' || b.t === 'question') expect(b.ruling, i).toBe(r34SetLevel(i) === 'III' ? 'II' : 'dictando');
  });
});
