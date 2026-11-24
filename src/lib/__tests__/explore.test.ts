import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import {
  BABY_SETS, BODY_PARTS, EXPLORE_KINDS, EXPLORE_SETS, HABITAT_SET, HOME_SETS, MELT_OPTIONS, MELT_ROWS, MOVE_SET, PLANT_PARTS, SEASONS, SEASON_THINGS,
  SENSES, WATER_ROWS, WEAR, WEATHER, isExploreItem,
} from '@/lib/worksheet/explore';
import {
  BODY, PLANT, choiceLayout, choiceRows, exploreItems, exploreKeySection, exploreLabel, habitatLayout, labelLayout, matchSet, seasonGrid,
} from '@/lib/worksheet/explore-pages';
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
const ITEMS = exploreItems();
const CHOICE_ITEMS = ['home:1', 'home:2', 'move:1', 'season:1', 'water:1', 'melt:1'];

describe('the items', () => {
  it('are activities with a label, and the store keeps exactly these', () => {
    expect(ITEMS).toHaveLength(Object.values(EXPLORE_SETS).reduce((a, b) => a + b, 0));
    expect(ITEMS).toHaveLength(18);
    for (const i of ITEMS) {
      expect(isExploreItem(i), i).toBe(true);
      expect(isActivityItem(i), i).toBe(true);
      expect(activityLabel(i)).toBe(exploreLabel(i));
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
    }
    expect([exploreLabel('home:2'), exploreLabel('season:4'), exploreLabel('season:1'), exploreLabel('melt:1')]).toEqual(['Cine unde trăiește? (2)', 'Ce se întâmplă toamna?', 'Anotimpurile', 'Ce se întâmplă cu apa?']);
    for (const no of ['plant:2', 'home:3', 'season:6', 'season:0', 'baby:', 'water', 'melts:1']) {
      expect(isExploreItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(isActivityItem(no));
    }
    expect(sanitizeConfig(games(['plant:1', 'home:3', 'season:5'])).selectedItems).toEqual(['plant:1', 'season:5']);
  });

  it('every picture and symbol is in the icon set', () => {
    const emojis = [
      ...SENSES.map((s) => s[0]), ...HOME_SETS.flatMap((s) => [...s.choices.map((c) => c.symbol), ...s.rows.map((r) => r.picture)]),
      ...HABITAT_SET.choices.map((c) => c.symbol), ...HABITAT_SET.rows.map((r) => r.picture), ...MOVE_SET.choices.map((c) => c.symbol).filter(Boolean),
      ...MOVE_SET.rows.map((r) => r.picture), ...BABY_SETS.flat().map((b) => b[0]), ...SEASONS.flatMap((s) => SEASON_THINGS[s].map((t) => t[0])),
      ...WEATHER.map((w) => w[0]), ...WEAR.flatMap((w) => [w[0], w[2]]), ...WATER_ROWS.map((w) => w[0]), ...MELT_ROWS.map((m) => m[0]),
    ];
    for (const e of emojis) expect(hasIcon(e), e).toBe(true);
  });

  it('one page per item, everything on the A4 paper (with the competence line), no texts on each other', () => {
    for (const level of ['presc', 'CP', 'I', 'II'] as const) {
      const pages = buildWorksheetPages(games(ITEMS, { curriculumLevel: level, childName: 'Ana-Maria Ștefănescu' }), 'full');
      expect(pages).toHaveLength(ITEMS.length);
      pages.forEach((p, i) => {
        expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${level} ${ITEMS[i]}`).toEqual([]);
        expect(textOverlaps(p), ITEMS[i]).toEqual([]);
      });
    }
  });

  it('are the same every time (preview = PDF)', () => {
    const a = JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'));
    expect(JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'))).toBe(a);
  });

  it('every word is written with ș ț (comma below), and the instructions say what to do', () => {
    const all = [...buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full').flatMap(texts), ...ITEMS.map(exploreLabel)];
    for (const t of all) expect(t).not.toMatch(/[şţŞŢ]/);
    expect(texts(page('plant:1'))).toContain('Scrie în fiecare căsuță numele părții plantei.');
    expect(texts(page('body:1'))).toContain('Scrie în fiecare căsuță numele părții corpului.');
    expect(texts(page('home:1'))).toContain('Încercuiește locul unde trăiește fiecare animal.');
    expect(texts(page('habitat:1'))).toContain('Pune un X în coloana mediului de viață al fiecărui animal.');
    expect(texts(page('season:4'))).toContain('Încercuiește tot ce se potrivește cu toamna.');
    expect(texts(page('wear:1'))).toContain('Dacă plouă, atunci iei umbrela. Prima linie este exemplul.');
    expect(texts(page('melt:1'))).toContain('Cubul de gheață stă la soare.');
  });

  it('free plan: set 1 of each kind (so every preset opens a free sheet)', () => {
    expect(ITEMS.filter((i) => isItemAllowed(i, 'games', 'free'))).toEqual(EXPLORE_KINDS.map((k) => `${k}:1`));
    expect(hasContent(games(['home:2', 'season:3']), 'free')).toBe(false);
  });
});

describe('the parts of the plant and of the body', () => {
  const inside = (p: Pt, poly: Pt[]) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (poly[i].y > p.y !== poly[j].y > p.y && p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
    return c;
  };

  it('five parts each, from the programme, every line ending on its part of the drawing', () => {
    expect(PLANT.targets.map((t) => t.word).sort()).toEqual([...PLANT_PARTS].sort());
    expect(BODY.targets.map((t) => t.word).sort()).toEqual([...BODY_PARTS].sort());
    // what each word points at, in picture units: a filled shape or a stroke of that part
    const near = (pic: typeof PLANT, at: Pt) => pic.shapes.some((s) => ('fill' in s ? inside(at, s.pts) : s.pts.slice(1).some((q, i) => {
      const a = s.pts[i];
      const t = Math.max(0, Math.min(1, ((at.x - a.x) * (q.x - a.x) + (at.y - a.y) * (q.y - a.y)) / ((q.x - a.x) ** 2 + (q.y - a.y) ** 2)));
      return Math.hypot(at.x - (a.x + t * (q.x - a.x)), at.y - (a.y + t * (q.y - a.y))) <= s.w / 2 + 0.5;
    })));
    for (const pic of [PLANT, BODY]) for (const t of pic.targets) for (const at of t.at) expect(near(pic, at), t.word).toBe(true);
  });

  it('the boxes do not touch each other or the drawing; the word bank has the same words in another order', () => {
    for (const kind of ['plant', 'body'] as const) {
      const lay = labelLayout(kind, FRAME);
      const pic = kind === 'plant' ? PLANT : BODY;
      const picBox = { x0: lay.ox + pic.x0 * lay.scale, x1: lay.ox + (pic.x0 + pic.w) * lay.scale };
      lay.boxes.forEach((a, i) => {
        expect(a.x + a.w <= picBox.x0 + 0.01 || a.x >= picBox.x1 - 0.01, `${kind} ${a.word}`).toBe(true);
        lay.boxes.slice(i + 1).forEach((b) => expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.word} / ${b.word}`).toBe(true));
      });
      expect(lay.bank.map((b) => b.word).sort()).toEqual(lay.boxes.map((b) => b.word).sort());
      lay.bank.forEach((b, i) => expect(b.word, kind).not.toBe(pic.targets[i].word));
      expect(exploreKeySection(`${kind}:1`)?.entries).toEqual(lay.boxes.map((b) => b.word));
    }
  });

  it('the boxes are numbered as the answers count them', () => {
    const p = page('plant:1');
    const nums = flattenOps(p.ops).filter((o): o is Extract<DrawOp, { t: 'text' }> => o.t === 'text' && /^[1-5]$/.test(o.text));
    const lay = labelLayout('plant', FRAME);
    lay.boxes.forEach((b, i) => expect(nums.some((t) => t.text === String(i + 1) && Math.abs(t.x - b.x - 2) < 0.01 && t.y > b.y && t.y < b.y + b.h)).toBe(true));
  });
});

describe('circle the answer on each row', () => {
  it('each row has one answer among its choices; the example rings the answer of the first row', () => {
    for (const item of CHOICE_ITEMS) {
      const { set } = choiceRows(item);
      for (const r of set.rows) expect(r.answer >= 0 && r.answer < set.choices.length, item).toBe(true);
      const p = page(item);
      const lay = choiceLayout(item, FRAME + 1);
      const ring = p.ops.find((o) => o.t === 'rect' && o.dash && o.stroke === '#E8913A');
      const b = lay.rows[0].boxes[set.rows[0].answer];
      expect(ring?.t === 'rect' && Math.abs(ring.x - (b.x - 1.2)) < 0.01 && Math.abs(ring.y - (b.y - 1.2)) < 0.01, item).toBe(true);
      // every row's picture drawn
      expect(p.ops.filter((o) => o.t === 'group').length, item).toBeGreaterThanOrEqual(set.rows.length);
    }
  });

  it('every choice is printed on every row', () => {
    for (const item of CHOICE_ITEMS) {
      const { set } = choiceRows(item);
      const t = texts(page(item));
      for (const c of set.choices) expect(t.filter((x) => x === c.label), `${item} ${c.label}`).toHaveLength(set.rows.length);
    }
  });

  it('the seasons: two of each, never two of one season in a row, no picture in two seasons', () => {
    const { set } = choiceRows('season:1');
    expect(set.rows).toHaveLength(8);
    for (let s = 0; s < 4; s++) expect(set.rows.filter((r) => r.answer === s)).toHaveLength(2);
    set.rows.slice(1).forEach((r, i) => expect(r.answer).not.toBe(set.rows[i].answer));
    const all = SEASONS.flatMap((s) => SEASON_THINGS[s].map((t) => t[0]));
    expect(new Set(all).size).toBe(all.length);
    for (const r of set.rows) expect(SEASON_THINGS[SEASONS[r.answer]].some((t) => t[0] === r.picture)).toBe(true);
  });

  it('the answers are the choice of each row', () => {
    expect(exploreKeySection('home:1')?.entries.slice(0, 3)).toEqual(['ursul – în pădure', 'vaca – la fermă', 'peștele – în apă']);
    expect(exploreKeySection('melt:1')?.entries[1]).toBe('Apa din găleată stă afară, în ger – îngheață');
    expect(exploreKeySection('water:1')?.entries[0]).toBe('gheața – solidă');
    MELT_ROWS.forEach(([, , a]) => expect(MELT_OPTIONS[a]).toBeTruthy());
  });
});

describe('the other sheets', () => {
  it('the table of the „Medii de viață”: one column per row, the example X in it', () => {
    const p = page('habitat:1');
    const t = habitatLayout(FRAME);
    const xs = flattenOps(p.ops).filter((o): o is Extract<DrawOp, { t: 'line' }> => o.t === 'line' && o.stroke === '#E8913A' && !!o.dash);
    expect(xs).toHaveLength(2);
    const cx = (xs[0].x1 + xs[0].x2) / 2;
    expect(Math.floor((cx - t.x - t.firstW) / t.colW)).toBe(HABITAT_SET.rows[0].answer);
    expect(new Set(HABITAT_SET.rows.map((r) => r.answer)).size).toBe(HABITAT_SET.choices.length);
    expect(exploreKeySection('habitat:1')?.entries).toContain('pinguinul – polul sud');
  });

  it('„Ce se întâmplă …?”: twelve different pictures, the five of the season and seven of the others', () => {
    for (const n of [2, 3, 4, 5]) {
      const season = SEASONS[n - 2];
      const grid = seasonGrid(n, FRAME + 2);
      expect(grid).toHaveLength(12);
      expect(new Set(grid.map((g) => g.picture)).size).toBe(12);
      expect(grid.filter((g) => g.season === season)).toHaveLength(5);
      for (const s of SEASONS.filter((x) => x !== season)) expect(grid.filter((g) => g.season === s).length, `${season} ${s}`).toBeGreaterThanOrEqual(2);
      expect(exploreKeySection(`season:${n}`)?.entries[0]).toMatch(/^Se încercuiesc \(5\): /);
    }
  });

  it('joining the columns: the partner is never on the same row; the answers pair them', () => {
    for (const item of ['senses:1', 'baby:1', 'baby:2', 'weather:1', 'wear:1']) {
      const { set, order } = matchSet(item);
      expect([...order].sort()).toEqual(set.left.map((_, i) => i));
      order.forEach((k, i) => expect(k, item).not.toBe(i));
      expect(exploreKeySection(item)?.entries).toEqual(set.names);
      // every word on the right printed once
      const t = texts(page(item));
      for (const r of set.right) if (r.word) expect(t.filter((x) => x === r.word), `${item} ${r.word}`).toHaveLength(1);
    }
    expect(exploreKeySection('baby:1')?.entries).toContain('calul – mânz');
    expect(exploreKeySection('wear:1')?.entries[0]).toBe('plouă – umbrela');
    // a young that fits two animals would give two answers
    for (const s of BABY_SETS) expect(new Set(s.map((b) => b[2])).size).toBe(s.length);
  });

  it('the answers page has a section for every item', () => {
    const answers = gameAnswerPages(games(ITEMS, { mathAnswers: true }), 'full');
    const t = answers.flatMap((ops) => texts({ width: 210, height: 297, ops }));
    for (const i of ITEMS) expect(t, i).toContain(exploreLabel(i));
  });
});

describe('the competences', () => {
  const codes = (item: string, level: SchoolLevel) => sheetCompetences(games([item]), level).map((r) => (r.domain ? `${r.domain}.${r.code}` : r.code));

  it('each kind prints the codes of its class only', () => {
    const table: Record<string, Record<SchoolLevel, string[]>> = {
      'plant:1': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] },
      'body:1': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] },
      'senses:1': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] },
      'home:1': { presc: ['E.3.2'], CP: ['5.1'], I: [], II: [] },
      'move:1': { presc: ['E.3.2'], CP: ['5.1'], I: [], II: [] },
      'habitat:1': { presc: [], CP: [], I: [], II: ['5.1'] },
      'baby:1': { presc: ['D.2.3', 'E.3.2'], CP: [], I: [], II: [] },
      'season:1': { presc: ['E.1.1'], CP: ['3.1'], I: [], II: [] },
      'season:5': { presc: ['E.1.1'], CP: ['3.1'], I: [], II: [] },
      'weather:1': { presc: ['E.1.1'], CP: ['4.1'], I: [], II: [] },
      'wear:1': { presc: ['E.1.4'], CP: ['4.2'], I: [], II: [] },
      'water:1': { presc: [], CP: [], I: ['4.1'], II: [] },
      'melt:1': { presc: [], CP: [], I: ['4.2'], II: [] },
    };
    for (const [item, byLevel] of Object.entries(table)) for (const [level, want] of Object.entries(byLevel)) expect(codes(item, level as SchoolLevel), `${item} ${level}`).toEqual(want);
    expect(sheetCompetenceLabel(games(['wear:1']), 'CP')).toBe('Competența specifică 4.2 · Matematică și explorarea mediului, clasa pregătitoare');
    expect(sheetCompetenceLabel(games(['baby:2']), 'presc')).toBe('Comportamente vizate D.2.3, E.3.2 · Curriculum pentru educație timpurie, nivel preșcolar');
  });

  it('the codes exist with their official texts; the class pages list the presets, which open free sheets', () => {
    for (const item of ITEMS) for (const level of ['presc', 'CP', 'I', 'II'] as const) for (const r of sheetCompetences(games([item]), level)) expect(findCompetence(r), `${item} ${level}`).toBeTruthy();
    expect(findCompetence({ programme: 'mem-p-ii', level: 'CP', code: '4.2' })?.text).toBe('Identificarea relațiilor de tipul „dacă... atunci…” între două evenimente succesive');
    const listed = (slug: string, code: string) => classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).flatMap((g) => g.items).filter((i) => i.code === code && i.programme !== 'clr-p-ii').flatMap((i) => i.presets.map((p) => p.id));
    expect(listed('gradinita', 'E.3.2')).toEqual(['partile-plantei', 'partile-corpului', 'simturile', 'cine-unde-traieste', 'cum-se-deplaseaza', 'puiul-cui-este']);
    expect(listed('gradinita', 'E.1.1')).toEqual(['anotimpurile', 'vremea']);
    expect(listed('gradinita', 'E.1.4')).toEqual(['ce-iei-cu-tine']);
    expect(listed('gradinita', 'D.2.3')).toEqual(['puiul-cui-este']);
    expect(listed('clasa-pregatitoare', '3.1')).toEqual(['anotimpurile']);
    expect(listed('clasa-pregatitoare', '4.1')).toEqual(['partile-plantei', 'partile-corpului', 'simturile', 'vremea']);
    expect(listed('clasa-pregatitoare', '4.2')).toEqual(['ce-iei-cu-tine']);
    expect(listed('clasa-1', '4.1')).toEqual(['apa-solida-lichida']);
    expect(listed('clasa-1', '4.2')).toEqual(['ce-se-intampla-cu-apa']);
    // and „Sortează după două criterii” (goluri.test.ts)
    expect(listed('clasa-2', '5.1')).toEqual(['mediile-de-viata', 'sortare-doua-criterii']);
    for (const preset of SHEET_PRESETS.filter((p) => p.config.selectedItems?.some(isExploreItem))) {
      for (const level of preset.levels!) {
        const cfg = presetConfig(preset, level);
        for (const item of cfg.selectedItems) expect(isItemAllowed(item, 'games', 'free'), `${preset.id} ${level}`).toBe(true);
        expect(sheetCompetences(cfg, level).length, `${preset.id} ${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('the grădiniță page now has sheets for 13 of its 23 behaviours', () => {
    const items = classCoverage(CLASS_PAGES.find((c) => c.slug === 'gradinita')!).flatMap((g) => g.items);
    // with D.3.3, E.1.2, E.2.3, E.2.5 (goluri.test.ts)
    expect([items.filter((i) => i.presets.length).length, items.length]).toEqual([13, 23]);
  });
});
