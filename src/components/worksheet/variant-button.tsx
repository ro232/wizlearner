'use client';

import { Shuffle } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { hasVariants, variantOf } from '@/lib/worksheet/variant';

/**
 * „Altă variantă”: the games on the sheet drawn again from their pools (other pictures, numbers, another
 * maze …), as „Alte exerciții” does for math. Shown only when a chosen game has other variants.
 */
export function VariantButton({ className = '' }: { className?: string }) {
  const config = useWorksheetStore((s) => s.config);
  const newVariant = useWorksheetStore((s) => s.newVariant);
  // „Lecția literei”: another variant traces the next words of the lesson's list
  const lessonWords = config.category === 'letters' && config.lesson ? config.lesson.words?.length ?? 0 : 0;
  const lesson = lessonWords > 0 && !!config.lesson && config.lesson.counts.words > 0 && lessonWords > config.lesson.counts.words;
  if (config.category !== 'games' && !lesson) return null;
  const varying = lesson ? 1 : config.selectedItems.filter(hasVariants).length;
  if (!varying) return null;
  const variant = variantOf(config);
  const all = varying === config.selectedItems.length;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`} data-variant>
      <button type="button" onClick={() => newVariant()} data-variant-button
        aria-label={`Altă variantă a fișei (acum: varianta ${variant})`}
        className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-line-strong bg-white font-semibold text-ink hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <Shuffle className="w-4 h-4" aria-hidden /> Altă variantă
      </button>
      <span className="text-xs text-slate-600" aria-live="polite" data-variant-note>
        Varianta {variant}{lesson ? ': aceeași lecție, alte cuvinte din listă.' : all ? ': aceleași jocuri, alte imagini și numere.' : ': se schimbă jocurile cu mai multe variante; textele rămân.'}
      </span>
      {variant > 1 && (
        <button type="button" onClick={() => newVariant(true)} className="min-h-[2.75rem] px-1 text-xs font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900">
          Prima variantă
        </button>
      )}
    </div>
  );
}
