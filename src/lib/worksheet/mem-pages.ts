import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { ACCENT, INK, PAPER } from './rows';
import type { KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, H, M, SOFT, W, adultNote, derangement, exampleLine, exampleRing, exampleTag, fitSize, footer, frame, rng, seedOf, shuffle, textRoom } from './page-kit';
import { numberWords } from './number-words';
import { textW } from './reading-pages';
import {
  AROUND_LABELS, AROUND_ROWS, AROUND_SHAPES, CAUSE_SETS, COORD_COLS, COORD_ROWS, MEM_KINDS, MEM_SETS, MORE_ROWS, PICT_KINDS, PICT_MAX,
  PLANE_FACTS, PLAN_SETS, REGULAR_SETS, SHOWN_NUMBERS, SIDES_ROWS, SOLIDS, SOLID_FACTS, SOLID_OBJECTS, SYMMETRY_TILES, aroundRows, cellName, coordSet,
  growingCount, isMemItem, MINUS, moreRows, nextPicture, numberRow, pictCounts, placeSet, regularSet, ruleOf, sidesSet, sort2Set, termsSet, TIMES,
  type MemKind, type PlaneShape, type Solid, type TermSentence,
} from './mem';
import { currentVariant, vkey } from './variant';

/**
 * The „Matematică și explorarea mediului” sheets that fill the gaps of the programme, and three
 * preschool sheets of domain E: full pages in the „Jocuri” category (see activities.ts), seeded by the
 * item and by the variant of the sheet („Altă variantă”, variant.ts; the sets of each variant: mem.ts).
 * The layouts are computed by exported functions, which the tests and the answers page read.
 */

export const MEM_KIND_TITLES: Record<MemKind, string> = {
  terms: 'Termenii operațiilor',
  place: 'Formează numărul',
  coord: 'Coordonate',
  sides: 'Laturi, vârfuri, axa de simetrie',
  solid: 'Corpuri geometrice',
  regular: 'Modele și regularități',
  sort2: 'Sortează după două criterii',
  plan: 'Plan de lucru',
  cause: 'Ce se întâmplă dacă…?',
  around: 'Forme în jurul nostru',
  pict: 'Pictograma',
  more: 'Mai repede, mai cald…',
};

const LEVEL_TAG: Record<'CP' | 'I' | 'II', string> = { CP: 'CP', I: 'clasa I', II: 'clasa a II-a' };

/** Every item, in picker order. */
export function memItems(): string[] {
  return MEM_KINDS.flatMap((k) => Array.from({ length: MEM_SETS[k] }, (_, i) => `${k}:${i + 1}`));
}

const parts = (item: string): [MemKind, number] => {
  const [k, n] = item.split(':');
  return [k as MemKind, Number(n)];
};

export function memShortLabel(item: string): string {
  const [kind, n] = parts(item);
  if (kind === 'terms') return `${LEVEL_TAG[termsSet(n).level]} (${n % 2 ? 1 : 2})`;
  if (kind === 'regular') return `${LEVEL_TAG[REGULAR_SETS[n - 1].level]} (${n % 2 ? 1 : 2})`;
  if (kind === 'plan') return PLAN_SETS[n - 1].title;
  if (MEM_SETS[kind] === 1) return MEM_KIND_TITLES[kind];
  return `Setul ${n}`;
}

export function memLabel(item: string): string {
  const [kind, n] = parts(item);
  return MEM_SETS[kind] === 1 ? MEM_KIND_TITLES[kind] : `${MEM_KIND_TITLES[kind]} (${n})`;
}

const LIGHT = '#94A3B8';

/** An empty box to write in. */
function box(ops: DrawOp[], x: number, y: number, w: number, h: number): void {
  ops.push({ t: 'rect', x, y, w, h, rx: 1.6, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
}

/** A section heading. */
function heading(ops: DrawOp[], y: number, text: string): void {
  ops.push({ t: 'text', x: M, y, text, size: fitSize(text, 4.3, W - 2 * M), fill: INK, weight: 'bold' });
}

/**
 * A sentence with one box: the parts around „{}”. The text is placed by its measured width (textW, Nunito
 * Bold, a little wider than the regular weight it is printed in); a full stop right after the box is left out.
 */
export function sentenceParts(s: TermSentence, x: number, baseline: number, size: number, boxW: number): { before: string; after: string; box: { x: number; y: number; w: number; h: number }; afterX: number } {
  const [rawBefore, rawAfter] = s.text.split('{}');
  const before = rawBefore.trimEnd();
  const after = rawAfter.trim() === '.' ? '' : rawAfter.trim();
  const bx = x + (before ? textW(before, size) + 2.5 : 0);
  return { before, after, box: { x: bx, y: baseline - size - 2, w: boxW, h: size + 4 }, afterX: bx + boxW + 2 };
}

function sentenceOps(ops: DrawOp[], s: TermSentence, x: number, baseline: number, size: number, boxW: number, example = false): void {
  const p = sentenceParts(s, x, baseline, size, boxW);
  if (p.before) ops.push({ t: 'text', x, y: baseline, text: p.before, size, fill: INK });
  box(ops, p.box.x, p.box.y, p.box.w, p.box.h);
  if (example) ops.push({ t: 'text', x: p.box.x + p.box.w / 2, y: baseline, text: s.answer, size, fill: ACCENT, weight: 'bold', align: 'center' });
  if (p.after) ops.push({ t: 'text', x: p.afterX, y: baseline, text: p.after, size, fill: INK });
}

/** The width a sentence takes with its box. */
function sentenceWidth(s: TermSentence, size: number, boxW: number): number {
  const p = sentenceParts(s, 0, 0, size, boxW);
  return p.afterX + (p.after ? textRoom(p.after, size) : 0);
}

/** A token of an operation: the dot of the multiplication is drawn (the font's „·” is too small to see). */
function tokenOps(ops: DrawOp[], t: string, x: number, y: number, size: number, fill = INK, align: 'left' | 'center' = 'left'): number {
  if (t === TIMES) {
    const w = size * 0.5;
    ops.push({ t: 'circle', cx: align === 'center' ? x : x + w / 2, cy: y - size * 0.3, r: size * 0.13, fill });
    return w;
  }
  ops.push({ t: 'text', x, y, text: t, size, fill, weight: 'bold', align });
  return textRoom(t, size);
}

// ───────────────────────── Termenii operațiilor ─────────────────────────

export interface TermsLayout {
  bank: { word: string; x: number; y: number; w: number }[];
  labels: { y: number; tokens: { text: string; x: number }[]; boxes: { x: number; y: number; w: number; h: number; word: string }[] }[];
  picturesTop: number;
  pictures: { y: number; boxes: { x: number; y: number; w: number; h: number }[] }[];
  signsTop: number;
  signs: { x: number; y: number }[];
  sentencesTop: number;
  sentences: { x: number; y: number }[];
}

const TOKEN_SIZE = 7.5;
const LABEL_BOX_W = 34;
/** The centres of the five tokens of a labelled operation: three columns of 40 mm for the numbers. */
const LABEL_XS = [49, 77, 105, 133, 161];

export function termsLayout(n: number, top: number, variant = currentVariant()): TermsLayout {
  const set = termsSet(n, variant);
  let y = top + 2;
  const bank: TermsLayout['bank'] = [];
  const labels: TermsLayout['labels'] = [];
  if (set.labels.length) {
    y += 5; // heading
    const bw = Math.min(30, (W - 2 * M - 3 * (set.bank.length - 1)) / set.bank.length);
    set.bank.forEach((word, i) => bank.push({ word, x: M + i * (bw + 3), y: y + 2, w: bw }));
    y += 13;
    for (const lab of set.labels) {
      const tokens = lab.tokens.map((text, i) => ({ text, x: LABEL_XS[i] }));
      const ty = y + 8;
      const boxes = [0, 2, 4].flatMap((ti, k) => (lab.words[k] ? [{ x: LABEL_XS[ti] - LABEL_BOX_W / 2, y: ty + 9, w: LABEL_BOX_W, h: 9, word: lab.words[k] }] : []));
      labels.push({ y: ty, tokens, boxes });
      y += 30;
    }
  }
  const picturesTop = y + 3;
  const pictures = set.pictures.map((_, i) => {
    const py = picturesTop + 14 + i * 26;
    return { y: py, boxes: [0, 1, 2].map((k) => ({ x: W - M - 72 + k * 26, y: py - 6, w: 13, h: 11 })) };
  });
  if (set.pictures.length) y = picturesTop + 14 + set.pictures.length * 26 - 8;
  const signsTop = y + 3;
  const perRow = 2;
  const signRows = Math.ceil(set.signs.length / perRow);
  const signs = set.signs.map((_, i) => ({ x: M + 4 + (i % perRow) * ((W - 2 * M) / perRow), y: signsTop + 13 + Math.floor(i / perRow) * 13 }));
  const sentencesTop = signsTop + 13 + signRows * 13 + 2;
  const step = set.level === 'II' ? 10.5 : 13;
  const sentences = set.sentences.map((_, i) => ({ x: M + 4, y: sentencesTop + 12 + i * step }));
  return { bank, labels, picturesTop, pictures, signsTop, signs, sentencesTop, sentences };
}

const SENT_SIZE: Record<'CP' | 'I' | 'II', number> = { CP: 5.2, I: 4.8, II: 4.6 };

function termsPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = termsSet(n);
  const help = set.level === 'CP' ? 'Un adult citește propozițiile. + plus, − minus, = egal. Primul semn este exemplul.' : 'Primul semn este exemplul.';
  const top = frame(ops, config, MEM_KIND_TITLES.terms, set.level === 'CP' ? 'Scrie operația, semnul potrivit și numărul care lipsește.' : 'Scrie denumirile, semnele și numerele care lipsesc.', help);
  const lay = termsLayout(n, top);
  if (lay.labels.length) {
    heading(ops, top + 6, 'Scrie sub fiecare număr cum se numește. Alege din cuvintele de mai jos.');
    for (const b of lay.bank) {
      ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: 8, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: b.x + b.w / 2, y: b.y + 5.5, text: b.word, size: fitSize(b.word, 3.8, b.w - 3), fill: INK, weight: 'bold', align: 'center' });
    }
    for (const lab of lay.labels) {
      for (const t of lab.tokens) tokenOps(ops, t.text, t.x, lab.y, TOKEN_SIZE, INK, 'center');
      for (const b of lab.boxes) {
        ops.push({ t: 'line', x1: b.x + b.w / 2, y1: lab.y + 2, x2: b.x + b.w / 2, y2: b.y - 0.8, stroke: LIGHT, strokeWidth: 0.4 });
        ops.push({ t: 'polygon', points: [{ x: b.x + b.w / 2 - 1.2, y: b.y - 2.2 }, { x: b.x + b.w / 2 + 1.2, y: b.y - 2.2 }, { x: b.x + b.w / 2, y: b.y - 0.6 }], fill: LIGHT });
        box(ops, b.x, b.y, b.w, b.h);
      }
    }
  }
  if (set.pictures.length) {
    heading(ops, lay.picturesTop + 4, 'Privește imaginile și scrie operația.');
    set.pictures.forEach((p, i) => {
      const row = lay.pictures[i];
      const s = 9.5;
      let x = M + 4 + s / 2;
      for (let k = 0; k < p.a; k++, x += s + 1.5) {
        ops.push(...iconOps(p.picture, x, row.y - 1, s));
        // the ones taken away, crossed out
        if (p.op === MINUS && k >= p.a - p.b) {
          ops.push({ t: 'line', x1: x - s / 2, y1: row.y - 1 - s / 2, x2: x + s / 2, y2: row.y - 1 + s / 2, stroke: '#D32F2F', strokeWidth: 0.7 });
          ops.push({ t: 'line', x1: x - s / 2, y1: row.y - 1 + s / 2, x2: x + s / 2, y2: row.y - 1 - s / 2, stroke: '#D32F2F', strokeWidth: 0.7 });
        }
      }
      if (p.op === '+') {
        ops.push({ t: 'text', x: x + 1, y: row.y + 1, text: 'și', size: 4.4, fill: INK, weight: 'bold' });
        x += 10 + s / 2;
        for (let k = 0; k < p.b; k++, x += s + 1.5) ops.push(...iconOps(p.picture, x, row.y - 1, s));
      }
      const [b1, b2, b3] = row.boxes;
      box(ops, b1.x, b1.y, b1.w, b1.h);
      ops.push({ t: 'text', x: b1.x + b1.w + 6.5, y: row.y + 2.4, text: p.op, size: 6.4, fill: INK, weight: 'bold', align: 'center' });
      box(ops, b2.x, b2.y, b2.w, b2.h);
      ops.push({ t: 'text', x: b2.x + b2.w + 6.5, y: row.y + 2.4, text: '=', size: 6.4, fill: INK, weight: 'bold', align: 'center' });
      box(ops, b3.x, b3.y, b3.w, b3.h);
    });
  }
  heading(ops, lay.signsTop + 4, set.level === 'CP' ? 'Scrie semnul potrivit: +, − sau =.' : set.level === 'I' ? 'Scrie semnul potrivit: <, >, =, + sau −.' : 'Scrie semnul potrivit: +, −, · sau :.');
  set.signs.forEach((s, i) => {
    const p = lay.signs[i];
    let x = p.x;
    for (const t of s.tokens) {
      if (t === '?') {
        box(ops, x, p.y - 7.5, 10, 10);
        if (i === 0) tokenOps(ops, s.answer, x + 5, p.y, 6.4, ACCENT, 'center');
        x += 13;
      } else {
        x += tokenOps(ops, t, x, p.y, 6.4) + 3;
      }
    }
    if (i === 0) exampleTag(ops, x + 1, p.y - 1);
  });
  heading(ops, lay.sentencesTop + 4, set.level === 'CP' ? 'Scrie numărul care lipsește.' : 'Calculează și scrie rezultatul în căsuță.');
  const size = SENT_SIZE[set.level];
  set.sentences.forEach((s, i) => {
    const p = lay.sentences[i];
    const sz = Math.min(size, (size * (W - M - p.x)) / Math.max(1, sentenceWidth(s, size, 16) * 1.04));
    sentenceOps(ops, s, p.x, p.y, sz, 16);
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Formează numărul (clasa a II-a) ─────────────────────────

const HUNDRED = 17;
const UNIT = HUNDRED / 10;

/** Hundreds as squares of 10 × 10, tens as bars of 10, units as small squares; `x`, `y` the top left. Returns the width. */
export function blocksOps(n: number, x: number, y: number): { ops: DrawOp[]; width: number; counts: [number, number, number] } {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const ops: DrawOp[] = [];
  let cx = x;
  const cellLines = (x0: number, y0: number, w: number, hh: number, cols: number, rows: number) => {
    for (let k = 1; k < cols; k++) ops.push({ t: 'line', x1: x0 + k * UNIT, y1: y0, x2: x0 + k * UNIT, y2: y0 + hh, stroke: '#7CA7D8', strokeWidth: 0.15 });
    for (let k = 1; k < rows; k++) ops.push({ t: 'line', x1: x0, y1: y0 + k * UNIT, x2: x0 + w, y2: y0 + k * UNIT, stroke: '#7CA7D8', strokeWidth: 0.15 });
  };
  for (let i = 0; i < h; i++) {
    ops.push({ t: 'rect', x: cx, y, w: HUNDRED, h: HUNDRED, fill: '#DCEBFA' });
    cellLines(cx, y, HUNDRED, HUNDRED, 10, 10);
    ops.push({ t: 'rect', x: cx, y, w: HUNDRED, h: HUNDRED, stroke: '#1E5AA8', strokeWidth: 0.45 });
    cx += HUNDRED + 3;
  }
  for (let i = 0; i < t; i++) {
    ops.push({ t: 'rect', x: cx, y, w: UNIT, h: HUNDRED, fill: '#FDE3C4' });
    cellLines(cx, y, UNIT, HUNDRED, 1, 10);
    ops.push({ t: 'rect', x: cx, y, w: UNIT, h: HUNDRED, stroke: '#C26A12', strokeWidth: 0.4 });
    cx += UNIT + 2;
  }
  if (t) cx += 1;
  for (let i = 0; i < u; i++) {
    const col = Math.floor(i / 3);
    const row = i % 3;
    ops.push({ t: 'rect', x: cx + col * (UNIT + 1.4), y: y + HUNDRED - (row + 1) * (UNIT + 1.4) + 1.4, w: UNIT, h: UNIT, fill: '#D6F0C8', stroke: '#3F8F2A', strokeWidth: 0.35 });
  }
  if (u) cx += Math.ceil(u / 3) * (UNIT + 1.4);
  return { ops, width: cx - x, counts: [h, t, u] };
}

export interface PlaceLayout { blocksTop: number; rows: { y: number; boxes: { x: number; y: number; w: number; h: number }[] }[]; digitsTop: number; digits: number[]; wordsTop: number; words: number[] }

export function placeLayout(n: number, top: number, variant = currentVariant()): PlaceLayout {
  const set = placeSet(n, variant);
  const blocksTop = top + 13;
  const rows = set.blocks.map((_, i) => {
    const y = blocksTop + 6 + i * 36;
    const by = y + HUNDRED + 4;
    // [ ] sute  [ ] zeci  [ ] unități  =  [     ]
    return { y, boxes: [{ x: M + 4, y: by, w: 11, h: 9 }, { x: M + 34, y: by, w: 11, h: 9 }, { x: M + 62, y: by, w: 11, h: 9 }, { x: M + 104, y: by, w: 24, h: 9 }] };
  });
  const digitsTop = blocksTop + 6 + set.blocks.length * 36 + 2;
  const digits = set.toDigits.map((_, i) => digitsTop + 13 + i * 11);
  const wordsTop = digitsTop + 13 + set.toDigits.length * 11 + 2;
  const words = set.toWords.map((_, i) => wordsTop + 14 + i * 13);
  return { blocksTop, rows, digitsTop, digits, wordsTop, words };
}

function placePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = placeSet(n);
  const top = frame(ops, config, MEM_KIND_TITLES.place, 'Scrie câte sute, zeci și unități are fiecare număr, apoi numărul.', 'Numerele scrise cu litere: scrie-le cu cifre. Numerele scrise cu cifre: scrie-le cu litere.');
  const lay = placeLayout(n, top);
  heading(ops, top + 7, '1. Privește și scrie.');
  // the legend: a hundred, a ten, a unit
  const legX = W - M - 82;
  const legend: [number, number, string][] = [[100, 0, '100'], [10, 38, '10'], [1, 62, '1']];
  for (const [v, dx, label] of legend) {
    const b = blocksOps(v, legX + dx, top);
    ops.push(...b.ops);
    ops.push({ t: 'text', x: legX + dx + b.width + 1.5, y: top + HUNDRED - 0.5, text: `= ${label}`, size: 3.8, fill: INK, weight: 'bold' });
  }
  set.blocks.forEach((v, i) => {
    const row = lay.rows[i];
    const b = blocksOps(v, M + 4, row.y);
    ops.push(...b.ops);
    const [s, z, u, num] = row.boxes;
    const base = s.y + 6.6;
    box(ops, s.x, s.y, s.w, s.h);
    ops.push({ t: 'text', x: s.x + s.w + 2, y: base, text: 'sute', size: 4.4, fill: INK });
    box(ops, z.x, z.y, z.w, z.h);
    ops.push({ t: 'text', x: z.x + z.w + 2, y: base, text: 'zeci', size: 4.4, fill: INK });
    box(ops, u.x, u.y, u.w, u.h);
    ops.push({ t: 'text', x: u.x + u.w + 2, y: base, text: 'unități', size: 4.4, fill: INK });
    ops.push({ t: 'text', x: num.x - 7, y: base, text: '=', size: 5, fill: INK, weight: 'bold' });
    box(ops, num.x, num.y, num.w, num.h);
    if (i === 0) {
      const [hh, tt, uu] = b.counts;
      [[s, hh], [z, tt], [u, uu], [num, v]].forEach(([bx, val]) => {
        const r = bx as { x: number; w: number };
        ops.push({ t: 'text', x: r.x + r.w / 2, y: base, text: String(val), size: 5, fill: ACCENT, weight: 'bold', align: 'center' });
      });
      exampleTag(ops, num.x + num.w + 2, base - 0.5);
    }
  });
  heading(ops, lay.digitsTop + 4, '2. Scrie numerele cu cifre.');
  set.toDigits.forEach((v, i) => {
    const y = lay.digits[i];
    const words = numberWords(v);
    ops.push({ t: 'text', x: M + 4, y, text: words, size: fitSize(words, 4.8, 130), fill: INK });
    ops.push({ t: 'text', x: M + 140, y, text: '=', size: 5, fill: INK, weight: 'bold' });
    box(ops, M + 148, y - 6.6, 26, 9);
  });
  heading(ops, lay.wordsTop + 4, '3. Scrie numerele cu litere.');
  set.toWords.forEach((v, i) => {
    const y = lay.words[i];
    ops.push({ t: 'text', x: M + 4, y, text: `${v} =`, size: 5.4, fill: INK, weight: 'bold' });
    ops.push({ t: 'line', x1: M + 30, y1: y + 1, x2: W - M, y2: y + 1, stroke: INK, strokeWidth: 0.4 });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Coordonate (clasa a II-a) ─────────────────────────

export interface CoordLayout { x: number; y: number; cell: number; questionsTop: number }

export function coordLayout(top: number): CoordLayout {
  const cell = 22;
  return { x: (W - 5 * cell) / 2 + 3, y: top + 3, cell, questionsTop: top + 3 + 5 * cell + 16 };
}

/** The centre of a cell: column 0–4 from the left, row 1–5 from the bottom. */
export function cellCentre(lay: CoordLayout, col: number, row: number): Pt {
  return { x: lay.x + (col + 0.5) * lay.cell, y: lay.y + (COORD_ROWS - row + 0.5) * lay.cell };
}

function coordPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = coordSet(n);
  const top = frame(ops, config, MEM_KIND_TITLES.coord, 'Privește tabelul și răspunde.', 'Litera arată coloana, numărul arată rândul: B3 este căsuța din coloana B și rândul 3.');
  const lay = coordLayout(top);
  const g = 5 * lay.cell;
  ops.push({ t: 'rect', x: lay.x, y: lay.y, w: g, h: g, fill: PAPER });
  for (let k = 0; k <= 5; k++) {
    ops.push({ t: 'line', x1: lay.x + k * lay.cell, y1: lay.y, x2: lay.x + k * lay.cell, y2: lay.y + g, stroke: INK, strokeWidth: k % 5 ? 0.35 : 0.6 });
    ops.push({ t: 'line', x1: lay.x, y1: lay.y + k * lay.cell, x2: lay.x + g, y2: lay.y + k * lay.cell, stroke: INK, strokeWidth: k % 5 ? 0.35 : 0.6 });
  }
  COORD_COLS.forEach((c, k) => ops.push({ t: 'text', x: lay.x + (k + 0.5) * lay.cell, y: lay.y + g + 5.6, text: c, size: 5, fill: '#B45309', weight: 'bold', align: 'center' }));
  for (let r = 1; r <= COORD_ROWS; r++) ops.push({ t: 'text', x: lay.x - 4, y: lay.y + (COORD_ROWS - r + 0.5) * lay.cell + 1.8, text: String(r), size: 5, fill: '#B45309', weight: 'bold', align: 'center' });
  for (const p of set.placed) {
    const c = cellCentre(lay, p.col, p.row);
    ops.push(...iconOps(p.picture, c.x, c.y, lay.cell - 7));
  }
  let y = lay.questionsTop;
  heading(ops, y, '1. Ce se află în căsuța…?');
  set.whatIn.forEach((k, i) => {
    const p = set.placed[k];
    const yy = y + 9 + i * 10;
    ops.push({ t: 'text', x: M + 4, y: yy, text: `${cellName(p.col, p.row)}:`, size: 4.8, fill: INK, weight: 'bold' });
    ops.push({ t: 'line', x1: M + 18, y1: yy + 0.8, x2: M + 80, y2: yy + 0.8, stroke: INK, strokeWidth: 0.35 });
    if (i === 0) {
      ops.push({ t: 'text', x: M + 20, y: yy - 0.3, text: p.name, size: 4.6, fill: ACCENT, weight: 'bold' });
      exampleTag(ops, M + 82, yy - 0.5);
    }
  });
  const x2 = W / 2 + 4;
  ops.push({ t: 'text', x: x2, y, text: '2. În ce căsuță se află…?', size: 4.3, fill: INK, weight: 'bold' });
  set.whereIs.forEach((k, i) => {
    const p = set.placed[k];
    const yy = y + 9 + i * 10;
    ops.push(...iconOps(p.picture, x2 + 4, yy - 1.6, 7));
    ops.push({ t: 'text', x: x2 + 10, y: yy, text: p.name, size: 4.6, fill: INK });
    box(ops, x2 + 40, yy - 6.4, 16, 8.4);
  });
  y += 9 + 3 * 10 + 4;
  heading(ops, y, '3. Desenează în tabel.');
  set.draw.forEach((d, i) => {
    const text = `Desenează ${d.what} în căsuța ${cellName(d.col, d.row)}.`;
    ops.push({ t: 'text', x: M + 4 + i * ((W - 2 * M) / 2), y: y + 9, text, size: fitSize(text, 4.6, (W - 2 * M) / 2 - 6), fill: INK });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── shapes and solids ─────────────────────────

const SHAPE_FILL = '#CFE6FB';

/** A plane shape in a box of `size` mm centred on (cx, cy); `look` turns or stretches it. Returns ops and its corner points (the extent for the lines). */
export function planeOps(shape: PlaneShape, cx: number, cy: number, size: number, look = 0, fill = SHAPE_FILL): DrawOp[] {
  const r = size / 2;
  const sw = 0.5;
  switch (shape) {
    case 'circle': {
      const k = r * 0.86;
      return [{ t: 'circle', cx, cy, r: k, fill, stroke: INK, strokeWidth: sw }];
    }
    case 'semicircle': {
      const k = r * 0.9;
      const pts = Array.from({ length: 25 }, (_, i) => ({ x: cx + k * Math.cos(Math.PI + (i / 24) * Math.PI), y: cy + k * 0.45 + k * Math.sin(Math.PI + (i / 24) * Math.PI) }));
      return [{ t: 'polygon', points: pts, fill, stroke: INK, strokeWidth: sw }];
    }
    case 'square': {
      if (look === 1) {
        const k = r * 0.86;
        return [{ t: 'polygon', points: [{ x: cx, y: cy - k }, { x: cx + k, y: cy }, { x: cx, y: cy + k }, { x: cx - k, y: cy }], fill, stroke: INK, strokeWidth: sw }];
      }
      const k = r * 0.78;
      return [{ t: 'rect', x: cx - k, y: cy - k, w: 2 * k, h: 2 * k, fill, stroke: INK, strokeWidth: sw }];
    }
    case 'rectangle': {
      const w = look === 1 ? r * 0.9 : r * 1.9;
      const h = look === 1 ? r * 1.8 : r * 1.05;
      return [{ t: 'rect', x: cx - w / 2, y: cy - h / 2, w, h, fill, stroke: INK, strokeWidth: sw }];
    }
    case 'triangle': {
      const pts = look === 1
        ? [{ x: cx - r * 0.9, y: cy + r * 0.7 }, { x: cx + r * 0.95, y: cy + r * 0.25 }, { x: cx - r * 0.2, y: cy - r * 0.8 }]
        : [{ x: cx, y: cy - r * 0.85 }, { x: cx + r * 0.9, y: cy + r * 0.7 }, { x: cx - r * 0.9, y: cy + r * 0.7 }];
      return [{ t: 'polygon', points: pts, fill, stroke: INK, strokeWidth: sw }];
    }
    case 'right-triangle':
      return [{ t: 'polygon', points: [{ x: cx - r * 0.8, y: cy - r * 0.8 }, { x: cx + r * 0.8, y: cy + r * 0.75 }, { x: cx - r * 0.8, y: cy + r * 0.75 }], fill, stroke: INK, strokeWidth: sw }];
  }
}

/** The dashed line on a symmetry tile, through the shape (`size` the tile's drawing box). */
function axisLine(shape: PlaneShape, line: 'vertical' | 'horizontal' | 'diagonal', cx: number, cy: number, size: number): DrawOp {
  const r = size / 2;
  const style = { stroke: '#D32F2F', strokeWidth: 0.6, dash: [1.6, 1.1] };
  if (line === 'vertical') return { t: 'line', x1: cx, y1: cy - r, x2: cx, y2: cy + r, ...style };
  if (line === 'horizontal') return { t: 'line', x1: cx - r, y1: cy, x2: cx + r, y2: cy, ...style };
  // the rectangle's diagonal, from corner to corner and a little beyond
  const w = r * 1.9;
  const h = r * 1.05;
  return shape === 'rectangle' ? { t: 'line', x1: cx - w / 2 - 2, y1: cy - h / 2 - 1.1, x2: cx + w / 2 + 2, y2: cy + h / 2 + 1.1, ...style } : { t: 'line', x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r, ...style };
}

/** A solid as a line drawing, `size` mm, centred on (cx, cy); hidden edges dashed. */
export function solidOps(solid: Solid, cx: number, cy: number, size: number): DrawOp[] {
  const r = size / 2;
  const sw = 0.5;
  const dash = [1.2, 1];
  const L = (a: Pt, b: Pt, hidden = false): DrawOp => ({ t: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: INK, strokeWidth: sw, ...(hidden ? { dash } : {}) });
  const arc = (ex: number, ey: number, rx: number, ry: number, from: number, to: number, hidden = false): DrawOp => ({
    t: 'path', stroke: INK, strokeWidth: sw, ...(hidden ? { dash } : {}),
    subpaths: [{ start: { x: ex + rx * Math.cos(from), y: ey + ry * Math.sin(from) }, segs: Array.from({ length: 24 }, (_, i) => ({ kind: 'L' as const, p: { x: ex + rx * Math.cos(from + ((i + 1) / 24) * (to - from)), y: ey + ry * Math.sin(from + ((i + 1) / 24) * (to - from)) } })) }],
  });
  const box3 = (w: number, h: number, d: number): DrawOp[] => {
    const x0 = cx - (w + d) / 2;
    const y0 = cy - (h - d) / 2;
    const f = [{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y0 + h }, { x: x0, y: y0 + h }];
    const b = f.map((p) => ({ x: p.x + d, y: p.y - d }));
    return [
      { t: 'polygon', points: [f[0], b[0], b[1], f[1]], fill: '#E3F0FC' },
      { t: 'polygon', points: [f[1], b[1], b[2], f[2]], fill: '#B9D7F2' },
      { t: 'polygon', points: f, fill: '#CFE6FB' },
      L(b[3], b[0], true), L(b[3], b[2], true), L(b[3], f[3], true),
      L(f[0], f[1]), L(f[1], f[2]), L(f[2], f[3]), L(f[3], f[0]),
      L(f[0], b[0]), L(f[1], b[1]), L(f[2], b[2]), L(b[0], b[1]), L(b[1], b[2]),
    ];
  };
  switch (solid) {
    case 'cub':
      return box3(r * 1.25, r * 1.25, r * 0.5);
    case 'cuboid':
      return box3(r * 1.5, r * 0.95, r * 0.42);
    case 'cilindru': {
      const rx = r * 0.62;
      const ry = r * 0.2;
      const yt = cy - r * 0.62;
      const yb = cy + r * 0.62;
      return [
        { t: 'polygon', points: [{ x: cx - rx, y: yt }, { x: cx + rx, y: yt }, { x: cx + rx, y: yb }, { x: cx - rx, y: yb }], fill: '#CFE6FB' },
        { t: 'polygon', points: Array.from({ length: 28 }, (_, i) => ({ x: cx + rx * Math.cos((i / 28) * 2 * Math.PI), y: yb + ry * Math.sin((i / 28) * 2 * Math.PI) })).filter((p) => p.y >= yb), fill: '#CFE6FB' },
        { t: 'polygon', points: Array.from({ length: 28 }, (_, i) => ({ x: cx + rx * Math.cos((i / 28) * 2 * Math.PI), y: yt + ry * Math.sin((i / 28) * 2 * Math.PI) })), fill: '#E3F0FC', stroke: INK, strokeWidth: sw },
        L({ x: cx - rx, y: yt }, { x: cx - rx, y: yb }), L({ x: cx + rx, y: yt }, { x: cx + rx, y: yb }),
        arc(cx, yb, rx, ry, 0, Math.PI), arc(cx, yb, rx, ry, Math.PI, 2 * Math.PI, true),
      ];
    }
    case 'sferă': {
      const k = r * 0.78;
      return [
        { t: 'circle', cx, cy, r: k, fill: '#CFE6FB', stroke: INK, strokeWidth: sw },
        arc(cx, cy, k, k * 0.28, 0, Math.PI), arc(cx, cy, k, k * 0.28, Math.PI, 2 * Math.PI, true),
      ];
    }
    case 'con': {
      const rx = r * 0.62;
      const ry = r * 0.2;
      const yb = cy + r * 0.62;
      const apex = { x: cx, y: cy - r * 0.8 };
      return [
        { t: 'polygon', points: [apex, { x: cx + rx, y: yb }, ...Array.from({ length: 13 }, (_, i) => ({ x: cx + rx * Math.cos((i / 12) * Math.PI), y: yb + ry * Math.sin((i / 12) * Math.PI) })), { x: cx - rx, y: yb }], fill: '#CFE6FB' },
        L(apex, { x: cx - rx, y: yb }), L(apex, { x: cx + rx, y: yb }),
        arc(cx, yb, rx, ry, 0, Math.PI), arc(cx, yb, rx, ry, Math.PI, 2 * Math.PI, true),
      ];
    }
  }
}

// ───────────────────────── Laturi, vârfuri, axa de simetrie ─────────────────────────

export interface SidesLayout { rows: { y: number; h: number }[]; cols: { shape: number; name: number; sides: number; corners: number }; tilesTop: number; tiles: { x: number; y: number; w: number; h: number }[] }

export function sidesLayout(top: number): SidesLayout {
  const rowH = 17;
  const headY = top + 9;
  const rows = SIDES_ROWS.map((_, i) => ({ y: headY + 9 + i * rowH, h: rowH }));
  const tilesTop = headY + 9 + SIDES_ROWS.length * rowH + 6;
  const tw = (W - 2 * M - 2 * 6) / 3;
  const th = (BOTTOM - tilesTop - 9 - 6) / 2;
  const tiles = SYMMETRY_TILES.map((_, i) => ({ x: M + (i % 3) * (tw + 6), y: tilesTop + 9 + Math.floor(i / 3) * (th + 6), w: tw, h: th }));
  return { rows, cols: { shape: M, name: M + 34, sides: M + 80, corners: M + 134 }, tilesTop, tiles };
}

function sidesPage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = sidesSet();
  const top = frame(ops, config, MEM_KIND_TITLES.sides, 'Numără laturile și vârfurile fiecărei figuri.', 'Apoi spune dacă linia roșie punctată este o axă de simetrie: încercuiește DA sau NU.');
  const lay = sidesLayout(top);
  heading(ops, top + 6, '1. Câte laturi și câte vârfuri are figura?');
  const headY = lay.rows[0].y - 3;
  ops.push({ t: 'text', x: lay.cols.name, y: headY, text: 'Figura', size: 4, fill: LIGHT, weight: 'bold' });
  ops.push({ t: 'text', x: lay.cols.sides, y: headY, text: 'Laturi', size: 4, fill: LIGHT, weight: 'bold' });
  ops.push({ t: 'text', x: lay.cols.corners, y: headY, text: 'Vârfuri', size: 4, fill: LIGHT, weight: 'bold' });
  set.rows.forEach((r, i) => {
    const row = lay.rows[i];
    const cy = row.y + row.h / 2;
    ops.push({ t: 'line', x1: M, y1: row.y, x2: W - M, y2: row.y, stroke: CELL_STROKE, strokeWidth: 0.4 });
    ops.push(...planeOps(r.shape, lay.cols.shape + 13, cy, row.h - 3, r.look));
    ops.push({ t: 'text', x: lay.cols.name, y: cy + 1.7, text: PLANE_FACTS[r.shape][0], size: 4.8, fill: INK, weight: 'bold' });
    box(ops, lay.cols.sides, cy - 5, 14, 10);
    box(ops, lay.cols.corners, cy - 5, 14, 10);
    if (i === 0) {
      ops.push({ t: 'text', x: lay.cols.sides + 7, y: cy + 2.2, text: String(PLANE_FACTS[r.shape][1]), size: 6, fill: ACCENT, weight: 'bold', align: 'center' });
      exampleTag(ops, lay.cols.sides + 16, cy + 1);
    }
  });
  heading(ops, lay.tilesTop + 4, '2. Este linia roșie punctată o axă de simetrie?');
  set.tiles.forEach((t, i) => {
    const b = lay.tiles[i];
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    const size = Math.min(b.w - 14, b.h - 20);
    const cy = b.y + 4 + size / 2 + 2;
    ops.push(...planeOps(t.shape, b.x + b.w / 2, cy, size));
    ops.push(axisLine(t.shape, t.line, b.x + b.w / 2, cy, size));
    ['DA', 'NU'].forEach((w, k) => {
      const px = b.x + b.w / 2 - 17 + k * 20;
      const py = b.y + b.h - 10;
      ops.push({ t: 'rect', x: px, y: py, w: 14, h: 7, rx: 3.5, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
      ops.push({ t: 'text', x: px + 7, y: py + 5, text: w, size: 4, fill: INK, weight: 'bold', align: 'center' });
    });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Corpuri geometrice ─────────────────────────

export interface SolidLayout {
  /** `order[i]`: the solid drawn at place i (letters A–E). */
  order: Solid[];
  /** `objects[i]`: the solid whose object is drawn at place i. */
  objects: Solid[];
  solidsTop: number;
  objectsTop: number;
  factsTop: number;
  colW: number;
}

export function solidLayout(top: number, variant = currentVariant()): SolidLayout {
  const rand = rng(seedOf(vkey('solid:1', variant)));
  const order = shuffle(SOLIDS, rand);
  let objects = shuffle(SOLIDS, rand);
  while (objects.some((s, i) => s === order[i])) objects = shuffle(SOLIDS, rand);
  return { order, objects, solidsTop: top + 2, objectsTop: top + 2 + 80, factsTop: top + 2 + 80 + 60, colW: (W - 2 * M) / 5 };
}

const LETTERS5 = ['A', 'B', 'C', 'D', 'E'];

function solidPage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, MEM_KIND_TITLES.solid, 'Scrie numele fiecărui corp, apoi litera corpului care are forma obiectului.', 'Liniile punctate sunt muchiile din spate, care nu se văd. Primul răspuns este exemplul.');
  const lay = solidLayout(top);
  heading(ops, lay.solidsTop + 4, '1. Scrie numele corpului. Alege: cub, cuboid, cilindru, sferă, con.');
  lay.order.forEach((s, i) => {
    const cx = M + (i + 0.5) * lay.colW;
    ops.push({ t: 'circle', cx: cx - lay.colW / 2 + 5, cy: lay.solidsTop + 13, r: 3.6, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: cx - lay.colW / 2 + 5, y: lay.solidsTop + 14.5, text: LETTERS5[i], size: 4.2, fill: INK, weight: 'bold', align: 'center' });
    ops.push(...solidOps(s, cx, lay.solidsTop + 38, 30));
    ops.push({ t: 'line', x1: cx - lay.colW / 2 + 4, y1: lay.solidsTop + 66, x2: cx + lay.colW / 2 - 4, y2: lay.solidsTop + 66, stroke: INK, strokeWidth: 0.4 });
    if (i === 0) ops.push({ t: 'text', x: cx, y: lay.solidsTop + 65, text: s, size: 4.6, fill: ACCENT, weight: 'bold', align: 'center' });
  });
  heading(ops, lay.objectsTop + 4, '2. Ce formă are obiectul? Scrie în căsuță litera corpului.');
  lay.objects.forEach((s, i) => {
    const cx = M + (i + 0.5) * lay.colW;
    ops.push(...iconOps(SOLID_OBJECTS[s][0], cx, lay.objectsTop + 21, 20));
    ops.push({ t: 'text', x: cx, y: lay.objectsTop + 36, text: SOLID_OBJECTS[s][1], size: 3.6, fill: '#334155', align: 'center' });
    box(ops, cx - 6, lay.objectsTop + 38, 12, 9);
  });
  heading(ops, lay.factsTop + 4, '3. Numără și scrie.');
  SOLID_FACTS.forEach((f, i) => {
    const x = M + 4 + (i % 2) * ((W - 2 * M) / 2);
    const y = lay.factsTop + 14 + Math.floor(i / 2) * 12;
    sentenceOps(ops, f, x, y, 4.8, 13);
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Modele și regularități ─────────────────────────

const PIC = 11;
const PIC_STEP = 14;

export interface RegularLayout {
  pictureRows: { y: number; box: { x: number; y: number; s: number }; options: { cx: number; cy: number }[] }[];
  numbersTop: number;
  numberRows: { y: number; boxes: { x: number; y: number; w: number; h: number }[]; rule?: { x: number; y: number; w: number; h: number } }[];
  growingTop: number;
  problemTop: number;
}

export function regularLayout(n: number, top: number, variant = currentVariant()): RegularLayout {
  const set = regularSet(n, variant);
  let y = top + 2;
  const pictureRows: RegularLayout['pictureRows'] = [];
  if (set.pictures.length) {
    y += 6;
    set.pictures.forEach((p, i) => {
      const cy = y + 9 + i * 19;
      const bx = M + 4 + p.shown * PIC_STEP;
      pictureRows.push({ y: cy, box: { x: bx, y: cy - 7, s: 14 }, options: [0, 1, 2].map((k) => ({ cx: W - M - 50 + k * 17 + 8, cy })) });
    });
    y += 9 + set.pictures.length * 19;
  }
  const numbersTop = y + 1;
  const numberRows = set.numbers.map((_, i) => {
    const ny = numbersTop + 13 + i * 12;
    const bx = M + 4 + SHOWN_NUMBERS * 19;
    return { y: ny, boxes: [{ x: bx, y: ny - 7, w: 17, h: 9.5 }, { x: bx + 20, y: ny - 7, w: 17, h: 9.5 }], ...(set.withRule ? { rule: { x: W - M - 26, y: ny - 7, w: 24, h: 9.5 } } : {}) };
  });
  const growingTop = numbersTop + 13 + set.numbers.length * 12 + 1;
  const problemTop = set.growing ? growingTop + 62 : growingTop;
  return { pictureRows, numbersTop, numberRows, growingTop, problemTop };
}

function growingOps(kind: 'stairs' | 'sticks', k: number, x: number, bottom: number, u: number): { ops: DrawOp[]; width: number } {
  const ops: DrawOp[] = [];
  if (kind === 'stairs') {
    // figure k: a column of k squares and a row of k squares sharing the corner: 2k − 1
    const sq = (cx: number, cy: number) => ops.push({ t: 'rect', x: cx, y: cy, w: u, h: u, fill: '#FDE3C4', stroke: '#C26A12', strokeWidth: 0.4 });
    for (let i = 0; i < k; i++) sq(x, bottom - (i + 1) * u);
    for (let i = 1; i < k; i++) sq(x + i * u, bottom - u);
    return { ops, width: k * u };
  }
  // figure k: a row of k squares made of sticks: 3k + 1
  const stick = (x1: number, y1: number, x2: number, y2: number) => {
    ops.push({ t: 'line', x1, y1, x2, y2, stroke: '#8D6E63', strokeWidth: 0.9 });
    ops.push({ t: 'circle', cx: x2, cy: y2, r: 0.7, fill: '#D32F2F' });
  };
  for (let i = 0; i < k; i++) {
    const x0 = x + i * u;
    stick(x0, bottom - u, x0 + u, bottom - u);
    stick(x0, bottom, x0 + u, bottom);
    if (i === 0) stick(x0, bottom, x0, bottom - u);
    stick(x0 + u, bottom, x0 + u, bottom - u);
  }
  return { ops, width: k * u };
}

function regularPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = regularSet(n);
  const top = frame(ops, config, MEM_KIND_TITLES.regular, set.level === 'I' ? 'Descoperă regula și continuă.' : 'Descoperă regula, scrie-o și continuă.', 'Primul răspuns este exemplul.');
  const lay = regularLayout(n, top);
  if (set.pictures.length) {
    heading(ops, top + 6, '1. Ce urmează? Încercuiește imaginea care continuă șirul.');
    set.pictures.forEach((p, i) => {
      const row = lay.pictureRows[i];
      for (let k = 0; k < p.shown; k++) ops.push(...iconOps(p.unit[k % p.unit.length], M + 4 + k * PIC_STEP + PIC / 2, row.y, PIC));
      ops.push({ t: 'rect', x: row.box.x, y: row.box.y, w: row.box.s, h: row.box.s, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.5, dash: [1.4, 1] });
      ops.push({ t: 'text', x: row.box.x + row.box.s / 2, y: row.y + 2.4, text: '?', size: 7, fill: LIGHT, weight: 'bold', align: 'center' });
      ops.push({ t: 'line', x1: W - M - 54, y1: row.y - 8, x2: W - M - 54, y2: row.y + 8, stroke: CELL_STROKE, strokeWidth: 0.5 });
      p.options.forEach((o, k) => {
        const c = row.options[k];
        ops.push(...iconOps(o, c.cx, c.cy, PIC));
        if (i === 0 && o === nextPicture(p)) ops.push(exampleRing(c.cx - PIC / 2 - 2.2, c.cy - PIC / 2 - 2.2, PIC + 4.4, PIC + 4.4));
      });
    });
  }
  const numN = set.pictures.length ? 2 : 1;
  heading(ops, lay.numbersTop + 4, set.withRule ? `${numN}. Continuă șirul și scrie regula.` : `${numN}. Continuă șirul de numere.`);
  if (set.withRule) ops.push({ t: 'text', x: W - M - 14, y: lay.numbersTop + 4, text: 'Regula', size: 3.8, fill: LIGHT, weight: 'bold', align: 'center' });
  set.numbers.forEach((p, i) => {
    const row = lay.numberRows[i];
    const all = numberRow(p, SHOWN_NUMBERS + 2);
    for (let k = 0; k < SHOWN_NUMBERS; k++) ops.push({ t: 'text', x: M + 4 + k * 19 + 8, y: row.y, text: `${all[k]}${k < SHOWN_NUMBERS - 1 ? ',' : ','}`, size: 5.2, fill: INK, weight: 'bold', align: 'center' });
    row.boxes.forEach((b, k) => {
      box(ops, b.x, b.y, b.w, b.h);
      if (i === 0) ops.push({ t: 'text', x: b.x + b.w / 2, y: row.y, text: String(all[SHOWN_NUMBERS + k]), size: 5, fill: ACCENT, weight: 'bold', align: 'center' });
    });
    if (row.rule) {
      box(ops, row.rule.x, row.rule.y, row.rule.w, row.rule.h);
      if (i === 0) ops.push({ t: 'text', x: row.rule.x + row.rule.w / 2, y: row.y, text: ruleOf(p), size: 5, fill: ACCENT, weight: 'bold', align: 'center' });
    }
  });
  let k = numN + 1;
  if (set.growing) {
    const g = set.growing;
    const what = g.kind === 'stairs' ? 'pătrățele' : 'bețe';
    heading(ops, lay.growingTop + 4, `${k}. Figurile cresc mereu la fel. Câte ${what} are fiecare figură?`);
    k++;
    const u = g.kind === 'stairs' ? 8 : 12;
    let x = M + 6;
    const bottom = lay.growingTop + 36;
    for (let f = 1; f <= 3; f++) {
      const d = growingOps(g.kind, f, x, bottom, u);
      ops.push(...d.ops);
      ops.push({ t: 'text', x: x + d.width / 2, y: bottom + 6, text: `Figura ${f}`, size: 3.8, fill: '#334155', weight: 'bold', align: 'center' });
      x += d.width + 14;
    }
    // room to draw figure 4
    ops.push({ t: 'rect', x, y: lay.growingTop + 8, w: W - M - x, h: 30, rx: 3, stroke: LIGHT, strokeWidth: 0.4, dash: [1.4, 1] });
    ops.push({ t: 'text', x: x + (W - M - x) / 2, y: bottom + 6, text: 'Desenează figura 4.', size: 3.8, fill: '#334155', weight: 'bold', align: 'center' });
    const sentences: TermSentence[] = g.ask.map((f) => ({ text: `Figura ${f} are {} ${what}.`, answer: String(growingCount(g, f)) }));
    sentences.forEach((s, i) => sentenceOps(ops, s, M + 4 + i * ((W - 2 * M) / 2), lay.growingTop + 52, 4.8, 15));
  }
  const pr = set.problem;
  heading(ops, lay.problemTop + 4, `${k}. Rezolvă problema.`);
  if ('unit' in pr) {
    ops.push({ t: 'text', x: M + 4, y: lay.problemTop + 13, text: pr.text, size: fitSize(pr.text, 4.6, W - 2 * M - 4), fill: INK });
    for (let i = 0; i < 6; i++) ops.push(...iconOps(pr.unit[i % pr.unit.length], M + 10 + i * 13, lay.problemTop + 25, 10));
    ops.push({ t: 'text', x: M + 10 + 6 * 13 - 2, y: lay.problemTop + 27, text: '…', size: 6, fill: INK, weight: 'bold' });
    ops.push({ t: 'text', x: W - M - 58, y: lay.problemTop + 27, text: 'Încercuiește:', size: 4.2, fill: INK, weight: 'bold' });
    pr.options.forEach((o, i) => ops.push(...iconOps(o, W - M - 22 + i * 16, lay.problemTop + 25, 11)));
  } else {
    const [before, after] = pr.text.split('{}');
    const lines = wrapText(before.trim(), 4.6, W - 2 * M - 8);
    lines.forEach((l, i) => ops.push({ t: 'text', x: M + 4, y: lay.problemTop + 13 + i * 7, text: l, size: 4.6, fill: INK }));
    const by = lay.problemTop + 13 + lines.length * 7 + 2;
    ops.push({ t: 'text', x: M + 4, y: by, text: 'Răspuns:', size: 4.6, fill: INK, weight: 'bold' });
    box(ops, M + 26, by - 6.6, 18, 9);
    if (after.trim()) ops.push({ t: 'text', x: M + 46, y: by, text: after.trim(), size: 4.6, fill: INK });
  }
  // the room left: a pattern of the child's own
  const ownTop = lay.problemTop + ('unit' in pr ? 38 : 40);
  if (BOTTOM - ownTop > 30) {
    heading(ops, ownTop + 4, `${k + 1}. Inventează un șir care se repetă și desenează-l. Spune care este regula.`);
    ops.push({ t: 'rect', x: M, y: ownTop + 8, w: W - 2 * M, h: Math.min(40, BOTTOM - ownTop - 8), rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  }
  footer(ops, tier);
  return { width: W, height: H, ops };
}

function wrapText(text: string, size: number, width: number, measure: (t: string, size: number) => number = textRoom): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const cand = line ? `${line} ${word}` : word;
    if (!line || measure(cand, size) <= width) line = cand;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

// ───────────────────────── Sortează după două criterii ─────────────────────────

export interface Sort2Layout {
  /** `order[i]`: the item drawn with number i + 1. */
  order: number[];
  pictures: { cx: number; cy: number; s: number }[];
  table: { x: number; y: number; firstW: number; colW: number; headH: number; rowH: number };
}

export function sort2Layout(n: number, top: number, variant = currentVariant()): Sort2Layout {
  const set = sort2Set(n, variant);
  const order = shuffle(set.items.map((_, i) => i), rng(seedOf(vkey(`sort2:${n}`, variant))));
  const perRow = 5;
  const cw = (W - 2 * M) / perRow;
  const pictures = order.map((_, i) => ({ cx: M + (i % perRow + 0.5) * cw, cy: top + 18 + Math.floor(i / perRow) * 30, s: 20 }));
  const ty = top + 18 + 2 * 30 + 2;
  const firstW = 46;
  const colW = (W - 2 * M - firstW) / set.cols.length;
  const headH = 16;
  const rowH = Math.min(46, (BOTTOM - ty - headH - 4) / set.rows.length);
  return { order, pictures, table: { x: M, y: ty, firstW, colW, headH, rowH } };
}

function sort2Page(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = sort2Set(n);
  const top = frame(ops, config, MEM_KIND_TITLES.sort2, `Scrie numărul fiecărei imagini în căsuța potrivită: după ${set.colTitle} și după ${set.rowTitle}.`, 'Fiecare imagine merge într-o singură căsuță. Primul număr este exemplul.');
  const lay = sort2Layout(n, top);
  lay.order.forEach((k, i) => {
    const it = set.items[k];
    const p = lay.pictures[i];
    ops.push({ t: 'rect', x: p.cx - 16, y: p.cy - 13, w: 32, h: 26, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'circle', cx: p.cx - 12, cy: p.cy - 9, r: 3.2, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.4 });
    ops.push({ t: 'text', x: p.cx - 12, y: p.cy - 7.7, text: String(i + 1), size: 3.8, fill: INK, weight: 'bold', align: 'center' });
    if (it.picture) ops.push(...iconOps(it.picture, p.cx + 2, p.cy + 1, p.s));
    else ops.push(...planeOps(it.shape!, p.cx + 2, p.cy + 1.5, it.big ? 21 : 10, 0, ['#F8BBD0', '#C8E6C9', '#FFE0B2', '#BBDEFB', '#E1BEE7'][i % 5]));
  });
  const t = lay.table;
  const w = t.firstW + t.colW * set.cols.length;
  const h = t.headH + t.rowH * set.rows.length;
  ops.push({ t: 'rect', x: t.x, y: t.y, w, h, rx: 2, fill: PAPER });
  ops.push({ t: 'rect', x: t.x, y: t.y, w, h: t.headH, rx: 2, fill: SOFT });
  ops.push({ t: 'rect', x: t.x, y: t.y, w: t.firstW, h, rx: 2, fill: SOFT });
  set.cols.forEach((c, k) => {
    const x = t.x + t.firstW + k * t.colW;
    ops.push({ t: 'line', x1: x, y1: t.y, x2: x, y2: t.y + h, stroke: INK, strokeWidth: 0.45 });
    ops.push({ t: 'text', x: x + t.colW / 2, y: t.y + t.headH / 2 + 1.6, text: c, size: fitSize(c, 4.4, t.colW - 4), fill: INK, weight: 'bold', align: 'center' });
  });
  set.rows.forEach((r, k) => {
    const y = t.y + t.headH + k * t.rowH;
    ops.push({ t: 'line', x1: t.x, y1: y, x2: t.x + w, y2: y, stroke: INK, strokeWidth: 0.45 });
    ops.push({ t: 'text', x: t.x + t.firstW / 2, y: y + t.rowH / 2 + 1.6, text: r, size: fitSize(r, 4.4, t.firstW - 4), fill: INK, weight: 'bold', align: 'center' });
  });
  ops.push({ t: 'rect', x: t.x, y: t.y, w, h, rx: 2, stroke: INK, strokeWidth: 0.6 });
  // the example: picture 1 written in its cell
  const first = set.items[lay.order[0]];
  ops.push({ t: 'text', x: t.x + t.firstW + first.col * t.colW + 8, y: t.y + t.headH + first.row * t.rowH + 11, text: '1', size: 6, fill: ACCENT, weight: 'bold', align: 'center' });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Plan de lucru ─────────────────────────

export interface PlanLayout { order: number[]; steps: { y: number; h: number }[]; statementsTop: number; statements: number[] }

export function planLayout(n: number, top: number): PlanLayout {
  const set = PLAN_SETS[n - 1];
  const order = derangement(set.steps.length, rng(seedOf(`plan:${n}`)));
  const rowH = 24;
  const steps = order.map((_, i) => ({ y: top + 11 + i * rowH, h: rowH - 3 }));
  const statementsTop = top + 11 + set.steps.length * rowH + 4;
  return { order, steps, statementsTop, statements: set.statements.map((_, i) => statementsTop + 14 + i * 13) };
}

function planPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = PLAN_SETS[n - 1];
  const top = frame(ops, config, `${MEM_KIND_TITLES.plan}: ${set.title}`, 'Scrie în căsuțe ordinea pașilor experimentului: 1, 2, 3, 4.', 'Apoi citește propozițiile și încercuiește A (adevărat) sau F (fals). Căsuța cu 1 este exemplul.');
  const lay = planLayout(n, top);
  heading(ops, top + 6, '1. Ordonează pașii planului de lucru.');
  lay.order.forEach((k, i) => {
    const [picture, text] = set.steps[k];
    const r = lay.steps[i];
    ops.push({ t: 'rect', x: M, y: r.y, w: W - 2 * M, h: r.h, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    box(ops, M + 4, r.y + r.h / 2 - 6, 12, 12);
    if (k === 0) ops.push({ t: 'text', x: M + 10, y: r.y + r.h / 2 + 2.6, text: '1', size: 7, fill: ACCENT, weight: 'bold', align: 'center' });
    ops.push(...iconOps(picture, M + 30, r.y + r.h / 2, r.h - 6));
    ops.push({ t: 'text', x: M + 44, y: r.y + r.h / 2 + 1.7, text, size: fitSize(text, 4.8, W - 2 * M - 48), fill: INK });
  });
  heading(ops, lay.statementsTop + 4, '2. Adevărat sau fals?');
  set.statements.forEach(([text], i) => {
    const y = lay.statements[i];
    ops.push({ t: 'text', x: M + 4, y, text, size: fitSize(text, 4.6, W - 2 * M - 36), fill: INK });
    ['A', 'F'].forEach((w, k) => {
      const px = W - M - 26 + k * 14;
      ops.push({ t: 'circle', cx: px + 4, cy: y - 1.6, r: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
      ops.push({ t: 'text', x: px + 4, y: y, text: w, size: 4.4, fill: INK, weight: 'bold', align: 'center' });
    });
  });
  const drawTop = lay.statements[lay.statements.length - 1] + 8;
  if (BOTTOM - drawTop > 30) {
    heading(ops, drawTop + 4, `3. ${set.draw}`);
    ops.push({ t: 'rect', x: M, y: drawTop + 8, w: W - 2 * M, h: BOTTOM - drawTop - 8, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  }
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Ce se întâmplă dacă…? ─────────────────────────

export interface CauseLayout { order: number[]; rowH: number; top: number; dotL: (i: number) => Pt; dotR: (i: number) => Pt; completeTop: number }

const CAUSE_W = 80;
const CAUSE_SIZE = 4.2;

export function causeLayout(n: number, top: number): CauseLayout {
  const set = CAUSE_SETS[n - 1];
  const order = derangement(set.pairs.length, rng(seedOf(`cause:${n}`)));
  const rowH = 21;
  const t = top + 9;
  return {
    order, rowH, top: t,
    dotL: (i) => ({ x: M + CAUSE_W + 3, y: t + (i + 0.5) * rowH }),
    dotR: (i) => ({ x: W - M - CAUSE_W - 3, y: t + (i + 0.5) * rowH }),
    completeTop: t + set.pairs.length * rowH + 5,
  };
}

/** A text in a box of the matching: one or two lines, vertically centred. */
function boxText(ops: DrawOp[], text: string, x: number, cy: number, width: number): void {
  // measured with Nunito Bold: the regular weight it is printed in is a little narrower
  const lines = wrapText(text, CAUSE_SIZE, width, textW);
  const size = Math.min(CAUSE_SIZE, ...lines.map((l) => Math.min(CAUSE_SIZE, (CAUSE_SIZE * width) / Math.max(1, textW(l, CAUSE_SIZE)))));
  lines.forEach((l, k) => ops.push({ t: 'text', x, y: cy + 1.5 + (k - (lines.length - 1) / 2) * 5.4, text: l, size, fill: INK }));
}

function causePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = CAUSE_SETS[n - 1];
  const top = frame(ops, config, MEM_KIND_TITLES.cause, 'Unește ce se întâmplă cu urmarea lui, apoi completează propozițiile.', 'Prima linie este exemplul.');
  const lay = causeLayout(n, top);
  heading(ops, top + 6, '1. Unește „dacă…” cu „atunci…”.');
  set.pairs.forEach(([picture, cause], i) => {
    const y = lay.top + i * lay.rowH;
    ops.push({ t: 'rect', x: M, y: y + 2, w: CAUSE_W, h: lay.rowH - 4, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(picture, M + 8, y + lay.rowH / 2, 11));
    boxText(ops, cause, M + 16, y + lay.rowH / 2, CAUSE_W - 18);
    const d = lay.dotL(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.3, fill: INK });
  });
  lay.order.forEach((k, i) => {
    const y = lay.top + i * lay.rowH;
    ops.push({ t: 'rect', x: W - M - CAUSE_W, y: y + 2, w: CAUSE_W, h: lay.rowH - 4, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    boxText(ops, `atunci ${set.pairs[k][2]}`, W - M - CAUSE_W + 3, y + lay.rowH / 2, CAUSE_W - 6);
    const d = lay.dotR(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.3, fill: INK });
  });
  const a = lay.dotL(0);
  const b = lay.dotR(lay.order.indexOf(0));
  ops.push(exampleLine(a.x, a.y, b.x, b.y));
  heading(ops, lay.completeTop + 4, '2. Ce se întâmplă? Scrie urmarea. Alege din cuvintele de mai jos.');
  let bx = M + 4;
  for (const w of set.bank) {
    const ww = textRoom(w, 3.8) + 6;
    ops.push({ t: 'rect', x: bx, y: lay.completeTop + 7, w: ww, h: 6.5, rx: 3.2, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: bx + ww / 2, y: lay.completeTop + 11.5, text: w, size: 3.8, fill: INK, weight: 'bold', align: 'center' });
    bx += ww + 3;
  }
  set.complete.forEach((s, i) => {
    const y = lay.completeTop + 24 + i * 12;
    const [before, after] = s.text.split('{}');
    const size = 4.6;
    ops.push({ t: 'text', x: M + 4, y, text: before.trimEnd(), size, fill: INK });
    const lx = M + 4 + textW(before.trimEnd(), size) + 2.5;
    ops.push({ t: 'line', x1: lx, y1: y + 1, x2: lx + 44, y2: y + 1, stroke: INK, strokeWidth: 0.4 });
    if (after.trim() !== '.') ops.push({ t: 'text', x: lx + 45, y, text: after.trim(), size, fill: INK });
  });
  // the room left: a „dacă…, atunci…” of the child's own
  const ownTop = lay.completeTop + 24 + set.complete.length * 12 + 2;
  if (BOTTOM - ownTop > 26) {
    heading(ops, ownTop + 4, '3. Scrie și tu o propoziție cu „dacă…, atunci…”.');
    for (let k = 0; k < 2; k++) ops.push({ t: 'line', x1: M + 4, y1: ownTop + 16 + k * 11, x2: W - M, y2: ownTop + 16 + k * 11, stroke: '#8DA0B8', strokeWidth: 0.35 });
  }
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── grădiniță: forme în jurul nostru ─────────────────────────

export function aroundLayout(top: number): { rows: { cy: number; pic: number; boxes: { x: number; y: number; w: number; h: number }[] }[]; picX: number } {
  const rowH = (BOTTOM - top) / AROUND_ROWS.length;
  const pic = Math.min(22, rowH - 6);
  const picX = M + 9 + pic / 2 + 2;
  const x0 = picX + pic / 2 + 8;
  const cw = (W - M - x0) / 4;
  return {
    picX,
    rows: AROUND_ROWS.map((_, i) => {
      const y = top + i * rowH;
      return { cy: y + rowH / 2, pic, boxes: AROUND_SHAPES.map((_, c) => ({ x: x0 + c * cw + 1.5, y: y + 2, w: cw - 3, h: rowH - 4 })) };
    }),
  };
}

function aroundPage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const rows = aroundRows();
  const top = frame(ops, config, MEM_KIND_TITLES.around, 'Ce formă are fiecare obiect? Încercuiește forma.', 'Spune numele obiectului și al formei. Primul rând este exemplul.');
  const lay = aroundLayout(top + 1);
  const labelSize = Math.min(...AROUND_LABELS.map((l) => fitSize(l, 3.6, lay.rows[0].boxes[0].w - 4)));
  rows.forEach(([picture, , answer], i) => {
    const row = lay.rows[i];
    ops.push({ t: 'circle', cx: M + 4.5, cy: row.cy, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: M + 4.5, y: row.cy + 1.5, text: String(i + 1), size: 4.2, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'rect', x: lay.picX - row.pic / 2 - 2, y: row.cy - row.pic / 2 - 2, w: row.pic + 4, h: row.pic + 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(picture, lay.picX, row.cy, row.pic));
    AROUND_SHAPES.forEach((s, k) => {
      const b = row.boxes[k];
      ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      const size = Math.min(b.w - 8, b.h - labelSize - 6);
      ops.push(...planeOps(s, b.x + b.w / 2, b.y + 2 + size / 2, size, 0, '#FFF3C4'));
      ops.push({ t: 'text', x: b.x + b.w / 2, y: b.y + b.h - 1.8, text: AROUND_LABELS[k], size: labelSize, fill: INK, weight: 'bold', align: 'center' });
      if (i === 0 && k === answer) ops.push(exampleRing(b.x - 1.2, b.y - 1.2, b.w + 2.4, b.h + 2.4));
    });
  });
  adultNote(ops, `Obiectele, de sus în jos: ${rows.map((r) => r[1]).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── grădiniță: pictograma ─────────────────────────

export interface PictLayout {
  scene: { x: number; y: number; w: number; h: number };
  /** Every picture of the scene: the kind (0–2) and where it is. */
  pictures: { kind: number; cx: number; cy: number; s: number }[];
  chart: { x: number; bottom: number; colW: number; sq: number };
  questionsTop: number;
}

export function pictLayout(n: number, top: number, variant = currentVariant()): PictLayout {
  const counts = pictCounts(n, variant);
  const rand = rng(seedOf(vkey(`pict-scene:${n}`, variant)));
  const scene = { x: M, y: top + 2, w: W - 2 * M, h: 70 };
  const cols = 8;
  const rows = 3;
  const cw = scene.w / cols;
  const ch = scene.h / rows;
  const kinds = shuffle(counts.flatMap((c, k) => Array.from({ length: c }, () => k)), rand);
  const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i), rand).slice(0, kinds.length);
  const s = 14;
  const pictures = kinds.map((kind, i) => {
    const c = cells[i];
    const jx = (rand() - 0.5) * (cw - s - 2);
    const jy = (rand() - 0.5) * (ch - s - 2);
    return { kind, cx: scene.x + ((c % cols) + 0.5) * cw + jx, cy: scene.y + (Math.floor(c / cols) + 0.5) * ch + jy, s };
  });
  const sq = 11;
  const colW = 30;
  const chartTop = scene.y + scene.h + 12;
  return { scene, pictures, chart: { x: W / 2 - (3 * colW) / 2 - 20, bottom: chartTop + PICT_MAX * sq, colW, sq }, questionsTop: chartTop + PICT_MAX * sq + 30 };
}

function pictPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const kinds = PICT_KINDS[n - 1];
  const top = frame(ops, config, MEM_KIND_TITLES.pict, 'Numără fiecare fel și colorează câte o căsuță pentru fiecare.', 'Apoi încercuiește răspunsul. Prima căsuță colorată este exemplul.');
  const lay = pictLayout(n, top);
  ops.push({ t: 'rect', x: lay.scene.x, y: lay.scene.y, w: lay.scene.w, h: lay.scene.h, rx: 4, fill: '#F3FAEE', stroke: CELL_STROKE, strokeWidth: 0.5 });
  for (const p of lay.pictures) ops.push(...iconOps(kinds[p.kind][0], p.cx, p.cy, p.s));
  const c = lay.chart;
  kinds.forEach(([picture], k) => {
    const x = c.x + 20 + k * c.colW + (c.colW - c.sq) / 2;
    for (let r = 0; r < PICT_MAX; r++) {
      const y = c.bottom - (r + 1) * c.sq;
      ops.push({ t: 'rect', x, y, w: c.sq, h: c.sq, fill: k === 0 && r === 0 ? '#FCD9B0' : PAPER, stroke: INK, strokeWidth: 0.45 });
    }
    ops.push(...iconOps(picture, x + c.sq / 2, c.bottom + 7, 11));
  });
  ops.push({ t: 'line', x1: c.x + 14, y1: c.bottom, x2: c.x + 20 + 3 * c.colW + 6, y2: c.bottom, stroke: INK, strokeWidth: 0.6 });
  for (let r = 1; r <= PICT_MAX; r++) ops.push({ t: 'text', x: c.x + 12, y: c.bottom - (r - 0.5) * c.sq + 1.4, text: String(r), size: 3.8, fill: LIGHT, weight: 'bold', align: 'right' });
  exampleTag(ops, c.x + 20 + (c.colW + c.sq) / 2 + 2, c.bottom - c.sq / 2 + 1);
  const qs = ['Din care sunt cele mai multe?', 'Din care sunt cele mai puține?'];
  qs.forEach((q, i) => {
    const y = lay.questionsTop + i * 22;
    ops.push({ t: 'text', x: M, y, text: q, size: 4.6, fill: INK, weight: 'bold' });
    kinds.forEach(([picture], k) => ops.push(...iconOps(picture, M + 100 + k * 26, y - 1.6, 13)));
  });
  adultNote(ops, 'Un adult citește întrebările. Copilul numără cu degetul, apoi colorează.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── grădiniță: mai repede, mai cald ─────────────────────────

export function moreLayout(top: number): { rows: { y: number; h: number; boxes: { x: number; y: number; w: number; h: number }[] }[] } {
  const rowH = (BOTTOM - top) / MORE_ROWS.length;
  return {
    rows: MORE_ROWS.map((_, i) => {
      const y = top + i * rowH;
      const bw = 34;
      return { y, h: rowH, boxes: [0, 1].map((k) => ({ x: W - M - 2 * bw - 12 + k * (bw + 10), y: y + 2, w: bw, h: rowH - 4 })) };
    }),
  };
}

function morePage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const rows = moreRows();
  const top = frame(ops, config, MEM_KIND_TITLES.more, 'Ascultă întrebarea și încercuiește imaginea potrivită.', 'Un adult citește întrebările. Primul rând este exemplul.');
  const lay = moreLayout(top + 1);
  rows.forEach(([q, a, b, answer], i) => {
    const row = lay.rows[i];
    const cy = row.y + row.h / 2;
    ops.push({ t: 'circle', cx: M + 4.5, cy, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: M + 4.5, y: cy + 1.5, text: String(i + 1), size: 4.2, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'text', x: M + 12, y: cy + 1.8, text: q, size: fitSize(q, 5, row.boxes[0].x - M - 16), fill: INK, weight: 'bold' });
    [a, b].forEach(([picture], k) => {
      const bx = row.boxes[k];
      ops.push({ t: 'rect', x: bx.x, y: bx.y, w: bx.w, h: bx.h, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(picture, bx.x + bx.w / 2, cy, Math.min(bx.w, bx.h) - 6));
      if (i === 0 && k === answer) ops.push(exampleRing(bx.x - 1.2, bx.y - 1.2, bx.w + 2.4, bx.h + 2.4));
    });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── answers and entry point ─────────────────────────

const LETTER_OF = (lay: SolidLayout, s: Solid) => LETTERS5[lay.order.indexOf(s)];

/** The answers of a „Matematică și explorarea mediului” item. */
export function memKeySection(item: string, variant = currentVariant()): KeySection | null {
  if (!isMemItem(item)) return null;
  const [kind, n] = parts(item);
  const title = memLabel(item);
  switch (kind) {
    case 'terms': {
      const set = termsSet(n, variant);
      return {
        title,
        entries: [
          ...set.labels.map((l) => `${l.tokens.join(' ')}: ${l.words.map((w, k) => (w ? `${l.tokens[k * 2]} – ${w}` : '')).filter(Boolean).join(', ')}`),
          ...set.pictures.map((p) => `${p.a} ${p.op} ${p.b} = ${p.op === '+' ? p.a + p.b : p.a - p.b}`),
          ...set.signs.map((s) => s.tokens.map((t) => (t === '?' ? s.answer : t)).join(' ')),
          ...set.sentences.map((s) => s.text.replace('{}', s.answer)),
        ],
        perLine: 1,
        numbered: true,
      };
    }
    case 'place': {
      const set = placeSet(n, variant);
      return {
        title,
        entries: [
          ...set.blocks.map((v) => `${Math.floor(v / 100)} sute, ${Math.floor((v % 100) / 10)} zeci, ${v % 10} unități = ${v}`),
          ...set.toDigits.map((v) => `${numberWords(v)} = ${v}`),
          ...set.toWords.map((v) => `${v} = ${numberWords(v)}`),
        ],
        perLine: 1,
        numbered: true,
      };
    }
    case 'coord': {
      const set = coordSet(n, variant);
      return {
        title,
        entries: [
          ...set.whatIn.map((k) => `${cellName(set.placed[k].col, set.placed[k].row)}: ${set.placed[k].name}`),
          ...set.whereIs.map((k) => `${set.placed[k].name}: ${cellName(set.placed[k].col, set.placed[k].row)}`),
          ...set.draw.map((d) => `${d.what} în ${cellName(d.col, d.row)}`),
        ],
        perLine: 3,
        numbered: true,
      };
    }
    case 'sides': {
      const set = sidesSet(variant);
      return {
        title,
        entries: [
          ...set.rows.map((r) => `${PLANE_FACTS[r.shape][0]}: ${PLANE_FACTS[r.shape][1]} laturi, ${PLANE_FACTS[r.shape][2]} vârfuri`),
          ...set.tiles.map((t, i) => `figura ${i + 1}: ${t.answer ? 'DA' : 'NU'}`),
        ],
        perLine: 2,
        numbered: true,
      };
    }
    case 'solid': {
      const lay = solidLayout(0, variant);
      return {
        title,
        entries: [
          ...lay.order.map((s, i) => `${LETTERS5[i]} – ${s}`),
          ...lay.objects.map((s) => `${SOLID_OBJECTS[s][1]} – ${LETTER_OF(lay, s)} (${s})`),
          ...SOLID_FACTS.map((f) => f.text.replace('{}', f.answer)),
        ],
        perLine: 2,
        numbered: true,
      };
    }
    case 'regular': {
      const set = regularSet(n, variant);
      const pr = set.problem;
      return {
        title,
        entries: [
          ...set.pictures.map((p) => `urmează: ${nextPicture(p)}`),
          ...set.numbers.map((p) => {
            const all = numberRow(p, SHOWN_NUMBERS + 2);
            return `${all.slice(SHOWN_NUMBERS).join(', ')}${set.withRule ? ` (regula: ${ruleOf(p)})` : ''}`;
          }),
          ...(set.growing ? set.growing.ask.map((f) => `figura ${f}: ${growingCount(set.growing!, f)}`) : []),
          'unit' in pr ? `problema: ${pr.unit[(pr.ask - 1) % pr.unit.length]}` : `problema: ${pr.answer}`,
        ],
        perLine: 2,
        numbered: true,
      };
    }
    case 'sort2': {
      const set = sort2Set(n, variant);
      const lay = sort2Layout(n, 0, variant);
      const entries: string[] = [];
      set.rows.forEach((r, ri) => set.cols.forEach((c, ci) => {
        const nums = lay.order.map((k, i) => ({ it: set.items[k], at: i + 1 })).filter(({ it }) => it.col === ci && it.row === ri);
        entries.push(`${r} / ${c}: ${nums.map(({ it, at }) => `${at} (${it.name})`).join(', ')}`);
      }));
      return { title, entries, perLine: 1 };
    }
    case 'plan': {
      const set = PLAN_SETS[n - 1];
      const lay = planLayout(n, 0);
      return {
        title,
        entries: [
          `De sus în jos: ${lay.order.map((k) => k + 1).join(', ')}`,
          ...set.statements.map(([s, v]) => `${s} – ${v ? 'A' : 'F'}`),
        ],
        perLine: 1,
        numbered: true,
      };
    }
    case 'cause': {
      const set = CAUSE_SETS[n - 1];
      return { title, entries: [...set.pairs.map(([, a, b]) => `${a} ${b}`), ...set.complete.map((s) => s.text.replace('{}', s.answer))], perLine: 1, numbered: true };
    }
    case 'around':
      return { title, entries: aroundRows(variant).map(([, name, k]) => `${name} – ${AROUND_LABELS[k].toLocaleLowerCase('ro')}`), perLine: 2, numbered: true };
    case 'pict': {
      const kinds = PICT_KINDS[n - 1];
      const counts = pictCounts(n, variant);
      const most = counts.indexOf(Math.max(...counts));
      const least = counts.indexOf(Math.min(...counts));
      return { title, entries: [kinds.map(([, name], k) => `${name}: ${counts[k]}`).join(', '), `cele mai multe: ${kinds[most][1]}; cele mai puține: ${kinds[least][1]}`], perLine: 1 };
    }
    case 'more':
      return { title, entries: moreRows(variant).map(([, a, b, k]) => (k === 0 ? a : b)[1]), perLine: 4, numbered: true };
  }
}

/** The page of one item, or null when the item is not one. */
export function buildMemPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isMemItem(item)) return null;
  const [kind, n] = parts(item);
  switch (kind) {
    case 'terms': return termsPage(config, n, tier);
    case 'place': return placePage(config, n, tier);
    case 'coord': return coordPage(config, n, tier);
    case 'sides': return sidesPage(config, tier);
    case 'solid': return solidPage(config, tier);
    case 'regular': return regularPage(config, n, tier);
    case 'sort2': return sort2Page(config, n, tier);
    case 'plan': return planPage(config, n, tier);
    case 'cause': return causePage(config, n, tier);
    case 'around': return aroundPage(config, tier);
    case 'pict': return pictPage(config, n, tier);
    case 'more': return morePage(config, tier);
  }
}
