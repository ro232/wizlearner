import { it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createPagesPdf } from '@/lib/pdf/generate-pdf';
import { PRINTABLE_SAMPLES } from './printables-samples';

/**
 * Draws every reference printable (planșe, cartonașe, jetoane, diplome) as the real PDF, with the
 * embedded Nunito, then as PNG pages (pdftoppm), to look at after a change:
 *   RENDER_PRINTABLES=<folder> npx vitest run src/lib/__tests__/printables-preview.test.ts
 */
const OUT = process.env.RENDER_PRINTABLES;

it.skipIf(!OUT)('render the printables', () => {
  const out = OUT!;
  mkdirSync(out, { recursive: true });
  const fonts = { regular: readFileSync('public/fonts/Nunito-Regular.ttf').toString('base64'), bold: readFileSync('public/fonts/Nunito-Bold.ttf').toString('base64') };
  const only = process.env.RENDER_ONLY ? new RegExp(process.env.RENDER_ONLY) : null;
  for (const [name, build] of Object.entries(PRINTABLE_SAMPLES)) {
    if (only && !only.test(name)) continue;
    const pdf = `${out}/${name}.pdf`;
    writeFileSync(pdf, Buffer.from(createPagesPdf(build(), fonts).output('arraybuffer')));
    execFileSync('pdftoppm', ['-png', '-r', process.env.RENDER_DPI ?? '60', pdf, `${out}/${name}`]);
  }
}, 600_000);
