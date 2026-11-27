/**
 * SEASONAL: until when the site points to the Advent calendar (26 December 2026, local time).
 * A file of its own, with no imports: the menu, the home page and the dashboards ask it without
 * loading the calendar's pages (src/lib/worksheet/advent.ts re-exports both names).
 */
export const ADVENT_BANNER_END = new Date(2026, 11, 26);

export function adventBannerVisible(now: Date = new Date()): boolean {
  return now.getTime() < ADVENT_BANNER_END.getTime();
}
