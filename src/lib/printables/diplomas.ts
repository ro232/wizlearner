import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Script, Tier } from '@/types';
import { normalizeKey } from '@/lib/glyphs/data';
import { cursiveWord } from '@/lib/glyphs/cursive';
import { wrapText } from '@/lib/book/text';
import { textRoom } from '@/lib/worksheet/page-kit';
import { A4_LANDSCAPE, INK, MUTED, GOLD, GOLD_LIGHT, colorAt, drawRun, fitScale, fitText, freeMark, page, pictureOps, star, type BorderStyle } from './common';

/**
 * „Diplome”: a landscape A4 certificate for each child of a list, with a title to pick, the reason
 * under the name, the date, the school and the teacher's name (all optional) and a line to sign.
 * The names and the other texts are typed in the browser and drawn here; they are never stored or
 * sent anywhere (see /planse).
 */

export type DiplomaId = 'merit' | 'cititor' | 'curaj' | 'cp' | 'gradinita' | 'semestru' | 'an';

export interface DiplomaKind {
  id: DiplomaId;
  /** Label of the choice on the page. */
  label: string;
  title: string;
  /** The title for a girl, where Romanian makes it different. */
  titleF?: string;
  reason: string;
  /** Big picture on top (Twemoji). */
  icon: string;
}

export const DIPLOMAS: DiplomaKind[] = [
  { id: 'merit', label: 'Diplomă de merit', title: 'Diplomă de merit', reason: 'pentru silință, rezultate frumoase și pentru bucuria de a învăța în fiecare zi', icon: '🏆' },
  { id: 'cititor', label: 'Cel mai bun cititor', title: 'Cel mai bun cititor', titleF: 'Cea mai bună cititoare', reason: 'pentru dragul de carte și pentru fiecare poveste citită cu atâta drag', icon: '📚' },
  { id: 'curaj', label: 'Pentru curaj', title: 'Diplomă pentru curaj', reason: 'pentru că a încercat din nou și din nou, chiar și atunci când i-a fost greu', icon: '🦁' },
  { id: 'cp', label: 'Am terminat clasa pregătitoare', title: 'Am terminat clasa pregătitoare!', reason: 'Felicitări pentru primul an de școală! Drum frumos spre clasa I!', icon: '🎓' },
  { id: 'gradinita', label: 'Absolvent de grădiniță', title: 'Absolvent de grădiniță', titleF: 'Absolventă de grădiniță', reason: 'pentru anii frumoși petrecuți la grădiniță. Drum bun spre școală!', icon: '🎓' },
  { id: 'semestru', label: 'Sfârșit de semestru', title: 'Diplomă de sfârșit de semestru', reason: 'pentru munca frumoasă și pentru tot ce a învățat în acest semestru', icon: '🌟' },
  { id: 'an', label: 'Sfârșit de an școlar', title: 'Diplomă de sfârșit de an', reason: 'pentru un an școlar plin de reușite, prietenii și lucruri noi', icon: '🏅' },
];

export const diplomaById = (id: string): DiplomaKind => DIPLOMAS.find((d) => d.id === id) ?? DIPLOMAS[0];

export interface DiplomaOptions {
  diploma: DiplomaId;
  /** The feminine title, where there is one („Cea mai bună cititoare”). */
  feminine: boolean;
  /** The name in the handwriting of the first-grade book, or in print. */
  nameScript: Script;
  border: BorderStyle;
}

/** What the teacher types: never saved, never sent. */
export interface DiplomaText {
  names: string[];
  teacher?: string;
  school?: string;
  date?: string;
  /** A title and a reason of her own, instead of the chosen ones. */
  customTitle?: string;
  customReason?: string;
}

const P = A4_LANDSCAPE;
const CX = P.w / 2;
const TITLE_RED = '#B4232C';

/**
 * A name as it goes on the diploma: single spaces, ș/ț with the comma; each part typed all in
 * capitals or all small („POPESCU”, „ana”) gets a capital at the start, a part typed with its own
 * capitals („McLean”) stays as it is.
 */
export function diplomaName(raw: string): string {
  const name = normalizeKey(raw ?? '').replace(/\s+/g, ' ').trim();
  return name.replace(/[^\s-]+/g, (part) => {
    if (part !== part.toLocaleUpperCase('ro') && part !== part.toLocaleLowerCase('ro')) return part;
    const low = part.toLocaleLowerCase('ro');
    return low.charAt(0).toLocaleUpperCase('ro') + low.slice(1);
  });
}

export function diplomaTitle(o: DiplomaOptions, text: Pick<DiplomaText, 'customTitle'> = {}): string {
  const custom = text.customTitle?.replace(/\s+/g, ' ').trim();
  if (custom) return normalizeKey(custom);
  const d = diplomaById(o.diploma);
  return o.feminine && d.titleF ? d.titleF : d.title;
}

function frame(ops: DrawOp[], border: BorderStyle): void {
  if (border === 'dots') {
    // a ring of coloured stars and dots
    const inset = 9;
    const n = 26, m = 18;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) pts.push({ x: inset + ((P.w - 2 * inset) * i) / n, y: inset });
    for (let i = 0; i < m; i++) pts.push({ x: P.w - inset, y: inset + ((P.h - 2 * inset) * i) / m });
    for (let i = 0; i < n; i++) pts.push({ x: P.w - inset - ((P.w - 2 * inset) * i) / n, y: P.h - inset });
    for (let i = 0; i < m; i++) pts.push({ x: inset, y: P.h - inset - ((P.h - 2 * inset) * i) / m });
    pts.forEach((p, i) => ops.push(i % 2 ? { t: 'circle', cx: p.x, cy: p.y, r: 1.6, fill: colorAt(i) } : star(p.x, p.y, 3.2, colorAt(i), colorAt(i), 0.2)));
    ops.push({ t: 'rect', x: 15, y: 15, w: P.w - 30, h: P.h - 30, rx: 4, stroke: '#CBD5E1', strokeWidth: 0.4 });
    return;
  }
  if (border === 'none') {
    ops.push({ t: 'rect', x: 10, y: 10, w: P.w - 20, h: P.h - 20, rx: 4, stroke: INK, strokeWidth: 0.5 });
    return;
  }
  // gold: a strong outer line, a fine inner one, a star in each corner
  ops.push({ t: 'rect', x: 8, y: 8, w: P.w - 16, h: P.h - 16, rx: 5, stroke: GOLD, strokeWidth: 1.8 });
  ops.push({ t: 'rect', x: 12.5, y: 12.5, w: P.w - 25, h: P.h - 25, rx: 3, stroke: GOLD, strokeWidth: 0.4 });
  for (const [x, y] of [[12.5, 12.5], [P.w - 12.5, 12.5], [12.5, P.h - 12.5], [P.w - 12.5, P.h - 12.5]]) {
    ops.push({ t: 'circle', cx: x, cy: y, r: 5.2, fill: '#FFFFFF' });
    ops.push(star(x, y, 4.6, GOLD_LIGHT, GOLD, 0.4));
  }
}

const NAME_LINE = 122;

function nameOps(ops: DrawOp[], name: string, script: Script): void {
  if (script === 'cursive') {
    const g = cursiveWord(name);
    if (g) {
      // written on the line, as by hand (the tails go under it); capitals of 22 mm at most, the whole name within 220 mm
      const s = Math.min(0.22, fitScale([[g]], 7, 220, 400));
      drawRun(ops, [g], CX, NAME_LINE - 1, s, { variant: 'solid', stroke: 7, colors: INK });
      return;
    }
  }
  ops.push({ t: 'text', x: CX, y: NAME_LINE - 5, text: name, size: fitText(name, 17, 220), fill: INK, weight: 'bold', align: 'center' });
}

export function diplomaPage(name: string, o: DiplomaOptions, text: Omit<DiplomaText, 'names'>, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const kind = diplomaById(o.diploma);
  frame(ops, o.border);

  const school = text.school?.replace(/\s+/g, ' ').trim();
  if (school) ops.push({ t: 'text', x: CX, y: 23, text: normalizeKey(school), size: fitText(school, 4.2, 200), fill: MUTED, weight: 'bold', align: 'center' });

  // the picture on top, a star on each side
  ops.push(...pictureOps(kind.icon, CX, 42, 24));
  ops.push(...pictureOps('⭐', CX - 30, 45, 9), ...pictureOps('⭐', CX + 30, 45, 9));
  ops.push(...pictureOps('🎉', CX - 52, 40, 11), ...pictureOps('🎉', CX + 52, 40, 11));

  const title = diplomaTitle(o, text);
  ops.push({ t: 'text', x: CX, y: 73, text: title, size: fitText(title, 13, 236), fill: TITLE_RED, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: CX, y: 88, text: 'se acordă', size: 5.2, fill: MUTED, align: 'center' });

  const clean = diplomaName(name);
  if (clean) nameOps(ops, clean, o.nameScript);
  // the line under the name (where it is written by hand when there is no name)
  ops.push({ t: 'line', x1: CX - 115, y1: NAME_LINE, x2: CX + 115, y2: NAME_LINE, stroke: GOLD, strokeWidth: 0.6 });
  if (!clean || o.nameScript !== 'cursive') ops.push(star(CX, NAME_LINE, 2.6, GOLD_LIGHT, GOLD, 0.35));

  const reason = normalizeKey(text.customReason?.replace(/\s+/g, ' ').trim() || kind.reason);
  const size = 5.4;
  // wrapped by the measured width of Nunito, two lines at most (smaller when a typed reason is long)
  let lines = wrapByWidth(reason, 220, size);
  let s = size;
  while (lines.length > 2 && s > 3.6) {
    s -= 0.3;
    lines = wrapByWidth(reason, 220, s);
  }
  lines.slice(0, 3).forEach((line, i) => ops.push({ t: 'text', x: CX, y: 143 + i * s * 1.35, text: line, size: s, fill: '#334155', align: 'center' }));

  // date on the left, the medal in the middle, the signature on the right
  const lineY = 177;
  const date = text.date?.replace(/\s+/g, ' ').trim();
  if (date) ops.push({ t: 'text', x: 78, y: lineY - 2, text: date, size: fitText(date, 4.6, 66), fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'line', x1: 45, y1: lineY, x2: 111, y2: lineY, stroke: '#94A3B8', strokeWidth: 0.35 });
  ops.push({ t: 'text', x: 78, y: lineY + 5.5, text: 'Data', size: 3.6, fill: MUTED, align: 'center' });

  ops.push(...pictureOps('🏅', CX, lineY - 8, 22));

  ops.push({ t: 'line', x1: P.w - 111, y1: lineY, x2: P.w - 45, y2: lineY, stroke: '#94A3B8', strokeWidth: 0.35 });
  const teacher = text.teacher?.replace(/\s+/g, ' ').trim();
  ops.push({ t: 'text', x: P.w - 78, y: lineY + 5.5, text: teacher ? normalizeKey(teacher) : 'Semnătura', size: teacher ? fitText(teacher, 4, 70) : 3.6, fill: teacher ? INK : MUTED, weight: teacher ? 'bold' : 'normal', align: 'center' });
  if (teacher) ops.push({ t: 'text', x: P.w - 78, y: lineY + 10.5, text: 'Semnătura', size: 3.2, fill: MUTED, align: 'center' });

  freeMark(ops, tier, P, P.w - 20, P.h - 17);
  return page(P, ops);
}

function wrapByWidth(text: string, width: number, size: number): string[] {
  // wrapText estimates; the measured Nunito width decides
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (!line || textRoom(next, size) <= width) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length === 2) {
    // two lines of about the same length, never one word left alone on the second
    let best = lines;
    let widest = Math.max(...lines.map((l) => textRoom(l, size)));
    for (let k = 1; k < words.length; k++) {
      const pair = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
      const w = Math.max(...pair.map((l) => textRoom(l, size)));
      if (w < widest) {
        best = pair;
        widest = w;
      }
    }
    return best;
  }
  return lines.length ? lines : wrapText(text, width, size);
}

/** One diploma per name of the list; with no name, one diploma with the line to write it by hand. */
export function buildDiplomaPages(o: DiplomaOptions, text: DiplomaText, tier: Tier): PageOps[] {
  const names = text.names.map(diplomaName).filter(Boolean);
  const { names: _omit, ...rest } = text;
  void _omit;
  return (names.length ? names : ['']).map((n) => diplomaPage(n, o, rest, tier));
}
