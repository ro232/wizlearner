/**
 * Amazon KDP paperback geometry (millimetres).
 * Sources: KDP help "Paperback cover guidelines" (G201953020) and
 * "Format your paperback interior" (G202145400), checked October 2026.
 */

export const IN = 25.4;

export type TrimKey = 'letter' | 'a4' | '8x10' | 'square';

export const TRIM_SIZES: Record<TrimKey, { label: string; w: number; h: number }> = {
  letter: { label: '8.5 × 11 in (21.59 × 27.94 cm)', w: 8.5 * IN, h: 11 * IN },
  a4: { label: 'A4 · 8.27 × 11.69 in (21 × 29.7 cm)', w: 210, h: 297 },
  '8x10': { label: '8 × 10 in (20.32 × 25.4 cm)', w: 8 * IN, h: 10 * IN },
  square: { label: '8.5 × 8.5 in (21.59 × 21.59 cm)', w: 8.5 * IN, h: 8.5 * IN },
};

export type PaperKey = 'white' | 'cream' | 'color-standard' | 'color-premium';

export const PAPER_LABELS: Record<PaperKey, string> = {
  white: 'Alb (alb-negru)',
  cream: 'Crem (alb-negru)',
  'color-standard': 'Color standard',
  'color-premium': 'Color premium',
};

/** Spine width per page (KDP). */
export const SPINE_PER_PAGE_MM: Record<PaperKey, number> = {
  white: 0.002252 * IN,
  cream: 0.0025 * IN,
  'color-standard': 0.002252 * IN,
  'color-premium': 0.002347 * IN,
};

/** Bleed added on top, bottom and the outside edge. */
export const BLEED_MM = 0.125 * IN;

export const MIN_PAGES = 24;
export const MAX_PAGES = 828;
/** KDP allows spine text only from this page count. */
export const SPINE_TEXT_MIN_PAGES = 80;

/** Minimum inside (gutter) margin by page count. */
export function kdpGutterMm(pages: number): number {
  if (pages <= 150) return 0.375 * IN;
  if (pages <= 300) return 0.5 * IN;
  if (pages <= 500) return 0.625 * IN;
  if (pages <= 700) return 0.75 * IN;
  return 0.875 * IN;
}

/** Minimum outside margin (also top/bottom). */
export function kdpOutsideMm(bleed: boolean): number {
  return (bleed ? 0.375 : 0.25) * IN;
}

export function spineWidthMm(pages: number, paper: PaperKey): number {
  return pages * SPINE_PER_PAGE_MM[paper];
}

export interface CoverGeometry {
  /** Full-wrap file size. */
  width: number;
  height: number;
  bleed: number;
  spine: number;
  trimW: number;
  trimH: number;
  /** x of the left edge of the back cover trim box, spine, front cover. */
  backX: number;
  spineX: number;
  frontX: number;
  /** y of the trim box top. */
  trimY: number;
  spineTextAllowed: boolean;
}

export function coverGeometry(trim: TrimKey, pages: number, paper: PaperKey): CoverGeometry {
  const t = TRIM_SIZES[trim];
  const spine = spineWidthMm(pages, paper);
  return {
    width: BLEED_MM * 2 + t.w * 2 + spine,
    height: BLEED_MM * 2 + t.h,
    bleed: BLEED_MM,
    spine,
    trimW: t.w,
    trimH: t.h,
    backX: BLEED_MM,
    spineX: BLEED_MM + t.w,
    frontX: BLEED_MM + t.w + spine,
    trimY: BLEED_MM,
    spineTextAllowed: pages >= SPINE_TEXT_MIN_PAGES,
  };
}

/** Interior page size (mm) for a trim, with or without bleed. */
export function interiorPageSize(trim: TrimKey, bleed: boolean): { width: number; height: number } {
  const t = TRIM_SIZES[trim];
  return bleed ? { width: t.w + BLEED_MM, height: t.h + BLEED_MM * 2 } : { width: t.w, height: t.h };
}

export interface InteriorMargins {
  top: number;
  bottom: number;
  inside: number;
  outside: number;
}

/** Comfortable margins that satisfy the KDP minimums for the given page count. */
export function interiorMargins(pages: number, bleed: boolean): InteriorMargins {
  return {
    top: 16,
    bottom: 16,
    inside: Math.max(kdpGutterMm(pages), 17),
    outside: Math.max(kdpOutsideMm(bleed), 14),
  };
}
