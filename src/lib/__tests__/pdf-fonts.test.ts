import { afterEach, describe, expect, it, vi } from 'vitest';
import { foldDiacritics } from '@/lib/glyphs/backends/pdf';
import { FontLoadError, downloadErrorMessage } from '@/lib/pdf/errors';
import { DEFAULT_BOOK_CONFIG } from '@/lib/book/interior';
import { buildMathPages } from '@/lib/worksheet/math';
import { flattenOps } from '@/lib/glyphs/geometry';
import { DEFAULT_CONFIG } from '@/types';

const fontBytes = () => new Response(new Uint8Array(20_000));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('loading the embedded font', () => {
  it('forgives one failed load', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      if (calls <= 2) throw new TypeError('Failed to fetch');
      return fontBytes();
    }));
    const { loadEmbeddedFonts } = await import('@/lib/pdf/generate-pdf');
    const fonts = await loadEmbeddedFonts(1);
    expect(fonts.regular.length).toBeGreaterThan(1000);
    expect(fonts.bold.length).toBeGreaterThan(1000);
    expect(calls).toBe(4);
  });

  it('gives up with a clear error after the second failure, and starts over next time', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async () => (fail ? new Response('blocked', { status: 403 }) : fontBytes())));
    const { loadEmbeddedFonts } = await import('@/lib/pdf/generate-pdf');
    await expect(loadEmbeddedFonts(1)).rejects.toMatchObject({ name: 'FontLoadError' });
    await expect(loadEmbeddedFonts(1)).rejects.toMatchObject({ name: 'FontLoadError' });
    fail = false;
    await expect(loadEmbeddedFonts(1)).resolves.toMatchObject({ regular: expect.any(String) });
  });

  it('a web page served in place of the font is not a font', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Autentificare Wi-Fi</html>')));
    const { loadEmbeddedFonts } = await import('@/lib/pdf/generate-pdf');
    await expect(loadEmbeddedFonts(1)).rejects.toMatchObject({ name: 'FontLoadError' });
  });

  it('no download is made without the font', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const pdf = await import('@/lib/pdf/generate-pdf');
    const book = await import('@/lib/pdf/generate-book');
    await expect(pdf.generateWorksheetPDF({ ...DEFAULT_CONFIG, selectedItems: ['A'] }, 'free')).rejects.toMatchObject({ name: 'FontLoadError' });
    await expect(book.downloadBookInterior(DEFAULT_BOOK_CONFIG)).rejects.toMatchObject({ name: 'FontLoadError' });
    await expect(book.downloadBookCover(DEFAULT_BOOK_CONFIG, 60)).rejects.toMatchObject({ name: 'FontLoadError' });
  }, 20_000);

  it('the KDP book is never built without the embedded font', async () => {
    const book = await import('@/lib/pdf/generate-book');
    expect(() => book.createBookInteriorPdf(DEFAULT_BOOK_CONFIG, null)).toThrow(/font/i);
    expect(() => book.createBookCoverPdf(DEFAULT_BOOK_CONFIG, 60, null)).toThrow(/font/i);
  });
});

describe('text for a font that only has Latin-1', () => {
  it('keeps the minus sign and the Romanian letters readable', () => {
    expect(foldDiacritics('7 − 2 =')).toBe('7 - 2 =');
    expect(foldDiacritics('Scăderi și adunări până la 10')).toBe('Scaderi si adunari pâna la 10');
    expect(foldDiacritics('Ștefan Ţuţu „Bravo!” – 3…')).toBe('Stefan Tutu "Bravo!" - 3...');
  });

  it('nothing on a math sheet falls outside Latin-1 after folding', () => {
    for (const range of [10, 100]) {
      const pages = buildMathPages({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['cmp', 'add', 'sub', 'mix', 'missing', 'seq', 'nbr'], mathRange: range, mathAnswers: true }, 'full');
      for (const page of pages) for (const op of flattenOps(page.ops)) {
        if (op.t !== 'text' || op.emoji) continue;
        for (const ch of foldDiacritics(op.text)) expect(ch.charCodeAt(0), `${op.text}`).toBeLessThanOrEqual(0xff);
        expect(foldDiacritics(op.text)).not.toContain('?'.repeat(2));
      }
    }
  });
});

describe('what the person is told', () => {
  it('names the cause when it is known', () => {
    expect(downloadErrorMessage(new FontLoadError())).toMatch(/fontul/);
    const chunk = Object.assign(new Error('Loading chunk 620 failed.'), { name: 'ChunkLoadError' });
    expect(downloadErrorMessage(chunk)).toMatch(/reîncarcă pagina/);
    expect(downloadErrorMessage(new Error('boom'))).toBe('Nu am putut pregăti PDF-ul. Încearcă din nou.');
    expect(downloadErrorMessage(undefined)).toMatch(/Încearcă din nou/);
  });
});
