'use client';

import { Sparkles } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { PRESETS } from '@/lib/worksheet/presets';
import { track } from '@/lib/analytics';

/**
 * Shown while the sheet is empty: one tap starts from a ready-made sheet, so nobody faces a blank
 * page. On phones it takes the place of the big empty preview, so the choices are on the first screen.
 */
export function QuickStart({ className = '' }: { className?: string }) {
  const start = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    useWorksheetStore.setState({ config: p.config });
    track('quick_start', { preset: id });
  };
  return (
    <div className={`rounded-2xl bg-white border-2 border-ink p-4 sm:p-5 ${className}`}>
      <p className="flex items-center gap-2 font-extrabold text-ink">
        <Sparkles className="w-4 h-4 text-pen" aria-hidden /> Fișa e goală. Pornește de la una gata făcută:
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => start(p.id)}
            className="h-11 px-4 rounded-xl border-2 border-ink/80 bg-paper font-bold text-ink hover:bg-pencil/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pen"
          >
            {p.title}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-600">sau alege mai jos literele, cifrele ori formele pe care le exersați.</p>
    </div>
  );
}
