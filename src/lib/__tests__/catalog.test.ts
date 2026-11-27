import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalog, catalogItems, gameItems } from '@/lib/catalog';
import { entryConfig } from '@/lib/catalog/entry-config';
import { itemConfig, itemHref, itemParam, parseItemParam } from '@/lib/catalog/item-link';
import { CLASSES, KINDS, SUBJECTS, entryHref, filtersFromQuery, filtersToQuery, fold, matchesFilters, prepare, queryTokens, resultBand, search, type CatalogEntry } from '@/lib/catalog/search';
import { SHEET_PRESETS, presetById, presetConfig, presetHref } from '@/lib/curriculum/presets';
import { SCHOOL_LEVELS, isSchoolLevel, sheetCompetences } from '@/lib/curriculum/sheet';
import { isItemAllowed } from '@/lib/access';
import { buildWorksheetPages, countWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { isActivityItem } from '@/lib/worksheet/activities';
import { MATH_TYPES } from '@/lib/worksheet/math';
import { READING_LEVELS } from '@/lib/worksheet/reading';
import { CLR_SETS } from '@/lib/worksheet/clr';
import { MEM_SETS } from '@/lib/worksheet/mem';
import { EXPLORE_SETS } from '@/lib/worksheet/explore';
import { SUBJECT_SETS } from '@/lib/worksheet/subjects';
import { M34_SETS } from '@/lib/worksheet/m34';
import { R34_SETS } from '@/lib/worksheet/r34';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { ALLOWED_PROPS, safeProps } from '@/lib/analytics';
import sitemap from '@/app/sitemap';

const all = catalog();
const prepared = prepare(all);
const find = (q: string, f: Partial<Parameters<typeof search>[1]> = {}) => search(prepared, { q, ...f });
const byId = (id: string) => all.find((e) => e.id === id)!;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** What the generator page does with the address of a result (src/app/generator/page.tsx). */
function opened(href: string) {
  const params = new URLSearchParams(href.split('?')[1]);
  const level = params.get('clasa');
  const preset = presetById(params.get('fisa') ?? '');
  const item = preset ? null : parseItemParam(params.get('item'));
  if ((!preset && !item) || !isSchoolLevel(level)) return null;
  return { level, config: sanitizeConfig(preset ? presetConfig(preset, level) : itemConfig(item!, level)) };
}

describe('the catalogue behind „Caută fișe”', () => {
  it('has every item of the generator exactly once', () => {
    const items = catalogItems().map(itemParam);
    expect(new Set(items).size).toBe(items.length);
    const listed = all.filter((e) => e.item).map((e) => e.item!);
    expect(listed).toEqual(items);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    // every set of every family of „Jocuri”: the counts come from the families' own tables
    const games = gameItems();
    const count = (re: RegExp) => games.filter((i) => re.test(i)).length;
    expect(count(/^read:/)).toBe(sum(Object.values(READING_LEVELS).map((l) => l.length)));
    expect(count(/^(story|sign|note|msg|written|listen|book):/)).toBe(sum(Object.values(CLR_SETS)));
    expect(games.filter((i) => i.split(':')[0] in MEM_SETS).length).toBe(sum(Object.values(MEM_SETS)));
    expect(games.filter((i) => i.split(':')[0] in EXPLORE_SETS).length).toBe(sum(Object.values(EXPLORE_SETS)));
    expect(games.filter((i) => i.split(':')[0] in SUBJECT_SETS).length).toBe(sum(Object.values(SUBJECT_SETS)));
    expect(games.filter((i) => i.split(':')[0] in M34_SETS).length).toBe(sum(Object.values(M34_SETS).map((l) => l.length)));
    expect(games.filter((i) => i.split(':')[0] in R34_SETS).length).toBe(sum(Object.values(R34_SETS).map((l) => l.length)));
    for (const i of games) expect(isActivityItem(i), i).toBe(true);
    expect(all.filter((e) => e.item?.startsWith('math:'))).toHaveLength(MATH_TYPES.length);
    expect(all.filter((e) => e.item?.startsWith('letters:'))).toHaveLength(31);
    expect(all.length).toBeGreaterThan(600);
  });

  it('has every ready-made sheet exactly once: as its own entry, or carried by the item it opens', () => {
    for (const p of SHEET_PRESETS) {
      const own = all.filter((e) => e.preset === p.id);
      const carriers = all.filter((e) => e.presets?.includes(p.id));
      expect(own.length + (carriers.length ? 1 : 0), p.id).toBe(1);
      if (own.length) continue;
      // carried: in each of its classes, exactly one item opens with the very settings of the ready-made sheet
      const levels = p.levels ?? SCHOOL_LEVELS.map((l) => l.id).filter((l) => sheetCompetences(presetConfig(p, l), l).length);
      for (const level of levels) {
        const same = carriers.filter((e) => e.levels.includes(level) && JSON.stringify(entryConfig(e, level)) === JSON.stringify(presetConfig(p, level)));
        expect(same, `${p.id} ${level}`).toHaveLength(1);
      }
    }
    // the evaluations are entries of their own
    expect(all.filter((e) => e.kind === 'evaluare').map((e) => e.preset).sort()).toEqual(SHEET_PRESETS.filter((p) => p.evaluation).map((p) => p.id).sort());
  });

  it('every link opens settings that sanitizeConfig accepts and that make a sheet for that class', () => {
    for (const e of all) {
      expect(e.levels.length, e.id).toBeGreaterThan(0);
      for (const level of e.levels) {
        const href = entryHref(e, level);
        const open = opened(href);
        expect(open, href).not.toBeNull();
        const { config } = open!;
        // nothing is dropped or changed on the way in
        expect(config, href).toEqual(sanitizeConfig(entryConfig(e, level)));
        expect(config.selectedItems, href).toEqual(entryConfig(e, level)!.selectedItems);
        expect(config.curriculumLevel, href).toBe(level);
        for (const i of config.selectedItems) expect(itemFitsCategory(i, config.category), `${href}: ${i}`).toBe(true);
        expect(hasContent(config, 'full'), href).toBe(true);
        expect(countWorksheetPages(config, 'full'), href).toBeGreaterThanOrEqual(1);
      }
      // a class the sheet is not listed for still opens it (the chosen filter never breaks a link)
      expect(entryHref(e, 'IV')).toContain(`clasa=${e.levels.includes('IV') ? 'IV' : e.levels[0]}`);
    }
  }, 30_000);

  it('builds a real page for every entry in its first class', () => {
    for (const e of all) {
      const pages = buildWorksheetPages(entryConfig(e, e.levels[0])!, 'full');
      expect(pages.length, e.id).toBeGreaterThanOrEqual(1);
      expect(pages[0].ops.length, e.id).toBeGreaterThan(3);
    }
  }, 30_000);

  it('the addresses are the ones the site already uses', () => {
    const preset = SHEET_PRESETS.find((p) => p.id === 'litere-tipar')!;
    expect(entryHref(byId('fisa:litere-tipar'), 'CP')).toBe(presetHref(preset, 'CP'));
    expect(entryHref(byId('games:read:match:4'), 'I')).toBe(itemHref({ category: 'games', item: 'read:match:4' }, 'I'));
    expect(entryHref(byId('games:read:match:4'))).toBe('/generator?item=games%3Aread%3Amatch%3A4&clasa=I');
    // the clock opens through its ready-made sheet, tuned for the class
    expect(entryHref(byId('math:clock'), 'II')).toBe('/generator?fisa=mate-ceas&clasa=II');
    expect(opened(entryHref(byId('math:clock'), 'II'))!.config.mathClock).toBe('five');
  });

  it('unknown items and classes open nothing', () => {
    for (const bad of ['', 'games', 'games:', ':add', 'jocuri:first:1', 'templates:x', `games:${'x'.repeat(60)}`]) expect(parseItemParam(bad), bad).toBeNull();
    for (const unknown of ['games:read:match:99', 'games:nothing:1', 'math:calculus', 'shapes:blob', 'numbers:abc', 'prewrite:spiral']) {
      const ref = parseItemParam(unknown)!;
      expect(sanitizeConfig(itemConfig(ref, 'I')).selectedItems, unknown).toEqual([]);
    }
    expect(opened('/generator?item=games:first:1&clasa=VII')).toBeNull();
  });

  it('a letter opens printed up to clasa pregătitoare and handwritten from clasa I', () => {
    expect(itemConfig({ category: 'letters', item: 'Ș' }, 'CP')).toMatchObject({ selectedItems: ['Ș'], letterMode: 'uppercase', script: 'print' });
    expect(itemConfig({ category: 'letters', item: 'Ș' }, 'I')).toMatchObject({ selectedItems: ['Șș'], letterMode: 'paired', script: 'cursive' });
    expect(byId('letters:Ș').codes).toEqual({ presc: ['D.3.4'], CP: ['4.1'], I: ['4.1'] });
  });

  it('free or paid is what the generator itself decides (access.ts)', () => {
    for (const e of all) {
      for (const level of e.levels) {
        const config = entryConfig(e, level)!;
        const allowed = config.selectedItems.every((i) => isItemAllowed(i, config.category, 'free'));
        expect(e.free, `${e.id} ${level}`).toBe(allowed);
        // a free sheet really prints on the free plan
        if (e.free) expect(hasContent(config, 'free') && countWorksheetPages(config, 'free') >= 1, `${e.id} ${level}`).toBe(true);
      }
    }
    expect(byId('letters:A').free).toBe(true);
    expect(byId('letters:M').free).toBe(false);
    expect(byId('games:read:match:1').free).toBe(true);
    expect(byId('games:read:match:2').free).toBe(false);
    expect(byId('math:frac').free).toBe(false);
    expect(all.filter((e) => e.free).length).toBeGreaterThan(100);
  });

  it('„cu răspunsuri” is true exactly when the sheet gets a page with answers', () => {
    for (const e of all) {
      const config = entryConfig(e, e.levels[0])!;
      // an evaluation always ends with its answers; the others get the page when „Pagină cu răspunsuri” is ticked
      const more = countWorksheetPages({ ...config, mathAnswers: true }, 'full') > countWorksheetPages({ ...config, mathAnswers: false }, 'full');
      expect(more || !!config.evaluation, e.id).toBe(e.answers);
    }
    expect(byId('games:dots:star').answers).toBe(false);
    expect(byId('games:read:draw:1').answers).toBe(false);
    expect(byId('letters:A').answers).toBe(false);
    expect(byId('games:maze:1').answers).toBe(true);
  }, 30_000);

  it('classes and codes are the ones the sheet prints', () => {
    const order = SCHOOL_LEVELS.map((l) => l.id);
    for (const e of all) {
      expect([...e.levels].sort((a, b) => order.indexOf(a) - order.indexOf(b)), e.id).toEqual(e.levels);
      for (const level of order) {
        const codes = e.levels.includes(level) ? sheetCompetences(entryConfig(e, level)!, level).map((r) => (r.programme === 'et-presc' ? `${r.domain}.${r.code}` : r.code)) : [];
        expect(e.codes[level] ?? [], `${e.id} ${level}`).toEqual(codes);
      }
      expect(SUBJECTS.some((s) => s.id === e.subject), e.id).toBe(true);
      expect(KINDS.some((k) => k.id === e.kind), e.id).toBe(true);
      expect(e.family.length, e.id).toBeGreaterThan(3);
    }
    // a set written for one class is listed in that class
    expect(byId('games:read:text:20').levels).toEqual(['II']);
    expect(byId('games:lect:4').levels).toEqual(['IV']);
    expect(byId('math:add').levels).toEqual(['CP', 'I', 'II', 'III', 'IV']);
    // every subject and every class has sheets
    for (const s of SUBJECTS) expect(all.some((e) => e.subject === s.id), s.id).toBe(true);
    for (const c of CLASSES) expect(all.filter((e) => e.levels.includes(c.id)).length, c.id).toBeGreaterThan(20);
  });

  it('titles and descriptions: Romanian with comma-below ș and ț, no cedilla, nothing empty or internal', () => {
    const titles = new Set<string>();
    for (const e of all) {
      for (const text of [e.title, e.text ?? '', e.family]) expect(text, e.id).not.toMatch(/[şţŞŢ]/);
      expect(e.title.trim().length, e.id).toBeGreaterThan(3);
      // never the internal id ("read:match:4", "first:1")
      expect(e.title, e.id).not.toMatch(/^[a-z0-9]+:[a-z0-9:]+$/);
      expect(e.title, e.id).not.toContain('undefined');
      // two results never look the same
      const key = `${e.title}|${e.levels.join(',')}`;
      expect(titles.has(key), `${e.id}: „${e.title}” twice`).toBe(false);
      titles.add(key);
      if (e.words) expect(e.words, e.id).toBe(fold(e.words));
    }
  });
});

describe('searching', () => {
  it('does not care about diacritics, cedillas or capitals', () => {
    expect(fold('Școală')).toBe('scoala');
    expect(fold('şcoală')).toBe('scoala');
    expect(fold('ŢARĂ ÎNTÂI')).toBe('tara intai');
    const a = find('împărțiri').map((e) => e.id);
    expect(a.length).toBeGreaterThan(0);
    expect(find('impartiri').map((e) => e.id)).toEqual(a);
    expect(find('ÎMPĂRŢIRI').map((e) => e.id)).toEqual(a);
    expect(find('  Impartiri ').map((e) => e.id)).toEqual(a);
  });

  it('finds sheets by title, family, description, class words and words printed on the sheet', () => {
    expect(find('silabe').slice(0, 12).some((e) => e.id === 'games:split:1')).toBe(true);
    expect(find('silabe').every((e) => /silab/.test(fold(`${e.title} ${e.text} ${e.family} ${e.words}`)))).toBe(true);
    // „adunare”, „adunari”, „adunări”: the same sheets first
    for (const q of ['adunari', 'adunări', 'adunare']) expect(find(q)[0].id, q).toBe('math:add');
    expect(find('toamna').some((e) => e.id === 'games:season:5' || /toamna/.test(fold(e.title)))).toBe(true);
    expect(find('toamnă').map((e) => e.id)).toEqual(find('toamna').map((e) => e.id));
    expect(find('toamna').length).toBeGreaterThanOrEqual(3);
    // by family and by subject
    expect(find('explorarea mediului').length).toBeGreaterThan(50);
    expect(find('ortograme')[0].family).toContain('III–IV');
    // filler words do not empty the results: „fișe de adunare” is a search for „adunare”
    expect(queryTokens('Fișe de lucru cu adunări')).toEqual(['adunari']);
    expect(find('fișe de adunare').map((e) => e.id)).toEqual(find('adunare').map((e) => e.id));
    expect(find('fise').length).toBe(all.length);
    // the title counts more than a word somewhere on the sheet
    expect(find('labirint')[0].title).toMatch(/^Labirint/);
    expect(find('evaluare').slice(0, 3).every((e) => e.kind === 'evaluare')).toBe(true);
    // nothing for nonsense
    expect(find('xyzqw')).toEqual([]);
  });

  it('finds sheets by competence code, as teachers write it', () => {
    const hits = find('1.4');
    expect(hits.length).toBeGreaterThan(5);
    for (const e of hits) expect(Object.values(e.codes).flat(), e.id).toContain('1.4');
    // with a class chosen, the code of that class
    const cp = find('1.4', { level: 'CP' });
    expect(cp.length).toBeGreaterThan(0);
    for (const e of cp) expect(e.codes.CP, e.id).toContain('1.4');
    expect(cp.some((e) => e.id === 'math:add')).toBe(true);
    // preschool: „D.3.2”, in any case
    expect(find('d.3.2').length).toBeGreaterThan(5);
    expect(find('D.3.2').map((e) => e.id)).toEqual(find('d.3.2').map((e) => e.id));
    expect(find('9.9')).toEqual([]);
  });

  it('filters combine with AND, with each other and with the words', () => {
    const free1 = find('', { level: 'I', free: true });
    expect(free1.length).toBeGreaterThan(10);
    for (const e of free1) expect(e.levels.includes('I') && e.free, e.id).toBe(true);
    expect(free1.length).toBe(all.filter((e) => e.levels.includes('I') && e.free).length);
    const narrow = find('citeste', { level: 'II', subject: 'romana', kind: 'fisa', free: true, answers: true });
    expect(narrow.length).toBeGreaterThan(0);
    for (const e of narrow) {
      expect(e.levels).toContain('II');
      expect(e.subject).toBe('romana');
      expect(e.kind).toBe('fisa');
      expect(e.free && e.answers).toBe(true);
    }
    // each filter only ever narrows
    const base = find('numere');
    for (const f of [{ level: 'II' }, { subject: 'matematica' }, { kind: 'fisa' }, { free: true }, { answers: true }] as const) {
      const part = find('numere', f);
      expect(part.length).toBeLessThanOrEqual(base.length);
      for (const e of part) expect(base, e.id).toContain(e);
      expect(part).toEqual(base.filter((e) => matchesFilters(e, f)));
    }
    expect(find('', { kind: 'evaluare', level: 'presc' }).map((e) => e.id)).toEqual(['fisa:evaluare-gradinita']);
    expect(find('', { subject: 'engleza' }).every((e) => e.family === 'Limba engleză')).toBe(true);
    // without words and filters: everything, in the catalogue's order
    expect(find('')).toEqual(all);
  });

  it('a search can be shared: the address carries it, unknown values are ignored', () => {
    const f = { q: 'silabe', level: 'I', subject: 'romana', kind: 'fisa', free: true, answers: true } as const;
    expect(filtersToQuery(f)).toBe('q=silabe&clasa=I&materie=romana&tip=fisa&gratuite=1&raspunsuri=1');
    expect(filtersFromQuery(new URLSearchParams(filtersToQuery(f)))).toEqual(f);
    expect(filtersToQuery({ q: '  ' })).toBe('');
    expect(filtersFromQuery(new URLSearchParams('clasa=cp&materie=fizica&tip=x&gratuite=da&q=' + 'a'.repeat(200)))).toEqual({ q: 'a'.repeat(80), level: 'CP' });
  });

  it('analytics get the size of the result and the filters, never the words', () => {
    expect([0, 1, 5, 6, 20, 21, 100, 101].map(resultBand)).toEqual(['0', '1-5', '1-5', '6-20', '6-20', '21-100', '21-100', '100plus']);
    for (const key of ['results', 'typed', 'level', 'subject', 'kind', 'free', 'answers']) expect(ALLOWED_PROPS.has(key), key).toBe(true);
    expect(ALLOWED_PROPS.has('q')).toBe(false);
    expect(ALLOWED_PROPS.has('query')).toBe(false);
    expect(safeProps({ results: resultBand(12), typed: true, level: 'cp', subject: 'romana', q: 'numele copilului' })).toEqual({ results: '6-20', typed: true, level: 'cp', subject: 'romana' });
    const page = readFileSync('src/components/search/catalog-search.tsx', 'utf8');
    for (const call of page.match(/track\([^)]*\)/g) ?? []) expect(call).not.toMatch(/\bq\b|query/);
  });
});

describe('/cauta on the site', () => {
  it('is in the sitemap, the footer, the menu and on the home page', () => {
    expect(sitemap().some((e) => e.url.endsWith('/cauta'))).toBe(true);
    expect(readFileSync('src/components/layout/footer.tsx', 'utf8')).toContain('href="/cauta"');
    expect(readFileSync('src/components/layout/navbar.tsx', 'utf8')).toContain('/cauta');
    expect(readFileSync('src/app/page.tsx', 'utf8')).toContain('/cauta');
  });

  it('result pages with a search in the address are not indexed; the page itself is', () => {
    const config = readFileSync('next.config.mjs', 'utf8');
    const rule = config.split('\n').find((l) => l.includes("source: '/cauta'")) ?? '';
    for (const key of ['q', 'clasa', 'materie', 'tip', 'gratuite', 'raspunsuri']) expect(rule, key).toContain(`'${key}'`);
    expect(rule).toContain("value: 'noindex, follow'");
    // … and those are all the parameters a search can put in the address
    expect(Array.from(new URLSearchParams(filtersToQuery({ q: 'x', level: 'I', subject: 'romana', kind: 'fisa', free: true, answers: true })).keys())).toEqual(['q', 'clasa', 'materie', 'tip', 'gratuite', 'raspunsuri']);
    const page = readFileSync('src/app/cauta/page.tsx', 'utf8');
    expect(page).toContain("path: '/cauta'");
    expect(page).not.toContain('noindex: true');
  });
});

export type { CatalogEntry };
