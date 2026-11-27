import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps, silhouetteOps } from '@/lib/hints/icons';
import { INK, MUTED, PAPER, guideOps, starPoints } from './rows';
import type { KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, H, M, SOFT, W, adultNote, derangement, exampleLine, exampleRing, exampleTag, fitSize, footer, frame, rng, seedOf, shuffle, textRoom } from './page-kit';
import { rulingOps } from './reading-pages';
import { treeOps } from './explore-pages';
import {
  BOOK_FORMS, BOOK_LEVELS, CLR_KINDS, CLR_SETS, COMPOSED_SIGNS, DRAWN_SIGNS, LISTEN_LEVELS, LISTEN_SETS, MESSAGE_SETS, NOTE_SETS, SIGN_CONTEXT_SETS, SIGN_MATCH,
  SIGN_SET_LEVELS, STORIES, STORY_NAMES, WRITTEN_SETS, isClrItem,
  type ClrKind, type ClrLevel, type DrawnSign, type ListenOption, type MessageSet, type Panel, type SignFrame,
} from './clr';

/**
 * The „Comunicare” sheets that fill the gaps of the programme: full pages in the „Jocuri” category
 * (see activities.ts), seeded by the item, so the preview and the PDF are the same every time.
 *
 * - "story:1–12"  Povestea în imagini: four panels in a shuffled order, a box in each for its number,
 *                 the right title to circle among three;
 * - "sign:1–9"    Semne și simboluri: join each sign with its meaning (SIGN_MATCH), or a sign in a known
 *                 context, the answer to circle (SIGN_CONTEXT_SETS: sets 3, 8, 9);
 * - "note:1–10"   Felicitarea, biletul, invitația …: a card with the message and the blanks to write in;
 * - "msg:1–9"     Citește mesajul: an invitation, a poster, a note, a list …, and four questions;
 * - "written:1–2" Unde este ceva scris?: twelve cards, circle those with writing;
 * - "listen:1–18" Ascultă și răspunde: the pupil's page (pictures or answers to circle) and, after all the
 *                 pupils' pages of the sheet, the page of the adult with the text to read aloud (clrTeacherPages);
 * - "book:1–6"    Fișa cărții and Jurnalul de lectură.
 *
 * The layouts are computed by exported functions, which the tests and the answers page read.
 */

export const CLR_KIND_TITLES: Record<ClrKind, string> = {
  story: 'Povestea în imagini',
  sign: 'Semne și simboluri',
  note: 'Scriu un mesaj',
  msg: 'Citește mesajul',
  written: 'Unde este ceva scris?',
  listen: 'Ascultă și răspunde',
  book: 'Fișa cărții',
};

const LEVEL_ORDER: ClrLevel[] = ['CP', 'I', 'II'];
const LEVEL_LONG: Record<ClrLevel, string> = { CP: 'clasa pregătitoare', I: 'clasa I', II: 'clasa a II-a' };

/** Every item, in picker order („Semne și simboluri”: class by class). */
export function clrItems(): string[] {
  return CLR_KINDS.flatMap((k) => {
    const all = Array.from({ length: CLR_SETS[k] }, (_, i) => `${k}:${i + 1}`);
    return k === 'sign' ? LEVEL_ORDER.flatMap((level) => all.filter((_, i) => SIGN_SET_LEVELS[i] === level)) : all;
  });
}

const parts = (item: string): [ClrKind, number] => {
  const [k, n] = item.split(':');
  return [k as ClrKind, Number(n)];
};

export { SIGN_SET_LEVELS };

/** What each set of „Semne și simboluri” is about, in the picker (CP = clasa pregătitoare). */
const SIGN_SHORT = ['CP: semne uzuale', 'I: semne uzuale', 'II: ce faci?', 'CP: pe stradă', 'CP: în oraș', 'I: reguli', 'I: reciclare', 'II: vremea', 'II: ambalaje'];
const BOOK_TITLES = { card: 'Fișa cărții', log: 'Jurnal de lectură' } as const;

/** The number of a set among the sets of its class: "listen:8" → 2. */
const setOfLevel = (levels: ClrLevel[], n: number) => levels.slice(0, n).filter((l) => l === levels[n - 1]).length;

/** The name of the item in the picker („Felicitarea”, „Afișul”, „CP: pe stradă”, „I 2”). */
export function clrShortLabel(item: string): string {
  const [kind, n] = parts(item);
  if (kind === 'note') return NOTE_SETS[n - 1].title;
  if (kind === 'msg') return MESSAGE_SETS[n - 1].title;
  if (kind === 'sign') return SIGN_SHORT[n - 1];
  if (kind === 'story') return STORY_NAMES[n - 1];
  if (kind === 'listen') return `${LISTEN_LEVELS[n - 1]} ${setOfLevel(LISTEN_LEVELS, n)}`;
  if (kind === 'book') return `${BOOK_FORMS[n - 1] === 'card' ? 'Fișa cărții' : 'Jurnal'}: ${BOOK_LEVELS[n - 1]}`;
  return `Setul ${n}`;
}

/** The name of the item in the lists and on the answers page. */
export function clrLabel(item: string): string {
  const [kind, n] = parts(item);
  if (kind === 'note' || kind === 'msg') return `${CLR_KIND_TITLES[kind]}: ${clrShortLabel(item).toLocaleLowerCase('ro')}`;
  if (kind === 'listen') return `${CLR_KIND_TITLES.listen} (${LEVEL_LONG[LISTEN_LEVELS[n - 1]]}, ${setOfLevel(LISTEN_LEVELS, n)})`;
  if (kind === 'book') return `${BOOK_TITLES[BOOK_FORMS[n - 1]]} (${LEVEL_LONG[BOOK_LEVELS[n - 1]]})`;
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
const WALL = '#FBF3E4';
const GROUND: Record<Panel['ground'], string> = { grass: '#A9D98B', snow: '#FFFFFF', soil: '#C9A27C', floor: '#D8B88C' };
const WOOD = '#A9744A';

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28): Pt[] {
  return Array.from({ length: n }, (_, i) => ({ x: cx + rx * Math.cos((i / n) * 2 * Math.PI), y: cy + ry * Math.sin((i / n) * 2 * Math.PI) }));
}

function panelOps(p: Panel, x: number, y: number, w: number): DrawOp[] {
  const s = w / PANEL_W;
  const h = PANEL_H * s;
  const at = (px: number, py: number) => ({ x: x + px * s, y: y + py * s });
  const ops: DrawOp[] = [{ t: 'rect', x, y, w, h, rx: 3, fill: p.ground === 'floor' ? WALL : SKY }];
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
    if (e.kind === 'table') {
      // the top of the table at e.y, e.s wide, on two legs down to the floor
      const top = at(e.x - e.s / 2, e.y);
      for (const lx of [e.x - e.s / 2 + 4, e.x + e.s / 2 - 7]) ops.push({ t: 'rect', x: at(lx, 0).x, y: top.y + 2 * s, w: 3 * s, h: (62 - e.y - 2) * s, fill: WOOD });
      ops.push({ t: 'rect', x: top.x, y: top.y, w: e.s * s, h: 3.4 * s, rx: 0.8 * s, fill: '#C68B59', stroke: '#8A5A33', strokeWidth: 0.3 });
    }
    if (e.kind === 'eggs') {
      // a large leaf with a few small eggs on it
      const c = at(e.x, e.y);
      ops.push({ t: 'polygon', points: ellipse(c.x, c.y, (e.s / 2) * s, (e.s / 4.2) * s), fill: '#7CC35A', stroke: '#4E8F35', strokeWidth: 0.4 });
      ops.push({ t: 'line', x1: c.x - (e.s / 2) * s, y1: c.y, x2: c.x + (e.s / 2 + 5) * s, y2: c.y, stroke: '#4E8F35', strokeWidth: 0.5 });
      for (const [dx, dy] of [[-10, -3], [-4, -4.5], [3, -2.5], [9, -4], [-7, 3.5], [1, 4], [8, 3]]) ops.push({ t: 'circle', cx: c.x + dx * s, cy: c.y + dy * s, r: 1.5 * s, fill: '#FFF9C4', stroke: '#B8A13A', strokeWidth: 0.25 });
    }
    if (e.kind === 'chrysalis') {
      // a twig across the panel at e.y, a leaf on it, and the chrysalis hanging from a short thread
      const a = at(e.x - e.s / 2, e.y + 3);
      const b = at(e.x + e.s / 2, e.y - 2);
      ops.push({ t: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#7A5230', strokeWidth: 1.6 * s });
      ops.push({ t: 'polygon', points: ellipse(at(e.x - 18, e.y - 3).x, at(e.x - 18, e.y - 3).y, 7 * s, 3 * s), fill: '#7CC35A', stroke: '#4E8F35', strokeWidth: 0.3 });
      const t0 = at(e.x + 4, e.y + 0.4);
      const body = at(e.x + 4, e.y + 20);
      ops.push({ t: 'line', x1: t0.x, y1: t0.y, x2: body.x, y2: body.y - 13 * s, stroke: '#5D4037', strokeWidth: 0.4 });
      ops.push({ t: 'polygon', points: ellipse(body.x, body.y, 5.5 * s, 13 * s), fill: '#9CCC65', stroke: '#558B2F', strokeWidth: 0.45 });
      for (const k of [-6, -1, 4]) ops.push({ t: 'line', x1: body.x - 4.6 * s, y1: body.y + k * s, x2: body.x + 4.6 * s, y2: body.y + (k + 1.5) * s, stroke: '#558B2F', strokeWidth: 0.3 });
    }
    if (e.kind === 'tree') ops.push(...treeOps(e.season ?? 'vara', at(e.x, e.y).x, at(e.x, e.y).y, e.s * s));
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

const CODE_COLOURS: Partial<Record<SignFrame, string>> = { yellow: '#FFD600', orange: '#FB8C00', red: '#E53935' };
const BIN_COLOURS: Partial<Record<SignFrame, [string, string]>> = { 'bin-yellow': ['#FBC02D', '#C49000'], 'bin-blue': ['#1E88E5', '#0D47A1'], 'bin-green': ['#43A047', '#1B5E20'] };

/** A sign made of a frame around a picture (COMPOSED_SIGNS), `size` mm across, centred on (cx, cy). */
function composedOps(frame: SignFrame, e: string, cx: number, cy: number, size: number): DrawOp[] {
  const r = size / 2;
  if (frame === 'ban') {
    const d = r * 0.62;
    return [
      { t: 'circle', cx, cy, r: r * 0.9, fill: PAPER },
      ...iconOps(e, cx, cy, size * 0.6),
      { t: 'line', x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d, stroke: RED, strokeWidth: size * 0.085 },
      { t: 'circle', cx, cy, r: r * 0.9, stroke: RED, strokeWidth: size * 0.1 },
    ];
  }
  if (frame === 'must') return [{ t: 'circle', cx, cy, r: r * 0.9, fill: PAPER, stroke: BLUE, strokeWidth: size * 0.1 }, ...iconOps(e, cx, cy, size * 0.56)];
  if (frame === 'blue') return [{ t: 'circle', cx, cy, r, fill: BLUE }, ...(silhouetteOps(e, cx, cy, size * 0.68, PAPER) ?? iconOps(e, cx, cy, size * 0.68))];
  if (frame === 'ghs') {
    const d = r * 0.97;
    const diamond = [{ x: cx, y: cy - d }, { x: cx + d, y: cy }, { x: cx, y: cy + d }, { x: cx - d, y: cy }];
    return [{ t: 'polygon', points: diamond, fill: PAPER, stroke: RED, strokeWidth: size * 0.075 }, ...iconOps(e, cx, cy, size * 0.48)];
  }
  const bin = BIN_COLOURS[frame];
  if (bin) {
    const x = cx - r;
    const y = cy - r;
    const u = size / 20;
    return [
      { t: 'circle', cx: x + 5.5 * u, cy: y + 18.3 * u, r: 1.5 * u, fill: INK },
      { t: 'circle', cx: x + 14.5 * u, cy: y + 18.3 * u, r: 1.5 * u, fill: INK },
      { t: 'polygon', points: [{ x: x + 3 * u, y: y + 4.6 * u }, { x: x + 17 * u, y: y + 4.6 * u }, { x: x + 15.6 * u, y: y + 17.6 * u }, { x: x + 4.4 * u, y: y + 17.6 * u }], fill: bin[0], stroke: bin[1], strokeWidth: 0.35 },
      { t: 'rect', x: x + 1.8 * u, y: y + 2.2 * u, w: 16.4 * u, h: 2.6 * u, rx: 0.8 * u, fill: bin[0], stroke: bin[1], strokeWidth: 0.35 },
      { t: 'rect', x: x + 5.6 * u, y: y + 6.6 * u, w: 8.8 * u, h: 8.8 * u, rx: 1 * u, fill: PAPER, stroke: bin[1], strokeWidth: 0.25 },
      ...iconOps(e, cx, y + 11 * u, 7.4 * u),
    ];
  }
  // a weather warning: a panel with the border in the colour of its code, the phenomenon large in the middle and
  // a small warning triangle in the corner
  const x = cx - r;
  const y = cy - r;
  const colour = CODE_COLOURS[frame] ?? '#FFD600';
  const tx = x + size * 0.2;
  const ty = y + size * 0.2;
  const t = size * 0.17;
  return [
    { t: 'rect', x, y, w: size, h: size, rx: size * 0.12, fill: colour, stroke: INK, strokeWidth: size * 0.02 },
    { t: 'rect', x: x + size * 0.1, y: y + size * 0.1, w: size * 0.8, h: size * 0.8, rx: size * 0.07, fill: PAPER },
    ...iconOps(e, cx + size * 0.05, cy + size * 0.08, size * 0.58),
    { t: 'polygon', points: [{ x: tx, y: ty - t }, { x: tx + t, y: ty + t * 0.78 }, { x: tx - t, y: ty + t * 0.78 }], fill: colour, stroke: INK, strokeWidth: size * 0.022 },
    { t: 'text', x: tx, y: ty + t * 0.56, text: '!', size: t * 1.25, fill: INK, weight: 'bold', align: 'center' },
  ];
}

/** A sign, `size` mm across, centred on (cx, cy): drawn (DRAWN_SIGNS), a frame around a picture, or a Twemoji picture. */
export function signOps(sign: string, cx: number, cy: number, size: number): DrawOp[] {
  const composed = COMPOSED_SIGNS[sign];
  if (composed) return composedOps(composed.frame, composed.e, cx, cy, size);
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
    case 'firstaid': {
      // a white cross on a green square
      const a = size * 0.12;
      const b = size * 0.34;
      return [
        { t: 'rect', x, y, w: size, h: size, rx: size * 0.08, fill: '#2E9E4F' },
        { t: 'polygon', points: [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]].map(([px, py]) => ({ x: cx + px, y: cy + py })), fill: PAPER },
      ];
    }
    case 'fragile': {
      // a stemmed glass with a crack, as on parcels
      const at = (px: number, py: number) => ({ x: x + px * size, y: y + py * size });
      return [
        { t: 'rect', x, y, w: size, h: size, rx: size * 0.06, fill: PAPER, stroke: INK, strokeWidth: size * 0.035 },
        { t: 'polygon', points: [at(0.28, 0.16), at(0.72, 0.16), at(0.68, 0.4), at(0.56, 0.52), at(0.44, 0.52), at(0.32, 0.4)], fill: '#B3E5FC', stroke: INK, strokeWidth: size * 0.03 },
        { t: 'line', x1: at(0.5, 0.52).x, y1: at(0.5, 0.52).y, x2: at(0.5, 0.78).x, y2: at(0.5, 0.78).y, stroke: INK, strokeWidth: size * 0.04 },
        { t: 'line', x1: at(0.34, 0.8).x, y1: at(0.34, 0.8).y, x2: at(0.66, 0.8).x, y2: at(0.66, 0.8).y, stroke: INK, strokeWidth: size * 0.05 },
        // the crack
        { t: 'path', subpaths: [{ start: at(0.56, 0.16), segs: [at(0.48, 0.26), at(0.57, 0.33), at(0.5, 0.44)].map((p) => ({ kind: 'L' as const, p })) }], stroke: INK, strokeWidth: size * 0.025 },
      ];
    }
    case 'thisup': {
      // two arrows pointing up, over a line: „cu partea aceasta în sus”
      const at = (px: number, py: number) => ({ x: x + px * size, y: y + py * size });
      const arrow = (ax: number): DrawOp[] => [
        { t: 'rect', x: at(ax - 0.045, 0.36).x, y: at(0, 0.36).y, w: size * 0.09, h: size * 0.36, fill: INK },
        { t: 'polygon', points: [at(ax, 0.14), at(ax + 0.14, 0.4), at(ax - 0.14, 0.4)], fill: INK },
      ];
      return [
        { t: 'rect', x, y, w: size, h: size, rx: size * 0.06, fill: PAPER, stroke: INK, strokeWidth: size * 0.035 },
        ...arrow(0.32), ...arrow(0.68),
        { t: 'rect', x: at(0.14, 0.78).x, y: at(0, 0.78).y, w: size * 0.72, h: size * 0.07, fill: INK },
      ];
    }
    case 'age3': {
      // „0–3” under a red ring with a bar: not for children under three
      const d = r * 0.62;
      return [
        { t: 'circle', cx, cy, r: r * 0.9, fill: PAPER },
        { t: 'line', x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d, stroke: RED, strokeWidth: size * 0.085 },
        { t: 'circle', cx, cy, r: r * 0.9, stroke: RED, strokeWidth: size * 0.1 },
        // the ages on a label over the bar, so that they can be read
        { t: 'rect', x: cx - size * 0.29, y: cy - size * 0.15, w: size * 0.58, h: size * 0.3, rx: size * 0.05, fill: PAPER, stroke: INK, strokeWidth: size * 0.02 },
        { t: 'text', x: cx, y: cy + size * 0.085, text: '0–3', size: size * 0.24, fill: INK, weight: 'bold', align: 'center' },
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
  const rows = SIGN_MATCH[n].length;
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
  const set = SIGN_MATCH[n];
  const cp = SIGN_SET_LEVELS[n - 1] === 'CP';
  const top = frame(ops, config, CLR_KIND_TITLES.sign, 'Unește fiecare semn cu ce înseamnă.', cp ? 'Un adult citește cuvintele, dacă este nevoie. Prima linie este exemplul.' : 'Citește ce înseamnă fiecare semn. Prima linie este exemplul.');
  const lay = signMatchLayout(n, top);
  const pic = Math.min(28, lay.rowH - 10);
  const cardW = 74;
  const cardX = W - M - cardW;
  const size = Math.min(...set.map(([, w]) => fitSize(w, cp ? 6 : 5.4, cardW - 8)));
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

export function signContextLayout(top: number, n = 3): ContextRow[] {
  const rows = SIGN_CONTEXT_SETS[n].length;
  const h = (BOTTOM - top - 2) / rows;
  return SIGN_CONTEXT_SETS[n].map((_, i) => {
    const y = top + 2 + i * h;
    const size = Math.min(26, h - 8);
    return { y, h, sign: { cx: M + 4 + size / 2, cy: y + h / 2, size }, options: [0, 1, 2].map((k) => ({ x: M + size + 16, y: y + 13 + k * 6.6 })) };
  });
}

function signContextPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, CLR_KIND_TITLES.sign, 'Privește semnul, citește întrebarea și încercuiește răspunsul potrivit.', 'Fiecare întrebare are un singur răspuns potrivit. Primul răspuns încercuit este exemplul.');
  const lay = signContextLayout(top, n);
  SIGN_CONTEXT_SETS[n].forEach((q, i) => {
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
/** „Citește …”: the message as the instruction names it. */
const MSG_NAMES: Record<MessageSet['kind'], string> = { invitatie: 'invitația', afis: 'afișul', bilet: 'biletul', felicitare: 'felicitarea', anunt: 'anunțul', lista: 'lista', reteta: 'rețeta', program: 'programul' };

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
  if (set.kind === 'lista' || set.kind === 'reteta' || set.kind === 'program') {
    // a heading, then one line per row (a long one wrapped)
    y += 2;
    texts.push({ text: set.lines[0], x: W / 2, y, size: fitSize(set.lines[0], 6.4, inner - 24), bold: true, align: 'center' });
    y += 3;
    set.lines.slice(1).forEach((l, i) => {
      const last = i === set.lines.length - 2;
      for (const t of wrap(l, MSG_SIZE, inner - 8)) {
        y += lh;
        texts.push({ text: t, x: x + 12, y, size: MSG_SIZE, bold: last });
      }
    });
  } else if (set.kind === 'afis' || set.kind === 'anunt') {
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
  const top = frame(ops, config, `${CLR_KIND_TITLES.msg}: ${set.title.toLocaleLowerCase('ro')}`, `Citește ${MSG_NAMES[set.kind]}, apoi răspunde la întrebări.`, 'Încercuiește litera răspunsului potrivit. Primul răspuns încercuit este exemplul.');
  const lay = messageLayout(n, top);
  const c = lay.card;
  if (set.kind === 'afis') {
    ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 2, fill: '#FFF8E1', stroke: '#C62828', strokeWidth: 1.2 });
  } else if (set.kind === 'anunt') {
    ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 2, fill: '#F1F8FF', stroke: '#1565C0', strokeWidth: 1.2 });
  } else if (set.kind === 'lista' || set.kind === 'reteta' || set.kind === 'program') {
    // a sheet torn from a notebook: the holes of the spiral along its top
    ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 2, fill: PAPER, stroke: '#94A3B8', strokeWidth: 0.5 });
    for (let hx = c.x + 9; hx < c.x + c.w - 22; hx += 9) ops.push({ t: 'circle', cx: hx, cy: c.y + 3.6, r: 1.1, fill: '#E2E8F0', stroke: '#94A3B8', strokeWidth: 0.25 });
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

// ───────────────────────── Ascultă și răspunde (clasa pregătitoare, I, a II-a) ─────────────────────────

type ListenQ = (typeof LISTEN_SETS)[number]['questions'][number];

/** The answer of a question as the key gives it: „pe scaun (imaginea 2)”, „b) în iarbă”. */
export function listenAnswer(q: ListenQ): string {
  const o: ListenOption = q.options[q.answer];
  return typeof o === 'string' ? `${LETTERS[q.answer]}) ${o}` : `${o[1]} (imaginea ${q.answer + 1})`;
}

export interface ListenPictureRow { y: number; h: number; boxes: { x: number; y: number; w: number; h: number }[] }

/** Clasa pregătitoare: one row per question, three pictures to choose from. */
export function listenPictureLayout(n: number, top: number): ListenPictureRow[] {
  const rows = LISTEN_SETS[n - 1].questions.length;
  const h = (BOTTOM - top - 2) / rows;
  const x0 = M + 16;
  const gap = 8;
  const w = (W - M - x0 - 2 * gap) / 3;
  return Array.from({ length: rows }, (_, i) => {
    const y = top + 2 + i * h;
    return { y, h, boxes: [0, 1, 2].map((k) => ({ x: x0 + k * (w + gap), y: y + 3, w, h: h - 6 })) };
  });
}

const LISTEN_NOTE = 'Textul de citit și întrebările sunt pe pagina cadrului didactic, după fișele copiilor.';

/** The pupil's page: pictures to circle (clasa pregătitoare) or the questions with the answers a, b, c. */
function listenPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = LISTEN_SETS[n - 1];
  const level = LISTEN_LEVELS[n - 1];
  if (level === 'CP') {
    const top = frame(ops, config, CLR_KIND_TITLES.listen, 'Ascultă povestea, apoi întrebările. Încercuiește imaginea potrivită.', 'Un adult citește povestea de două ori, apoi câte o întrebare pentru fiecare rând de imagini.');
    listenPictureLayout(n, top).forEach((row, i) => {
      if (i > 0) ops.push({ t: 'line', x1: M, y1: row.y, x2: W - M, y2: row.y, stroke: CELL_STROKE, strokeWidth: 0.4 });
      ops.push({ t: 'circle', cx: M + 6, cy: row.y + row.h / 2, r: 4.6, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: M + 6, y: row.y + row.h / 2 + 1.8, text: String(i + 1), size: 5, fill: INK, weight: 'bold', align: 'center' });
      row.boxes.forEach((b, k) => {
        const o = set.questions[i].options[k];
        ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.6 });
        ops.push(...iconOps(typeof o === 'string' ? o : o[0], b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w - 14, b.h - 10)));
      });
    });
    adultNote(ops, LISTEN_NOTE);
    footer(ops, tier);
    return { width: W, height: H, ops };
  }
  const top = frame(ops, config, CLR_KIND_TITLES.listen, 'Ascultă cu atenție textul citit, apoi răspunde la întrebări.', 'Textul se citește de două ori. Încercuiește litera răspunsului potrivit.');
  const qSize = level === 'I' ? 5 : 4.6;
  const step = qSize * 1.45;
  let y = top + 6;
  set.questions.forEach((q, i) => {
    const label = `${i + 1}. ${q.q}`;
    ops.push({ t: 'text', x: M, y, text: label, size: fitSize(label, qSize, W - 2 * M), fill: INK, weight: 'bold' });
    q.options.forEach((o, k) => {
      const oy = y + (k + 1) * step + 1;
      const text = typeof o === 'string' ? o : o[1];
      ops.push({ t: 'circle', cx: M + 10.6, cy: oy - qSize * 0.34, r: 3.1, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: M + 10.6, y: oy, text: LETTERS[k], size: qSize * 0.9, fill: INK, weight: 'bold', align: 'center' });
      ops.push({ t: 'text', x: M + 17, y: oy, text, size: fitSize(text, qSize, W - 2 * M - 17), fill: INK });
    });
    y += 4 * step + (level === 'I' ? 7 : 5.5);
  });
  // the room left: a drawing in clasa I, a sentence in clasa a II-a
  const restTop = y - 2;
  if (level === 'I' && BOTTOM - restTop > 34) {
    ops.push({ t: 'text', x: M, y: restTop + 4, text: 'Desenează ce ți-a plăcut cel mai mult din ce ai ascultat.', size: 4.2, fill: INK, weight: 'bold' });
    ops.push({ t: 'rect', x: M, y: restTop + 8, w: W - 2 * M, h: BOTTOM - restTop - 8, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  }
  if (level === 'II') {
    const lines = Math.min(3, Math.floor((BOTTOM - restTop - 8) / 11));
    if (lines >= 2) {
      const label = `${set.questions.length + 1}. Scrie o propoziție despre ce ai ascultat.`;
      ops.push({ t: 'text', x: M, y: restTop + 4, text: label, size: qSize, fill: INK, weight: 'bold' });
      for (let k = 0; k < lines; k++) ops.push({ t: 'line', x1: M + 6, y1: restTop + 15 + k * 11, x2: W - M, y2: restTop + 15 + k * 11, stroke: '#8DA0B8', strokeWidth: 0.35 });
    }
  }
  adultNote(ops, LISTEN_NOTE);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/** The page of the adult: the text to read aloud, the questions (read aloud in clasa pregătitoare) and their answers. */
function listenTeacherPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = LISTEN_SETS[n - 1];
  const level = LISTEN_LEVELS[n - 1];
  const top = frame(
    ops, config, `Pentru cadrul didactic: ${clrLabel(`listen:${n}`)}`, 'Citiți textul cu voce tare, rar și clar, de două ori.',
    level === 'CP' ? 'Copiii au doar pagina cu imagini. După text, citiți întrebările pe rând și lăsați timp pentru fiecare.' : 'Elevii au doar pagina cu întrebări. Răspunsurile corecte sunt trecute mai jos.',
  );
  // large letters: the adult reads it aloud, at a glance
  const size = level === 'II' ? 5.4 : 6;
  const lh = size * 1.65;
  const box = { x: M, y: top + 2, w: W - 2 * M };
  const inner = box.w - 18;
  const lines = wrap(set.sentences.join(' '), size, inner, inner - 8);
  const boxH = 16 + lines.length * lh + 6;
  ops.push({ t: 'rect', x: box.x, y: box.y, w: box.w, h: boxH, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: W / 2, y: box.y + 10.5, text: set.title, size: 6.2, fill: INK, weight: 'bold', align: 'center' });
  lines.forEach((line, k) => ops.push({ t: 'text', x: box.x + 9 + (k === 0 ? 8 : 0), y: box.y + 14 + (k + 1) * lh, text: line, size, fill: INK }));
  let y = box.y + boxH + 11;
  ops.push({ t: 'text', x: M, y, text: level === 'CP' ? 'Întrebările (de citit) și răspunsurile' : 'Întrebările și răspunsurile', size: 4.8, fill: INK, weight: 'bold' });
  y += 8.5;
  set.questions.forEach((q, i) => {
    const label = `${i + 1}. ${q.q}`;
    ops.push({ t: 'text', x: M, y, text: label, size: fitSize(label, 4.4, W - 2 * M), fill: INK, weight: 'bold' });
    const answer = `Răspuns: ${listenAnswer(q)}`;
    ops.push({ t: 'text', x: M + 6, y: y + 5.8, text: answer, size: fitSize(answer, 4, W - 2 * M - 6), fill: '#334155' });
    y += 14;
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/**
 * The pages of the adult for the „Ascultă și răspunde” items of a sheet (the texts to read aloud), in the order of
 * the items: they come after all the pupils' pages, so the sheets can be copied without them.
 */
export function clrTeacherPages(config: WorksheetConfig, tier: Tier, allowed: (item: string) => boolean): PageOps[] {
  return config.selectedItems.filter((item) => isClrItem(item) && item.startsWith('listen:') && allowed(item)).map((item) => listenTeacherPage(config, parts(item)[1], tier));
}

// ───────────────────────── Fișa cărții, jurnalul de lectură ─────────────────────────

/** A face to colour: 1 happy, 0 calm, -1 sad. */
function faceOps(cx: number, cy: number, r: number, mood: 1 | 0 | -1): DrawOp[] {
  const mouth: Pt[] = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const bend = mood * r * 0.26 * Math.sin(Math.PI * t);
    return { x: cx - r * 0.45 + t * r * 0.9, y: cy + r * (mood < 0 ? 0.5 : 0.3) + bend };
  });
  return [
    { t: 'circle', cx, cy, r, fill: PAPER, stroke: INK, strokeWidth: 0.45 },
    { t: 'circle', cx: cx - r * 0.34, cy: cy - r * 0.22, r: r * 0.11, fill: INK },
    { t: 'circle', cx: cx + r * 0.34, cy: cy - r * 0.22, r: r * 0.11, fill: INK },
    { t: 'path', subpaths: [{ start: mouth[0], segs: mouth.slice(1).map((p) => ({ kind: 'L' as const, p })) }], stroke: INK, strokeWidth: 0.45, cap: 'round' },
  ];
}

const WRITE_LINE = '#8DA0B8';

export interface BookCardLayout {
  fields: { label: string; y: number }[];
  boxes: { label: string; x: number; y: number; w: number; h: number }[];
  /** The line under the boxes („Numele personajului:”), clasa I and a II-a. */
  name?: { label: string; y: number };
  stars: { y: number };
  /** The baselines of the rows for the sentence of clasa a II-a. */
  sentence?: { y: number; rows: number[] };
}

const BOOK_RULE_S = 0.1;

export function bookCardLayout(n: number, top: number): BookCardLayout {
  const level = BOOK_LEVELS[n - 1];
  const labels = level === 'CP' ? ['Titlul cărții:'] : level === 'I' ? ['Titlul cărții:', 'Autorul:'] : ['Titlul cărții:', 'Autorul:', 'Personajele:'];
  const fields = labels.map((label, i) => ({ label, y: top + 9 + i * 12 }));
  const boxTop = top + 9 + labels.length * 12 + 2;
  // from the bottom up: the sentence (II), the stars, the name of the character (I, II)
  const sentenceH = level === 'II' ? 8 + 2 * (150 * BOOK_RULE_S + 4) : 0;
  const starsH = 20;
  const nameH = level === 'CP' ? 0 : 12;
  const boxH = BOTTOM - boxTop - 6 - nameH - starsH - sentenceH;
  const gap = 6;
  const bw = (W - 2 * M - gap) / 2;
  const names = level === 'CP' ? ['Desenează coperta cărții.', 'Desenează personajul care ți-a plăcut.'] : ['Desenează personajul care ți-a plăcut.', 'Desenează întâmplarea care ți-a plăcut.'];
  const boxes = names.map((label, i) => ({ label, x: M + i * (bw + gap), y: boxTop + 6, w: bw, h: boxH }));
  let y = boxTop + 6 + boxH;
  const name = level === 'CP' ? undefined : { label: 'Numele personajului:', y: y + 9 };
  y += nameH;
  const stars = { y: y + 11 };
  y += starsH;
  const sentence = level === 'II' ? { y: y + 5, rows: [0, 1].map((k) => y + 8 + 100 * BOOK_RULE_S + k * (150 * BOOK_RULE_S + 4)) } : undefined;
  return { fields, boxes, name, stars, sentence };
}

function bookCardPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = BOOK_LEVELS[n - 1];
  const top = frame(
    ops, config, 'Fișa cărții',
    level === 'CP' ? 'Desenează și colorează, apoi povestește despre carte.' : 'Completează fișa cărții pe care ai citit-o.',
    level === 'CP' ? 'Un adult scrie titlul cărții. Copilul desenează, apoi spune cu vorbele lui ce s-a întâmplat în carte.' : 'Scrie titlul și autorul așa cum sunt pe copertă, cu literă mare la început.',
  );
  const lay = bookCardLayout(n, top);
  const writeLine = (label: string, y: number) => {
    ops.push({ t: 'text', x: M, y, text: label, size: 4.6, fill: INK, weight: 'bold' });
    ops.push({ t: 'line', x1: M + textRoom(label, 4.6) + 3, y1: y + 1, x2: W - M, y2: y + 1, stroke: WRITE_LINE, strokeWidth: 0.4 });
  };
  for (const f of lay.fields) writeLine(f.label, f.y);
  for (const b of lay.boxes) {
    ops.push({ t: 'text', x: b.x, y: b.y - 2.2, text: b.label, size: fitSize(b.label, 4, b.w), fill: INK, weight: 'bold' });
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
  }
  if (lay.name) writeLine(lay.name.label, lay.name.y);
  ops.push({ t: 'text', x: M, y: lay.stars.y + 1.6, text: 'Cât de mult ți-a plăcut cartea? Colorează stelele.', size: 4.4, fill: INK, weight: 'bold' });
  for (let i = 0; i < 5; i++) ops.push({ t: 'polygon', points: starPoints(W - M - 7 - (4 - i) * 14, lay.stars.y, 6), stroke: '#D97706', strokeWidth: 0.5, fill: PAPER });
  if (lay.sentence) {
    ops.push({ t: 'text', x: M, y: lay.sentence.y, text: 'Scrie o propoziție despre carte.', size: 4.4, fill: INK, weight: 'bold' });
    for (const baseline of lay.sentence.rows) ops.push(...rulingOps('II', M, W - 2 * M, baseline, BOOK_RULE_S));
  }
  if (level === 'CP') adultNote(ops, 'Întrebați copilul: Despre cine este cartea? Ce s-a întâmplat? Ce ți-a plăcut cel mai mult?');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/** The columns of the reading log of each class: its title and its share of the width. */
const LOG_COLUMNS: Record<ClrLevel, [string, number][]> = {
  CP: [['Nr.', 0.08], ['Titlul cărții', 0.3], ['Un desen din carte', 0.36], ['Mi-a plăcut?', 0.26]],
  I: [['Nr.', 0.08], ['Titlul cărții', 0.4], ['Autorul', 0.26], ['Mi-a plăcut?', 0.26]],
  II: [['Nr.', 0.08], ['Titlul cărții și autorul', 0.3], ['O propoziție despre carte', 0.36], ['Mi-a plăcut?', 0.26]],
};
const LOG_ROWS: Record<ClrLevel, number> = { CP: 4, I: 6, II: 5 };

function bookLogPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = BOOK_LEVELS[n - 1];
  const top = frame(
    ops, config, 'Jurnalul meu de lectură',
    level === 'CP' ? 'După fiecare carte, desenează ceva din ea și colorează o față.' : level === 'I' ? 'După fiecare carte citită, scrie titlul și autorul, apoi colorează o față.' : 'După fiecare carte citită, scrie titlul, autorul și o propoziție, apoi colorează o față.',
    'Fața veselă: mi-a plăcut mult. Fața liniștită: mi-a plăcut puțin. Fața tristă: nu mi-a plăcut.',
  );
  const cols = LOG_COLUMNS[level];
  const rows = LOG_ROWS[level];
  const x = M;
  const y = top + 3;
  const w = W - 2 * M;
  const head = 10;
  const rh = (BOTTOM - y - head) / rows;
  ops.push({ t: 'rect', x, y, w, h: head + rows * rh, rx: 2, fill: PAPER });
  ops.push({ t: 'rect', x, y, w, h: head, rx: 2, fill: SOFT });
  let cx = x;
  cols.forEach(([label, share], k) => {
    if (k) ops.push({ t: 'line', x1: cx, y1: y, x2: cx, y2: y + head + rows * rh, stroke: INK, strokeWidth: 0.4 });
    ops.push({ t: 'text', x: cx + (w * share) / 2, y: y + 6.6, text: label, size: fitSize(label, 4, w * share - 3), fill: INK, weight: 'bold', align: 'center' });
    for (let r = 0; r < rows; r++) {
      const ry = y + head + r * rh;
      if (k === 0) ops.push({ t: 'text', x: cx + (w * share) / 2, y: ry + rh / 2 + 1.8, text: String(r + 1), size: 5, fill: MUTED, weight: 'bold', align: 'center' });
      // the lines to write on: not in the column of the drawing
      const writes = k === 1 || (k === 2 && level !== 'CP');
      if (writes) for (const f of rh > 30 ? [0.34, 0.62, 0.9] : [0.5, 0.88]) ops.push({ t: 'line', x1: cx + 3, y1: ry + rh * f, x2: cx + w * share - 3, y2: ry + rh * f, stroke: WRITE_LINE, strokeWidth: 0.3 });
      if (k === 3) {
        const fr = Math.min(5.2, rh * 0.2, (w * share - 14) / 6.6);
        ([1, 0, -1] as const).forEach((mood, j) => ops.push(...faceOps(cx + (w * share) / 2 + (j - 1) * fr * 2.6, ry + rh / 2, fr, mood)));
      }
    }
    cx += w * share;
  });
  for (let r = 0; r < rows; r++) ops.push({ t: 'line', x1: x, y1: y + head + r * rh, x2: x + w, y2: y + head + r * rh, stroke: INK, strokeWidth: r ? 0.4 : 0.6 });
  ops.push({ t: 'rect', x, y, w, h: head + rows * rh, rx: 2, stroke: INK, strokeWidth: 0.6 });
  if (level === 'CP') adultNote(ops, 'Un adult scrie titlul. Copilul desenează ceva din carte, colorează fața potrivită și spune de ce.');
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
  if (kind === 'sign' && SIGN_MATCH[n]) return { title, entries: SIGN_MATCH[n].map(([s, w]) => `${signName(s)} – ${w}`), perLine: 2, numbered: true };
  if (kind === 'sign') return { title, entries: SIGN_CONTEXT_SETS[n].map((q) => `${LETTERS[q.answer]}) ${q.options[q.answer]}`), perLine: 2, numbered: true };
  if (kind === 'listen') return { title: `${title}: „${LISTEN_SETS[n - 1].title}”`, entries: LISTEN_SETS[n - 1].questions.map(listenAnswer), perLine: LISTEN_LEVELS[n - 1] === 'II' ? 1 : 2, numbered: true };
  if (kind === 'book') return null;
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
  '🚦': 'semaforul', '🅿️': 'litera P pe albastru', '🚏': 'stâlpul cu autobuz', 'bike-lane': 'cercul albastru cu bicicletă', '🚧': 'bariera cu dungi', '🚷': 'pietonul tăiat',
  'ℹ️': 'litera i', '🛗': 'ușile cu săgeți', '🚰': 'robinetul', firstaid: 'crucea albă pe verde', '🤫': 'fața cu degetul la buze', 'ban-dog': 'câinele tăiat',
  'ban-run': 'omul care aleargă, tăiat', 'must-wash': 'săpunul în cerc albastru', '🚯': 'omul care aruncă, tăiat', '🚱': 'robinetul tăiat', '⚠️': 'triunghiul cu semnul exclamării',
  'ban-fire': 'flacăra tăiată', 'bin-plastic': 'pubela galbenă', 'bin-paper': 'pubela albastră', 'bin-glass': 'pubela verde', fragile: 'paharul crăpat', '☔': 'umbrela cu picături',
  thisup: 'cele două săgeți în sus',
};
function signName(sign: string): string {
  return SIGN_NAMES[sign] ?? sign;
}

/** The page of one „Comunicare” item, or null when the item is not one. */
export function buildClrPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isClrItem(item)) return null;
  const [kind, n] = parts(item);
  if (kind === 'story') return storyPage(config, n, tier);
  if (kind === 'sign') return SIGN_MATCH[n] ? signMatchPage(config, n, tier) : signContextPage(config, n, tier);
  if (kind === 'note') return notePage(config, n, tier);
  if (kind === 'msg') return messagePage(config, n, tier);
  if (kind === 'listen') return listenPage(config, n, tier);
  if (kind === 'book') return BOOK_FORMS[n - 1] === 'card' ? bookCardPage(config, n, tier) : bookLogPage(config, n, tier);
  return writtenPage(config, n, tier);
}
