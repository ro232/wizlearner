import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pageToSvg } from '@/lib/glyphs/backends/svg';
import { SAMPLES } from './sheets-visual.test';

/**
 * Draws every reference sheet to ./sheets-preview as SVG and PNG, to look at them after a change:
 *   npm run sheets:preview
 */
it.skipIf(!process.env.RENDER_SHEETS)('render the reference sheets', async () => {
  const out = 'sheets-preview';
  mkdirSync(out, { recursive: true });
  const files: string[] = [];
  for (const [name, build] of Object.entries(SAMPLES)) {
    build().forEach((page, i) => {
      const f = `${out}/${name}-${String(i + 1).padStart(2, '0')}.svg`;
      writeFileSync(f, pageToSvg(page));
      files.push(f);
    });
  }
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 800, height: 1200 } });
  const { readFileSync } = await import('node:fs');
  for (const f of files) {
    const svg = readFileSync(f, 'utf8').replace('<svg', '<svg style="width:800px;height:auto;display:block"');
    await tab.setContent(`<body style="margin:0">${svg}</body>`);
    await tab.locator('svg').first().screenshot({ path: f.replace(/\.svg$/, '.png') });
  }
  await browser.close();
  console.log(`${files.length} pages in ./${out}`);
}, 300_000);
