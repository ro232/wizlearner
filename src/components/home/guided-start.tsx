'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';

type Who = 'copil' | 'grupa' | 'kdp';
type What = 'litere' | 'nume' | 'cifre' | 'grafice';

const WHO: { id: Who; title: string; text: string }[] = [
  { id: 'copil', title: 'Copilul meu', text: 'O fișă de exersat acasă' },
  { id: 'grupa', title: 'Grupa mea', text: 'Câte o fișă pentru fiecare copil' },
  { id: 'kdp', title: 'Un caiet de vândut', text: 'Caiet complet pentru Amazon KDP' },
];

const WHAT: { id: What; title: string }[] = [
  { id: 'nume', title: 'Numele lui' },
  { id: 'litere', title: 'Litere' },
  { id: 'cifre', title: 'Cifre' },
  { id: 'grafice', title: 'Exerciții grafice' },
];

/** Three quick questions that land the visitor on a finished sheet instead of an empty form. */
export function GuidedStart() {
  const router = useRouter();
  const [who, setWho] = useState<Who | null>(null);
  const [what, setWhat] = useState<What | null>(null);
  const [name, setName] = useState('');

  const step = !who ? 1 : who === 'copil' && !what ? 2 : 3;
  const needsName = who === 'copil' && what === 'nume' && !name.trim();

  const finish = () => {
    if (who === 'grupa') return router.push('/grupa');
    if (who === 'kdp') return router.push('/book');
    if (needsName) return;
    const clean = name.trim();
    const config: WorksheetConfig = {
      ...DEFAULT_CONFIG,
      alphabet: 'ro',
      fillPage: true,
      childName: clean,
      ...(what === 'nume' && { letterMode: 'paired' as const, customWords: [clean], showLetterIcons: false }),
      ...(what === 'litere' && { letterMode: 'paired' as const, selectedItems: ['Aa', 'Bb', 'Cc'] }),
      ...(what === 'cifre' && { category: 'numbers' as const, selectedItems: ['1', '2', '3', '4', '5'] }),
      ...(what === 'grafice' && { category: 'prewrite' as const, selectedItems: ['vertical', 'horizontal', 'zigzag'] }),
    };
    useWorksheetStore.setState({ config });
    router.push('/generator');
  };

  const choice = (active: boolean) =>
    `text-left rounded-xl border-2 px-4 py-3 transition-all ${active ? 'border-ink bg-white shadow-md' : 'border-slate-300 bg-white hover:border-ink'}`;

  return (
    <div className="rounded-2xl bg-white shadow-xl p-6 sm:p-8">
      <ol className="flex items-center gap-2 text-xs font-extrabold mb-5" aria-label="Pași">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center ${n < step ? 'bg-ink text-white' : n === step ? 'bg-pen text-white' : 'bg-slate-100 text-slate-600'}`}
              aria-current={n === step ? 'step' : undefined}
            >
              {n < step ? <Check className="w-3.5 h-3.5" aria-label={`Pasul ${n}, gata`} /> : n}
            </span>
            {n < 3 && <span className="w-8 h-0.5 bg-slate-300" aria-hidden />}
          </li>
        ))}
      </ol>

      <h3 className="text-2xl font-extrabold text-ink">Pentru cine e fișa?</h3>
      <div className="mt-3 grid sm:grid-cols-3 gap-2">
        {WHO.map((w) => (
          <button key={w.id} type="button" aria-pressed={who === w.id} onClick={() => { setWho(w.id); setWhat(null); }} className={choice(who === w.id)}>
            <div className="font-extrabold text-ink">{w.title}</div>
            <div className="text-sm text-slate-600">{w.text}</div>
          </button>
        ))}
      </div>

      {who === 'copil' && (
        <>
          <h3 className="mt-6 text-2xl font-extrabold text-ink">Ce exersați?</h3>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WHAT.map((w) => (
              <button key={w.id} type="button" aria-pressed={what === w.id} onClick={() => setWhat(w.id)} className={choice(what === w.id)}>
                <div className="font-extrabold text-ink">{w.title}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && who === 'copil' && (
        <div className="mt-6">
          <label htmlFor="gs-name" className="block text-2xl font-display font-extrabold text-ink">Cum îl cheamă?</label>
          <input
            id="gs-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && finish()}
            placeholder={what === 'nume' ? 'ex. Ștefan' : 'opțional, apare în antet'}
            autoComplete="off"
            maxLength={28}
            className="mt-3 w-full h-12 px-4 rounded-xl border-2 border-slate-300 bg-white text-lg focus:border-ink focus:outline-none"
          />
        </div>
      )}

      {step === 3 && (
        <button type="button" data-btn="primary" onClick={finish} disabled={needsName} className="mt-6 inline-flex items-center gap-2 h-14 px-7 rounded-xl text-base disabled:opacity-50">
          {who === 'grupa' ? 'Fă fișele pentru grupă' : who === 'kdp' ? 'Fă caietul' : 'Vezi fișa'} <ArrowRight className="w-4 h-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
