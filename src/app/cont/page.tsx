'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, KeyRound, FileText, Trash2, LogOut, CreditCard } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useWorksheets } from '@/hooks/use-worksheets';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { DEFAULT_CONFIG } from '@/types';

const TIER = { free: 'Gratuit', starter: 'Starter', full: 'Complet' } as const;
const STATUS: Record<string, string> = {
  active: 'activ', trialing: 'în perioada de probă', past_due: 'plata a eșuat, Stripe reîncearcă', canceled: 'anulat',
  unpaid: 'neplătit', incomplete: 'neterminat', incomplete_expired: 'expirat',
};

export default function AccountPage() {
  const { user, profile, loading, signOut, redeemAccessCode } = useAuth();
  const { worksheets, fetchWorksheets, deleteWorksheet } = useWorksheets(user?.id);
  const router = useRouter();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [paidNotice, setPaidNotice] = useState(false);

  useEffect(() => {
    if (user) fetchWorksheets();
  }, [user, fetchWorksheets]);

  useEffect(() => {
    setPaidNotice(new URLSearchParams(window.location.search).get('plata') === 'ok');
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-50"><Navbar /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Contul tău</h1>
          <p className="mt-2 text-slate-600">Intră în cont ca să vezi abonamentul și fișele salvate.</p>
          <Link href="/auth/login?next=/cont" className="inline-block mt-6"><Button className="h-12 px-6 rounded-xl">Intră în cont</Button></Link>
        </main>
      </div>
    );
  }

  const tier = profile?.tier ?? 'free';
  const status = profile?.subscription_status ?? null;
  const periodEnd = profile?.subscription_period_end ? new Date(profile.subscription_period_end).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else setMsg({ ok: false, text: data.error ?? 'Nu am putut deschide pagina de abonament.' });
    } finally {
      setPortalBusy(false);
    }
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await redeemAccessCode(code);
    setMsg(res.success ? { ok: true, text: 'Codul a fost activat.' } : { ok: false, text: res.error ?? 'Codul nu a putut fi activat.' });
    if (res.success) setCode('');
  };

  const openSheet = (configuration: typeof DEFAULT_CONFIG) => {
    useWorksheetStore.setState({ config: { ...DEFAULT_CONFIG, ...configuration } });
    router.push('/generator');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Contul tău</h1>
            <p className="text-slate-600">{user.email}</p>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-1.5"><LogOut className="w-4 h-4" aria-hidden /> Ieși</Button>
        </div>

        {paidNotice && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-green-800">
            Mulțumim! Plata a fost primită. Dacă varianta completă nu apare încă, reîncarcă pagina peste câteva secunde.
          </div>
        )}

        <section className="rounded-2xl bg-white shadow p-6 space-y-4">
          <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-orange-500" aria-hidden /><h2 className="text-lg font-bold text-slate-900">Varianta ta: {TIER[tier]}</h2></div>
          {status ? (
            <p className="text-slate-700">
              Abonament {STATUS[status] ?? status}
              {periodEnd && (status === 'canceled' ? `, acces până la ${periodEnd}` : `, se reînnoiește pe ${periodEnd}`)}.
            </p>
          ) : (
            tier === 'free' && <p className="text-slate-600">Ai varianta gratuită. <Link href="/preturi" className="font-semibold text-blue-700 underline">Vezi varianta completă</Link></p>
          )}
          {profile?.stripe_customer_id && (
            <Button variant="outline" onClick={openPortal} disabled={portalBusy} className="gap-1.5">
              <CreditCard className="w-4 h-4" aria-hidden /> {portalBusy ? 'Se deschide…' : 'Card, facturi sau anulare'}
            </Button>
          )}
          <form onSubmit={redeem} className="pt-4 border-t border-slate-100">
            <label htmlFor="code" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Cod de acces</label>
            <div className="flex gap-2">
              <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WIZ-XXXX-XXXX" autoComplete="off"
                className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 font-mono uppercase text-sm" />
              <Button type="submit" disabled={!code.trim()} className="h-11 gap-1.5"><KeyRound className="w-4 h-4" aria-hidden /> Activează</Button>
            </div>
            {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
          </form>
        </section>

        <section className="rounded-2xl bg-white shadow p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Fișele salvate</h2>
          {worksheets.length === 0 ? (
            <p className="text-slate-600">Nu ai salvat încă nicio fișă. În generator, butonul „Salvează” o păstrează aici.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {worksheets.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                  <button type="button" onClick={() => openSheet(w.configuration)} className="flex items-center gap-2 text-left text-slate-800 hover:text-blue-700">
                    <FileText className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="font-medium">{w.name}</span>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => deleteWorksheet(w.id)} aria-label={`Șterge ${w.name}`}><Trash2 className="w-4 h-4 text-slate-400" /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
