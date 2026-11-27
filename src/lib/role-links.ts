import type { StageLevel } from '@/stores/role-store';

/**
 * Where a parent finds the sheets for the child's class, by topic: the class pages of
 * /fise-de-lucru. The addresses are written out here so the dashboard does not load the
 * curriculum data for four links (a test checks that each of these pages exists).
 */
export const STAGE_TOPICS: Record<StageLevel, { href: string; where: string }> = {
  presc: { href: '/fise-de-lucru/gradinita', where: 'grădiniță' },
  CP: { href: '/fise-de-lucru/clasa-pregatitoare', where: 'clasa pregătitoare' },
  I: { href: '/fise-de-lucru/clasa-1', where: 'clasa I' },
  II: { href: '/fise-de-lucru/clasa-2', where: 'clasa a II-a' },
};

/** Routes whose bundle is heavy (the sheet builders): their links are not fetched ahead of the click. */
export const HEAVY_ROUTES: readonly string[] = ['/generator', '/grupa', '/book', '/advent'];

/** The `prefetch` of a next/link to this address: off for the heavy routes, the default otherwise. */
export function linkPrefetch(href: string): false | undefined {
  return HEAVY_ROUTES.includes(href.split('?')[0]) ? false : undefined;
}
