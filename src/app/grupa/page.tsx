'use client';

import { useMemo, useState } from 'react';
import { Download, Users, Check } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { THEMES } from '@/lib/themes';
import { ALPHABETS } from '@/lib/glyphs/data';
import { buildGroupPages, parseNames, MAX_CHILDREN, MAX_LETTERS } from '@/lib/worksheet/group';
import { downloadPagesPdf } from '@/lib/pdf/generate-pdf';
import type { Difficulty, LetterMode } from '@/types';

/** On the free plan the group sheets can be tried with a few children. */
const FREE_GROUP_LIMIT = 3;

const EXAMPLE = 'Ana Popescu\nȘtefan\nMaria-Ioana\nLuca\nIrina';

export default function GroupPage() {
  const tier = useWorksheetStore((s) => s.tier);
  const [namesText, setNamesText] = useState('');
  const [themeId, setThemeId] = useState<string | undefined>(THEMES[0].id);
  const [letters, setLetters] = useState<string[]>([]);
  const [letterMode, setLetterMode] = useState<LetterMode>('uppercase');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [busy, setBusy] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const names = useMemo(() => parseNames(namesText), [namesText]);
  const limit = tier === 'free' ? FREE_GROUP_LIMIT : MAX_CHILDREN;
  const previewNames = names.length ? names.slice(0, limit) : ['Ana'];
  const { pages } = useMemo(
    () => buildGroupPages({ names: previewNames, themeId, letters, letterMode, difficulty }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewNames.join('\n'), themeId, letters, letterMode, difficulty],
  );

  const toggleLetter = (l: string) =>
    setLetters((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : cur.length >= MAX_LETTERS ? [...cur.slice(1), l] : [...cur, l]));

  const download = async () => {
    if (names.length > limit) {
      setShowPaywall(true);
      return;
    }
    setBusy(true);
    try {
      await downloadPagesPdf(pages, `fise-grupa-${themeId ?? 'litere'}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Fișe pentru toată grupa</h1>
            <p className="mt-2 text-slate-600">
              Lipești lista copiilor și primești un singur PDF, cu câte o fișă pentru fiecare: numele lui de trasat, literele
              săptămânii și cuvintele temei, cu imagini.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="names" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" aria-hidden /> Copiii din grupă
                </label>
                <span className="text-xs text-slate-500">{names.length} {names.length === 1 ? 'copil' : 'copii'}</span>
              </div>
              <textarea id="names" rows={6} value={namesText} onChange={(e) => setNamesText(e.target.value)} placeholder={EXAMPLE}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-[11px] text-slate-500 mt-1">
                Câte un nume pe rând (merge și copiat din catalog). Numele rămân în browserul tău, nu ni le trimiți.
                {tier === 'free' && ` Gratuit poți încerca cu ${FREE_GROUP_LIMIT} copii.`}
              </p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Tema săptămânii</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setThemeId(t.id)} aria-pressed={themeId === t.id}
                    className={`relative p-2.5 rounded-xl border-2 text-left ${themeId === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="text-lg" aria-hidden>{t.icon}</div>
                    <div className="text-sm font-semibold text-slate-800">{t.title}</div>
                    <div className="text-[11px] text-slate-500">{t.when}</div>
                    {themeId === t.id && <Check className="absolute top-2 right-2 w-4 h-4 text-blue-600" aria-hidden />}
                  </button>
                ))}
                <button type="button" onClick={() => setThemeId(undefined)} aria-pressed={!themeId}
                  className={`p-2.5 rounded-xl border-2 text-left ${!themeId ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="text-lg" aria-hidden>✏️</div>
                  <div className="text-sm font-semibold text-slate-800">Fără temă</div>
                  <div className="text-[11px] text-slate-500">doar numele și literele</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Literele săptămânii</span>
                <span className="text-xs text-slate-500">cel mult {MAX_LETTERS}</span>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-11 gap-1">
                {ALPHABETS.ro.map((l) => (
                  <button key={l} type="button" onClick={() => toggleLetter(l)} aria-pressed={letters.includes(l)}
                    className={`h-9 rounded-lg border-2 text-sm font-bold ${letters.includes(l) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Scriem</span>
                <div className="grid grid-cols-2 gap-2">
                  {([['uppercase', 'MARI'], ['paired', 'Prima mare']] as const).map(([m, l]) => (
                    <button key={m} type="button" onClick={() => setLetterMode(m)} aria-pressed={letterMode === m}
                      className={`p-2 rounded-lg border-2 text-sm font-semibold ${letterMode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Nivel</span>
                <div className="grid grid-cols-3 gap-2">
                  {([['beginner', 'Început'], ['intermediate', 'Mijlociu'], ['advanced', 'Avansat']] as const).map(([d, l]) => (
                    <button key={d} type="button" onClick={() => setDifficulty(d)} aria-pressed={difficulty === d}
                      className={`p-2 rounded-lg border-2 text-xs font-semibold ${difficulty === d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={download} disabled={busy || names.length === 0} className="w-full h-14 rounded-2xl text-white font-bold text-base disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}>
              <Download className="w-5 h-5 mr-2" aria-hidden />
              {busy ? 'Se pregătește…' : names.length === 0 ? 'Adaugă numele copiilor' : `Descarcă fișele (${names.length} ${names.length === 1 ? 'copil' : 'copii'}, ${pages.length} pagini)`}
            </Button>
          </div>
        </section>

        <section aria-label="Previzualizare" className="lg:sticky lg:top-24 lg:self-start flex flex-col items-center gap-3">
          <PagesPreview pages={pages} width={440} pageLabel="Fișa" />
          {!names.length && <p className="text-sm text-slate-500">Exemplu pentru „Ana”. Adaugă numele copiilor ca să le vezi fișele.</p>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
