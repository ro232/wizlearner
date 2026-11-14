'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWorksheets } from '@/hooks/use-worksheets';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useToast } from '@/components/ui/toast';
import { stashProject, type ProjectKind } from '@/lib/projects';

/** Save what is on screen as a project in the account (full plan), to open and remake it later. */
export function SaveProjectButton({ kind, name, configuration, onPaywall, back, className = '' }: {
  kind: ProjectKind;
  name: string;
  configuration: unknown;
  onPaywall: () => void;
  /** Where to come back after signing in. */
  back: string;
  className?: string;
}) {
  const { user } = useAuth();
  const tier = useWorksheetStore((s) => s.tier);
  const { saveWorksheet } = useWorksheets(user?.id);
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user) {
      // Say why the sign-in page opens, and keep what is on screen for the way back
      // (in this tab only; the page picks it up again when it reopens).
      toast('Intră în cont ca să salvezi. Găsești totul aici când te întorci.');
      stashProject(kind, configuration);
      return router.push(`/auth/login?next=${encodeURIComponent(back)}&reason=save`);
    }
    if (tier === 'free') return onPaywall();
    setBusy(true);
    try {
      const res = await saveWorksheet(name.slice(0, 80), configuration, kind);
      if (res?.error) toast('Nu am putut salva. Încearcă din nou.', { error: true });
      else toast(`Salvat în cont: ${name}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={save} disabled={busy} title="Salvează în cont, ca să-l refaci oricând" aria-label="Salvează în cont"
      className={`inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-2xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper disabled:opacity-50 ${className}`}>
      <Save className="w-5 h-5" aria-hidden /> <span className="hidden sm:inline">Salvează</span>
    </button>
  );
}
