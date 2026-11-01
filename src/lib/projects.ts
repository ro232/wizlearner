'use client';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Projects in the account: anything that can be made again from its settings.
 *   sheet     – a sheet from the generator (config = WorksheetConfig)
 *   workbook  – a ready-made workbook from /caiete
 *   book      – a KDP book from /book
 *   name-book – the name workbook from /nume
 *   group     – sheets for a group (only theme, letters and level; never the children's names)
 */
export type ProjectKind = 'sheet' | 'workbook' | 'book' | 'name-book' | 'group';

export const PROJECT_ROUTES: Record<ProjectKind, string> = {
  sheet: '/generator',
  workbook: '/caiete',
  book: '/book',
  'name-book': '/nume',
  group: '/grupa',
};

export const PROJECT_LABELS: Record<ProjectKind, string> = {
  sheet: 'Fișă',
  workbook: 'Caiet gata',
  book: 'Caiet KDP',
  'name-book': 'Caiet cu numele',
  group: 'Grupă',
};

const KEY = 'ww-open-project';

/** Hand a project to the page that makes it (read once, on that page's first render). */
export function stashProject(kind: ProjectKind, configuration: unknown): string {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ kind, configuration }));
  } catch {
    // private mode: the page simply opens with its defaults
  }
  return PROJECT_ROUTES[kind];
}

/** The project handed to this page, if any (and forget it). */
export function takeProject<T>(kind: ProjectKind): T | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { kind: ProjectKind; configuration: T };
    if (p.kind !== kind) return null;
    sessionStorage.removeItem(KEY);
    return p.configuration;
  } catch {
    return null;
  }
}

/** Note a download in the account's history (signed-in visitors only; silent on failure). */
export async function logDownload(kind: ProjectKind, title: string, configuration: unknown, pages?: number): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase.from('download_history').insert({ user_id: userId, kind, title: title.slice(0, 120), configuration, pages: pages ?? null });
  } catch {
    // history is a convenience: never block a download for it
  }
}
