import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { getGlyph, normalizeKey } from '@/lib/glyphs/data';
import { flattenSubpath, pointAlong, polylineLength } from '@/lib/glyphs/geometry';
import { iconOps, hasIcon } from '@/lib/hints/icons';
import { INK, ACCENT, PAPER, MUTED, itemOps, itemWidth, starPoints } from './rows';

/**
 * Full-page activities ("Jocuri"): find the letter, count and write, connect the dots.
 * Each selected item is one page. Items are strings so they live in WorksheetConfig
 * like everything else: "find:A", "count:5", "dots:star".
 *
 * Random layouts are seeded by the item itself, so the preview and the PDF are identical
 * and the same sheet comes out every time.
 */

export const DOT_SHAPES = ['star', 'heart', 'house', 'fish', 'boat', 'tree'] as const;
export type DotShape = (typeof DOT_SHAPES)[number];
export const DOT_SHAPE_LABELS: Record<DotShape, string> = { star: 'stea', heart: 'inimă', house: 'casă', fish: 'pește', boat: 'barcă', tree: 'brad' };
export const COUNT_RANGES = ['count:5', 'count:10'] as const;

export function isActivityItem(item: string): boolean {
  return /^(find:.+|count:(5|10)|dots:(star|heart|house|fish|boat|tree))$/.test(item);
}

export function activityLabel(item: string): string {
  const [kind, arg] = item.split(':');
  if (kind === 'find') return `Găsește ${arg}`;
  if (kind === 'count') return `Numără 1–${arg}`;
  if (kind === 'dots') return `Puncte: ${DOT_SHAPE_LABELS[arg as DotShape] ?? arg}`;
  return item;
}

// ───────────────────────── seeded randomness ─────────────────────────

function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────────────────────── page frame ─────────────────────────

const W = 210;
const H = 297;
const M = 12;

function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string): number {
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size: 6.5, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: M, y: M + 14.5, text: `Nume: ${config.childName?.trim() || '______________'}     Data: ____________`, size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: 'WorksheetWiz', size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: M, y: M + 28, text: instruction, size: 4.6, fill: INK, weight: 'bold' });
  return M + 34;
}

function reward(ops: DrawOp[], text: string): void {
  const by = H - M - 18;
  ops.push({ t: 'rect', x: M, y: by, w: W - 2 * M, h: 16, rx: 2.5, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 0.4 });
  ops.push({ t: 'text', x: M + 5, y: by + 6.5, text: 'Bravo!', size: 4.4, fill: '#92400E', weight: 'bold' });
  ops.push({ t: 'text', x: M + 5, y: by + 12, text, size: 3, fill: '#B45309' });
  for (let i = 0; i < 5; i++) {
    ops.push({ t: 'polygon', points: starPoints(W - M - 8 - i * 13, by + 8, 5), stroke: '#D97706', strokeWidth: 0.5, fill: PAPER });
  }
}

function footer(ops: DrawOp[], tier: Tier): void {
  if (tier === 'free') ops.push({ t: 'text', x: W - M, y: H - M + 2, text: 'Creat cu WorksheetWiz.com', size: 2.6, fill: '#94a3b8', align: 'right' });
}

// ───────────────────────── find the letter ─────────────────────────

const LOOKALIKES: Record<string, string[]> = {
  A: ['V', 'H', 'Ă', 'Â', 'R'], Ă: ['A', 'Â', 'Ș'], Â: ['A', 'Ă', 'Î'], B: ['P', 'R', 'D', 'E'], C: ['O', 'G', 'Q'], D: ['O', 'P', 'B'],
  E: ['F', 'L', 'B'], F: ['E', 'P', 'T'], G: ['C', 'O', 'Q'], H: ['N', 'A', 'K'], I: ['L', 'T', 'Î'], Î: ['I', 'T', 'Â'], J: ['I', 'L', 'U'],
  K: ['X', 'R', 'H'], L: ['I', 'E', 'T'], M: ['N', 'W', 'V'], N: ['M', 'H', 'Z'], O: ['Q', 'C', 'D'], P: ['R', 'B', 'F'], Q: ['O', 'G', 'C'],
  R: ['P', 'B', 'K'], S: ['Ș', 'Z', 'C'], Ș: ['S', 'Ț', 'Ă'], T: ['Ț', 'I', 'L'], Ț: ['T', 'Ș', 'Î'], U: ['V', 'J', 'O'], V: ['U', 'W', 'Y'],
  W: ['M', 'V', 'N'], X: ['K', 'Y', 'Z'], Y: ['V', 'X', 'T'], Z: ['N', 'S', 'X'],
};
const LOWER_LOOKALIKES: Record<string, string[]> = {
  b: ['d', 'p', 'h'], d: ['b', 'p', 'q'], p: ['q', 'b', 'd'], q: ['p', 'd', 'g'], n: ['m', 'u', 'h'], m: ['n', 'w'], u: ['n', 'v'],
  a: ['o', 'd', 'ă', 'â'], e: ['c', 'o'], i: ['l', 'j', 'î'], l: ['i', 't'], h: ['n', 'b'], g: ['q', 'y'], s: ['ș', 'z'], t: ['ț', 'f', 'l'],
};
const OTHERS = 'ABCDEFGHIJKLMNOPRSTUVZ'.split('');

function findPage(config: WorksheetConfig, target: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const lower = config.letterMode === 'lowercase';
  const t = lower ? target.toLowerCase() : target;
  const top = frame(ops, config, `Găsește litera ${t}`, `Colorează toate literele ${t}. Câte ai găsit?`);
  const rand = rng(seedOf(`find:${t}`));

  // the model, solid, with its numbered start dots
  const model = getGlyph(t);
  if (model) {
    const s = 0.22;
    ops.push({ t: 'group', tx: M + 4, ty: top + 4, scale: s, ops: itemOps([model], { color: INK, strokeWidth: 10, variant: 'solid', startDots: true, arrows: true, accent: ACCENT, dotText: PAPER, paper: PAPER, minDotRadius: 1.4 / s }) });
  }
  // "how many?" box
  ops.push({ t: 'text', x: W - M - 32, y: top + 16, text: 'Am găsit:', size: 4, fill: INK, weight: 'bold', align: 'right' });
  ops.push({ t: 'rect', x: W - M - 28, y: top + 6, w: 28, h: 16, rx: 2, stroke: INK, strokeWidth: 0.6, dash: [1.4, 1.2] });

  const cols = 6;
  const rows = 7;
  const cells = cols * rows;
  const targets = 12;
  const pool = lower
    ? LOWER_LOOKALIKES[t] ?? (LOOKALIKES[target] ?? []).map((x) => x.toLowerCase())
    : LOOKALIKES[target] ?? [];
  const others = OTHERS.filter((x) => x !== target).map((x) => (lower ? x.toLowerCase() : x));
  const letters: string[] = [];
  for (let i = 0; i < cells - targets; i++) {
    // two thirds look-alikes (the point of the exercise), the rest any other letter
    const fromPool = pool.length && rand() < 0.66;
    letters.push(fromPool ? pool[Math.floor(rand() * pool.length)] : others[Math.floor(rand() * others.length)]);
  }
  for (let i = 0; i < targets; i++) letters.push(t);
  const grid = shuffle(letters, rand);

  const gx = M;
  const gy = top + 30;
  const cw = (W - 2 * M) / cols;
  const ch = (H - M - 22 - gy) / rows;
  const s = Math.min(ch * 0.55, cw * 0.5) / 100;
  grid.forEach((ltr, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = gx + c * cw;
    const y = gy + r * ch;
    ops.push({ t: 'rect', x: x + 1.5, y: y + 1.5, w: cw - 3, h: ch - 3, rx: 3, stroke: '#E6DECD', strokeWidth: 0.4 });
    const g = getGlyph(ltr);
    if (!g) return;
    const w = itemWidth([g]) * s;
    ops.push({
      t: 'group',
      tx: x + (cw - w) / 2,
      ty: y + ch / 2 - (lower ? 75 : 50) * s,
      scale: s,
      ops: itemOps([g], { color: INK, strokeWidth: 10, variant: 'outline', startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
    });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── count and write ─────────────────────────

const COUNT_PICTURES = ['🍎', '🍐', '🎈', '🐱', '🐻', '🦋', '🐟', '🚗', '🌷', '🍓', '🐝', '⭐', '🥕', '🐶', '🦆', '☀️'];

function countPage(config: WorksheetConfig, max: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, `Numără și scrie (1–${max})`, 'Numără imaginile și scrie numărul în căsuță.');
  const rand = rng(seedOf(`count:${max}`));
  const pictures = shuffle(COUNT_PICTURES.filter(hasIcon), rand);
  const numbers = shuffle(Array.from({ length: max }, (_, i) => i + 1), rand).slice(0, 5);

  const rowsTop = top + 4;
  const rowH = (H - M - 22 - rowsTop) / numbers.length;
  const boxW = 26;
  const areaW = W - 2 * M - boxW - 10;
  numbers.forEach((n, r) => {
    const y = rowsTop + r * rowH;
    const pic = pictures[r % pictures.length];
    ops.push({ t: 'rect', x: M, y: y + 2, w: areaW, h: rowH - 4, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    const perLine = 5;
    const lines = Math.ceil(n / perLine);
    const size = Math.min(14, (rowH - 8) / lines - 2);
    const gap = Math.min(4, (areaW - 8 - perLine * size) / perLine);
    for (let i = 0; i < n; i++) {
      const line = Math.floor(i / perLine);
      const col = i % perLine;
      const cx = M + 6 + size / 2 + col * (size + gap) + (line % 2 ? (size + gap) / 2 : 0);
      const cy = y + rowH / 2 + (line - (lines - 1) / 2) * (size + 2);
      ops.push(...iconOps(pic, cx, cy, size));
    }
    // the box to write in, with writing guides
    const bx = W - M - boxW;
    const by = y + rowH / 2 - boxW / 2;
    ops.push({ t: 'rect', x: bx, y: by, w: boxW, h: boxW, rx: 3, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.6 });
    ops.push({ t: 'line', x1: bx + 3, y1: by + boxW * 0.5, x2: bx + boxW - 3, y2: by + boxW * 0.5, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
    ops.push({ t: 'polygon', points: [{ x: bx - 7, y: by + boxW / 2 - 2.5 }, { x: bx - 2.5, y: by + boxW / 2 }, { x: bx - 7, y: by + boxW / 2 + 2.5 }], fill: ACCENT });
  });
  reward(ops, 'Colorează o stea pentru fiecare rând numărat.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── connect the dots ─────────────────────────

/** Outlines in a 100 × 100 box, listed in drawing order. */
const OUTLINES: Partial<Record<DotShape, Pt[]>> = {
  house: [[10, 95], [10, 70], [10, 45], [30, 27], [50, 10], [70, 27], [90, 45], [90, 70], [90, 95], [62, 95], [62, 65], [38, 65], [38, 95]].map(([x, y]) => ({ x, y })),
  fish: [[5, 50], [20, 32], [45, 22], [70, 30], [85, 45], [100, 28], [100, 72], [85, 55], [70, 70], [45, 78], [20, 68]].map(([x, y]) => ({ x, y })),
  boat: [[50, 6], [65, 31], [80, 56], [96, 60], [80, 88], [50, 88], [20, 88], [4, 60], [20, 56], [35, 31]].map(([x, y]) => ({ x, y })),
  tree: [[50, 4], [72, 30], [60, 30], [82, 55], [64, 55], [88, 80], [56, 80], [56, 96], [44, 96], [44, 80], [12, 80], [36, 55], [18, 55], [40, 30], [28, 30]].map(([x, y]) => ({ x, y })),
};

export function dotPoints(shape: DotShape): Pt[] {
  const fixed = OUTLINES[shape];
  if (fixed) return fixed;
  const g = getGlyph(`shape:${shape}`);
  if (!g) return [];
  if (shape === 'star') {
    // the star's ten corners
    const pts = flattenSubpath(g.strokes[0].subpaths[0], 1);
    return pts.slice(0, -1);
  }
  // a curved outline: evenly spaced points along it
  const pts = g.strokes.flatMap((s) => s.subpaths.flatMap((sp) => flattenSubpath(sp, 24)));
  const n = 18;
  const total = polylineLength(pts);
  return total ? Array.from({ length: n }, (_, i) => pointAlong(pts, i / n).p) : [];
}

function dotsPage(config: WorksheetConfig, shape: DotShape, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const pts = dotPoints(shape);
  const top = frame(ops, config, `Unește punctele: ${DOT_SHAPE_LABELS[shape]}`, `Unește punctele de la 1 la ${pts.length}, apoi înapoi la 1. Ce a ieșit? Colorează!`);
  const size = Math.min(W - 2 * M - 20, H - M - 24 - top - 10);
  const ox = (W - size) / 2;
  const oy = top + 6;
  const s = size / 100;
  const cx = 50;
  const cy = 50;
  pts.forEach((p, i) => {
    const x = ox + p.x * s;
    const y = oy + p.y * s;
    ops.push({ t: 'circle', cx: x, cy: y, r: i === 0 ? 2 : 1.3, fill: i === 0 ? ACCENT : INK });
    // number placed outward from the centre so it never sits on the line
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    ops.push({ t: 'text', x: x + (dx / len) * 5, y: y + (dy / len) * 5 + 1.6, text: String(i + 1), size: 4.4, fill: i === 0 ? ACCENT : INK, weight: 'bold', align: 'center' });
  });
  reward(ops, 'Colorează o stea când ai terminat desenul.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── entry point ─────────────────────────

export function buildActivityPages(config: WorksheetConfig, tier: Tier, allowed: (item: string) => boolean): PageOps[] {
  const pages: PageOps[] = [];
  for (const item of config.selectedItems) {
    if (!isActivityItem(item) || !allowed(item)) continue;
    const [kind, arg] = item.split(':');
    if (kind === 'find' && getGlyph(normalizeKey(arg))) pages.push(findPage(config, normalizeKey(arg), tier));
    else if (kind === 'count') pages.push(countPage(config, Number(arg), tier));
    else if (kind === 'dots') pages.push(dotsPage(config, arg as DotShape, tier));
  }
  return pages;
}
