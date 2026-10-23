'use client';

import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageOps } from '@/lib/glyphs/types';
import { drawPageToCanvas } from '@/lib/glyphs/backends/canvas';

interface PagesPreviewProps {
  pages: PageOps[];
  /** CSS width of the page preview in pixels. */
  width?: number;
  className?: string;
  /** Label before the page counter ("Pagina" / "Page"). */
  pageLabel?: string;
  /** Shown over the page when there is nothing to draw yet. */
  emptyMessage?: string | null;
  /** Controlled page index (optional). */
  pageIndex?: number;
  onPageChange?: (index: number) => void;
}

/**
 * Draws page descriptions (the same ones the PDF uses) on a canvas, with
 * previous/next navigation. Used by the worksheet generator and the book composer.
 */
export function PagesPreview({ pages, width = 420, className, pageLabel = 'Page', emptyMessage = null, pageIndex, onPageChange }: PagesPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [internalIndex, setInternalIndex] = useState(0);
  const index = pageIndex ?? internalIndex;
  const setIndex = (i: number) => {
    setInternalIndex(i);
    onPageChange?.(i);
  };
  const safeIndex = Math.max(0, Math.min(index, pages.length - 1));
  const page = pages[safeIndex];

  useEffect(() => {
    if (index !== safeIndex) setIndex(safeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, safeIndex]);

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

  return (
    <div className={`relative group ${className || ''}`}>
      <div
        className="absolute -inset-2 rounded-2xl opacity-40 group-hover:opacity-70 transition-all duration-700"
        style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #fed7aa 50%, #ddd6fe 100%)', filter: 'blur(8px)' }}
      />
      <div className="relative rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white w-full" style={{ maxWidth: width }}>
        <canvas ref={canvasRef} className="block w-full h-auto" style={{ background: '#fff' }} />
        {emptyMessage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="px-4 py-2 rounded-full bg-white/90 text-sm font-medium text-slate-500 shadow">{emptyMessage}</span>
          </div>
        )}
      </div>
      {pages.length > 1 && (
        <div className="relative mt-3 flex items-center justify-center gap-3 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setIndex(Math.max(0, safeIndex - 1))}
            disabled={safeIndex === 0}
            className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {pageLabel} {safeIndex + 1} / {pages.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex(Math.min(pages.length - 1, safeIndex + 1))}
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
