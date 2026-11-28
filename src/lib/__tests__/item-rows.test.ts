import { beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { sanitizeConfig } from '@/stores/sanitize-config';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { buildWorksheetPages, countWorksheetPages, rowItems } from '@/lib/worksheet/layout';
import { pruneRowsByItem, rowsFor } from '@/lib/worksheet/item-rows';
import { configForSaving } from '@/lib/worksheet/saved';
import { createHomeworkToken, homeworkKeys, verifyHomeworkToken } from '@/lib/homework/token';
import { homeworkPages } from '@/lib/homework/pages';
import { pageToSvg } from '@/lib/glyphs/backends/svg';

/** „Rânduri pentru fiecare”: each chosen item may have its own number of rows (config.rowsByItem). */

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, ...over });
const counts = (c: WorksheetConfig) => {
  const out: Record<string, number> = {};
  for (const r of rowItems(c, 'full')) out[r.item] = (out[r.item] ?? 0) + 1;
  return out;
};
const fp = (c: WorksheetConfig) => buildWorksheetPages(c, 'full').map((p) => createHash('sha256').update(pageToSvg(p)).digest('hex'));

describe('sanitizeConfig: rowsByItem', () => {
  it('clamps to 1–10, rounds, drops items not chosen and values that are not numbers', () => {
    const c = sanitizeConfig({
      ...DEFAULT_CONFIG,
      selectedItems: ['A', 'Ă', 'Ș'],
      rowsByItem: JSON.parse('{"A": 40, "Ă": 0, "Ș": 2.6, "B": 3, "M": "x", "__proto__": 4}'),
    });
    expect(c.rowsByItem).toEqual({ A: 10, Ă: 1, Ș: 3 });
  });

  it('keys follow the items exactly as chosen: paired letters, digits, shapes, graphic exercises', () => {
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, letterMode: 'paired', selectedItems: ['Șș', 'Aa'], rowsByItem: { Șș: 4, Ș: 2 } }).rowsByItem).toEqual({ Șș: 4 });
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, category: 'numbers', selectedItems: ['7', '12'], rowsByItem: { 12: 5 } }).rowsByItem).toEqual({ 12: 5 });
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, category: 'shapes', selectedItems: ['circle'], rowsByItem: { circle: 3 } }).rowsByItem).toEqual({ circle: 3 });
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, category: 'prewrite', selectedItems: ['zigzag'], rowsByItem: { zigzag: 6 } }).rowsByItem).toEqual({ zigzag: 6 });
  });

  it('nothing for math and games, nothing left → no field; a broken value is ignored', () => {
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['add'], rowsByItem: { add: 3 } }).rowsByItem).toBeUndefined();
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, category: 'games', selectedItems: ['find:A'], rowsByItem: { 'find:A': 3 } }).rowsByItem).toBeUndefined();
    expect('rowsByItem' in sanitizeConfig({ ...DEFAULT_CONFIG, selectedItems: ['A'], rowsByItem: { B: 3 } })).toBe(false);
    for (const bad of [null, 5, 'A', ['A'], []]) expect(sanitizeConfig({ ...DEFAULT_CONFIG, selectedItems: ['A'], rowsByItem: bad }).rowsByItem).toBeUndefined();
    // a config without it comes out without it (and unchanged)
    const plain = sanitizeConfig({ ...DEFAULT_CONFIG, selectedItems: ['A', 'B'] });
    expect('rowsByItem' in plain).toBe(false);
    expect(sanitizeConfig(plain)).toEqual(plain);
  });

  it('the count for all goes up to 10 too', () => {
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, repetitionsPerItem: 8 }).repetitionsPerItem).toBe(8);
    expect(sanitizeConfig({ ...DEFAULT_CONFIG, repetitionsPerItem: 30 }).repetitionsPerItem).toBe(10);
  });

  it('a long map is limited with the items (120)', () => {
    const items = Array.from({ length: 200 }, (_, i) => String(i));
    const c = sanitizeConfig({ ...DEFAULT_CONFIG, category: 'numbers', selectedItems: items, rowsByItem: Object.fromEntries(items.map((i) => [i, 2])) });
    expect(Object.keys(c.rowsByItem ?? {}).length).toBeLessThanOrEqual(120);
    expect(Object.keys(c.rowsByItem ?? {}).every((k) => c.selectedItems.includes(k))).toBe(true);
  });
});

describe('layout: rows of each item', () => {
  it('an item without a count gets the count for all', () => {
    const c = cfg({ selectedItems: ['A', 'Ă', 'B'], repetitionsPerItem: 2, rowsByItem: { Ă: 4 } });
    expect(rowsFor(c, 'A')).toBe(2);
    expect(rowsFor(c, 'Ă')).toBe(4);
    expect(counts({ ...c, fillPage: false })).toEqual({ A: 2, Ă: 4, B: 2 });
    // rows stay in the order of the items
    expect(rowItems({ ...c, fillPage: false }, 'full').map((r) => r.item)).toEqual(['A', 'A', 'Ă', 'Ă', 'Ă', 'Ă', 'B', 'B']);
  });

  it('words keep the count for all', () => {
    const c = cfg({ selectedItems: ['A'], customWords: ['MAMA'], repetitionsPerItem: 2, rowsByItem: { A: 5 } });
    expect(counts(c)).toEqual({ A: 5, MAMA: 2 });
  });

  it('digits, shapes and graphic exercises', () => {
    expect(counts(cfg({ category: 'numbers', selectedItems: ['3', '12'], rowsByItem: { 12: 3 } }))).toEqual({ 3: 1, 12: 3 });
    expect(counts(cfg({ category: 'shapes', selectedItems: ['circle', 'star'], rowsByItem: { star: 2 } }))).toEqual({ circle: 1, star: 2 });
    expect(counts(cfg({ category: 'prewrite', selectedItems: ['zigzag', 'waves'], rowsByItem: { waves: 3 } }))).toEqual({ zigzag: 1, waves: 3 });
  });

  it('pages are added: 2 letters, one raised to 4 rows (4 rows a page, no filling) → 2 pages', () => {
    const base = cfg({ selectedItems: ['A', 'B'], rowsPerPage: 4, fillPage: false });
    expect(countWorksheetPages(base, 'full')).toBe(1);
    expect(countWorksheetPages({ ...base, rowsByItem: { B: 4 } }, 'full')).toBe(2);
    const pages = buildWorksheetPages({ ...base, rowsByItem: { B: 4 } }, 'full');
    expect(pages.some((p) => p.ops.some((o) => o.t === 'text' && o.text === 'Pagina 2 din 2'))).toBe(true);
    // with „Umple pagina” the last page is still filled up; the count is the same
    expect(countWorksheetPages({ ...base, fillPage: true, rowsByItem: { B: 4 } }, 'full')).toBe(2);
    expect(countWorksheetPages({ ...base, rowsByItem: { A: 10, B: 10 } }, 'full')).toBe(5);
  });

  it('workbook (a page for each): an item with 3 rows gets 3 pages, as the count for all always did', () => {
    const c = cfg({ letterMode: 'paired', selectedItems: ['Aa', 'Bb'], pagePerItem: true, fillPage: false });
    expect(countWorksheetPages(c, 'full')).toBe(2);
    expect(countWorksheetPages({ ...c, rowsByItem: { Bb: 3 } }, 'full')).toBe(4);
    expect(countWorksheetPages({ ...c, repetitionsPerItem: 3 }, 'full')).toBe(6);
  });

  it('an item not on the free plan stays off the sheet whatever its count', () => {
    expect(counts(cfg({ selectedItems: ['A', 'M'], rowsByItem: { M: 5 }, fillPage: false }))).toEqual({ A: 1, M: 5 });
    expect(rowItems(cfg({ selectedItems: ['A', 'M'], rowsByItem: { M: 5 }, fillPage: false }), 'free').map((r) => r.item)).toEqual(['A']);
  });

  it('no map, an empty map, or every count equal to the count for all: the same sheet, byte for byte', () => {
    const c = cfg({ letterMode: 'paired', selectedItems: ['Aa', 'Șș', 'Mm'], customWords: ['toamna'], repetitionsPerItem: 2 });
    const before = fp(c);
    expect(fp({ ...c, rowsByItem: {} })).toEqual(before);
    expect(fp({ ...c, rowsByItem: { Aa: 2, Șș: 2, Mm: 2 } })).toEqual(before);
    expect(fp({ ...c, rowsByItem: { Zz: 7 } })).toEqual(before);
  });
});

describe('store', () => {
  const s = () => useWorksheetStore.getState();
  beforeEach(() => s().resetConfig());

  it('a count for one item; removing the item drops it; put back, it starts from the count for all', () => {
    s().toggleItem('A');
    s().toggleItem('Ă');
    s().setItemRows('Ă', 4);
    expect(s().config.rowsByItem).toEqual({ Ă: 4 });
    s().setItemRows('Ă', 99);
    expect(s().config.rowsByItem).toEqual({ Ă: 10 });
    s().setItemRows('B', 3); // not chosen: ignored
    expect(s().config.rowsByItem).toEqual({ Ă: 10 });
    s().toggleItem('Ă');
    expect('rowsByItem' in s().config).toBe(false);
    s().toggleItem('Ă');
    expect(rowsFor(s().config, 'Ă')).toBe(1);
  });

  it('„Toate la fel” sets the count for all and drops the items’ own', () => {
    s().addItems(['A', 'B', 'C']);
    s().setItemRows('B', 5);
    s().setRepetitionsPerItem(3);
    expect(s().config.repetitionsPerItem).toBe(3);
    expect('rowsByItem' in s().config).toBe(false);
    s().setRepetitionsPerItem(12);
    expect(s().config.repetitionsPerItem).toBe(10);
  });

  it('emptying, another category or letter mode drop the counts; handwriting keeps them on the paired letters', () => {
    s().addItems(['A', 'B']);
    s().setItemRows('A', 3);
    s().setScript('cursive');
    expect(s().config.selectedItems).toEqual(['Aa', 'Bb']);
    expect(s().config.rowsByItem).toEqual({ Aa: 3 });
    s().removeAllItems();
    expect('rowsByItem' in s().config).toBe(false);
    s().addItems(['Aa']);
    s().setItemRows('Aa', 2);
    s().setCategory('numbers');
    expect('rowsByItem' in s().config).toBe(false);
  });

  it('„Altă variantă” keeps the counts', () => {
    s().addItems(['A', 'B']);
    s().setItemRows('B', 4);
    s().newVariant();
    expect(s().config.variantSeed).toBe(2);
    expect(s().config.rowsByItem).toEqual({ B: 4 });
  });

  it('a config handed over with setState (project, saved sheet) is sanitized, counts kept', () => {
    useWorksheetStore.setState({ config: { ...DEFAULT_CONFIG, selectedItems: ['A'], rowsByItem: { A: 22, B: 3 } } });
    expect(s().config.rowsByItem).toEqual({ A: 10 });
  });
});

describe('carried with the sheet', () => {
  const c = sanitizeConfig({ ...DEFAULT_CONFIG, selectedItems: ['A', 'Ă', 'Ș'], childName: 'Ana', customWords: ['Ana'], rowsByItem: { Ă: 4, Ș: 2 } });

  it('saving keeps the counts (the name goes, as always)', () => {
    const saved = configForSaving(c);
    expect(saved.rowsByItem).toEqual({ Ă: 4, Ș: 2 });
    expect(sanitizeConfig(JSON.parse(JSON.stringify(saved))).rowsByItem).toEqual({ Ă: 4, Ș: 2 });
  });

  it('the homework link round-trips the counts and prints the same rows', () => {
    const key = homeworkKeys({ HOMEWORK_LINK_SECRET: 'test-secret-0123456789abcdef' })[0];
    const now = Date.UTC(2026, 10, 24, 12);
    const token = createHomeworkToken({ kind: 'sheet', config: configForSaving(c), tier: 'full', expiresAt: now + 86_400_000 } as never, key);
    const res = verifyHomeworkToken(token, [key], now);
    if (!res.ok || res.homework.kind !== 'sheet') throw new Error('link');
    expect(res.homework.config.rowsByItem).toEqual({ Ă: 4, Ș: 2 });
    const pages = homeworkPages(res.homework, '');
    expect(pages.length).toBe(countWorksheetPages({ ...configForSaving(c) }, 'full'));
  });

  it('pruneRowsByItem keeps only chosen items', () => {
    expect(pruneRowsByItem({ category: 'letters', selectedItems: ['A'], rowsByItem: { A: 2, B: 3 } }).rowsByItem).toEqual({ A: 2 });
    expect('rowsByItem' in pruneRowsByItem({ category: 'math', selectedItems: ['add'], rowsByItem: { add: 2 } })).toBe(false);
  });
});
