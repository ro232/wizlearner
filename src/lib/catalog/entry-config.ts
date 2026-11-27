/**
 * The generator settings a catalogue entry opens with in a class: exactly what its link does
 * (search.ts entryHref → the generator page). Used by the catalogue builder, the small previews
 * on /cauta and the tests.
 */
import type { WorksheetConfig } from '@/types';
import { presetById, presetConfig } from '@/lib/curriculum/presets';
import type { SchoolLevel } from '@/lib/curriculum/sheet';
import { itemConfig, parseItemParam } from './item-link';
import type { CatalogEntry } from './search';

export function entryConfig(entry: Pick<CatalogEntry, 'preset' | 'item' | 'via'>, level: SchoolLevel): WorksheetConfig | null {
  const preset = presetById(entry.preset ?? entry.via?.[level] ?? '');
  if (preset) return presetConfig(preset, level);
  const ref = parseItemParam(entry.item);
  return ref ? itemConfig(ref, level) : null;
}
