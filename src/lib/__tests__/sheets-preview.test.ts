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

/**
 * The same reference sheets as the real PDF, with the embedded Nunito, then PNG pages (pdftoppm), to look at the text as
 * it prints:  RENDER_SHEETS_PDF=<folder> RENDER_ONLY=<regexp> npx vitest run src/lib/__tests__/sheets-preview.test.ts
 */
it.skipIf(!process.env.RENDER_SHEETS_PDF)('render the reference sheets as PDF', async () => {
  const out = process.env.RENDER_SHEETS_PDF!;
  const { execFileSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const { createPagesPdf } = await import('@/lib/pdf/generate-pdf');
  mkdirSync(out, { recursive: true });
  const fonts = { regular: readFileSync('public/fonts/Nunito-Regular.ttf').toString('base64'), bold: readFileSync('public/fonts/Nunito-Bold.ttf').toString('base64') };
  const only = process.env.RENDER_ONLY ? new RegExp(process.env.RENDER_ONLY) : null;
  for (const [name, build] of Object.entries(SAMPLES)) {
    if (only && !only.test(name)) continue;
    const pdf = `${out}/${name}.pdf`;
    writeFileSync(pdf, Buffer.from(createPagesPdf(build(), fonts).output('arraybuffer')));
    execFileSync('pdftoppm', ['-png', '-r', process.env.RENDER_DPI ?? '70', pdf, `${out}/${name}`]);
  }
}, 600_000);
