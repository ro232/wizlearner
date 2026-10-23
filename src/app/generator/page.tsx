'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Printer, Save } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { GeneratorControls } from '@/components/worksheet/generator-controls';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { SheetContentBar } from '@/components/worksheet/sheet-content-bar';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { generateWorksheetPDF, printWorksheetPDF } from '@/lib/pdf/generate-pdf';
import { countWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { configForSaving, defaultSheetName } from '@/lib/worksheet/saved';
import { useAuth } from '@/hooks/use-auth';
import { useWorksheets } from '@/hooks/use-worksheets';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export default function GeneratorPage() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const { user } = useAuth();
  const { saveWorksheet } = useWorksheets(user?.id);
  const router = useRouter();
  const toast = useToast();
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  // Saving needs an account and a paid plan; the child's name is never stored.
  const save = async () => {
    if (!user) return router.push('/auth/login?next=/generator');
    if (tier === 'free') return setShowPaywall(true);
    const name = defaultSheetName(config).slice(0, 80);
    const res = await saveWorksheet(name, configForSaving(config));
    toast(res?.error ? 'Nu am putut salva fișa. Încearcă din nou.' : `Salvată în cont: ${name}`);
  };

  const { empty, pages } = useMemo(
    () => ({ empty: !hasContent(config, tier), pages: countWorksheetPages(config, tier) }),
    [config, tier],
  );

  const run = useCallback(
    async (what: 'download' | 'print') => {
      if (empty || busy) return;
      setBusy(what);
      try {
        if (what === 'download') {
          await generateWorksheetPDF(config, tier);
          toast(pages > 1 ? `Fișa e descărcată, ${pages} pagini.` : 'Fișa e descărcată. Spor la scris!');
        } else {
          await printWorksheetPDF(config, tier);
        }
      } catch (err) {
        console.error('PDF failed', err);
        toast('Nu am putut pregăti PDF-ul. Încearcă din nou.');
      } finally {
        setBusy(null);
      }
    },
    [empty, busy, config, tier, pages, toast],
  );

  // Ctrl/⌘+S downloads and Ctrl/⌘+P prints the sheet (not the web page around it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 's' || k === 'p') {
        e.preventDefault();
        run(k === 's' ? 'download' : 'print');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const spinner = <Loader2 className="w-5 h-5 animate-spin" aria-hidden />;

  const actions = (
    <div className="flex gap-2">
      <Button
        onClick={() => run('download')}
        disabled={empty || busy !== null}
        className="flex-1 h-12 sm:h-14 rounded-xl text-base gap-2 disabled:opacity-50"
        data-btn="primary"
      >
        {busy === 'download' ? spinner : <Download className="w-5 h-5" aria-hidden />}
        {busy === 'download' ? 'Se pregătește…' : `Descarcă PDF${!empty && pages > 1 ? ` (${pages} pagini)` : ''}`}
      </Button>
      <Button
        variant="outline"
        onClick={() => run('print')}
        disabled={empty || busy !== null}
        className="h-12 sm:h-14 px-4 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper"
        aria-label="Printează"
        title="Printează fișa"
      >
        {busy === 'print' ? spinner : <Printer className="w-5 h-5" aria-hidden />}
        <span className="hidden sm:inline ml-2">{busy === 'print' ? 'Se pregătește…' : 'Printează'}</span>
      </Button>
      <Button
        variant="outline"
        onClick={save}
        disabled={empty}
        className="h-12 sm:h-14 px-4 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper"
        aria-label="Salvează în cont"
        title="Salvează fișa în cont"
      >
        <Save className="w-5 h-5" aria-hidden />
        <span className="hidden xl:inline ml-2">Salvează</span>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 lg:pb-0 bg-paper">
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5">
        <h1 className="sr-only">Generator de fișe de lucru</h1>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Preview first on phones, on the right on large screens */}
          <section aria-label="Previzualizare" className="order-1 lg:order-2 lg:w-[54%] lg:sticky lg:top-20 lg:self-start space-y-4">
            <SheetContentBar />
            <div className="rounded-2xl overflow-hidden desk border-2 border-ink p-4 sm:p-8 flex justify-center">
              <WorksheetPreview config={config} tier={tier} />
            </div>
            <div className="hidden lg:block space-y-2">
              {actions}
              <p className="text-center text-xs text-slate-600">
                <kbd className="font-sans font-bold">{mac ? '⌘' : 'Ctrl'}+S</kbd> descarcă · <kbd className="font-sans font-bold">{mac ? '⌘' : 'Ctrl'}+P</kbd> printează · fișa se păstrează în acest browser
              </p>
            </div>
          </section>

          <section aria-label="Setări" className="order-2 lg:order-1 lg:w-[46%]">
            <GeneratorControls onShowPaywall={() => setShowPaywall(true)} />
          </section>
        </div>
      </main>

      {/* Phones: actions always within reach */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t-2 border-ink p-3">{actions}</div>
    </div>
  );
}
