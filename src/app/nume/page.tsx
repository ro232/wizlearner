'use client';

import { useMemo, useState } from 'react';
import { Download, Printer, UserRound } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { DEFAULT_CONFIG, type LetterMode, type WorksheetConfig } from '@/types';
import { generateWorksheetPDF, printWorksheetPDF } from '@/lib/pdf/generate-pdf';
import { lettersOfWord } from '@/lib/glyphs/data';

/**
 * The name sheet: one child's name, traced over a whole page. It is free on purpose:
 * it is what most parents look for first, and it shows the quality of the sheets.
 * (Sheets for a whole group of children are the paid feature, see /grupa.)
 */
export default function NameSheetPage() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<LetterMode>('paired');
  const [withLetters, setWithLetters] = useState(true);
  const [busy, setBusy] = useState(false);

  const config: WorksheetConfig = useMemo(() => {
    const clean = name.trim();
    // Each distinct letter of the name gets its own row first, then the whole name fills the page.
    const letters = withLetters && clean ? lettersOfWord(clean, mode === 'lowercase' ? 'lowercase' : 'uppercase') : [];
    return {
      ...DEFAULT_CONFIG,
      category: 'letters',
      alphabet: 'ro',
      letterMode: mode === 'lowercase' ? 'lowercase' : 'uppercase',
      selectedItems: letters.slice(0, 4),
      customWords: clean ? [clean] : [],
      childName: clean,
      customTitle: clean ? `Numele meu: ${clean}` : 'Numele meu',
      rowsPerPage: 7,
      showLetterIcons: false,
      fillPage: true,
    };
  }, [name, mode, withLetters]);

  // Paired mode writes the name with a capital first letter ("Ștefan").
  const sheet = useMemo<WorksheetConfig>(() => (mode === 'paired' ? { ...config, letterMode: 'paired', selectedItems: [] } : config), [config, mode]);
  const empty = !name.trim();

  const run = async (what: 'download' | 'print') => {
    setBusy(true);
    try {
      if (what === 'download') await generateWorksheetPDF(sheet, 'full');
      else await printWorksheetPDF(sheet, 'full');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Fișa cu numele copilului</h1>
            <p className="mt-2 text-slate-600">Scrie numele, alege cum vrei literele și descarcă o pagină întreagă de exersat. Gratuit.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-5">
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
            {mode !== 'paired' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={withLetters} onChange={() => setWithLetters((v) => !v)} className="w-4 h-4" />
                <span className="text-sm text-slate-700">Întâi literele din nume, câte una pe rând</span>
              </label>
            )}
            <div className="flex gap-2">
              <Button onClick={() => run('download')} disabled={empty || busy} className="flex-1 h-12 rounded-2xl text-white font-bold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}>
                <Download className="w-5 h-5 mr-2" aria-hidden /> Descarcă PDF
              </Button>
              <Button variant="outline" onClick={() => run('print')} disabled={empty || busy} className="h-12 px-4 rounded-2xl border-2" aria-label="Printează">
                <Printer className="w-5 h-5" aria-hidden />
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-500">Ai o grupă întreagă? Pe pagina „Pentru grupă” faci câte o fișă pentru fiecare copil, dintr-o listă de nume.</p>
        </section>

        <section aria-label="Previzualizare" className="flex justify-center lg:sticky lg:top-24 lg:self-start">
          <WorksheetPreview config={sheet} tier="full" />
        </section>
      </main>
      <Footer />
    </div>
  );
}
