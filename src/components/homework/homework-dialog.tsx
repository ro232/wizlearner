'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, Copy, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { track } from '@/lib/analytics';
import { SCHOOL_LEVELS, type SchoolLevel } from '@/lib/curriculum/sheet';
import {
  DEFAULT_HOMEWORK_DAYS,
  HOMEWORK_DAYS,
  HOMEWORK_TITLE_MAX,
  QR_MAX_URL,
  homeworkShareText,
  evaluationHomeworkConfig,
  sanitizeHomeworkTitle,
  whatsappLink,
  type HomeworkDays,
} from '@/lib/homework/shared';
import { QrCode } from './qr-code';

/** What the page sends to /api/tema: the sheet without any child's name (the page makes sure of it). */
export type HomeworkRequest =
  | { kind: 'sheet'; config: unknown; nameAt?: number }
  | { kind: 'group'; group: unknown };

interface HomeworkButtonProps {
  /** Builds the request when the teacher presses the button (so it is always the sheet on screen). */
  build: () => HomeworkRequest;
  /** the class preselected in the dialog */
  level?: SchoolLevel;
  /** the sheet's category, for analytics */
  category: string;
  disabled?: boolean;
  onShowPaywall: () => void;
  className?: string;
  label?: string;
}

/**
 * „Trimite ca temă”: on a paid plan it opens the dialog that makes the parents' link; on the free
 * plan it opens the plans window. The plan is checked again on the server, which alone can sign a link.
 */
export function HomeworkButton({ build, level, category, disabled, onShowPaywall, className, label = 'Trimite ca temă' }: HomeworkButtonProps) {
  const tier = useWorksheetStore((s) => s.tier);
  const [request, setRequest] = useState<HomeworkRequest | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (tier === 'free' ? onShowPaywall() : setRequest(build()))}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper disabled:opacity-50 ${className ?? ''}`}
      >
        <Send className="w-4 h-4" aria-hidden /> {label}
      </button>
      {/* on <body>: the buttons sit in sticky columns and bars that would trap a fixed dialog under other content */}
      {request && createPortal(<HomeworkDialog request={request} level={level} category={category} onClose={() => setRequest(null)} onShowPaywall={onShowPaywall} />, document.body)}
    </>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DATE = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' });
const DAYS_LABEL: Record<HomeworkDays, string> = { 7: 'o săptămână', 30: '30 de zile', 90: '3 luni' };

type Result = { url: string; expiresAt: number };

function HomeworkDialog({ request, level: initialLevel, category, onClose, onShowPaywall }: { request: HomeworkRequest; level?: SchoolLevel; category: string; onClose: () => void; onShowPaywall: () => void }) {
  const tier = useWorksheetStore((s) => s.tier);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<HomeworkDays>(DEFAULT_HOMEWORK_DAYS);
  const [level, setLevel] = useState<SchoolLevel | ''>(initialLevel ?? '');
  // an evaluation: the answers page (with the calificative) is the teacher's, so the parents get it only when asked for
  const isEvaluation = request.kind === 'sheet' && !!request.config && typeof request.config === 'object' && (request.config as { evaluation?: unknown }).evaluation === true;
  const [withAnswers, setWithAnswers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ text: string; signIn?: boolean } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<'link' | 'text' | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // A real dialog, like the plans window: Escape closes, Tab stays inside, the page does not scroll, focus returns.
  useEffect(() => {
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
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const sent = isEvaluation && request.kind === 'sheet' ? { ...request, config: evaluationHomeworkConfig(request.config, withAnswers) } : request;
    try {
      const res = await fetch('/api/tema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sent, title: sanitizeHomeworkTitle(title), days, ...(level ? { level } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; expiresAt?: number; error?: string };
      if (res.ok && data.token && data.expiresAt) {
        const url = `${window.location.origin}/tema/${data.token}`;
        setResult({ url, expiresAt: data.expiresAt });
        track('homework_link_created', { kind: request.kind, category, days, level: level ? level.toLowerCase() : 'none', tier, format: url.length <= QR_MAX_URL ? 'qr' : 'link' });
        return;
      }
      if (res.status === 403) {
        onClose();
        onShowPaywall();
        return;
      }
      if (res.status === 503) setProblem({ text: 'Temele nu sunt încă active. Revino în curând.' });
      else if (res.status === 401) setProblem({ text: 'Intră în cont ca să trimiți teme.', signIn: true });
      else setProblem({ text: data.error || 'Nu am putut face linkul. Încearcă din nou.' });
    } catch {
      setProblem({ text: 'Nu am putut face linkul. Verifică conexiunea și încearcă din nou.' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (what: 'link' | 'text', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // older browsers and some in-app browsers: select the link so it can be copied by hand
      const input = panelRef.current?.querySelector<HTMLInputElement>('#homework-url');
      input?.select();
      if (!document.execCommand?.('copy')) return;
    }
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000);
  };

  const shareText = result ? homeworkShareText(result.url, sanitizeHomeworkTitle(title)) : '';
  const field = 'mt-1.5 w-full h-12 px-3 rounded-xl border-2 border-slate-300 bg-white text-base text-ink focus:outline-none focus:border-ink';
  const chip = (active: boolean) => `h-11 px-3 rounded-lg border-2 text-sm font-bold ${active ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white text-ink hover:border-ink'}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="homework-title"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain p-5 sm:p-7 motion-safe:animate-scale-in focus:outline-none"
      >
        <button type="button" onClick={onClose} aria-label="Închide" className="absolute top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center text-slate-600 hover:text-ink hover:bg-slate-100">
          <X className="w-5 h-5" aria-hidden />
        </button>
        <h2 id="homework-title" className="text-xl font-extrabold text-ink pr-10">{result ? 'Linkul pentru părinți e gata' : 'Trimite fișa ca temă'}</h2>

        {!result ? (
          <form onSubmit={create} className="mt-2 space-y-4">
            <p className="text-sm text-slate-600">
              Părinții deschid linkul pe telefon, scriu numele copilului dacă vor și descarcă fișa. Gratuit pentru ei, fără cont. Numele copiilor nu ajung la noi.
            </p>
            <div>
              <label htmlFor="homework-name" className="block text-sm font-extrabold text-ink">Titlu (opțional)</label>
              <input id="homework-name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={HOMEWORK_TITLE_MAX} placeholder="ex. Tema de weekend: litera M" autoComplete="off" className={field} />
              <p className="mt-1 text-xs text-slate-500">Fără numele copiilor și fără linkuri.</p>
            </div>
            <div>
              <label htmlFor="homework-level" className="block text-sm font-extrabold text-ink">Clasa</label>
              <select id="homework-level" value={level} onChange={(e) => setLevel(e.target.value as SchoolLevel | '')} className={field}>
                <option value="">Nu o afișa</option>
                {SCHOOL_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <fieldset>
              <legend className="block text-sm font-extrabold text-ink">Linkul funcționează</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {HOMEWORK_DAYS.map((d) => (
                  <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={chip(days === d)}>{DAYS_LABEL[d]}</button>
                ))}
              </div>
            </fieldset>
            {isEvaluation && (
              <label className="flex items-start gap-3 cursor-pointer" data-homework-answers>
                <input type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-blue-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-ink">Trimite și pagina de răspunsuri</span>
                  <span className="block text-xs text-slate-600">Evaluarea ajunge la părinți fără răspunsuri și calificative. Bifează dacă vrei să le primească și ei.</span>
                </span>
              </label>
            )}
            {problem && (
              <p role="alert" className="text-sm font-semibold text-pen">
                {problem.text}{' '}
                {problem.signIn && <Link href={`/auth/login?next=${encodeURIComponent(window.location.pathname)}`} className="underline">Intră în cont</Link>}
              </p>
            )}
            <button type="submit" disabled={busy} data-btn="primary" className="w-full h-12 rounded-xl text-base inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Send className="w-5 h-5" aria-hidden />}
              {busy ? 'Se face linkul…' : 'Fă linkul'}
            </button>
          </form>
        ) : (
          <div className="mt-3 space-y-4">
            <div>
              <label htmlFor="homework-url" className="sr-only">Linkul temei</label>
              <div className="flex gap-2">
                <input id="homework-url" readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 h-12 px-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-sm text-ink font-mono" />
                <button type="button" onClick={() => copy('link', result.url)} data-btn="ink" className="h-12 px-3 rounded-xl text-white text-sm font-bold inline-flex items-center gap-1.5 shrink-0">
                  {copied === 'link' ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
                  {copied === 'link' ? 'Copiat' : 'Copiază'}
                </button>
              </div>
            </div>
            {result.url.length <= QR_MAX_URL ? (
              <div className="text-center">
                <QrCode text={result.url} size={208} label="Codul QR al temei" />
                <p className="mt-1.5 text-xs text-slate-600">Codul QR se poate proiecta în clasă sau lipi pe caiet.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">Fișa are multe setări, așa că linkul e prea lung pentru un cod QR. Trimiteți-l ca link.</p>
            )}
            <a href={whatsappLink(shareText)} target="_blank" rel="noopener noreferrer" className="w-full h-12 rounded-xl inline-flex items-center justify-center gap-2 font-extrabold text-white bg-[#128C4B] hover:bg-[#0F7A41]">
              <MessageCircle className="w-5 h-5" aria-hidden /> Trimite pe WhatsApp
            </a>
            <button type="button" onClick={() => copy('text', shareText)} className="w-full h-11 rounded-xl border-2 border-ink bg-white font-extrabold text-ink text-sm inline-flex items-center justify-center gap-2 hover:bg-paper">
              {copied === 'text' ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
              {copied === 'text' ? 'Mesajul e copiat' : 'Copiază mesajul pentru părinți'}
            </button>
            <p className="text-xs text-slate-600">
              Linkul funcționează până pe <strong>{DATE.format(new Date(result.expiresAt))}</strong>. Oricine are linkul poate descărca fișa; numele copilului îl scrie fiecare părinte, pe telefonul lui.
            </p>
            <button type="button" onClick={() => setResult(null)} className="w-full py-2 text-sm font-bold text-slate-600 hover:text-ink underline underline-offset-2">Fă alt link</button>
          </div>
        )}
      </div>
    </div>
  );
}
