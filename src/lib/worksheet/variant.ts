import type { WorksheetConfig } from '@/types';

/**
 * „Altă variantă”: the picture and logic sheets of „Jocuri” are drawn from their pools of pictures,
 * words and numbers by a seeded generator. `config.variantSeed` picks which draw: 1 (or unset) is the
 * sheet every item always had, so old links, saved sheets and presets print exactly as before; every
 * other number is another sheet of the same kind, with the same rules and its own answers.
 *
 * The seed reaches the generators in two ways:
 * - every generator takes it as its last argument (`oddRows(4, 7)`), for the tests and for callers
 *   that hold a config;
 * - left out, it is the variant of the sheet being built: `buildWorksheetPages` wraps the whole build
 *   (pages, answers, evaluation) in `withVariant`, so a page and its answers always agree.
 *
 * Building is synchronous, so the variant of the build in progress is a plain module variable.
 */

export const VARIANT_DEFAULT = 1;
export const VARIANT_MAX = 999_999;

let current = VARIANT_DEFAULT;

/** A whole number 1…VARIANT_MAX; anything else is the default. */
export function cleanVariant(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return VARIANT_DEFAULT;
  return Math.min(VARIANT_MAX, Math.max(VARIANT_DEFAULT, Math.round(value)));
}

export function variantOf(config: Pick<WorksheetConfig, 'variantSeed'>): number {
  return cleanVariant(config.variantSeed);
}

/** The variant of the sheet being built (1 outside a build). */
export function currentVariant(): number {
  return current;
}

/** Run `fn` with `variant` as the variant of every generator called without one. */
export function withVariant<T>(variant: number, fn: () => T): T {
  const before = current;
  current = cleanVariant(variant);
  try {
    return fn();
  } finally {
    current = before;
  }
}

/** The seed text of a generator: unchanged for the first variant, so its sheet stays what it was. */
export function vkey(base: string, variant: number = current): string {
  return variant === VARIANT_DEFAULT ? base : `${base}~${variant}`;
}

/** Items of „Jocuri” that have other variants (the others are one authored text, scene or experiment). */
const VARIANT_ITEM = /^(find:.+|count:(5|10)|dots:(star|heart|house|fish|boat|tree)|sound:.+|(first|syl|split|sort|odd|group|pos|color|colsum|maze|diff|trace|shadow|terms):[1-6]|place:[1-3]|coord:[1-3]|regular:[1-4]|(sort2|pict):[12]|(sides|solid|around|more):1)$/;

export function hasVariants(item: string): boolean {
  return VARIANT_ITEM.test(item);
}
