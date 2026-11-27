'use client';

import { useEffect, useRef } from 'react';
import type { SchoolLevel } from '@/lib/curriculum/sheet';
import { entryConfig } from '@/lib/catalog/entry-config';
import type { CatalogEntry } from '@/lib/catalog/search';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { drawPageToCanvas } from '@/lib/glyphs/backends/canvas';

/**
 * Page 1 of a search result, drawn small by the same engine as the generator and the PDF.
 * This file brings the whole sheet builder with it, so /cauta loads it only when the first
 * result comes into view (see catalog-search.tsx), and each card draws itself only then.
 */
export default function SheetThumb({ entry, level, width }: { entry: Pick<CatalogEntry, 'preset' | 'item' | 'via'>; level: SchoolLevel; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { preset, item, via } = entry;
  const through = via?.[level];

  useEffect(() => {
    const canvas = ref.current;
    const config = entryConfig({ preset, item, via: through ? { [level]: through } : undefined }, level);
    if (!canvas || !config) return;
    const [page] = buildWorksheetPages(config, 'full');
    const ctx = canvas.getContext('2d');
    if (!page || !ctx) return;
    const scale = (width / page.width) * Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(page.width * scale);
    canvas.height = Math.round(page.height * scale);
    let alive = true;
    const draw = () => {
      if (!alive) return;
      drawPageToCanvas(ctx, page, scale);
      canvas.dataset.drawn = '1';
    };
    draw();
    // once more when the sheet's font has arrived, so the text is the one of the PDF
    if ('fonts' in document) Promise.all([document.fonts.load('700 16px Nunito'), document.fonts.load('400 16px Nunito')]).then(draw).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [preset, item, through, level, width]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 block h-full w-full bg-white" />;
}
