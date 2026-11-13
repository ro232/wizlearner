import { describe, expect, it } from 'vitest';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { sanitizeBookConfig, sanitizeGroupProject, sanitizeNameProject, sanitizeWorkbookProject } from '@/components/projects/sanitize-project';
import { DEFAULT_CONFIG } from '@/types';
import { PRESETS } from '@/lib/worksheet/presets';
import { SEO_SHEETS } from '@/lib/seo/catalog';
import { childSheetConfig } from '@/lib/worksheet/group';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { MATH_TYPES } from '@/lib/worksheet/math';
import { COUNT_RANGES, DOT_SHAPES, isActivityItem } from '@/lib/worksheet/activities';
import { buildBookPages, DEFAULT_BOOK_CONFIG } from '@/lib/book/interior';
import { parseGroupDraft, parseGroups } from '@/lib/saved-groups';

const plain = (v: unknown) => JSON.parse(JSON.stringify(v));
const GARBAGE: unknown[] = [null, undefined, 42, 'x', true, [], [1, 2], {}, () => 1, NaN, { a: { b: null } }];

describe('sanitizeConfig', () => {
  it('leaves every valid sheet exactly as it is', () => {
    const valid = [DEFAULT_CONFIG, ...PRESETS.map((p) => p.config), ...SEO_SHEETS.map((s) => s.config), childSheetConfig('Ana-Maria Popescu', { themeId: 'toamna', letters: ['A', 'M'], letterMode: 'uppercase', difficulty: 'advanced', script: 'cursive' })];
    expect(valid.length).toBeGreaterThan(50);
    for (const config of valid) expect(plain(sanitizeConfig(config))).toEqual(plain(config));
  });

  it('turns anything into a complete configuration', () => {
    for (const g of GARBAGE) expect(sanitizeConfig(g)).toEqual(DEFAULT_CONFIG);
  });

  it('survives the values that used to break the generator at every visit', () => {
    const c = sanitizeConfig({ customWords: null, selectedItems: null, childName: null });
    expect(c.customWords).toEqual([]);
    expect(c.selectedItems).toEqual([]);
    expect(c.childName).toBe('');
    const d = sanitizeConfig({ category: 'nope', selectedItems: [1, {}, 'A', 'A', 'add', null], rowsPerPage: 'x', customWords: 'abc', wordPictures: 5, tracingVisibility: 99, repetitionsPerItem: -3, mathRange: 7, fontStyle: 'neon', showGuideLines: 'yes', script: 'italic' });
    expect(d.category).toBe('letters');
    expect(d.selectedItems).toEqual(['A']);
    expect(d.rowsPerPage).toBe(DEFAULT_CONFIG.rowsPerPage);
    expect(d.customWords).toEqual([]);
    expect(d.wordPictures).toBeUndefined();
    expect(d.tracingVisibility).toBe(10);
    expect(d.repetitionsPerItem).toBe(1);
    expect(d.mathRange).toBeUndefined();
    expect(d.fontStyle).toBe('dashed');
    expect(d.showGuideLines).toBe(true);
    expect(d.script).toBeUndefined();
  });

  it('whatever comes in, the result can be drawn', () => {
    const fields = Object.keys(DEFAULT_CONFIG).concat(['script', 'wordPictures', 'mathRange', 'mathSeed', 'pagePerItem', 'itemWords', 'traceDensity']);
    const junk: unknown[] = [null, undefined, 0, -1, 1e9, NaN, '', 'x', 'math', 'games', 'A', [], [null], ['A', 7, 'find:A', 'add', 'circle'], {}, { A: 1 }, true, false];
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 400; i++) {
      const raw: Record<string, unknown> = { ...DEFAULT_CONFIG };
      for (const f of fields) if (rnd() < 0.4) raw[f] = junk[Math.floor(rnd() * junk.length)];
      const config = sanitizeConfig(raw);
      expect(Array.isArray(config.selectedItems) && Array.isArray(config.customWords)).toBe(true);
      for (const item of config.selectedItems) expect(itemFitsCategory(item, config.category)).toBe(true);
      for (const tier of ['free', 'full'] as const) expect(buildWorksheetPages(config, tier).length, JSON.stringify(raw)).toBeGreaterThan(0);
    }
  });

  it('knows which items belong to which category', () => {
    for (const t of MATH_TYPES) {
      expect(itemFitsCategory(t, 'math')).toBe(true);
      expect(itemFitsCategory(t, 'letters'), t).toBe(false);
    }
    const games = ['find:A', 'find:Ș', ...COUNT_RANGES, ...DOT_SHAPES.map((d) => `dots:${d}`), 'dots:nope', 'count:7', 'find:', 'A', 'add'];
    for (const g of games) expect(itemFitsCategory(g, 'games'), g).toBe(isActivityItem(g));
    for (const ok of ['A', 'ș', 'Aa', 'Șș', 'Ââ']) expect(itemFitsCategory(ok, 'letters'), ok).toBe(true);
    for (const no of ['add', 'cmp', 'circle', 'zigzag', 'findA', '12', 'AB', 'find:A', '']) expect(itemFitsCategory(no, 'letters'), no).toBe(false);
    expect(itemFitsCategory('12', 'numbers')).toBe(true);
    expect(itemFitsCategory('circle', 'shapes')).toBe(true);
    expect(itemFitsCategory('zigzag', 'prewrite')).toBe(true);
    expect(itemFitsCategory('zigzag', 'shapes')).toBe(false);
  });
});

describe('projects reopened from the account', () => {
  it('a book with unknown values falls back to a book that can be built', () => {
    for (const g of [...GARBAGE, { trim: 'nope', paper: 7, title: null, numbersMax: 'x', year: 'abc', alphabet: 'zz', variant: 3 }]) {
      const config = sanitizeBookConfig(g);
      expect(buildBookPages(config).length).toBeGreaterThan(0);
      expect(typeof config.title).toBe('string');
    }
    expect(sanitizeBookConfig({ ...DEFAULT_BOOK_CONFIG, script: 'cursive', trim: 'a4' })).toEqual({ ...DEFAULT_BOOK_CONFIG, script: 'cursive', trim: 'a4' });
    expect(sanitizeBookConfig({ watermark: true }).watermark).toBe(false);
  });

  it('workbook, name workbook and group settings', () => {
    expect(sanitizeWorkbookProject({ book: 'upper', level: 'nope', withWords: 'x' })).toEqual({ book: 'upper', level: 'beginner', withWords: true, name: '' });
    expect(sanitizeWorkbookProject({ book: 'zzz' })?.book).toBe('upper');
    expect(sanitizeNameProject({ name: 42, mode: 'x', kind: 'book' })).toEqual({ name: '', mode: 'paired', script: 'print', kind: 'book' });
    expect(sanitizeGroupProject({ themeId: 5, letters: 'ZX', difficulty: 'nope' })).toEqual({ themeId: undefined, letters: [], letterMode: 'uppercase', script: 'print', difficulty: 'beginner', withFind: true });
    expect(sanitizeGroupProject({ themeId: 'familia', letters: ['Z', 'X', 'Q', 7], letterMode: 'paired', script: 'cursive', difficulty: 'advanced', withFind: false })).toEqual({ themeId: 'familia', letters: ['Z', 'X'], letterMode: 'paired', script: 'cursive', difficulty: 'advanced', withFind: false });
    for (const g of [null, undefined, 3, 'x']) {
      expect(sanitizeWorkbookProject(g)).toBeNull();
      expect(sanitizeNameProject(g)).toBeNull();
      expect(sanitizeGroupProject(g)).toBeNull();
    }
  });

  it('saved groups and the working draft are read defensively', () => {
    expect(parseGroups('not json')).toEqual([]);
    expect(parseGroups('{"a":1}')).toEqual([]);
    expect(parseGroups(JSON.stringify([null, 3, { id: 'g1', namesText: 'Ana', levels: { Ana: 'advanced', Luca: 'zzz' } }, { id: 5 }]))).toEqual([{ id: 'g1', name: '', namesText: 'Ana', levels: { Ana: 'advanced' } }]);
    expect(parseGroupDraft(null)).toBeNull();
    expect(parseGroupDraft('{')).toBeNull();
    expect(parseGroupDraft('[]')).toBeNull();
    const d = parseGroupDraft(JSON.stringify({ namesText: 'Ana\nLuca', week: 'x', letters: [1, 'A'], levels: [], script: 'cursive', difficulty: 'zz' }));
    expect(d).toMatchObject({ namesText: 'Ana\nLuca', week: null, letters: ['A'], levels: {}, script: 'cursive', difficulty: 'beginner', letterMode: 'uppercase', withFind: true, groupName: '' });
  });
});
