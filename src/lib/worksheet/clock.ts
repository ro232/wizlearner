import type { DrawOp, Subpath } from '@/lib/glyphs/types';
import type { WorksheetConfig } from '@/types';
import { INK, MUTED, PAPER } from './rows';

/**
 * „Cât este ceasul?”: clock faces drawn as vectors (a circle, 60 ticks, the numbers 1–12, a short thick
 * hour hand and a long thin minute hand), to read or to draw the hands on.
 *
 * The steps follow the programme: clasa I „Ora (ora fixă, jumătatea de oră)”; clasa a II-a „Ora (1 oră =
 * 60 de minute; 5 minute; jumătatea de oră, sfertul de oră)” (config.mathClock):
 *   hour     ora fixă              ora 3        3:00
 *   half     … and half hours      3 și jumătate 3:30
 *   quarter  … and quarters        3 și un sfert 3:15, 4 fără un sfert 3:45
 *   five     … every 5 minutes     3 și 20 de minute 3:20, 4 fără 10 minute 3:50
 */

export const CLOCK_STEPS = ['hour', 'half', 'quarter', 'five'] as const;
export type ClockStep = (typeof CLOCK_STEPS)[number];
/** Unset: ore fixe and half hours (clasa I), the free plan's clocks too. */
export const DEFAULT_CLOCK: ClockStep = 'half';
export const FREE_CLOCK_STEPS: readonly ClockStep[] = ['hour', 'half'];

export const CLOCK_STEP_LABELS: Record<ClockStep, string> = { hour: 'Ore fixe', half: 'Și jumătăți', quarter: 'Și sferturi', five: 'Din 5 în 5 minute' };

export function clockStepOf(config: Pick<WorksheetConfig, 'mathClock'>): ClockStep {
  const c = config.mathClock;
  return c && (CLOCK_STEPS as readonly string[]).includes(c) ? c : DEFAULT_CLOCK;
}

export interface ClockTime {
  /** 1–12, as on the clock face. */
  h: number;
  /** 0–55, a multiple of 5. */
  m: number;
}

const next = (h: number) => (h % 12) + 1;
const minutes = (n: number) => `${n} ${n >= 20 ? 'de ' : ''}minute`;

/** How a time is said: „ora 3”, „3 și jumătate”, „3 și un sfert”, „4 fără un sfert”, „3 și 20 de minute”, „4 fără 10 minute”. */
export function timeWords({ h, m }: ClockTime): string {
  if (m === 0) return `ora ${h}`;
  if (m === 30) return `${h} și jumătate`;
  if (m === 15) return `${h} și un sfert`;
  if (m === 45) return `${next(h)} fără un sfert`;
  return m < 30 ? `${h} și ${minutes(m)}` : `${next(h)} fără ${minutes(60 - m)}`;
}

/** „3:05”, „12:45”. */
export const digital = ({ h, m }: ClockTime) => `${h}:${String(m).padStart(2, '0')}`;

/** Where the hands point, for the answers of „Desenează acele”: „acul mic între 3 și 4, acul mare la 6”. */
export function handsWords({ h, m }: ClockTime): string {
  const small = m === 0 ? `acul mic la ${h}` : `acul mic între ${h} și ${next(h)}`;
  return `${small}, acul mare la ${m === 0 ? 12 : m / 5}`;
}

/** Angles in degrees, clockwise from 12: the hour hand moves on between the numbers. */
export const hourAngle = ({ h, m }: ClockTime) => ((h % 12) + m / 60) * 30;
export const minuteAngle = ({ m }: ClockTime) => m * 6;

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * `count` different times (different hours) of the step, every kind of the step among them:
 * half: ore fixe and half hours; quarter: also „și un sfert” and „fără un sfert”; five: one of each
 * of those, the rest every 5 minutes (5, 10, 20, 25, 35, 40, 50, 55).
 */
export function clockTimes(step: ClockStep, rand: () => number, count = 6): ClockTime[] {
  let kinds: number[][];
  if (step === 'hour') kinds = [[0]];
  else if (step === 'half') kinds = [[0], [30]];
  else if (step === 'quarter') kinds = [[0], [30], [15], [45]];
  else kinds = [[0], [30], [15, 45], [5, 10, 20, 25], [35, 40, 50, 55], [5, 10, 20, 25, 35, 40, 50, 55]];
  const plan = Array.from({ length: count }, (_, i) => kinds[i % kinds.length]);
  const hours = shuffle(Array.from({ length: 12 }, (_, i) => i + 1), rand);
  return shuffle(plan, rand).map((ms, i) => ({ h: hours[i % 12], m: ms[int(rand, 0, ms.length - 1)] }));
}

export function clockTitle(kind: 'clock' | 'clockdraw', step: ClockStep): string {
  const what = { hour: 'ore fixe', half: 'ore fixe și jumătăți', quarter: 'ore fixe, jumătăți și sferturi', five: 'din 5 în 5 minute' }[step];
  return kind === 'clock' ? `Cât este ceasul? (${what})` : `Desenează acele ceasului (${what})`;
}

/** The hands as parts of the radius: the minute hand ends before the numbers, so none is hidden under it. */
export const HOUR_HAND = { length: 0.36, width: 0.095 };
export const MINUTE_HAND = { length: 0.58, width: 0.036 };

const at = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
};

function hand(cx: number, cy: number, r: number, deg: number, def: { length: number; width: number }): DrawOp {
  const tip = at(cx, cy, r * def.length, deg);
  const sp: Subpath = { start: { x: cx, y: cy }, segs: [{ kind: 'L', p: tip }] };
  return { t: 'path', subpaths: [sp], stroke: INK, strokeWidth: r * def.width, cap: 'round' };
}

/** A clock face centred on (cx, cy), radius r; with the hands of `time`, or blank (only the centre). */
export function clockFaceOps(cx: number, cy: number, r: number, time?: ClockTime): DrawOp[] {
  const ops: DrawOp[] = [{ t: 'circle', cx, cy, r, fill: PAPER, stroke: INK, strokeWidth: Math.max(0.6, r * 0.045) }];
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const a = at(cx, cy, r * 0.93, i * 6);
    const b = at(cx, cy, r * (big ? 0.82 : 0.88), i * 6);
    ops.push({ t: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: big ? INK : MUTED, strokeWidth: big ? Math.max(0.45, r * 0.022) : 0.22 });
  }
  const size = r * 0.2;
  for (let n = 1; n <= 12; n++) {
    const p = at(cx, cy, r * 0.71, n * 30);
    ops.push({ t: 'text', x: p.x, y: p.y + size * 0.36, text: String(n), size, fill: INK, weight: 'bold', align: 'center' });
  }
  if (time) {
    ops.push(hand(cx, cy, r, hourAngle(time), HOUR_HAND));
    ops.push(hand(cx, cy, r, minuteAngle(time), MINUTE_HAND));
  }
  ops.push({ t: 'circle', cx, cy, r: Math.max(0.9, r * 0.055), fill: INK });
  return ops;
}

/** Two boxes with „:” between them, centred on cx: the hours and the minutes. */
function digitalBoxes(ops: DrawOp[], cx: number, cy: number, w: number, h: number): void {
  for (const dx of [-w - 2, 2]) ops.push({ t: 'rect', x: cx + dx, y: cy - h / 2, w, h, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
  ops.push({ t: 'text', x: cx, y: cy + h * 0.3, text: ':', size: h * 0.8, fill: INK, weight: 'bold', align: 'center' });
}

/**
 * A grid of clocks: to read (`read`: the hands drawn, boxes for the time under each) or to draw on
 * (blank faces, the time written under each, in words and digits).
 */
export function clocksOps(times: ClockTime[], read: boolean, x0: number, x1: number, top: number, bottom: number, cols = 2, label: (i: number) => string = (i) => `${String.fromCharCode(97 + i)})`): DrawOp[] {
  const ops: DrawOp[] = [];
  const rows = Math.ceil(times.length / cols);
  const colW = (x1 - x0) / cols;
  const rowH = (bottom - top) / rows;
  const under = read ? 16 : 15;
  const r = Math.min(colW / 2 - 9, (rowH - under - 6) / 2);
  times.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = x0 + col * colW;
    const y = top + row * rowH;
    ops.push({ t: 'rect', x: x + 1.2, y: y + 1.2, w: colW - 2.4, h: rowH - 2.4, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x + 4.5, y: y + 7, text: label(i), size: 3.6, fill: MUTED, weight: 'bold' });
    const cx = x + colW / 2;
    const cy = y + 3 + r + (rowH - 2 * r - under - 3) / 2;
    ops.push(...clockFaceOps(cx, cy, r, read ? t : undefined));
    if (read) {
      digitalBoxes(ops, cx, cy + r + under / 2 + 0.5, Math.min(14, r * 0.55), Math.min(11, under - 4));
    } else {
      const words = timeWords(t);
      const size = Math.min(4.8, (colW - 8) / Math.max(1, words.length * 0.56));
      ops.push({ t: 'text', x: cx, y: cy + r + 7, text: words, size, fill: INK, weight: 'bold', align: 'center' });
      ops.push({ t: 'text', x: cx, y: cy + r + 12.6, text: `(${digital(t)})`, size: 3.6, fill: MUTED, weight: 'bold', align: 'center' });
    }
  });
  return ops;
}
