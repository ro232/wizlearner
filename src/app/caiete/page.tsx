'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { downloadPagesPdf } from '@/lib/pdf/actions';
import { lowercaseLetters, pairedLetters, uppercaseLetters } from '@/lib/glyphs/data';
import { DEFAULT_CONFIG, type Difficulty, type WorksheetConfig } from '@/types';
import { track } from '@/lib/analytics';
import { logDownload, takeProject } from '@/lib/projects';
import { SaveProjectButton } from '@/components/projects/save-project-button';
import { PaywallModal } from '@/components/worksheet/paywall-modal';

interface WorkbookProject {
  book: BookId;
  level: Difficulty;
  withWords: boolean;
  /** only when opened for a child from the account; never saved */
  name?: string;
}

/**
 * Ready-made workbooks: the whole alphabet (or the digits), one page per letter, at the
 * chosen level, optionally with a word for each letter on the last two rows.
 * Free: the pages of the free letters (A–E, Ă, Â, 0–5); the whole workbook with the full plan.
 */

type BookId = 'upper' | 'lower' | 'paired' | 'cursive' | 'digits' | 'numbers20';

const BOOKS: { id: BookId; title: string; text: string; sample: string; italic?: boolean }[] = [
  { id: 'upper', title: 'Alfabetul cu litere mari', text: 'A–Z, cu Ă Â Î Ș Ț. Grădiniță.', sample: 'A B C' },
  { id: 'lower', title: 'Alfabetul cu litere mici', text: 'a–z, cu ă â î ș ț.', sample: 'a b c' },
  { id: 'paired', title: 'Alfabetul mare și mic', text: 'Aa, Bb… Clasa pregătitoare.', sample: 'Aa Bb' },
  { id: 'cursive', title: 'Alfabetul de mână', text: 'Ca în manualul de clasa I.', sample: 'Aa Bb', italic: true },
  { id: 'digits', title: 'Cifrele 0–9', text: 'O pagină pentru fiecare cifră.', sample: '1 2 3' },
  { id: 'numbers20', title: 'Numerele 0–20', text: 'Cifre și numere, clasa I.', sample: '10 11' },
];

const LEVELS: [Difficulty, string, string][] = [
  ['beginner', 'Început', 'cu mult ajutor'],
  ['intermediate', 'Mijlociu', 'ajutor parțial'],
  ['advanced', 'Avansat', 'mai mult singur'],
];

const PRESET: Record<Difficulty, Partial<WorksheetConfig>> = {
  beginner: { fontStyle: 'dashed', tracingVisibility: 8, letterSize: 'large', rowsPerPage: 5 },
  intermediate: { fontStyle: 'dotted', tracingVisibility: 5, letterSize: 'medium', rowsPerPage: 7 },
  advanced: { fontStyle: 'dotted', tracingVisibility: 3, letterSize: 'small', rowsPerPage: 9 },
};

function bookConfig(id: BookId, level: Difficulty, withWords: boolean, name: string): WorksheetConfig {
  const letters = id !== 'digits' && id !== 'numbers20';
  const items =
    id === 'upper' ? uppercaseLetters('ro') : id === 'lower' ? lowercaseLetters('ro') : id === 'digits' ? '0123456789'.split('') : id === 'numbers20' ? Array.from({ length: 21 }, (_, i) => String(i)) : pairedLetters('ro');
  return {
    ...DEFAULT_CONFIG,
    ...PRESET[level],
    difficulty: level,
    category: letters ? 'letters' : 'numbers',
    alphabet: 'ro',
    letterMode: id === 'upper' ? 'uppercase' : id === 'lower' ? 'lowercase' : 'paired',
    script: id === 'cursive' ? 'cursive' : 'print',
    selectedItems: items,
    customWords: [],
    childName: name.trim(),
    pagePerItem: true,
    itemWords: letters && withWords,
    showLetterIcons: letters,
    fillPage: false,
  };
}

export default function WorkbooksPage() {
  const [book, setBook] = useState<BookId>('upper');
  const [level, setLevel] = useState<Difficulty>('beginner');
  const [withWords, setWithWords] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const tier = useWorksheetStore((s) => s.tier);
  // a workbook opened from the account (the child's name is never stored)
  useEffect(() => {
    const p = takeProject<WorkbookProject>('workbook');
    if (!p) return;
    if (BOOKS.some((b) => b.id === p.book)) setBook(p.book);
    if (p.level) setLevel(p.level);
    setWithWords(p.withWords !== false);
    if (p.name) setName(p.name);
  }, []);
  const toast = useToast();

  const config = useMemo(() => bookConfig(book, level, withWords, name), [book, level, withWords, name]);
  const all = useMemo(() => buildWorksheetPages(config, 'full'), [config]);
  const mine = useMemo(() => (tier === 'free' ? buildWorksheetPages(config, 'free') : all), [config, tier, all]);
  const isLetters = book !== 'digits' && book !== 'numbers20';
  const title = BOOKS.find((b) => b.id === book)!.title;

  const download = async () => {
    setBusy(true);
    try {
      track('workbook_download', { book, level, words: withWords, tier });
      await downloadPagesPdf(mine, `caiet-${book}-${level}.pdf`);
      void logDownload('workbook', `${BOOKS.find((b) => b.id === book)!.title} · ${LEVELS.find((l) => l[0] === level)![1]}`, { book, level, withWords }, mine.length);
      toast(tier === 'free' ? `Paginile gratuite sunt descărcate: ${mine.length}.` : `Caietul e gata: ${mine.length} pagini.`);
    } finally {
      setBusy(false);
    }
  };

  const pill = (on: boolean) => `p-2 rounded-lg border-2 text-center ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Caiete gata făcute</h1>
            <p className="mt-2 text-slate-600">Tot alfabetul sau toate cifrele, câte o pagină pentru fiecare, la nivelul copilului. Alegi, te uiți, descarci.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-5">
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Caietul</span>
              <div className="grid grid-cols-2 gap-2">
                {BOOKS.map((b) => (
                  <button key={b.id} type="button" onClick={() => setBook(b.id)} aria-pressed={book === b.id}
                    className={`p-3 rounded-xl border-2 text-left ${book === b.id ? 'border-ink bg-white shadow-md' : 'border-slate-300 bg-white hover:border-ink'}`}>
                    <div className={`text-lg font-extrabold text-pen ${b.italic ? 'italic' : ''}`} aria-hidden>{b.sample}</div>
                    <div className="font-extrabold text-ink leading-tight">{b.title}</div>
                    <div className="text-xs text-slate-600">{b.text}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Nivel</span>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map(([v, label, sub]) => (
                  <button key={v} type="button" onClick={() => setLevel(v)} aria-pressed={level === v} className={pill(level === v)}>
                    <div className="text-sm font-bold">{label}</div>
                    <div className="text-[11px] text-slate-500">{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {isLetters && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={withWords} onChange={() => setWithWords((v) => !v)} className="w-5 h-5 mt-0.5 accent-blue-600" />
                <span className="text-sm text-slate-700">
                  <span className="font-semibold">Un cuvânt pe ultimele două rânduri</span>
                  <br />
                  <span className="text-slate-500">Avion la A, balon la B…, cu poza lui.</span>
                </span>
              </label>
            )}

            <div>
              <label htmlFor="wb-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Numele copilului (opțional)</label>
              <input id="wb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="apare sus pe fiecare pagină" maxLength={28} autoComplete="off"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
            <div className="flex gap-2">
            <Button onClick={download} disabled={busy || !mine.length} className="flex-1 h-12 rounded-2xl text-white font-bold disabled:opacity-50" data-btn="primary">
              {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden /> : <Download className="w-5 h-5 mr-2" aria-hidden />}
              {tier === 'free' ? `Descarcă paginile gratuite (${mine.length})` : `Descarcă caietul (${all.length} pagini)`}
            </Button>
            <SaveProjectButton kind="workbook" name={`${title} · ${LEVELS.find((l) => l[0] === level)![1]}`} configuration={{ book, level, withWords }} onPaywall={() => setShowPaywall(true)} back="/caiete" />
            </div>
            {tier === 'free' && (
              <p className="text-sm text-slate-600">
                Gratuit descarci paginile pentru A–E (și Ă, Â) sau cifrele 0–5. Tot caietul, cu toate cele {all.length} pagini, face parte din{' '}
                <a href="/preturi" className="font-semibold text-blue-700 underline">varianta completă</a>.
              </p>
            )}
          </div>
        </section>

        <section aria-label="Previzualizare" className="lg:sticky lg:top-24 lg:self-start space-y-2">
          <p className="text-sm font-semibold text-slate-700">{title}: {all.length} pagini</p>
          <div className="desk rounded-2xl border-2 border-ink p-4 sm:p-8 flex justify-center">
            <PagesPreview pages={all} width={420} pageLabel="Pagina" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
