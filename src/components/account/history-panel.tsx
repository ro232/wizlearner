'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { PROJECT_LABELS, type ProjectKind } from '@/lib/projects';
import { useOpenProject } from './projects-panel';

interface HistoryRow {
  id: number;
  kind: ProjectKind;
  title: string;
  configuration: unknown;
  pages: number | null;
  created_at: string;
}

const when = (iso: string) => new Date(iso).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** What was downloaded lately, to make it again with one click. */
export function HistoryPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const open = useOpenProject();

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) return setRows([]);
    const { data } = await createClient().from('download_history').select('id, kind, title, configuration, pages, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    setRows((data as HistoryRow[] | null) ?? []);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const clear = async () => {
    await createClient().from('download_history').delete().eq('user_id', userId);
    setRows([]);
  };

  if (rows === null) return <p className="text-slate-500 text-sm">Se încarcă…</p>;
  if (!rows.length) return <p className="text-slate-600">Ce descarci de acum apare aici, ca să refaci o fișă dintr-un click.</p>;
  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-medium text-slate-800 truncate">{r.title}</span>
              <span className="text-xs text-slate-500">{PROJECT_LABELS[r.kind]} · {when(r.created_at)}{r.pages ? ` · ${r.pages} ${r.pages === 1 ? 'pagină' : 'pagini'}` : ''}</span>
            </span>
            <button type="button" onClick={() => open(r.kind, r.configuration)} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border-2 border-ink text-sm font-bold text-ink hover:bg-paper">
              <RotateCcw className="w-4 h-4" aria-hidden /> Refă
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={clear} className="mt-3 text-sm text-slate-500 underline hover:text-red-600">Șterge istoricul</button>
    </div>
  );
}
