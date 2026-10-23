import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { iconOps } from '@/lib/hints/icons';
import { getGlyph, hintFor } from '@/lib/glyphs/data';
import { renderGlyph } from '@/lib/glyphs/render';
import { patternGlyph } from '@/lib/glyphs/patterns';
import { INK, ACCENT, PAPER, MUTED, itemOps, itemWidth, starPoints } from '@/lib/worksheet/rows';
import { coverGeometry, IN, type CoverGeometry } from './spec';
import { paragraph, bulletList } from './text';
import type { BookConfig } from './interior';

/**
 * Full-wrap paperback cover for KDP: back cover + spine + front cover in one
 * page, with bleed on all sides and the barcode area left clear.
 */

const BG = '#FFF4D6';
const BG_DOT = '#FDE7B0';
const SAFE = 0.25 * IN; // keep text this far inside the trim

const COVER_TEXT = {
  ro: {
    numbersBullet: (max: number) => `${max >= 10 ? 'Cifrele și numerele' : 'Cifrele'} de la 0 la ${max}, cu numărat și scris`,
    tagline: (max: number) => `Alfabetul românesc complet · Ă Â Î Ș Ț · ${max >= 10 ? 'numerele' : 'cifrele'} 0–${max}`,
    ages: 'Pentru copii de 4–7 ani',
    backTitle: 'Învață să scrii, pas cu pas',
    blurb:
      'Un caiet gândit pentru primele litere: fiecare literă are un model mare cu puncte numerotate și săgeți, rânduri de trasat care se estompează treptat și spațiu pentru scris singur.',
    bullets: [
      'Exerciții grafice de pregătire a mâinii: linii, valuri, bucle',
      'Toate cele 31 de litere ale alfabetului românesc, mari și mici',
      'NUMBERS',
      'Ordinea corectă a liniilor, arătată pe fiecare literă',
      'Diplomă la final, pentru micul învățăcel',
    ],
    spine: (title: string) => title,
  },
  en: {
    numbersBullet: (max: number) => `Numbers from 0 to ${max}, counting and writing`,
    tagline: (max: number) => `The complete alphabet · numbers 0–${max}`,
    ages: 'For children aged 4–7',
    backTitle: 'Learn to write, step by step',
    blurb:
      'A workbook made for first letters: every letter has a big model with numbered dots and arrows, tracing rows that fade gradually, and room to write alone.',
    bullets: [
      'Pre-writing exercises: lines, waves, loops',
      'All 26 letters, capital and small',
      'NUMBERS',
      'The correct stroke order, shown on every letter',
      'A certificate at the end for the little learner',
    ],
    spine: (title: string) => title,
  },
};

function glyphs(text: string) {
  return Array.from(text).map((c) => getGlyph(c)).filter((g): g is NonNullable<typeof g> => !!g);
}

function dots(ops: DrawOp[], g: CoverGeometry): void {
  // light dot pattern over the whole wrap (bleed included)
  const step = 12;
  for (let y = 6; y < g.height; y += step) {
    for (let x = 6 + ((y / step) % 2) * (step / 2); x < g.width; x += step) {
      ops.push({ t: 'circle', cx: x, cy: y, r: 1.1, fill: BG_DOT });
    }
  }
}

export function buildCoverPage(config: BookConfig, pageCount: number): PageOps {
  const g = coverGeometry(config.trim, pageCount, config.paper);
  const C = COVER_TEXT[config.alphabet];
  const ops: DrawOp[] = [];

  ops.push({ t: 'rect', x: 0, y: 0, w: g.width, h: g.height, fill: BG });
  dots(ops, g);

  // ── front cover ──
  const fx = g.frontX, fy = g.trimY, fw = g.trimW, fh = g.trimH;
  const fcx = fx + fw / 2;
  // Title card and letter cards scale with the trim; on short trims (8.5 × 8.5 in) they shrink
  // so the tagline and author still sit inside the safe zone.
  const fixed = SAFE * 2 + 6 + 10 + 8 + 10 + 11 + 17 + 14; // gaps, wave strip, tagline, author
  const k = Math.min(1, (fh - fixed) / (fh * 0.7));
  const titleH = fh * 0.3 * k;
  // white card for the title block
  ops.push({ t: 'rect', x: fx + SAFE + 4, y: fy + SAFE + 6, w: fw - SAFE * 2 - 8, h: titleH, rx: 6, fill: PAPER, stroke: ACCENT, strokeWidth: 0.9 });
  let y = fy + SAFE + 6 + titleH * 0.42;
  y = paragraph(ops, config.title, { x: fx + SAFE + 10, y, width: fw - SAFE * 2 - 20, size: Math.min(17, 320 / Math.max(12, config.title.length)), fill: INK, weight: 'bold', align: 'center', lineHeight: 1.15 });
  paragraph(ops, config.subtitle, { x: fx + SAFE + 14, y: y + 3, width: fw - SAFE * 2 - 28, size: 5, fill: MUTED, align: 'center' });

  // showcase letters with numbered dots and arrows, each beside its picture
  const show = config.alphabet === 'ro' ? ['A', 'B', 'Ș', 'Ț'] : ['A', 'B', 'C', 'D'];
  const cardW = (fw - SAFE * 2 - 8 - 10) / 2;
  const cardH = fh * 0.2 * k;
  const topCards = fy + SAFE + 6 + titleH + 10;
  show.forEach((ch, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = fx + SAFE + 4 + col * (cardW + 10);
    const cy = topCards + row * (cardH + 8);
    ops.push({ t: 'rect', x: cx, y: cy, w: cardW, h: cardH, rx: 5, fill: PAPER, stroke: '#FBBF24', strokeWidth: 0.6 });
    const gl = glyphs(ch);
    const s = (cardH * 0.62) / 100;
    const w = itemWidth(gl) * s;
    const hint = hintFor(ch, config.alphabet);
    const pic = Math.min(cardH * 0.62, cardW * 0.4);
    const letterX = hint ? cx + cardW * 0.3 - w / 2 : cx + (cardW - w) / 2;
    ops.push({
      t: 'group',
      tx: letterX,
      ty: cy + cardH * 0.18,
      scale: s,
      ops: itemOps(gl, { color: INK, strokeWidth: 10, variant: 'solid', startDots: true, arrows: true, accent: ACCENT, dotText: PAPER, paper: PAPER, minDotRadius: 1.8 / s }),
    });
    if (hint) ops.push(...iconOps(hint.emoji, cx + cardW * 0.72, cy + cardH / 2, pic));
  });

  // wave strip + tagline
  const stripY = topCards + 2 * cardH + 8 + 10;
  const ws = 0.11;
  const periods = Math.floor((fw - SAFE * 2 - 10) / (60 * ws));
  const wave = patternGlyph('waves', periods);
  ops.push({
    t: 'group',
    tx: fcx - (wave.width * ws) / 2,
    ty: stripY,
    scale: ws,
    ops: renderGlyph(wave, { color: '#F59E0B', strokeWidth: 10, variant: 'dashed', startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
  });
  ops.push({ t: 'text', x: fcx, y: stripY + 100 * ws + 10, text: C.tagline(config.numbersMax), size: 4.4, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: fcx, y: stripY + 100 * ws + 17, text: C.ages, size: 3.8, fill: MUTED, align: 'center' });
  ops.push({ t: 'text', x: fcx, y: fy + fh - SAFE - 4, text: config.author, size: 5, fill: INK, weight: 'bold', align: 'center' });

  // ── spine ──
  if (g.spineTextAllowed && g.spine > 6) {
    const sx = g.spineX + g.spine / 2;
    ops.push({ t: 'text', x: sx, y: g.trimY + g.trimH / 2, text: C.spine(config.title), size: Math.min(5, g.spine * 0.6), fill: INK, weight: 'bold', align: 'center', baseline: 'middle', rotate: -90 });
  }

  // ── back cover ──
  const bx = g.backX, bw = g.trimW;
  const inner = { x: bx + SAFE + 8, w: bw - SAFE * 2 - 16 };
  ops.push({ t: 'rect', x: bx + SAFE + 4, y: fy + SAFE + 10, w: bw - SAFE * 2 - 8, h: fh * 0.62, rx: 6, fill: PAPER, stroke: ACCENT, strokeWidth: 0.9 });
  let by = fy + SAFE + 28;
  by = paragraph(ops, C.backTitle, { x: inner.x, y: by, width: inner.w, size: 8, fill: INK, weight: 'bold', align: 'center' });
  by = paragraph(ops, C.blurb, { x: inner.x, y: by + 4, width: inner.w, size: 4.6, fill: '#334155', align: 'center' });
  by = bulletList(ops, C.bullets.map((b) => (b === 'NUMBERS' ? C.numbersBullet(config.numbersMax) : b)), { x: inner.x + 4, y: by + 8, width: inner.w - 8, size: 4.2, fill: '#334155', gap: 2.5, bullet: '•' });
  for (let i = 0; i < 5; i++) {
    ops.push({ t: 'polygon', points: starPoints(bx + bw / 2 - 24 + i * 12, by + 10, 4), stroke: '#D97706', strokeWidth: 0.5, fill: '#FDE68A' });
  }
  ops.push({ t: 'text', x: bx + bw / 2, y: fy + fh - SAFE - 4, text: config.author, size: 4.2, fill: INK, weight: 'bold', align: 'center' });
  // KDP places the barcode in the lower right of the back cover (2 × 1.2 in); keep it clear.

  return { width: g.width, height: g.height, ops };
}
