import type { DrawOp, PageOps, Pt, Subpath } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { INK, PAPER } from './rows';
import type { KeyExtra, KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, H, M, SOFT, W, adultNote, derangement, exampleLine, exampleRing, exampleTag, fitSize, footer, frame, rng, seedOf, shuffle } from './page-kit';
import {
  CLASS_RULES, COUNTED, CUT_SETS, EMOTIONS, EMOTION_FACES, ENGLISH_SETS, FACES, HABITS, HYGIENE_OBJECTS, JOB_TOOLS, JOB_USES, LINES_SETS, LINE_NAMES,
  MODEL_SETS, PIXEL_COLOURS, SCISSORS, SITUATIONS, YES_NO, SUBJECT_KINDS, SUBJECT_SETS, SYMMETRY_SETS, isSubjectItem, symmetryFull,
  type CutPiece, type LineKind, type SubjectKind,
} from './subjects';

/**
 * Sheets for Arte vizuale și abilități practice, Dezvoltare personală and Comunicare în limba modernă
 * (engleză): full pages in the „Jocuri” category (see activities.ts), seeded by the item:
 *
 * - "sym:1–3"     Simetrie — half a drawing on squares, the other half to colour as in a mirror;
 * - "model:1–3"   Desenează după model — a drawing on dots, the same dots empty underneath;
 * - "cut:1–2"     Decupează și lipește — the outline of a house / a robot, its pieces to cut out;
 * - "lines:1–2"   Linii și puncte — a scarf / a fir tree in stripes, each with a kind of line;
 * - "feel:1"      Emoțiile — circle the emotion of each face; "feel:2" Cum se simte? — situations;
 * - "me:1"        Despre mine — boxes to fill in, colour and draw;
 * - "hyg:1"       Obiectele de igienă — circle them among other objects;
 * - "habit:1"     Obiceiuri sănătoase — good or not good; "rules:1" Reguli în clasă — the same;
 * - "job:1"       Meserii și unelte; "jobuse:1" La ce folosesc meseriile? — join;
 * - "en:1–3"      Animals, Colours, Numbers — join the picture with the English word.
 *
 * The layouts are computed by exported functions, which the tests and the answers page read.
 */

export const SUBJECT_KIND_TITLES: Record<SubjectKind, string> = {
  sym: 'Simetrie',
  model: 'Desenează după model',
  cut: 'Decupează și lipește',
  lines: 'Linii și puncte',
  feel: 'Emoțiile',
  me: 'Despre mine',
  hyg: 'Obiectele de igienă',
  habit: 'Obiceiuri sănătoase',
  job: 'Meserii și unelte',
  jobuse: 'La ce folosesc meseriile?',
  rules: 'Reguli în clasă',
  en: 'Cuvinte în engleză',
};

const EN_TITLES = ['Animalele în engleză', 'Culorile în engleză', 'Numerele în engleză'];
const EN_SHORT = ['animals', 'colours', 'numbers'];

/** Every item, in picker order. */
export function subjectItems(): string[] {
  return SUBJECT_KINDS.flatMap((k) => Array.from({ length: SUBJECT_SETS[k] }, (_, i) => `${k}:${i + 1}`));
}

const parse = (item: string) => {
  const [kind, arg] = item.split(':') as [SubjectKind, string];
  return { kind, n: Number(arg) };
};

/** The title on the page (and in the answers). */
export function subjectTitle(item: string): string {
  const { kind, n } = parse(item);
  if (kind === 'sym') return `Simetrie: ${SYMMETRY_SETS[n - 1].name}`;
  if (kind === 'model') return `Desenează după model: ${MODEL_SETS[n - 1].name}`;
  if (kind === 'cut') return `Decupează și lipește: ${CUT_SETS[n - 1].name}`;
  if (kind === 'lines') return `Linii și puncte: ${LINES_SETS[n - 1].name}`;
  if (kind === 'feel') return n === 1 ? 'Emoțiile' : 'Cum se simte?';
  if (kind === 'en') return EN_TITLES[n - 1];
  return SUBJECT_KIND_TITLES[kind] ?? item;
}

/** The name of the item in the lists and on the answers page. */
export function subjectLabel(item: string): string {
  return subjectTitle(item);
}

/** The short name on the picker buttons. */
export function subjectShortLabel(item: string): string {
  const { kind, n } = parse(item);
  if (kind === 'sym') return SYMMETRY_SETS[n - 1].name;
  if (kind === 'model') return MODEL_SETS[n - 1].name;
  if (kind === 'cut') return CUT_SETS[n - 1].name;
  if (kind === 'lines') return LINES_SETS[n - 1].name;
  if (kind === 'feel') return n === 1 ? 'fețele' : 'cum se simte?';
  if (kind === 'en') return EN_SHORT[n - 1];
  return SUBJECT_KIND_TITLES[kind] ?? item;
}

const lower = (s: string) => s.toLocaleLowerCase('ro');

function line(p: Pt[]): Subpath {
  return { start: p[0], segs: p.slice(1).map((q) => ({ kind: 'L' as const, p: q })) };
}

// ───────────────────────── „Simetrie” ─────────────────────────

export interface GridLayout { x0: number; y0: number; cell: number; rows: number; cols: number }

/** The squares of a „Simetrie” sheet (`top`: the top of the activity area). */
export function symmetryLayout(n: number, top: number): GridLayout {
  const full = symmetryFull(SYMMETRY_SETS[n - 1]);
  const rows = full.length;
  const cols = full[0].length;
  const cell = Math.min(20, (W - 2 * M) / cols, (BOTTOM - 6 - top - 6) / rows);
  return { x0: (W - cols * cell) / 2, y0: top + 6, cell, rows, cols };
}

/** The squares, the colours of the left half (the right half too when `whole`), the axis. */
function symmetryOps(n: number, g: GridLayout, whole: boolean, axis = true): DrawOp[] {
  const ops: DrawOp[] = [];
  const full = symmetryFull(SYMMETRY_SETS[n - 1]);
  const half = g.cols / 2;
  full.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const colour = ch !== '.' && (whole || c < half) ? PIXEL_COLOURS[ch] : undefined;
      ops.push({ t: 'rect', x: g.x0 + c * g.cell, y: g.y0 + r * g.cell, w: g.cell, h: g.cell, fill: colour ?? PAPER, stroke: '#B8C2CF', strokeWidth: 0.35 });
    }),
  );
  ops.push({ t: 'rect', x: g.x0, y: g.y0, w: g.cols * g.cell, h: g.rows * g.cell, stroke: INK, strokeWidth: 0.6 });
  if (axis) {
    const x = g.x0 + half * g.cell;
    ops.push({ t: 'line', x1: x, y1: g.y0 - 4, x2: x, y2: g.y0 + g.rows * g.cell + 4, stroke: '#D9381E', strokeWidth: 0.9, dash: [2.4, 1.6] });
  }
  return ops;
}

function symmetryPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, subjectTitle(`sym:${n}`), 'Colorează în dreapta la fel ca în stânga, ca în oglindă.', 'Linia roșie punctată este axa de simetrie. Numără căsuțele de la axă, rând cu rând.');
  const g = symmetryLayout(n, top);
  ops.push(...symmetryOps(n, g, false));
  adultNote(ops, `Desenul complet: ${SYMMETRY_SETS[n - 1].name}. Fiecare căsuță colorată din stânga are pereche, la aceeași distanță de axă, în dreapta.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Desenează după model” ─────────────────────────

export interface DotGrid { x0: number; y0: number; step: number; dots: number }

/** The two dot grids: the model on top, the empty one underneath. */
export function modelLayout(n: number, top: number): { model: DotGrid; copy: DotGrid } {
  const { dots } = MODEL_SETS[n - 1];
  const label = 8;
  const step = Math.min(14, (BOTTOM - 6 - top - 2 * label - 14) / (2 * (dots - 1)), (W - 2 * M) / (dots - 1));
  const side = step * (dots - 1);
  const x0 = (W - side) / 2;
  const y1 = top + label;
  return { model: { x0, y0: y1, step, dots }, copy: { x0, y0: y1 + side + 14 + label, step, dots } };
}

function dotOps(g: DotGrid, start: [number, number]): DrawOp[] {
  const ops: DrawOp[] = [];
  for (let r = 0; r < g.dots; r++) for (let c = 0; c < g.dots; c++) ops.push({ t: 'circle', cx: g.x0 + c * g.step, cy: g.y0 + r * g.step, r: 0.9, fill: '#64748B' });
  ops.push({ t: 'circle', cx: g.x0 + start[0] * g.step, cy: g.y0 + start[1] * g.step, r: 2, fill: '#46A758' });
  return ops;
}

function modelPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = MODEL_SETS[n - 1];
  const top = frame(ops, config, subjectTitle(`model:${n}`), 'Unește punctele de jos la fel ca în modelul de sus.', 'Punctul verde arată de unde începi.');
  const { model, copy } = modelLayout(n, top);
  const start = set.lines[0][0];
  ops.push({ t: 'text', x: model.x0, y: model.y0 - 4, text: 'Modelul', size: 3.8, fill: '#334155', weight: 'bold' });
  for (const pl of set.lines) {
    ops.push({ t: 'path', subpaths: [line(pl.map(([c, r]) => ({ x: model.x0 + c * model.step, y: model.y0 + r * model.step })))], stroke: INK, strokeWidth: 1.1, cap: 'round' } as DrawOp);
  }
  ops.push(...dotOps(model, start));
  ops.push({ t: 'text', x: copy.x0, y: copy.y0 - 4, text: 'Desenează aici', size: 3.8, fill: '#334155', weight: 'bold' });
  ops.push(...dotOps(copy, start));
  adultNote(ops, `Desenul: ${set.name}. Copilul pornește de la punctul verde și numără punctele pe fiecare linie.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Decupează și lipește” ─────────────────────────

/** Base picture and pieces are 120 × 84 mm. */
export const CUT_BOX = { w: 120, h: 84 };
/** The dashed cut line runs this far around every piece. */
const CUT_GAP = 2;
const PIECE_GAP = 5;

export interface PiecePlace { piece: CutPiece; x: number; y: number }

function contained(inner: CutPiece, outer: CutPiece): boolean {
  const box = (p: CutPiece) => (p.shape === 'circle' ? { x0: p.x - p.w / 2, y0: p.y - p.h / 2, x1: p.x + p.w / 2, y1: p.y + p.h / 2 } : { x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h });
  const a = box(inner), b = box(outer);
  return inner !== outer && a.x0 >= b.x0 && a.y0 >= b.y0 && a.x1 <= b.x1 && a.y1 <= b.y1;
}

/** Where the base picture and each piece go (`top`: the top of the activity area). */
export function cutLayout(n: number, top: number): { bx: number; by: number; cutY: number; places: PiecePlace[] } {
  const set = CUT_SETS[n - 1];
  const bx = (W - CUT_BOX.w) / 2;
  const by = top + 4;
  const cutY = by + CUT_BOX.h + 9;
  // the pieces in a flowing row under the cut line, each with room for its dashed outline
  const places: PiecePlace[] = [];
  let x = M + CUT_GAP;
  let y = cutY + 9 + CUT_GAP;
  let rowH = 0;
  for (const p of set.pieces) {
    const w = p.w;
    if (x + w + CUT_GAP > W - M) {
      x = M + CUT_GAP;
      y += rowH + 2 * CUT_GAP + PIECE_GAP;
      rowH = 0;
    }
    places.push({ piece: p, x, y });
    x += w + 2 * CUT_GAP + PIECE_GAP;
    rowH = Math.max(rowH, p.h);
  }
  // centre the rows
  const rows = [...new Set(places.map((p) => p.y))];
  for (const ry of rows) {
    const inRow = places.filter((p) => p.y === ry);
    const last = inRow[inRow.length - 1];
    const shift = (W - M - (last.x + last.piece.w + CUT_GAP) - (inRow[0].x - CUT_GAP - M)) / 2;
    for (const p of inRow) p.x += shift;
  }
  return { bx, by, cutY, places };
}

/** The outline of a piece whose top left corner (circle: its box) is at (x, y), grown by `grow` mm. */
function outline(p: CutPiece, x: number, y: number, grow = 0): Pt[] {
  if (p.shape === 'rect') return [{ x: x - grow, y: y - grow }, { x: x + p.w + grow, y: y - grow }, { x: x + p.w + grow, y: y + p.h + grow }, { x: x - grow, y: y + p.h + grow }];
  if (p.shape === 'tri') {
    // grown along each side: apex up by 2·grow, base corners out
    return [{ x: x + p.w / 2, y: y - 2.2 * grow }, { x: x + p.w + 2.2 * grow, y: y + p.h + grow }, { x: x - 2.2 * grow, y: y + p.h + grow }];
  }
  const r = p.w / 2 + grow;
  return Array.from({ length: 40 }, (_, i) => ({ x: x + p.w / 2 + r * Math.cos((i / 40) * Math.PI * 2), y: y + p.h / 2 + r * Math.sin((i / 40) * Math.PI * 2) }));
}

/** The top left corner of a piece's box on the base picture. */
const baseCorner = (p: CutPiece) => (p.shape === 'circle' ? { x: p.x - p.w / 2, y: p.y - p.h / 2 } : { x: p.x, y: p.y });

const closed = (pts: Pt[]): Subpath => ({ ...line([...pts, pts[0]]) });

function cutPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = CUT_SETS[n - 1];
  const top = frame(ops, config, subjectTitle(`cut:${n}`), 'Decupează piesele de jos pe linia punctată și lipește-le pe desen.', 'Fiecare piesă are locul ei pe desen: aceeași formă, aceeași mărime.');
  const lay = cutLayout(n, top);
  ops.push({ t: 'rect', x: lay.bx - 4, y: lay.by - 3, w: CUT_BOX.w + 8, h: CUT_BOX.h + 5, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
  for (const p of set.pieces) {
    const c = baseCorner(p);
    ops.push({ t: 'polygon', points: outline(p, lay.bx + c.x, lay.by + c.y), fill: '#EEF1F5', stroke: '#8A94A3', strokeWidth: 0.45 });
  }
  // the line to cut the page in two
  ops.push({ t: 'line', x1: M + 8, y1: lay.cutY, x2: W - M, y2: lay.cutY, stroke: '#64748B', strokeWidth: 0.5, dash: [2, 1.5] });
  ops.push(...iconOps(SCISSORS, M + 3, lay.cutY, 6));
  ops.push({ t: 'text', x: W / 2, y: lay.cutY + 5.5, text: 'Taie foaia aici, apoi decupează fiecare piesă.', size: 3.4, fill: '#334155', align: 'center' });
  for (const pl of lay.places) {
    const p = pl.piece;
    ops.push({ t: 'path', subpaths: [closed(outline(p, pl.x, pl.y, CUT_GAP))], stroke: '#334155', strokeWidth: 0.45, dash: [1.6, 1.2] } as DrawOp);
    ops.push({ t: 'polygon', points: outline(p, pl.x, pl.y), fill: p.colour, stroke: INK, strokeWidth: 0.5 });
    // where the pieces glued on top of this one go (the windows on the wall, the eyes on the head)
    const own = baseCorner(p);
    for (const q of set.pieces.filter((q) => contained(q, p))) {
      const c = baseCorner(q);
      ops.push({ t: 'path', subpaths: [closed(outline(q, pl.x + c.x - own.x, pl.y + c.y - own.y))], stroke: '#334155', strokeWidth: 0.3, dash: [0.8, 0.8] } as DrawOp);
    }
  }
  adultNote(ops, `Piesele: ${set.pieces.map((p) => p.name).join(', ')}. Foarfecă cu vârfuri rotunjite; un adult ajută la decupat.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Linii și puncte” ─────────────────────────

export interface Band { kind: LineKind; y0: number; y1: number; /** the shape's left and right edges at a height */ edges: (y: number) => [number, number] }

const SAMPLE_W = 24;
const SHAPE_X0 = M + 64;

/** The stripes of the shape (`top`: the top of the activity area). */
export function linesLayout(n: number, top: number): { bands: Band[]; outline: Pt[]; extra: 'fringe' | 'trunk' } {
  const set = LINES_SETS[n - 1];
  const k = set.stripes.length;
  const regionW = W - M - SHAPE_X0;
  if (set.shape === 'scarf') {
    const w = 66;
    const x0 = SHAPE_X0 + (regionW - w) / 2;
    const y0 = top + 4;
    const y1 = BOTTOM - 14;
    const bh = (y1 - y0) / k;
    return {
      bands: set.stripes.map((kind, i) => ({ kind, y0: y0 + i * bh, y1: y0 + (i + 1) * bh, edges: () => [x0, x0 + w] as [number, number] })),
      outline: [{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y1 }, { x: x0, y: y1 }],
      extra: 'fringe',
    };
  }
  const cx = SHAPE_X0 + regionW / 2;
  const apex = top + 4;
  const base = BOTTOM - 18;
  const half = regionW / 2 - 2;
  const edges = (y: number): [number, number] => {
    const t = (y - apex) / (base - apex);
    return [cx - half * t, cx + half * t];
  };
  // the top stripe is the triangle's tip: it gets more height, so there is room to draw in it
  const first = (base - apex) * 0.28;
  const bh = (base - apex - first) / (k - 1);
  return {
    bands: set.stripes.map((kind, i) => ({ kind, y0: i === 0 ? apex : apex + first + (i - 1) * bh, y1: apex + first + i * bh, edges })),
    outline: [{ x: cx, y: apex }, { x: cx + half, y: base }, { x: cx - half, y: base }],
    extra: 'trunk',
  };
}

/** The pattern of a kind of line, as dots and polylines filling the rectangle. */
function pattern(kind: LineKind, x0: number, y0: number, x1: number, y1: number): { lines: Pt[][]; dots: Pt[]; rings: Pt[] } {
  const lines: Pt[][] = [];
  const dots: Pt[] = [];
  const rings: Pt[] = [];
  const s = 5;
  const run = (from: number, to: number, f: (u: number) => Pt) => {
    const pts: Pt[] = [];
    for (let u = from; u <= to + 1e-6; u += 0.6) pts.push(f(u));
    return pts;
  };
  if (kind === 'horizontal') for (let y = y0 + s / 2; y < y1; y += s) lines.push([{ x: x0, y }, { x: x1, y }]);
  if (kind === 'vertical') for (let x = x0 + s / 2; x < x1; x += s) lines.push([{ x, y: y0 }, { x, y: y1 }]);
  if (kind === 'zigzag' || kind === 'waves') {
    for (let y = y0 + 4; y < y1 - 2.5; y += 7) {
      lines.push(run(x0, x1, (x) => {
        const ph = ((x - x0) / 6) % 1;
        const tri = ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4;
        return { x, y: y + 2.2 * (kind === 'waves' ? Math.sin(((x - x0) / 6) * Math.PI * 2) : tri) };
      }));
    }
  }
  if (kind === 'dots') {
    let row = 0;
    for (let y = y0 + 2.5; y < y1 - 1; y += 4.5, row++) for (let x = x0 + 2.5 + (row % 2) * 2.25; x < x1 - 1; x += 4.5) dots.push({ x, y });
  }
  if (kind === 'circles') {
    let row = 0;
    for (let y = y0 + 3.5; y < y1 - 2; y += 7, row++) for (let x = x0 + 3.5 + (row % 2) * 3.5; x < x1 - 2; x += 7) rings.push({ x, y });
  }
  return { lines, dots, rings };
}

/** The pattern inside a band only (`inset` mm from its edges): lines are cut where they leave it. */
function bandPattern(b: Band, inset: number) {
  const [l0] = b.edges(b.y0);
  const [l1, r1] = b.edges(b.y1);
  const x0 = Math.min(l0, l1);
  const x1 = Math.max(b.edges(b.y0)[1], r1);
  const inside = (p: Pt, pad = 0) => {
    if (p.y < b.y0 + inset + pad || p.y > b.y1 - inset - pad) return false;
    const [l, r] = b.edges(p.y);
    return p.x >= l + inset + pad && p.x <= r - inset - pad;
  };
  const raw = pattern(b.kind, x0, b.y0, x1, b.y1);
  const lines: Pt[][] = [];
  for (const pl of raw.lines) {
    // straight lines: sample them densely, then keep the runs inside
    const dense: Pt[] = [];
    for (let i = 1; i < pl.length; i++) {
      const a = pl[i - 1], c = pl[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / 0.6));
      for (let j = 0; j < steps; j++) dense.push({ x: a.x + ((c.x - a.x) * j) / steps, y: a.y + ((c.y - a.y) * j) / steps });
    }
    dense.push(pl[pl.length - 1]);
    let cur: Pt[] = [];
    for (const p of dense) {
      if (inside(p)) cur.push(p);
      else {
        if (cur.length > 2) lines.push(cur);
        cur = [];
      }
    }
    if (cur.length > 2) lines.push(cur);
  }
  return { lines, dots: raw.dots.filter((p) => inside(p, 0.9)), rings: raw.rings.filter((p) => inside(p, 1.8)) };
}

function patternOps(pt: { lines: Pt[][]; dots: Pt[]; rings: Pt[] }, colour: string): DrawOp[] {
  return [
    ...pt.lines.map((pl) => ({ t: 'path', subpaths: [line(pl)], stroke: colour, strokeWidth: 0.6, cap: 'round' }) as DrawOp),
    ...pt.dots.map((p) => ({ t: 'circle', cx: p.x, cy: p.y, r: 0.75, fill: colour }) as DrawOp),
    ...pt.rings.map((p) => ({ t: 'circle', cx: p.x, cy: p.y, r: 1.6, stroke: colour, strokeWidth: 0.5 }) as DrawOp),
  ];
}

function linesPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = LINES_SETS[n - 1];
  const top = frame(ops, config, subjectTitle(`lines:${n}`), 'Decorează fiecare fâșie cu linia sau punctele de lângă ea.', 'Prima fâșie este exemplul. Apoi poți colora printre linii.');
  const lay = linesLayout(n, top);
  // the shape: a scarf with its fringe, or a fir tree on its trunk
  if (lay.extra === 'fringe') {
    const [a, b] = [lay.outline[3], lay.outline[2]];
    for (let x = a.x + 3; x < b.x - 1; x += 4) ops.push({ t: 'line', x1: x, y1: a.y, x2: x, y2: a.y + 9, stroke: INK, strokeWidth: 0.6 });
  } else {
    const base = lay.outline[1].y;
    const cx = lay.outline[0].x;
    ops.push({ t: 'rect', x: cx - 8, y: base, w: 16, h: 14, fill: '#8D5A3B', stroke: INK, strokeWidth: 0.5 });
  }
  ops.push({ t: 'polygon', points: lay.outline, fill: PAPER, stroke: INK, strokeWidth: 0.8 });
  lay.bands.forEach((b, i) => {
    if (i > 0) {
      const [l, r] = b.edges(b.y0);
      ops.push({ t: 'line', x1: l, y1: b.y0, x2: r, y2: b.y0, stroke: INK, strokeWidth: 0.6 });
    }
    if (i === 0) ops.push(...patternOps(bandPattern(b, 1.5), '#E8913A'));
    // the sample on the left, at the height of the stripe, with its name
    const cy = (b.y0 + b.y1) / 2 + (i === 0 && lay.extra === 'trunk' ? (b.y1 - b.y0) * 0.2 : 0);
    const sh = Math.min(16, b.y1 - b.y0 - 8);
    const sy = cy - sh / 2;
    ops.push({ t: 'rect', x: M, y: sy, w: SAMPLE_W, h: sh, rx: 2, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...patternOps(bandPattern({ kind: b.kind, y0: sy, y1: sy + sh, edges: () => [M, M + SAMPLE_W] }, 1.2), INK));
    const name = LINE_NAMES[b.kind];
    ops.push({ t: 'text', x: M + SAMPLE_W + 3, y: cy + 1.3, text: name, size: fitSize(name, 3.6, SHAPE_X0 - M - SAMPLE_W - 8), fill: INK, weight: 'bold' });
    if (i === 0) exampleTag(ops, M + SAMPLE_W + 3, cy + 5.6);
    const [l] = b.edges(cy);
    ops.push({ t: 'line', x1: SHAPE_X0 - 6, y1: cy, x2: l - 2, y2: cy, stroke: '#B8C2CF', strokeWidth: 0.4, dash: [0.8, 1] });
  });
  adultNote(ops, `Fâșiile, de sus în jos: ${set.stripes.map((k) => LINE_NAMES[k]).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── circle the answer on each row ─────────────────────────

export interface ChoiceRow { picture: string; sentence?: string; answer: number }
export interface ChoiceSheet { title: string; instruction: string; help: string; choices: { label: string; face?: string }[]; rows: ChoiceRow[]; names?: string[] }

/** Shuffled rows, never three with the same answer one after the other. */
function mixed<T extends { answer: number }>(rows: T[], item: string): T[] {
  const rand = rng(seedOf(item));
  let out = shuffle(rows, rand);
  for (let t = 0; t < 50 && out.some((r, i) => i > 1 && out[i - 1].answer === r.answer && out[i - 2].answer === r.answer); t++) out = shuffle(rows, rand);
  return out;
}

/** The rows of a „circle the answer” sheet: the faces, the situations, the habits, the class rules. */
export function choiceSheet(item: string): ChoiceSheet {
  const { kind, n } = parse(item);
  const yesNo = YES_NO.map(([label, face]) => ({ label, face }));
  if (kind === 'feel' && n === 1) {
    return {
      title: 'Emoțiile', instruction: 'Încercuiește emoția fiecărei fețe.', help: 'Un adult citește cuvintele, dacă este nevoie. Primul rând este exemplul.',
      choices: EMOTIONS.map((label) => ({ label })), rows: mixed(FACES.map(([picture, answer]) => ({ picture, answer })), item),
    };
  }
  if (kind === 'feel') {
    return {
      title: 'Cum se simte?', instruction: 'Citește și încercuiește fața potrivită.', help: 'Un adult citește propozițiile, dacă este nevoie. Primul rând este exemplul.',
      choices: EMOTIONS.map((label, i) => ({ label, face: EMOTION_FACES[i] })), rows: mixed(SITUATIONS.map(([picture, sentence, answer]) => ({ picture, sentence, answer })), item),
    };
  }
  if (kind === 'habit') {
    return {
      title: SUBJECT_KIND_TITLES.habit, instruction: 'Citește și încercuiește: e bine sau nu e bine?', help: 'Un adult citește propozițiile, dacă este nevoie. Primul rând este exemplul.',
      choices: yesNo, rows: mixed(HABITS.map(([picture, sentence, good]) => ({ picture, sentence, answer: good ? 0 : 1 })), item),
    };
  }
  return {
    title: SUBJECT_KIND_TITLES.rules, instruction: 'În clasă: e bine sau nu e bine să faci așa? Încercuiește.', help: 'Un adult citește propozițiile, dacă este nevoie. Primul rând este exemplul.',
    choices: yesNo, rows: mixed(CLASS_RULES.map(([picture, sentence, good]) => ({ picture, sentence, answer: good ? 0 : 1 })), item),
  };
}

export interface ChoiceBox { x: number; y: number; w: number; h: number }

/** Where the picture, the sentence and the choices of each row go. */
export function choiceLayout(item: string, top: number): { picX: number; rows: { cy: number; pic: number; textY?: number; boxes: ChoiceBox[] }[] } {
  const sheet = choiceSheet(item);
  const k = sheet.choices.length;
  const rowH = (BOTTOM - top) / sheet.rows.length;
  const pic = Math.min(20, rowH - 6);
  const picX = M + 9 + pic / 2 + 2;
  const x0 = picX + pic / 2 + 7;
  const cw = (W - M - x0) / k;
  const textH = sheet.rows[0].sentence ? 8 : 0;
  return {
    picX,
    rows: sheet.rows.map((_, i) => {
      const y = top + i * rowH;
      const h = rowH - 4 - textH;
      const bw = k === 2 ? Math.min(cw - 6, 50) : cw - 3;
      return { cy: y + rowH / 2, pic, textY: textH ? y + 6 : undefined, boxes: sheet.choices.map((_, c) => ({ x: x0 + c * cw + (k === 2 ? 0 : (cw - bw) / 2), y: y + 2 + textH, w: bw, h })) };
    }),
  };
}

function choicePage(config: WorksheetConfig, item: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const sheet = choiceSheet(item);
  const top = frame(ops, config, sheet.title, sheet.instruction, sheet.help);
  const lay = choiceLayout(item, top + 1);
  const withFace = !!sheet.choices[0].face;
  const pair = sheet.choices.length === 2;
  const labelSize = Math.min(...sheet.choices.map((c) => fitSize(c.label, withFace ? (pair ? 4.4 : 3.4) : 4.8, lay.rows[0].boxes[0].w - (withFace && pair ? 18 : 4))));
  sheet.rows.forEach((r, i) => {
    const row = lay.rows[i];
    ops.push({ t: 'circle', cx: M + 4.5, cy: row.cy, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: M + 4.5, y: row.cy + 1.5, text: String(i + 1), size: 4.2, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'rect', x: lay.picX - row.pic / 2 - 2, y: row.cy - row.pic / 2 - 2, w: row.pic + 4, h: row.pic + 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(r.picture, lay.picX, row.cy, row.pic));
    if (r.sentence && row.textY !== undefined) {
      const x = row.boxes[0].x;
      ops.push({ t: 'text', x, y: row.textY, text: r.sentence, size: fitSize(r.sentence, 4.2, W - M - x), fill: INK, weight: 'bold' });
    }
    sheet.choices.forEach((c, k) => {
      const b = row.boxes[k];
      ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      if (c.face && sheet.choices.length === 2) {
        // face and words side by side
        const s = Math.min(11, b.h - 3);
        ops.push(...iconOps(c.face, b.x + 3 + s / 2, b.y + b.h / 2, s));
        ops.push({ t: 'text', x: b.x + s + 6, y: b.y + b.h / 2 + labelSize * 0.36, text: c.label, size: labelSize, fill: INK, weight: 'bold' });
      } else if (c.face) {
        const s = Math.min(10, b.h - labelSize - 4);
        ops.push(...iconOps(c.face, b.x + b.w / 2, b.y + 1.5 + s / 2, s));
        ops.push({ t: 'text', x: b.x + b.w / 2, y: b.y + b.h - 1.8, text: c.label, size: labelSize, fill: INK, weight: 'bold', align: 'center' });
      } else {
        ops.push({ t: 'text', x: b.x + b.w / 2, y: b.y + b.h / 2 + labelSize * 0.36, text: c.label, size: labelSize, fill: INK, weight: 'bold', align: 'center' });
      }
    });
    if (i === 0) {
      const b = row.boxes[r.answer];
      ops.push(exampleRing(b.x - 1.2, b.y - 1.2, b.w + 2.4, b.h + 2.4));
    }
  });
  if (item === 'feel:2') adultNote(ops, 'Pe pagina de răspunsuri este emoția cea mai probabilă. Dacă copilul alege alta și spune de ce, discutați împreună.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Obiectele de igienă”: circle in a grid ─────────────────────────

export interface GridPicture { picture: string; name: string; yes: boolean; cx: number; cy: number; size: number }

const GRID_COLS = 4;
const GRID_ROWS = 3;

/** The twelve pictures, shuffled (the first one is never an object of hygiene: the example is not the first). */
export function hygieneGrid(top: number): GridPicture[] {
  const rand = rng(seedOf('hyg:1'));
  let all = shuffle(HYGIENE_OBJECTS, rand);
  for (let t = 0; t < 50 && all[0][2]; t++) all = shuffle(HYGIENE_OBJECTS, rand);
  const cw = (W - 2 * M) / GRID_COLS;
  const ch = (BOTTOM - top) / GRID_ROWS;
  const size = Math.min(34, cw - 14, ch - 14);
  return all.map(([picture, name, yes], i) => ({ picture, name, yes, cx: M + (i % GRID_COLS + 0.5) * cw, cy: top + (Math.floor(i / GRID_COLS) + 0.5) * ch, size }));
}

function hygienePage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, SUBJECT_KIND_TITLES.hyg, 'Încercuiește obiectele de igienă personală.', 'Spune ce vezi în fiecare imagine și la ce folosește. Prima imagine încercuită este exemplul.');
  const grid = hygieneGrid(top + 2);
  const cw = (W - 2 * M) / GRID_COLS;
  const ch = (BOTTOM - top - 2) / GRID_ROWS;
  grid.forEach((p) => {
    ops.push({ t: 'rect', x: p.cx - cw / 2 + 2, y: p.cy - ch / 2 + 2, w: cw - 4, h: ch - 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(p.picture, p.cx, p.cy, p.size));
  });
  const first = grid.find((p) => p.yes)!;
  const r = first.size / 2 + 4;
  ops.push({ t: 'circle', cx: first.cx, cy: first.cy, r, stroke: '#E8913A', strokeWidth: 0.8 });
  exampleTag(ops, first.cx, first.cy + r + 3.5, 'center');
  adultNote(ops, `Imaginile, rând cu rând: ${grid.map((p) => p.name).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Despre mine” ─────────────────────────

export interface MeBox { x: number; y: number; w: number; h: number; label: string }

/** The boxes of „Despre mine” (`top`: the top of the activity area). */
export function meLayout(top: number): { portrait: MeBox; facts: MeBox[]; boxes: MeBox[] } {
  const colW = (W - 2 * M - 6) / 2;
  const portrait = { x: M, y: top + 2, w: colW, h: 88, label: 'Așa arăt eu' };
  const fx = M + colW + 6;
  const fh = 20;
  const facts = ['Mă numesc', 'Am … ani', 'Ochii mei', 'Părul meu'].map((label, i) => ({ x: fx, y: top + 2 + i * (fh + 2.67), w: colW, h: fh, label }));
  const y2 = top + 2 + 88 + 6;
  const bh = (BOTTOM - 2 - y2 - 6) / 2;
  const boxes = ['Culoarea mea preferată', 'Jucăria mea preferată', 'Mâncarea mea preferată', 'Animalul meu preferat'].map((label, i) => ({ x: M + (i % 2) * (colW + 6), y: y2 + Math.floor(i / 2) * (bh + 6), w: colW, h: bh, label }));
  return { portrait, facts, boxes };
}

function boxOps(b: MeBox, size = 3.8): DrawOp[] {
  return [
    { t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 3, fill: PAPER, stroke: INK, strokeWidth: 0.5 },
    { t: 'text', x: b.x + 3, y: b.y + 5.5, text: b.label, size, fill: INK, weight: 'bold' },
  ];
}

function mePage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, SUBJECT_KIND_TITLES.me, 'Completează, colorează și desenează.', 'Un adult te poate ajuta să scrii.');
  const lay = meLayout(top);
  ops.push(...boxOps(lay.portrait, 4.2));
  const [name, age, eyes, hair] = lay.facts;
  for (const f of lay.facts) ops.push(...boxOps(f));
  // the name: on the writing line, or written already when the generator has it
  const lineY = name.y + name.h - 4;
  ops.push({ t: 'line', x1: name.x + 3, y1: lineY, x2: name.x + name.w - 3, y2: lineY, stroke: '#94A3B8', strokeWidth: 0.4 });
  const child = config.childName?.trim();
  if (child) ops.push({ t: 'text', x: name.x + 4, y: lineY - 1.2, text: child, size: fitSize(child, 5, name.w - 8), fill: INK });
  // the age: circle one number
  [5, 6, 7, 8, 9].forEach((a, i) => {
    const cx = age.x + 12 + i * ((age.w - 24) / 4);
    ops.push({ t: 'circle', cx, cy: age.y + 13, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: cx, y: age.y + 14.6, text: String(a), size: 4.4, fill: INK, weight: 'bold', align: 'center' });
  });
  // two eyes and a lock of hair, to colour
  for (const dx of [-12, 12]) {
    const cx = eyes.x + eyes.w / 2 + 10 + dx;
    const cy = eyes.y + 12.5;
    const pts = Array.from({ length: 32 }, (_, i) => ({ x: cx + 8 * Math.cos((i / 32) * Math.PI * 2), y: cy + 4.2 * Math.sin((i / 32) * Math.PI * 2) }));
    ops.push({ t: 'polygon', points: pts, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
    ops.push({ t: 'circle', cx, cy, r: 3, stroke: INK, strokeWidth: 0.45 });
    ops.push({ t: 'circle', cx, cy, r: 1.1, fill: INK });
  }
  // a face with its hair: the hair is the cap over the face, to colour
  const hx = hair.x + hair.w / 2 + 10;
  const hy = hair.y + 13;
  const arc = (r: number, from: number, to: number) => Array.from({ length: 25 }, (_, i) => {
    const a = from + ((to - from) * i) / 24;
    return { x: hx + r * Math.cos(a), y: hy + r * Math.sin(a) };
  });
  ops.push({ t: 'circle', cx: hx, cy: hy, r: 5.5, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
  ops.push({ t: 'polygon', points: [...arc(8.5, Math.PI, Math.PI * 2), ...arc(5.5, Math.PI * 2, Math.PI)], fill: PAPER, stroke: INK, strokeWidth: 0.5 });
  for (const b of lay.boxes) ops.push(...boxOps(b));
  adultNote(ops, 'O fișă pentru portofoliu: copilul desenează și colorează singur; un adult scrie ce îi dictează copilul, dacă e nevoie.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── join with a line ─────────────────────────

export interface JoinSide { picture?: string; caption?: string; word?: string; count?: number }
export interface JoinSheet { title: string; instruction: string; help: string; left: JoinSide[]; right: JoinSide[]; names: string[] }

/** The two columns of a „join” sheet: meserii, la ce folosesc, the English words. */
export function joinSheet(item: string): { sheet: JoinSheet; order: number[] } {
  const { kind, n } = parse(item);
  let sheet: JoinSheet;
  if (kind === 'job') {
    sheet = {
      title: SUBJECT_KIND_TITLES.job, instruction: 'Unește fiecare meserie cu unealta ei.', help: 'Spune numele meseriei și al uneltei. Prima linie este exemplul.',
      left: JOB_TOOLS.map(([p, c]) => ({ picture: p, caption: c })), right: JOB_TOOLS.map(([, , q, c]) => ({ picture: q, caption: c })), names: JOB_TOOLS.map(([, a, , b]) => `${a} – ${b}`),
    };
  } else if (kind === 'jobuse') {
    sheet = {
      title: SUBJECT_KIND_TITLES.jobuse, instruction: 'Unește fiecare meserie cu ce face pentru ceilalți.', help: 'Un adult citește, dacă este nevoie. Prima linie este exemplul.',
      left: JOB_USES.map(([p, c]) => ({ picture: p, caption: c })), right: JOB_USES.map(([, , w, q]) => ({ picture: q, word: w })), names: JOB_USES.map(([, a, b]) => `${a} – ${b}`),
    };
  } else {
    const set = ENGLISH_SETS[n - 1];
    sheet = {
      title: subjectTitle(item), instruction: 'Unește fiecare imagine cu cuvântul în limba engleză.', help: 'Un adult citește cuvintele în engleză, copilul le repetă și unește. Prima linie este exemplul.',
      left: set.pairs.map(([p]) => (/^\d+$/.test(p) ? { count: Number(p) } : { picture: p })), right: set.pairs.map(([, w]) => ({ word: w })),
      names: set.pairs.map(([p, w, ro]) => `${/^\d+$/.test(p) ? p : ro} – ${w}`),
    };
  }
  return { sheet, order: derangement(sheet.left.length, rng(seedOf(item))) };
}

const CARD_W = 88;

/** Where the cards and the dots of a „join” sheet go. */
export function joinLayout(item: string, top: number) {
  const { sheet } = joinSheet(item);
  const rows = sheet.left.length;
  const gy = top + 2;
  const rowH = (BOTTOM - gy) / rows;
  const pic = Math.min(24, rowH - (sheet.left[0].caption ? 12 : 7));
  const leftW = sheet.left[0].count ? 52 : pic + 6;
  const leftX = M + 2;
  const rightW = sheet.right[0].word ? (sheet.right[0].picture ? CARD_W : 62) : pic + 8;
  const rightX = W - M - rightW;
  return {
    rows, gy, rowH, pic, leftX, leftW, rightX, rightW,
    dotL: (i: number) => ({ x: leftX + leftW + 6, y: gy + (i + 0.5) * rowH }),
    dotR: (i: number) => ({ x: rightX - 5, y: gy + (i + 0.5) * rowH }),
  };
}

function countOps(count: number, x: number, cy: number, w: number): DrawOp[] {
  const per = 5;
  const lines = Math.ceil(count / per);
  const s = Math.min(8.6, (w - 4) / per);
  const ops: DrawOp[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / per), c = i % per;
    ops.push(...iconOps(COUNTED, x + 2 + s / 2 + c * s, cy + (r - (lines - 1) / 2) * (s + 0.6), s - 0.6));
  }
  return ops;
}

function joinPage(config: WorksheetConfig, item: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const { sheet, order } = joinSheet(item);
  const top = frame(ops, config, sheet.title, sheet.instruction, sheet.help);
  const lay = joinLayout(item, top);
  const wordOnly = !!sheet.right[0].word && !sheet.right[0].picture;
  const wordSize = wordOnly ? Math.min(...sheet.right.map((r) => fitSize(r.word!, 7, lay.rightW - 10))) : 0;
  sheet.left.forEach((l, i) => {
    const cy = lay.gy + (i + 0.5) * lay.rowH;
    if (l.count) {
      const h = Math.min(lay.rowH - 6, 22);
      ops.push({ t: 'rect', x: lay.leftX, y: cy - h / 2, w: lay.leftW, h, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...countOps(l.count, lay.leftX, cy, lay.leftW));
    } else {
      const pcy = cy - (l.caption ? 2.5 : 0);
      ops.push({ t: 'rect', x: lay.leftX, y: pcy - lay.pic / 2 - 2, w: lay.leftW, h: lay.pic + 4 + (l.caption ? 5 : 0), rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(l.picture!, lay.leftX + lay.leftW / 2, pcy, lay.pic));
      if (l.caption) ops.push({ t: 'text', x: lay.leftX + lay.leftW / 2, y: pcy + lay.pic / 2 + 4.6, text: l.caption, size: fitSize(l.caption, 3.2, lay.leftW - 1), fill: '#334155', align: 'center' });
    }
    const d = lay.dotL(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  order.forEach((k, i) => {
    const r = sheet.right[k];
    const cy = lay.gy + (i + 0.5) * lay.rowH;
    if (wordOnly) {
      const h = Math.min(18, lay.rowH - 10);
      ops.push({ t: 'rect', x: lay.rightX, y: cy - h / 2, w: lay.rightW, h, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: lay.rightX + lay.rightW / 2, y: cy + wordSize * 0.36, text: r.word!, size: wordSize, fill: INK, weight: 'bold', align: 'center' });
    } else if (r.word) {
      // a picture and a short text on one card
      const h = Math.min(22, lay.rowH - 6);
      const s = h - 6;
      ops.push({ t: 'rect', x: lay.rightX, y: cy - h / 2, w: lay.rightW, h, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(r.picture!, lay.rightX + 3 + s / 2, cy, s));
      const room = lay.rightW - s - 9;
      const size = fitSize(r.word, 4.2, room);
      ops.push({ t: 'text', x: lay.rightX + s + 6, y: cy + size * 0.36, text: r.word, size, fill: INK, weight: 'bold' });
    } else {
      const pcy = cy - (r.caption ? 2.5 : 0);
      ops.push({ t: 'rect', x: lay.rightX, y: pcy - lay.pic / 2 - 2, w: lay.rightW, h: lay.pic + 4 + (r.caption ? 5 : 0), rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(r.picture!, lay.rightX + lay.rightW / 2, pcy, lay.pic));
      if (r.caption) ops.push({ t: 'text', x: lay.rightX + lay.rightW / 2, y: pcy + lay.pic / 2 + 4.6, text: r.caption, size: fitSize(r.caption, 3.2, lay.rightW - 1), fill: '#334155', align: 'center' });
    }
    const d = lay.dotR(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  const a = lay.dotL(0);
  const b = lay.dotR(order.indexOf(0));
  ops.push(exampleLine(a.x, a.y, b.x, b.y));
  exampleTag(ops, a.x + 3, a.y - 2.5);
  if (item === 'en:2') adultNote(ops, 'Se tipărește color: pătratele au culorile cuvintelor.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── answers and entry point ─────────────────────────

/** The answers of an item, or null when the sheet has nothing to check (model, cut, lines, me). */
export function subjectKeySection(item: string): KeySection | null {
  if (!isSubjectItem(item)) return null;
  const { kind, n } = parse(item);
  const title = subjectLabel(item);
  if (kind === 'sym') return { title, entries: [`Desenul complet (${SYMMETRY_SETS[n - 1].name}) este mai jos.`], perLine: 1 };
  if (kind === 'feel' || kind === 'habit' || kind === 'rules') {
    const sheet = choiceSheet(item);
    return {
      title,
      entries: sheet.rows.map((r) => (r.sentence ? `${r.sentence.replace(/\.$/, '')} – ${lower(sheet.choices[r.answer].label)}` : lower(sheet.choices[r.answer].label))),
      perLine: sheet.rows[0].sentence ? 1 : 4,
      numbered: true,
    };
  }
  if (kind === 'hyg') {
    const grid = hygieneGrid(0);
    const yes = grid.filter((p) => p.yes).map((p) => p.name);
    return { title, entries: [`Se încercuiesc (${yes.length}): ${yes.join(', ')}.`, `Nu se încercuiesc: ${grid.filter((p) => !p.yes).map((p) => p.name).join(', ')}.`], perLine: 1 };
  }
  if (kind === 'job' || kind === 'jobuse' || kind === 'en') return { title, entries: joinSheet(item).sheet.names, perLine: kind === 'jobuse' ? 1 : 2, numbered: true };
  return null;
}

const KEY_COL = (W - 2 * M) / 2;

/** The finished symmetric drawings, small, under the answers. */
export function subjectKeyExtras(items: string[]): KeyExtra[] {
  const drawings = items.filter((i) => isSubjectItem(i) && i.startsWith('sym:')).map((item) => {
    const n = Number(item.split(':')[1]);
    const full = symmetryFull(SYMMETRY_SETS[n - 1]);
    const cell = Math.min(6, (KEY_COL - 10) / full[0].length);
    const h = full.length * cell;
    return {
      height: h + 15,
      draw: (ops: DrawOp[], x0: number, top: number) => {
        ops.push({ t: 'text', x: x0, y: top + 2, text: subjectTitle(item), size: 4, fill: INK, weight: 'bold' });
        ops.push(...symmetryOps(n, { x0, y0: top + 7, cell, rows: full.length, cols: full[0].length }, true, false));
      },
    };
  });
  const extras: KeyExtra[] = [];
  for (let i = 0; i < drawings.length; i += 2) {
    const pair = drawings.slice(i, i + 2);
    extras.push({ height: Math.max(...pair.map((d) => d.height)) + 4, draw: (ops, top) => pair.forEach((d, k) => d.draw(ops, M + k * KEY_COL, top)) });
  }
  return extras;
}

/** The page of one item, or null when the item is not one of these subjects. */
export function buildSubjectPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isSubjectItem(item)) return null;
  const { kind, n } = parse(item);
  if (kind === 'sym') return symmetryPage(config, n, tier);
  if (kind === 'model') return modelPage(config, n, tier);
  if (kind === 'cut') return cutPage(config, n, tier);
  if (kind === 'lines') return linesPage(config, n, tier);
  if (kind === 'me') return mePage(config, tier);
  if (kind === 'hyg') return hygienePage(config, tier);
  if (kind === 'job' || kind === 'jobuse' || kind === 'en') return joinPage(config, item, tier);
  return choicePage(config, item, tier);
}
