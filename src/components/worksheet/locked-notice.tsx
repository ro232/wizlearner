'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { isItemAllowed } from '@/lib/access';
import { isWordAllowed } from '@/lib/worksheet/layout';
import { normalizeKey } from '@/lib/glyphs/data';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { PATTERN_LABELS, isPatternId } from '@/lib/glyphs/patterns';

/**
 * Chosen items the free plan does not print (a sheet opened from a free page, e.g. „Litera M”,
 * or one saved earlier): say so, instead of a sheet that quietly comes out without them.
 */
export function LockedNotice() {
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const removeLocked = () =>
    useWorksheetStore.setState((st) => ({
      config: {
        ...st.config,
        selectedItems: st.config.selectedItems.filter((i) => isItemAllowed(i, st.config.category, tier)),
        customWords: st.config.customWords.filter((w) => isWordAllowed(w, tier) || normalizeKey(w).trim() === normalizeKey(st.config.childName ?? '').trim()),
      },
    }));
  if (tier !== 'free') return null;
  const name = normalizeKey(config.childName ?? '').trim();
  const items = config.selectedItems.filter((i) => !isItemAllowed(i, config.category, tier));
  const words = config.category === 'letters' ? config.customWords.filter((w) => !isWordAllowed(w, tier) && normalizeKey(w).trim() !== name) : [];
  if (!items.length && !words.length) return null;
  const label = (i: string) => (isPatternId(i) ? PATTERN_LABELS.ro[i] : isActivityItem(i) ? activityLabel(i) : i);
  const list = [...items.map(label), ...words].slice(0, 6).join(', ');
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      <p className="flex items-center gap-2 font-extrabold"><Lock className="w-4 h-4" aria-hidden /> Nu apar pe fișă: {list}</p>
      <p className="mt-1">Fac parte din varianta completă. Gratuit poți folosi literele A–E, cifrele 0–5 și numele copilului.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/preturi" className="inline-flex items-center h-10 px-4 rounded-xl bg-ink text-white font-bold">Vezi varianta completă</Link>
        <button type="button" onClick={removeLocked} className="h-10 px-4 rounded-xl border-2 border-amber-400 bg-white font-bold">Scoate-le de pe fișă</button>
      </div>
    </div>
  );
}
