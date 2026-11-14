'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, Loader2, Printer, Save } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { GeneratorControls } from '@/components/worksheet/generator-controls';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { SheetContentBar } from '@/components/worksheet/sheet-content-bar';
import { QuickStart } from '@/components/worksheet/quick-start';
import { LockedNotice } from '@/components/worksheet/locked-notice';
import { DownloadError } from '@/components/worksheet/download-error';
import { pagini } from '@/components/worksheet/plural';
import { track } from '@/lib/analytics';
import { logDownload } from '@/lib/projects';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { generateWorksheetPDF, printWorksheetPDF } from '@/lib/pdf/actions';
import { countWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { configForSaving, defaultSheetName } from '@/lib/worksheet/saved';
import { useAuth } from '@/hooks/use-auth';
import { useDownload } from '@/hooks/use-download';
import { useWorksheets } from '@/hooks/use-worksheets';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export default function GeneratorPage() {
  const [showPaywall, setShowPaywall] = useState(false);
  const { busy, error, run: runDownload } = useDownload<'download' | 'print'>();
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const { user } = useAuth();
  const { saveWorksheet } = useWorksheets(user?.id);
  const router = useRouter();
  const toast = useToast();
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  // Saving needs an account and a paid plan; the child's name is never stored
  // (neither in the sheet nor in its title: both go through configForSaving).
  const save = async () => {
    if (!user) {
      // Say why the sign-in page opens. The sheet stays in this browser, so it is still here afterwards.
      toast('Intră în cont ca să salvezi fișa. O găsești aici când te întorci.');
      return router.push('/auth/login?next=/generator&reason=save');
    }
    if (tier === 'free') return setShowPaywall(true);
    const name = defaultSheetName(config).slice(0, 80);
    const res = await saveWorksheet(name, configForSaving(config));
    if (res?.error) toast('Nu am putut salva fișa. Încearcă din nou.', { error: true });
    else toast(`Salvată în cont: ${name}`);
  };

  const { empty, pages } = useMemo(
    () => ({ empty: !hasContent(config, tier), pages: countWorksheetPages(config, tier) }),
    [config, tier],
  );

  const run = useCallback(
    (what: 'download' | 'print') => {
      if (empty) return;
      void runDownload(what, async () => {
        track(what === 'download' ? 'pdf_download' : 'pdf_print', { category: config.category, pages, tier });
        if (what === 'print') return printWorksheetPDF(config, tier);
        await generateWorksheetPDF(config, tier);
        void logDownload('sheet', defaultSheetName(config), configForSaving(config), pages);
        return pages > 1 ? `Fișa e descărcată, ${pagini(pages)}.` : 'Fișa e descărcată. Spor la scris!';
      });
    },
    [empty, runDownload, config, tier, pages],
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

  // Large screens: the preview column stays in view while the settings scroll, so it has to fit
  // the window — otherwise „Descarcă PDF” sits below the fold of a 1366×768 laptop. The sheet
  // takes the height that is left after everything else in the column (min. 300 px).
  const columnRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const col = columnRef.current;
    if (!col || typeof ResizeObserver === 'undefined') return;
    const wide = window.matchMedia('(min-width: 1024px)');
    const fit = () => {
      const sheet = col.querySelector<HTMLElement>('[data-sheet]');
      if (!wide.matches || !sheet || !sheet.offsetHeight) return col.style.removeProperty('--sheet-fit');
      const top = parseFloat(getComputedStyle(col).top) || 80;
      const others = col.offsetHeight - sheet.offsetHeight;
      col.style.setProperty('--sheet-fit', `${Math.max(300, Math.round(window.innerHeight - top - others - 8))}px`);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(col);
    window.addEventListener('resize', fit);
    wide.addEventListener('change', fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
      wide.removeEventListener('change', fit);
    };
  }, []);

  // Phones: the preview is above the settings. Choosing a letter further down changes a sheet
  // that is off screen, so a small „Vezi fișa” button appears, says the sheet changed and
  // scrolls up to it.
  const deskRef = useRef<HTMLDivElement>(null);
  const [previewInView, setPreviewInView] = useState(true);
  const [changed, setChanged] = useState(false);
  const inViewRef = useRef(true);
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        setPreviewInView(entry.isIntersecting);
        if (entry.isIntersecting) setChanged(false);
      },
      // not counting what is under the menu (top) and under the action bar (bottom)
      { rootMargin: '-72px 0px -96px 0px', threshold: 0.2 },
    );
    observer.observe(desk);
    return () => observer.disconnect();
  }, []);
  const firstConfig = useRef(true);
  useEffect(() => {
    if (firstConfig.current) {
      firstConfig.current = false;
      return;
    }
    if (!inViewRef.current) setChanged(true);
  }, [config]);
  const seeSheet = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    columnRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    setChanged(false);
  };

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
        {busy === 'download' ? 'Se pregătește…' : `Descarcă PDF${!empty && pages > 1 ? ` (${pagini(pages)})` : ''}`}
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
          <section
            ref={columnRef}
            aria-label="Previzualizare"
            className="order-1 lg:order-2 lg:w-[54%] lg:sticky lg:top-20 lg:self-start space-y-4 lg:space-y-3 scroll-mt-20 lg:[--sheet-fit:calc(100dvh-25rem)]"
          >
            <LockedNotice />
            {empty ? <QuickStart /> : <SheetContentBar />}
            {/* phones: no big blank page while the sheet is empty, the choices come first */}
            <div ref={deskRef} className={`rounded-2xl overflow-hidden desk border-2 border-ink p-4 sm:p-8 lg:p-4 xl:p-5 justify-center ${empty ? 'hidden lg:flex' : 'flex'}`}>
              <WorksheetPreview config={config} tier={tier} />
            </div>
            {/* stays in view even when the column cannot shrink any further (a long notice, a very low window) */}
            <div className="hidden lg:block space-y-1.5 lg:sticky lg:bottom-0 lg:z-10 lg:bg-paper lg:pt-1 lg:pb-2">
              <DownloadError message={error} />
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
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t-2 border-ink p-3">
        {!empty && !previewInView && (
          <button
            type="button"
            onClick={seeSheet}
            className={`absolute right-3 -top-14 h-11 pl-3 pr-4 rounded-full border-2 border-ink font-extrabold text-sm inline-flex items-center gap-2 shadow-[3px_3px_0_#1B2A4A] ${changed ? 'bg-pencil text-ink' : 'bg-white text-ink'}`}
          >
            <Eye className="w-5 h-5" aria-hidden />
            <span aria-live="polite">{changed ? 'Fișa s-a schimbat · Vezi fișa' : 'Vezi fișa'}</span>
          </button>
        )}
        <DownloadError message={error} className="mb-2" />
        {actions}
      </div>
    </div>
  );
}
