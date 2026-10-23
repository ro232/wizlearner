'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Download, FileText, Printer, UserRound } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { buildNameBookPages } from '@/lib/worksheet/name-book';
import { DEFAULT_CONFIG, type LetterMode, type Script, type WorksheetConfig } from '@/types';
import { downloadPagesPdf, generateWorksheetPDF, printWorksheetPDF } from '@/lib/pdf/generate-pdf';
import { lettersOfWord } from '@/lib/glyphs/data';

/**
 * The name sheet: one child's name, traced over a whole page. It is free on purpose:
 * it is what most parents look for first, and it shows the quality of the sheets.
 * (Sheets for a whole group of children are the paid feature, see /grupa.)
 */
export default function NameSheetPage() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<LetterMode>('paired');
  const [script, setScript] = useState<Script>('print');
  const [withLetters, setWithLetters] = useState(true);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'sheet' | 'book'>('sheet');
  const [showPaywall, setShowPaywall] = useState(false);
  const tier = useWorksheetStore((s) => s.tier);
  const bookPages = useMemo(() => (kind === 'book' ? buildNameBookPages(name || 'Ana', script) : []), [kind, name, script]);

  const config: WorksheetConfig = useMemo(() => {
    const clean = name.trim();
    // Each distinct letter of the name gets its own row first, then the whole name fills the page.
    const letters = withLetters && clean ? lettersOfWord(clean, mode === 'lowercase' ? 'lowercase' : 'uppercase') : [];
    return {
      ...DEFAULT_CONFIG,
      category: 'letters',
      alphabet: 'ro',
      letterMode: mode === 'lowercase' ? 'lowercase' : 'uppercase',
      script,
      selectedItems: letters.slice(0, 4),
      customWords: clean ? [clean] : [],
      childName: clean,
      customTitle: clean ? `Numele meu: ${clean}` : 'Numele meu',
      rowsPerPage: 7,
      showLetterIcons: false,
      fillPage: true,
    };
  }, [name, mode, withLetters, script]);

  // Paired mode writes the name with a capital first letter ("Ștefan").
  const sheet = useMemo<WorksheetConfig>(() => (mode === 'paired' ? { ...config, letterMode: 'paired', selectedItems: [] } : config), [config, mode]);
  const empty = !name.trim();

  const run = async (what: 'download' | 'print') => {
    if (kind === 'book') {
      // The whole workbook is part of the full plan; the single sheet stays free.
      if (tier === 'free') return setShowPaywall(true);
      setBusy(true);
      try {
        await downloadPagesPdf(bookPages, `caietul-lui-${name.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`);
        toast(`Caietul lui ${name.trim()} e gata: ${bookPages.length} pagini.`);
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      if (what === 'download') await generateWorksheetPDF(sheet, 'full');
      if (what === 'download') toast(`Fișa cu numele ${name.trim()} e descărcată.`);
      else await printWorksheetPDF(sheet, 'full');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Fișa cu numele copilului</h1>
            <p className="mt-2 text-slate-600">Scrie numele și descarcă o pagină de exersat, gratuit, sau un caiet întreg cu numele lui: copertă, câte o pagină pentru fiecare literă, numele în trei feluri, un joc și diplomă.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ce descarci">
              {([
                ['sheet', FileText, 'O fișă', 'gratuit'],
                ['book', BookOpen, 'Caietul cu numele', 'copertă, fiecare literă, diplomă'],
              ] as const).map(([k, Icon, title, sub]) => (
                <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                  className={`p-3 rounded-xl border-2 text-left ${kind === k ? 'border-ink bg-white shadow-md' : 'border-slate-300 bg-white hover:border-ink'}`}>
                  <Icon className="w-5 h-5 text-pen" aria-hidden />
                  <div className="mt-1 font-extrabold text-ink">{title}</div>
                  <div className="text-xs text-slate-600">{sub}</div>
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                <UserRound className="w-3.5 h-3.5" aria-hidden /> Numele
              </label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Ștefan" autoComplete="off" maxLength={28}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Cum scriem</span>
              <div className="grid grid-cols-3 gap-2">
                {([['uppercase', 'ȘTEFAN', 'litere mari'], ['paired', 'Ștefan', 'prima mare'], ['lowercase', 'ștefan', 'litere mici']] as const).map(([m, sample, sub]) => (
                  <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                    className={`p-2 rounded-lg border-2 text-center ${mode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    <div className="text-sm font-bold">{sample}</div>
                    <div className="text-[11px] text-slate-500">{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            {(
              <div>
                <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Litere</span>
                <div className="grid grid-cols-2 gap-2">
                  {([['print', 'de tipar', 'grădiniță, pregătitoare'], ['cursive', 'de mână', 'clasa I, scris legat']] as const).map(([v, label, sub]) => (
                    <button key={v} type="button" onClick={() => setScript(v)} aria-pressed={script === v}
                      className={`p-2 rounded-lg border-2 text-center ${script === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                      <div className={`text-sm font-bold ${v === 'cursive' ? 'italic' : ''}`}>{label}</div>
                      <div className="text-[11px] text-slate-500">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {kind === 'sheet' && mode !== 'paired' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={withLetters} onChange={() => setWithLetters((v) => !v)} className="w-4 h-4" />
                <span className="text-sm text-slate-700">Întâi literele din nume, câte una pe rând</span>
              </label>
            )}
            <div className="flex gap-2">
              <Button onClick={() => run('download')} disabled={empty || busy} className="flex-1 h-12 rounded-2xl text-white font-bold disabled:opacity-50" data-btn="primary">
                <Download className="w-5 h-5 mr-2" aria-hidden /> {kind === 'book' ? `Descarcă caietul (${bookPages.length} pagini)` : 'Descarcă PDF'}
              </Button>
              <Button variant="outline" onClick={() => run('print')} disabled={empty || busy || kind === 'book'} className="h-12 px-4 rounded-2xl border-2" aria-label="Printează">
                <Printer className="w-5 h-5" aria-hidden />
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-500">Ai o grupă întreagă? Pe pagina „Pentru grupă” faci câte o fișă pentru fiecare copil, dintr-o listă de nume.</p>
        </section>

        <section aria-label="Previzualizare" className="lg:sticky lg:top-24 lg:self-start">
          <div className="desk rounded-2xl border-2 border-ink p-4 sm:p-8 flex justify-center">
            {kind === 'book' ? <PagesPreview pages={bookPages} width={420} /> : <WorksheetPreview config={sheet} tier="full" />}
          </div>
          {kind === 'book' && tier === 'free' && (
            <p className="mt-3 text-sm text-slate-600 text-center">Răsfoiește caietul gratuit. Descărcarea lui face parte din varianta completă.</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
