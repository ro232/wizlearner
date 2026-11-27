'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Download, PencilLine } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { PRESETS } from '@/lib/worksheet/presets';
import { generateWorksheetPDF } from '@/lib/pdf/actions';
import { useToast } from '@/components/ui/toast';

/** The blank page shown until the sheet is drawn: the same size, so nothing moves when it arrives. */
function BlankSheet() {
  // an <svg>, like the canvas that replaces it: it has a size of its own and still shrinks on a phone
  return (
    <div className="w-full mx-auto" style={{ maxWidth: 250 }}>
      <svg width={250} height={354} viewBox="0 0 250 354" className="block w-full h-auto rounded-[3px] bg-white shadow-xl" aria-hidden />
    </div>
  );
}

// The preview brings the whole sheet builder with it: the home page fetches it only when the
// gallery comes near the screen, not with the first load.
const WorksheetPreview = dynamic(() => import('@/components/worksheet/worksheet-preview').then((m) => m.WorksheetPreview), { ssr: false, loading: BlankSheet });

/** Real sheets, drawn by the same engine as the downloads: open one to edit, or take it as it is. */
export function SheetGallery() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setNear(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const open = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    useWorksheetStore.setState({ config: p.config });
    router.push('/generator');
  };

  const download = async (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setBusy(id);
    try {
      await generateWorksheetPDF(p.config, 'free');
      toast(`„${p.title}” e descărcată. Spor la scris!`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={root} className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 sm:gap-8">
      {PRESETS.map((p, i) => (
        <article key={p.id} className="group flex flex-col">
          <div className="desk rounded-2xl border-2 border-ink p-2.5 sm:p-5 flex justify-center">
            <div className={`transition-transform duration-300 group-hover:rotate-0 group-hover:-translate-y-1 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}>
              {near ? <WorksheetPreview config={p.config} tier="free" width={250} /> : <BlankSheet />}
            </div>
          </div>
          <h3 className="mt-3 sm:mt-4 text-base sm:text-xl font-extrabold text-ink">{p.title}</h3>
          <p className="text-sm sm:text-base text-slate-600">{p.text}</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-1 sm:gap-2">
            <button type="button" onClick={() => open(p.id)} className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">
              <PencilLine className="w-4 h-4" aria-hidden /> Modifică
            </button>
            <button type="button" onClick={() => download(p.id)} disabled={busy === p.id} className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl font-extrabold text-ink hover:text-pen disabled:opacity-50" aria-label={`Descarcă ${p.title}`}>
              <Download className="w-4 h-4" aria-hidden /> {busy === p.id ? 'Se pregătește…' : 'Descarcă'}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
