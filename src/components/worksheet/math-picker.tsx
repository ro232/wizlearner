'use client';

import { Lock, Shuffle } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { CARRY_TYPES, FREE_MATH_RANGE, MATH_CARRY, MATH_LABELS, MATH_RANGES, PAID_MATH_TYPES, fmtNum, hasCarryChoice, isBigRange, mathCarryOf, mathRangeOf, type MathCarry, type MathType } from '@/lib/worksheet/math';
import { FREE_MATH_TABLE, MATH_TABLES, MUL_TYPES, mathTableOf } from '@/lib/worksheet/multiply';
import { CLOCK_STEPS, CLOCK_STEP_LABELS, FREE_CLOCK_STEPS, clockStepOf } from '@/lib/worksheet/clock';

const CARRY_LABELS: Record<MathCarry, string> = { without: 'Fără', with: 'Cu', mixed: 'Amestecat' };

/** The exercise types in groups, as the programme orders its contents. */
const TYPE_GROUPS: { title: string; types: MathType[] }[] = [
  { title: 'Numere și operații', types: ['cmp', 'add', 'sub', 'mix', 'addpic', 'missing', 'seq', 'nbr', 'money', 'problems'] },
  { title: 'Înmulțire și împărțire', types: ['groups', 'mul', 'div', 'mulmiss'] },
  { title: 'Ceasul și calendarul', types: ['clock', 'clockdraw', 'week', 'months', 'calmonth'] },
  { title: 'Măsurări', types: ['length', 'mass', 'ruler', 'units'] },
  { title: 'Fracții și figuri', types: ['frac', 'figures'] },
];

/** Math sheets: which exercises (one page each), up to which number, carrying or not, a new set (the answers page: AnswerOptions). */
export function MathPicker({ onShowPaywall }: { onShowPaywall: () => void }) {
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const { toggleItem, setMathRange, setMathCarry, setMathTable, setMathClock, newMathSet } = useWorksheetStore();
  const range = mathRangeOf(config);
  const carry = mathCarryOf(config);
  const carryLocked = tier === 'free';
  const operations = config.selectedItems.some((t) => (CARRY_TYPES as readonly string[]).includes(t));
  const free = tier === 'free';
  // what the sheet really gets: the free plan prints the table of 2 and the easy clocks
  const table = free ? FREE_MATH_TABLE : mathTableOf(config);
  const clock = clockStepOf(config);
  const shownClock = free && !FREE_CLOCK_STEPS.includes(clock) ? 'half' : clock;
  const tables = config.selectedItems.some((t) => (MUL_TYPES as readonly string[]).includes(t));
  const clocks = config.selectedItems.includes('clock') || config.selectedItems.includes('clockdraw');
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
                aria-label={`Numere până la ${fmtNum(r)}${locked ? ' (varianta completă)' : ''}`}
                className={`relative h-11 whitespace-nowrap ${r >= 1000000 ? 'text-xs' : r >= 10000 ? 'text-sm' : ''} ${pill(range === r)} ${locked ? 'opacity-60' : ''}`}>
                {fmtNum(r)}
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
                  : range === 1000
                    ? 'Clasa a II-a: sute, zeci și unități.'
                    : range === 10000
                      ? 'Clasa a III-a: mii, sute, zeci și unități. Pentru comparare, adunări, scăderi, numărul lipsă, șiruri și vecini.'
                      : 'Clasa a IV-a: numere de șase cifre, până la un milion. Pentru comparare, adunări, scăderi, numărul lipsă, șiruri și vecini.'}
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
            {isBigRange(range)
              ? carry === 'with' ? ' (4387\u00a0+\u00a02549, 7003\u00a0−\u00a02568).' : carry === 'without' ? ' (4325\u00a0+\u00a03621, 8765\u00a0−\u00a03421).' : '.'
              : range === 1000
              ? carry === 'with' ? ' (275\u00a0+\u00a0148, 503\u00a0−\u00a0127).' : carry === 'without' ? ' (324\u00a0+\u00a0152, 768\u00a0−\u00a0435).' : '.'
              : carry === 'with' ? ' (8\u00a0+\u00a05, 23\u00a0−\u00a07).' : carry === 'without' ? ' (14\u00a0+\u00a05, 27\u00a0−\u00a04).' : '.'}
          </p>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Exerciții (o pagină pentru fiecare)</div>
        <div className="space-y-3">
          {TYPE_GROUPS.map((g) => (
            <div key={g.title} role="group" aria-label={g.title}>
              <div className="text-xs font-bold text-slate-600 mb-1">{g.title}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {g.types.map((t) => {
                  const on = config.selectedItems.includes(t);
                  const l = MATH_LABELS[t];
                  const locked = free && PAID_MATH_TYPES.includes(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} onClick={() => (locked && !on ? onShowPaywall() : toggleItem(t))}
                      aria-label={locked ? `${l.title} (varianta completă)` : undefined}
                      className={`relative p-2 text-left ${pill(on)} ${locked ? 'opacity-60' : ''}`}>
                      <div className="text-sm leading-tight"><span aria-hidden>{l.icon}</span> {l.title}</div>
                      <div className="text-xs font-medium text-slate-500">{l.text}</div>
                      {locked && <Lock className="absolute top-1 right-1 w-3 h-3 text-amber-600" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {tables && (
        <div>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Tabla înmulțirii</div>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Tabla înmulțirii">
            {MATH_TABLES.map((t) => {
              const locked = free && t !== FREE_MATH_TABLE;
              return (
                <button key={t} type="button" aria-pressed={table === t} onClick={() => (locked ? onShowPaywall() : setMathTable(t))}
                  aria-label={`${t ? `Tabla înmulțirii cu ${t}` : 'Toate tablele, amestecate'}${locked ? ' (varianta completă)' : ''}`}
                  className={`relative h-11 text-sm ${pill(table === t)} ${locked ? 'opacity-60' : ''}`}>
                  {t || 'Toate'}
                  {locked && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-600">Clasa a II-a: înmulțiri și împărțiri exacte până la 100{table ? ` (tabla cu ${table})` : ', din toate tablele'}.</p>
        </div>
      )}

      {clocks && (
        <div>
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Ceasul</div>
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Ce ore arată ceasurile">
            {CLOCK_STEPS.map((c) => {
              const locked = free && !FREE_CLOCK_STEPS.includes(c);
              return (
                <button key={c} type="button" aria-pressed={shownClock === c} onClick={() => (locked ? onShowPaywall() : setMathClock(c))}
                  aria-label={`${CLOCK_STEP_LABELS[c]}${locked ? ' (varianta completă)' : ''}`}
                  className={`relative h-11 text-sm ${pill(shownClock === c)} ${locked ? 'opacity-60' : ''}`}>
                  {CLOCK_STEP_LABELS[c]}
                  {locked && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {shownClock === 'hour' || shownClock === 'half' ? 'Clasa I: ora fixă și jumătatea de oră (3:00, 3:30).' : shownClock === 'quarter' ? 'Clasa a II-a: și sferturi (3 și un sfert, 4 fără un sfert).' : 'Clasa a II-a: din 5 în 5 minute (3 și 20 de minute).'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={newMathSet} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">
          <Shuffle className="w-4 h-4" aria-hidden /> Alte exerciții
        </button>
      </div>
    </div>
  );
}
