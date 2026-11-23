import { describe, expect, it } from 'vitest';
import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { madeWith } from '@/lib/brand';
import { ADVENT_LEVELS, ADVENT_PLAN, adventBannerVisible, adventDateTitle, buildAdventDay, buildAdventPages, isAdventLevel } from '@/lib/worksheet/advent';
import { themeById } from '@/lib/themes';
import { opsOutside } from './bounds';

const texts = (page: PageOps): string[] => {
  const out: string[] = [];
  const walk = (ops: DrawOp[]) => ops.forEach((op) => (op.t === 'text' ? out.push(op.text) : op.t === 'group' ? walk(op.ops) : undefined));
  walk(page.ops);
  return out;
};
/** Drawn things that are not text: glyphs, pictures, boxes, dots. */
const drawings = (page: PageOps): number => {
  let n = 0;
  const walk = (ops: DrawOp[]) => ops.forEach((op) => (op.t === 'group' ? walk(op.ops) : op.t !== 'text' && op.t !== 'line' ? n++ : undefined));
  walk(page.ops);
  return n;
};

describe('Advent plan', () => {
  it('has the 24 days of December in order, each with an activity', () => {
    expect(ADVENT_PLAN.map((d) => d.day)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(new Set(ADVENT_PLAN.map((d) => adventDateTitle(d.day))).size).toBe(24);
  });

  it('keeps the fixed days: România, Moș Nicolae, Christmas diploma', () => {
    const at = (day: number) => ADVENT_PLAN[day - 1].activity;
    expect(at(1)).toMatchObject({ kind: 'word', theme: '1-decembrie' });
    expect(at(6)).toMatchObject({ kind: 'word', theme: 'mos-nicolae' });
    expect(at(24)).toEqual({ kind: 'diploma' });
  });

  it('uses only theme words that exist (with their picture)', () => {
    for (const { activity: a } of ADVENT_PLAN) {
      const w = a.kind === 'word' ? a : a.kind === 'name' ? a.fallback : null;
      if (w) expect(themeById(w.theme)?.words.some((x) => x.word === w.word), `${w.theme}/${w.word}`).toBe(true);
    }
  });

  it('never does the same kind of activity two days in a row', () => {
    for (let i = 1; i < ADVENT_PLAN.length; i++) expect(ADVENT_PLAN[i].activity.kind, `day ${i + 1}`).not.toBe(ADVENT_PLAN[i - 1].activity.kind);
  });

  it('knows its levels', () => {
    expect(ADVENT_LEVELS.map((l) => l.id)).toEqual(['presc', 'CP', 'I']);
    expect(isAdventLevel('CP')).toBe(true);
    expect(isAdventLevel('II')).toBe(false);
  });
});

describe('Advent pages', () => {
  for (const { id } of ADVENT_LEVELS) {
    for (const name of ['Ștefania', 'Ana-Maria Ionescu', '']) {
      describe(`${id}, ${name ? name : 'fără nume'}`, () => {
        const pages = buildAdventPages(id, name, 'free');

        it('has a cover and 24 day pages, the free tier included', () => {
          expect(pages).toHaveLength(25);
        });

        it('titles every day page with its date', () => {
          pages.slice(1).forEach((p, i) => expect(texts(p), `day ${i + 1}`).toContain(adventDateTitle(i + 1)));
          expect(texts(pages[0]).some((t) => t.startsWith('Calendarul'))).toBe(true);
        });

        it('has content on every page and nothing off the A4 page', () => {
          pages.forEach((p, i) => {
            expect([p.width, p.height]).toEqual([210, 297]);
            expect(drawings(p), `page ${i}`).toBeGreaterThan(10);
            expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `page ${i}`).toEqual([]);
          });
        });

        it('carries the free footer on every page', () => {
          pages.forEach((p, i) => expect(texts(p), `page ${i}`).toContain(madeWith('ro')));
        });
      });
    }
  }

  it('draws the name on the cover and the diploma, and writes it in the header', () => {
    for (const { id } of ADVENT_LEVELS) {
      const named = buildAdventPages(id, 'Ștefania', 'full');
      const plain = buildAdventPages(id, '', 'full');
      expect(texts(named[0])).toContain('al lui / al ei');
      expect(texts(plain[0])).toContain('Calendarul meu de Advent');
      // the name's letters are drawn on the cover and on the last page, not on the plain ones
      const other = buildAdventPages(id, 'Ion', 'full');
      expect(JSON.stringify(named[0])).not.toBe(JSON.stringify(other[0]));
      expect(JSON.stringify(named[24])).not.toBe(JSON.stringify(other[24]));
      expect(JSON.stringify(named[24])).not.toBe(JSON.stringify(plain[24]));
      expect(drawings(named[24])).toBeGreaterThan(drawings(plain[24]));
      expect(texts(named[3]).some((t) => t.includes('Nume: Ștefania'))).toBe(true);
    }
  });

  it('traces the name on the name days, and a theme word without a name', () => {
    const day8 = ADVENT_PLAN[7];
    expect(day8.activity.kind).toBe('name');
    const a = buildAdventDay('presc', 'Ion', day8);
    const b = buildAdventDay('presc', 'Ștefania', day8);
    const c = buildAdventDay('presc', '', day8);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(drawings(c)).toBeGreaterThan(10);
  });

  it('paid accounts get the same pages without the footer', () => {
    const pages = buildAdventPages('CP', 'Ana', 'full');
    expect(pages).toHaveLength(25);
    pages.forEach((p) => expect(texts(p)).not.toContain(madeWith('ro')));
  });

  it('prints the competence of the class on the day pages (existing rules)', () => {
    const presc = buildAdventPages('presc', 'Ana', 'full');
    expect(texts(presc[1]).some((t) => t.startsWith('Comportament vizat D.3.4'))).toBe(true); // word, print capitals
    const cp = buildAdventPages('CP', 'Ana', 'full');
    expect(texts(cp[1]).some((t) => t.startsWith('Competența specifică 4.1') && t.includes('clasa pregătitoare'))).toBe(true);
    const i = buildAdventPages('I', 'Ana', 'full');
    expect(texts(i[1]).some((t) => t.startsWith('Competența specifică 4.1') && t.includes('clasa I'))).toBe(true); // handwriting
    // the cover and the diploma carry none
    for (const p of [presc[0], presc[24]]) expect(texts(p).some((t) => t.includes('Compet') || t.includes('Comportament'))).toBe(false);
  });

  it('a long name still fits', () => {
    for (const { id } of ADVENT_LEVELS) {
      const pages = buildAdventPages(id, 'Maria-Magdalena Constantinescu', 'free');
      pages.forEach((p, i) => expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${id} page ${i}`).toEqual([]));
    }
  });
});

describe('home page card', () => {
  it('shows until Christmas and hides from 26 December 2026', () => {
    expect(adventBannerVisible(new Date(2026, 10, 23))).toBe(true);
    expect(adventBannerVisible(new Date(2026, 11, 25, 23, 59))).toBe(true);
    expect(adventBannerVisible(new Date(2026, 11, 26, 0, 0))).toBe(false);
    expect(adventBannerVisible(new Date(2027, 0, 5))).toBe(false);
  });
});
