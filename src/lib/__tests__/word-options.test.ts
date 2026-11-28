import { beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { MAX_WORDS, sanitizeConfig } from '@/stores/sanitize-config';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { buildWorksheetPages, countWorksheetPages, glyphsForWord, rowItems } from '@/lib/worksheet/layout';
import { buildTraceRow, cellPad, itemWidth, DEFAULT_ROW_STYLE, type RowStyle } from '@/lib/worksheet/rows';
import { configForSaving } from '@/lib/worksheet/saved';
import { createHomeworkToken, homeworkKeys, verifyHomeworkToken } from '@/lib/homework/token';
import { homeworkPages, nameRowIndex } from '@/lib/homework/pages';
import { pageToSvg } from '@/lib/glyphs/backends/svg';
import type { DrawOp } from '@/lib/glyphs/types';

/**
 * The options of „Cuvinte de trasat”: „Rând liber după cuvânt” (config.wordCopyRow) and
 * „Umple rândul” (config.wordFillRow).
 */

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, ...over });
const fp = (c: WorksheetConfig) => buildWorksheetPages(c, 'full').map((p) => createHash('sha256').update(pageToSvg(p)).digest('hex'));
const kinds = (c: WorksheetConfig) => rowItems(c, 'full').map((r) => (r.blank ? '_' : r.word ? `w:${r.item}` : r.item));

describe('sanitizeConfig: the word options', () => {
  it('kept only when true; anything else leaves the field out', () => {
    const on = sanitizeConfig({ ...DEFAULT_CONFIG, wordCopyRow: true, wordFillRow: true });
    expect(on.wordCopyRow).toBe(true);
    expect(on.wordFillRow).toBe(true);
    for (const v of [false, 'true', 1, null, {}]) {
      const c = sanitizeConfig({ ...DEFAULT_CONFIG, wordCopyRow: v, wordFillRow: v });
      expect('wordCopyRow' in c).toBe(false);
      expect('wordFillRow' in c).toBe(false);
    }
    expect('wordCopyRow' in sanitizeConfig(DEFAULT_CONFIG)).toBe(false);
  });
});

describe('„Rând liber după cuvânt”', () => {
  const base = { selectedItems: ['M'], customWords: ['mama', 'Ana'], childName: 'Ana' };

  it('an empty row after every word row (the name too), letters untouched', () => {
    expect(kinds(cfg(base))).toEqual(['M', 'w:MAMA', 'w:ANA']);
    expect(kinds(cfg({ ...base, wordCopyRow: true }))).toEqual(['M', 'w:MAMA', '_', 'w:ANA', '_']);
    // with 2 rows for all: after each traced row
    expect(kinds(cfg({ ...base, wordCopyRow: true, repetitionsPerItem: 2 }))).toEqual(['M', 'M', 'w:MAMA', '_', 'w:MAMA', '_', 'w:ANA', '_', 'w:ANA', '_']);
    // rows of one letter (rowsByItem) are not words: no empty row after them
    expect(kinds(cfg({ ...base, wordCopyRow: true, rowsByItem: { M: 3 } }))).toEqual(['M', 'M', 'M', 'w:MAMA', '_', 'w:ANA', '_']);
  });

  it('the empty row has the size of its word row and draws only the ruling', () => {
    const c = cfg({ customWords: ['mama'], wordCopyRow: true, fillPage: false, showRewardSection: false });
    const [page] = buildWorksheetPages(c, 'full');
    const groups = page.ops.filter((o) => o.t === 'group');
    const without = buildWorksheetPages(cfg({ customWords: ['mama'], fillPage: false, showRewardSection: false }), 'full')[0];
    // the same traced glyphs; the extra row adds three guide lines and nothing else
    expect(groups.length).toBe(without.ops.filter((o) => o.t === 'group').length);
    expect(page.ops.filter((o) => o.t === 'line').length).toBe(without.ops.filter((o) => o.t === 'line').length + 3);
  });

  it('counts as a row: more pages, and a word never leaves its empty row on another page', () => {
    const words = ['mama', 'tata', 'casa', 'pisica', 'cal', 'minge'];
    const off = cfg({ customWords: words, fillPage: false });
    const on = cfg({ ...off, wordCopyRow: true });
    expect(countWorksheetPages(off, 'full')).toBe(2);
    expect(countWorksheetPages(on, 'full')).toBe(3);
    for (const rowsPerPage of [3, 4, 5, 7]) {
      const pages = buildWorksheetPages({ ...on, rowsPerPage }, 'full');
      // every page: rows come in pairs (a traced row with guides + groups, then a row with guides only)
      expect(pages.length).toBe(Math.ceil(words.length / Math.floor(rowsPerPage / 2)));
    }
  });

  it('filling the page brings back whole pairs', () => {
    const c = cfg({ customWords: ['mama'], wordCopyRow: true, rowsPerPage: 5 });
    // 5 rows a page: two pairs fit, a third word alone would be cut from its empty row
    const [page] = buildWorksheetPages(c, 'full');
    const lines = page.ops.filter((o) => o.t === 'line' && o.y1 === o.y2 && o.x1 === 12 && (o as { dash?: number[] }).dash).length;
    expect(lines).toBe(4); // the dashed middle line of four rows
  });

  it('handwriting, lowercase, paired, dictando, left-handed: the same pairs', () => {
    for (const over of [
      { script: 'cursive' as const, letterMode: 'paired' as const },
      { letterMode: 'lowercase' as const },
      { letterMode: 'paired' as const },
      { backgroundPattern: 'dictando' as const, leftHandedMode: true },
    ]) {
      const c = cfg({ ...over, customWords: ['mama', 'toamna'], wordCopyRow: true });
      expect(kinds(c).filter((k) => k === '_').length).toBe(2);
      expect(countWorksheetPages(c, 'full')).toBeGreaterThanOrEqual(1);
    }
  });

  it('a workbook (a page for each letter) has no words of the list, so nothing changes there', () => {
    const c = cfg({ selectedItems: ['A', 'B'], pagePerItem: true, itemWords: true, customWords: ['mama'] });
    expect(fp({ ...c, wordCopyRow: true })).toEqual(fp(c));
  });
});

describe('„Umple rândul”', () => {
  const style = (over: Partial<RowStyle> = {}): RowStyle => ({ ...DEFAULT_ROW_STYLE, s: 0.19, blankCells: 2, guideColor: null, ...over });
  const copies = (ops: DrawOp[]) => ops.filter((o): o is Extract<DrawOp, { t: 'group' }> => o.t === 'group');

  it('a short word with room for two: traced twice instead of once; whole copies inside the row', () => {
    const glyphs = glyphsForWord('școală');
    const geom = { x: 12, width: 186, baseline: 100 };
    const once: DrawOp[] = [];
    buildTraceRow(once, glyphs, geom, style());
    expect(copies(once)).toHaveLength(1);
    const filled: DrawOp[] = [];
    const n = buildTraceRow(filled, glyphs, geom, style({ fillWord: true }));
    const cell = (itemWidth(glyphs) + cellPad(glyphs) * 2) * 0.19;
    expect(n).toBe(Math.floor(186 / cell));
    expect(n).toBe(2);
    const g = copies(filled);
    expect(g).toHaveLength(2);
    for (const c of g) {
      expect(c.tx).toBeGreaterThanOrEqual(geom.x);
      expect(c.tx + itemWidth(glyphs) * 0.19).toBeLessThanOrEqual(geom.x + geom.width);
    }
    // a clear gap between the copies: the two cell pads
    expect(g[1].tx - (g[0].tx + itemWidth(glyphs) * 0.19)).toBeCloseTo(cellPad(glyphs) * 2 * 0.19, 5);
  });

  it('never more than fits, at any width; left-handed flush right', () => {
    const glyphs = glyphsForWord('pisică');
    // the sheet makes every word fit its row once (layout: scaleOf); from there on
    const cell = (itemWidth(glyphs) + cellPad(glyphs) * 2) * 0.19;
    for (let width = Math.ceil(cell); width <= 280; width += 7) {
      for (const leftHanded of [false, true]) {
        const ops: DrawOp[] = [];
        buildTraceRow(ops, glyphs, { x: 20, width, baseline: 50 }, style({ fillWord: true, leftHanded }));
        for (const c of copies(ops)) {
          expect(c.tx).toBeGreaterThanOrEqual(20 - 1e-9);
          expect(c.tx + itemWidth(glyphs) * 0.19).toBeLessThanOrEqual(20 + width + 1e-9);
        }
      }
    }
  });

  it('a long word stays single; a row with a model and copies is unchanged', () => {
    const geom = { x: 12, width: 186, baseline: 100 };
    for (const word of ['mă', 'AC', 'mama', 'pisică']) {
      const glyphs = glyphsForWord(word);
      const a: DrawOp[] = [];
      const b: DrawOp[] = [];
      buildTraceRow(a, glyphs, geom, style({ s: 0.1 }));
      buildTraceRow(b, glyphs, geom, style({ s: 0.1, fillWord: true }));
      expect(b).toEqual(a);
    }
    const long = glyphsForWord('ELEFANȚEL');
    const a: DrawOp[] = [];
    buildTraceRow(a, long, geom, style({ fillWord: true }));
    expect(copies(a)).toHaveLength(1);
  });

  it('on the sheet: a short word fills its row, at the higher levels too only where it was single', () => {
    const c = cfg({ letterMode: 'lowercase', customWords: ['școală'], fillPage: false });
    const groups = (x: WorksheetConfig) => buildWorksheetPages(x, 'full')[0].ops.filter((o) => o.t === 'group').length;
    expect(groups(c)).toBe(1);
    expect(groups({ ...c, wordFillRow: true })).toBe(2);
    // handwriting: the model and its copies as before
    const hand = cfg({ script: 'cursive', letterMode: 'paired', letterSize: 'medium', customWords: ['mama'], fillPage: false });
    expect(fp({ ...hand, wordFillRow: true })).toEqual(fp(hand));
  });
});

describe('off: the sheet as it always was', () => {
  it('no field, false (sanitized away) or an empty word list: byte for byte', () => {
    for (const over of [
      { customWords: ['mama', 'școală', 'Ana'], childName: 'Ana' },
      { script: 'cursive' as const, letterMode: 'paired' as const, customWords: ['toamna'] },
      { backgroundPattern: 'dictando' as const, customWords: ['măr'], leftHandedMode: true },
      { selectedItems: ['A', 'B'] },
    ]) {
      const c = cfg(over);
      expect(fp(sanitizeConfig({ ...c, wordCopyRow: false, wordFillRow: false }))).toEqual(fp(c));
    }
    // the options without words change nothing
    const letters = cfg({ selectedItems: ['A', 'Ș'] });
    expect(fp({ ...letters, wordCopyRow: true, wordFillRow: true })).toEqual(fp(letters));
  });
});

describe('store', () => {
  const s = () => useWorksheetStore.getState();
  beforeEach(() => s().resetConfig());

  it('the toggles write the field only when on', () => {
    s().toggleWordCopyRow();
    s().toggleWordFillRow();
    expect(s().config.wordCopyRow).toBe(true);
    expect(s().config.wordFillRow).toBe(true);
    s().toggleWordCopyRow();
    s().toggleWordFillRow();
    expect('wordCopyRow' in s().config).toBe(false);
    expect('wordFillRow' in s().config).toBe(false);
  });

  it('a list is added in order, without the words already there, up to 60', () => {
    s().addCustomWord('mama');
    s().addCustomWords(['tata', 'mama', 'ş coală'.replace(' ', ''), 'tata']);
    expect(s().config.customWords).toEqual(['mama', 'tata', 'școală']);
    s().addCustomWords(Array.from({ length: 80 }, (_, i) => `cuvant${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`));
    expect(s().config.customWords).toHaveLength(MAX_WORDS);
    s().addCustomWord('altul');
    expect(s().config.customWords).toHaveLength(MAX_WORDS);
    expect(s().config.customWords).not.toContain('altul');
  });

  it('from another category the sheet becomes a letter sheet, as with one word', () => {
    s().setCategory('numbers');
    s().addItems(['3']);
    s().addCustomWords(['nor', 'urs']);
    expect(s().config.category).toBe('letters');
    expect(s().config.selectedItems).toEqual([]);
    expect(s().config.customWords).toEqual(['nor', 'urs']);
  });

  it('„Altă variantă” and a sheet handed over with setState keep the options', () => {
    s().toggleWordCopyRow();
    s().newVariant();
    expect(s().config.wordCopyRow).toBe(true);
    useWorksheetStore.setState({ config: { ...DEFAULT_CONFIG, customWords: ['nor'], wordFillRow: true } });
    expect(s().config.wordFillRow).toBe(true);
    expect('wordCopyRow' in s().config).toBe(false);
  });
});

describe('carried with the sheet', () => {
  const c = sanitizeConfig({ ...DEFAULT_CONFIG, selectedItems: ['M'], childName: 'Ana', customWords: ['mama', 'Ana', 'nor'], wordCopyRow: true, wordFillRow: true });

  it('saving keeps the options', () => {
    const saved = sanitizeConfig(JSON.parse(JSON.stringify(configForSaving(c))));
    expect(saved.wordCopyRow).toBe(true);
    expect(saved.wordFillRow).toBe(true);
  });

  it('the homework link round-trips them; the name typed by the parent gets its empty row too', () => {
    const key = homeworkKeys({ HOMEWORK_LINK_SECRET: 'test-secret-0123456789abcdef' })[0];
    const now = Date.UTC(2026, 10, 28, 12);
    const token = createHomeworkToken({ kind: 'sheet', config: configForSaving(c), nameAt: nameRowIndex(c), tier: 'full', expiresAt: now + 86_400_000 } as never, key);
    const res = verifyHomeworkToken(token, [key], now);
    if (!res.ok || res.homework.kind !== 'sheet') throw new Error('link');
    expect(res.homework.config.wordCopyRow).toBe(true);
    expect(res.homework.config.wordFillRow).toBe(true);
    // the parent types the same name: the very sheet the teacher saw
    const pages = homeworkPages(res.homework, 'Ana').map((p) => createHash('sha256').update(pageToSvg(p)).digest('hex'));
    expect(pages).toEqual(fp(c));
  });
});
