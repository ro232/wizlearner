import { DEFAULT_BOOK_CONFIG, type BookConfig } from '@/lib/book/interior';
import { PAPER_LABELS, TRIM_SIZES, type PaperKey, type TrimKey } from '@/lib/book/spec';
import { ALPHABETS } from '@/lib/glyphs/data';
import { themeById } from '@/lib/themes';
import type { Difficulty, LetterMode, Script } from '@/types';

/**
 * Projects reopened from the account (saved, or a row of the download history) were written
 * some time ago, perhaps by an older version of the site. Each page reads its project through
 * one of these: a value it does not know falls back to the default instead of breaking the page.
 */

const obj = (raw: unknown): Record<string, unknown> => (raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {});
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const str = (v: unknown, fallback: string, max = 120) => (typeof v === 'string' ? v.slice(0, max) : fallback);

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
const MODES = ['uppercase', 'lowercase', 'paired'] as const;
const SCRIPTS = ['print', 'cursive'] as const;

export function sanitizeBookConfig(raw: unknown): BookConfig {
  const r = obj(raw);
  const d = DEFAULT_BOOK_CONFIG;
  const year = typeof r.year === 'number' && Number.isFinite(r.year) ? Math.min(2100, Math.max(1900, Math.round(r.year))) : d.year;
  const numbersMax = typeof r.numbersMax === 'number' && Number.isFinite(r.numbersMax) ? Math.min(20, Math.max(5, Math.round(r.numbersMax))) : d.numbersMax;
  const config: BookConfig = {
    title: str(r.title, d.title),
    subtitle: str(r.subtitle, d.subtitle, 200),
    author: str(r.author, d.author),
    year,
    trim: oneOf(r.trim, Object.keys(TRIM_SIZES) as TrimKey[], d.trim),
    bleed: bool(r.bleed, d.bleed),
    paper: oneOf(r.paper, Object.keys(PAPER_LABELS) as PaperKey[], d.paper),
    alphabet: oneOf(r.alphabet, ['ro', 'en'] as const, d.alphabet),
    variant: oneOf(r.variant, ['dashed', 'dotted', 'outline'] as const, d.variant),
    includePrewriting: bool(r.includePrewriting, d.includePrewriting),
    includeLetters: bool(r.includeLetters, d.includeLetters),
    includeNumbers: bool(r.includeNumbers, d.includeNumbers),
    includeReview: bool(r.includeReview, d.includeReview),
    includeCertificate: bool(r.includeCertificate, d.includeCertificate),
    numbersMax,
    watermark: false, // decided by the plan, never by what was saved
  };
  if (r.script === 'print' || r.script === 'cursive') config.script = r.script;
  return config;
}

export const WORKBOOK_IDS = ['upper', 'lower', 'paired', 'cursive', 'digits', 'numbers20'] as const;
export type WorkbookId = (typeof WORKBOOK_IDS)[number];

export interface WorkbookProject {
  book: WorkbookId;
  level: Difficulty;
  withWords: boolean;
  /** only when opened for a child from the account; never saved */
  name: string;
}

export function sanitizeWorkbookProject(raw: unknown): WorkbookProject | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = obj(raw);
  return { book: oneOf(r.book, WORKBOOK_IDS, 'upper'), level: oneOf(r.level, DIFFICULTIES, 'beginner'), withWords: r.withWords !== false, name: str(r.name, '', 28) };
}

export interface NameProject {
  name: string;
  mode: LetterMode;
  script: Script;
  kind: 'sheet' | 'book';
}

export function sanitizeNameProject(raw: unknown): NameProject | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = obj(raw);
  return { name: str(r.name, '', 28), mode: oneOf(r.mode, MODES, 'paired'), script: oneOf(r.script, SCRIPTS, 'print'), kind: oneOf(r.kind, ['sheet', 'book'] as const, 'sheet') };
}

export interface GroupProject {
  themeId?: string;
  letters: string[];
  letterMode: LetterMode;
  script: Script;
  difficulty: Difficulty;
  withFind: boolean;
}

export function sanitizeGroupProject(raw: unknown): GroupProject | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = obj(raw);
  return {
    themeId: typeof r.themeId === 'string' && themeById(r.themeId) ? r.themeId : undefined,
    letters: Array.isArray(r.letters) ? r.letters.filter((l): l is string => typeof l === 'string' && ALPHABETS.ro.includes(l)).slice(0, 2) : [],
    letterMode: oneOf(r.letterMode, ['uppercase', 'paired'] as const, 'uppercase'),
    script: oneOf(r.script, SCRIPTS, 'print'),
    difficulty: oneOf(r.difficulty, DIFFICULTIES, 'beginner'),
    withFind: r.withFind !== false,
  };
}
