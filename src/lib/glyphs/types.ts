/**
 * Core types for the vector glyph engine.
 *
 * Glyphs are authored as centerline strokes in a 100-unit coordinate system:
 *   y = 0    cap height / ascender top
 *   y = 50   x-height (top of lowercase bodies)
 *   y = 100  baseline
 *   y = 135  descender bottom
 * Diacritics live above y = 0 (uppercase) or above y = 50 (lowercase);
 * the comma-below of Ș/Ț sits under the baseline (y ≈ 106–128).
 * x grows to the right; every glyph starts at x = 0 and has an explicit width.
 */

export interface Pt {
  x: number;
  y: number;
}

/** A drawn path segment. Arcs are converted to cubics before rendering. */
export type Seg =
  | { kind: 'L'; p: Pt }
  | { kind: 'C'; c1: Pt; c2: Pt; p: Pt };

/** A continuous pen-down run. A stroke may contain several (see `l` in the DSL). */
export interface Subpath {
  start: Pt;
  segs: Seg[];
}

/** One numbered stroke of a glyph (what the child draws without lifting the pen). */
export interface Stroke {
  subpaths: Subpath[];
  /**
   * Where to place direction arrows (fractions of the stroke length).
   * `null` = no arrow; `undefined` = automatic placement.
   */
  arrowAt?: number | number[] | null;
}

export interface GlyphDef {
  /** Stroke DSL strings, in writing order. */
  strokes: string[];
  /** Advance / box width in glyph units. */
  width: number;
  /** Optional per-stroke arrow positions (fraction 0..1, or a list, or null for none). */
  arrows?: (number | number[] | null | undefined)[];
}

export interface Glyph {
  key: string;
  strokes: Stroke[];
  width: number;
  /** Bounding box of the centerlines (stroke width not included). */
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Backend-neutral drawing operations. Coordinates are in whatever unit the
 * producer chose (glyph units inside a `group`, millimetres at page level).
 */
export type DrawOp =
  | {
      t: 'path';
      subpaths: Subpath[];
      stroke?: string;
      strokeWidth?: number;
      dash?: number[];
      cap?: 'round' | 'butt';
      fill?: string;
      closed?: boolean;
    }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; strokeWidth?: number; rx?: number; dash?: number[] }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; dash?: number[] }
  | { t: 'polygon'; points: Pt[]; fill?: string; stroke?: string; strokeWidth?: number }
  | {
      t: 'text';
      x: number;
      y: number;
      text: string;
      size: number;
      fill: string;
      weight?: 'normal' | 'bold';
      align?: 'left' | 'center' | 'right';
      baseline?: 'alphabetic' | 'middle' | 'top';
      /** Emoji can only be drawn by screen backends; PDF skips them. */
      emoji?: boolean;
    }
  | { t: 'group'; tx: number; ty: number; scale: number; ops: DrawOp[] };

/** Page description in millimetres, ready for any backend. */
export interface PageOps {
  width: number;
  height: number;
  ops: DrawOp[];
}
