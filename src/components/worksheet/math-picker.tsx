'use client';

import { Lock, Shuffle } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { FREE_MATH_RANGE, MATH_LABELS, MATH_RANGES, MATH_TYPES, mathRangeOf } from '@/lib/worksheet/math';

/** Math sheets: which exercises (one page each), up to which number, a new set, the answers. */
export function MathPicker({ onShowPaywall }: { onShowPaywall: () => void }) {
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const { toggleItem, setMathRange, newMathSet, toggleMathAnswers } = useWorksheetStore();
  const range = mathRangeOf(config);
  const pill = (on: boolean) =>
    `rounded-lg border-2 font-bold transition-all ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300'}`;

  return (
    <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Numere până la</div>
        <div className="grid grid-cols-4 gap-1.5">
          {MATH_RANGES.map((r) => {
            const locked = tier === 'free' && r > FREE_MATH_RANGE;
            return (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => (locked ? onShowPaywall() : setMathRange(r))}
                aria-label={`Numere până la ${r}${locked ? ' (varianta completă)' : ''}`}
                className={`relative h-11 ${pill(range === r)} ${locked ? 'opacity-60' : ''}`}>
                {r}
                {locked && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {range <= 10 ? 'Grădiniță și clasa pregătitoare.' : range === 20 ? 'Clasa I, începutul anului.' : 'Clasa I: zeci și unități, fără trecere peste ordin.'}
        </p>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Exerciții (o pagină pentru fiecare)</div>
        <div className="grid grid-cols-2 gap-1.5">
          {MATH_TYPES.map((t) => {
            const on = config.selectedItems.includes(t);
            const l = MATH_LABELS[t];
            return (
              <button key={t} type="button" aria-pressed={on} onClick={() => toggleItem(t)} className={`p-2 text-left ${pill(on)}`}>
                <div className="text-sm leading-tight"><span aria-hidden>{l.icon}</span> {l.title}</div>
                <div className="text-xs font-medium text-slate-500">{l.text}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={newMathSet} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">
          <Shuffle className="w-4 h-4" aria-hidden /> Alte exerciții
        </button>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={!!config.mathAnswers} onChange={toggleMathAnswers} className="w-5 h-5 accent-blue-600" />
          Pagină cu răspunsuri
        </label>
      </div>
    </div>
  );
}
