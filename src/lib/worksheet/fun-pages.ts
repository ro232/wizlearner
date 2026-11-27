import type { DrawOp, Glyph, GlyphDef, PageOps, Pt } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps, silhouetteOps } from '@/lib/hints/icons';
import { textWidthMm } from '@/lib/book/text';
import { renderGlyph, DEFAULT_GLYPH_STYLE } from '@/lib/glyphs/render';
import { buildGlyph } from '@/lib/glyphs/geometry';
import { ACCENT, INK, PAPER } from './rows';
import type { KeyExtra, KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, H, M, SOFT, W, adultNote, derangement, exampleLine, exampleTag, fitSize, footer, frame, rng, seedOf, shuffle } from './page-kit';
import {
  COLOUR_FILLS, COLOUR_NAMES, COLOUR_PICTURES, FUN_KINDS, FUN_SETS, MAZE_SETS, SCENES, SCENE_SWAPS, SHADOW_POOLS, SHADOW_SETS, TRACE_PAIRS, TRACE_SETS, TRACE_WINTER_PAIRS, isFunItem,
  type ColourPicture, type FunKind, type Scene, type SceneDiff, type SceneObject, type ShadowSet, type TracePattern,
} from './fun';
import { currentVariant, vkey } from './variant';

/**
 * The fun preschool sheets, full pages in the „Jocuri” category (see activities.ts), seeded by the
 * item so the preview and the PDF are the same sheet every time:
 *
 * - "color:1–6"   Colorează după cod — a drawing in regions, each with its number (1–5), and the
 *                 legend with the colour's swatch AND its name (the print may be black and white);
 * - "colsum:1–6"  Calculează și colorează — the same drawings, an addition or subtraction (result 1–5,
 *                 second number 1–5) in each region instead of the number (clasa pregătitoare);
 * - "maze:1–6"    Labirint — a perfect maze (one path only) in 6 × 6, 9 × 9 or 12 × 12 cells, from the
 *                 picture above the entrance to the picture under the exit;
 * - "diff:1–6"    Găsește diferențele — one scene twice, the second with 3–5 differences (a picture
 *                 missing, another picture in its place, a picture moved), and circles to count them;
 * - "trace:1–6"   Urmărește linia — dashed lines (straight, waves, zigzag, cups, castle, loops) from
 *                 picture to picture, drawn with the pre-writing patterns (patterns.ts);
 * - "shadow:1–6"  Găsește umbra — six pictures and their shadows (the same picture in one dark colour).
 *
 * The layouts are computed by exported functions (colourLayout, mazeOf, sceneOf, traceRows,
 * shadowLayout), which the tests and the answers page read, so the answers match the drawing.
 *
 * „Altă variantă” (variant.ts): the first variant is the sheet as it was written; the others are drawn
 * from the same data under the same rules — the numbers of the legend change places (the drawing and
 * the colour of each part stay), other exercises, another maze, other differences in the same scene,
 * other pairs and lines, six other pictures of the same kind and their shadows.
 */

export const FUN_KIND_TITLES: Record<FunKind, string> = {
  color: 'Colorează după cod',
  colsum: 'Calculează și colorează',
  maze: 'Labirint',
  diff: 'Găsește diferențele',
  trace: 'Urmărește linia',
  shadow: 'Găsește umbra',
};

const SET_NUMBERS = Array.from({ length: FUN_SETS }, (_, i) => String(i + 1));

/** Every item, in picker order. */
export function funItems(): string[] {
  return FUN_KINDS.flatMap((k) => SET_NUMBERS.map((n) => `${k}:${n}`));
}

/** The short name of a set, for its button in the picker. */
export function funShortLabel(item: string): string {
  const [kind, arg] = item.split(':') as [FunKind, string];
  const i = Number(arg) - 1;
  if (kind === 'color' || kind === 'colsum') return COLOUR_PICTURES[i]?.short ?? arg;
  if (kind === 'maze') return MAZE_SETS[i]?.short ?? arg;
  if (kind === 'diff') return SCENES[i]?.short ?? arg;
  if (kind === 'trace') return TRACE_SETS[i]?.short ?? arg;
  return SHADOW_SETS[i]?.short ?? arg;
}

export function funLabel(item: string): string {
  const [kind] = item.split(':') as [FunKind];
  return `${FUN_KIND_TITLES[kind] ?? kind}: ${funShortLabel(item)}`;
}

// ───────────────────────── „Colorează după cod” ─────────────────────────

/** The raster of a drawing: which region is on top at each point (−1: no region, −2: a line or dot). */
export interface ColourRaster {
  step: number;
  cols: number;
  rows: number;
  top: Int16Array;
}

/** Raster step, in picture units (a drawing is 100 units wide). */
export const RASTER_STEP = 0.5;

function inPolygon(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Pen width of the outlines, in picture units, and of the lines drawn over them (decor). */
const OUTLINE = 0.45;
const DECOR = 0.6;

const rasterCache = new WeakMap<ColourPicture, ColourRaster>();

/** The region on top at every point of the drawing; the lines and dots of the decor are marked apart. */
export function colourRaster(pic: ColourPicture): ColourRaster {
  const hit = rasterCache.get(pic);
  if (hit) return hit;
  const step = RASTER_STEP;
  const cols = Math.round(pic.w / step);
  const rows = Math.round(pic.h / step);
  const top = new Int16Array(cols * rows).fill(-1);
  const boxes = pic.regions.map((r) => ({
    minX: Math.min(...r.pts.map((p) => p.x)), maxX: Math.max(...r.pts.map((p) => p.x)),
    minY: Math.min(...r.pts.map((p) => p.y)), maxY: Math.max(...r.pts.map((p) => p.y)),
  }));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = { x: (i + 0.5) * step, y: (j + 0.5) * step };
      for (let k = pic.regions.length - 1; k >= 0; k--) {
        const b = boxes[k];
        if (p.x < b.minX || p.x > b.maxX || p.y < b.minY || p.y > b.maxY) continue;
        if (inPolygon(p.x, p.y, pic.regions[k].pts)) {
          top[j * cols + i] = k;
          break;
        }
      }
      for (const d of pic.decor) {
        const near = d.t === 'dot' ? Math.hypot(p.x - d.x, p.y - d.y) <= d.r + 0.3 : d.pts.slice(1).some((q, k) => segDist(p, d.pts[k], q) <= (d.w ?? DECOR) / 2 + 0.3);
        if (near) top[j * cols + i] = -2;
      }
    }
  }
  const r = { step, cols, rows, top };
  rasterCache.set(pic, r);
  return r;
}

/**
 * The best place for a label of half-size (hw, hh) picture units in region `k`: the point where the
 * largest copy of that box still fits in the visible part of the region. `fit` ≥ 1: the label fits
 * with its margin all round.
 */
export function placeLabel(pic: ColourPicture, k: number, hw: number, hh: number): { x: number; y: number; fit: number } {
  // the place depends on the shapes only, which every variant of a drawing shares (with its raster)
  const raster = colourRaster(pic);
  const places = labelCache.get(raster) ?? new Map<string, { x: number; y: number; fit: number }>();
  labelCache.set(raster, places);
  const key = `${k}:${hw}:${hh}`;
  const hit = places.get(key);
  if (hit) return hit;
  const at = findLabelPlace(raster, k, hw, hh);
  places.set(key, at);
  return at;
}

const labelCache = new WeakMap<ColourRaster, Map<string, { x: number; y: number; fit: number }>>();

function findLabelPlace({ step, cols, rows, top }: ColourRaster, k: number, hw: number, hh: number): { x: number; y: number; fit: number } {
  // summed-area table of the region's visible cells
  const S = new Int32Array((cols + 1) * (rows + 1));
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = top[j * cols + i] === k ? 1 : 0;
      if (v) {
        sx += i;
        sy += j;
        n++;
      }
      S[(j + 1) * (cols + 1) + i + 1] = v + S[j * (cols + 1) + i + 1] + S[(j + 1) * (cols + 1) + i] - S[j * (cols + 1) + i];
    }
  }
  const cx = n ? sx / n : 0;
  const cy = n ? sy / n : 0;
  const full = (i0: number, j0: number, i1: number, j1: number) => {
    if (i0 < 0 || j0 < 0 || i1 >= cols || j1 >= rows) return false;
    const a = S[(j1 + 1) * (cols + 1) + i1 + 1] - S[j0 * (cols + 1) + i1 + 1] - S[(j1 + 1) * (cols + 1) + i0] + S[j0 * (cols + 1) + i0];
    return a === (i1 - i0 + 1) * (j1 - j0 + 1);
  };
  let best = { i: 0, j: 0, fit: -1, d: Infinity };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (top[j * cols + i] !== k) continue;
      // the largest scale t (in 1/16) at which the box fits around this cell
      let lo = 0;
      let hi = 64;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        const t = mid / 16;
        const ri = Math.ceil((hw * t) / step);
        const rj = Math.ceil((hh * t) / step);
        if (full(i - ri, j - rj, i + ri, j + rj)) lo = mid;
        else hi = mid - 1;
      }
      const fit = lo / 16;
      const d = Math.hypot(i - cx, j - cy);
      if (fit > best.fit + 1e-9 || (Math.abs(fit - best.fit) < 1e-9 && d < best.d)) best = { i, j, fit, d };
    }
  }
  return { x: (best.i + 0.5) * step, y: (best.j + 0.5) * step, fit: best.fit };
}

const CODE_SIZE = 4.6;
const SUM_SIZE = 4;
const LABEL_PAD = 0.9;
const LEGEND_H = 22;

const pictureCache = new Map<string, ColourPicture>();

/**
 * The drawing of a set. From the second variant on, the numbers of the legend change places: every
 * part keeps its colour (the water stays blue), but under another number, so the sheet is read again.
 */
export function colourPicture(n: number, variant = currentVariant()): ColourPicture {
  const base = COLOUR_PICTURES[n - 1];
  if (variant === 1) return base;
  const key = `${n}:${variant}`;
  const hit = pictureCache.get(key);
  if (hit) return hit;
  const rand = rng(seedOf(vkey(`color:${n}`, variant)));
  const same = base.palette.map((_, i) => i);
  // order[i]: the colour (its place in the first legend) that gets the number i + 1; never the first legend again
  let order = shuffle(same, rand);
  while (order.every((v, i) => v === i)) order = shuffle(same, rand);
  const pic: ColourPicture = { ...base, palette: order.map((i) => base.palette[i]), regions: base.regions.map((r) => ({ ...r, code: order.indexOf(r.code - 1) + 1 })) };
  // the same shapes: the same raster
  rasterCache.set(pic, colourRaster(base));
  if (pictureCache.size > 60) pictureCache.clear();
  pictureCache.set(key, pic);
  return pic;
}

/** An addition or subtraction for each region, with the region's code as result (second number 1–5). */
export function colourSums(n: number, variant = currentVariant()): string[] {
  const pic = colourPicture(n, variant);
  const rand = rng(seedOf(vkey(`colsum:${n}`, variant)));
  return pic.regions.map((r) => {
    const c = r.code;
    const options: string[] = [];
    for (let b = 1; b <= 5; b++) {
      if (c - b >= 1) options.push(`${c - b}+${b}`);
      if (c + b <= 9) options.push(`${c + b}−${b}`);
    }
    return options[Math.floor(rand() * options.length)];
  });
}

/** The value of a printed exercise („2+3”, „7−2”). */
export function sumValue(text: string): number {
  const m = text.match(/^(\d+)([+−])(\d+)$/);
  if (!m) return NaN;
  return m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
}

export interface ColourLayout {
  pic: ColourPicture;
  /** Picture units → mm. */
  scale: number;
  ox: number;
  oy: number;
  /** The text in each region (its code, or the exercise), where it goes (mm) and its size. */
  labels: { text: string; x: number; y: number; size: number; fit: number }[];
}

/** Where the drawing and its labels go (`top`: the top of the activity area). */
export function colourLayout(n: number, sums: boolean, top: number, variant = currentVariant()): ColourLayout {
  const pic = colourPicture(n, variant);
  const roomH = BOTTOM - LEGEND_H - 6 - top;
  const scale = Math.min((W - 2 * M) / pic.w, roomH / pic.h);
  const ox = (W - pic.w * scale) / 2;
  const oy = top + (roomH - pic.h * scale) / 2;
  const texts = sums ? colourSums(n, variant) : pic.regions.map((r) => String(r.code));
  const size = sums ? SUM_SIZE : CODE_SIZE;
  // every label of a page gets the same box: the widest text it can hold
  const widest = sums ? '8−3' : '5';
  const hw = (textWidthMm(widest, size) * 0.62 + LABEL_PAD) / scale;
  const hh = (size * 0.38 + LABEL_PAD) / scale;
  const labels = pic.regions.map((_, k) => {
    const at = placeLabel(pic, k, hw, hh);
    return { text: texts[k], x: ox + at.x * scale, y: oy + at.y * scale, size, fit: at.fit };
  });
  return { pic, scale, ox, oy, labels };
}

function colourPage(config: WorksheetConfig, n: number, sums: boolean, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const pic = colourPicture(n);
  const top = sums
    ? frame(ops, config, `${FUN_KIND_TITLES.colsum}: ${pic.title}`, 'Calculează, apoi colorează fiecare parte cu culoarea rezultatului.', 'Rezultatele și culorile lor sunt jos, în chenar.')
    : frame(ops, config, `${FUN_KIND_TITLES.color}: ${pic.title}`, 'Colorează fiecare parte cu culoarea numărului ei.', 'Numerele și culorile lor sunt jos, în chenar.');
  const lay = colourLayout(n, sums, top + 2);
  const at = (p: Pt) => ({ x: lay.ox + p.x * lay.scale, y: lay.oy + p.y * lay.scale });
  for (const r of pic.regions) ops.push({ t: 'polygon', points: r.pts.map(at), fill: PAPER, stroke: INK, strokeWidth: OUTLINE * lay.scale });
  for (const d of pic.decor) {
    if (d.t === 'dot') ops.push({ t: 'circle', cx: at(d).x, cy: at(d).y, r: d.r * lay.scale, fill: INK });
    else ops.push({ t: 'path', subpaths: [{ start: at(d.pts[0]), segs: d.pts.slice(1).map((p) => ({ kind: 'L' as const, p: at(p) })) }], stroke: INK, strokeWidth: (d.w ?? DECOR) * lay.scale, cap: 'round' });
  }
  for (const l of lay.labels) ops.push({ t: 'text', x: l.x, y: l.y + l.size * 0.36, text: l.text, size: l.size, fill: '#334155', weight: 'bold', align: 'center' });

  // the legend: number, swatch, colour name
  const ly = BOTTOM - LEGEND_H;
  ops.push({ t: 'rect', x: M, y: ly, w: W - 2 * M, h: LEGEND_H, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.6 });
  const cw = (W - 2 * M) / pic.palette.length;
  // one size for every colour name, the largest that fits the narrowest place
  const nameSize = Math.min(...pic.palette.map((key) => fitSize(COLOUR_NAMES[key], 4.2, cw - 21)));
  pic.palette.forEach((key, i) => {
    const x = M + i * cw;
    const cy = ly + LEGEND_H / 2;
    const name = COLOUR_NAMES[key];
    const block = 5 + 1.5 + 10 + 2 + textWidthMm(name, nameSize);
    const bx = x + (cw - block) / 2;
    ops.push({ t: 'text', x: bx + 2.5, y: cy + 2, text: String(i + 1), size: 5.6, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'rect', x: bx + 6.5, y: cy - 4.5, w: 10, h: 9, rx: 2, fill: COLOUR_FILLS[key], stroke: INK, strokeWidth: 0.4 });
    ops.push({ t: 'text', x: bx + 18.5, y: cy + nameSize * 0.36, text: name, size: nameSize, fill: INK, weight: 'bold' });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/** The answers: which parts get which colour (and the results of the exercises). */
function colourKey(n: number, sums: boolean, variant: number): string[] {
  const pic = colourPicture(n, variant);
  const texts = sums ? colourSums(n, variant) : [];
  return pic.palette.map((key, i) => {
    const code = i + 1;
    const names = [...new Set(pic.regions.filter((r) => r.code === code).map((r) => r.name))];
    const exercises = [...new Set(pic.regions.map((r, k) => (r.code === code ? texts[k] : '')).filter(Boolean))];
    return `${code} – ${COLOUR_NAMES[key]}: ${names.join(', ')}${sums ? ` (${exercises.join(', ')})` : ''}`;
  });
}

// ───────────────────────── „Labirint” ─────────────────────────

export interface Maze {
  size: number;
  /** For each cell [row][col]: 1 = open to the right, 2 = open downwards. */
  open: number[][];
  /** The only way from the entrance (top left) to the exit (bottom right), cell by cell. */
  path: { r: number; c: number }[];
}

/** The cells reachable from a cell, through the open walls. */
export function mazeNeighbours(m: Maze, r: number, c: number): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  if (c + 1 < m.size && m.open[r][c] & 1) out.push({ r, c: c + 1 });
  if (r + 1 < m.size && m.open[r][c] & 2) out.push({ r: r + 1, c });
  if (c > 0 && m.open[r][c - 1] & 1) out.push({ r, c: c - 1 });
  if (r > 0 && m.open[r - 1][c] & 2) out.push({ r: r - 1, c });
  return out;
}

function solve(m: Maze): { r: number; c: number }[] {
  const N = m.size;
  const prev = new Map<number, number>();
  const queue = [0];
  prev.set(0, -1);
  while (queue.length) {
    const cur = queue.shift()!;
    const r = Math.floor(cur / N);
    const c = cur % N;
    for (const nb of mazeNeighbours(m, r, c)) {
      const k = nb.r * N + nb.c;
      if (prev.has(k)) continue;
      prev.set(k, cur);
      queue.push(k);
    }
  }
  const path: { r: number; c: number }[] = [];
  for (let k = N * N - 1; k !== -1; k = prev.get(k) ?? -1) path.unshift({ r: Math.floor(k / N), c: k % N });
  return path;
}

const mazeCache = new Map<string, Maze>();

/**
 * The maze of a set: carved by a seeded depth-first walk, so every cell is reached by exactly one
 * way (a tree): there is one path only. The seed is tried again until the path is long enough to be
 * a maze, not a corridor (at least 1.6 times the shortest possible walk).
 */
export function mazeOf(n: number, variant = currentVariant()): Maze {
  const key = `${n}:${variant}`;
  const hit = mazeCache.get(key);
  if (hit) return hit;
  const N = MAZE_SETS[n - 1].size;
  for (let attempt = 0; ; attempt++) {
    const rand = rng(seedOf(`${vkey(`maze:${n}`, variant)}:${attempt}`));
    const open = Array.from({ length: N }, () => Array.from({ length: N }, () => 0));
    const seen = new Set<number>([0]);
    const stack = [0];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const r = Math.floor(cur / N);
      const c = cur % N;
      const next = shuffle([[0, 1], [1, 0], [0, -1], [-1, 0]], rand)
        .map(([dr, dc]) => ({ r: r + dr, c: c + dc }))
        .filter((p) => p.r >= 0 && p.c >= 0 && p.r < N && p.c < N && !seen.has(p.r * N + p.c));
      if (!next.length) {
        stack.pop();
        continue;
      }
      const p = next[0];
      if (p.r === r) open[r][Math.min(c, p.c)] |= 1;
      else open[Math.min(r, p.r)][c] |= 2;
      seen.add(p.r * N + p.c);
      stack.push(p.r * N + p.c);
    }
    const maze = { size: N, open, path: [] as { r: number; c: number }[] };
    maze.path = solve(maze);
    if (maze.path.length >= 1.6 * (2 * N - 1) || attempt > 200) {
      if (mazeCache.size > 60) mazeCache.clear();
      mazeCache.set(key, maze);
      return maze;
    }
  }
}

/** The walls of a maze drawn in the square (x, y, side), as one path; the entrance and the exit open. */
function mazeWalls(m: Maze, x: number, y: number, side: number, pen: number): DrawOp {
  const N = m.size;
  const c = side / N;
  const segs: { a: Pt; b: Pt }[] = [];
  const P = (i: number, j: number) => ({ x: x + i * c, y: y + j * c });
  for (let r = 0; r < N; r++) {
    for (let k = 0; k < N; k++) {
      if (r === 0 && k > 0) segs.push({ a: P(k, 0), b: P(k + 1, 0) });
      if (k === 0) segs.push({ a: P(0, r), b: P(0, r + 1) });
      if (!(m.open[r][k] & 1)) segs.push({ a: P(k + 1, r), b: P(k + 1, r + 1) });
      if (!(m.open[r][k] & 2) && !(r === N - 1 && k === N - 1)) segs.push({ a: P(k, r + 1), b: P(k + 1, r + 1) });
    }
  }
  return { t: 'path', subpaths: segs.map((s) => ({ start: s.a, segs: [{ kind: 'L' as const, p: s.b }] })), stroke: INK, strokeWidth: pen, cap: 'round' };
}

function arrowDown(cx: number, y: number, s: number): DrawOp {
  return { t: 'polygon', points: [{ x: cx - s, y }, { x: cx + s, y }, { x: cx, y: y + s * 1.2 }], fill: ACCENT };
}

const MAZE_PIC = 24;

export interface MazeLayout { maze: Maze; x: number; y: number; side: number; from: Pt; to: Pt }

export function mazeLayout(n: number, top: number, variant = currentVariant()): MazeLayout {
  const maze = mazeOf(n, variant);
  const side = Math.min(W - 2 * M - 10, BOTTOM - top - 2 * (MAZE_PIC + 6));
  const x = (W - side) / 2;
  const y = top + MAZE_PIC + 6;
  const c = side / maze.size;
  return { maze, x, y, side, from: { x: x + c / 2, y: top + MAZE_PIC / 2 + 1 }, to: { x: x + side - c / 2, y: y + side + 5 + MAZE_PIC / 2 } };
}

const MAZE_PEN: Record<number, number> = { 6: 1.5, 9: 1.25, 12: 1.05 };

function mazePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = MAZE_SETS[n - 1];
  const top = frame(ops, config, `${FUN_KIND_TITLES.maze}: ${funShortLabel(`maze:${n}`)}`, set.sentence, 'Pornește de la săgeata de sus și ajungi la săgeata de jos, fără să treci prin pereți.');
  const lay = mazeLayout(n, top + 1);
  const c = lay.side / lay.maze.size;
  ops.push(mazeWalls(lay.maze, lay.x, lay.y, lay.side, MAZE_PEN[lay.maze.size] ?? 1.2));
  ops.push(...iconOps(set.from, lay.from.x, lay.from.y, MAZE_PIC));
  ops.push(arrowDown(lay.x + c / 2, lay.y - 4.5, 2));
  ops.push(...iconOps(set.to, lay.to.x, lay.to.y, MAZE_PIC));
  ops.push(arrowDown(lay.x + lay.side - c / 2, lay.y + lay.side + 0.8, 2));
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/** A drawing under the answers: its title, then the drawing, in a column `KEY_COL` mm wide starting at x. */
interface KeyDrawing { height: number; draw: (ops: DrawOp[], x: number, top: number) => void }
const KEY_COL = (W - 2 * M) / 2;

/** The maze drawn small with its path, for the answers page. */
function mazeKeyDrawing(n: number, variant: number): KeyDrawing {
  const set = MAZE_SETS[n - 1];
  const side = 56;
  return {
    height: side + 15,
    draw: (ops, x0, top) => {
      ops.push({ t: 'text', x: x0, y: top + 2, text: `${FUN_KIND_TITLES.maze}: ${funShortLabel(`maze:${n}`)}`, size: 4, fill: INK, weight: 'bold' });
      const m = mazeOf(n, variant);
      const x = x0 + 12;
      const y = top + 8;
      const c = side / m.size;
      ops.push(mazeWalls(m, x, y, side, 0.5));
      const pts = m.path.map((p) => ({ x: x + (p.c + 0.5) * c, y: y + (p.r + 0.5) * c }));
      const start = { x: pts[0].x, y: y - 2 };
      const end = { x: pts[pts.length - 1].x, y: y + side + 2 };
      ops.push({ t: 'path', subpaths: [{ start, segs: [...pts, end].map((p) => ({ kind: 'L' as const, p })) }], stroke: ACCENT, strokeWidth: Math.min(1.2, c * 0.35), cap: 'round' });
      ops.push(...iconOps(set.from, x - 6.5, y + 3, 8));
      ops.push(...iconOps(set.to, x + side + 6.5, y + side - 3, 8));
    },
  };
}

// ───────────────────────── „Găsește diferențele” ─────────────────────────

/** Scene box, in scene units (a scene is 100 × 56). */
export const SCENE_W = 100;
export const SCENE_H = 56;

const SCENE_BANDS: Record<Scene['ground'], number[]> = { meadow: [0, 34, SCENE_H], snow: [0, 34, SCENE_H], sea: [0, 20, 41, SCENE_H] };
const DIFF_KINDS: SceneDiff['t'][] = ['missing', 'changed', 'moved'];
const sceneCache = new Map<string, Scene>();

/**
 * The scene of a set. The first variant has the differences written with the scene; every other one
 * draws as many, in the same scene, under the same rules: each kind at least once (a picture missing,
 * another picture in its place, a picture moved), every changed picture big enough to see, a move of
 * one to two picture sizes that stays in the frame and in its part of the scene (the sky, the ground,
 * the water), and no picture on top of another in either image.
 */
export function sceneOf(n: number, variant = currentVariant()): Scene {
  const base = SCENES[n - 1];
  if (variant === 1) return base;
  const key = `${n}:${variant}`;
  const hit = sceneCache.get(key);
  if (hit) return hit;
  const swaps = SCENE_SWAPS[n - 1] ?? {};
  const count = base.diffs.length;
  const bands = SCENE_BANDS[base.ground];
  const band = (y: number) => bands.findIndex((b, i) => i + 1 < bands.length && y >= b && y < bands[i + 1]);
  const box = (o: { x: number; y: number; s: number }) => ({ x0: o.x - o.s / 2, x1: o.x + o.s / 2, y0: o.y - o.s / 2, y1: o.y + o.s / 2 });
  const overlap = (p: { x: number; y: number; s: number }, q: { x: number; y: number; s: number }) => {
    const a = box(p);
    const b = box(q);
    return (Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))) / Math.min(p.s, q.s) ** 2;
  };
  const named = (name: string) => name.charAt(0).toLocaleUpperCase('ro') + name.slice(1);
  let scene = base;
  for (let attempt = 0; attempt < 400; attempt++) {
    const rand = rng(seedOf(`${vkey(`diff:${n}`, variant)}:${attempt}`));
    const picked = shuffle(base.objects.map((_, i) => i).filter((i) => base.objects[i].s >= 8), rand).slice(0, count);
    // each kind once, then any kind
    const kinds = shuffle([...DIFF_KINDS, ...Array.from({ length: count - DIFF_KINDS.length }, () => DIFF_KINDS[Math.floor(rand() * DIFF_KINDS.length)])], rand);
    // where every picture is in the second image, as far as it is decided (a moved one: both places stay free)
    const taken: { k: number; x: number; y: number; s: number }[] = base.objects.map((ob, k) => ({ k, x: ob.x, y: ob.y, s: ob.s }));
    const used = new Set<string>();
    const diffs: SceneDiff[] = [];
    for (const [j, i] of picked.entries()) {
      const ob = base.objects[i];
      const kind = kinds[j];
      if (kind === 'missing') diffs.push({ t: 'missing', i, desc: `Lipsește ${ob.name}.` });
      else if (kind === 'changed') {
        const options = (swaps[i] ?? []).filter(([e]) => !used.has(e));
        if (!options.length) break;
        const [e, desc] = options[Math.floor(rand() * options.length)];
        used.add(e);
        diffs.push({ t: 'changed', i, e, desc });
      } else {
        // left or right for everything; up or down only for what stays whole in its part of the scene
        const whole = (y: number) => band(y - ob.s / 2) === band(y + ob.s / 2 - 0.01);
        const moves = shuffle(
          [
            { dx: -1, dy: 0, where: 'spre stânga' }, { dx: 1, dy: 0, where: 'spre dreapta' },
            ...(whole(ob.y) ? [{ dx: 0, dy: -1, where: 'mai sus' }, { dx: 0, dy: 1, where: 'mai jos' }] : []),
          ],
          rand,
        );
        const far = shuffle([1.1, 1.3, 1.5, 1.7, 1.9], rand);
        let moved: SceneDiff | null = null;
        for (const m of moves) {
          for (const f of far) {
            const to = { k: i, x: Math.round(ob.x + m.dx * f * ob.s), y: Math.round(ob.y + m.dy * f * ob.s), s: ob.s };
            const dist = Math.hypot(to.x - ob.x, to.y - ob.y) / ob.s;
            if (dist < 1 || dist > 2) continue;
            const b = box(to);
            if (b.x0 < 1 || b.x1 > SCENE_W - 1 || b.y0 < 1 || b.y1 > SCENE_H - 1) continue;
            if (m.dy && (!whole(to.y) || band(to.y) !== band(ob.y))) continue;
            if (taken.some((t) => t.k !== i && overlap(t, to) > 0.04)) continue;
            moved = { t: 'moved', i, x: to.x, y: to.y, desc: `${named(ob.name)} s-a mutat ${m.where}.` };
            taken.push(to);
            break;
          }
          if (moved) break;
        }
        if (!moved) break;
        diffs.push(moved);
      }
    }
    if (diffs.length !== count) continue;
    scene = { ...base, diffs };
    break;
  }
  if (sceneCache.size > 60) sceneCache.clear();
  sceneCache.set(key, scene);
  return scene;
}

/** The pictures of the scene, in the first (`a`) or the second picture (`b`), with their index in the scene. */
export function sceneObjects(scene: Scene, which: 'a' | 'b'): (SceneObject & { k: number })[] {
  const objs = scene.objects.map((ob, k) => ({ ...ob, k }));
  if (which === 'a') return objs;
  const out: (SceneObject & { k: number })[] = [];
  for (const ob of objs) {
    const d = scene.diffs.find((x) => x.i === ob.k);
    if (!d) out.push(ob);
    else if (d.t === 'changed') out.push({ ...ob, e: d.e });
    else if (d.t === 'moved') out.push({ ...ob, x: d.x, y: d.y });
  }
  return out;
}

/** Where each difference is in the second picture (scene units): the picture's place, or both places of a move. */
export function diffSpots(scene: Scene): { x: number; y: number; r: number }[] {
  return scene.diffs.map((d) => {
    const ob = scene.objects[d.i];
    if (d.t !== 'moved') return { x: ob.x, y: ob.y, r: ob.s * 0.62 };
    return { x: (ob.x + d.x) / 2, y: (ob.y + d.y) / 2, r: Math.hypot(ob.x - d.x, ob.y - d.y) / 2 + ob.s * 0.62 };
  });
}

function groundOps(scene: Scene, x: number, y: number, s: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const wave = (top: number, amp: number, period: number, fill: string, bottom = SCENE_H): DrawOp => {
    const pts: Pt[] = [];
    for (let u = 0; u <= SCENE_W; u += 2) pts.push({ x: x + u * s, y: y + (top + amp * Math.sin((u / period) * Math.PI * 2)) * s });
    return { t: 'polygon', points: [...pts, { x: x + SCENE_W * s, y: y + bottom * s }, { x, y: y + bottom * s }], fill };
  };
  const sky = scene.ground === 'snow' ? '#E8EEF7' : '#E3F2FD';
  ops.push({ t: 'rect', x, y, w: SCENE_W * s, h: SCENE_H * s, fill: sky });
  if (scene.ground === 'meadow') ops.push(wave(36, 1.2, 40, '#DCEFC8'));
  else if (scene.ground === 'sea') {
    ops.push(wave(20, 0.8, 18, '#BDE3F6', 42));
    ops.push(wave(40, 1, 50, '#F6E7B8'));
  } else ops.push(wave(36, 1.5, 45, '#FFFFFF'));
  return ops;
}

function sceneOps(scene: Scene, which: 'a' | 'b', x: number, y: number, s: number): DrawOp[] {
  const ops = groundOps(scene, x, y, s);
  for (const ob of sceneObjects(scene, which)) ops.push(...iconOps(ob.e, x + ob.x * s, y + ob.y * s, ob.s * s));
  ops.push({ t: 'rect', x, y, w: SCENE_W * s, h: SCENE_H * s, stroke: INK, strokeWidth: 0.6 });
  return ops;
}

export interface DiffLayout { scene: Scene; scale: number; x: number; ya: number; yb: number; countY: number }

export function diffLayout(n: number, top: number, variant = currentVariant()): DiffLayout {
  const scene = sceneOf(n, variant);
  const countH = 14;
  const gap = 6;
  const scale = Math.min((W - 2 * M - 10) / SCENE_W, (BOTTOM - top - countH - gap - 2) / (2 * SCENE_H));
  const x = (W - SCENE_W * scale) / 2;
  const ya = top + 1;
  const yb = ya + SCENE_H * scale + gap;
  return { scene, scale, x, ya, yb, countY: yb + SCENE_H * scale + 4 };
}

function diffPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const scene = sceneOf(n);
  const k = scene.diffs.length;
  const top = frame(ops, config, `${FUN_KIND_TITLES.diff}: ${scene.title}`, `Găsește ${k} diferențe între cele două imagini.`, 'Încercuiește fiecare diferență în imaginea de jos, apoi colorează câte un cerc.');
  const lay = diffLayout(n, top + 1);
  ops.push(...sceneOps(scene, 'a', lay.x, lay.ya, lay.scale));
  ops.push(...sceneOps(scene, 'b', lay.x, lay.yb, lay.scale));
  // one circle to colour for each difference found
  const label = 'Am găsit:';
  const cy = lay.countY + 5;
  const r = 4;
  const rowW = textWidthMm(label, 4.2) + 4 + k * (2 * r + 4);
  let cx = (W - rowW) / 2;
  ops.push({ t: 'text', x: cx, y: cy + 1.5, text: label, size: 4.2, fill: INK, weight: 'bold' });
  cx += textWidthMm(label, 4.2) + 4 + r;
  for (let i = 0; i < k; i++) ops.push({ t: 'circle', cx: cx + i * (2 * r + 4), cy, r, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/** The second picture drawn small with the differences circled, for the answers page. */
function diffKeyDrawing(n: number, variant: number): KeyDrawing {
  const scene = sceneOf(n, variant);
  const s = (KEY_COL - 6) / SCENE_W;
  return {
    height: SCENE_H * s + 12,
    draw: (ops, x0, top) => {
      ops.push({ t: 'text', x: x0, y: top + 2, text: `${FUN_KIND_TITLES.diff}: ${scene.title}`, size: 4, fill: INK, weight: 'bold' });
      const x = x0;
      const y = top + 6;
      ops.push(...sceneOps(scene, 'b', x, y, s));
      diffSpots(scene).forEach((d, i) => {
        ops.push({ t: 'circle', cx: x + d.x * s, cy: y + d.y * s, r: d.r * s, stroke: '#DC2626', strokeWidth: 0.7 });
        ops.push({ t: 'text', x: x + (d.x + d.r * 0.75) * s, y: y + (d.y - d.r * 0.75) * s, text: String(i + 1), size: 3, fill: '#DC2626', weight: 'bold', align: 'center' });
      });
    },
  };
}

// ───────────────────────── „Urmărește linia” ─────────────────────────

const TRACE_ROWS = 5;
const TRACE_PIC = 22;
/** Height of the band the line moves in, mm (a pattern is 100 glyph units high). */
const TRACE_BAND = 16;

export interface TraceRow { from: string; to: string; pattern: TracePattern; cy: number; x0: number; x1: number }

/**
 * The pairs and the line of each row. The first variant: the set as written. The others: five pairs of
 * the set's pool, no picture twice on the page, and the lines of the set in another order (every line
 * of the set at least once).
 */
export function traceSet(n: number, variant = currentVariant()): { pairs: [string, string][]; patterns: TracePattern[] } {
  const set = TRACE_SETS[n - 1];
  if (variant === 1) return { pairs: set.pairs.slice(0, TRACE_ROWS), patterns: Array.from({ length: TRACE_ROWS }, (_, i) => set.patterns[i % set.patterns.length]) };
  const rand = rng(seedOf(vkey(`trace:${n}`, variant)));
  let pairs: [string, string][] = [];
  for (let tries = 0; tries < 50 && pairs.length < TRACE_ROWS; tries++) {
    pairs = [];
    for (const p of shuffle(n === 6 ? TRACE_WINTER_PAIRS : TRACE_PAIRS, rand)) {
      if (pairs.length < TRACE_ROWS && !pairs.some((q) => q.includes(p[0]) || q.includes(p[1]))) pairs.push(p);
    }
  }
  if (pairs.length < TRACE_ROWS) pairs = set.pairs.slice(0, TRACE_ROWS);
  const patterns = shuffle(Array.from({ length: TRACE_ROWS }, (_, i) => set.patterns[i % set.patterns.length]), rand);
  return { pairs, patterns };
}

export function traceRows(n: number, top: number, variant = currentVariant()): TraceRow[] {
  const set = traceSet(n, variant);
  const rowH = (BOTTOM - top) / TRACE_ROWS;
  return set.pairs.map(([from, to], i) => ({
    from, to, pattern: set.patterns[i],
    cy: top + (i + 0.5) * rowH,
    x0: M + TRACE_PIC + 9,
    x1: W - M - TRACE_PIC - 9,
  }));
}

/** One period of each line, in glyph units (the band is 100 units high). Wider than the pre-writing rows. */
const TRACE_PERIOD: Record<TracePattern, number> = { horizontal: 100, waves: 150, zigzag: 110, cups: 110, castle: 110, loops: 85 };

const f2 = (v: number) => String(Math.round(v * 100) / 100);

/**
 * The line of a row as a glyph (stroke DSL, as the pre-writing patterns in patterns.ts), `periods`
 * periods long: drawn by renderGlyph's dashed style, so the dashes are fitted to every piece and the
 * corners of the zigzag and the castle are always drawn.
 */
export function traceGlyph(pattern: TracePattern, periods: number): Glyph {
  const L = TRACE_PERIOD[pattern];
  const n = Math.max(1, periods);
  let d = '';
  switch (pattern) {
    case 'horizontal':
      d = `M 0 50 L ${f2(n * L)} 50`;
      break;
    case 'waves':
      // up over the top, down under the bottom: a smooth wave
      for (let i = 0; i < n; i++) d += ` A ${f2(i * L + L / 4)} 50 ${f2(L / 4)} 40 180 360 A ${f2(i * L + (3 * L) / 4)} 50 ${f2(L / 4)} 40 180 0`;
      break;
    case 'zigzag':
      d = 'M 0 85';
      for (let i = 0; i < n; i++) d += ` L ${f2(i * L + L / 2)} 15 L ${f2((i + 1) * L)} 85`;
      break;
    case 'cups':
      for (let i = 0; i < n; i++) d += ` A ${f2(i * L + L / 2)} 15 ${f2(L / 2)} 70 180 0`;
      break;
    case 'castle':
      d = 'M 0 85';
      for (let i = 0; i < n; i++) d += ` L ${f2(i * L)} 15 L ${f2(i * L + L / 2)} 15 L ${f2(i * L + L / 2)} 85 L ${f2((i + 1) * L)} 85`;
      break;
    case 'loops': {
      // a prolate cycloid: the pen moves right while it loops (as the „bucle” of patterns.ts)
      const R = 32;
      const steps = 36;
      const pts: string[] = [];
      for (let k = 0; k <= n * steps; k++) {
        const t = (k / steps) * Math.PI * 2;
        pts.push(`${k ? 'L' : 'M'} ${f2((t / (Math.PI * 2)) * L - R * Math.sin(t) + R)} ${f2(58 - R * Math.cos(t))}`);
      }
      d = pts.join(' ');
      break;
    }
  }
  const width = pattern === 'loops' ? n * L + 2 * 32 : n * L;
  return buildGlyph(`trace:${pattern}:${n}`, { strokes: [d.trim()], width, arrows: [null] });
}

/** How many periods of the line fit between the two pictures of a row. */
export function tracePeriods(row: TraceRow): number {
  const room = (row.x1 - row.x0) / (TRACE_BAND / 100);
  const L = TRACE_PERIOD[row.pattern];
  if (row.pattern === 'horizontal') return Math.floor(room / L);
  return Math.max(1, Math.floor((room - (row.pattern === 'loops' ? 64 : 0)) / L));
}

/** The dashed line of a row, in mm, centred between the pictures. */
function traceLine(row: TraceRow): DrawOp[] {
  const s = TRACE_BAND / 100;
  const glyph = row.pattern === 'horizontal' ? straightGlyph((row.x1 - row.x0) / s) : traceGlyph(row.pattern, tracePeriods(row));
  const width = glyph.width * s;
  const ops = renderGlyph(glyph, { ...DEFAULT_GLYPH_STYLE, color: '#7F93AE', strokeWidth: 0.95 / s, variant: 'dashed', startDots: false, arrows: false, startRings: true, paper: PAPER });
  return [{ t: 'group', tx: row.x0 + (row.x1 - row.x0 - width) / 2, ty: row.cy - 50 * s, scale: s, ops }];
}

/** A straight line across the whole row. */
function straightGlyph(room: number): Glyph {
  const def: GlyphDef = { strokes: [`M 0 50 L ${Math.round(room)} 50`], width: Math.round(room), arrows: [null] };
  return buildGlyph(`trace:line:${def.width}`, def);
}

function tracePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, `${FUN_KIND_TITLES.trace}: ${TRACE_SETS[n - 1].short}`, 'Urmărește cu creionul linia punctată, fără să ridici creionul.', 'Pornește de la imaginea din stânga și ajungi la cea din dreapta.');
  for (const row of traceRows(n, top + 1)) {
    for (const [e, cx] of [[row.from, M + TRACE_PIC / 2 + 2], [row.to, W - M - TRACE_PIC / 2 - 2]] as [string, number][]) {
      ops.push({ t: 'rect', x: cx - TRACE_PIC / 2 - 2, y: row.cy - TRACE_PIC / 2 - 2, w: TRACE_PIC + 4, h: TRACE_PIC + 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(e, cx, row.cy, TRACE_PIC));
    }
    ops.push(...traceLine(row));
  }
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Găsește umbra” ─────────────────────────

export interface ShadowLayout {
  /** Left: the pictures in the set's order; right: the shadows, `order[i]` = the picture of the shadow in row i. */
  order: number[];
  rowH: number;
  top: number;
  size: number;
  leftX: number;
  rightX: number;
}

/**
 * The six pictures of a set. The first variant: the set as written. The others: six of the set's kind
 * (its own six and the pool's), never two whose shadows resemble each other.
 */
export function shadowSet(n: number, variant = currentVariant()): ShadowSet {
  const set = SHADOW_SETS[n - 1];
  if (variant === 1) return set;
  const pool = SHADOW_POOLS[n - 1];
  const rand = rng(seedOf(vkey(`shadow-set:${n}`, variant)));
  const rows = set.pictures.length;
  const pictures: [string, string][] = [];
  for (const p of shuffle([...set.pictures, ...(pool?.more ?? [])], rand)) {
    if (pictures.length >= rows || pictures.some((q) => q[0] === p[0])) continue;
    if ((pool?.alike ?? []).some((group) => group.includes(p[0]) && pictures.some((q) => group.includes(q[0])))) continue;
    pictures.push(p);
  }
  return pictures.length === rows ? { ...set, pictures } : set;
}

export function shadowLayout(n: number, top: number, variant = currentVariant()): ShadowLayout {
  const rows = shadowSet(n, variant).pictures.length;
  const rowH = (BOTTOM - top) / rows;
  const size = Math.min(26, rowH - 7);
  return { order: derangement(rows, rng(seedOf(vkey(`shadow:${n}`, variant)))), rowH, top, size, leftX: M + 22, rightX: W - M - 22 };
}

const SHADOW_FILL = '#3A4150';

function shadowPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = shadowSet(n);
  const top = frame(ops, config, `${FUN_KIND_TITLES.shadow}: ${set.title}`, 'Unește fiecare imagine cu umbra ei.', 'Trage o linie de la punctul imaginii la punctul umbrei. Prima linie este exemplul.');
  const lay = shadowLayout(n, top + 2);
  const cy = (i: number) => lay.top + (i + 0.5) * lay.rowH;
  const box = (cx: number, y: number) => ops.push({ t: 'rect', x: cx - lay.size / 2 - 3, y: y - lay.size / 2 - 2, w: lay.size + 6, h: lay.size + 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
  const dotL = (i: number) => ({ x: lay.leftX + lay.size / 2 + 8, y: cy(i) });
  const dotR = (i: number) => ({ x: lay.rightX - lay.size / 2 - 8, y: cy(i) });
  set.pictures.forEach(([e], i) => {
    box(lay.leftX, cy(i));
    ops.push(...iconOps(e, lay.leftX, cy(i), lay.size));
    ops.push({ t: 'circle', cx: dotL(i).x, cy: dotL(i).y, r: 1.4, fill: INK });
  });
  lay.order.forEach((p, i) => {
    box(lay.rightX, cy(i));
    ops.push(...(silhouetteOps(set.pictures[p][0], lay.rightX, cy(i), lay.size, SHADOW_FILL) ?? []));
    ops.push({ t: 'circle', cx: dotR(i).x, cy: dotR(i).y, r: 1.4, fill: INK });
  });
  const a = dotL(0);
  const b = dotR(lay.order.indexOf(0));
  ops.push(exampleLine(a.x, a.y, b.x, b.y));
  exampleTag(ops, a.x + 3, a.y - 2.5);
  adultNote(ops, `Imaginile, de sus în jos: ${set.pictures.map((p) => p[1]).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── answers and entry point ─────────────────────────

/** The answers of a fun item, or null when it has nothing to check (the lines to trace). */
export function funKeySection(item: string, variant = currentVariant()): KeySection | null {
  if (!isFunItem(item)) return null;
  const [kind, arg] = item.split(':') as [FunKind, string];
  const n = Number(arg);
  const title = funLabel(item);
  switch (kind) {
    case 'color':
    case 'colsum':
      return { title, entries: colourKey(n, kind === 'colsum', variant), perLine: 1 };
    case 'maze':
      return { title, entries: ['Drumul corect este desenat la sfârșitul paginii de răspunsuri.'], perLine: 1 };
    case 'diff':
      return { title, entries: sceneOf(n, variant).diffs.map((d) => d.desc), perLine: 2, numbered: true };
    case 'shadow': {
      const set = shadowSet(n, variant);
      const { order } = shadowLayout(n, 0, variant);
      return { title, entries: ['Imaginile și umbrele, numărate de sus în jos:', ...set.pictures.map(([, name], i) => `${i + 1}. ${name} – umbra ${order.indexOf(i) + 1}`)], perLine: 1 };
    }
    default:
      return null;
  }
}

/** The drawings under the answers: the mazes with their path, the scenes with the differences circled, two by two. */
export function funKeyExtras(items: string[], variant = currentVariant()): KeyExtra[] {
  const drawings = items.filter(isFunItem).flatMap((item) => {
    const [kind, arg] = item.split(':');
    if (kind === 'maze') return [mazeKeyDrawing(Number(arg), variant)];
    if (kind === 'diff') return [diffKeyDrawing(Number(arg), variant)];
    return [];
  });
  const extras: KeyExtra[] = [];
  for (let i = 0; i < drawings.length; i += 2) {
    const pair = drawings.slice(i, i + 2);
    extras.push({ height: Math.max(...pair.map((d) => d.height)) + 4, draw: (ops, top) => pair.forEach((d, k) => d.draw(ops, M + k * KEY_COL, top)) });
  }
  return extras;
}

/** The page of one fun item, or null when the item is not one. */
export function buildFunPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isFunItem(item)) return null;
  const [kind, arg] = item.split(':') as [FunKind, string];
  const n = Number(arg);
  if (kind === 'color' || kind === 'colsum') return colourPage(config, n, kind === 'colsum', tier);
  if (kind === 'maze') return mazePage(config, n, tier);
  if (kind === 'diff') return diffPage(config, n, tier);
  if (kind === 'trace') return tracePage(config, n, tier);
  return shadowPage(config, n, tier);
}

