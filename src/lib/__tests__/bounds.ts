import type { PageOps } from '@/lib/glyphs/types';
import { flattenOps, flattenSubpath, type FlatOp } from '@/lib/glyphs/geometry';
import { textWidthMm } from '@/lib/book/text';

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Approximate ink box of one drawing op (stroke width included). */
export function opBox(op: FlatOp): Box | null {
  switch (op.t) {
    case 'path': {
      const pad = (op.strokeWidth ?? 0) / 2;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const sp of op.subpaths)
        for (const p of flattenSubpath(sp)) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    }
    case 'circle':
      return { minX: op.cx - op.r, minY: op.cy - op.r, maxX: op.cx + op.r, maxY: op.cy + op.r };
    case 'rect':
      return { minX: op.x, minY: op.y, maxX: op.x + op.w, maxY: op.y + op.h };
    case 'line':
      return { minX: Math.min(op.x1, op.x2), minY: Math.min(op.y1, op.y2), maxX: Math.max(op.x1, op.x2), maxY: Math.max(op.y1, op.y2) };
    case 'polygon':
      return {
        minX: Math.min(...op.points.map((p) => p.x)),
        minY: Math.min(...op.points.map((p) => p.y)),
        maxX: Math.max(...op.points.map((p) => p.x)),
        maxY: Math.max(...op.points.map((p) => p.y)),
      };
    case 'text': {
      if (op.rotate) return null; // the diagonal preview watermark is meant to cross the page
      const w = textWidthMm(op.text, op.size);
      const x0 = op.align === 'center' ? op.x - w / 2 : op.align === 'right' ? op.x - w : op.x;
      const y0 = op.baseline === 'middle' ? op.y - op.size / 2 : op.baseline === 'top' ? op.y : op.y - op.size * 0.8;
      return { minX: x0, minY: y0, maxX: x0 + w, maxY: y0 + op.size };
    }
  }
}

/** Ops whose ink leaves `area` by more than `slack` mm (a short description per op). */
export function opsOutside(page: PageOps, area: Box, slack = 0.3): string[] {
  const out: string[] = [];
  for (const op of flattenOps(page.ops)) {
    const b = opBox(op);
    if (!b) continue;
    if (b.minX < area.minX - slack || b.minY < area.minY - slack || b.maxX > area.maxX + slack || b.maxY > area.maxY + slack) {
      const label = op.t === 'text' ? `text "${op.text}"` : op.t;
      out.push(`${label} [${b.minX.toFixed(1)}, ${b.minY.toFixed(1)} – ${b.maxX.toFixed(1)}, ${b.maxY.toFixed(1)}]`);
    }
  }
  return out;
}
