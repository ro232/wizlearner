'use client';

import { useMemo, useState } from 'react';
import { Download, Printer, Save } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { GeneratorControls } from '@/components/worksheet/generator-controls';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { SheetContentBar } from '@/components/worksheet/sheet-content-bar';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { generateWorksheetPDF, printWorksheetPDF } from '@/lib/pdf/generate-pdf';
import { countWorksheetPages, rowItems } from '@/lib/worksheet/layout';
import { configForSaving, defaultSheetName } from '@/lib/worksheet/saved';
import { useAuth } from '@/hooks/use-auth';
import { useWorksheets } from '@/hooks/use-worksheets';
import { useRouter } from 'next/navigation';

export default function GeneratorPage() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const { user } = useAuth();
  const { saveWorksheet } = useWorksheets(user?.id);
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  // Saving needs an account and a paid plan; the child's name is never stored.
  const save = async () => {
    if (!user) return router.push('/auth/login?next=/generator');
    if (tier === 'free') return setShowPaywall(true);
    const name = window.prompt('Numele fișei', defaultSheetName(config));
    if (!name) return;
    const res = await saveWorksheet(name.trim().slice(0, 80), configForSaving(config));
    setSaved(res?.error ? 'Nu am putut salva fișa.' : 'Salvată în cont.');
    setTimeout(() => setSaved(null), 3000);
  };

  const { empty, pages } = useMemo(
    () => ({ empty: rowItems(config, tier).length === 0, pages: countWorksheetPages(config, tier) }),
    [config, tier],
  );

  const run = async (what: 'download' | 'print') => {
    setBusy(what);
    try {
      if (what === 'download') await generateWorksheetPDF(config, tier);
      else await printWorksheetPDF(config, tier);
    } catch (err) {
      console.error('PDF failed', err);
    } finally {
      setBusy(null);
    }
  };

  const actions = (
    <div className="flex gap-2">
      <Button
        onClick={() => run('download')}
        disabled={empty || busy !== null}
        className="flex-1 h-12 sm:h-14 rounded-2xl text-white shadow-lg font-bold text-base disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}
      >
        <Download className="w-5 h-5 mr-2" aria-hidden />
        {busy === 'download' ? 'Se pregătește…' : `Descarcă PDF${!empty && pages > 1 ? ` (${pages} pagini)` : ''}`}
      </Button>
      <Button
        variant="outline"
        onClick={() => run('print')}
        disabled={empty || busy !== null}
        className="h-12 sm:h-14 px-4 rounded-2xl border-2 font-semibold"
        aria-label="Printează"
        title="Printează fișa"
      >
        <Printer className="w-5 h-5" aria-hidden />
        <span className="hidden sm:inline ml-2">{busy === 'print' ? 'Se pregătește…' : 'Printează'}</span>
      </Button>
      <Button
        variant="outline"
        onClick={save}
        disabled={empty}
        className="h-12 sm:h-14 px-4 rounded-2xl border-2 font-semibold"
        aria-label="Salvează în cont"
        title={saved ?? 'Salvează fișa în cont'}
      >
        <Save className="w-5 h-5" aria-hidden />
        <span className="hidden xl:inline ml-2">{saved ?? 'Salvează'}</span>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 lg:pb-0" style={{ background: '#F8FAFC' }}>
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5">
        <h1 className="sr-only">Generator de fișe de lucru</h1>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Preview first on phones, on the right on large screens */}
          <section aria-label="Previzualizare" className="order-1 lg:order-2 lg:w-[54%] lg:sticky lg:top-20 lg:self-start space-y-4">
            <SheetContentBar />
            <div className="rounded-2xl shadow-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 p-3 sm:p-6 flex justify-center">
              <WorksheetPreview config={config} tier={tier} />
            </div>
            <div className="hidden lg:block">{actions}</div>
          </section>

          <section aria-label="Setări" className="order-2 lg:order-1 lg:w-[46%]">
            <GeneratorControls onShowPaywall={() => setShowPaywall(true)} />
          </section>
        </div>
      </main>

      {/* Phones: actions always within reach */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 p-3">{actions}</div>
    </div>
  );
}
