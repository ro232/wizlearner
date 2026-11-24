import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { INK, MUTED, PAPER, starPoints } from './rows';
import type { KeySection } from './answer-key';
import { CELL_STROKE, SOFT, fitSize } from './page-kit';
import { blockAnswers, blockHeight, blockScore, buildBlocksPage, drawBlock, tw, writeRowsOps, type Block } from './blocks34';
import { DICT_SETS, FUNC_FORMS, R34_KINDS, R34_SETS, R34_TITLES, dictPlain, isR34Item, r34Parts, r34Sheet, ruling, type FuncForm, type Level34, type R34Kind } from './r34';

/**
 * The Limba și literatura română sheets of clasa a III-a and a IV-a (data in r34.ts): one or two pages per item in the
 * „Jocuri” category, made of the blocks of blocks34.ts; the forms of the functional texts and the reading log are drawn here.
 */

export const R34_KIND_TITLES = R34_TITLES;
const LEVEL_TAG = { III: 'clasa a III-a', IV: 'clasa a IV-a' } as const;

export function r34ShortLabel(item: string): string {
  const [kind, n] = r34Parts(item);
  const levels = R34_SETS[kind];
  const level = levels[n - 1];
  const same = levels.filter((l) => l === level).length;
  const k = levels.slice(0, n).filter((l) => l === level).length;
  return same > 1 ? `${LEVEL_TAG[level]} (${k})` : LEVEL_TAG[level];
}

export function r34Label(item: string): string {
  const [kind] = r34Parts(item);
  return `${R34_TITLES[kind]}, ${r34ShortLabel(item)}`;
}

// ───────────────────────── forms ─────────────────────────

/** A form of a functional text: a card with labelled writing lines (on the class's ruling) and a box to draw in. */
function formOps(ops: DrawOp[], f: FuncForm, level: Level34, x: number, y: number, w: number, h: number): void {
  const r = ruling(level);
  ops.push({ t: 'rect', x, y, w, h, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
  if (f.layout === 'invitation' || f.layout === 'poster') ops.push({ t: 'rect', x: x + 1.6, y: y + 1.6, w: w - 3.2, h: h - 3.2, rx: 3, stroke: '#F4A259', strokeWidth: 0.5, dash: [2, 1.4] });
  const drawH = drawHeight(f);
  let cy = y + 7;
  const left = x + 7;
  const inner = w - 14;
  // the poster: the drawing first, then the words; the invitation: the words, then the drawing
  const drawBox = (top: number) => {
    ops.push({ t: 'rect', x: left, y: top, w: inner, h: drawH - 4, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: left + 3, y: top + 5, text: f.draw!, size: fitSize(f.draw!, 3.3, inner - 6), fill: MUTED });
  };
  if (f.layout === 'poster' && f.draw) {
    drawBox(cy);
    cy += drawH;
  }
  for (const field of f.fields) {
    ops.push({ t: 'text', x: left, y: cy + 4, text: field.label, size: 4, fill: INK, weight: 'bold' });
    if (!field.lines) {
      cy += 9;
      continue;
    }
    if (isShort(field)) {
      // one line, next to its label
      const lx = left + tw(field.label, 4) + 3;
      ops.push({ t: 'line', x1: lx, y1: cy + 5, x2: x + w - 7, y2: cy + 5, stroke: '#8DA0B8', strokeWidth: 0.3 });
      cy += 10;
    } else {
      writeRowsOps(ops, r, left, cy + 6, inner, field.lines);
      cy += fieldHeight(field, level);
    }
  }
  if (f.layout === 'invitation' && f.draw) drawBox(Math.min(cy + 2, y + h - drawH));
}

const FORM_INNER = 210 - 24 - 14;
const isShort = (field: FuncForm['fields'][number]) => field.lines === 1 && tw(field.label, 4) < FORM_INNER * 0.42;
const drawHeight = (f: FuncForm) => (f.draw ? (f.layout === 'poster' ? 62 : 48) : 0);
function fieldHeight(field: FuncForm['fields'][number], level: Level34): number {
  if (!field.lines) return 9;
  if (isShort(field)) return 10;
  return 6 + field.lines * (ruling(level) === 'II' ? 18 : 8) + 5;
}

/** The height of a form: its fields, the drawing box, the margins (as formOps lays them out). */
function formHeight(f: FuncForm, level: Level34): number {
  return 7 + f.fields.reduce((s, field) => s + fieldHeight(field, level), 0) + (f.draw ? drawHeight(f) + 2 : 0) + 4;
}

/** The reading log of clasa a IV-a: a table of seven days. */
function journalOps(ops: DrawOp[], x: number, y: number, w: number, h: number): void {
  const cols = [['Ziua', 0.16], ['Ce am citit (titlul)', 0.38], ['Câte pagini', 0.14], ['Mi-a plăcut?', 0.32]] as const;
  const rows = 7;
  const head = 9;
  const rh = (h - head - 2) / rows;
  ops.push({ t: 'rect', x, y, w, h: head + rows * rh, rx: 1.5, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  let cx = x;
  cols.forEach(([label, share], k) => {
    if (k) ops.push({ t: 'line', x1: cx, y1: y, x2: cx, y2: y + head + rows * rh, stroke: INK, strokeWidth: 0.35 });
    ops.push({ t: 'text', x: cx + (w * share) / 2, y: y + 6, text: label, size: fitSize(label, 3.8, w * share - 2), fill: INK, weight: 'bold', align: 'center' });
    cx += w * share;
  });
  const days = ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'];
  for (let r = 0; r < rows; r++) {
    const ry = y + head + r * rh;
    ops.push({ t: 'line', x1: x, y1: ry, x2: x + w, y2: ry, stroke: r ? CELL_STROKE : INK, strokeWidth: r ? 0.3 : 0.4 });
    ops.push({ t: 'text', x: x + 2.5, y: ry + rh / 2 + 1.3, text: days[r], size: 3.6, fill: INK });
    // three faces to circle in the last column: ☺ as words, the font has no faces
    const fx = x + w * 0.68;
    ['da', 'puțin', 'nu'].forEach((o, k) => {
      const px = fx + 3 + k * ((w * 0.32 - 4) / 3);
      ops.push({ t: 'rect', x: px, y: ry + rh / 2 - 3, w: tw(o, 3.4) + 4, h: 6, rx: 3, fill: PAPER, stroke: '#94A3B8', strokeWidth: 0.35 });
      ops.push({ t: 'text', x: px + 2, y: ry + rh / 2 + 1.2, text: o, size: 3.4, fill: INK });
    });
  }
}

/** The blocks of a page, with the drawings of the forms, the reading card and the journal. */
function withDrawings(kind: R34Kind, n: number, level: Level34, blocks: Block[]): Block[] {
  if (kind === 'func') {
    const forms = FUNC_FORMS[n - 1];
    return blocks.map((b, i) => (b.t === 'draw' ? { ...b, height: formHeight(forms[i], level), draw: (ops: DrawOp[], x: number, y: number, w: number, h: number) => formOps(ops, forms[i], level, x, y, w, h) } : b));
  }
  if (kind === 'carte') {
    return blocks.map((b) => {
      if (b.t !== 'draw') return b;
      if (n === 2) return { ...b, draw: journalOps };
      return {
        ...b,
        draw: (ops: DrawOp[], x: number, y: number, w: number, h: number) => {
          ops.push({ t: 'rect', x, y, w: w - 70, h: h - 2, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
          for (let i = 0; i < 5; i++) ops.push({ t: 'polygon', points: starPoints(x + w - 64 + i * 12.5 + 6, y + h / 2, 5.2), stroke: '#D97706', strokeWidth: 0.5, fill: PAPER });
        },
      };
    });
  }
  return blocks;
}

export interface R34BuiltPage { blocks: Block[]; title: string; instruction: string; help?: string; note?: string; teacher?: boolean }

/** The pages of an item with their drawings. */
export function r34Pages(item: string): R34BuiltPage[] {
  const [kind, n] = r34Parts(item);
  const sheet = r34Sheet(item);
  return sheet.pages.map((p) => ({ ...p, blocks: withDrawings(kind, n, sheet.level, p.blocks) }));
}

export function buildR34Pages(config: WorksheetConfig, item: string, tier: Tier): PageOps[] | null {
  if (!isR34Item(item)) return null;
  return r34Pages(item).map((p) => buildBlocksPage(config, tier, p));
}

/** The answers of an item: the tasks numbered as on its pages (open answers say so; the dictation's text is given). */
export function r34KeySection(item: string): KeySection | null {
  if (!isR34Item(item)) return null;
  const [kind, n] = r34Parts(item);
  // the compositions, the forms and the reading card have no answers to check
  if (kind === 'comp' || kind === 'func' || kind === 'carte') return null;
  const entries: string[] = [];
  r34Pages(item).forEach((p, pi, all) => {
    if (p.teacher) return;
    let k = 0;
    for (const b of p.blocks) {
      if (b.t === 'text') continue;
      k++;
      const prefix = all.filter((x) => !x.teacher).length > 1 ? `p. ${pi + 1}, ${k}.` : `${k}.`;
      for (const a of blockAnswers(b)) if (a.replace(/^[a-z]\)\s*|^\d+\)\s*/, '').trim()) entries.push(`${prefix} ${a}`);
    }
  });
  if (kind === 'dict') entries.unshift(`Textul dictării: ${DICT_SETS[n - 1].sentences.map(dictPlain).join(' ')}`);
  if (!entries.length) return null;
  return { title: r34Label(item), entries, perLine: 1 };
}

/** The block an evaluation takes from an item (the same shape as evaluation.ts EvalBlock). */
export interface R34EvalBlock {
  item: string;
  title: string;
  prompt: string;
  height: number;
  grow: number;
  draw: (ops: DrawOp[], a: { x: number; y: number; w: number; h: number }) => void;
  answers: string[];
  perLine: number;
  score: number;
}

/** Which page and task of each kind an evaluation uses (lect: the text with its detail questions, as one block). */
const EVAL_PICK: Partial<Record<R34Kind, { page: number; block: number; take?: number }>> = {
  orto: { page: 0, block: 0, take: 6 }, parti: { page: 0, block: 1 }, punct: { page: 0, block: 0, take: 4 }, voc: { page: 0, block: 1, take: 3 },
};

export function r34EvalBlocks(item: string, w: number): R34EvalBlock[] {
  if (!isR34Item(item)) return [];
  const [kind] = r34Parts(item);
  const pages = r34Pages(item);
  const title = R34_TITLES[kind];
  /** One evaluation item: the first part without its heading (the prompt says it), the next ones with theirs. */
  const one = (parts: Block[], prompt: string): R34EvalBlock => {
    const shown = parts.map((b, i) => (i === 0 && 'heading' in b ? ({ ...b, heading: '' } as Block) : b));
    const heights = shown.map((b) => blockHeight(b, w) + 3);
    const answers = parts.flatMap(blockAnswers);
    return {
      item, title, prompt,
      height: heights.reduce((s, h) => s + h, 0),
      grow: 4,
      draw: (ops, a) => {
        let y = a.y;
        shown.forEach((b, i) => {
          drawBlock(ops, b, a.x, y, a.w, heights[i] - 3, i > 0 || b.t === 'text');
          y += heights[i];
        });
      },
      answers,
      perLine: Math.max(...answers.map((x) => x.length)) > 34 ? 1 : 2,
      score: Math.max(1, parts.reduce((s, b) => s + blockScore(b), 0)),
    };
  };
  if (kind === 'lect') {
    // the text, its detail questions and the true / false sentences: one item
    const [text, details, tf] = pages[0].blocks;
    return [one([text, details, tf], 'Citește textul, apoi răspunde la întrebări.')];
  }
  const pick = EVAL_PICK[kind];
  if (!pick) return [];
  let b = pages[pick.page].blocks[pick.block];
  if (!b || !('heading' in b)) return [];
  if (pick.take && (b.t === 'choice' || b.t === 'fill') && b.items.length > pick.take) b = { ...b, items: b.items.slice(0, pick.take) } as Block;
  // a table keeps its word bank above it: the text it is taken from is not printed, the words are enough
  return [one([b], 'heading' in b ? b.heading ?? '' : '')];
}

export function r34Items(): string[] {
  return R34_KINDS.flatMap((k) => R34_SETS[k].map((_, i) => `${k}:${i + 1}`));
}

export { INK };
