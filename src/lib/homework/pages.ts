import type { PageOps } from '@/lib/glyphs/types';
import type { WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { buildGroupPages } from '@/lib/worksheet/group';
import { cleanWord } from '@/stores/sanitize-config';
import { isChildName } from '@/lib/worksheet/saved';
import type { Homework } from './shared';

/** As long as on „Fișa cu numele”. */
export const HOMEWORK_NAME_MAX = 28;

/** The name as it goes on the sheet: one line, single spaces, at most 28 characters. */
export const homeworkChildName = (name: string) => cleanWord(name).slice(0, HOMEWORK_NAME_MAX).trim();

/**
 * Where the child's name was traced on the teacher's sheet (a row of „Trasează-l”), worked out in
 * the teacher's browser before the name is taken out. Only the position goes into the link.
 */
export function nameRowIndex(config: WorksheetConfig): number | undefined {
  const at = (config.customWords ?? []).findIndex((w) => isChildName(w, config.childName ?? ''));
  return at >= 0 ? at : undefined;
}

/** The sheet with the parent's name (typed on the phone, never sent anywhere), as the PDF draws it. */
export function homeworkSheetConfig(hw: Extract<Homework, { kind: 'sheet' }>, rawName: string): WorksheetConfig {
  const name = homeworkChildName(rawName);
  const config: WorksheetConfig = { ...hw.config, childName: name };
  if (name && hw.nameAt !== undefined && config.category === 'letters' && !config.customWords.some((w) => isChildName(w, name))) {
    const at = Math.min(hw.nameAt, config.customWords.length);
    config.customWords = [...config.customWords.slice(0, at), name, ...config.customWords.slice(at)];
  }
  return config;
}

/** Every page of the homework, with the name in its header (blank line to write it by hand when empty). */
export function homeworkPages(hw: Homework, rawName: string): PageOps[] {
  if (hw.kind === 'group') {
    const name = homeworkChildName(rawName);
    const g = hw.group;
    return buildGroupPages({
      names: [name],
      keys: [name],
      themeId: g.themeId,
      letters: g.letters,
      letterMode: g.letterMode,
      script: g.script,
      difficulty: g.difficulty,
      withFindPages: g.withFind,
      ...(g.curriculumLevel ? { curriculumLevel: g.curriculumLevel } : {}),
    }).pages;
  }
  return buildWorksheetPages(homeworkSheetConfig(hw, rawName), hw.tier);
}
