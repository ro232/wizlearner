import type { WorksheetConfig } from '@/types';
import { normalizeKey } from '@/lib/glyphs/data';

/**
 * What goes into the account when a sheet is saved: every setting, but not the child's
 * name (the privacy policy promises we do not keep children's names).
 */
export function configForSaving(config: WorksheetConfig): WorksheetConfig {
  const name = normalizeKey(config.childName ?? '').trim();
  return {
    ...config,
    childName: '',
    customWords: (config.customWords ?? []).filter((w) => !name || normalizeKey(w).trim() !== name),
  };
}

/** A short default name for a saved sheet ("Litere: A, Ă, B" / "Cuvinte: MAMA"). */
export function defaultSheetName(config: WorksheetConfig): string {
  const kind = { letters: 'Litere', numbers: 'Cifre', shapes: 'Forme', prewrite: 'Exerciții' }[config.category as 'letters'] ?? 'Fișă';
  const items = [...config.selectedItems, ...(config.customWords ?? [])].slice(0, 5).join(', ');
  return items ? `${kind}: ${items}` : kind;
}
