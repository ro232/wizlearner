import { describe, expect, it } from 'vitest';
import { buildBookPages, DEFAULT_BOOK_CONFIG, type BookConfig } from '@/lib/book/interior';
import { TRIM_SIZES, type TrimKey } from '@/lib/book/spec';
import { opsOutside } from './bounds';

const SAFE = 0.25 * 25.4; // KDP: keep content at least 0.25 in inside the trim

const variants: Partial<BookConfig>[] = [
  {},
  { alphabet: 'en' },
  { numbersMax: 20 },
  { variant: 'dotted', includePrewriting: false },
  { variant: 'outline', watermark: true },
  { script: 'cursive' },
  { script: 'cursive', variant: 'dotted', includeNumbers: false },
];

describe('KDP interior', () => {
  for (const trim of Object.keys(TRIM_SIZES) as TrimKey[]) {
    for (const v of variants) {
      const config = { ...DEFAULT_BOOK_CONFIG, trim, ...v };
      it(`keeps every page inside the safe area (${trim}, ${JSON.stringify(v)})`, () => {
        const pages = buildBookPages(config);
        expect(pages.length % 2).toBe(0);
        expect(pages.length).toBeGreaterThanOrEqual(24);
        pages.forEach((page, i) => {
          const area = { minX: SAFE, minY: SAFE, maxX: page.width - SAFE, maxY: page.height - SAFE };
          expect(opsOutside(page, area), `page ${i + 1}`).toEqual([]);
        });
      });
    }
  }

  it('calls 10 and above numbers, not digits', () => {
    const pages = buildBookPages({ ...DEFAULT_BOOK_CONFIG, numbersMax: 12 });
    const titles = pages.flatMap((p) => p.ops).filter((o) => o.t === 'text').map((o) => (o as { text: string }).text);
    expect(titles).toContain('Cifra 9');
    expect(titles).toContain('Numărul 10');
    expect(titles).not.toContain('Cifra 10');
  });
});

describe('KDP cover', () => {
  it('keeps text and pictures inside the trim safe zones on every trim', async () => {
    const { buildCoverPage } = await import('@/lib/book/cover');
    const { coverGeometry } = await import('@/lib/book/spec');
    const { flattenOps } = await import('@/lib/glyphs/geometry');
    const { opBox } = await import('./bounds');
    for (const trim of Object.keys(TRIM_SIZES) as TrimKey[]) {
      const page = buildCoverPage({ ...DEFAULT_BOOK_CONFIG, trim }, 60);
      const g = coverGeometry(trim, 60, 'white');
      // Everything except the full-bleed background and its dots stays 0.25 in inside the cover's trim.
      const bad = flattenOps(page.ops)
        .filter((op) => !(op.t === 'rect' && op.w >= g.width - 0.1) && !(op.t === 'circle' && op.r < 1.2))
        .map((op) => ({ op, b: opBox(op) }))
        .filter(({ b }) => b && (b.minX < g.backX + SAFE - 0.3 || b.maxX > g.frontX + g.trimW - SAFE + 0.3 || b.minY < g.trimY + SAFE - 0.3 || b.maxY > g.trimY + g.trimH - SAFE + 0.3));
      expect(bad.map(({ op, b }) => `${op.t}${op.t === "text" ? ` "${op.text}"` : ""} ${b!.maxY.toFixed(1)}`), trim).toEqual([]);
    }
  });
});
