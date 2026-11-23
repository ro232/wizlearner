import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pageToSvg } from '@/lib/glyphs/backends/svg';
import { ADVENT_LEVELS, buildAdventPages } from '@/lib/worksheet/advent';

/**
 * Draws the whole Advent calendar (every level, with and without a name) as SVG files, to look at:
 *   RENDER_ADVENT=<folder> npx vitest run src/lib/__tests__/advent-preview.test.ts
 */
const OUT = process.env.RENDER_ADVENT;

it.skipIf(!OUT)('render the Advent calendar', async () => {
  const out = OUT!;
  mkdirSync(out, { recursive: true });
  const files: string[] = [];
  for (const { id } of ADVENT_LEVELS) {
    for (const name of ['Ștefania', '']) {
      buildAdventPages(id, name, 'free').forEach((page, i) => {
        const f = `${out}/${id}-${name ? 'nume' : 'fara'}-${String(i).padStart(2, '0')}.svg`;
        writeFileSync(f, pageToSvg(page));
        files.push(f);
      });
    }
  }
  console.log(`${files.length} pages in ${out}`);
}, 600_000);
