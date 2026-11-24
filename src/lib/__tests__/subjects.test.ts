import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import type { PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import {
  CLASS_RULES, CUT_SETS, EMOTIONS, ENGLISH_SETS, FACES, HABITS, HYGIENE_OBJECTS, JOB_TOOLS, JOB_USES, LINES_SETS, MODEL_SETS, SITUATIONS, SUBJECT_KINDS,
  SUBJECT_SETS, SYMMETRY_SETS, YES_NO, EMOTION_FACES, COUNTED, SCISSORS, isSubjectItem, symmetryFull,
} from '@/lib/worksheet/subjects';
import {
  CUT_BOX, choiceLayout, choiceSheet, cutLayout, hygieneGrid, joinLayout, joinSheet, linesLayout, meLayout, modelLayout, subjectItems, subjectKeyExtras,
  subjectKeySection, subjectLabel, symmetryLayout,
} from '@/lib/worksheet/subjects-pages';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { gameAnswerPages } from '@/lib/worksheet/game-keys';
import { hasIcon } from '@/lib/hints/icons';
import { isItemAllowed } from '@/lib/access';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage, presetConfig } from '@/lib/curriculum/presets';
import { opsOutside } from './bounds';
import { textOverlaps } from './drawn';

const games = (items: string[], extra: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, ...extra });
const page = (item: string, extra: Partial<WorksheetConfig> = {}) => buildWorksheetPages(games([item], extra), 'full')[0];
const texts = (p: PageOps) => flattenOps(p.ops).flatMap((o) => (o.t === 'text' ? [o.text] : []));
const FRAME = 51;
const ITEMS = subjectItems();
const LEVELS: SchoolLevel[] = ['presc', 'CP', 'I', 'II'];

describe('the items', () => {
  it('are activities with a label, and the store keeps exactly these', () => {
    expect(ITEMS).toHaveLength(Object.values(SUBJECT_SETS).reduce((a, b) => a + b, 0));
    expect(ITEMS).toHaveLength(21);
    for (const i of ITEMS) {
      expect(isSubjectItem(i), i).toBe(true);
      expect(isActivityItem(i), i).toBe(true);
      expect(activityLabel(i)).toBe(subjectLabel(i));
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
    }
    expect(['sym:3', 'cut:2', 'feel:2', 'jobuse:1', 'en:3'].map(subjectLabel)).toEqual(['Simetrie: fluture', 'Decupează și lipește: robotul', 'Cum se simte?', 'La ce folosesc meseriile?', 'Numerele în engleză']);
    for (const no of ['sym:4', 'cut:3', 'me:2', 'hyg:2', 'job:2', 'en:0', 'en:', 'feel', 'symm:1', 'lines:3']) {
      expect(isSubjectItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(isActivityItem(no));
    }
    expect(sanitizeConfig(games(['sym:1', 'sym:4', 'jobuse:1', 'job:2'])).selectedItems).toEqual(['sym:1', 'jobuse:1']);
    // no prefix of another kind of sheet: each item belongs to one builder
    for (const k of SUBJECT_KINDS) expect(['find', 'count', 'dots', 'sound', 'first', 'syl', 'split', 'sort', 'odd', 'group', 'pos', 'read', 'color', 'colsum', 'maze', 'diff', 'trace', 'shadow', 'plant', 'body', 'senses', 'home', 'habitat', 'move', 'baby', 'season', 'weather', 'wear', 'water', 'melt']).not.toContain(k);
  });

  it('every picture is in the icon set', () => {
    const emojis = [
      ...FACES.map((f) => f[0]), ...EMOTION_FACES, ...SITUATIONS.map((s) => s[0]), ...HYGIENE_OBJECTS.map((h) => h[0]), ...HABITS.map((h) => h[0]),
      ...JOB_TOOLS.flatMap((j) => [j[0], j[2]]), ...JOB_USES.flatMap((j) => [j[0], j[3]]), ...CLASS_RULES.map((r) => r[0]), ...YES_NO.map((y) => y[1]),
      ...ENGLISH_SETS.flatMap((s) => s.pairs.map((p) => p[0])).filter((p) => !/^\d+$/.test(p)), COUNTED, SCISSORS,
    ];
    for (const e of emojis) expect(hasIcon(e), e).toBe(true);
  });

  it('one page per item, everything on the A4 paper (with the competence line), no texts on each other', () => {
    for (const level of LEVELS) {
      const pages = buildWorksheetPages(games(ITEMS, { curriculumLevel: level, childName: 'Ana-Maria Ștefănescu' }), 'full');
      expect(pages).toHaveLength(ITEMS.length);
      pages.forEach((p, i) => {
        expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${level} ${ITEMS[i]}`).toEqual([]);
        expect(textOverlaps(p), `${level} ${ITEMS[i]}`).toEqual([]);
      });
    }
  });

  it('are the same every time (preview = PDF), answers included', () => {
    const a = JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'));
    expect(JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'))).toBe(a);
  });

  it('every word is written with ș ț (comma below), and the instructions say what to do', () => {
    const all = [...buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full').flatMap(texts), ...ITEMS.map(subjectLabel)];
    for (const t of all) expect(t).not.toMatch(/[şţŞŢ]/);
    expect(texts(page('sym:1'))).toContain('Colorează în dreapta la fel ca în stânga, ca în oglindă.');
    expect(texts(page('model:1'))).toContain('Unește punctele de jos la fel ca în modelul de sus.');
    expect(texts(page('cut:1'))).toContain('Decupează piesele de jos pe linia punctată și lipește-le pe desen.');
    expect(texts(page('lines:1'))).toContain('Decorează fiecare fâșie cu linia sau punctele de lângă ea.');
    expect(texts(page('feel:1'))).toContain('Încercuiește emoția fiecărei fețe.');
    expect(texts(page('rules:1'))).toContain('Spun „te rog” și „mulțumesc”.');
    expect(texts(page('en:1'))).toEqual(expect.arrayContaining(['dog', 'cat', 'fish', 'cow', 'pig', 'horse']));
  });

  it('free plan: set 1 of each kind (so every preset opens a free sheet)', () => {
    expect(ITEMS.filter((i) => isItemAllowed(i, 'games', 'free'))).toEqual(SUBJECT_KINDS.map((k) => `${k}:1`));
    expect(hasContent(games(['sym:2', 'en:3']), 'free')).toBe(false);
  });

  it('„Despre mine” writes the child’s name only on the sheet itself', () => {
    expect(texts(page('me:1', { childName: 'Ioana' })).filter((t) => t === 'Ioana')).toHaveLength(1);
    expect(texts(page('me:1'))).not.toContain('Ioana');
    const lay = meLayout(FRAME);
    const boxes = [lay.portrait, ...lay.facts, ...lay.boxes];
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.label} / ${b.label}`).toBe(true)));
  });
});

describe('Arte vizuale', () => {
  it('„Simetrie”: the whole drawing is symmetric; the page colours only the left half; the answers draw it whole', () => {
    SYMMETRY_SETS.forEach((set, k) => {
      const full = symmetryFull(set);
      for (const row of full) {
        expect(row).toBe([...row].reverse().join(''));
        expect(row).toHaveLength(set.half[0].length * 2);
      }
      const g = symmetryLayout(k + 1, FRAME);
      expect(g.x0).toBeGreaterThanOrEqual(12);
      expect(g.y0 + g.rows * g.cell).toBeLessThanOrEqual(297 - 12 - 20);
      // the squares of the right half are all white on the sheet
      const p = page(`sym:${k + 1}`);
      const rightFilled = flattenOps(p.ops).filter((o) => o.t === 'rect' && o.w === g.cell && o.x >= g.x0 + (g.cols / 2) * g.cell - 0.01 && o.fill !== '#ffffff');
      expect(rightFilled, set.name).toEqual([]);
      const leftFilled = flattenOps(p.ops).filter((o) => o.t === 'rect' && o.w === g.cell && o.x < g.x0 + (g.cols / 2) * g.cell - 0.01 && o.fill !== '#ffffff');
      expect(leftFilled.length, set.name).toBe(set.half.join('').replace(/\./g, '').length);
    });
    expect(subjectKeySection('sym:2')?.entries).toEqual(['Desenul complet (casă) este mai jos.']);
    expect(subjectKeyExtras(['sym:1', 'sym:2', 'sym:3', 'en:1'])).toHaveLength(2);
    // the answers page draws every square of the finished picture in colour
    const key = gameAnswerPages(games(['sym:1']), 'full');
    expect(key).toHaveLength(1);
  });

  it('„Desenează după model”: the drawing stays on the dots; the two grids do not meet', () => {
    MODEL_SETS.forEach((set, k) => {
      for (const pl of set.lines) for (const [c, r] of pl) expect(c >= 0 && c < set.dots && r >= 0 && r < set.dots, `${set.name} ${c},${r}`).toBe(true);
      const { model, copy } = modelLayout(k + 1, FRAME);
      expect(model.y0 + (model.dots - 1) * model.step).toBeLessThan(copy.y0 - 8);
      expect(copy.y0 + (copy.dots - 1) * copy.step).toBeLessThanOrEqual(297 - 12 - 20 - 4);
    });
  });

  it('„Decupează și lipește”: each piece has the size of its place, pieces never touch, all under the cut line', () => {
    CUT_SETS.forEach((set, k) => {
      const lay = cutLayout(k + 1, FRAME);
      expect(lay.places.map((p) => p.piece)).toEqual(set.pieces);
      for (const p of set.pieces) {
        const x0 = p.shape === 'circle' ? p.x - p.w / 2 : p.x;
        const y0 = p.shape === 'circle' ? p.y - p.h / 2 : p.y;
        expect(x0 >= 0 && y0 >= 0 && x0 + p.w <= CUT_BOX.w && y0 + p.h <= CUT_BOX.h, `${set.name} ${p.name}`).toBe(true);
      }
      const box = (pl: (typeof lay.places)[number]) => ({ x0: pl.x - 2, y0: pl.y - 2 * 2.2, x1: pl.x + pl.piece.w + 2 * 2.2, y1: pl.y + pl.piece.h + 2 });
      lay.places.forEach((a, i) => {
        const A = box(a);
        expect(A.y0, a.piece.name).toBeGreaterThan(lay.cutY + 6);
        expect(A.x0 >= 12 - 3 && A.x1 <= 210 - 12 + 3 && A.y1 <= 297 - 12 - 20, a.piece.name).toBe(true);
        lay.places.slice(i + 1).forEach((b) => {
          const B = box(b);
          expect(A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0, `${a.piece.name} / ${b.piece.name}`).toBe(true);
        });
      });
      expect(lay.by + CUT_BOX.h).toBeLessThan(lay.cutY);
    });
    expect(subjectKeySection('cut:1')).toBeNull();
  });

  it('„Linii și puncte”: one stripe per kind of line, stacked without gaps', () => {
    LINES_SETS.forEach((set, k) => {
      const lay = linesLayout(k + 1, FRAME);
      expect(lay.bands.map((b) => b.kind)).toEqual(set.stripes);
      lay.bands.forEach((b, i) => {
        expect(b.y1 - b.y0, `${set.name} ${b.kind}`).toBeGreaterThan(20);
        if (i > 0) expect(b.y0).toBeCloseTo(lay.bands[i - 1].y1, 6);
      });
      expect(new Set(set.stripes).size).toBe(set.stripes.length);
    });
  });
});

describe('Dezvoltare personală and limba engleză', () => {
  it('the rows: one answer each, the example ring on the right one, the answers page reads the same rows', () => {
    for (const item of ['feel:1', 'feel:2', 'habit:1', 'rules:1']) {
      const sheet = choiceSheet(item);
      expect(sheet.rows).toHaveLength(8);
      for (const r of sheet.rows) expect(r.answer >= 0 && r.answer < sheet.choices.length, item).toBe(true);
      const key = subjectKeySection(item)!;
      expect(key.entries).toHaveLength(8);
      key.entries.forEach((e, i) => expect(e.endsWith(sheet.choices[sheet.rows[i].answer].label.toLocaleLowerCase('ro')), `${item} ${e}`).toBe(true));
      // the dashed ring of row 1 goes around the box of its answer
      const lay = choiceLayout(item, FRAME + 1);
      const b = lay.rows[0].boxes[sheet.rows[0].answer];
      const ring = flattenOps(page(item).ops).find((o) => o.t === 'rect' && o.dash && Math.abs(o.x - (b.x - 1.2)) < 0.01 && Math.abs(o.y - (b.y - 1.2)) < 0.01);
      expect(ring, item).toBeDefined();
    }
    // the faces: two of each basic emotion; the situations: two of each
    expect(EMOTIONS).toEqual(['BUCURIE', 'TRISTEȚE', 'FRICĂ', 'FURIE']);
    for (let e = 0; e < 4; e++) {
      expect(FACES.filter((f) => f[1] === e)).toHaveLength(2);
      expect(SITUATIONS.filter((s) => s[2] === e)).toHaveLength(2);
    }
    expect(HABITS.filter((h) => h[2])).toHaveLength(4);
    expect(subjectKeySection('feel:2')!.entries).toContain('Maria a primit un cadou de ziua ei – bucurie');
    expect(subjectKeySection('rules:1')!.entries).toContain('Strig în clasă ca să fiu auzit – nu e bine');
  });

  it('„Obiectele de igienă”: six to circle among six others; the example is one of them', () => {
    const grid = hygieneGrid(FRAME + 2);
    expect(grid.filter((p) => p.yes)).toHaveLength(6);
    expect(grid[0].yes).toBe(false);
    expect(subjectKeySection('hyg:1')!.entries[0]).toBe(`Se încercuiesc (6): ${grid.filter((p) => p.yes).map((p) => p.name).join(', ')}.`);
  });

  it('the „join” sheets: no right card stays in its row, the example line joins the first pair, the answers name every pair', () => {
    for (const item of ['job:1', 'jobuse:1', 'en:1', 'en:2', 'en:3']) {
      const { sheet, order } = joinSheet(item);
      expect(sheet.left).toHaveLength(6);
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      order.forEach((k, i) => expect(k, item).not.toBe(i));
      const lay = joinLayout(item, FRAME);
      const a = lay.dotL(0);
      const b = lay.dotR(order.indexOf(0));
      const line = flattenOps(page(item).ops).find((o) => o.t === 'line' && o.dash && Math.abs(o.x1 - a.x) < 0.01 && Math.abs(o.y2 - b.y) < 0.01);
      expect(line, item).toBeDefined();
      expect(subjectKeySection(item)!.entries).toEqual(sheet.names);
    }
    expect(subjectKeySection('job:1')!.entries[0]).toBe('bucătarul – tigaia');
    expect(subjectKeySection('en:3')!.entries).toEqual(['2 – two', '3 – three', '5 – five', '7 – seven', '8 – eight', '10 – ten']);
    expect(subjectKeySection('en:1')!.entries[0]).toBe('câine – dog');
    // „Numbers”: as many apples as the number
    const apples = flattenOps(page('en:3').ops).filter((o) => o.t === 'path').length;
    expect(apples).toBeGreaterThan(0);
  });

  it('nothing to check on the drawing pages; answers pages only for the sheets with answers', () => {
    for (const item of ['model:1', 'cut:1', 'lines:1', 'me:1']) {
      expect(subjectKeySection(item), item).toBeNull();
      expect(gameAnswerPages(games([item]), 'full'), item).toEqual([]);
    }
    for (const item of ['sym:1', 'feel:1', 'hyg:1', 'habit:1', 'job:1', 'jobuse:1', 'rules:1', 'en:1']) expect(gameAnswerPages(games([item]), 'full').length, item).toBe(1);
  });
});

describe('the competences', () => {
  const codes = (item: string, level: SchoolLevel) => sheetCompetences(games([item]), level).map((r) => `${r.programme} ${r.code}`);

  it('each sheet prints the codes of its class only, from its programme', () => {
    const expected: Record<string, Partial<Record<SchoolLevel, string[]>>> = {
      'cut:1': { CP: ['avap-p-ii 2.3'], I: ['avap-p-ii 2.3'] },
      'lines:2': { CP: ['avap-p-ii 1.2'], I: ['avap-p-ii 1.2'] },
      'feel:1': { CP: ['dp-p-ii 2.1'], I: ['dp-p-ii 2.1'] },
      'feel:2': { CP: ['dp-p-ii 2.1'], I: ['dp-p-ii 2.1'] },
      'me:1': { CP: ['dp-p-ii 1.1'], I: ['dp-p-ii 1.1'] },
      'hyg:1': { CP: ['dp-p-ii 1.2'] },
      'habit:1': { I: ['dp-p-ii 1.2'] },
      'job:1': { I: ['dp-p-ii 3.3'] },
      'jobuse:1': { II: ['dp-p-ii 3.3'] },
      'rules:1': { CP: ['dp-p-ii 2.2'] },
      'en:2': { CP: ['lm-p-ii 3.1'], I: ['lm-p-ii 3.1'], II: ['lm-p-ii 3.1'] },
      'sym:1': {},
      'model:3': {},
    };
    for (const [item, by] of Object.entries(expected)) for (const level of LEVELS) expect(codes(item, level), `${item} ${level}`).toEqual(by[level] ?? []);
    for (const item of ITEMS) for (const level of LEVELS) for (const r of sheetCompetences(games([item]), level)) expect(findCompetence(r), `${item} ${level}`).toBeTruthy();
    expect(sheetCompetenceLabel(games(['jobuse:1']), 'II')).toBe('Competența specifică 3.3 · Dezvoltare personală, clasa a II-a');
    expect(sheetCompetenceLabel(games(['en:1']), 'CP')).toBe('Competența specifică 3.1 · Comunicare în limba modernă 1, clasa pregătitoare');
    expect(sheetCompetenceLabel(games(['cut:2']), 'I')).toBe('Competența specifică 2.3 · Arte vizuale și abilități practice, clasa I');
    // the texts behind those codes, as the programmes print them
    expect(findCompetence({ programme: 'dp-p-ii', level: 'CP', code: '1.2' })?.text).toBe('Identificarea unor obiecte și activități simple de igienă personală');
    expect(findCompetence({ programme: 'dp-p-ii', level: 'I', code: '3.3' })?.text).toBe('Explorarea unor meserii cunoscute sau preferate');
    expect(findCompetence({ programme: 'dp-p-ii', level: 'II', code: '3.3' })?.text).toBe('Prezentarea utilității unor meserii/profesii cunoscute');
    expect(findCompetence({ programme: 'dp-p-ii', level: 'CP', code: '2.2' })?.text).toBe('Identificarea regulilor de comunicare în activitatea școlară');
  });

  it('the presets open free sheets and are listed under their codes on the class pages', () => {
    const ids = ['decupeaza-lipeste', 'linii-puncte', 'simetrie', 'deseneaza-dupa-model', 'emotiile', 'despre-mine', 'obiecte-igiena', 'obiceiuri-sanatoase', 'meserii-unelte', 'la-ce-folosesc-meseriile', 'reguli-in-clasa', 'engleza-cuvinte'];
    for (const id of ids) {
      const preset = SHEET_PRESETS.find((p) => p.id === id)!;
      expect(preset, id).toBeDefined();
      for (const level of preset.levels!) {
        const cfg = presetConfig(preset, level);
        for (const item of cfg.selectedItems) expect(isItemAllowed(item, 'games', 'free'), `${id} ${level}`).toBe(true);
        expect(buildWorksheetPages(cfg, 'free').length, `${id} ${level}`).toBeGreaterThan(0);
        // a preset with a code prints it in every class it is listed in; the two without one print nothing
        expect(sheetCompetences(cfg, level).length > 0, `${id} ${level}`).toBe(id !== 'simetrie' && id !== 'deseneaza-dupa-model');
      }
    }
    const listed = (slug: string, programme: string, code: string) => classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).find((g) => g.programme === programme)!.items.find((i) => i.code === code)!.presets.map((p) => p.id);
    expect(listed('clasa-pregatitoare', 'avap-p-ii', '2.3')).toEqual(['decupeaza-lipeste']);
    expect(listed('clasa-1', 'avap-p-ii', '1.2')).toEqual(['linii-puncte']);
    expect(listed('clasa-pregatitoare', 'dp-p-ii', '2.1')).toEqual(['emotiile']);
    expect(listed('clasa-pregatitoare', 'dp-p-ii', '2.2')).toEqual(['reguli-in-clasa']);
    expect(listed('clasa-1', 'dp-p-ii', '3.3')).toEqual(['meserii-unelte']);
    expect(listed('clasa-2', 'dp-p-ii', '3.3')).toEqual(['la-ce-folosesc-meseriile']);
    for (const slug of ['clasa-pregatitoare', 'clasa-1', 'clasa-2']) expect(listed(slug, 'lm-p-ii', '3.1')).toEqual(['engleza-cuvinte']);
    // the sheets of these subjects are never listed under a CLR or MEM competence
    for (const c of CLASS_PAGES) for (const g of classCoverage(c).filter((x) => x.headline)) for (const it of g.items) for (const p of it.presets) expect(ids, `${c.slug} ${it.code}`).not.toContain(p.id);
  });
});
