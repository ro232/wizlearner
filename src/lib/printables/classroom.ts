import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Tier } from '@/types';
import { textRoom } from '@/lib/worksheet/page-kit';
import { A4_LANDSCAPE, INK, MUTED, colorAt, fitText, freeMark, page, pageBorder, pictureOps, type BorderStyle } from './common';

/**
 * Two boards for the classroom wall, landscape A4:
 *  - „Orarul clasei”: the five school days, a row per lesson, to fill in by hand;
 *  - „Ziua de azi”: the day of the week, the date, the weather and the season, with pictures,
 *    for the morning circle (the children circle or peg what fits today).
 */

const P = A4_LANDSCAPE;
export const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri'];
export const WEEK = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

/** A soft tint of a palette colour, for the header cells. */
function tint(hex: string, amount = 0.85): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0');
  return `#${mix(n >> 16)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

export interface TimetableOptions {
  lessons: number;
  border: BorderStyle;
}

export function buildTimetablePages(o: TimetableOptions, tier: Tier): PageOps[] {
  const ops: DrawOp[] = [];
  pageBorder(ops, o.border, P, colorAt(1));
  ops.push(...pictureOps('🎒', 40, 30, 15), ...pictureOps('📚', P.w - 40, 30, 15));
  ops.push({ t: 'text', x: P.w / 2, y: 34, text: 'Orarul clasei', size: 12, fill: INK, weight: 'bold', align: 'center' });

  const lessons = Math.min(7, Math.max(4, Math.round(o.lessons)));
  const x0 = 24, top = 48, bottom = P.h - 22;
  const first = 20;
  const colW = (P.w - 2 * x0 - first) / DAYS.length;
  const headH = 13;
  const rowH = (bottom - top - headH - 2) / lessons;

  DAYS.forEach((day, i) => {
    const x = x0 + first + i * colW;
    const color = colorAt(i * 2);
    ops.push({ t: 'rect', x: x + 1, y: top, w: colW - 2, h: headH, rx: 3, fill: tint(color), stroke: color, strokeWidth: 0.6 });
    ops.push({ t: 'text', x: x + colW / 2, y: top + headH / 2 + 2, text: day, size: 5.6, fill: color, weight: 'bold', align: 'center' });
    for (let r = 0; r < lessons; r++) {
      ops.push({ t: 'rect', x: x + 1, y: top + headH + 2 + r * rowH + 1, w: colW - 2, h: rowH - 2, rx: 2.5, stroke: '#CBD5E1', strokeWidth: 0.4 });
    }
  });
  for (let r = 0; r < lessons; r++) {
    const cy = top + headH + 2 + r * rowH + rowH / 2;
    ops.push({ t: 'circle', cx: x0 + first / 2, cy, r: 5.5, fill: tint(colorAt(3), 0.8), stroke: colorAt(3), strokeWidth: 0.5 });
    ops.push({ t: 'text', x: x0 + first / 2, y: cy + 1.9, text: String(r + 1), size: 5.4, fill: INK, weight: 'bold', align: 'center' });
  }
  freeMark(ops, tier, P, P.w - 22, P.h - 15);
  return [page(P, ops)];
}

export const WEATHER: { label: string; emoji: string }[] = [
  { label: 'însorit', emoji: '☀️' },
  { label: 'înnorat', emoji: '☁️' },
  { label: 'ploaie', emoji: '🌧️' },
  { label: 'ninsoare', emoji: '🌨️' },
  { label: 'vânt', emoji: '🌬️' },
  { label: 'furtună', emoji: '🌩️' },
];

export const SEASONS: { label: string; emoji: string }[] = [
  { label: 'primăvara', emoji: '🌸' },
  { label: 'vara', emoji: '🌻' },
  { label: 'toamna', emoji: '🍂' },
  { label: 'iarna', emoji: '⛄' },
];

function panel(ops: DrawOp[], x: number, y: number, w: number, h: number, title: string, color: string): void {
  ops.push({ t: 'rect', x, y, w, h, rx: 4, stroke: color, strokeWidth: 0.8 });
  ops.push({ t: 'rect', x: x + 6, y: y - 4.5, w: Math.min(w - 12, textRoom(title, 5.2) + 10), h: 9, rx: 4.5, fill: color });
  ops.push({ t: 'text', x: x + 11, y: y + 1.9, text: title, size: 5.2, fill: '#FFFFFF', weight: 'bold' });
}

export function buildTodayPages(o: { border: BorderStyle }, tier: Tier): PageOps[] {
  const ops: DrawOp[] = [];
  pageBorder(ops, o.border, P, colorAt(2));
  ops.push({ t: 'text', x: P.w / 2, y: 30, text: 'Ziua de azi', size: 12, fill: INK, weight: 'bold', align: 'center' });
  ops.push(...pictureOps('☀️', P.w / 2 - 52, 26, 13), ...pictureOps('🌈', P.w / 2 + 52, 26, 13));

  const L = 22, R = P.w - 22, mid = P.w / 2;
  const top1 = 46, h1 = 64, top2 = 124, h2 = 68;

  // Azi este: the days of the week, to circle
  panel(ops, L, top1, mid - L - 4, h1, 'Azi este', colorAt(1));
  const dayW = (mid - L - 4 - 10) / 4;
  WEEK.forEach((d, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = L + 5 + col * dayW, y = top1 + 11 + row * 26;
    const color = colorAt(i);
    ops.push({ t: 'rect', x: x + 1, y, w: dayW - 2, h: 18, rx: 9, fill: tint(color), stroke: color, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: x + dayW / 2, y: y + 11, text: d, size: fitText(d, 4.8, dayW - 6), fill: color, weight: 'bold', align: 'center' });
  });

  // Data: the day, the month and the year, written in
  panel(ops, mid + 4, top1, R - mid - 4, h1, 'Data', colorAt(3));
  const room = R - mid - 4 - 16 - 2 * 5;
  const fields: [string, number][] = [['ziua', room * 0.24], ['luna', room * 0.44], ['anul', room * 0.32]];
  let fx = mid + 12;
  for (const [label, w] of fields) {
    ops.push({ t: 'rect', x: fx, y: top1 + 14, w, h: 30, rx: 3, stroke: '#CBD5E1', strokeWidth: 0.5 });
    ops.push({ t: 'text', x: fx + w / 2, y: top1 + 52, text: label, size: 4.2, fill: MUTED, align: 'center' });
    fx += w + 5;
  }

  // Vremea: six kinds of weather
  panel(ops, L, top2, mid - L - 4, h2, 'Vremea', colorAt(5));
  const ww = (mid - L - 4 - 8) / 3;
  WEATHER.forEach((w, i) => {
    const cx = L + 4 + (i % 3) * ww + ww / 2, cy = top2 + 16 + Math.floor(i / 3) * 30;
    ops.push(...pictureOps(w.emoji, cx, cy, 15));
    ops.push({ t: 'text', x: cx, y: cy + 12.5, text: w.label, size: 4, fill: INK, weight: 'bold', align: 'center' });
  });

  // Anotimpul: the four seasons
  panel(ops, mid + 4, top2, R - mid - 4, h2, 'Anotimpul', colorAt(2));
  const sw = (R - mid - 4 - 8) / 4;
  SEASONS.forEach((s, i) => {
    const cx = mid + 8 + i * sw + sw / 2, cy = top2 + 28;
    ops.push(...pictureOps(s.emoji, cx, cy, 22));
    ops.push({ t: 'text', x: cx, y: cy + 21, text: s.label, size: fitText(s.label, 4.6, sw - 4), fill: INK, weight: 'bold', align: 'center' });
  });

  freeMark(ops, tier, P, P.w - 22, P.h - 15);
  return [page(P, ops)];
}
