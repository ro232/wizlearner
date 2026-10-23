import type { Difficulty } from '@/types';

/**
 * Groups the teacher saved, kept only in this browser (the privacy policy promises that
 * children's names never reach our servers).
 */
export interface SavedGroup {
  id: string;
  name: string;
  namesText: string;
  /** Per-child level when it differs from the group's. */
  levels: Record<string, Difficulty>;
}

const KEY = 'wizlearner-groups';

export function loadGroups(): SavedGroup[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedGroup[]) : [];
    return Array.isArray(parsed) ? parsed.filter((g) => g && typeof g.id === 'string' && typeof g.namesText === 'string') : [];
  } catch {
    return [];
  }
}

export function storeGroups(groups: SavedGroup[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(groups));
    return true;
  } catch {
    return false;
  }
}
