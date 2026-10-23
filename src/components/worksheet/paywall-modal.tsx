'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown, KeyRound, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Shown when a locked item is picked. It only offers what actually works today:
 * entering an access code (checked on the server). Online payment comes later.
 */
export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const { user, redeemAccessCode } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setMessage(null);
    const res = await redeemAccessCode(code);
    setBusy(false);
    setMessage(res.success ? { ok: true, text: 'Gata! Ai acces la tot conținutul.' } : { ok: false, text: res.error ?? 'A apărut o eroare.' });
    if (res.success) setCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-7 animate-scale-in">
        <button onClick={onClose} aria-label="Închide" className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-lg">×</button>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)' }}>
          <Crown className="w-7 h-7 text-orange-500" />
        </div>

        <h2 id="paywall-title" className="text-xl font-extrabold text-center text-slate-900 mb-2">Acest conținut este în versiunea completă</h2>
        <p className="text-sm text-center text-slate-500 mb-5">Versiunea gratuită include literele A–E, cifrele 0–5, trei forme și trei exerciții grafice.</p>

        <ul className="space-y-1.5 mb-6 text-sm text-slate-700">
          {['Fișe pentru toată grupa, până la 40 de copii', 'Tot alfabetul românesc și englez, mari și mici', 'Cifrele și numerele 0–20', 'Toate formele și exercițiile grafice', 'Caietul KDP fără filigran'].map((f) => (
            <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 flex-shrink-0" />{f}</li>
          ))}
        </ul>

        {user ? (
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="access-code" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Ai un cod de acces?</label>
            <div className="flex gap-2">
              <input
                id="access-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="WIZ-XXXX-XXXX-XXXX"
                autoComplete="off"
                className="flex-1 h-11 px-3 rounded-xl border border-slate-300 font-mono uppercase tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <Button type="submit" disabled={busy || !code.trim()} className="h-11 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}>
                <KeyRound className="w-4 h-4 mr-1.5" /> {busy ? 'Verific…' : 'Activează'}
              </Button>
            </div>
            {message && <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
          </form>
        ) : (
          <Link href="/auth/login" className="block">
            <Button className="w-full h-12 rounded-xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}>
              <KeyRound className="w-4 h-4 mr-2" /> Intră în cont ca să folosești un cod
            </Button>
          </Link>
        )}

        <Link href="/preturi" className="block mt-4 text-center text-sm font-semibold text-orange-600 hover:underline">Vezi prețurile și abonează-te</Link>
      </div>
    </div>
  );
}
