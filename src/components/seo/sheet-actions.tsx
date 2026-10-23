'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, PencilLine, UserRound } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useToast } from '@/components/ui/toast';
import { seoSheetBySlug } from '@/lib/seo/catalog';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { downloadPagesPdf } from '@/lib/pdf/generate-pdf';

/**
 * The page's own sheet is given away as it is (one page). Changing it — the child's name,
 * more letters, more pages — opens the generator, where the usual plan limits apply.
 */
export function SheetActions({ slug }: { slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const sheet = seoSheetBySlug(slug);
  if (!sheet) return null;

  const download = async () => {
    setBusy(true);
    try {
      await downloadPagesPdf(buildWorksheetPages(sheet.config, 'full').slice(0, 1), `fisa-${sheet.slug}.pdf`);
      toast(`„${sheet.label}” e descărcată. Spor la scris!`);
    } finally {
      setBusy(false);
    }
  };

  const edit = () => {
    useWorksheetStore.setState({ config: sheet.config });
    router.push('/generator');
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
      <button type="button" onClick={download} disabled={busy} data-btn="primary" className="inline-flex items-center justify-center gap-2 whitespace-nowrap h-14 px-7 rounded-xl text-base disabled:opacity-60">
        <Download className="w-5 h-5" aria-hidden /> {busy ? 'Se pregătește…' : 'Descarcă PDF gratuit'}
      </button>
      <button type="button" onClick={edit} className="inline-flex items-center justify-center gap-2 whitespace-nowrap h-14 px-6 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">
        <PencilLine className="w-5 h-5" aria-hidden /> Modifică în generator
      </button>
      {sheet.kind === 'litere' && (
        <a href="/nume" className="inline-flex items-center justify-center gap-2 whitespace-nowrap h-14 px-4 font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">
          <UserRound className="w-5 h-5" aria-hidden /> Cu numele copilului
        </a>
      )}
    </div>
  );
}
