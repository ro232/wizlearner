import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { COLOUR_PICTURES, FUN_KINDS, FUN_SETS, MAZE_SETS, SCENES, SHADOW_SETS, TRACE_SETS, isFunItem } from '@/lib/worksheet/fun';
import {
  FUN_KIND_TITLES, colourLayout, colourRaster, colourSums, diffLayout, diffSpots, funItems, funKeyExtras, funKeySection, funLabel,
  mazeLayout, mazeNeighbours, mazeOf, sceneObjects, shadowLayout, sumValue, traceRows, SCENE_H, SCENE_W,
} from '@/lib/worksheet/fun-pages';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { gameAnswerPages, gameKeySection } from '@/lib/worksheet/game-keys';
import { hasIcon, iconOps, silhouetteOps } from '@/lib/hints/icons';
import { themeById } from '@/lib/themes';
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
const sets = Array.from({ length: FUN_SETS }, (_, i) => i + 1);
/** The top of the activity area: under the header with its help line (page-kit.ts frame). */
const FRAME = 51;
const ITEMS = funItems();

describe('the items', () => {
  it('are activities with a label, and the store keeps exactly these', () => {
    expect(ITEMS).toHaveLength(FUN_KINDS.length * FUN_SETS);
    for (const i of ITEMS) {
      expect(isFunItem(i), i).toBe(true);
      expect(isActivityItem(i), i).toBe(true);
      expect(activityLabel(i)).toBe(funLabel(i));
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
    }
    expect(funLabel('maze:1')).toBe('Labirint: iepuraș · ușor');
    expect(funLabel('color:6')).toBe('Colorează după cod: brad (iarna)');
    for (const no of ['color:0', 'color:7', 'maze:', 'diff:x', 'trace:10', 'shadows:1', 'colsum']) {
      expect(isFunItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(isActivityItem(no));
    }
    expect(sanitizeConfig(games(['color:1', 'maze:7', 'shadow:6'])).selectedItems).toEqual(['color:1', 'shadow:6']);
    expect(itemFitsCategory('maze:1', 'math')).toBe(false);
  });

  it('every picture is in the icon set, and has a shadow', () => {
    const emojis = [
      ...MAZE_SETS.flatMap((m) => [m.from, m.to]),
      ...SCENES.flatMap((s) => [...s.objects.map((o) => o.e), ...s.diffs.flatMap((d) => (d.t === 'changed' ? [d.e] : []))]),
      ...TRACE_SETS.flatMap((t) => t.pairs.flat()),
      ...SHADOW_SETS.flatMap((s) => s.pictures.map((p) => p[0])),
    ];
    for (const e of emojis) expect(hasIcon(e), e).toBe(true);
    for (const s of SHADOW_SETS) for (const [e] of s.pictures) expect(silhouetteOps(e, 0, 0, 10), e).not.toBeNull();
  });

  it('one page per item, everything on the A4 paper (with the competence line), no texts on each other', () => {
    for (const level of ['presc', 'CP'] as const) {
      const pages = buildWorksheetPages(games(ITEMS, { curriculumLevel: level, childName: 'Ana-Maria Ștefănescu' }), 'full');
      expect(pages).toHaveLength(ITEMS.length);
      pages.forEach((p, i) => {
        expect([p.width, p.height]).toEqual([210, 297]);
        expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${level} ${ITEMS[i]}`).toEqual([]);
        expect(textOverlaps(p), ITEMS[i]).toEqual([]);
      });
    }
  });

  it('are the same every time (preview = PDF)', () => {
    const a = JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'));
    expect(JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'))).toBe(a);
  });

  it('say what to do in Romanian, with ș ț (comma below)', () => {
    expect(texts(page('color:1'))).toContain('Colorează fiecare parte cu culoarea numărului ei.');
    expect(texts(page('colsum:1'))).toContain('Calculează, apoi colorează fiecare parte cu culoarea rezultatului.');
    expect(texts(page('maze:1'))).toContain('Ajută iepurașul să ajungă la morcov.');
    expect(texts(page('maze:4'))).toContain('Ajută-l pe Moș Crăciun să ajungă la sanie.');
    expect(texts(page('diff:5'))).toContain('Găsește 5 diferențe între cele două imagini.');
    expect(texts(page('trace:1'))).toContain('Urmărește cu creionul linia punctată, fără să ridici creionul.');
    expect(texts(page('shadow:2'))).toContain('Unește fiecare imagine cu umbra ei.');
    const all = [...buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full').flatMap(texts), ...ITEMS.map(funLabel)];
    for (const t of all) expect(t).not.toMatch(/[şţŞŢ]/);
  });

  it('free plan: set 1 of each; the rest in the paid plan', () => {
    expect(ITEMS.filter((i) => isItemAllowed(i, 'games', 'free'))).toEqual(FUN_KINDS.map((k) => `${k}:1`));
    for (const i of ITEMS) expect(isItemAllowed(i, 'games', 'full')).toBe(true);
    expect(hasContent(games(['maze:2', 'diff:6']), 'free')).toBe(false);
    expect(buildWorksheetPages(games(['color:1', 'color:2', 'maze:1', 'maze:3']), 'free')).toHaveLength(2);
  });
});

describe('„Colorează după cod”', () => {
  it('every region has a code of the legend, every colour of the legend is used, 4–6 pictures', () => {
    expect(COLOUR_PICTURES).toHaveLength(6);
    for (const pic of COLOUR_PICTURES) {
      const codes = new Set(pic.regions.map((r) => r.code));
      expect([...codes].sort(), pic.title).toEqual(pic.palette.map((_, i) => i + 1));
      expect(new Set(pic.palette).size, pic.title).toBe(pic.palette.length);
      expect(pic.palette.length).toBeLessThanOrEqual(5);
      for (const r of pic.regions) expect(r.pts.length, r.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('every region shows as one piece (nothing hidden, no piece without its number)', () => {
    for (const pic of COLOUR_PICTURES) {
      const { top, cols, rows } = colourRaster(pic);
      pic.regions.forEach((reg, k) => {
        const seen = new Uint8Array(cols * rows);
        const pieces: number[] = [];
        for (let s = 0; s < top.length; s++) {
          if (top[s] !== k || seen[s]) continue;
          let size = 0;
          const stack = [s];
          seen[s] = 1;
          while (stack.length) {
            const c = stack.pop()!;
            size++;
            const i = c % cols;
            const j = Math.floor(c / cols);
            for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
              if (a < 0 || b < 0 || a >= cols || b >= rows) continue;
              const t = b * cols + a;
              if (!seen[t] && top[t] === k) {
                seen[t] = 1;
                stack.push(t);
              }
            }
          }
          pieces.push(size);
        }
        // a piece of a quarter of a square unit (cut off by a line of the decor) is not a place to colour
        expect(pieces.filter((p) => p >= 4), `${pic.title}: ${reg.name}`).toHaveLength(1);
      });
    }
  });

  it('every label sits in its own region, with room around it, in both variants', () => {
    sets.forEach((n) => {
      const pic = COLOUR_PICTURES[n - 1];
      const r = colourRaster(pic);
      for (const sums of [false, true]) {
        const lay = colourLayout(n, sums, FRAME + 2);
        lay.labels.forEach((l, k) => {
          expect(l.fit, `${pic.title} ${pic.regions[k].name} ${sums}`).toBeGreaterThanOrEqual(1);
          const i = Math.floor((l.x - lay.ox) / lay.scale / r.step);
          const j = Math.floor((l.y - lay.oy) / lay.scale / r.step);
          expect(r.top[j * r.cols + i], `${pic.title} ${pic.regions[k].name}`).toBe(k);
        });
      }
    });
  });

  it('the page prints the code (or the exercise) of every region, and the colour names', () => {
    sets.forEach((n) => {
      const pic = COLOUR_PICTURES[n - 1];
      for (const sums of [false, true]) {
        const p = page(`${sums ? 'colsum' : 'color'}:${n}`);
        const lay = colourLayout(n, sums, FRAME + 2);
        const drawn = flattenOps(p.ops).filter((o): o is Extract<DrawOp, { t: 'text' }> => o.t === 'text');
        for (const l of lay.labels) expect(drawn.some((t) => t.text === l.text && Math.abs(t.x - l.x) < 0.01), `${n} ${l.text}`).toBe(true);
        const names = { rosu: 'roșu', albastru: 'albastru', galben: 'galben', verde: 'verde', maro: 'maro', portocaliu: 'portocaliu' };
        for (const key of pic.palette) expect(texts(p), key).toContain(names[key]);
        expect(flattenOps(p.ops).filter((o) => o.t === 'polygon')).toHaveLength(pic.regions.length);
      }
    });
  });

  it('the exercises give the code of their region; the second number is 1–5, no number above 9', () => {
    sets.forEach((n) => {
      const pic = COLOUR_PICTURES[n - 1];
      colourSums(n).forEach((s, k) => {
        expect(sumValue(s), `${pic.title} ${s}`).toBe(pic.regions[k].code);
        const [, a, b] = s.match(/^(\d)[+−](\d)$/)!;
        expect(Number(b)).toBeGreaterThanOrEqual(1);
        expect(Number(b)).toBeLessThanOrEqual(5);
        expect(Number(a)).toBeGreaterThanOrEqual(1);
      });
    });
    expect([sumValue('2+3'), sumValue('7−2'), sumValue('x')]).toEqual([5, 5, NaN]);
  });

  it('the answers name every part under its colour', () => {
    const key = funKeySection('color:2')!;
    expect(key.entries).toEqual([
      '1 – roșu: acoperișul',
      '2 – albastru: cerul, fereastra',
      '3 – galben: soarele, peretele',
      '4 – verde: iarba',
      '5 – maro: hornul, ușa',
    ]);
    const sums = funKeySection('colsum:2')!;
    sums.entries.forEach((e, i) => {
      expect(e.startsWith(`${i + 1} – `), e).toBe(true);
      for (const x of e.match(/\(([^)]*)\)$/)![1].split(', ')) expect(sumValue(x), e).toBe(i + 1);
    });
  });
});

describe('„Labirint”', () => {
  it('3 sizes; every cell reached by exactly one way (a tree), so the path is the only one', () => {
    expect([...new Set(MAZE_SETS.map((m) => m.size))].sort((a, b) => a - b)).toEqual([6, 9, 12]);
    sets.forEach((n) => {
      const m = mazeOf(n);
      const N = m.size;
      expect(N).toBe(MAZE_SETS[n - 1].size);
      let edges = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) edges += (m.open[r][c] & 1 ? 1 : 0) + (m.open[r][c] & 2 ? 1 : 0);
      // a connected graph with cells − 1 passages has no loop
      expect(edges, `maze ${n}`).toBe(N * N - 1);
      const seen = new Set([0]);
      const queue = [{ r: 0, c: 0 }];
      while (queue.length) for (const nb of mazeNeighbours(m, ...(Object.values(queue.shift()!) as [number, number]))) if (!seen.has(nb.r * N + nb.c)) {
        seen.add(nb.r * N + nb.c);
        queue.push(nb);
      }
      expect(seen.size).toBe(N * N);
      // the path: from the entrance to the exit, through open walls, no cell twice, long enough
      expect(m.path[0]).toEqual({ r: 0, c: 0 });
      expect(m.path[m.path.length - 1]).toEqual({ r: N - 1, c: N - 1 });
      expect(new Set(m.path.map((p) => p.r * N + p.c)).size).toBe(m.path.length);
      m.path.slice(1).forEach((p, i) => expect(mazeNeighbours(m, m.path[i].r, m.path[i].c)).toContainEqual(p));
      expect(m.path.length).toBeGreaterThanOrEqual(1.6 * (2 * N - 1));
    });
  });

  it('the walls leave the entrance and the exit open, and only those', () => {
    sets.forEach((n) => {
      const p = page(`maze:${n}`);
      const lay = mazeLayout(n, FRAME + 1);
      const c = lay.side / lay.maze.size;
      const walls = flattenOps(p.ops).find((o) => o.t === 'path' && (o.subpaths?.length ?? 0) > 20);
      expect(walls?.t).toBe('path');
      if (walls?.t !== 'path') return;
      const onEdge = (y: number, x0: number, x1: number) => walls.subpaths.some((s) => {
        const e = s.segs[0].p;
        return Math.abs(s.start.y - y) < 0.01 && Math.abs(e.y - y) < 0.01 && Math.min(s.start.x, e.x) <= x0 + 0.01 && Math.max(s.start.x, e.x) >= x1 - 0.01;
      });
      expect(onEdge(lay.y, lay.x, lay.x + c), 'entrance').toBe(false);
      expect(onEdge(lay.y, lay.x + c, lay.x + 2 * c), 'top wall').toBe(true);
      expect(onEdge(lay.y + lay.side, lay.x + lay.side - c, lay.x + lay.side), 'exit').toBe(false);
      expect(onEdge(lay.y + lay.side, lay.x, lay.x + c), 'bottom wall').toBe(true);
    });
  });

  it('the answers page draws the path, from the same maze', () => {
    const answers = gameAnswerPages(games(['maze:1'], { mathAnswers: true }), 'full');
    expect(answers).toHaveLength(1);
    const m = mazeOf(1);
    const path = flattenOps(answers[0]).find((o) => o.t === 'path' && o.stroke === '#E8913A');
    expect(path?.t === 'path' ? path.subpaths[0].segs.length : 0).toBe(m.path.length + 1);
    expect(funKeyExtras(['maze:1', 'color:1', 'diff:2', 'trace:1', 'maze:2'])).toHaveLength(2);
    expect(gameKeySection(games(['maze:1']), 'maze:1')?.entries[0]).toMatch(/desenat/);
  });
});

describe('„Găsește diferențele”', () => {
  it('3, 3, 4, 4, 5, 5 differences: the two pictures differ in exactly these, and the page counts them', () => {
    expect(SCENES.map((s) => s.diffs.length)).toEqual([3, 3, 4, 4, 5, 5]);
    SCENES.forEach((scene, si) => {
      const a = sceneObjects(scene, 'a');
      const b = sceneObjects(scene, 'b');
      const changed = a.filter((o) => {
        const other = b.find((x) => x.k === o.k);
        return !other || other.e !== o.e || other.x !== o.x || other.y !== o.y;
      });
      expect(changed.map((o) => o.k).sort(), scene.title).toEqual(scene.diffs.map((d) => d.i).sort());
      expect(new Set(scene.diffs.map((d) => d.i)).size).toBe(scene.diffs.length);
      expect(b.length).toBe(a.length - scene.diffs.filter((d) => d.t === 'missing').length);
      // every kind of difference is there
      expect(new Set(scene.diffs.map((d) => d.t)), scene.title).toEqual(new Set(['missing', 'changed', 'moved']));
      // the page: the counting circles, the two pictures with their pictures
      const p = page(`diff:${si + 1}`);
      const circles = p.ops.filter((o) => o.t === 'circle' && o.r === 4);
      expect(circles, scene.title).toHaveLength(scene.diffs.length);
      const lay = diffLayout(si + 1, FRAME + 1);
      const groups = (y: number) => p.ops.filter((o) => o.t === 'group' && o.ty >= y - 0.01 && o.ty < y + SCENE_H * lay.scale);
      expect(groups(lay.ya)).toHaveLength(a.length);
      expect(groups(lay.yb)).toHaveLength(b.length);
    });
  });

  it('the differences are plain to see: big enough, nothing hidden behind another picture, a move is a short move', () => {
    const box = (o: { x: number; y: number; s: number }) => ({ x0: o.x - o.s / 2, x1: o.x + o.s / 2, y0: o.y - o.s / 2, y1: o.y + o.s / 2 });
    const overlap = (p: ReturnType<typeof box>, q: ReturnType<typeof box>) => Math.max(0, Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0)) * Math.max(0, Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0));
    for (const scene of SCENES) {
      for (const which of ['a', 'b'] as const) {
        const objs = sceneObjects(scene, which);
        for (const o of objs) {
          const b = box(o);
          expect(b.x0 >= 0.5 && b.x1 <= SCENE_W - 0.5 && b.y0 >= 0.5 && b.y1 <= SCENE_H - 0.5, `${scene.title} ${which} ${o.name}`).toBe(true);
        }
        for (let i = 0; i < objs.length; i++)
          for (let j = i + 1; j < objs.length; j++) {
            const small = Math.min(objs[i].s, objs[j].s) ** 2;
            expect(overlap(box(objs[i]), box(objs[j])) / small, `${scene.title} ${which}: ${objs[i].name} / ${objs[j].name}`).toBeLessThanOrEqual(0.06);
          }
      }
      for (const d of scene.diffs) {
        const o = scene.objects[d.i];
        expect(o.s, `${scene.title} ${o.name}`).toBeGreaterThanOrEqual(8);
        expect(d.desc).toMatch(/^[A-ZȘȚĂÂÎ].*\.$/);
        if (d.t === 'changed') expect(scene.objects.some((x) => x.e === d.e), `${scene.title} ${d.e}`).toBe(false);
        if (d.t === 'moved') {
          const dist = Math.hypot(d.x - o.x, d.y - o.y);
          expect(dist / o.s, `${scene.title} ${o.name}`).toBeGreaterThanOrEqual(1);
          expect(dist / o.s, `${scene.title} ${o.name}`).toBeLessThanOrEqual(2);
        }
      }
      expect(diffSpots(scene)).toHaveLength(scene.diffs.length);
    }
  });

  it('the answers list the differences, and draw the second picture with them circled', () => {
    expect(funKeySection('diff:1')?.entries).toEqual(['Lipsește norul.', 'O pisică în loc de cățel.', 'Fluturele s-a mutat mai jos.']);
    const answers = gameAnswerPages(games(['diff:1'], { mathAnswers: true }), 'full');
    expect(flattenOps(answers[0]).filter((o) => o.t === 'circle' && o.stroke === '#DC2626')).toHaveLength(3);
  });
});

describe('„Urmărește linia” and „Găsește umbra”', () => {
  it('five rows of dashed lines between two pictures, with the patterns of the set', () => {
    sets.forEach((n) => {
      const rows = traceRows(n, FRAME + 1);
      expect(rows).toHaveLength(5);
      rows.forEach((r, i) => expect(r.pattern).toBe(TRACE_SETS[n - 1].patterns[i % TRACE_SETS[n - 1].patterns.length]));
      const p = page(`trace:${n}`);
      const dashed = flattenOps(p.ops).filter((o) => o.t === 'path' && o.dash);
      expect(dashed.length, `trace ${n}`).toBeGreaterThanOrEqual(5);
      // every dash between the two pictures of its row
      for (const d of dashed) if (d.t === 'path') expect(d.subpaths[0].start.x).toBeGreaterThan(rows[0].x0 - 1);
    });
    expect(new Set(TRACE_SETS.flatMap((t) => t.patterns))).toEqual(new Set(['horizontal', 'waves', 'zigzag', 'cups', 'castle', 'loops']));
  });

  it('every shadow is the dark copy of one picture of the set, never on the row of its picture; the answers match', () => {
    sets.forEach((n) => {
      const set = SHADOW_SETS[n - 1];
      expect(set.pictures).toHaveLength(6);
      expect(new Set(set.pictures.map((p) => p[0])).size).toBe(6);
      const lay = shadowLayout(n, FRAME + 2);
      expect([...lay.order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      lay.order.forEach((k, i) => expect(k).not.toBe(i));
      const p = page(`shadow:${n}`);
      const shadows = p.ops.filter((o): o is Extract<DrawOp, { t: 'group' }> => o.t === 'group' && o.ops.every((x) => x.t === 'path' && x.fill === '#3A4150'));
      expect(shadows).toHaveLength(6);
      shadows.forEach((g, i) => {
        const icon = iconOps(set.pictures[lay.order[i]][0], 0, 0, 10)[0] as Extract<DrawOp, { t: 'group' }>;
        expect(g.ops.map((o) => (o.t === 'path' ? o.subpaths : null)), `${n} row ${i}`).toEqual(icon.ops.map((o) => (o.t === 'path' ? o.subpaths : null)));
      });
      const key = funKeySection(`shadow:${n}`)!;
      set.pictures.forEach(([, name], j) => expect(key.entries[j + 1]).toBe(`${j + 1}. ${name} – umbra ${lay.order.indexOf(j) + 1}`));
    });
  });

  it('the Christmas set is the „Crăciun” theme (themes.ts), with its proper name in capitals', () => {
    const theme = themeById('craciun')!;
    expect(SHADOW_SETS[5].pictures.map((p) => p[0])).toEqual(theme.words.map((w) => w.emoji));
    expect(SHADOW_SETS[5].pictures.map((p) => p[1])).toContain('Moș Crăciun');
    expect(funKeySection('trace:1')).toBeNull();
  });
});

describe('the competences', () => {
  const codes = (item: string, level: SchoolLevel) => sheetCompetences(games([item]), level).map((r) => (r.domain ? `${r.domain}.${r.code}` : r.code));

  it('colour by number: E.2.1 / MEM CP 1.1; with exercises: CP 1.4 only', () => {
    expect([codes('color:1', 'presc'), codes('color:1', 'CP'), codes('color:1', 'I'), codes('color:1', 'II')]).toEqual([['E.2.1'], ['1.1'], [], []]);
    expect([codes('colsum:1', 'presc'), codes('colsum:1', 'CP'), codes('colsum:1', 'I')]).toEqual([[], ['1.4'], []]);
    expect(sheetCompetenceLabel(games(['colsum:3']), 'CP')).toBe('Competența specifică 1.4 · Matematică și explorarea mediului, clasa pregătitoare');
  });

  it('the lines to trace as the pre-writing sheets (D.3.4, CLR CP 4.1); the maze, the differences and the shadows: none', () => {
    expect([codes('trace:2', 'presc'), codes('trace:2', 'CP'), codes('trace:2', 'I')]).toEqual([['D.3.4'], ['4.1'], []]);
    expect(sheetCompetences(games(['trace:2']), 'CP')[0].programme).toBe('clr-p-ii');
    for (const k of ['maze', 'diff', 'shadow']) for (const level of ['presc', 'CP', 'I', 'II'] as const) expect(codes(`${k}:1`, level), `${k} ${level}`).toEqual([]);
  });

  it('the codes exist in the programme data, and the class pages list the presets, which open free sets', () => {
    for (const item of ['color:1', 'colsum:1', 'trace:1']) for (const level of ['presc', 'CP'] as const) for (const r of sheetCompetences(games([item]), level)) expect(findCompetence(r), item).toBeTruthy();
    const listed = (slug: string, code: string) => classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).flatMap((g) => g.items).filter((i) => i.code === code).flatMap((i) => i.presets.map((p) => p.id));
    expect(listed('gradinita', 'E.2.1')).toContain('coloreaza-dupa-cod');
    expect(listed('gradinita', 'D.3.4')).toContain('urmareste-linia');
    expect(listed('clasa-pregatitoare', '1.4')).toContain('calculeaza-coloreaza');
    for (const id of ['coloreaza-dupa-cod', 'calculeaza-coloreaza', 'urmareste-linia']) {
      const preset = SHEET_PRESETS.find((p) => p.id === id)!;
      for (const level of preset.levels!) for (const item of presetConfig(preset, level).selectedItems) expect(isItemAllowed(item, 'games', 'free'), `${id} ${level}`).toBe(true);
    }
    expect(FUN_KIND_TITLES.shadow).toBe('Găsește umbra');
  });
});
