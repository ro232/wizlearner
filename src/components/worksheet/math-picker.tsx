'use client';

import { Lock, Shuffle } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { CARRY_TYPES, FREE_MATH_RANGE, MATH_CARRY, MATH_LABELS, MATH_RANGES, MATH_TYPES, hasCarryChoice, mathCarryOf, mathRangeOf, type MathCarry } from '@/lib/worksheet/math';

const CARRY_LABELS: Record<MathCarry, string> = { without: 'Fără', with: 'Cu', mixed: 'Amestecat' };

/** Math sheets: which exercises (one page each), up to which number, carrying or not, a new set (the answers page: AnswerOptions). */
export function MathPicker({ onShowPaywall }: { onShowPaywall: () => void }) {
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const { toggleItem, setMathRange, setMathCarry, newMathSet } = useWorksheetStore();
  const range = mathRangeOf(config);
  const carry = mathCarryOf(config);
  const carryLocked = tier === 'free';
  const operations = config.selectedItems.some((t) => (CARRY_TYPES as readonly string[]).includes(t));
  const pill = (on: boolean) =>
    `rounded-lg border-2 font-bold transition-all ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300'}`;

  return (
    <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Numere până la</div>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6 gap-1.5">
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
          {range <= 10
            ? 'Grădiniță și clasa pregătitoare.'
            : range === 20
              ? 'Clasa I, începutul anului.'
              : range === 31
                ? 'Clasa pregătitoare: numerele 0–31; adunări și scăderi cu 1–5 unități.'
                : range === 100
                  ? 'Clasa I: zeci și unități.'
                  : 'Clasa a II-a: sute, zeci și unități.'}
        </p>
      </div>

      {hasCarryChoice(range) && (
        <div>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Trecere peste ordin</div>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Trecere peste ordin la adunări și scăderi">
            {MATH_CARRY.map((c) => (
              <button key={c} type="button" aria-pressed={carry === c} onClick={() => (carryLocked ? onShowPaywall() : setMathCarry(c))}
                aria-label={`${c === 'mixed' ? 'Și fără, și cu trecere peste ordin' : `${CARRY_LABELS[c]} trecere peste ordin`}${carryLocked ? ' (varianta completă)' : ''}`}
                className={`relative h-11 text-sm ${pill(carry === c)} ${carryLocked ? 'opacity-60' : ''}`}>
                {CARRY_LABELS[c]}
                {carryLocked && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {operations ? 'Pentru adunări, scăderi și numărul lipsă' : 'Alege adunări sau scăderi: opțiunea se aplică doar lor'}
            {range === 1000
              ? carry === 'with' ? ' (275\u00a0+\u00a0148, 503\u00a0−\u00a0127).' : carry === 'without' ? ' (324\u00a0+\u00a0152, 768\u00a0−\u00a0435).' : '.'
              : carry === 'with' ? ' (8\u00a0+\u00a05, 23\u00a0−\u00a07).' : carry === 'without' ? ' (14\u00a0+\u00a05, 27\u00a0−\u00a04).' : '.'}
          </p>
        </div>
      )}

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
      </div>
    </div>
  );
}
