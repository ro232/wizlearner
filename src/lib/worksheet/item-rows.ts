import type { ContentCategory, WorksheetConfig } from '@/types';

/**
 * „Rânduri pentru fiecare”: how many practice rows each chosen item gets.
 *
 * `repetitionsPerItem` is the count for all of them; `rowsByItem` holds the items that were given
 * their own count, keyed by the item exactly as it is in `selectedItems`. Kept light (no layout
 * imports): the store, sanitizeConfig and the layout all read it.
 */

export const ROWS_MIN = 1;
export const ROWS_MAX = 10;

/** The categories traced in rows; math and the games draw their own pages. */
export function isRowCategory(category: ContentCategory): boolean {
  return category === 'letters' || category === 'numbers' || category === 'shapes' || category === 'prewrite';
}

export const clampRows = (n: number): number => Math.min(ROWS_MAX, Math.max(ROWS_MIN, Math.round(n)));

/** The count for all items (a broken value counts as 1, as the layout always did). */
export function globalRows(config: Pick<WorksheetConfig, 'repetitionsPerItem'>): number {
  return Math.max(1, config.repetitionsPerItem || 1);
}

/** Rows for one chosen item: its own count when it has one, otherwise the count for all. */
export function rowsFor(config: Pick<WorksheetConfig, 'repetitionsPerItem' | 'rowsByItem'>, item: string): number {
  const own = config.rowsByItem && Object.prototype.hasOwnProperty.call(config.rowsByItem, item) ? config.rowsByItem[item] : undefined;
  return typeof own === 'number' && Number.isFinite(own) ? clampRows(own) : globalRows(config);
}

/**
 * The same config with `rowsByItem` kept only for items still chosen, in a category traced in rows
 * (an item taken off the sheet loses its count: put back, it starts from the count for all).
 * No counts left: the field is removed, so the config is the one it was before any was set.
 */
export function pruneRowsByItem<T extends Pick<WorksheetConfig, 'category' | 'selectedItems' | 'rowsByItem'>>(config: T): T {
  if (!config.rowsByItem) return config;
  const chosen = new Set(config.selectedItems);
  const kept = isRowCategory(config.category) ? Object.entries(config.rowsByItem).filter(([item]) => chosen.has(item)) : [];
  const { rowsByItem: _dropped, ...rest } = config;
  void _dropped;
  return (kept.length ? { ...rest, rowsByItem: Object.fromEntries(kept) } : rest) as T;
}
