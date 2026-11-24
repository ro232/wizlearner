import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { INK, PAPER, guideOps, starPoints } from './rows';
import type { KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, H, M, SOFT, W, adultNote, derangement, exampleLine, exampleRing, exampleTag, fitSize, footer, frame, rng, seedOf, shuffle, textRoom } from './page-kit';
import {
  CLR_KINDS, CLR_SETS, DRAWN_SIGNS, MESSAGE_SETS, NOTE_SETS, SIGN_CONTEXT, SIGN_MATCH_SETS, STORIES, WRITTEN_SETS, isClrItem,
  type ClrKind, type DrawnSign, type Panel,
} from './clr';

/**
 * The „Comunicare” sheets that fill the gaps of the programme: full pages in the „Jocuri” category
 * (see activities.ts), seeded by the item, so the preview and the PDF are the same every time.
 *
 * - "story:1–4"   Povestea în imagini: four panels in a shuffled order, a box in each for its number,
 *                 the right title to circle among three;
 * - "sign:1–2"    Semne și simboluri: join each sign with its meaning; "sign:3": a sign in a known
 *                 context, the answer to circle;
 * - "note:1–3"    Felicitarea, biletul, invitația: a card with the message and the blanks to write in;
 * - "msg:1–3"     Citește mesajul: an invitation, a poster, a note, and four questions;
 * - "written:1–2" Unde este ceva scris?: twelve cards, circle those with writing.
 *
 * The layouts are computed by exported functions, which the tests and the answers page read.
 */

export const CLR_KIND_TITLES: Record<ClrKind, string> = {
  story: 'Povestea în imagini',
  sign: 'Semne și simboluri',
  note: 'Scriu un mesaj',
  msg: 'Citește mesajul',
  written: 'Unde este ceva scris?',
};

/** Every item, in picker order. */
export function clrItems(): string[] {
  return CLR_KINDS.flatMap((k) => Array.from({ length: CLR_SETS[k] }, (_, i) => `${k}:${i + 1}`));
}

const parts = (item: string): [ClrKind, number] => {
  const [k, n] = item.split(':');
  return [k as ClrKind, Number(n)];
};

/** The class each set of „Semne și simboluri” is written for. */
export const SIGN_SET_LEVELS = ['CP', 'I', 'II'] as const;

/** The name of the item in the picker („Felicitarea”, „Afișul”, „CP”). */
export function clrShortLabel(item: string): string {
  const [kind, n] = parts(item);
  if (kind === 'note') return NOTE_SETS[n - 1].title;
  if (kind === 'msg') return MESSAGE_SETS[n - 1].title;
  if (kind === 'sign') return ['clasa pregătitoare', 'clasa I', 'clasa a II-a'][n - 1];
  if (kind === 'story') return ['Sămânța', 'Zăpada', 'Puiul', 'Ploaia'][n - 1];
  return `Setul ${n}`;
}

/** The name of the item in the lists and on the answers page. */
export function clrLabel(item: string): string {
  const [kind, n] = parts(item);
  if (kind === 'note' || kind === 'msg') return `${CLR_KIND_TITLES[kind]}: ${clrShortLabel(item).toLocaleLowerCase('ro')}`;
  return `${CLR_KIND_TITLES[kind]} (${n})`;
}

// ───────────────────────── Povestea în imagini ─────────────────────────

const PANEL_W = 100;
const PANEL_H = 70;
const POSITIONS = ['sus, în stânga', 'sus, în dreapta', 'jos, în stânga', 'jos, în dreapta'];

export interface StoryLayout {
  /** `order[i]`: the index in the story of the panel drawn at place i (reading order). */
  order: number[];
  panels: { x: number; y: number; w: number; h: number; box: { x: number; y: number; s: number } }[];
  /** `titles[i]`: the index in Story.titles of the title drawn at place i (0 is the right one). */
  titles: number[];
  titleBoxes: { x: number; y: number; w: number; h: number }[];
  titleTop: number;
}

export function storyLayout(n: number, top: number): StoryLayout {
  const rand = rng(seedOf(`story:${n}`));
  const order = derangement(4, rand);
  const titles = shuffle([0, 1, 2], rand);
  const gap = 8;
  const w = (W - 2 * M - gap) / 2;
  const h = (w * PANEL_H) / PANEL_W;
  const panels = order.map((_, i) => {
    const x = M + (i % 2) * (w + gap);
    const y = top + 3 + Math.floor(i / 2) * (h + gap);
    return { x, y, w, h, box: { x: x + 3, y: y + 3, s: 12 } };
  });
  const titleTop = top + 3 + 2 * h + gap + 6;
  const tw = (W - 2 * M - 2 * 6) / 3;
  const titleBoxes = titles.map((_, i) => ({ x: M + i * (tw + 6), y: titleTop + 7, w: tw, h: 16 }));
  return { order, panels, titles, titleBoxes, titleTop };
}

const SKY = '#EAF4FB';
const GROUND: Record<Panel['ground'], string> = { grass: '#A9D98B', snow: '#FFFFFF', soil: '#C9A27C' };

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28): Pt[] {
  return Array.from({ length: n }, (_, i) => ({ x: cx + rx * Math.cos((i / n) * 2 * Math.PI), y: cy + ry * Math.sin((i / n) * 2 * Math.PI) }));
}

function panelOps(p: Panel, x: number, y: number, w: number): DrawOp[] {
  const s = w / PANEL_W;
  const h = PANEL_H * s;
  const at = (px: number, py: number) => ({ x: x + px * s, y: y + py * s });
  const ops: DrawOp[] = [{ t: 'rect', x, y, w, h, rx: 3, fill: SKY }];
  const g = 56;
  const ground: Pt[] = [at(0, g), ...Array.from({ length: 11 }, (_, i) => at(i * 10, g + 1.2 * Math.sin(i * 1.7))), at(100, g), at(100, PANEL_H - 1), at(0, PANEL_H - 1)];
  ops.push({ t: 'polygon', points: ground, fill: GROUND[p.ground], stroke: p.ground === 'snow' ? '#B0BEC5' : undefined, strokeWidth: 0.3 });
  for (const e of p.extras ?? []) {
    if (e.kind === 'puddle') ops.push({ t: 'polygon', points: ellipse(at(e.x, e.y).x, at(e.x, e.y).y, e.s * s, e.s * 0.22 * s), fill: '#9FD3F7', stroke: '#5DADE2', strokeWidth: 0.3 });
    if (e.kind === 'snowball') ops.push({ t: 'circle', cx: at(e.x, e.y).x, cy: at(e.x, e.y).y, r: e.s * s, fill: '#FFFFFF', stroke: '#90A4AE', strokeWidth: 0.4 });
    if (e.kind === 'flakes') {
      for (const [fx, fy] of [[14, 34], [30, 44], [46, 32], [62, 46], [78, 36], [90, 48], [22, 50], [56, 40], [70, 28], [38, 52]]) {
        const c = at(fx, fy);
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          ops.push({ t: 'line', x1: c.x - 1.4 * Math.cos(a), y1: c.y - 1.4 * Math.sin(a), x2: c.x + 1.4 * Math.cos(a), y2: c.y + 1.4 * Math.sin(a), stroke: '#7FA7C9', strokeWidth: 0.3 });
        }
      }
    }
  }
  for (const pc of p.pics) ops.push(...iconOps(pc.e, at(pc.x, pc.y).x, at(pc.x, pc.y).y, pc.s * s));
  ops.push({ t: 'rect', x, y, w, h, rx: 3, stroke: INK, strokeWidth: 0.5 });
  return ops;
}

function storyPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const story = STORIES[n - 1];
  const top = frame(ops, config, CLR_KIND_TITLES.story, 'Scrie în fiecare căsuță ce se întâmplă întâi, apoi, la sfârșit: 1, 2, 3, 4.', 'Privește imaginile și spune povestea. Căsuța cu 1 este exemplul.');
  const lay = storyLayout(n, top);
  lay.panels.forEach((pl, i) => {
    ops.push(...panelOps(story.panels[lay.order[i]], pl.x, pl.y, pl.w));
    ops.push({ t: 'rect', x: pl.box.x, y: pl.box.y, w: pl.box.s, h: pl.box.s, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
    if (lay.order[i] === 0) {
      ops.push({ t: 'text', x: pl.box.x + pl.box.s / 2, y: pl.box.y + pl.box.s / 2 + 2.6, text: '1', size: 7.2, fill: '#E8913A', weight: 'bold', align: 'center' });
      exampleTag(ops, pl.box.x + pl.box.s / 2, pl.box.y + pl.box.s + 3.6, 'center');
    }
  });
  ops.push({ t: 'text', x: M, y: lay.titleTop + 2, text: 'Încercuiește titlul potrivit pentru poveste.', size: 4.4, fill: INK, weight: 'bold' });
  lay.titleBoxes.forEach((b, i) => {
    const t = story.titles[lay.titles[i]];
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: b.h / 2, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: b.x + b.w / 2, y: b.y + b.h / 2 + 1.6, text: t, size: fitSize(t, 4.6, b.w - 6), fill: INK, weight: 'bold', align: 'center' });
  });
  // the room left: the end of the story, drawn by the child
  const drawTop = lay.titleBoxes[0].y + lay.titleBoxes[0].h + 8;
  if (BOTTOM - drawTop > 30) {
    ops.push({ t: 'text', x: M, y: drawTop + 3, text: 'Ce s-a întâmplat apoi? Desenează.', size: 4.4, fill: INK, weight: 'bold' });
    ops.push({ t: 'rect', x: M, y: drawTop + 7, w: W - 2 * M, h: BOTTOM - drawTop - 7, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  }
  adultNote(ops, 'Un adult citește titlurile. Copilul spune ce vede în fiecare imagine, apoi povestea, în ordine.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── signs, drawn ─────────────────────────

const RED = '#D32F2F';
const BLUE = '#1565C0';
const GREEN = '#2E7D32';

/** A stick figure walking (or running) to the right, `h` mm tall, feet at (x, y). */
function walker(x: number, y: number, h: number, color: string, running = false): DrawOp[] {
  const u = h / 10;
  const sw = 0.95 * u;
  const L = (x1: number, y1: number, x2: number, y2: number): DrawOp => ({ t: 'line', x1: x + x1 * u, y1: y - y1 * u, x2: x + x2 * u, y2: y - y2 * u, stroke: color, strokeWidth: sw });
  const lean = running ? 1.2 : 0.4;
  return [
    { t: 'circle', cx: x + (0.9 + lean) * u, cy: y - 9 * u, r: 1.05 * u, fill: color },
    L(0.6 + lean, 7.6, 0.3, 4.2),
    L(0.3, 4.2, running ? 2.8 : 1.9, 2.2), L(running ? 2.8 : 1.9, 2.2, running ? 2.6 : 2.2, 0),
    L(0.3, 4.2, running ? -2.2 : -1.2, 2.1), L(running ? -2.2 : -1.2, 2.1, running ? -3.2 : -1.8, 0.4),
    L(0.5 + lean, 7, running ? 3.1 : 2.2, 5.2), L(0.5 + lean, 7, running ? -1.8 : -1.1, 5.1),
  ];
}

function octagon(cx: number, cy: number, r: number): Pt[] {
  return Array.from({ length: 8 }, (_, i) => ({ x: cx + r * Math.cos(((i + 0.5) * Math.PI) / 4), y: cy + r * Math.sin(((i + 0.5) * Math.PI) / 4) }));
}

/** A sign, `size` mm across, centred on (cx, cy): drawn (DRAWN_SIGNS) or a Twemoji picture. */
export function signOps(sign: string, cx: number, cy: number, size: number): DrawOp[] {
  if (!(DRAWN_SIGNS as readonly string[]).includes(sign)) return iconOps(sign, cx, cy, size);
  const id = sign as DrawnSign;
  const r = size / 2;
  const x = cx - r;
  const y = cy - r;
  switch (id) {
    case 'stop':
      return [
        { t: 'polygon', points: octagon(cx, cy, r), fill: RED, stroke: '#9A1B1B', strokeWidth: 0.3 },
        { t: 'polygon', points: octagon(cx, cy, r * 0.88), stroke: PAPER, strokeWidth: r * 0.05 },
        { t: 'text', x: cx, y: cy + size * 0.1, text: 'STOP', size: size * 0.27, fill: PAPER, weight: 'bold', align: 'center' },
      ];
    case 'crossing': {
      const tri = [{ x: cx, y: y + size * 0.12 }, { x: x + size * 0.9, y: y + size * 0.86 }, { x: x + size * 0.1, y: y + size * 0.86 }];
      const ops: DrawOp[] = [
        { t: 'rect', x, y, w: size, h: size, rx: size * 0.08, fill: BLUE },
        { t: 'polygon', points: tri, fill: PAPER },
      ];
      // the zebra under the walker
      for (let k = 0; k < 4; k++) ops.push({ t: 'rect', x: cx - size * 0.3 + k * size * 0.16, y: y + size * 0.74, w: size * 0.09, h: size * 0.06, fill: INK });
      ops.push(...walker(cx - size * 0.02, y + size * 0.72, size * 0.46, INK));
      return ops;
    }
    case 'hospital':
      return [
        { t: 'rect', x, y, w: size, h: size, rx: size * 0.08, fill: BLUE },
        { t: 'text', x: cx, y: cy + size * 0.24, text: 'H', size: size * 0.7, fill: PAPER, weight: 'bold', align: 'center' },
      ];
    case 'metro':
      return [
        { t: 'rect', x, y, w: size, h: size, rx: size * 0.08, fill: BLUE },
        { t: 'text', x: cx, y: cy + size * 0.24, text: 'M', size: size * 0.7, fill: PAPER, weight: 'bold', align: 'center' },
      ];
    case 'exit': {
      const h = size * 0.7;
      const ops: DrawOp[] = [
        { t: 'rect', x, y: cy - h / 2, w: size, h, rx: size * 0.06, fill: GREEN },
        // the open door, on the right
        { t: 'rect', x: x + size * 0.66, y: cy - h * 0.36, w: size * 0.22, h: h * 0.72, stroke: PAPER, strokeWidth: size * 0.035 },
        { t: 'polygon', points: [{ x: x + size * 0.66, y: cy - h * 0.36 }, { x: x + size * 0.76, y: cy - h * 0.3 }, { x: x + size * 0.76, y: cy + h * 0.42 }, { x: x + size * 0.66, y: cy + h * 0.36 }], fill: PAPER },
      ];
      ops.push(...walker(x + size * 0.36, cy + h * 0.34, h * 0.68, PAPER, true));
      // the arrow to the door
      ops.push({ t: 'line', x1: x + size * 0.08, y1: cy - h * 0.3, x2: x + size * 0.26, y2: cy - h * 0.3, stroke: PAPER, strokeWidth: size * 0.04 });
      ops.push({ t: 'polygon', points: [{ x: x + size * 0.25, y: cy - h * 0.38 }, { x: x + size * 0.33, y: cy - h * 0.3 }, { x: x + size * 0.25, y: cy - h * 0.22 }], fill: PAPER });
      return ops;
    }
    case 'pharmacy': {
      const a = size * 0.13;
      const b = size * 0.36;
      return [
        { t: 'rect', x, y, w: size, h: size, rx: size * 0.08, fill: PAPER, stroke: GREEN, strokeWidth: size * 0.03 },
        { t: 'polygon', points: [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]].map(([px, py]) => ({ x: cx + px, y: cy + py })), fill: '#43A047' },
      ];
    }
    case 'electric': {
      const tri = [{ x: cx, y: y + size * 0.06 }, { x: x + size * 0.98, y: y + size * 0.9 }, { x: x + size * 0.02, y: y + size * 0.9 }];
      const bolt = [[0.04, -0.2], [-0.12, 0.08], [0, 0.08], [-0.06, 0.32], [0.14, 0.0], [0.02, 0.0], [0.1, -0.2]].map(([px, py]) => ({ x: cx + px * size, y: cy + 0.1 * size + py * size }));
      return [
        { t: 'polygon', points: tri, fill: '#FFD600', stroke: INK, strokeWidth: size * 0.04 },
        { t: 'polygon', points: bolt, fill: INK },
      ];
    }
  }
}

// ───────────────────────── join the sign with its meaning (CP, I) ─────────────────────────

export interface SignMatchLayout {
  /** `order[i]`: the sign whose meaning is on row i, right. */
  order: number[];
  rowH: number;
  top: number;
  dotL: (i: number) => Pt;
  dotR: (i: number) => Pt;
}

export function signMatchLayout(n: number, top: number): SignMatchLayout {
  const rows = SIGN_MATCH_SETS[n - 1].length;
  const rowH = (BOTTOM - top - 2) / rows;
  const order = derangement(rows, rng(seedOf(`sign:${n}`)));
  const cardW = 74;
  return {
    order,
    rowH,
    top: top + 2,
    dotL: (i) => ({ x: M + 44, y: top + 2 + (i + 0.5) * rowH }),
    dotR: (i) => ({ x: W - M - cardW - 5, y: top + 2 + (i + 0.5) * rowH }),
  };
}

function signMatchPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = SIGN_MATCH_SETS[n - 1];
  const top = frame(ops, config, CLR_KIND_TITLES.sign, 'Unește fiecare semn cu ce înseamnă.', n === 1 ? 'Un adult citește cuvintele, dacă este nevoie. Prima linie este exemplul.' : 'Citește ce înseamnă fiecare semn. Prima linie este exemplul.');
  const lay = signMatchLayout(n, top);
  const pic = Math.min(28, lay.rowH - 10);
  const cardW = 74;
  const cardX = W - M - cardW;
  const size = Math.min(...set.map(([, w]) => fitSize(w, n === 1 ? 6 : 5.4, cardW - 8)));
  set.forEach(([sign], i) => {
    const cy = lay.top + (i + 0.5) * lay.rowH;
    ops.push({ t: 'rect', x: M + 20 - pic / 2 - 3, y: cy - pic / 2 - 3, w: pic + 6, h: pic + 6, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...signOps(sign, M + 20, cy, pic));
    const d = lay.dotL(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  lay.order.forEach((k, i) => {
    const word = set[k][1];
    const cy = lay.top + (i + 0.5) * lay.rowH;
    const h = Math.min(18, lay.rowH - 10);
    ops.push({ t: 'rect', x: cardX, y: cy - h / 2, w: cardW, h, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: cardX + cardW / 2, y: cy + size * 0.36, text: word, size, fill: INK, weight: 'bold', align: 'center' });
    const d = lay.dotR(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  const a = lay.dotL(0);
  const b = lay.dotR(lay.order.indexOf(0));
  ops.push(exampleLine(a.x, a.y, b.x, b.y));
  exampleTag(ops, a.x + 3, a.y - 2.5);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── a sign in a context (clasa a II-a) ─────────────────────────

const LETTERS = ['a', 'b', 'c'];

export interface ContextRow { y: number; h: number; sign: { cx: number; cy: number; size: number }; options: { x: number; y: number }[] }

export function signContextLayout(top: number): ContextRow[] {
  const rows = SIGN_CONTEXT.length;
  const h = (BOTTOM - top - 2) / rows;
  return SIGN_CONTEXT.map((_, i) => {
    const y = top + 2 + i * h;
    const size = Math.min(26, h - 8);
    return { y, h, sign: { cx: M + 4 + size / 2, cy: y + h / 2, size }, options: [0, 1, 2].map((k) => ({ x: M + size + 16, y: y + 13 + k * 6.6 })) };
  });
}

function signContextPage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, CLR_KIND_TITLES.sign, 'Privește semnul, citește întrebarea și încercuiește răspunsul potrivit.', 'Fiecare întrebare are un singur răspuns potrivit. Primul răspuns încercuit este exemplul.');
  const lay = signContextLayout(top);
  SIGN_CONTEXT.forEach((q, i) => {
    const row = lay[i];
    if (i > 0) ops.push({ t: 'line', x1: M, y1: row.y, x2: W - M, y2: row.y, stroke: CELL_STROKE, strokeWidth: 0.4 });
    ops.push(...signOps(q.sign, row.sign.cx, row.sign.cy, row.sign.size));
    const qx = row.options[0].x - 4;
    const label = `${i + 1}. ${q.q}`;
    ops.push({ t: 'text', x: qx, y: row.y + 6.5, text: label, size: fitSize(label, 4.4, W - M - qx), fill: INK, weight: 'bold' });
    q.options.forEach((o, k) => {
      const p = row.options[k];
      ops.push({ t: 'circle', cx: p.x + 2.4, cy: p.y - 1.5, r: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: p.x + 2.4, y: p.y, text: LETTERS[k], size: 4, fill: INK, weight: 'bold', align: 'center' });
      ops.push({ t: 'text', x: p.x + 8, y: p.y, text: o, size: fitSize(o, 4.2, W - M - p.x - 8), fill: INK });
      if (i === 0 && k === q.answer) ops.push(exampleRing(p.x - 1.2, p.y - 5.2, textRoom(o, 4.2) + 12, 7.4));
    });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Felicitarea, biletul, invitația (CP) ─────────────────────────

/** mm per glyph unit of the writing blanks: capitals 10 mm tall, as on the CP copying sheets. */
const NOTE_S = 0.1;
const NOTE_SIZE = 5.6;
const BLANK: Record<'name' | 'bank', number> = { name: 50, bank: 46 };

export interface NoteLayout {
  card: { x: number; y: number; w: number; h: number };
  /** Each line's baseline and its pieces: printed text at x, or a blank from x, `w` wide. */
  lines: { baseline: number; pieces: ({ text: string; x: number } | { blank: 'name' | 'bank'; x: number; w: number })[] }[];
  bank: { word: string; picture: string; x: number; y: number; w: number; h: number }[];
  drawTop: number;
}

export function noteLayout(n: number, top: number): NoteLayout {
  const set = NOTE_SETS[n - 1];
  const lineH = 17;
  const card = { x: M, y: top + 2, w: W - 2 * M, h: 27 + set.lines.length * lineH };
  const lines = set.lines.map((line, i) => {
    const baseline = card.y + 31 + i * lineH;
    let x = card.x + 14;
    const pieces: NoteLayout['lines'][number]['pieces'] = [];
    for (const p of line) {
      if (typeof p === 'string') {
        // punctuation sticks to the blank before it
        const glue = /^[!.,]/.test(p) ? 1 : 0;
        if (glue) x -= 2.5;
        pieces.push({ text: p, x });
        x += textRoom(p, NOTE_SIZE) + 3;
      } else {
        pieces.push({ blank: p.blank, x, w: BLANK[p.blank] });
        x += BLANK[p.blank] + 3;
      }
    }
    return { baseline, pieces };
  });
  const bankTop = card.y + card.h + 6;
  const bw = 44;
  const bank = set.bank.map(([word, picture], i) => ({ word, picture, x: M + 34 + i * (bw + 6), y: bankTop, w: bw, h: 24 }));
  const drawTop = bankTop + (set.bank.length ? 32 : 0);
  return { card, lines, bank, drawTop };
}

function notePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = NOTE_SETS[n - 1];
  const top = frame(ops, config, `${CLR_KIND_TITLES.note}: ${set.title.toLocaleLowerCase('ro')}`, set.instruction, 'Un adult citește mesajul. Scrie cu litere mari de tipar pe rândurile goale.');
  const lay = noteLayout(n, top);
  const c = lay.card;
  ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 5, fill: '#FFFDF5', stroke: '#E8913A', strokeWidth: 0.8 });
  ops.push({ t: 'rect', x: c.x + 2.5, y: c.y + 2.5, w: c.w - 5, h: c.h - 5, rx: 4, stroke: '#F3C892', strokeWidth: 0.4, dash: [1.6, 1.2] });
  ops.push(...iconOps(set.pictures[0], c.x + 14, c.y + 11, 13), ...iconOps(set.pictures[1], c.x + c.w - 14, c.y + 11, 13));
  const head = set.title.toLocaleUpperCase('ro');
  ops.push({ t: 'text', x: W / 2, y: c.y + 13, text: head, size: 6.4, fill: '#B45309', weight: 'bold', align: 'center' });
  for (const line of lay.lines) {
    for (const p of line.pieces) {
      if ('text' in p) ops.push({ t: 'text', x: p.x, y: line.baseline, text: p.text, size: NOTE_SIZE, fill: INK, weight: 'bold' });
      else ops.push(...guideOps({ x: p.x, width: p.w, baseline: line.baseline + 1 }, NOTE_S, '#8DA0B8'));
    }
  }
  if (lay.bank.length) {
    ops.push({ t: 'text', x: M, y: lay.bank[0].y + 13.5, text: 'Alege:', size: 4.4, fill: INK, weight: 'bold' });
    for (const b of lay.bank) {
      ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(b.picture, b.x + 9, b.y + b.h / 2, 13));
      ops.push({ t: 'text', x: b.x + 17, y: b.y + b.h / 2 + 1.7, text: b.word, size: fitSize(b.word, 4.8, b.w - 19), fill: INK, weight: 'bold' });
    }
  }
  ops.push({ t: 'text', x: M, y: lay.drawTop + 4, text: set.draw, size: 4.4, fill: INK, weight: 'bold' });
  ops.push({ t: 'rect', x: M, y: lay.drawTop + 8, w: W - 2 * M, h: BOTTOM - lay.drawTop - 8, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Citește mesajul (clasa a II-a) ─────────────────────────

const MSG_SIZE = 4.8;

/** Lines of at most `width` mm. */
function wrap(text: string, size: number, width: number, first = width): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const cand = line ? `${line} ${word}` : word;
    if (!line || textRoom(cand, size) <= (out.length ? width : first)) line = cand;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

export interface MessageLayout {
  card: { x: number; y: number; w: number; h: number };
  texts: { text: string; x: number; y: number; size: number; bold?: boolean; align?: 'left' | 'center' | 'right' }[];
  questionsTop: number;
}

export function messageLayout(n: number, top: number): MessageLayout {
  const set = MESSAGE_SETS[n - 1];
  const x = M + 14;
  const w = W - 2 * M - 28;
  const inner = w - 16;
  const texts: MessageLayout['texts'] = [];
  let y = top + 2 + 12;
  const lh = MSG_SIZE * 1.55;
  if (set.kind === 'afis') {
    set.lines.forEach((l, i) => {
      const size = i === 0 ? 8 : i === 1 ? 6.4 : 5.2;
      y += i === 0 ? 2 : size * 1.65;
      texts.push({ text: l, x: W / 2, y, size: fitSize(l, size, inner), bold: i < 2 || i === set.lines.length - 2, align: 'center' });
    });
  } else {
    set.lines.forEach((l, i) => {
      const last = i === set.lines.length - 1;
      const paragraph = i > 0 && !last && set.lines.length > 2 && i === 1;
      if (paragraph) {
        wrap(l, MSG_SIZE, inner, inner - 8).forEach((t, k) => {
          y += lh;
          texts.push({ text: t, x: x + 8 + (k === 0 ? 8 : 0), y, size: MSG_SIZE });
        });
      } else {
        y += lh;
        texts.push({ text: l, x: last ? x + w - 8 : x + 8, y, size: MSG_SIZE, bold: last, align: last ? 'right' : 'left' });
      }
    });
  }
  const card = { x, y: top + 2, w, h: y - top - 2 + 10 };
  return { card, texts, questionsTop: card.y + card.h + 10 };
}

function messagePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = MESSAGE_SETS[n - 1];
  const top = frame(ops, config, `${CLR_KIND_TITLES.msg}: ${set.title.toLocaleLowerCase('ro')}`, `Citește ${set.kind === 'afis' ? 'afișul' : set.kind === 'bilet' ? 'biletul' : 'invitația'}, apoi răspunde la întrebări.`, 'Încercuiește litera răspunsului potrivit. Primul răspuns încercuit este exemplul.');
  const lay = messageLayout(n, top);
  const c = lay.card;
  if (set.kind === 'afis') {
    ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 2, fill: '#FFF8E1', stroke: '#C62828', strokeWidth: 1.2 });
  } else if (set.kind === 'bilet') {
    ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 1, fill: '#FFFDE7', stroke: '#CFC59A', strokeWidth: 0.4 });
    ops.push({ t: 'rect', x: W / 2 - 14, y: c.y - 3, w: 28, h: 7, fill: '#E3D7B0' });
  } else {
    ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 5, fill: '#FFFDF5', stroke: '#E8913A', strokeWidth: 0.8 });
    ops.push({ t: 'rect', x: c.x + 2.5, y: c.y + 2.5, w: c.w - 5, h: c.h - 5, rx: 4, stroke: '#F3C892', strokeWidth: 0.4, dash: [1.6, 1.2] });
  }
  ops.push(...iconOps(set.picture, c.x + c.w - 10, c.y + 10, 12));
  for (const t of lay.texts) ops.push({ t: 'text', x: t.x, y: t.y, text: t.text, size: t.size, fill: INK, weight: t.bold ? 'bold' : 'normal', align: t.align ?? 'left' });
  let y = lay.questionsTop;
  const qSize = 4.8;
  const colW = (W - 2 * M - 8) / 3;
  set.questions.forEach((q, i) => {
    const label = `${i + 1}. ${q.q}`;
    ops.push({ t: 'text', x: M, y, text: label, size: fitSize(label, qSize, W - 2 * M), fill: INK, weight: 'bold' });
    const oy = y + 9;
    q.options.forEach((o, k) => {
      const ox = M + 8 + k * colW;
      ops.push({ t: 'circle', cx: ox + 2.6, cy: oy - qSize * 0.34, r: 3.4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: ox + 2.6, y: oy, text: LETTERS[k], size: qSize, fill: INK, weight: 'bold', align: 'center' });
      ops.push({ t: 'text', x: ox + 8, y: oy, text: o, size: fitSize(o, qSize, colW - 11), fill: INK });
      if (i === 0 && k === q.answer) ops.push({ t: 'circle', cx: ox + 2.6, cy: oy - qSize * 0.34, r: 4.6, stroke: '#E8913A', strokeWidth: 0.7 });
    });
    y = oy + 12;
  });
  // the room left: a short answer to write, on lines
  const replyTop = y - 2;
  const lines = Math.min(4, Math.floor((BOTTOM - replyTop - 10) / 11));
  if (lines >= 2) {
    ops.push({ t: 'text', x: M, y: replyTop + 4, text: `5. ${set.reply}`, size: fitSize(`5. ${set.reply}`, qSize, W - 2 * M), fill: INK, weight: 'bold' });
    for (let k = 0; k < lines; k++) ops.push({ t: 'line', x1: M + 6, y1: replyTop + 15 + k * 11, x2: W - M, y2: replyTop + 15 + k * 11, stroke: '#8DA0B8', strokeWidth: 0.35 });
  }
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Unde este ceva scris? (grădiniță) ─────────────────────────

const WCOLS = 4;
const WROWS = 3;

export interface CardBox { x: number; y: number; w: number; h: number }

export function writtenLayout(top: number): CardBox[] {
  const gap = 6;
  const w = (W - 2 * M - (WCOLS - 1) * gap) / WCOLS;
  const h = (BOTTOM - top - 4 - (WROWS - 1) * gap) / WROWS;
  return Array.from({ length: WCOLS * WROWS }, (_, i) => ({ x: M + (i % WCOLS) * (w + gap), y: top + 4 + Math.floor(i / WCOLS) * (h + gap), w, h }));
}

/** The cards with writing on them, numbered from 1 in reading order. */
export function writtenAnswers(n: number): number[] {
  return WRITTEN_SETS[n - 1].flatMap((c, i) => (c.word ? [i + 1] : []));
}

function writtenPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const cards = WRITTEN_SETS[n - 1];
  const top = frame(ops, config, CLR_KIND_TITLES.written, 'Încercuiește cartonașele pe care este ceva scris.', 'Scrisul are litere. Desenele și formele nu sunt scris. Primul cartonaș încercuit este exemplul.');
  const boxes = writtenLayout(top);
  cards.forEach((card, i) => {
    const b = boxes[i];
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.6 });
    ops.push({ t: 'text', x: b.x + 2.2, y: b.y + 4.4, text: String(i + 1), size: 2.8, fill: '#94A3B8', weight: 'bold' });
    const cx = b.x + b.w / 2;
    const below = card.word || card.deco;
    if (card.picture) ops.push(...iconOps(card.picture, cx, b.y + (below ? b.h * 0.4 : b.h / 2), Math.min(b.w - 14, b.h * (below ? 0.5 : 0.62))));
    const ly = card.picture ? b.y + b.h * 0.82 : b.y + b.h / 2 + 2.5;
    if (card.word) ops.push({ t: 'text', x: cx, y: ly + (card.picture ? 0 : 0), text: card.word, size: fitSize(card.word, card.picture ? 5.6 : 7, b.w - 6), fill: INK, weight: 'bold', align: 'center' });
    if (card.deco === 'shapes') {
      const yy = b.y + b.h * 0.8;
      ops.push({ t: 'circle', cx: cx - 9, cy: yy, r: 2.4, stroke: INK, strokeWidth: 0.5 });
      ops.push({ t: 'polygon', points: [{ x: cx, y: yy - 2.6 }, { x: cx + 2.6, y: yy + 2 }, { x: cx - 2.6, y: yy + 2 }], stroke: INK, strokeWidth: 0.5 });
      ops.push({ t: 'rect', x: cx + 6.6, y: yy - 2.3, w: 4.6, h: 4.6, stroke: INK, strokeWidth: 0.5 });
    }
    if (card.deco === 'dots') for (let k = 0; k < 5; k++) ops.push({ t: 'circle', cx: cx - 10 + k * 5, cy: b.y + b.h * 0.8, r: 1.3, fill: '#F06292' });
    if (card.deco === 'stars') for (let k = 0; k < 3; k++) ops.push({ t: 'polygon', points: starPoints(cx - 8 + k * 8, b.y + b.h * 0.8, 2.6), fill: '#FDD835', stroke: '#E0A800', strokeWidth: 0.3 });
  });
  const first = boxes[writtenAnswers(n)[0] - 1];
  ops.push({ t: 'rect', x: first.x - 0.4, y: first.y - 0.4, w: first.w + 0.8, h: first.h + 0.8, rx: 4.5, stroke: '#E8913A', strokeWidth: 0.9, dash: [1.8, 1.2] });
  adultNote(ops, 'Spuneți împreună ce scrie pe fiecare cartonaș încercuit.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── answers and entry point ─────────────────────────

/** The answers of a „Comunicare” item, or null for the messages the child writes (note:1–3). */
export function clrKeySection(item: string): KeySection | null {
  if (!isClrItem(item)) return null;
  const [kind, n] = parts(item);
  const title = clrLabel(item);
  if (kind === 'story') {
    const lay = storyLayout(n, 0);
    const story = STORIES[n - 1];
    return {
      title,
      entries: [...lay.order.map((k, i) => `${POSITIONS[i]}: ${k + 1} – ${story.panels[k].caption}`), `Titlul: „${story.titles[0]}”`],
      perLine: 1,
    };
  }
  if (kind === 'sign' && n < 3) return { title, entries: SIGN_MATCH_SETS[n - 1].map(([s, w]) => `${signName(s)} – ${w}`), perLine: 2, numbered: true };
  if (kind === 'sign') return { title, entries: SIGN_CONTEXT.map((q) => `${LETTERS[q.answer]}) ${q.options[q.answer]}`), perLine: 2, numbered: true };
  if (kind === 'msg') return { title, entries: MESSAGE_SETS[n - 1].questions.map((q) => `${LETTERS[q.answer]}) ${q.options[q.answer]}`), perLine: 2, numbered: true };
  if (kind === 'written') {
    const yes = writtenAnswers(n);
    return { title, entries: [`Se încercuiesc cartonașele ${yes.join(', ')} (${WRITTEN_SETS[n - 1].filter((c) => c.word).map((c) => c.word).join(', ')}).`], perLine: 1 };
  }
  return null;
}

/** How a sign is named on the answers page (the drawn ones by what they show). */
const SIGN_NAMES: Record<string, string> = {
  stop: 'octogonul roșu STOP', crossing: 'semnul albastru cu pietonul', hospital: 'H', metro: 'M', exit: 'semnul verde cu omul și ușa', pharmacy: 'crucea verde',
  electric: 'triunghiul galben cu fulger', '🚾': 'WC', '♻️': 'săgețile verzi', '🚭': 'țigara tăiată', '🚸': 'copiii în romb galben', '⛔': 'cercul roșu cu bară albă',
};
function signName(sign: string): string {
  return SIGN_NAMES[sign] ?? sign;
}

/** The page of one „Comunicare” item, or null when the item is not one. */
export function buildClrPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isClrItem(item)) return null;
  const [kind, n] = parts(item);
  if (kind === 'story') return storyPage(config, n, tier);
  if (kind === 'sign') return n < 3 ? signMatchPage(config, n, tier) : signContextPage(config, tier);
  if (kind === 'note') return notePage(config, n, tier);
  if (kind === 'msg') return messagePage(config, n, tier);
  return writtenPage(config, n, tier);
}
