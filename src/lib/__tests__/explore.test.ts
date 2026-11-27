import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import {
  ALIVE_GRID, ALIVE_SETS, BABY_SETS, BODY_PARTS, COVER_SETS, CYCLE_SETS, DAY_SAY, DAY_SET, DRAWN_STAGES, EAT_SETS, EXPLORE_KINDS, EXPLORE_SETS, FACE_PARTS, FOOD_SETS,
  HABITAT_SET, HABITAT_SETS, HOME_SETS, MAT_SETS, MELT_OPTIONS, MELT_ROWS, MELT_ROWS_MORE, MOVE_SET, MOVE_SETS, ORGANS, PLANETS, PLANT_PARTS, RECYCLE_SAY, RECYCLE_SETS,
  SEASONS, SEASON_THINGS, SENSES, SENSE_SETS, SPACE_DESCRIBE, SPACE_NAMES, SPACE_WHO, TAME_SETS, TREE_PARTS, TULIP_PARTS, WARM_COLD, WATER_CYCLE, WATER_ROWS, WATER_ROWS_2,
  WATER_WHERE, WEAR, WEAR_SETS, WEATHER, WEATHER_SAY, isExploreItem,
} from '@/lib/worksheet/explore';
import {
  BODY, LABEL_SHEETS, PLANT, choiceLayout, choiceRows, circleGrid, cycleLayout, exploreItems, exploreKeySection, exploreLabel, exploreShortLabel, exploreTitle, habitatLayout, labelLayout,
  matchSet, obsGrid, seasonGrid,
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
const kindOf = (item: string) => item.split(':')[0];
const setsOf = (kind: string) => ITEMS.filter((i) => kindOf(i) === kind);
/** How each item is drawn (explore-pages.ts buildExplorePage). */
const LABEL_ITEMS = Object.keys(LABEL_SHEETS);
const MATCH_ITEMS = ['senses:1', ...setsOf('baby'), 'weather:1', ...setsOf('wear'), ...setsOf('eat'), 'space:2'];
const CIRCLE_ITEMS = ['water:2', 'alive:1'];
const SEASON_GRIDS = ['season:2', 'season:3', 'season:4', 'season:5'];
const CHOICE_ITEMS = ITEMS.filter((i) => ![...LABEL_ITEMS, ...MATCH_ITEMS, ...CIRCLE_ITEMS, ...SEASON_GRIDS].includes(i) && !['habitat', 'cycle', 'obs'].includes(kindOf(i)));
/** The sheets with nothing to check: the weather calendars and the plant diary. */
const OPEN_ITEMS = setsOf('obs');

describe('the items', () => {
  it('are activities with a label, and the store keeps exactly these', () => {
    expect(ITEMS).toHaveLength(Object.values(EXPLORE_SETS).reduce((a, b) => a + b, 0));
    expect(ITEMS).toHaveLength(75);
    expect(new Set(ITEMS).size).toBe(ITEMS.length);
    // at least three sets of every kind
    for (const k of EXPLORE_KINDS) expect(EXPLORE_SETS[k], k).toBeGreaterThanOrEqual(3);
    // every item is drawn by one of the pages
    expect(CHOICE_ITEMS).toHaveLength(75 - LABEL_ITEMS.length - MATCH_ITEMS.length - CIRCLE_ITEMS.length - SEASON_GRIDS.length - 3 - 3 - 3);
    expect(CHOICE_ITEMS).toHaveLength(40);
    for (const i of ITEMS) {
      expect(isExploreItem(i), i).toBe(true);
      expect(isActivityItem(i), i).toBe(true);
      expect(activityLabel(i)).toBe(exploreLabel(i));
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
    }
    expect([exploreLabel('home:2'), exploreLabel('season:4'), exploreLabel('season:1'), exploreLabel('melt:1')]).toEqual(['Cine unde trăiește? (2)', 'Ce se întâmplă toamna?', 'Anotimpurile', 'Ce se întâmplă cu apa?']);
    for (const no of ['plant:4', 'home:4', 'season:8', 'season:0', 'baby:', 'water', 'melts:1', 'water:5', 'space:5', 'obs:4', 'cycle:01', 'toString:1', 'constructor:1']) {
      expect(isExploreItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(isActivityItem(no));
    }
    // the store's own copy of the ids (sanitize-config.ts) matches the builders exactly
    for (const k of EXPLORE_KINDS) for (let n = 0; n <= 12; n++) {
      expect(isExploreItem(`${k}:${n}`), `${k}:${n}`).toBe(n >= 1 && n <= EXPLORE_SETS[k]);
      expect(itemFitsCategory(`${k}:${n}`, 'games'), `${k}:${n}`).toBe(n >= 1 && n <= EXPLORE_SETS[k]);
    }
    expect(sanitizeConfig(games(['plant:1', 'home:3', 'home:4', 'season:7', 'season:8', 'space:4'])).selectedItems).toEqual(['plant:1', 'home:3', 'season:7', 'space:4']);
    // no two items share a name in the lists; the names in the picker differ within a kind
    expect(new Set(ITEMS.map(exploreLabel)).size).toBe(ITEMS.length);
    for (const k of EXPLORE_KINDS) expect(new Set(setsOf(k).map(exploreShortLabel)).size, k).toBe(EXPLORE_SETS[k]);
    expect([exploreLabel('habitat:1'), exploreLabel('habitat:3'), exploreLabel('season:6'), exploreLabel('water:3'), exploreLabel('water:4'), exploreLabel('cycle:2'), exploreLabel('cycle:3'), exploreLabel('obs:2'), exploreTitle('home:3')]).toEqual([
      'Mediile de viață', 'Mediile de viață (3)', 'Anotimpurile (2)', 'Apa: solidă sau lichidă? (2)', 'Circuitul apei în natură', 'Cum cresc? (2)', 'Ce urmează?', 'Calendarul vremii: o lună', 'Cine unde trăiește?',
    ]);
  });

  it('every picture and symbol is in the icon set', () => {
    const emojis = [
      ...SENSES.map((s) => s[0]), ...HOME_SETS.flatMap((s) => [...s.choices.map((c) => c.symbol), ...s.rows.map((r) => r.picture)]),
      ...HABITAT_SET.choices.map((c) => c.symbol), ...HABITAT_SET.rows.map((r) => r.picture), ...MOVE_SET.choices.map((c) => c.symbol).filter(Boolean),
      ...MOVE_SET.rows.map((r) => r.picture), ...BABY_SETS.flat().map((b) => b[0]), ...SEASONS.flatMap((s) => SEASON_THINGS[s].map((t) => t[0])),
      ...WEATHER.map((w) => w[0]), ...WEAR.flatMap((w) => [w[0], w[2]]), ...WATER_ROWS.map((w) => w[0]), ...MELT_ROWS.map((m) => m[0]),
      // the sets and kinds added later
      ...[...HABITAT_SETS, ...MOVE_SETS, ...COVER_SETS, ...TAME_SETS, ...ALIVE_SETS, ...FOOD_SETS, ...MAT_SETS, ...RECYCLE_SETS, DAY_SET].flatMap((s) => [...s.choices.map((c) => c.symbol).filter(Boolean), ...s.rows.map((r) => r.picture)]),
      ...[...SENSE_SETS, WEATHER_SAY, RECYCLE_SAY, ...DAY_SAY, SPACE_DESCRIBE, SPACE_WHO].flatMap((s) => [...s.choices.map((c) => c.symbol).filter(Boolean), ...s.rows.map((r) => r.picture)]),
      ...WEAR_SETS.flatMap((w) => w.pairs.flatMap((x) => [x[0], x[2]])), ...WARM_COLD.map((w) => w[0]), ...WATER_ROWS_2.map((w) => w[0]), ...MELT_ROWS_MORE.flat().map((m) => m[0]),
      ...[WATER_WHERE, ALIVE_GRID].flatMap((g) => g.pictures.map((x) => x[0])), ...EAT_SETS.flat().flatMap((e) => [e[0], e[2]]), ...SPACE_NAMES.map((x) => x[0]),
      ...CYCLE_SETS.flat().flatMap((c) => c.stages.map((x) => x[0])).filter((x) => !(DRAWN_STAGES as readonly string[]).includes(x)),
    ];
    for (const e of emojis) expect(hasIcon(e), e).toBe(true);
    expect(emojis.length).toBeGreaterThan(500);
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

  it('the activity stays inside the page margins (12 mm) and above the note line', () => {
    for (const item of ITEMS) expect(opsOutside(page(item), { minX: 11.5, minY: 11.5, maxX: 210 - 11.5, maxY: 297 - 12 }), item).toEqual([]);
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

  it('the drawings added later: the tree, the tulip, the face, the organs, the water cycle, the planets', () => {
    const parts: Record<string, readonly string[]> = {
      'plant:1': PLANT_PARTS, 'plant:2': TREE_PARTS, 'plant:3': TULIP_PARTS, 'body:1': BODY_PARTS, 'body:2': FACE_PARTS, 'body:3': ORGANS, 'water:4': WATER_CYCLE, 'space:4': PLANETS,
    };
    expect(LABEL_ITEMS.sort()).toEqual(Object.keys(parts).sort());
    // a filled shape or a stroke of the part under the end of every line
    const near = (pic: typeof PLANT, at: Pt) => pic.shapes.some((s) => ('fill' in s ? inside(at, s.pts) : s.pts.slice(1).some((q, i) => {
      const a = s.pts[i];
      const t = Math.max(0, Math.min(1, ((at.x - a.x) * (q.x - a.x) + (at.y - a.y) * (q.y - a.y)) / ((q.x - a.x) ** 2 + (q.y - a.y) ** 2)));
      return Math.hypot(at.x - (a.x + t * (q.x - a.x)), at.y - (a.y + t * (q.y - a.y))) <= s.w / 2 + 0.5;
    })));
    for (const item of LABEL_ITEMS) {
      const { pic } = LABEL_SHEETS[item];
      expect(pic.targets.map((t) => t.word).sort(), item).toEqual([...parts[item]].sort());
      for (const t of pic.targets) for (const at of t.at) expect(near(pic, at), `${item} ${t.word}`).toBe(true);
      const lay = labelLayout(item, FRAME);
      // the boxes: on the page, not on each other, each word once in the bank, the answers in the order of the numbers
      lay.boxes.forEach((a, i) => {
        expect(a.x >= 12 - 0.01 && a.x + a.w <= 198.01 && a.y > FRAME + 20 && a.y + a.h <= 265.01, `${item} ${a.word}`).toBe(true);
        lay.boxes.slice(i + 1).forEach((b) => expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${item}: ${a.word} / ${b.word}`).toBe(true));
        // the line does not end under a box
        for (const to of a.to) for (const b of lay.boxes) expect(to.x > b.x && to.x < b.x + b.w && to.y > b.y && to.y < b.y + b.h, `${item}: ${a.word} under ${b.word}`).toBe(false);
      });
      expect(lay.bank.map((b) => b.word).sort()).toEqual(lay.boxes.map((b) => b.word).sort());
      lay.bank.forEach((b, i) => expect(b.word, item).not.toBe(pic.targets[i].word));
      expect(exploreKeySection(item)?.entries).toEqual(lay.boxes.map((b) => b.word));
      const t = texts(page(item));
      for (const w of parts[item]) expect(t.filter((x) => x === w), `${item} ${w}`).toHaveLength(1);
    }
    // the water cycle and the planets are numbered in their own order
    expect(exploreKeySection('water:4')?.entries).toEqual([...WATER_CYCLE]);
    expect(exploreKeySection('space:4')?.entries).toEqual([...PLANETS]);
    expect(texts(page('space:4'))).toContain('De la Soare spre margine: Mercur, Venus, Pământ, Marte, Jupiter, Saturn, Uranus, Neptun.');
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
      const { set, rowChoices, sentences } = choiceRows(item);
      for (const r of set.rows) expect(r.answer >= 0 && r.answer < set.choices.length, item).toBe(true);
      expect(set.rows.length >= 6 && set.rows.length <= 8, item).toBe(true);
      // every choice is the answer of some row, and no choice of most of them (the rows with their own two words apart)
      if (!rowChoices) {
        for (let c = 0; c < set.choices.length; c++) expect(set.rows.some((r) => r.answer === c), `${item} ${set.choices[c].label}`).toBe(true);
        expect(Math.max(...set.choices.map((_, c) => set.rows.filter((r) => r.answer === c).length)), item).toBeLessThanOrEqual(Math.ceil(set.rows.length / 2));
      } else expect(new Set(set.rows.map((r) => r.answer)).size, item).toBe(2);
      expect(new Set(set.choices.map((c) => c.label)).size, item).toBe(set.choices.length);
      // a picture is on one row only, unless a sentence tells the rows apart
      if (!sentences) expect(new Set(set.rows.map((r) => r.picture)).size, item).toBe(set.rows.length);
      else expect(new Set(sentences).size, item).toBe(sentences.length);
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
      const { set, rowChoices, sentences } = choiceRows(item);
      const t = texts(page(item));
      if (rowChoices) rowChoices.forEach((row) => expect(row.map((c) => c.label).every((l) => t.includes(l)), item).toBe(true));
      else for (const c of set.choices) expect(t.filter((x) => x === c.label), `${item} ${c.label}`).toHaveLength(set.rows.length);
      for (const s of sentences ?? []) expect(t, `${item}: ${s}`).toContain(s);
    }
  });

  it('the rows with a sentence: Romanian sentences, the answer written out in the key', () => {
    const sets = [...SENSE_SETS, WEATHER_SAY, RECYCLE_SAY, ...DAY_SAY, SPACE_DESCRIBE, SPACE_WHO];
    for (const s of sets) for (const r of s.rows) {
      expect(r.text, r.text).toMatch(/^\p{Lu}/u);
      expect(r.text, r.text).not.toMatch(/[şţŞŢ]|\s{2}/);
      if (r.options) expect(new Set(r.options).size).toBe(2);
    }
    expect(exploreKeySection('space:1')?.entries.slice(0, 3)).toEqual(['Soarele este fierbinte', 'Pământul are forma unei mingi', 'Luna se vede cel mai bine noaptea']);
    expect(exploreKeySection('space:1')?.entries[6]).toBe('Luna este mai mică decât Pământul');
    expect(exploreKeySection('senses:3')?.entries[0]).toBe('Aud trompeta cu urechile');
    expect(exploreKeySection('senses:2')?.entries[2]).toBe('Lămâia acră – gust');
    expect(exploreKeySection('day:3')?.entries[1]).toBe('Noaptea, Soarele se stinge – nu');
    expect(exploreKeySection('recycle:3')?.entries[3]).toBe('Rup crengile copacilor – nu e bine');
    expect(exploreKeySection('weather:3')?.entries[3]).toBe('Pe cer apare o lumină puternică, apoi se aude tunetul – fulger');
    expect(exploreKeySection('melt:3')?.entries[4]).toBe('Cubul de gheață stă în ceaiul fierbinte – se topește');
    // the pictures of „Soarele, Pământul sau Luna?” do not tell the answer
    for (const r of SPACE_WHO.rows) expect(['☀️', '🌍', '🌙'], r.text).not.toContain(r.picture);
  });

  it('the answers of the sets added later, row by row', () => {
    expect(exploreKeySection('cover:1')?.entries.slice(0, 3)).toEqual(['ursul – blană', 'găina – pene', 'peștele – solzi']);
    expect(exploreKeySection('tame:1')?.entries.slice(0, 2)).toEqual(['vaca – domestic', 'ursul – sălbatic']);
    expect(exploreKeySection('mat:1')?.entries.slice(0, 4)).toEqual(['scaunul – lemn', 'cheia – metal', 'periuța de dinți – plastic', 'borcanul – sticlă']);
    expect(exploreKeySection('recycle:2')?.entries[3]).toBe('frunzele uscate – compost');
    expect(exploreKeySection('food:3')?.entries[2]).toBe('pulpa de pui – carne, pește');
    expect(exploreKeySection('day:1')?.entries[3]).toBe('bufnița – noaptea');
    expect(exploreKeySection('alive:2')?.entries[1]).toBe('robotul – nu este viu');
    expect(exploreKeySection('home:3')?.entries[0]).toBe('mistrețul – în pădure');
    expect(exploreKeySection('move:2')?.entries[3]).toBe('omida – se târăște');
    expect(exploreKeySection('weather:2')?.entries[1]).toBe('mănușile – frig');
    expect(exploreKeySection('water:3')?.entries[0]).toBe('zăpada de pe munte – solidă');
    // what was left out on purpose stays out: animals with two answers, things of two materials
    const names = (sets: { rows: { name: string }[] }[]) => sets.flatMap((s) => s.rows.map((r) => r.name));
    for (const no of ['oaia', 'calul', 'ariciul', 'țestoasa', 'rechinul']) expect(names(COVER_SETS), no).not.toContain(no);
    for (const no of ['rața', 'gâsca', 'iepurele', 'cămila']) expect(names(TAME_SETS), no).not.toContain(no);
    for (const no of ['fereastra', 'oglinda', 'ciocanul', 'scara', 'pixul', 'paharul cu pai']) expect(names(MAT_SETS), no).not.toContain(no);
    for (const no of ['rața', 'pinguinul', 'liliacul', 'broasca']) expect(names(MOVE_SETS), no).not.toContain(no);
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
    expect(exploreKeySection('habitat:1')?.entries).toContain('pinguinul – Polul Sud');
    // the three tables: five columns of the programme's list, eight animals, every column used, the X of the example in its column
    expect(HABITAT_SETS[0]).toBe(HABITAT_SET);
    const programme = ['BALTA', 'PĂDUREA', 'DELTA DUNĂRII', 'MAREA NEAGRĂ', 'DEȘERTUL', 'POLUL NORD', 'POLUL SUD'];
    HABITAT_SETS.forEach((set, k) => {
      expect([set.choices.length, set.rows.length]).toEqual([5, 8]);
      for (const c of set.choices) expect(programme, c.label).toContain(c.label);
      expect(new Set(set.rows.map((r) => r.answer)).size).toBe(5);
      expect(new Set(set.rows.map((r) => r.picture)).size).toBe(8);
      const lines = flattenOps(page(`habitat:${k + 1}`).ops).filter((o): o is Extract<DrawOp, { t: 'line' }> => o.t === 'line' && o.stroke === '#E8913A' && !!o.dash);
      expect(Math.floor(((lines[0].x1 + lines[0].x2) / 2 - t.x - t.firstW) / t.colW), `habitat:${k + 1}`).toBe(set.rows[0].answer);
      const names = texts(page(`habitat:${k + 1}`));
      for (const r of set.rows) expect(names).toContain(r.name);
    });
    expect(exploreKeySection('habitat:2')?.entries[0]).toBe('lebăda – balta');
    // the names of places with their capitals
    expect(exploreKeySection('habitat:3')?.entries).toContain('meduza – Marea Neagră');
    expect(exploreKeySection('habitat:3')?.entries[0]).toBe('broasca – Delta Dunării');
    expect(exploreKeySection('habitat:2')?.entries[3]).toBe('ursul polar – Polul Nord');
    expect(exploreKeySection('space:1')?.entries[4]).toBe('Noi trăim pe Pământ');
    expect(exploreKeySection('space:3')?.entries.slice(0, 3)).toEqual(['Este o stea fierbinte – Soarele', 'Este planeta pe care trăim – Pământul', 'Se vede pe cer mai ales noaptea – Luna']);
    // a sea animal only where the table has no pond, a pond animal only where it has no delta
    expect(HABITAT_SETS[1].choices.map((c) => c.label)).not.toContain('MAREA NEAGRĂ');
    expect(HABITAT_SETS[2].choices.map((c) => c.label)).not.toContain('BALTA');
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
    expect(MATCH_ITEMS).toHaveLength(12);
    for (const item of MATCH_ITEMS) {
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
    // the goose and the duck (both with a „boboc”) are never in one set
    for (const s of BABY_SETS) expect(s.some((b) => b[1] === 'gâsca') && s.some((b) => b[1] === 'rața')).toBe(false);
    // „Cine ce mănâncă?”: six animals, six foods, none twice; the pictures on both sides
    for (const s of EAT_SETS) {
      expect(s).toHaveLength(6);
      expect(new Set(s.map((e) => e[0])).size).toBe(6);
      expect(new Set(s.map((e) => e[2])).size).toBe(6);
    }
    expect(exploreKeySection('eat:1')?.entries[0]).toBe('iepurele – morcovul');
    // one way to pair them: a set never has the cat next to the fish, nor the fly next to the worm, nor two kinds of leaves
    for (const s of EAT_SETS) {
      const foods = s.map((e) => e[3]);
      expect(s.some((e) => e[1] === 'pisica') && foods.includes('peștele')).toBe(false);
      expect(foods.includes('musca') && foods.includes('râma')).toBe(false);
      expect(foods.filter((f) => ['iarba', 'frunzele', 'salata'].includes(f)).length).toBeLessThanOrEqual(1);
    }
    for (const w of WEAR_SETS) {
      expect(w.pairs).toHaveLength(4);
      expect(new Set(w.pairs.map((x) => x[0])).size).toBe(4);
      expect(new Set(w.pairs.map((x) => x[2])).size).toBe(4);
    }
    expect(WEAR_SETS[0].pairs).toBe(WEAR);
    expect(exploreKeySection('wear:2')?.entries[3]).toBe('fulgeră – casa (stai înăuntru)');
    expect(exploreKeySection('space:2')?.entries).toEqual(['Soarele', 'Pământul', 'Luna', 'Steaua', 'Planeta', 'Racheta']);
  });

  it('the grids to circle in: twelve different pictures, six of them to circle; the example is one of them', () => {
    for (const item of CIRCLE_ITEMS) {
      const grid = circleGrid(item, FRAME + 2);
      expect(grid).toHaveLength(12);
      expect(new Set(grid.map((g) => g.picture)).size).toBe(12);
      expect(grid.filter((g) => g.yes)).toHaveLength(6);
      const key = exploreKeySection(item)!.entries;
      expect(key[0]).toMatch(/^Se încercuiesc \(6\): /);
      for (const g of grid) expect(key[g.yes ? 0 : 1], g.name).toContain(g.name);
      const ring = page(item).ops.find((o) => o.t === 'circle' && o.stroke === '#E8913A');
      const first = grid.find((g) => g.yes)!;
      expect(ring?.t === 'circle' && Math.abs(ring.cx - first.cx) < 0.01 && Math.abs(ring.cy - first.cy) < 0.01, item).toBe(true);
    }
    // the child is among the living things; what only looks alive is not
    expect(ALIVE_GRID.pictures.find((p) => p[1] === 'copilul')?.[2]).toBe(true);
    expect(ALIVE_GRID.pictures.find((p) => p[1] === 'ursulețul de pluș')?.[2]).toBe(false);
  });

  it('„Cum cresc?”: three rows of four stages, never in their own order; the box with 1 is on the first stage', () => {
    expect(CYCLE_SETS.flat()).toHaveLength(9);
    expect(new Set(CYCLE_SETS.flat().map((c) => c.name)).size).toBe(9);
    for (let n = 1; n <= 3; n++) {
      const rows = cycleLayout(n, FRAME);
      expect(rows).toHaveLength(3);
      const p = page(`cycle:${n}`);
      const ones = flattenOps(p.ops).filter((o): o is Extract<DrawOp, { t: 'text' }> => o.t === 'text' && o.text === '1' && o.fill === '#E8913A');
      expect(ones).toHaveLength(3);
      const key = exploreKeySection(`cycle:${n}`)!.entries;
      rows.forEach((row, r) => {
        expect(row.cycle.stages).toHaveLength(4);
        expect(new Set(row.cycle.stages.map((s) => s[0])).size, row.cycle.name).toBe(4);
        expect([...row.order].sort()).toEqual([0, 1, 2, 3]);
        row.order.forEach((k, i) => expect(k, row.cycle.name).not.toBe(i));
        const box = row.cells[row.order.indexOf(0)].box;
        expect(ones.some((o) => o.x > box.x && o.x < box.x + box.s && o.y > box.y && o.y < box.y + box.s + 1), row.cycle.name).toBe(true);
        expect(key[r]).toBe(`${row.cycle.name}: ${row.order.map((k) => k + 1).join(', ')} (${row.cycle.stages.map((s) => s[1]).join(', ')})`);
      });
    }
    expect(exploreKeySection('cycle:1')?.entries[0]).toContain('(oul, puiul iese din ou, puiul, găina)');
  });

  it('the observation sheets have nothing to check: a table to fill in, no answers', () => {
    for (const item of OPEN_ITEMS) expect(exploreKeySection(item), item).toBeNull();
    expect([obsGrid(1, FRAME).cols, obsGrid(2, FRAME).cols * obsGrid(2, FRAME).rows, obsGrid(3, FRAME).cols * obsGrid(3, FRAME).rows]).toEqual([5, 35, 4]);
    const week = texts(page('obs:1'));
    for (const d of ['LUNI', 'MARȚI', 'MIERCURI', 'JOI', 'VINERI']) expect(week).toContain(d);
    for (const [, w] of WEATHER) expect(week).toContain(w);
    expect(texts(page('obs:3'))).toContain('Ziua 10');
    // with the answers page asked for and nothing else on the sheet, there is no answers page
    expect(buildWorksheetPages(games(OPEN_ITEMS, { mathAnswers: true }), 'full')).toHaveLength(3);
  });

  it('the answers page has a section for every item', () => {
    const answers = gameAnswerPages(games(ITEMS, { mathAnswers: true }), 'full');
    const t = answers.flatMap((ops) => texts({ width: 210, height: 297, ops }));
    for (const i of ITEMS) expect(t.includes(exploreLabel(i)), i).toBe(!OPEN_ITEMS.includes(i));
  });
});

describe('the competences', () => {
  const codes = (item: string, level: SchoolLevel) => sheetCompetences(games([item]), level).map((r) => (r.domain ? `${r.domain}.${r.code}` : r.code));

  it('each kind prints the codes of its class only', () => {
    const table: Record<string, Partial<Record<SchoolLevel, string[]>>> = {
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
      // the sets added later of the kinds above: the code of their kind, or their own
      'plant:2': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] }, 'plant:3': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] },
      'body:2': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] }, 'body:3': { presc: [], CP: [], I: ['4.1'], II: [] },
      'senses:2': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] }, 'senses:3': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] },
      'home:3': { presc: ['E.3.2'], CP: ['5.1'], I: [], II: [] }, 'move:3': { presc: ['E.3.2'], CP: ['5.1'], I: [], II: [] },
      'habitat:2': { presc: [], CP: [], I: [], II: ['5.1'] }, 'habitat:3': { presc: [], CP: [], I: [], II: ['5.1'] },
      'baby:3': { presc: ['D.2.3', 'E.3.2'], CP: [], I: [], II: [] }, 'season:7': { presc: ['E.1.1'], CP: ['3.1'], I: [], II: [] },
      'weather:2': { presc: ['E.1.1'], CP: ['4.1'], I: [], II: [] }, 'weather:3': { presc: ['E.1.1'], CP: ['4.1'], I: [], II: [] },
      'wear:2': { presc: ['E.1.4'], CP: ['4.2'], I: [], II: [] }, 'wear:3': { presc: ['E.1.4'], CP: ['4.2'], I: [], II: [] },
      'water:2': { presc: ['E.3.2'], CP: ['5.1'], I: [], II: [] }, 'water:3': { presc: [], CP: [], I: ['4.1'], II: [] }, 'water:4': { presc: [], CP: [], I: ['4.1'], II: [] },
      'melt:2': { presc: [], CP: [], I: ['4.2'], II: [] }, 'melt:3': { presc: [], CP: [], I: ['4.2'], II: [] },
      // the kinds added later
      'cycle:1': { presc: ['E.3.2'], CP: ['3.1'], I: [], II: [] }, 'cycle:3': { presc: ['E.3.2'], CP: ['3.1'], I: [], II: [] },
      'cover:2': { presc: ['E.3.2'], CP: ['5.1'], I: [], II: [] }, 'tame:3': { presc: ['E.3.2'], CP: ['5.1'], I: [], II: [] }, 'eat:1': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] },
      'alive:1': { presc: ['E.3.4'], CP: ['5.1'], I: [], II: [] }, 'alive:2': { presc: ['E.3.4'], CP: ['5.1'], I: [], II: [] }, 'alive:3': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] },
      'food:1': { presc: [], CP: ['5.1'], I: [], II: [] }, 'food:3': { presc: [], CP: ['5.1'], I: [], II: [] },
      'mat:1': { presc: ['E.2.4'], CP: ['5.1'], I: [], II: [] }, 'recycle:1': { presc: ['E.2.4'], CP: ['5.1'], I: [], II: [] }, 'recycle:2': { presc: ['E.2.4'], CP: ['5.1'], I: [], II: [] },
      'day:1': { presc: ['E.1.1'], CP: ['3.1'], I: [], II: [] }, 'day:2': { presc: ['E.1.1'], CP: ['3.1'], I: [], II: [] },
      'space:1': { presc: ['E.3.3'], CP: ['4.1'], I: [], II: [] }, 'space:2': { presc: ['E.3.2'], CP: ['4.1'], I: [], II: [] }, 'space:3': { presc: [], CP: [], I: ['4.1'], II: [] },
      'obs:1': { presc: ['E.1.5'], CP: ['4.1'], I: ['4.1'], II: [] }, 'obs:3': { presc: ['E.1.5'], CP: ['4.1'], I: ['4.1'], II: [] },
      // no code where no behaviour or competence fits: an attitude, and the contents of clasa a II-a that no competence names
      'recycle:3': { presc: [], CP: [], I: [], II: [] }, 'day:3': { presc: [], CP: [], I: [], II: [] }, 'space:4': { presc: [], CP: [], I: [], II: [] },
    };
    // every kind is in the table
    for (const k of EXPLORE_KINDS) expect(Object.keys(table).some((i) => kindOf(i) === k), k).toBe(true);
    for (const [item, byLevel] of Object.entries(table)) for (const [level, want] of Object.entries(byLevel)) expect(codes(item, level as SchoolLevel), `${item} ${level}`).toEqual(want);
    expect(sheetCompetenceLabel(games(['wear:1']), 'CP')).toBe('Competența specifică 4.2 · Matematică și explorarea mediului, clasa pregătitoare');
    expect(sheetCompetenceLabel(games(['baby:2']), 'presc')).toBe('Comportamente vizate D.2.3, E.3.2 · Curriculum pentru educație timpurie, nivel preșcolar');
  });

  it('the codes exist with their official texts; the class pages list the presets, which open free sheets', () => {
    for (const item of ITEMS) for (const level of ['presc', 'CP', 'I', 'II'] as const) for (const r of sheetCompetences(games([item]), level)) expect(findCompetence(r), `${item} ${level}`).toBeTruthy();
    expect(findCompetence({ programme: 'mem-p-ii', level: 'CP', code: '4.2' })?.text).toBe('Identificarea relațiilor de tipul „dacă... atunci…” între două evenimente succesive');
    const behaviour = (domain: 'D' | 'E', code: string) => findCompetence({ programme: 'et-presc', level: '3-6', domain, code })?.text;
    expect(behaviour('E', '1.5')).toBe('Realizează, în mod dirijat, activități simple de investigare a mediului, folosind instrumente și metode specifice');
    expect(behaviour('E', '3.3')).toBe('Descrie unele caracteristici ale lumii vii, ale Pământului și Spațiului');
    expect(behaviour('E', '3.4')).toBe('Demonstrează cunoașterea poziției omului în univers, ca parte a lumii vii și ca ființă socială');
    expect(behaviour('E', '2.4')).toBe('Efectuează operații de seriere, grupare, clasificare, măsurare a obiectelor');
    expect(findCompetence({ programme: 'mem-p-ii', level: 'CP', code: '5.1' })?.text).toBe('Sortarea/clasificarea unor obiecte/ materiale etc., pe baza unui criteriu dat');
    expect(findCompetence({ programme: 'mem-p-ii', level: 'CP', code: '3.1' })?.text).toBe('Descrierea unor fenomene/procese/ structuri repetitive simple din mediul apropiat, în scopul identificării unor regularități');
    expect(findCompetence({ programme: 'mem-p-ii', level: 'I', code: '4.1' })?.text).toBe('Formularea rezultatelor unor observații, folosind câțiva termeni științifici, reprezentări prin desene și operatorii logici „și”, „sau”, „nu”');
    // the class pages also list Arte vizuale, Dezvoltare personală and limba modernă: only the MEM (preschool: the curriculum) codes here
    const listed = (slug: string, code: string) => classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).flatMap((g) => g.items).filter((i) => i.code === code && (i.programme === 'et-presc' || i.programme === 'mem-p-ii')).flatMap((i) => i.presets.map((p) => p.id));
    expect(listed('gradinita', 'E.3.2')).toEqual(['partile-plantei', 'partile-corpului', 'simturile', 'cine-unde-traieste', 'cum-se-deplaseaza', 'puiul-cui-este']);
    expect(listed('gradinita', 'E.1.1')).toEqual(['anotimpurile', 'vremea']);
    expect(listed('gradinita', 'E.1.4')).toEqual(['ce-iei-cu-tine']);
    // the three behaviours the kinds added later cover for the first time
    expect(listed('gradinita', 'E.1.5')).toEqual(['calendarul-vremii']);
    expect(listed('gradinita', 'E.3.3')).toEqual(['pamant-soare-luna']);
    expect(listed('gradinita', 'E.3.4')).toEqual(['ce-este-viu']);
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

  it('the grădiniță page now has sheets for 16 of its 23 behaviours', () => {
    const items = classCoverage(CLASS_PAGES.find((c) => c.slug === 'gradinita')!).flatMap((g) => g.items);
    // with D.3.3, E.1.2, E.2.3, E.2.5 (goluri.test.ts), and E.1.5, E.3.3, E.3.4
    expect([items.filter((i) => i.presets.length).length, items.length]).toEqual([16, 23]);
    expect(items.filter((i) => !i.presets.length).map((i) => i.code)).toEqual(['D.1.1', 'D.1.2', 'D.2.1', 'D.2.2', 'D.3.1', 'E.1.3', 'E.3.1']);
  });
});
