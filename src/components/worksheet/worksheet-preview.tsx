'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorksheetConfig, Tier } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { drawPageToCanvas } from '@/lib/glyphs/backends/canvas';

interface WorksheetPreviewProps {
  config: WorksheetConfig;
  tier?: Tier;
  className?: string;
  /** CSS width of the page preview in pixels. */
  width?: number;
}

/**
 * Live preview. It draws the very same page description the PDF uses, so the
 * printout matches the screen.
 */
export function WorksheetPreview({ config, tier = 'free', className, width = 420 }: WorksheetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const pages = useMemo(() => buildWorksheetPages(config, tier), [config, tier]);
  const safeIndex = Math.min(pageIndex, pages.length - 1);
  const page = pages[safeIndex];

  useEffect(() => {
    if (pageIndex !== safeIndex) setPageIndex(safeIndex);
  }, [pageIndex, safeIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const cssScale = width / page.width; // css px per mm
    canvas.width = Math.round(page.width * cssScale * dpr);
    canvas.height = Math.round(page.height * cssScale * dpr);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => drawPageToCanvas(ctx, page, cssScale * dpr);
    draw();
    // Redraw once the worksheet font is available so text matches the PDF.
    if (typeof document !== 'undefined' && 'fonts' in document) {
      Promise.all([document.fonts.load('700 16px Nunito'), document.fonts.load('400 16px Nunito')])
        .then(() => draw())
        .catch(() => undefined);
    }
  }, [page, width]);

  const isEmpty = config.selectedItems.length === 0;
  const isRo = config.alphabet === 'ro';

  return (
    <div className={`relative group ${className || ''}`}>
      <div
        className="absolute -inset-2 rounded-2xl opacity-40 group-hover:opacity-70 transition-all duration-700"
        style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #fed7aa 50%, #ddd6fe 100%)', filter: 'blur(8px)' }}
      />
      <div className="relative rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white w-full" style={{ maxWidth: width }}>
        <canvas ref={canvasRef} className="block w-full h-auto" style={{ background: '#fff' }} />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="px-4 py-2 rounded-full bg-white/90 text-sm font-medium text-slate-500 shadow">
              {isRo ? 'Alege litere ca să vezi fișa' : 'Pick items to see preview'}
            </span>
          </div>
        )}
      </div>
      {pages.length > 1 && (
        <div className="relative mt-3 flex items-center justify-center gap-3 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {isRo ? 'Pagina' : 'Page'} {safeIndex + 1} / {pages.length}
          </span>
          <button
            type="button"
            onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
            disabled={safeIndex >= pages.length - 1}
            className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
