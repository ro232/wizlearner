import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { buildGroupPages } from '@/lib/worksheet/group';
import { VARIANT_MAX, cleanVariant, currentVariant, hasVariants, variantOf, vkey, withVariant } from '@/lib/worksheet/variant';
import { DOT_SHAPES, countSet, diacriticTwins, dotPoints, findGrid, isActivityItem } from '@/lib/worksheet/activities';
import { gameAnswerPages, gameKeySection } from '@/lib/worksheet/game-keys';
import { PHONO_WORDS } from '@/lib/worksheet/phonology';
import { SOUND_LETTERS, firstSet, soundSet, splitSet, sylSet } from '@/lib/worksheet/phonology-pages';
import { CATEGORY_FAMILY, SORT_OBJECTS, obj } from '@/lib/worksheet/sorting';
import { SORT_SETS, colourMisleads, drawPanels, gridLayout, groupSet, oddRows, sceneLayout, secondGroupLink, sortLayout, sortPictures } from '@/lib/worksheet/sorting-pages';
import { COLOUR_PICTURES, MAZE_SETS, SCENES, SCENE_SWAPS, SHADOW_POOLS, SHADOW_SETS, TRACE_PAIRS, TRACE_SETS, TRACE_WINTER_PAIRS } from '@/lib/worksheet/fun';
import {
  SCENE_H, SCENE_W, colourLayout, colourPicture, colourRaster, colourSums, diffSpots, funKeySection, mazeNeighbours, mazeOf, sceneObjects, sceneOf, shadowLayout, shadowSet,
  sumValue, traceRows, traceSet,
} from '@/lib/worksheet/fun-pages';
import {
  AROUND_SHAPES, MINUS, PLACE_SETS, SOLIDS, SYMMETRY_POOL, TIMES, aroundRows, cellName, cmpSign, coordSet, growingCount, moreRows, nextPicture, numberRow, opsThatFit, pictCounts,
  placeSet, regularSet, sidesSet, sort2Set, termsSet,
} from '@/lib/worksheet/mem';
import { memKeySection, pictLayout, solidLayout, sort2Layout } from '@/lib/worksheet/mem-pages';
import { numberWords } from '@/lib/worksheet/number-words';
import { MONTHS, SCHOOL_YEAR_MONTHS, calmonthSheet } from '@/lib/worksheet/calendar-pages';
import { UNIT_MM_II, WEIGHED, WEIGHTS, lengthSheet, lengthSheetII, massSheetII, massAnswersII, weightsFor } from '@/lib/worksheet/measure';
import { rng, seedOf } from '@/lib/worksheet/page-kit';
import { hasIcon, silhouetteOps } from '@/lib/hints/icons';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { sanitizeGroupProject } from '@/components/projects/sanitize-project';
import { configForSaving } from '@/lib/worksheet/saved';
import { createHomeworkToken, homeworkKeys, verifyHomeworkToken } from '@/lib/homework/token';
import { homeworkPages } from '@/lib/homework/pages';
import { SHEET_PRESETS, presetConfig } from '@/lib/curriculum/presets';
import { sheetCompetences } from '@/lib/curriculum/sheet';
import { opsOutside } from './bounds';
import { textOverlaps } from './drawn';

/**
 * „Altă variantă”: every family that draws its sheet from a pool, over the seeds 1…40 — the same sheet for
 * the same seed, enough different sheets, the rules of the family in every one, the answers from the same
 * draw, everything on the paper. The first variant is the sheet as it always was (the fingerprints of
 * sheets-visual.test.ts hold that).
 */

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const games = (items: string[], extra: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, ...extra });
const pagesOf = (items: string[], seed: number, extra: Partial<WorksheetConfig> = {}) => buildWorksheetPages(games(items, { mathAnswers: true, ...(seed > 1 ? { variantSeed: seed } : {}), ...extra }), 'full');
const texts = (p: PageOps) => flattenOps(p.ops).flatMap((o) => (o.t === 'text' ? [o.text] : []));
const FRAME = 51;
const AREA = { minX: 5, minY: 5, maxX: 205, maxY: 292 };

/** The items of every family that has variants, and how many different sheets 40 seeds must give at least. */
const FAMILIES: Record<string, { items: string[]; min: number }> = {
  find: { items: ['find:A', 'find:M', 'find:Ș'], min: 40 },
  count: { items: ['count:5', 'count:10'], min: 38 },
  dots: { items: DOT_SHAPES.map((d) => `dots:${d}`), min: 12 },
  sound: { items: SOUND_LETTERS.map((l) => `sound:${l}`), min: 40 },
  first: { items: [1, 2, 3, 4, 5, 6].map((n) => `first:${n}`), min: 40 },
  syl: { items: [1, 2, 3, 4, 5, 6].map((n) => `syl:${n}`), min: 40 },
  split: { items: [1, 2, 3, 4, 5, 6].map((n) => `split:${n}`), min: 40 },
  sort: { items: [1, 2, 3, 4, 5, 6].map((n) => `sort:${n}`), min: 38 },
  odd: { items: [1, 2, 3, 4, 5, 6].map((n) => `odd:${n}`), min: 40 },
  group: { items: [1, 2, 3, 4, 5, 6].map((n) => `group:${n}`), min: 40 },
  pos: { items: [1, 2, 3, 4, 5, 6].map((n) => `pos:${n}`), min: 40 },
  color: { items: [1, 2, 3, 4, 5, 6].map((n) => `color:${n}`), min: 15 },
  colsum: { items: [1, 2, 3, 4, 5, 6].map((n) => `colsum:${n}`), min: 40 },
  maze: { items: [1, 2, 3, 4, 5, 6].map((n) => `maze:${n}`), min: 40 },
  diff: { items: [1, 2, 3, 4, 5, 6].map((n) => `diff:${n}`), min: 30 },
  trace: { items: [1, 2, 3, 4, 5, 6].map((n) => `trace:${n}`), min: 38 },
  shadow: { items: [1, 2, 3, 4, 5, 6].map((n) => `shadow:${n}`), min: 40 },
  terms: { items: [1, 2, 3, 4, 5, 6].map((n) => `terms:${n}`), min: 40 },
  place: { items: [1, 2, 3].map((n) => `place:${n}`), min: 40 },
  coord: { items: [1, 2, 3].map((n) => `coord:${n}`), min: 40 },
  sides: { items: ['sides:1'], min: 38 },
  solid: { items: ['solid:1'], min: 38 },
  regular: { items: [1, 2, 3, 4].map((n) => `regular:${n}`), min: 40 },
  sort2: { items: ['sort2:1', 'sort2:2'], min: 40 },
  around: { items: ['around:1'], min: 40 },
  pict: { items: ['pict:1', 'pict:2'], min: 40 },
  more: { items: ['more:1'], min: 40 },
};

describe('the seed', () => {
  it('is a whole number 1…999 999; anything else is the first variant; the first variant is not written', () => {
    expect([cleanVariant(undefined), cleanVariant('7'), cleanVariant(NaN), cleanVariant(0), cleanVariant(-3), cleanVariant(2.4), cleanVariant(1e12)]).toEqual([1, 1, 1, 1, 1, 2, VARIANT_MAX]);
    expect(variantOf(games([]))).toBe(1);
    expect(sanitizeConfig(games(['sort:1'], { variantSeed: 7 })).variantSeed).toBe(7);
    for (const bad of [1, 0, -5, NaN, Infinity, '9', null, {}]) expect('variantSeed' in sanitizeConfig({ ...games(['sort:1']), variantSeed: bad }), String(bad)).toBe(false);
    expect(sanitizeConfig({ ...games(['sort:1']), variantSeed: 12.6 }).variantSeed).toBe(13);
    expect(sanitizeConfig({ ...games(['sort:1']), variantSeed: 5e9 }).variantSeed).toBe(VARIANT_MAX);
    // an old sheet, saved before there were variants, comes out as it went in
    expect(sanitizeConfig(games(['sort:1']))).toEqual(sanitizeConfig({ ...games(['sort:1']), variantSeed: 1 }));
    expect(vkey('sort:1', 1)).toBe('sort:1');
    expect(vkey('sort:1', 2)).not.toBe('sort:1');
  });

  it('the variant of a build is set for the build only, and nested builds put it back', () => {
    expect(currentVariant()).toBe(1);
    expect(withVariant(5, () => [currentVariant(), withVariant(9, currentVariant), currentVariant()])).toEqual([5, 9, 5]);
    expect(() => withVariant(4, () => { throw new Error('x'); })).toThrow();
    expect(currentVariant()).toBe(1);
    buildWorksheetPages(games(['odd:1'], { variantSeed: 6 }), 'full');
    expect(currentVariant()).toBe(1);
  });

  it('„Altă variantă” in the store: the next variant, back to the first, kept by the sheet that is saved', () => {
    const store = useWorksheetStore;
    store.setState({ config: games(['maze:1']) });
    expect(store.getState().config.variantSeed).toBeUndefined();
    store.getState().newVariant();
    store.getState().newVariant();
    expect(store.getState().config.variantSeed).toBe(3);
    expect(configForSaving(store.getState().config).variantSeed).toBe(3);
    store.getState().newVariant(true);
    expect('variantSeed' in store.getState().config).toBe(false);
    store.setState({ config: { ...games(['maze:1']), variantSeed: VARIANT_MAX } });
    store.getState().newVariant();
    expect(store.getState().config.variantSeed).toBe(2);
    store.getState().resetConfig();
  });

  it('which items have variants: the drawn families, not the authored texts and experiments', () => {
    for (const f of Object.values(FAMILIES)) for (const i of f.items) {
      expect(hasVariants(i), i).toBe(true);
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
      expect(isActivityItem(i), i).toBe(true);
    }
    for (const i of ['plan:1', 'cause:2', 'read:text:1', 'story:1', 'plant:1', 'sym:1', 'lect:1', 'nr:1', 'add']) expect(hasVariants(i), i).toBe(false);
  });

  it('the presets and the first variant draw the sheet as it always was', () => {
    for (const p of SHEET_PRESETS) for (const level of p.levels ?? []) expect('variantSeed' in sanitizeConfig(presetConfig(p, level)), p.id).toBe(false);
    const items = Object.values(FAMILIES).map((f) => f.items[0]);
    expect(JSON.stringify(buildWorksheetPages(games(items, { mathAnswers: true, variantSeed: 1 }), 'full'))).toBe(JSON.stringify(buildWorksheetPages(games(items, { mathAnswers: true }), 'full')));
  });

  it('the authored sheets do not change with the seed', () => {
    const items = ['plan:1', 'plan:2', 'cause:1', 'cause:2', 'read:match:1', 'read:text:1', 'story:1', 'sign:1', 'plant:1', 'season:1', 'sym:1', 'feel:1'];
    const a = JSON.stringify(pagesOf(items, 1));
    for (const seed of [2, 17]) expect(JSON.stringify(pagesOf(items, seed))).toBe(a);
  });
});

describe('every family, seeds 1…40', () => {
  const report: string[] = [];
  for (const [family, { items, min }] of Object.entries(FAMILIES)) {
    it(`${family}: the same sheet for the same seed, at least ${min} different sheets, on the paper, the answers from the same draw`, () => {
      let least = Infinity;
      for (const item of items) {
        const seen = new Set<string>();
        for (const seed of SEEDS) {
          const pages = pagesOf([item], seed, { curriculumLevel: 'CP' });
          const json = JSON.stringify(pages);
          if (seed % 13 === 2) expect(JSON.stringify(pagesOf([item], seed, { curriculumLevel: 'CP' })), `${item} ${seed}`).toBe(json);
          seen.add(JSON.stringify(pages[0]));
          pages.forEach((p, i) => {
            expect([p.width, p.height]).toEqual([210, 297]);
            expect(opsOutside(p, AREA), `${item} seed ${seed} page ${i + 1}`).toEqual([]);
            expect(textOverlaps(p), `${item} seed ${seed} page ${i + 1}`).toEqual([]);
          });
          for (const t of pages.flatMap(texts)) expect(t).not.toMatch(/[şţŞŢ]/);
          // the answers page of the sheet is the answers of this variant
          const config = games([item], { mathAnswers: true, curriculumLevel: 'CP', ...(seed > 1 ? { variantSeed: seed } : {}) });
          const key = gameKeySection(config, item);
          if (key) {
            expect(pages.length, `${item} ${seed}`).toBeGreaterThan(1);
            const printed = pages.slice(1).flatMap(texts).join('\n');
            expect(printed, `${item} ${seed}`).toContain(key.title);
            expect(withVariant(seed, () => gameKeySection({ ...config, variantSeed: seed }, item))).toEqual(key);
          }
        }
        least = Math.min(least, seen.size);
        expect(seen.size, `${item}: different sheets in 40 seeds`).toBeGreaterThanOrEqual(min);
      }
      report.push(`${family}: ${least}`);
    });
  }
  it('prints how many different sheets each family gave', () => {
    console.log(`distinct sheets in 40 seeds (the least over the items of a family) — ${report.join(', ')}`);
    expect(report).toHaveLength(Object.keys(FAMILIES).length);
  });
});

describe('„Găsește litera”, „Numără și scrie”, „Unește punctele”', () => {
  it('the grid: 42 letters, the letter twelve times, in every variant; the answers count the same grid', () => {
    for (const seed of SEEDS) for (const l of ['A', 'Ă', 'I', 'S', 'Ț', 'M']) for (const lower of [false, true]) {
      const grid = findGrid(l, lower, false, seed);
      const t = lower ? l.toLowerCase() : l;
      expect(grid).toHaveLength(42);
      expect(grid.filter((x) => x === t), `${l} ${seed}`).toHaveLength(12);
      const key = gameKeySection(games([`find:${l}`], { variantSeed: seed, letterMode: lower ? 'lowercase' : 'uppercase' }), `find:${l}`)!;
      expect(key.entries[0]).toBe(`Litera ${t} apare de 12 ori.`);
    }
  });

  it('grădiniță: no diacritic twin of the letter in its grid (A: no Ă, Â; I: no Î; S / Ș; T / Ț); the other classes keep them', () => {
    expect([diacriticTwins('A'), diacriticTwins('Ă'), diacriticTwins('I'), diacriticTwins('Ș'), diacriticTwins('t'), diacriticTwins('M')]).toEqual([['Ă', 'Â'], ['A', 'Â'], ['Î'], ['S'], ['Ț'], []]);
    for (const l of ['A', 'Ă', 'Â', 'I', 'Î', 'S', 'Ș', 'T', 'Ț']) {
      const twins = diacriticTwins(l).flatMap((x) => [x, x.toLocaleLowerCase('ro')]);
      let kept = 0;
      for (const seed of SEEDS) for (const lower of [false, true]) {
        const grid = findGrid(l, lower, true, seed);
        expect(grid.filter((x) => twins.includes(x)), `${l} ${seed}`).toEqual([]);
        expect(grid.filter((x) => x === (lower ? l.toLocaleLowerCase('ro') : l))).toHaveLength(12);
        kept += findGrid(l, lower, false, seed).filter((x) => twins.includes(x)).length;
      }
      expect(kept, l).toBeGreaterThan(0);
      // on the page: the preschool sheet draws the grid without them
      const letters = (level: WorksheetConfig['curriculumLevel']) => JSON.stringify(buildWorksheetPages(games([`find:${l}`], { curriculumLevel: level }), 'full')[0].ops.filter((o) => o.t === 'group'));
      expect(letters('presc'), l).not.toBe(letters('CP'));
      expect(letters('I'), l).toBe(letters('CP'));
    }
    // a letter with no twin: the preschool grid is the grid of every class
    for (const l of ['M', 'O', 'B']) expect(findGrid(l, false, true)).toEqual(findGrid(l, false, false));
  });

  it('counting: five rows of different numbers within the range, a picture for each', () => {
    for (const seed of SEEDS) for (const max of [5, 10]) {
      const { numbers, pictures } = countSet(max, seed);
      expect(numbers).toHaveLength(5);
      expect(new Set(numbers).size).toBe(5);
      for (const n of numbers) expect(n >= 1 && n <= max).toBe(true);
      expect(new Set(pictures.slice(0, 5)).size).toBe(5);
      expect(gameKeySection(games([`count:${max}`], { variantSeed: seed }), `count:${max}`)!.entries[0]).toBe(`De sus în jos: ${numbers.join(', ')}.`);
    }
  });

  it('the dots: the same outline, joined from another dot or the other way round', () => {
    for (const shape of DOT_SHAPES) {
      const base = dotPoints(shape, 1);
      const ring = (pts: typeof base) => {
        const keys = pts.map((p) => `${p.x},${p.y}`);
        const at = keys.indexOf(`${base[0].x},${base[0].y}`);
        const turned = [...keys.slice(at), ...keys.slice(0, at)];
        return turned[1] === `${base[1].x},${base[1].y}` ? turned : [turned[0], ...turned.slice(1).reverse()];
      };
      for (const seed of SEEDS) {
        const pts = dotPoints(shape, seed);
        expect(ring(pts), `${shape} ${seed}`).toEqual(base.map((p) => `${p.x},${p.y}`));
        if (seed > 1) expect(pts, `${shape} ${seed}`).not.toEqual(base);
      }
    }
  });
});

describe('„Sunete și silabe”', () => {
  const free = new Set(['A', 'B', 'C', 'D', 'E']);
  it('the rules of every set hold in every variant', () => {
    for (const seed of SEEDS) {
      for (const l of SOUND_LETTERS) {
        const { words, targets } = soundSet(l, seed);
        expect(targets, l).toBeGreaterThanOrEqual(4);
        expect(words).toHaveLength(12);
        expect(words.filter((w) => w.initial === l)).toHaveLength(targets);
        expect(new Set(words.map((w) => w.word)).size).toBe(12);
        const key = gameKeySection(games([`sound:${l}`], { variantSeed: seed }), `sound:${l}`)!;
        expect(key.entries[0]).toBe(`Se încercuiesc (${targets}): ${words.filter((w) => w.initial === l).map((w) => w.word).join(', ')}.`);
      }
      expect(firstSet(1, seed).every((w) => free.has(w.initial))).toBe(true);
      expect(sylSet(1, seed).every((w) => free.has(w.initial))).toBe(true);
      expect(splitSet(1, seed).every((w) => free.has(w.initial))).toBe(true);
      for (let n = 1; n <= 6; n++) {
        const f = firstSet(n, seed);
        expect(new Set(f.map((w) => w.word)).size, `first ${n} ${seed}`).toBe(12);
        if (n > 1) expect(f.some((w) => free.has(w.initial))).toBe(false);
        const s = sylSet(n, seed);
        expect(new Set(s.map((w) => w.word)).size, `syl ${n} ${seed}`).toBe(8);
        for (const c of [1, 2, 3, 4]) expect(s.filter((w) => w.syllables.length === c)).toHaveLength(2);
        const d = splitSet(n, seed);
        expect(new Set(d.map((w) => w.word)).size, `split ${n} ${seed}`).toBe(5);
        expect(d.filter((w) => w.syllables.length === 2)).toHaveLength(3);
        expect(d.filter((w) => w.syllables.length === 3)).toHaveLength(2);
        for (const w of [...f, ...s, ...d]) expect(PHONO_WORDS).toContain(w);
      }
    }
  });
});

describe('sorting, the odd one out, grouping, orientation', () => {
  it('sort: the pictures of each group, as many of each, never three of a group in a row; the answers place each one', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 6; n++) {
      const def = SORT_SETS[n - 1];
      const pics = sortPictures(n, seed);
      const per = def.groups.length === 2 ? 4 : 3;
      def.groups.forEach((g, gi) => {
        const mine = pics.filter((p) => p.group === gi);
        expect(mine, `sort ${n} ${seed}`).toHaveLength(per);
        if (def.by === 'category') for (const p of mine) expect(obj(p.word).cat).toBe(g.cat);
        if (def.by === 'shape') for (const p of mine) expect(p.shape).toBe(g.shape);
      });
      if (def.by !== 'shape' && def.by !== 'size') expect(new Set(pics.map((p) => p.word)).size).toBe(pics.length);
      if (def.by === 'size') for (const w of new Set(pics.map((p) => p.word))) expect(pics.filter((p) => p.word === w).map((p) => p.scale).sort()).toEqual([0.45, 1]);
      expect(pics.some((p, i) => i >= 2 && pics[i - 1].group === p.group && pics[i - 2].group === p.group), `sort ${n} ${seed}`).toBe(false);
      const lay = sortLayout(n, FRAME + 2, seed);
      lay.pictures.forEach((a, i) => lay.pictures.slice(i + 1).forEach((b) => expect(Math.abs(a.cy - b.cy)).toBeGreaterThanOrEqual(a.size)));
      const key = gameKeySection(games([`sort:${n}`], { variantSeed: seed }), `sort:${n}`)!;
      def.groups.forEach((g, gi) => {
        const at = pics.map((p, i) => ({ p, i })).filter(({ p }) => p.group === gi).map(({ i }) => i + 1);
        for (const k of at) expect(key.entries[gi + 1], `sort ${n} ${seed}`).toMatch(new RegExp(`(: |, )${k}(\\.|,|$)`));
      });
    }
  });

  it('odd one out: exactly one picture of another group in every row, no colour trap, no second group, no picture twice', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 6; n++) {
      const rows = oddRows(n, seed);
      expect(rows).toHaveLength(6);
      const words = rows.flatMap((r) => r.objects.map((o) => o.word));
      expect(new Set(words).size, `odd ${n} ${seed}`).toBe(24);
      for (const r of rows) {
        expect(r.objects.filter((o) => o.cat !== r.cat)).toEqual([r.objects[r.intruder]]);
        const odd = r.objects[r.intruder];
        expect(CATEGORY_FAMILY[odd.cat] === CATEGORY_FAMILY[r.cat], `odd ${n} ${seed}`).toBe(n >= 4);
        expect(colourMisleads(r.objects, r.intruder)).toBe(false);
        expect(secondGroupLink(r.objects)).toBe(false);
        expect(odd.cat).not.toBe('diverse');
      }
      const key = gameKeySection(games([`odd:${n}`], { variantSeed: seed }), `odd:${n}`)!;
      rows.forEach((r, i) => expect(key.entries[i].startsWith(`${r.objects[r.intruder].word} (`)).toBe(true));
    }
  });

  it('group and count: different counts of each kind, at most ten, the pictures apart from each other', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 6; n++) {
      const set = groupSet(n, FRAME + 2, seed);
      expect(set.kinds).toHaveLength(n <= 3 ? 3 : 4);
      expect(new Set(set.kinds.map((k) => k.count)).size).toBe(set.kinds.length);
      expect(new Set(set.kinds.map((k) => k.object.word)).size).toBe(set.kinds.length);
      for (const k of set.kinds) {
        expect(k.count >= 2 && k.count <= 8, `group ${n} ${seed}`).toBe(true);
        expect(k.object.cat).toBe(set.cat);
        expect(set.placed.filter((p) => p.object === k.object)).toHaveLength(k.count);
      }
      expect(set.placed.length).toBeLessThanOrEqual(30);
      set.placed.forEach((a, i) => set.placed.slice(i + 1).forEach((b) => expect(Math.abs(a.cx - b.cx) >= a.size + 4.9 || Math.abs(a.cy - b.cy) >= a.size + 4.9, `group ${n} ${seed}`).toBe(true)));
      expect(gameKeySection(games([`group:${n}`], { variantSeed: seed }), `group:${n}`)!.entries[0]).toBe(set.kinds.map((k) => `${k.object.word}: ${k.count}`).join(', '));
    }
  });

  it('the scene: six different things, each question answered by the thing at that place, among three pictures', () => {
    for (const seed of SEEDS) for (const n of [1, 2]) {
      const scene = sceneLayout(n, FRAME + 2, seed);
      expect(new Set(scene.objects.map((o) => o.object.word)).size).toBe(6);
      expect(scene.questions).toHaveLength(5);
      for (const q of scene.questions) {
        expect(q.answer).toBe(scene.objects.find((o) => o.slot === q.relation)!.object);
        expect(new Set(q.options).size).toBe(3);
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
        for (const o of q.options) expect(scene.objects.some((x) => x.object === o)).toBe(true);
      }
      expect(new Set(scene.questions.map((q) => q.relation)).size).toBe(5);
      const at = (s: string) => scene.objects.find((o) => o.slot === s)!;
      expect(at('above').cy + at('above').size / 2).toBeLessThan(at('on').cy - at('on').size / 2);
      expect(at('on').cy + at('on').size / 2).toBeLessThanOrEqual(scene.table.top + 0.01);
      expect(at('under').cy).toBeGreaterThan(scene.table.top);
      expect(at('left').cx + at('left').size / 2).toBeLessThan(scene.table.x0);
      expect(at('right').cx - at('right').size / 2).toBeGreaterThan(scene.box.x1);
      expect(gameKeySection(games([`pos:${n}`], { variantSeed: seed }), `pos:${n}`)!.entries).toEqual(scene.questions.map((q) => q.answer.word));
    }
  });

  it('the grid: nine different pictures, five questions with five different answers, each read from the grid', () => {
    for (const seed of SEEDS) for (const n of [3, 4]) {
      const g = gridLayout(n, FRAME + 8, seed);
      expect(new Set(g.cells.flat().map((o) => o.word)).size).toBe(9);
      expect(new Set(g.questions.map((q) => q.answer)).size, `pos ${n} ${seed}`).toBe(5);
      for (const q of g.questions) {
        const [kind, a, b] = q.relation.split(' ');
        const r = Number(a);
        const c = Number(b);
        const want = kind === 'cell' ? g.cells[r][c] : kind === 'above' ? g.cells[r - 1][c] : kind === 'under' ? g.cells[r + 1][c] : kind === 'left' ? g.cells[r][c - 1] : kind === 'right' ? g.cells[r][c + 1]
          : a === 'row' ? g.cells[c][1] : g.cells[1][c];
        expect(q.answer, `pos ${n} ${seed} ${q.relation}`).toBe(want);
        expect(new Set(q.options).size).toBe(3);
        expect(q.options).toContain(q.answer);
      }
      expect(gameKeySection(games([`pos:${n}`], { variantSeed: seed }), `pos:${n}`)!.entries).toEqual(g.questions.map((q) => q.answer.word));
    }
  });

  it('draw where you are told: six different places, a sentence for each, a sky picture only above a house or a tree', () => {
    for (const seed of SEEDS) for (const n of [5, 6]) {
      const panels = drawPanels(n, FRAME + 2, seed);
      expect(panels).toHaveLength(6);
      expect(new Set(panels.map((p) => p.relation)).size).toBe(6);
      expect(panels.some((p) => p.relation === (n === 5 ? 'langa' : 'pe'))).toBe(false);
      for (const p of panels) {
        expect(p.text).toMatch(/^Desenează (un|o) .+\.$/);
        if (['soare', 'nor', 'stea'].includes(p.thing.word)) expect(p.relation === 'deasupra' && ['casă', 'copac'].includes(p.ref.word)).toBe(true);
        expect(p.refBox.x >= p.area.x - 0.01 && p.refBox.x + p.refBox.w <= p.area.x + p.area.w + 0.01 && p.refBox.y + p.refBox.h <= p.area.y + p.area.h + 0.01).toBe(true);
        expect(SORT_OBJECTS).toContain(p.thing);
      }
      expect(gameKeySection(games([`pos:${n}`], { variantSeed: seed }), `pos:${n}`)).toBeNull();
    }
  });
});

describe('the fun sheets', () => {
  it('colour by number: the same drawing and the same colour for every part, the numbers of the legend in another order', () => {
    for (let n = 1; n <= 6; n++) {
      const base = COLOUR_PICTURES[n - 1];
      expect(colourPicture(n, 1)).toBe(base);
      for (const seed of SEEDS.slice(1)) {
        const pic = colourPicture(n, seed);
        expect([...pic.palette].sort()).toEqual([...base.palette].sort());
        expect(pic.palette, `color ${n} ${seed}`).not.toEqual(base.palette);
        pic.regions.forEach((r, k) => {
          expect(r.pts).toBe(base.regions[k].pts);
          expect(pic.palette[r.code - 1], `${base.title} ${r.name}`).toBe(base.palette[base.regions[k].code - 1]);
        });
        expect(colourRaster(pic)).toBe(colourRaster(base));
        for (const sums of [false, true]) {
          const lay = colourLayout(n, sums, FRAME + 2, seed);
          lay.labels.forEach((l, k) => {
            expect(l.fit).toBeGreaterThanOrEqual(1);
            expect(sums ? sumValue(l.text) : Number(l.text), `${n} ${seed}`).toBe(pic.regions[k].code);
          });
        }
        colourSums(n, seed).forEach((s, k) => {
          expect(sumValue(s)).toBe(pic.regions[k].code);
          const [, a, b] = s.match(/^(\d)[+−](\d)$/)!;
          expect(Number(b) >= 1 && Number(b) <= 5 && Number(a) >= 1).toBe(true);
        });
        const key = funKeySection(`color:${n}`, seed)!.entries;
        pic.palette.forEach((_, i) => {
          const names = [...new Set(pic.regions.filter((r) => r.code === i + 1).map((r) => r.name))];
          expect(key[i].endsWith(`: ${names.join(', ')}`), key[i]).toBe(true);
        });
      }
    }
  });

  it('the maze: another maze for every seed, always a tree with one path, long enough', () => {
    for (let n = 1; n <= 6; n++) {
      const paths = new Set<string>();
      for (const seed of SEEDS) {
        const m = mazeOf(n, seed);
        const N = MAZE_SETS[n - 1].size;
        expect(m.size).toBe(N);
        let edges = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) edges += (m.open[r][c] & 1 ? 1 : 0) + (m.open[r][c] & 2 ? 1 : 0);
        expect(edges, `maze ${n} ${seed}`).toBe(N * N - 1);
        const seen = new Set([0]);
        const queue = [{ r: 0, c: 0 }];
        while (queue.length) {
          const cur = queue.shift()!;
          for (const nb of mazeNeighbours(m, cur.r, cur.c)) if (!seen.has(nb.r * N + nb.c)) {
            seen.add(nb.r * N + nb.c);
            queue.push(nb);
          }
        }
        expect(seen.size).toBe(N * N);
        expect(m.path[0]).toEqual({ r: 0, c: 0 });
        expect(m.path[m.path.length - 1]).toEqual({ r: N - 1, c: N - 1 });
        m.path.slice(1).forEach((p, i) => expect(mazeNeighbours(m, m.path[i].r, m.path[i].c)).toContainEqual(p));
        expect(m.path.length).toBeGreaterThanOrEqual(1.6 * (2 * N - 1));
        paths.add(JSON.stringify(m.open));
        // the answers page draws the path of this maze
        if (seed % 9 === 0) {
          const answers = gameAnswerPages(games([`maze:${n}`], { mathAnswers: true, variantSeed: seed }), 'full');
          const path = flattenOps(answers[0]).find((o) => o.t === 'path' && o.stroke === '#E8913A');
          expect(path?.t === 'path' ? path.subpaths[0].segs.length : 0).toBe(m.path.length + 1);
        }
      }
      expect(paths.size).toBe(40);
    }
  });

  it('the differences: as many as the set has, each kind at least once, plain to see, in the frame, nothing on top of another', () => {
    const box = (o: { x: number; y: number; s: number }) => ({ x0: o.x - o.s / 2, x1: o.x + o.s / 2, y0: o.y - o.s / 2, y1: o.y + o.s / 2 });
    const overlap = (p: ReturnType<typeof box>, q: ReturnType<typeof box>) => Math.max(0, Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0)) * Math.max(0, Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0));
    for (let n = 1; n <= 6; n++) {
      const base = SCENES[n - 1];
      expect(sceneOf(n, 1)).toBe(base);
      for (const seed of SEEDS.slice(1)) {
        const scene = sceneOf(n, seed);
        const where = `diff ${n} seed ${seed}`;
        expect(scene.objects).toBe(base.objects);
        expect(scene.diffs, where).toHaveLength(base.diffs.length);
        expect(scene.diffs, where).not.toBe(base.diffs);
        expect(new Set(scene.diffs.map((d) => d.i)).size).toBe(scene.diffs.length);
        expect(new Set(scene.diffs.map((d) => d.t)), where).toEqual(new Set(['missing', 'changed', 'moved']));
        const a = sceneObjects(scene, 'a');
        const b = sceneObjects(scene, 'b');
        const changed = a.filter((o) => {
          const other = b.find((x) => x.k === o.k);
          return !other || other.e !== o.e || other.x !== o.x || other.y !== o.y;
        });
        expect(changed.map((o) => o.k).sort(), where).toEqual(scene.diffs.map((d) => d.i).sort());
        for (const objs of [a, b]) {
          for (const o of objs) {
            const bb = box(o);
            expect(bb.x0 >= 0.5 && bb.x1 <= SCENE_W - 0.5 && bb.y0 >= 0.5 && bb.y1 <= SCENE_H - 0.5, `${where} ${o.name}`).toBe(true);
          }
          for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
            expect(overlap(box(objs[i]), box(objs[j])) / Math.min(objs[i].s, objs[j].s) ** 2, `${where}: ${objs[i].name} / ${objs[j].name}`).toBeLessThanOrEqual(0.06);
          }
          expect(new Set(objs.map((o) => o.e)).size, where).toBe(objs.length);
        }
        for (const d of scene.diffs) {
          const o = scene.objects[d.i];
          expect(o.s).toBeGreaterThanOrEqual(8);
          expect(d.desc).toMatch(/^[A-ZȘȚĂÂÎ].*\.$/);
          if (d.t === 'missing') expect(d.desc).toBe(`Lipsește ${o.name}.`);
          if (d.t === 'changed') {
            expect(scene.objects.some((x) => x.e === d.e)).toBe(false);
            expect(SCENE_SWAPS[n - 1][d.i]).toContainEqual([d.e, d.desc]);
          }
          if (d.t === 'moved') {
            const dist = Math.hypot(d.x - o.x, d.y - o.y);
            expect(dist / o.s, where).toBeGreaterThanOrEqual(1);
            expect(dist / o.s, where).toBeLessThanOrEqual(2);
            expect(d.x === o.x || d.y === o.y).toBe(true);
            expect(d.desc.endsWith(d.x < o.x ? 'spre stânga.' : d.x > o.x ? 'spre dreapta.' : d.y < o.y ? 'mai sus.' : 'mai jos.'), `${where} ${d.desc}`).toBe(true);
          }
        }
        expect(diffSpots(scene)).toHaveLength(scene.diffs.length);
        expect(funKeySection(`diff:${n}`, seed)!.entries).toEqual(scene.diffs.map((d) => d.desc));
        if (seed % 9 === 0) {
          const pages = pagesOf([`diff:${n}`], seed);
          expect(texts(pages[0])).toContain(`Găsește ${scene.diffs.length} diferențe între cele două imagini.`);
          expect(flattenOps(pages[1].ops).filter((o) => o.t === 'circle' && o.stroke === '#DC2626')).toHaveLength(scene.diffs.length);
        }
      }
    }
    // the swaps: pictures the icon set has, never one the scene already shows
    SCENE_SWAPS.forEach((swaps, si) => {
      for (const [i, options] of Object.entries(swaps)) for (const [e, desc] of options) {
        expect(hasIcon(e), e).toBe(true);
        expect(SCENES[si].objects.some((o) => o.e === e), `${SCENES[si].title} ${e}`).toBe(false);
        expect(SCENES[si].objects[Number(i)]).toBeTruthy();
        expect(desc).toMatch(/ în loc de .+\.$/);
      }
    });
  });

  it('the lines: five pairs of the pool, no picture twice, the lines of the set (each at least once)', () => {
    const pool = (n: number) => (n === 6 ? TRACE_WINTER_PAIRS : TRACE_PAIRS);
    for (const p of [...TRACE_PAIRS, ...TRACE_WINTER_PAIRS]) for (const e of p) expect(hasIcon(e), e).toBe(true);
    for (let n = 1; n <= 6; n++) for (const seed of SEEDS) {
      const set = traceSet(n, seed);
      expect(set.pairs).toHaveLength(5);
      expect(set.patterns).toHaveLength(5);
      if (seed > 1) expect(new Set(set.pairs.flat()).size, `trace ${n} ${seed}`).toBe(10);
      if (seed > 1) for (const p of set.pairs) expect(pool(n)).toContainEqual(p);
      expect(new Set(set.patterns)).toEqual(new Set(TRACE_SETS[n - 1].patterns));
      const rows = traceRows(n, FRAME + 1, seed);
      rows.forEach((r, i) => expect([r.from, r.to, r.pattern]).toEqual([...set.pairs[i], set.patterns[i]]));
      expect(funKeySection(`trace:${n}`, seed)).toBeNull();
    }
  });

  it('the shadows: six different pictures of the set’s kind, no two shadows alike, never on the row of its picture', () => {
    SHADOW_POOLS.forEach((pool, i) => {
      for (const [e, name] of pool.more) {
        expect(silhouetteOps(e, 0, 0, 10), e).not.toBeNull();
        expect(name).toMatch(/^[a-zăâîșț ]+$/);
        expect(SHADOW_SETS[i].pictures.some((p) => p[0] === e), e).toBe(false);
      }
      const all = [...SHADOW_SETS[i].pictures, ...pool.more].map((p) => p[0]);
      for (const group of pool.alike) for (const e of group) expect(all, e).toContain(e);
    });
    for (let n = 1; n <= 6; n++) {
      const used = new Set<string>();
      for (const seed of SEEDS) {
        const set = shadowSet(n, seed);
        const all = [...SHADOW_SETS[n - 1].pictures, ...SHADOW_POOLS[n - 1].more];
        expect(set.pictures).toHaveLength(6);
        expect(new Set(set.pictures.map((p) => p[0])).size).toBe(6);
        for (const p of set.pictures) {
          expect(all).toContainEqual(p);
          used.add(p[0]);
        }
        if (seed > 1) for (const group of SHADOW_POOLS[n - 1].alike) expect(set.pictures.filter((p) => group.includes(p[0])).length, `shadow ${n} ${seed}`).toBeLessThanOrEqual(1);
        const lay = shadowLayout(n, FRAME + 2, seed);
        expect([...lay.order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
        lay.order.forEach((k, i) => expect(k).not.toBe(i));
        const key = funKeySection(`shadow:${n}`, seed)!;
        set.pictures.forEach(([, name], j) => expect(key.entries[j + 1]).toBe(`${j + 1}. ${name} – umbra ${lay.order.indexOf(j) + 1}`));
        if (seed % 9 === 0) {
          const p = pagesOf([`shadow:${n}`], seed)[0];
          const shadows = p.ops.filter((o): o is Extract<DrawOp, { t: 'group' }> => o.t === 'group' && o.ops.every((x) => x.t === 'path' && x.fill === '#3A4150'));
          expect(shadows).toHaveLength(6);
          shadows.forEach((g, i) => {
            const want = silhouetteOps(set.pictures[lay.order[i]][0], 0, 0, 10)![0] as Extract<DrawOp, { t: 'group' }>;
            expect(g.ops.map((o) => (o.t === 'path' ? o.subpaths : null))).toEqual(want.ops.map((o) => (o.t === 'path' ? o.subpaths : null)));
          });
        }
      }
      // the pool is used, not six of it over and over
      expect(used.size, `shadow ${n}`).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('„Matematică și explorarea mediului”', () => {
  it('the terms: one sign fits, every sentence is right, each class in its numbers', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 6; n++) {
      const set = termsSet(n, seed);
      const ops = set.level === 'II' ? ['+', MINUS, TIMES, ':'] : ['+', MINUS];
      for (const s of set.signs) {
        const t = s.tokens;
        if (t.length === 3) expect(cmpSign(Number(t[0]), Number(t[2]))).toBe(s.answer);
        else if (t[1] === '?') expect(opsThatFit(Number(t[0]), Number(t[2]), Number(t[4]), ops), `${t.join(' ')} seed ${seed}`).toEqual([s.answer]);
        else expect(cmpSign(t[1] === '+' ? Number(t[0]) + Number(t[2]) : Number(t[0]) - Number(t[2]), Number(t[4]))).toBe(s.answer);
      }
      for (const s of set.sentences) {
        const nums = (s.text.match(/\d+/g) ?? []).map(Number);
        const a = Number(s.answer);
        expect([nums[0] + nums[1], nums[0] - nums[1], nums[0] * nums[1], nums[1] - nums[0], nums[1] ? nums[0] / nums[1] : NaN].includes(a), s.text).toBe(true);
        if (/^Diferența|Descăzutul/.test(s.text)) expect(a).toBe(nums[0] - nums[1]);
        if (/^Produsul|factor/.test(s.text)) expect(a).toBe(nums[0] * nums[1]);
        if (/^Câtul/.test(s.text)) expect(a).toBe(nums[0] / nums[1]);
        expect(a >= 0 && a <= { CP: 10, I: 100, II: 1000 }[set.level], `${s.text} seed ${seed}`).toBe(true);
        for (const v of nums) expect(v <= { CP: 10, I: 100, II: 1000 }[set.level], s.text).toBe(true);
      }
      for (const l of set.labels) expect(opsThatFit(Number(l.tokens[0]), Number(l.tokens[2]), Number(l.tokens[4]), [l.tokens[1]])).toEqual([l.tokens[1]]);
      for (const p of set.pictures) expect(p.b >= 1 && p.b <= 5 && (p.op === '+' ? p.a + p.b <= 10 : p.a - p.b >= 0)).toBe(true);
      const key = memKeySection(`terms:${n}`, seed)!.entries;
      for (const s of set.sentences) expect(key).toContain(s.text.replace('{}', s.answer));
    }
  });

  it('the numbers to form: blocks of at most 4 hundreds, 5 tens, 6 units; a zero and a teen among the words; none twice', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 3; n++) {
      const set = placeSet(n, seed);
      if (seed === 1) expect(set).toBe(PLACE_SETS[n - 1]);
      expect([set.blocks.length, set.toDigits.length, set.toWords.length]).toEqual([3, 3, 2]);
      const all = [...set.blocks, ...set.toDigits, ...set.toWords];
      expect(new Set(all).size, `place ${n} ${seed}`).toBe(all.length);
      for (const v of set.blocks) expect(v >= 100 && Math.floor(v / 100) <= 4 && Math.floor((v % 100) / 10) <= 5 && v % 10 <= 6, String(v)).toBe(true);
      for (const v of all) expect(v >= 100 && v <= 1000).toBe(true);
      if (seed > 1) {
        expect(set.blocks[0] % 10 > 0 && Math.floor((set.blocks[0] % 100) / 10) > 0).toBe(true);
        expect(set.blocks.filter((v) => v % 10 === 0 || Math.floor((v % 100) / 10) === 0)).toHaveLength(1);
        expect(set.toDigits.some((v) => v % 100 >= 11 && v % 100 <= 19)).toBe(true);
        expect(set.toDigits.some((v) => v % 10 === 0 || Math.floor((v % 100) / 10) === 0)).toBe(true);
        expect(set.toWords.some((v) => Math.floor((v % 100) / 10) === 0)).toBe(true);
      }
      const page = pagesOf([`place:${n}`], seed);
      for (const v of set.toDigits) expect(texts(page[0]), String(v)).toContain(numberWords(v));
      const key = memKeySection(`place:${n}`, seed)!.entries;
      for (const v of set.toWords) expect(key).toContain(`${v} = ${numberWords(v)}`);
      for (const v of set.blocks) expect(key).toContain(`${Math.floor(v / 100)} sute, ${Math.floor((v % 100) / 10)} zeci, ${v % 10} unități = ${v}`);
    }
  });

  it('the coordinates: seven pictures in seven cells, the drawings in empty cells, the answers name the cells', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 3; n++) {
      const set = coordSet(n, seed);
      expect(new Set(set.placed.map((x) => cellName(x.col, x.row))).size).toBe(7);
      expect(new Set(set.placed.map((x) => x.picture)).size).toBe(7);
      for (const x of [...set.placed, ...set.draw]) expect(x.col >= 0 && x.col <= 4 && x.row >= 1 && x.row <= 5).toBe(true);
      for (const d of set.draw) expect(set.placed.some((x) => x.col === d.col && x.row === d.row)).toBe(false);
      expect(new Set(set.draw.map((d) => cellName(d.col, d.row))).size).toBe(2);
      const key = memKeySection(`coord:${n}`, seed)!.entries;
      for (const k of set.whatIn) expect(key).toContain(`${cellName(set.placed[k].col, set.placed[k].row)}: ${set.placed[k].name}`);
      for (const k of set.whereIs) expect(key).toContain(`${set.placed[k].name}: ${cellName(set.placed[k].col, set.placed[k].row)}`);
    }
  });

  it('sides and axes: every shape to count on, the example never the circle; six lines, the answer of each as the pool gives it', () => {
    // the pool against the geometry: a shape drawn about (0, 0) mirrored in the line is the same shape, or not
    for (const seed of SEEDS) {
      const set = sidesSet(seed);
      expect(set.rows).toHaveLength(5);
      expect(new Set(set.rows.map((r) => r.shape))).toEqual(new Set(['triangle', 'rectangle', 'square', 'circle']));
      expect(new Set(set.rows.map((r) => `${r.shape}${r.look}`)).size).toBe(5);
      expect(set.tiles).toHaveLength(6);
      if (seed > 1) {
        expect(set.rows[0].shape).not.toBe('circle');
        expect(new Set(set.tiles.map((t) => `${t.shape} ${t.line}`)).size).toBe(6);
        for (const t of set.tiles) expect(SYMMETRY_POOL).toContain(t);
        const yes = set.tiles.filter((t) => t.answer).length;
        expect(yes >= 2 && yes <= 4, `sides ${seed}`).toBe(true);
        for (const t of set.tiles) expect(set.tiles.filter((x) => x.shape === t.shape).length).toBeLessThanOrEqual(2);
      }
      const key = memKeySection('sides:1', seed)!.entries;
      set.tiles.forEach((t, i) => expect(key[5 + i]).toBe(`figura ${i + 1}: ${t.answer ? 'DA' : 'NU'}`));
    }
  });

  it('the symmetry pool agrees with the shapes as they are drawn', async () => {
    const { planeOps } = await import('@/lib/worksheet/mem-pages');
    const pointsOf = (shape: Parameters<typeof planeOps>[0]) => {
      const op = planeOps(shape, 0, 0, 40)[0];
      if (op.t === 'circle') return Array.from({ length: 72 }, (_, i) => ({ x: op.r * Math.cos((i / 72) * 2 * Math.PI), y: op.r * Math.sin((i / 72) * 2 * Math.PI) }));
      if (op.t === 'rect') return [{ x: op.x, y: op.y }, { x: op.x + op.w, y: op.y }, { x: op.x + op.w, y: op.y + op.h }, { x: op.x, y: op.y + op.h }];
      return op.t === 'polygon' ? op.points : [];
    };
    const inside = (p: { x: number; y: number }, pts: { x: number; y: number }[]) => {
      let hit = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if (pts[i].y > p.y !== pts[j].y > p.y && p.x < ((pts[j].x - pts[i].x) * (p.y - pts[i].y)) / (pts[j].y - pts[i].y) + pts[i].x) hit = !hit;
      return hit;
    };
    for (const t of SYMMETRY_POOL) {
      const pts = pointsOf(t.shape);
      // the rectangle's own diagonal (as axisLine draws it), the 45° line for the others
      const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
      const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
      const a = t.shape === 'rectangle' ? Math.atan2(h, w) : Math.PI / 4;
      const mirror = (p: { x: number; y: number }) =>
        t.line === 'vertical' ? { x: -p.x, y: p.y } : t.line === 'horizontal' ? { x: p.x, y: -p.y } : { x: p.x * Math.cos(2 * a) + p.y * Math.sin(2 * a), y: p.x * Math.sin(2 * a) - p.y * Math.cos(2 * a) };
      let off = 0;
      let total = 0;
      for (let x = -20; x <= 20; x += 0.5) for (let y = -20; y <= 20; y += 0.5) {
        const p = { x: x + 0.13, y: y + 0.07 };
        if (!inside(p, pts)) continue;
        total++;
        if (!inside(mirror(p), pts)) off++;
      }
      // symmetric: (nearly) every point has its mirror image in the shape; not symmetric: plainly not
      if (t.answer) expect(off / total, `${t.shape} ${t.line}`).toBeLessThan(0.03);
      else expect(off / total, `${t.shape} ${t.line}`).toBeGreaterThan(0.12);
    }
  });

  it('the solids: the five in another order, no object under the solid of its shape', () => {
    for (const seed of SEEDS) {
      const lay = solidLayout(FRAME, seed);
      expect([...lay.order].sort()).toEqual([...SOLIDS].sort());
      expect([...lay.objects].sort()).toEqual([...SOLIDS].sort());
      lay.objects.forEach((s, i) => expect(s).not.toBe(lay.order[i]));
      expect(memKeySection('solid:1', seed)!.entries).toContain(`zarul – ${'ABCDE'[lay.order.indexOf('cub')]} (cub)`);
    }
  });

  it('the patterns: the next picture once among three, the numbers by their rule within the class, the figures and the problem right', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 4; n++) {
      const set = regularSet(n, seed);
      const where = `regular ${n} seed ${seed}`;
      expect(set.level).toBe(n <= 2 ? 'I' : 'II');
      expect(set.pictures).toHaveLength(set.level === 'I' ? 3 : 0);
      expect(set.numbers).toHaveLength(set.level === 'I' ? 4 : 5);
      for (const p of set.pictures) {
        expect(p.options.filter((o) => o === nextPicture(p)), where).toHaveLength(1);
        expect(new Set(p.options).size).toBe(3);
        expect(p.shown).toBeGreaterThanOrEqual(2 * p.unit.length);
        expect(new Set(p.unit).size).toBeGreaterThanOrEqual(2);
        for (const e of [...p.unit, ...p.options]) expect(hasIcon(e), e).toBe(true);
        // the unit is the shortest one: the row cannot be read with a shorter rule
        for (let len = 1; len < p.unit.length; len++) expect(Array.from({ length: p.shown }, (_, i) => p.unit[i % p.unit.length]).every((e, i, all) => i < len || e === all[i - len]), where).toBe(false);
      }
      if (seed > 1 && set.level === 'I') expect(new Set(set.pictures.map((p) => p.unit.length + p.unit.join(''))).size).toBe(3);
      expect(new Set(set.numbers.map((p) => `${p.times ? 'x' : ''}${p.step}`)).size, where).toBe(set.numbers.length);
      for (const p of set.numbers) {
        const row = numberRow(p, 7);
        for (let i = 1; i < 7; i++) expect(p.times ? row[i] / row[i - 1] : row[i] - row[i - 1]).toBe(p.step);
        for (const v of row) expect(v >= 0 && v <= (set.level === 'I' ? 100 : 1000), `${where}: ${v}`).toBe(true);
      }
      if (set.level === 'II') expect(set.numbers[0].times, where).toBeFalsy();
      const pr = set.problem;
      const key = memKeySection(`regular:${n}`, seed)!.entries;
      if ('unit' in pr) {
        expect(pr.options.filter((o) => o === pr.unit[(pr.ask - 1) % pr.unit.length])).toHaveLength(1);
        expect(new Set(pr.options).size).toBe(2);
        expect(pr.ask).toBeGreaterThan(6);
        expect(pr.text).toMatch(/ (a|al) \S+( mărgea| cartonaș)?\?$/);
        expect(key.at(-1)).toBe(`problema: ${pr.unit[(pr.ask - 1) % pr.unit.length]}`);
      } else {
        const nums = (pr.text.match(/\d+/g) ?? []).map(Number);
        if (/înot/.test(pr.text)) {
          const [d, s, s2, s3] = nums;
          expect([s2 - s, s3 - s2]).toEqual([d, d]);
          const k = ['a cincea', 'a șasea', 'a șaptea'].findIndex((o) => pr.text.includes(`${o} oară`)) + 5;
          expect(k).toBeGreaterThanOrEqual(5);
          expect(Number(pr.answer), where).toBe(s + (k - 1) * d);
          expect(Number(pr.answer)).toBeLessThanOrEqual(28);
        } else {
          const first = nums[0];
          expect(first % 3).toBe(0);
          expect(Number(pr.answer), where).toBe(pr.text.includes('verzi sunt') ? (2 * first) / 3 : first / 3);
        }
        expect(key.at(-1)).toBe(`problema: ${pr.answer}`);
      }
      if (set.growing) {
        expect(set.growing.ask[0]).toBe(4);
        expect(set.growing.ask[1]).toBeGreaterThan(4);
        for (const f of set.growing.ask) expect(key).toContain(`figura ${f}: ${growingCount(set.growing, f)}`);
      }
      expect(texts(pagesOf([`regular:${n}`], seed)[0]).join(' ')).not.toMatch(/undefined|NaN/);
    }
  });

  it('two criteria: nine things, every cell of the table with at least one, the answers put each number in its cell', () => {
    for (const seed of SEEDS) for (let n = 1; n <= 2; n++) {
      const set = sort2Set(n, seed);
      expect(set.items).toHaveLength(9);
      for (let r = 0; r < set.rows.length; r++) for (let c = 0; c < set.cols.length; c++) expect(set.items.some((i) => i.row === r && i.col === c), `sort2 ${n} ${seed}`).toBe(true);
      if (n === 2) {
        expect(new Set(set.items.map((i) => i.picture)).size).toBe(9);
        for (const i of set.items) expect(hasIcon(i.picture!)).toBe(true);
      }
      const lay = sort2Layout(n, FRAME, seed);
      expect([...lay.order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      const key = memKeySection(`sort2:${n}`, seed)!.entries;
      lay.order.forEach((k, i) => expect(key[set.items[k].row * set.cols.length + set.items[k].col]).toContain(`${i + 1} (${set.items[k].name})`));
    }
  });

  it('shapes around us, the pictogram, the comparisons: one answer each, in every variant', () => {
    for (const seed of SEEDS) {
      const rows = aroundRows(seed);
      expect(rows).toHaveLength(8);
      expect(new Set(rows.map((r) => r[0])).size).toBe(8);
      AROUND_SHAPES.forEach((_, k) => {
        const c = rows.filter((r) => r[2] === k).length;
        expect(c >= 1 && c <= 3, `around ${seed}`).toBe(true);
      });
      for (const r of rows) expect(hasIcon(r[0])).toBe(true);
      expect(memKeySection('around:1', seed)!.entries).toEqual(rows.map(([, name, k]) => `${name} – ${['cerc', 'pătrat', 'triunghi', 'dreptunghi'][k]}`));

      for (const n of [1, 2]) {
        const counts = pictCounts(n, seed);
        expect(new Set(counts).size).toBe(3);
        for (const c of counts) expect(c >= 2 && c <= 6).toBe(true);
        const lay = pictLayout(n, FRAME, seed);
        counts.forEach((c, k) => expect(lay.pictures.filter((p) => p.kind === k)).toHaveLength(c));
        lay.pictures.forEach((a, i) => lay.pictures.slice(i + 1).forEach((b) => expect(Math.abs(a.cx - b.cx) >= a.s || Math.abs(a.cy - b.cy) >= a.s, `pict ${n} ${seed}`).toBe(true)));
        for (const p of lay.pictures) expect(p.cx - p.s / 2 >= lay.scene.x && p.cx + p.s / 2 <= lay.scene.x + lay.scene.w && p.cy - p.s / 2 >= lay.scene.y && p.cy + p.s / 2 <= lay.scene.y + lay.scene.h).toBe(true);
      }

      const more = moreRows(seed);
      expect(more).toHaveLength(8);
      expect(new Set(more.map((r) => r[0])).size).toBe(8);
      expect(new Set(more.flatMap((r) => [r[1][0], r[2][0]])).size, `more ${seed}`).toBe(seed === 1 ? new Set(more.flatMap((r) => [r[1][0], r[2][0]])).size : 16);
      for (const r of more) for (const e of [r[1][0], r[2][0]]) expect(hasIcon(e), e).toBe(true);
      if (seed > 1) {
        const left = more.filter((r) => r[3] === 0).length;
        expect(left >= 3 && left <= 5).toBe(true);
      }
      expect(memKeySection('more:1', seed)!.entries).toEqual(more.map((r) => (r[3] === 0 ? r[1] : r[2])[1]));
    }
    // a row of the pool, in either order, keeps its answer: the thing, not the side
    const answers = new Map<string, Set<string>>();
    for (const seed of SEEDS) for (const r of moreRows(seed)) answers.set(r[0], new Set([...(answers.get(r[0]) ?? []), (r[3] === 0 ? r[1] : r[2])[1]]));
    for (const [q, a] of answers) expect(a.size, q).toBe(1);
    expect(answers.size).toBe(16);
  });
});

describe('the calendar and the measuring sheets of clasa a II-a', () => {
  it('the month: one of the school year 2026–2027, septembrie 2026 … iunie 2027, never a month before it', () => {
    expect(SCHOOL_YEAR_MONTHS.map((m) => `${MONTHS[m.month]} ${m.year}`)).toEqual([
      'septembrie 2026', 'octombrie 2026', 'noiembrie 2026', 'decembrie 2026', 'ianuarie 2027', 'februarie 2027', 'martie 2027', 'aprilie 2027', 'mai 2027', 'iunie 2027',
    ]);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const g = calmonthSheet(rng(seedOf(`calmonth:${seed}`))).sections[0].month!;
      expect(g.year * 12 + g.month >= 2026 * 12 + 8 && g.year * 12 + g.month <= 2027 * 12 + 5, `${g.year}-${g.month + 1}`).toBe(true);
      seen.add(`${g.year}-${g.month}`);
    }
    expect(seen.size).toBe(10);
    // the default sheet, as it is printed
    const page = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['calmonth'], curriculumLevel: 'II' }, 'full')[0];
    const title = texts(page).find((t) => /Privește calendarul lunii/.test(t))!;
    const [, name, year] = title.match(/lunii (\S+) (\d+)\.$/)!;
    expect(SCHOOL_YEAR_MONTHS).toContainEqual({ year: Number(year), month: MONTHS.indexOf(name as (typeof MONTHS)[number]) });
  });

  const math = (items: string[], level: WorksheetConfig['curriculumLevel'], seed: number) => buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'math', selectedItems: items, mathSeed: seed, mathAnswers: true, ...(level ? { curriculumLevel: level } : {}) }, 'full');

  it('lengths, clasa a II-a: 8–17 smaller units, two objects compared; the other classes as before', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = lengthSheetII(rng(seedOf(`length:${seed}`)));
      expect(s.mm).toBe(UNIT_MM_II);
      expect(new Set(s.items.map((i) => i.units)).size).toBe(5);
      for (const it of s.items) expect(it.units >= 8 && it.units <= 17).toBe(true);
      expect(s.compare).toHaveLength(2);
      const [p, q] = s.compare!;
      expect(`${p}`).not.toBe(`${q}`);
      for (const [a, b] of s.compare!) expect(s.items[a].units - s.items[b].units).toBeGreaterThanOrEqual(2);
      const pages = math(['length'], 'II', seed);
      const t = texts(pages[0]);
      for (const [a, b] of s.compare!) expect(t).toContain(`Obiectul ${'abcde'[a]}) este mai lung decât obiectul ${'abcde'[b]}) cu`);
      const key = pages.slice(1).flatMap(texts).join('\n');
      for (const [a, b] of s.compare!) expect(key).toMatch(new RegExp(`${'abcde'[a]}\\) este mai lung decât ${'abcde'[b]}\\) cu ${s.items[a].units - s.items[b].units} `));
      // as many units drawn as the object is long, the longest ends before the answer box
      const units = flattenOps(pages[0].ops).filter((o) => o.t === 'rect' && (o.fill === '#FDE68A' || (o.stroke === '#475569' && o.strokeWidth === 0.55)));
      expect(units).toHaveLength(s.items.reduce((n, it) => n + it.units, 0));
      for (const u of units) if (u.t === 'rect') expect(u.x + u.w).toBeLessThan(162);
      pages.forEach((pg) => {
        expect(opsOutside(pg, { minX: 11.7, minY: 11.7, maxX: 198.3, maxY: 290 }), `length II ${seed}`).toEqual([]);
        expect(textOverlaps(pg), `length II ${seed}`).toEqual([]);
      });
      for (const level of [undefined, 'presc', 'CP', 'I'] as const) {
        const old = lengthSheet(rng(seedOf(`length:${seed}`)));
        const tt = texts(math(['length'], level, seed)[0]);
        expect(tt.some((x) => x.startsWith('Obiectul'))).toBe(false);
        expect(Math.max(...old.items.map((i) => i.units))).toBeLessThanOrEqual(10);
      }
    }
    expect(JSON.stringify(math(['length', 'mass'], 'I', 3))).toBe(JSON.stringify(math(['length', 'mass'], 'I', 3)));
    expect(JSON.stringify(math(['length', 'mass'], 'CP', 3)[0].ops.filter((o) => o.t !== 'text'))).toBe(JSON.stringify(math(['length', 'mass'], undefined, 3)[0].ops.filter((o) => o.t !== 'text')));
  });

  it('masses, clasa a II-a: kilograms or grams on a level balance, the weights add up to the mass; the comparisons are right', () => {
    const grams = (text: string) => { const [v, u] = text.split(' '); return Number(v) * (u === 'kg' ? 1000 : 1); };
    for (const unit of ['kg', 'g'] as const) for (const thing of WEIGHED[unit]) {
      expect(hasIcon(thing.picture), thing.name).toBe(true);
      for (const m of thing.masses) {
        const w = weightsFor(m, unit);
        expect(w.reduce((a, b) => a + b, 0), `${thing.name} ${m}`).toBe(m);
        expect(w.length, `${thing.name} ${m}`).toBeLessThanOrEqual(3);
        for (const x of w) expect(WEIGHTS[unit]).toContain(x);
      }
    }
    const units = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = massSheetII(rng(seedOf(`mass:${seed}`)));
      units.add(s.unit);
      expect(s.items).toHaveLength(4);
      expect(new Set(s.items.map((i) => i.mass)).size).toBe(4);
      expect(new Set(s.items.map((i) => i.picture)).size).toBe(4);
      for (const it of s.items) expect(it.weights.reduce((a, b) => a + b, 0)).toBe(it.mass);
      expect(s.compare).toHaveLength(4);
      for (const c of s.compare) expect(c.answer, `${c.left} ? ${c.right}`).toBe(grams(c.left) < grams(c.right) ? '<' : grams(c.left) > grams(c.right) ? '>' : '=');
      expect(s.compare.filter((c) => c.answer === '=')).toHaveLength(1);
      const pages = math(['mass'], 'II', seed);
      const page = pages[0];
      const t = texts(page);
      expect(t[0]).toBe('Cât cântărește? Kilograme și grame');
      // level beams, and on each right pan the labels of that thing's weights
      const beams = page.ops.filter((o): o is Extract<DrawOp, { t: 'line' }> => o.t === 'line' && o.strokeWidth === 1.5);
      expect(beams).toHaveLength(4);
      for (const b of beams) expect(b.y1).toBe(b.y2);
      const labels = flattenOps(page.ops).filter((o): o is Extract<DrawOp, { t: 'text' }> => o.t === 'text' && /^\d+ (kg|g)$/.test(o.text) && o.size <= 2.9);
      beams.forEach((b, i) => {
        const mine = labels.filter((l) => l.x > (b.x1 + b.x2) / 2 && l.x < b.x2 + 25 && l.y < b.y1 && l.y > b.y1 - 25);
        expect(mine.map((l) => grams(l.text)).reduce((x, y) => x + y, 0), `mass II ${seed} ${s.items[i].name}`).toBe(grams(`${s.items[i].mass} ${s.unit}`));
      });
      const key = pages.slice(1).flatMap(texts).join('\n');
      for (const a of massAnswersII(s)) expect(key).toContain(a.replace(/^[a-h]\) /, ''));
      const heavy = s.items.reduce((b, x, i) => (x.mass > s.items[b].mass ? i : b), 0);
      expect(massAnswersII(s)).toContain(`Cel mai greu: ${'abcd'[heavy]})`);
      pages.forEach((pg) => {
        expect(opsOutside(pg, { minX: 11.7, minY: 11.7, maxX: 198.3, maxY: 290 }), `mass II ${seed}`).toEqual([]);
        expect(textOverlaps(pg), `mass II ${seed}`).toEqual([]);
      });
      // grădiniță and no class: the tilted balance, as always
      for (const level of [undefined, 'presc'] as const) expect(texts(math(['mass'], level, seed)[0])[0]).toBe('Mai greu, mai ușor');
    }
    expect(units).toEqual(new Set(['kg', 'g']));
    // the class label: standard units of mass are II 6.4
    const codes = (level: 'presc' | 'II') => sheetCompetences({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['mass'] }, level).map((r) => r.code);
    expect([codes('presc'), codes('II')]).toEqual([['2.2'], ['6.4']]);
  });
});

describe('the seed travels with the sheet', () => {
  const KEY = homeworkKeys({ HOMEWORK_LINK_SECRET: 'test-secret-0123456789abcdef' })[0];
  const NOW = Date.UTC(2026, 10, 24, 12);
  const items = ['odd:2', 'maze:3', 'place:1', 'find:A'];

  it('the homework link: the parent prints the teacher’s variant; a link made before there were variants prints the first', () => {
    const config = sanitizeConfig(games(items, { variantSeed: 23, curriculumLevel: 'CP', mathAnswers: true }));
    const res = verifyHomeworkToken(createHomeworkToken({ kind: 'sheet', config: configForSaving(config), tier: 'full', expiresAt: NOW + 86_400_000 } as never, KEY), [KEY], NOW);
    if (!res.ok || res.homework.kind !== 'sheet') throw new Error('not a sheet');
    expect(res.homework.config.variantSeed).toBe(23);
    expect(JSON.stringify(homeworkPages(res.homework, ''))).toBe(JSON.stringify(buildWorksheetPages(config, 'full')));
    const old = sanitizeConfig(games(items, { curriculumLevel: 'CP' }));
    const first = verifyHomeworkToken(createHomeworkToken({ kind: 'sheet', config: old, tier: 'full', expiresAt: NOW + 86_400_000 } as never, KEY), [KEY], NOW);
    if (!first.ok || first.homework.kind !== 'sheet') throw new Error('not a sheet');
    expect('variantSeed' in first.homework.config).toBe(false);
    expect(JSON.stringify(homeworkPages(first.homework, ''))).toBe(JSON.stringify(buildWorksheetPages(old, 'full')));
    expect(JSON.stringify(homeworkPages(first.homework, ''))).not.toBe(JSON.stringify(homeworkPages(res.homework, '')));
  });

  it('the group sheets: the „Găsește litera” pages follow the seed, in the page, the saved project and the homework link', () => {
    const opts = { names: ['Ana'], letters: ['M'], letterMode: 'uppercase' as const, difficulty: 'beginner' as const, withFindPages: true };
    const first = buildGroupPages(opts).pages;
    const other = buildGroupPages({ ...opts, variantSeed: 4 }).pages;
    expect(JSON.stringify(buildGroupPages({ ...opts, variantSeed: 1 }).pages)).toBe(JSON.stringify(first));
    expect(JSON.stringify(other[0])).toBe(JSON.stringify(first[0]));
    expect(JSON.stringify(other[1])).not.toBe(JSON.stringify(first[1]));
    expect(sanitizeGroupProject({ letters: ['M'], variantSeed: 4 })?.variantSeed).toBe(4);
    for (const bad of [1, 0, 'x', NaN, undefined]) expect('variantSeed' in sanitizeGroupProject({ letters: ['M'], variantSeed: bad })!, String(bad)).toBe(false);
    const res = verifyHomeworkToken(createHomeworkToken({ kind: 'group', group: { letters: ['M'], letterMode: 'uppercase', script: 'print', difficulty: 'beginner', withFind: true, variantSeed: 4 }, tier: 'full', expiresAt: NOW + 86_400_000 } as never, KEY), [KEY], NOW);
    if (!res.ok || res.homework.kind !== 'group') throw new Error('not a group');
    expect(res.homework.group.variantSeed).toBe(4);
    expect(JSON.stringify(homeworkPages(res.homework, 'Ana')[1])).toBe(JSON.stringify(other[1]));
  });

  it('the evaluation: its exercises are those of the variant, and its answers with them', () => {
    const config = (seed?: number) => games(['count:10', 'sound:A', 'first:2', 'syl:2', 'split:2', 'sort:1', 'odd:1'], { evaluation: true, curriculumLevel: 'CP', ...(seed ? { variantSeed: seed } : {}) });
    const a = buildWorksheetPages(config(), 'full');
    const b = buildWorksheetPages(config(8), 'full');
    expect(JSON.stringify(buildWorksheetPages(config(8), 'full'))).toBe(JSON.stringify(b));
    expect(JSON.stringify(buildWorksheetPages(config(1), 'full'))).toBe(JSON.stringify(a));
    expect(JSON.stringify(b)).not.toBe(JSON.stringify(a));
    // the words of the variant are on the evaluation's answers page
    const answers = b.flatMap(texts).join('\n');
    const rows = oddRows(1, 8);
    expect(answers).toContain(rows[0].objects[rows[0].intruder].word);
    b.forEach((p, i) => expect(opsOutside(p, AREA), `evaluation page ${i + 1}`).toEqual([]));
  });
});
