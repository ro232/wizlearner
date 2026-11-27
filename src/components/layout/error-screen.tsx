'use client';

import { useEffect } from 'react';

/**
 * What this app keeps in the browser as settings: the last sheet (the persisted store in
 * src/stores/worksheet-store.ts) and a project handed from the account to a tool
 * (src/lib/projects.ts). The teacher's saved groups („wizlearner-groups”) are her data,
 * not settings, and are left alone.
 */
export const SAVED_SETTINGS_KEYS = { local: ['wizlearner-last-sheet'], session: ['ww-open-project'] } as const;

export function clearSavedSettings(): void {
  for (const k of SAVED_SETTINGS_KEYS.local) {
    try { window.localStorage.removeItem(k); } catch { /* storage blocked: nothing to clear */ }
  }
  for (const k of SAVED_SETTINGS_KEYS.session) {
    try { window.sessionStorage.removeItem(k); } catch { /* same */ }
  }
}

/** The message shown when a page fails. Plain styles too, so it also works when the app's CSS did not load. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-white min-h-screen flex items-center justify-center px-4 py-16" style={{ minHeight: '100vh', background: '#FFFFFF', color: '#14213D', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
      <div className="max-w-xl text-center" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <p className="text-sm font-semibold text-brand">Ceva nu a mers</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-bold leading-tight text-ink">Pagina s-a împiedicat</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Nu e vina ta. Încearcă din nou; dacă tot nu merge, resetează setările salvate în acest browser (ultima fișă la care ai lucrat).
          Grupele salvate și contul tău rămân neatinse.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => reset()} data-btn="primary" className="inline-flex items-center justify-center min-h-12 px-6 text-base" style={{ cursor: 'pointer' }}>
            Încearcă din nou
          </button>
          <button
            type="button"
            onClick={() => {
              clearSavedSettings();
              window.location.reload();
            }}
            className="inline-flex min-h-12 items-center justify-center px-6 rounded-xl border border-line-strong bg-white font-semibold text-ink hover:bg-paper"
            style={{ cursor: 'pointer' }}
          >
            Resetează setările salvate
          </button>
        </div>
        <p className="mt-6">
          {/* A full page load on purpose: the app's state may be what is broken. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="inline-flex min-h-11 items-center font-semibold text-brand hover:text-brand-hover hover:underline">Înapoi la prima pagină</a>
        </p>
        {error.digest && <p className="mt-6 text-xs text-slate-500">Cod eroare: {error.digest}</p>}
      </div>
    </main>
  );
}
