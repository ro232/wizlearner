import type { DrawOp, PageOps, Subpath } from '../types';
import { flattenOps, type FlatOp } from '../geometry';

const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function subpathsToSvgD(subpaths: Subpath[], closed = false): string {
  const parts: string[] = [];
  for (const sp of subpaths) {
    parts.push(`M${fmt(sp.start.x)} ${fmt(sp.start.y)}`);
    for (const s of sp.segs) {
      if (s.kind === 'L') parts.push(`L${fmt(s.p.x)} ${fmt(s.p.y)}`);
      else parts.push(`C${fmt(s.c1.x)} ${fmt(s.c1.y)} ${fmt(s.c2.x)} ${fmt(s.c2.y)} ${fmt(s.p.x)} ${fmt(s.p.y)}`);
    }
    if (closed) parts.push('Z');
  }
  return parts.join(' ');
}

export function opToSvg(op: FlatOp, fontFamily: string): string {
  switch (op.t) {
    case 'path': {
      const attrs = [
        `d="${subpathsToSvgD(op.subpaths, op.closed)}"`,
        `fill="${op.fill ?? 'none'}"`,
        op.stroke ? `stroke="${op.stroke}"` : 'stroke="none"',
        op.strokeWidth !== undefined ? `stroke-width="${fmt(op.strokeWidth)}"` : '',
        `stroke-linecap="${op.cap ?? 'round'}"`,
        'stroke-linejoin="round"',
        op.dash ? `stroke-dasharray="${op.dash.map(fmt).join(' ')}"` : '',
      ];
      return `<path ${attrs.filter(Boolean).join(' ')}/>`;
    }
    case 'circle':
      return `<circle cx="${fmt(op.cx)}" cy="${fmt(op.cy)}" r="${fmt(op.r)}" fill="${op.fill ?? 'none'}"${
        op.stroke ? ` stroke="${op.stroke}" stroke-width="${fmt(op.strokeWidth ?? 1)}"` : ''
      }/>`;
    case 'rect':
      return `<rect x="${fmt(op.x)}" y="${fmt(op.y)}" width="${fmt(op.w)}" height="${fmt(op.h)}"${op.rx ? ` rx="${fmt(op.rx)}"` : ''} fill="${
        op.fill ?? 'none'
      }"${op.stroke ? ` stroke="${op.stroke}" stroke-width="${fmt(op.strokeWidth ?? 1)}"` : ''}${
        op.dash ? ` stroke-dasharray="${op.dash.map(fmt).join(' ')}"` : ''
      }/>`;
    case 'line':
      return `<line x1="${fmt(op.x1)}" y1="${fmt(op.y1)}" x2="${fmt(op.x2)}" y2="${fmt(op.y2)}" stroke="${op.stroke}" stroke-width="${fmt(
        op.strokeWidth
      )}" stroke-linecap="round"${op.dash ? ` stroke-dasharray="${op.dash.map(fmt).join(' ')}"` : ''}/>`;
    case 'polygon':
      return `<polygon points="${op.points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ')}" fill="${op.fill ?? 'none'}"${
        op.stroke ? ` stroke="${op.stroke}" stroke-width="${fmt(op.strokeWidth ?? 1)}" stroke-linejoin="round"` : ''
      }/>`;
    case 'text': {
      const anchor = op.align === 'center' ? 'middle' : op.align === 'right' ? 'end' : 'start';
      const baseline = op.baseline === 'middle' ? 'central' : op.baseline === 'top' ? 'hanging' : 'alphabetic';
      const rot = op.rotate ? ` transform="rotate(${fmt(-op.rotate)} ${fmt(op.x)} ${fmt(op.y)})"` : '';
      return `<text x="${fmt(op.x)}" y="${fmt(op.y)}" font-size="${fmt(op.size)}" font-family="${fontFamily}" font-weight="${
        op.weight ?? 'normal'
      }" text-anchor="${anchor}" dominant-baseline="${baseline}" fill="${op.fill}"${rot}>${esc(op.text)}</text>`;
    }
  }
}

/** Render ops (any unit) into an SVG string; the viewBox is given in the same unit. */
export function opsToSvg(
  ops: DrawOp[],
  viewBox: { x: number; y: number; w: number; h: number },
  options: { fontFamily?: string; background?: string; widthAttr?: string; heightAttr?: string } = {}
): string {
  const font = options.fontFamily ?? "Nunito, 'Segoe UI', Arial, sans-serif";
  const body = flattenOps(ops).map((op) => opToSvg(op, font)).join('\n');
  const size = options.widthAttr ? ` width="${options.widthAttr}" height="${options.heightAttr ?? ''}"` : '';
  const bg = options.background ? `<rect x="${fmt(viewBox.x)}" y="${fmt(viewBox.y)}" width="${fmt(viewBox.w)}" height="${fmt(viewBox.h)}" fill="${options.background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(viewBox.x)} ${fmt(viewBox.y)} ${fmt(viewBox.w)} ${fmt(viewBox.h)}"${size}>\n${bg}\n${body}\n</svg>`;
}

export function pageToSvg(page: PageOps, options: { fontFamily?: string } = {}): string {
  return opsToSvg(page.ops, { x: 0, y: 0, w: page.width, h: page.height }, { ...options, background: '#ffffff', widthAttr: `${page.width}mm`, heightAttr: `${page.height}mm` });
}
