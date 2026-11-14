'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Crown, KeyRound, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { track } from '@/lib/analytics';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shown when a locked item is picked. It only offers what actually works today:
 * entering an access code (checked on the server). Online payment comes later.
 *
 * A real dialog: it fits the screen and scrolls inside, Escape and a click outside close it,
 * Tab stays inside it, the page behind does not scroll, and focus returns where it was.
 */
export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const { user, redeemAccessCode } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (isOpen) track('paywall_shown');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active) || active === panel) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden data-paywall-backdrop />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain p-5 sm:p-7 motion-safe:animate-scale-in focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Închide"
          className="absolute top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center text-slate-600 hover:text-ink hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#FDF3D7' }}>
          <Crown className="w-7 h-7 text-pen" aria-hidden />
        </div>

        <h2 id="paywall-title" className="text-xl font-extrabold text-center text-slate-900 mb-2 px-6">Acest conținut este în varianta completă</h2>
        <p className="text-sm text-center text-slate-500 mb-5">Varianta gratuită include literele A–E, cifrele 0–5, trei forme, trei exerciții grafice și matematica până la 10.</p>

        <ul className="space-y-1.5 mb-6 text-sm text-slate-700">
          {['Fișe pentru toată grupa, până la 40 de copii', 'Tot alfabetul românesc și englez, mari și mici', 'Cifrele și numerele 0–20', 'Matematică până la 20 și 100', 'Toate formele și exercițiile grafice', 'Caietul KDP fără filigran'].map((f) => (
            <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden />{f}</li>
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
                className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 font-mono uppercase tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <Button type="submit" disabled={busy || !code.trim()} className="h-11 rounded-xl text-white" data-btn="ink">
                <KeyRound className="w-4 h-4 mr-1.5" aria-hidden /> {busy ? 'Verific…' : 'Activează'}
              </Button>
            </div>
            {message && <p role="status" className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
          </form>
        ) : (
          <Link href="/auth/login" data-btn="ink" className="flex items-center justify-center w-full min-h-12 py-2 px-3 rounded-xl text-white font-semibold text-center">
            <KeyRound className="w-4 h-4 mr-2 shrink-0" aria-hidden /> Intră în cont ca să folosești un cod
          </Link>
        )}

        <Link href="/preturi" className="block mt-4 py-2 text-center text-sm font-semibold text-orange-600 hover:underline">Vezi prețurile și abonează-te</Link>
      </div>
    </div>
  );
}
