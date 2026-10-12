import type { PageOps } from '../types';
import { flattenOps, type FlatOp } from '../geometry';

export const PREVIEW_FONT = "'Nunito', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

/**
 * Draw a page (mm) onto a canvas context. `scale` is device pixels per mm;
 * the caller sizes the canvas (page.width * scale × page.height * scale).
 */
export function drawPageToCanvas(ctx: CanvasRenderingContext2D, page: PageOps, scale: number): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, page.width * scale, page.height * scale);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  for (const op of flattenOps(page.ops)) drawOp(ctx, op);
  ctx.restore();
}

function drawOp(ctx: CanvasRenderingContext2D, op: FlatOp): void {
  switch (op.t) {
    case 'path': {
      ctx.beginPath();
      for (const sp of op.subpaths) {
        ctx.moveTo(sp.start.x, sp.start.y);
        for (const s of sp.segs) {
          if (s.kind === 'L') ctx.lineTo(s.p.x, s.p.y);
          else ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p.x, s.p.y);
        }
        if (op.closed) ctx.closePath();
      }
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.strokeWidth ?? 1;
        ctx.lineCap = op.cap ?? 'round';
        ctx.setLineDash(op.dash ?? []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    }
    case 'circle': {
      ctx.beginPath();
      ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2);
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.strokeWidth ?? 1;
        ctx.setLineDash([]);
        ctx.stroke();
      }
      break;
    }
    case 'rect': {
      ctx.beginPath();
      if (op.rx && typeof ctx.roundRect === 'function') ctx.roundRect(op.x, op.y, op.w, op.h, op.rx);
      else ctx.rect(op.x, op.y, op.w, op.h);
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.strokeWidth ?? 1;
        ctx.setLineDash(op.dash ?? []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    }
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(op.x1, op.y1);
      ctx.lineTo(op.x2, op.y2);
      ctx.strokeStyle = op.stroke;
      ctx.lineWidth = op.strokeWidth;
      ctx.lineCap = 'round';
      ctx.setLineDash(op.dash ?? []);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'polygon': {
      ctx.beginPath();
      op.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.strokeWidth ?? 1;
        ctx.setLineDash([]);
        ctx.stroke();
      }
      break;
    }
    case 'text': {
      ctx.font = `${op.weight === 'bold' ? '700' : '400'} ${op.size}px ${op.emoji ? EMOJI_FONT : PREVIEW_FONT}`;
      ctx.fillStyle = op.fill;
      ctx.textAlign = op.align ?? 'left';
      ctx.textBaseline = op.baseline ?? 'alphabetic';
      ctx.fillText(op.text, op.x, op.y);
      break;
    }
  }
}
