'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, PencilLine } from 'lucide-react';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { PRESETS } from '@/lib/worksheet/presets';
import { generateWorksheetPDF } from '@/lib/pdf/generate-pdf';
import { useToast } from '@/components/ui/toast';

/** Real sheets, drawn by the same engine as the downloads: open one to edit, or take it as it is. */
export function SheetGallery() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {PRESETS.map((p, i) => (
        <article key={p.id} className="group flex flex-col">
          <div className="desk rounded-2xl border-2 border-ink p-5 flex justify-center">
            <div className={`transition-transform duration-300 group-hover:rotate-0 group-hover:-translate-y-1 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}>
              <WorksheetPreview config={p.config} tier="free" width={250} />
            </div>
          </div>
          <h3 className="mt-4 text-xl font-extrabold text-ink">{p.title}</h3>
          <p className="text-slate-600">{p.text}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => open(p.id)} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">
              <PencilLine className="w-4 h-4" aria-hidden /> Modifică
            </button>
            <button type="button" onClick={() => download(p.id)} disabled={busy === p.id} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl font-extrabold text-ink hover:text-pen disabled:opacity-50" aria-label={`Descarcă ${p.title}`}>
              <Download className="w-4 h-4" aria-hidden /> {busy === p.id ? 'Se pregătește…' : 'Descarcă'}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
