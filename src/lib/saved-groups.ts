import type { Difficulty, LetterMode, Script } from '@/types';

/**
 * Groups the teacher saved, kept only in this browser (the privacy policy promises that
 * children's names never reach our servers).
 */
export interface SavedGroup {
  id: string;
  name: string;
  namesText: string;
  /** Per-child level when it differs from the group's (by the child's key, see parseNameList). */
  levels: Record<string, Difficulty>;
}

const KEY = 'wizlearner-groups';
const DRAFT_KEY = 'wizlearner-group-draft';

const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const isDifficulty = (v: unknown): v is Difficulty => typeof v === 'string' && (DIFFICULTIES as readonly string[]).includes(v);

/** Only known levels, whatever was stored. */
export function cleanLevels(raw: unknown): Record<string, Difficulty> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, Difficulty] => isDifficulty(e[1])));
}

/** Saved groups out of whatever the storage holds: broken entries are left out, not thrown. */
export function parseGroups(raw: string | null): SavedGroup[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((g): g is SavedGroup => !!g && typeof g === 'object' && typeof (g as SavedGroup).id === 'string' && typeof (g as SavedGroup).namesText === 'string')
      .map((g) => ({ id: g.id, name: typeof g.name === 'string' ? g.name : '', namesText: g.namesText, levels: cleanLevels(g.levels) }));
  } catch {
    return [];
  }
}

export function loadGroups(): SavedGroup[] {
  try {
    return parseGroups(window.localStorage.getItem(KEY));
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

/**
 * What the teacher is working on right now on „Pentru grupă”, kept by itself as she types:
 * the pasted list must still be there after a look at the prices, a reload or a closed tab.
 * Like the saved groups it lives only in this browser's storage; it is never sent anywhere.
 */
export interface GroupDraft {
  namesText: string;
  groupName: string;
  /** The saved group being edited, if any. */
  groupId: string;
  levels: Record<string, Difficulty>;
  /** The plan week that was chosen (null: none). */
  week: number | null;
  /** The plan week of the day the draft was written: a later visit, in another week, moves on to that week's plan. */
  writtenInWeek: number | null;
  themeId?: string;
  letters: string[];
  letterMode: LetterMode;
  script: Script;
  difficulty: Difficulty;
  withFind: boolean;
}

/** A draft out of whatever the storage holds; null when there is none or it is unreadable. */
export function parseGroupDraft(raw: string | null): GroupDraft | null {
  try {
    const d: unknown = raw ? JSON.parse(raw) : null;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    const r = d as Record<string, unknown>;
    const week = typeof r.week === 'number' && Number.isInteger(r.week) && r.week >= 1 && r.week <= 60 ? r.week : null;
    const writtenInWeek = typeof r.writtenInWeek === 'number' && Number.isInteger(r.writtenInWeek) ? r.writtenInWeek : null;
    return {
      namesText: typeof r.namesText === 'string' ? r.namesText.slice(0, 20_000) : '',
      groupName: typeof r.groupName === 'string' ? r.groupName.slice(0, 120) : '',
      groupId: typeof r.groupId === 'string' ? r.groupId : '',
      levels: cleanLevels(r.levels),
      week,
      writtenInWeek,
      themeId: typeof r.themeId === 'string' ? r.themeId : undefined,
      letters: Array.isArray(r.letters) ? r.letters.filter((l): l is string => typeof l === 'string' && l.length <= 2).slice(0, 4) : [],
      letterMode: r.letterMode === 'paired' ? 'paired' : 'uppercase',
      script: r.script === 'cursive' ? 'cursive' : 'print',
      difficulty: isDifficulty(r.difficulty) ? r.difficulty : 'beginner',
      withFind: r.withFind !== false,
    };
  } catch {
    return null;
  }
}

export function loadGroupDraft(): GroupDraft | null {
  try {
    return parseGroupDraft(window.localStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
}

export function storeGroupDraft(draft: GroupDraft): boolean {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false; // private window or full storage: the page works, it just does not remember
  }
}

export function clearGroupDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
}
