'use client';

import React, { useMemo } from 'react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { hintFor } from '@/lib/glyphs/data';
import { PATTERN_ICONS, PATTERN_LABELS, isPatternId } from '@/lib/glyphs/patterns';
import { countWorksheetPages, rowItems } from '@/lib/worksheet/layout';

/** What is on the sheet right now, with one-click removal. */
export const SheetContentBar = () => {
  const config = useWorksheetStore((state) => state.config);
  const tier = useWorksheetStore((state) => state.tier);
  const toggleItem = useWorksheetStore((state) => state.toggleItem);
  const removeCustomWord = useWorksheetStore((state) => state.removeCustomWord);

  const { rows, pages } = useMemo(() => ({ rows: rowItems(config, tier).length, pages: countWorksheetPages(config, tier) }), [config, tier]);
  const words = config.category === 'letters' ? config.customWords : [];
  const isEmpty = config.selectedItems.length === 0 && words.length === 0;
  const alphabet = config.alphabet ?? 'ro';

  if (isEmpty) {
    return (
      <div className="rounded-2xl bg-blue-50/70 border border-blue-100 px-5 py-4 text-sm text-slate-600">
        Fișa e goală. Alege litere, cifre sau forme, ori scrie numele copilului.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-blue-50/70 border border-blue-100 px-5 py-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <p className="text-sm font-semibold text-slate-800">Pe fișă</p>
        <p className="text-xs text-slate-600">
          {rows} {rows === 1 ? 'rând' : 'rânduri'} · {pages} {pages === 1 ? 'pagină' : 'pagini'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {config.selectedItems.map((item) => {
          const icon = isPatternId(item) ? PATTERN_ICONS[item] : hintFor(item, alphabet)?.emoji;
          const label = isPatternId(item) ? PATTERN_LABELS[alphabet][item] : item;
          return (
            <button key={item} type="button" onClick={() => toggleItem(item)} aria-label={`Scoate ${label}`}
              className="group inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:border-red-400 hover:bg-red-50 transition-colors">
              {icon && <span aria-hidden>{icon}</span>}
              <span>{label}</span>
              <span className="text-slate-400 group-hover:text-red-500" aria-hidden>×</span>
            </button>
          );
        })}
        {words.map((word) => (
          <button key={`w-${word}`} type="button" onClick={() => removeCustomWord(word)} aria-label={`Scoate ${word}`}
            className="group inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-sm font-semibold text-slate-700 hover:border-red-400 hover:bg-red-50 transition-colors">
            <span aria-hidden>✍️</span>
            <span>{word}</span>
            <span className="text-slate-400 group-hover:text-red-500" aria-hidden>×</span>
          </button>
        ))}
      </div>
    </div>
  );
};
