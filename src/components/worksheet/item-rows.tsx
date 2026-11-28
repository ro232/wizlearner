'use client';

import { Minus, Plus } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useRoleStore } from '@/stores/role-store';
import { isItemAllowed } from '@/lib/access';
import { SHAPE_LABELS } from '@/lib/constants';
import { PATTERN_ICONS, PATTERN_LABELS, isPatternId } from '@/lib/glyphs/patterns';
import { ROWS_MAX, ROWS_MIN, globalRows, isRowCategory, rowsFor } from '@/lib/worksheet/item-rows';
import { isLesson } from '@/lib/worksheet/lesson';
import { pagini } from './plural';

/** −  n  + with real buttons, big enough to tap (44 px). */
export function Stepper({ value, name, onChange, min = ROWS_MIN, max = ROWS_MAX }: { value: number; name: string; onChange: (n: number) => void; min?: number; max?: number }) {
  const btn = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700';
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={btn} aria-label={`Mai puține rânduri pentru ${name}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <output aria-live="polite" aria-label={`${name}: ${value} ${value === 1 ? 'rând' : 'rânduri'}`} className="w-6 text-center text-base font-bold tabular-nums text-slate-900">
        {value}
      </output>
      <button type="button" className={btn} aria-label={`Mai multe rânduri pentru ${name}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * „Rânduri pentru fiecare”, under the item picker: the chosen items in the order they were chosen,
 * each with its own number of rows, and „Toate la fel” for all of them (the count for all, which
 * the words to trace get too). The line „Ies N pagini” is the page count of the preview.
 */
export function ItemRows({ pages }: { pages?: number }) {
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const setItemRows = useWorksheetStore((s) => s.setItemRows);
  const setAll = useWorksheetStore((s) => s.setRepetitionsPerItem);
  const parent = useRoleStore((s) => s.role) === 'parinte';
  // „Lecția literei” counts its rows by part (lesson-panel.tsx)
  if (!isRowCategory(config.category) || isLesson(config)) return null;

  const alphabet = config.alphabet ?? 'ro';
  // what is printed: an item of the full version on the free plan is not on the sheet
  const items = config.selectedItems.filter((i) => isItemAllowed(i, config.category, tier));
  const words = config.category === 'letters' && config.customWords.length > 0;
  if (!items.length && !words) return null;

  const all = globalRows(config);
  const mixed = items.some((i) => rowsFor(config, i) !== all);
  // names of shapes and graphic exercises are long: the name stays above its buttons on every screen
  const stacked = config.category === 'shapes' || config.category === 'prewrite';
  const name = (item: string) =>
    isPatternId(item) ? PATTERN_LABELS[alphabet][item] : config.category === 'shapes' ? SHAPE_LABELS[item] ?? item : item;

  return (
    <div data-item-rows>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Rânduri pentru fiecare</span>
        {!!pages && (
          <span data-page-count aria-live="polite" className="text-xs font-semibold text-slate-600">
            {pages === 1 ? 'Iese o pagină' : `Ies ${pagini(pages)}`}
          </span>
        )}
      </div>
      <p className="mb-2 text-[11px] text-slate-500">
        {parent ? 'Câte rânduri scrie copilul cu fiecare. Paginile se adaugă singure.' : 'Câte rânduri de exersat are fiecare. Paginile se adaugă singure.'}
      </p>
      {items.length > 0 && (
        <ul className={`grid grid-cols-2 gap-1.5 ${stacked ? 'sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]' : 'sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]'}`} aria-label="Rânduri pentru fiecare">
          {items.map((item) => {
            const label = name(item);
            return (
              <li key={item} data-item={item} className={`flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-1 py-1 ${stacked ? '' : 'sm:flex-row sm:justify-between sm:gap-1 sm:pl-2.5'}`}>
                <span className="flex min-w-0 max-w-full items-center gap-1 text-sm font-bold leading-tight text-slate-800" title={label}>
                  {isPatternId(item) && <span aria-hidden>{PATTERN_ICONS[item]}</span>}
                  <span className={isPatternId(item) || config.category === 'shapes' ? 'truncate text-xs' : 'text-base'}>{label}</span>
                </span>
                <Stepper value={rowsFor(config, item)} name={label} onChange={(n) => setItemRows(item, n)} />
              </li>
            );
          })}
        </ul>
      )}
      {(items.length > 1 || words) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-slate-200 px-2 py-1.5">
          <span className="min-w-0 text-sm font-semibold text-slate-800">
            Toate la fel
            {mixed && <span className="ml-1.5 text-[11px] font-normal text-slate-500">(acum diferă)</span>}
            {words && <span className="block text-[11px] font-normal text-slate-500">și cuvintele de trasat</span>}
          </span>
          <Stepper value={all} name="toate" onChange={setAll} />
        </div>
      )}
    </div>
  );
}
