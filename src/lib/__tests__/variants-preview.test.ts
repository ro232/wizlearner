import { it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';

/**
 * „Altă variantă”: several seeds of every family side by side, as the real PDF (embedded Nunito) turned into PNG
 * contact sheets, to look at them after a change:
 *   RENDER_VARIANTS=<folder> npx vitest run src/lib/__tests__/variants-preview.test.ts
 * (RENDER_ONLY=<regexp> for some families; needs pdftoppm and ImageMagick's montage.)
 */
const SEEDS = [1, 2, 3, 7, 19, 40];
const FAMILIES: Record<string, Partial<WorksheetConfig>> = {
  'find-A-presc': { selectedItems: ['find:A'], curriculumLevel: 'presc' },
  'find-S-cp': { selectedItems: ['find:Ș'], curriculumLevel: 'CP' },
  count: { selectedItems: ['count:10'] },
  dots: { selectedItems: ['dots:house'] },
  sound: { selectedItems: ['sound:C'] },
  first: { selectedItems: ['first:1'] },
  syl: { selectedItems: ['syl:2'] },
  split: { selectedItems: ['split:3'] },
  'sort-2': { selectedItems: ['sort:2'] },
  'sort-5': { selectedItems: ['sort:5'] },
  odd: { selectedItems: ['odd:4'] },
  group: { selectedItems: ['group:5'] },
  'pos-1': { selectedItems: ['pos:1'] },
  'pos-3': { selectedItems: ['pos:3'] },
  'pos-5': { selectedItems: ['pos:5'] },
  color: { selectedItems: ['color:2'] },
  colsum: { selectedItems: ['colsum:5'] },
  maze: { selectedItems: ['maze:2'] },
  'diff-1': { selectedItems: ['diff:1'] },
  'diff-5': { selectedItems: ['diff:5'] },
  'diff-key': { selectedItems: ['diff:3', 'maze:1'], mathAnswers: true },
  'trace-4': { selectedItems: ['trace:4'] },
  'trace-6': { selectedItems: ['trace:6'] },
  'shadow-1': { selectedItems: ['shadow:1'] },
  'shadow-2': { selectedItems: ['shadow:2'] },
  'shadow-3': { selectedItems: ['shadow:3'] },
  'shadow-4': { selectedItems: ['shadow:4'] },
  'shadow-5': { selectedItems: ['shadow:5'] },
  'shadow-6': { selectedItems: ['shadow:6'] },
  'terms-1': { selectedItems: ['terms:1'] },
  'terms-5': { selectedItems: ['terms:5'] },
  place: { selectedItems: ['place:1'] },
  coord: { selectedItems: ['coord:1'] },
  sides: { selectedItems: ['sides:1'] },
  solid: { selectedItems: ['solid:1'] },
  'regular-1': { selectedItems: ['regular:1'] },
  'regular-3': { selectedItems: ['regular:3'] },
  'sort2-1': { selectedItems: ['sort2:1'] },
  'sort2-2': { selectedItems: ['sort2:2'] },
  around: { selectedItems: ['around:1'] },
  pict: { selectedItems: ['pict:1'] },
  more: { selectedItems: ['more:1'] },
  // the math sheets of this change follow „Alte exerciții” (mathSeed)
  calmonth: { category: 'math', selectedItems: ['calmonth'], curriculumLevel: 'II' },
  'length-II': { category: 'math', selectedItems: ['length'], curriculumLevel: 'II' },
  'mass-II': { category: 'math', selectedItems: ['mass'], curriculumLevel: 'II' },
  'mass-II-key': { category: 'math', selectedItems: ['mass', 'length'], curriculumLevel: 'II', mathAnswers: true },
};

it.skipIf(!process.env.RENDER_VARIANTS)('render several seeds of every family as contact sheets', async () => {
  const out = process.env.RENDER_VARIANTS!;
  const { createPagesPdf } = await import('@/lib/pdf/generate-pdf');
  mkdirSync(`${out}/pages`, { recursive: true });
  const fonts = { regular: readFileSync('public/fonts/Nunito-Regular.ttf').toString('base64'), bold: readFileSync('public/fonts/Nunito-Bold.ttf').toString('base64') };
  const only = process.env.RENDER_ONLY ? new RegExp(process.env.RENDER_ONLY) : null;
  for (const [name, patch] of Object.entries(FAMILIES)) {
    if (only && !only.test(name)) continue;
    const key = name.endsWith('-key');
    const pages = SEEDS.flatMap((seed) => {
      const config = { ...DEFAULT_CONFIG, category: 'games', ...patch, ...(patch.category === 'math' ? { mathSeed: seed } : seed > 1 ? { variantSeed: seed } : {}) } as WorksheetConfig;
      const all = buildWorksheetPages(config, 'full');
      return key ? all.slice(-1) : all.slice(0, 1);
    });
    const pdf = `${out}/pages/${name}.pdf`;
    writeFileSync(pdf, Buffer.from(createPagesPdf(pages, fonts).output('arraybuffer')));
    execFileSync('pdftoppm', ['-png', '-r', process.env.RENDER_DPI ?? '60', pdf, `${out}/pages/${name}`]);
    const files = SEEDS.map((_, i) => `${out}/pages/${name}-${i + 1}.png`);
    execFileSync('montage', [...files, '-tile', '3x2', '-geometry', '+6+6', '-background', '#888888', `${out}/${name}.png`]);
  }
}, 600_000);
