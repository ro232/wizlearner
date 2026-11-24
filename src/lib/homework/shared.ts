import type { WorksheetConfig, Difficulty, LetterMode, Script, Tier } from '@/types';
import type { SchoolLevel } from '@/lib/curriculum/sheet';

/**
 * „Temă pentru acasă”: a teacher on a paid plan turns a sheet into a link for the parents.
 * The parent opens it on the phone, may type the child's name and downloads the PDF, free and
 * without an account.
 *
 * What the link carries (signed on the server, see token.ts): the sheet's settings, the class,
 * an optional short title from the teacher, which plan's content it may draw, and when it
 * expires. Never a child's name: the teacher's page strips it before anything is sent, the
 * server clears it again, and the parent's typed name never leaves the phone (the PDF is
 * drawn in the browser).
 *
 * This file holds what both sides share; it has no server-only code.
 */

/** How long a link works, in days; the teacher picks one. */
export const HOMEWORK_DAYS = [7, 30, 90] as const;
export type HomeworkDays = (typeof HOMEWORK_DAYS)[number];
export const DEFAULT_HOMEWORK_DAYS: HomeworkDays = 30;

export const HOMEWORK_TITLE_MAX = 60;

/** The settings of a /grupa sheet, without the children (their names and per-child levels stay in the browser). */
export interface HomeworkGroup {
  themeId?: string;
  letters: string[];
  letterMode: LetterMode;
  script: Script;
  difficulty: Difficulty;
  withFind: boolean;
  curriculumLevel?: SchoolLevel;
}

export type HomeworkSheet =
  | {
      kind: 'sheet';
      config: WorksheetConfig;
      /** the teacher's sheet traced the child's name as this row (custom word index): the parent's name goes there */
      nameAt?: number;
    }
  | { kind: 'group'; group: HomeworkGroup };

/** A verified homework link, as the parent's page receives it. */
export type Homework = HomeworkSheet & {
  /** the content the sheet may draw: the plan of the teacher who made the link */
  tier: Exclude<Tier, 'free'>;
  level?: SchoolLevel;
  title: string;
  /** expiry, milliseconds since 1970 */
  expiresAt: number;
};

export const LEVEL_LABEL: Record<SchoolLevel, string> = {
  presc: 'Grădiniță',
  CP: 'Clasa pregătitoare',
  I: 'Clasa I',
  II: 'Clasa a II-a',
};

export const isSchoolLevel = (v: unknown): v is SchoolLevel => v === 'presc' || v === 'CP' || v === 'I' || v === 'II';

// An address in a title would turn the parents' page into a way to pass links around.
const URL_LIKE = /(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S*|\b[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.[a-z]{2,}(?:\/\S*)?|\S+@\S+/giu;

/**
 * The teacher's title as the parents see it: plain text on one line, no addresses, no e-mails,
 * at most 60 characters. „Tema 3.2” and „Litera M.” stay as they are.
 */
export function sanitizeHomeworkTitle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ')
    .replace(URL_LIKE, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, HOMEWORK_TITLE_MAX)
    .trim();
}

export const homeworkDays = (v: unknown): HomeworkDays => (HOMEWORK_DAYS as readonly unknown[]).includes(v) ? (v as HomeworkDays) : DEFAULT_HOMEWORK_DAYS;

/** The QR code is drawn only while it stays easy to scan from a phone screen or a printout. */
export const QR_MAX_URL = 900;

/** The message for WhatsApp (and for copying), in the teacher's voice. */
export function homeworkShareText(url: string, title: string): string {
  const what = title ? `„${title}”` : 'fișa de lucru';
  return `Bună ziua! Tema pentru acasă: ${what}. Deschideți linkul pe telefon, scrieți numele copilului dacă doriți și descărcați fișa (PDF, gratuit, fără cont):\n${url}`;
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
