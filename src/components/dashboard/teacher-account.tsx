'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { useWorksheets } from '@/hooks/use-worksheets';
import { useOpenProject } from '@/components/account/projects-panel';
import { ChildrenPanel } from '@/components/account/children-panel';
import { PROJECT_LABELS } from '@/lib/projects';

/**
 * The parts of the teacher's dashboard that need the account, loaded only for a signed-in person:
 * the children saved in the account (the same panel as on /cont) and the last saved sheets.
 */
const day = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });

export function SavedChildren({ userId }: { userId: string }) {
  return <ChildrenPanel userId={userId} />;
}

export function RecentSheets({ userId }: { userId: string }) {
  const { worksheets, loading, fetchWorksheets } = useWorksheets(userId);
  const open = useOpenProject();
  useEffect(() => {
    void fetchWorksheets();
  }, [fetchWorksheets]);

  if (loading && !worksheets.length) return <p className="text-sm text-slate-600">Se încarcă…</p>;
  if (!worksheets.length) {
    return <p className="text-slate-700">Nimic salvat încă. Butonul „Salvează” din generator păstrează fișa aici, ca să o refaci oricând.</p>;
  }
  return (
    <div>
      <ul className="divide-y divide-line">
        {worksheets.slice(0, 5).map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block truncate font-bold text-ink">{w.name}</span>
              <span className="text-sm text-slate-600">{PROJECT_LABELS[w.kind ?? 'sheet']} · {day(w.updated_at)}</span>
            </span>
            <button type="button" onClick={() => open(w.kind ?? 'sheet', w.configuration)}
              className="shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg border border-line-strong bg-white text-sm font-semibold text-ink hover:bg-paper">
              <FolderOpen className="w-4 h-4" aria-hidden /> Deschide
            </button>
          </li>
        ))}
      </ul>
      <Link href="/cont" className="mt-3 inline-flex min-h-11 items-center font-bold text-brand underline decoration-brand/30 underline-offset-2">Toate fișele salvate</Link>
    </div>
  );
}
