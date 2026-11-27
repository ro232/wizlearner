'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Download, Printer, UserRound } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { ForeignLettersNote } from '@/components/worksheet/foreign-letters-note';
import { DownloadError } from '@/components/worksheet/download-error';
import { pagini } from '@/components/worksheet/plural';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useDownload } from '@/hooks/use-download';
import { downloadPagesPdf, printPagesPdf } from '@/lib/pdf/actions';
import { track } from '@/lib/analytics';
import { ADVENT_LEVELS, adventDateTitle, buildAdventPages, cleanAdventName, type AdventLevel } from '@/lib/worksheet/advent';

/** Lowercase identifiers for analytics (see ALLOWED_PROPS in src/lib/analytics.ts). */
const LEVEL_ID: Record<AdventLevel, string> = { presc: 'presc', CP: 'cp', I: 'clasa-1' };

/**
 * „Calendarul de Advent”: a cover and one short sheet for each day from 1 to 24 December, with
 * the child's name. Free on purpose (the launch's lead magnet): the whole calendar, no account.
 * The name only lives in this page: it is not stored, not sent and not written to the download
 * history (same rule as /nume).
 */
export default function AdventPage() {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<AdventLevel>('presc');
  const [pageIndex, setPageIndex] = useState(0);
  const { busy: busyWith, error, run } = useDownload<'download' | 'print'>();
  const busy = busyWith !== null;
  const tier = useWorksheetStore((s) => s.tier);

  const pages = useMemo(() => buildAdventPages(level, name, tier), [level, name, tier]);
  const clean = cleanAdventName(name);

  const go = (what: 'download' | 'print') =>
    run(what, async () => {
      track('advent_download', { level: LEVEL_ID[level], pages: pages.length, format: what === 'print' ? 'print' : 'pdf', tier });
      if (what === 'print') return printPagesPdf(pages);
      const who = clean ? `-${clean.toLowerCase().replace(/\s+/g, '-')}` : '';
      await downloadPagesPdf(pages, `calendar-de-advent${who}.pdf`);
      return `Calendarul de Advent e gata: ${pagini(pages.length)}.`;
    });

  const pill = (on: boolean) => `p-2 rounded-lg border text-center ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 [&>*]:min-w-0">
        <section className="space-y-6">
          <div>
            <p className="inline-block font-bold text-[13px] tracking-[0.12em] uppercase text-pen border-b border-brand pb-1">Gratuit · fără cont</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">Calendarul de Advent cu fișe de lucru</h1>
            <p className="mt-2 text-slate-600">
              O fișă scurtă pentru fiecare zi, de la 1 la 24 decembrie, și o copertă pe care cel mic colorează câte o căsuță pe zi. Pui numele
              copilului, alegi clasa și printezi tot calendarul.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-line p-5 sm:p-6 space-y-5">
            <div>
              <label htmlFor="advent-name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                <UserRound className="w-3.5 h-3.5" aria-hidden /> Numele copilului (opțional)
              </label>
              <input id="advent-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Ștefan" autoComplete="off" maxLength={28}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <ForeignLettersNote text={name} className="mt-2" />
              <p className="mt-2 text-xs text-slate-500">Apare pe copertă, sus pe fiecare fișă și pe diploma din 24 decembrie. Rămâne doar în browserul tău.</p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Clasa</span>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2" role="group" aria-label="Clasa">
                {ADVENT_LEVELS.map((l) => (
                  <button key={l.id} type="button" onClick={() => setLevel(l.id)} aria-pressed={level === l.id} className={pill(level === l.id)}>
                    <div className="text-sm font-bold leading-tight">{l.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 leading-snug">{l.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <DownloadError message={error} />
            {/* the row wraps: on a 360 px phone the buttons do not fit side by side */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => go('download')} disabled={busy} className="flex-1 basis-48 min-w-0 min-h-12 h-auto py-2 whitespace-normal rounded-2xl text-white font-bold disabled:opacity-50" data-btn="primary">
                <Download className="w-5 h-5 mr-2 shrink-0" aria-hidden /> {busyWith === 'download' ? 'Se pregătește…' : `Descarcă calendarul (${pagini(pages.length)})`}
              </Button>
              <Button variant="outline" onClick={() => go('print')} disabled={busy} className="h-12 px-4 rounded-2xl border" aria-label="Printează calendarul">
                <Printer className="w-5 h-5" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <h2 className="font-bold text-ink text-base">Ce e în calendar</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Câte o activitate de 10–15 minute pe zi: cuvinte de iarnă de scris, numele copilului, exerciții grafice, găsește litera, numără, unește punctele, mici exerciții de matematică.</li>
              <li><strong>1 decembrie</strong> – România, <strong>6 decembrie</strong> – Moș Nicolae, <strong>24 decembrie</strong> – o diplomă de Crăciun cu numele lui.</li>
              <li>Grădiniță: litere mari de tipar. Clasa pregătitoare: litere mari și mici. Clasa I: litere de mână.</li>
            </ul>
          </div>
        </section>

        <section aria-label="Previzualizare" className="lg:sticky lg:top-24 lg:self-start space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">Calendarul: {pagini(pages.length)}</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <CalendarDays className="w-4 h-4 text-pen" aria-hidden />
              <span className="sr-only sm:not-sr-only">Arată</span>
              <select value={pageIndex} onChange={(e) => setPageIndex(Number(e.target.value))} className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value={0}>Coperta</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{adventDateTitle(i + 1)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="desk rounded-2xl border border-line p-4 sm:p-8 flex justify-center">
            <PagesPreview pages={pages} width={420} pageLabel="Pagina" pageIndex={pageIndex} onPageChange={setPageIndex} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
