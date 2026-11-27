'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Check, Lock, Search, X } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASSES, KINDS, SUBJECTS, entryHref, filtersFromQuery, filtersToQuery, openLevel, prepare, resultBand, search, type CatalogEntry, type Filters } from '@/lib/catalog/search';
import { fise } from '@/components/worksheet/plural';
import { OPEN_ACCESS } from '@/lib/open-access';

/** The sheet builder is heavy: it is fetched only when a result is on screen (sheet-thumb.tsx). */
const SheetThumb = dynamic(() => import('./sheet-thumb'), { ssr: false });

const PAGE = 24;
const THUMB = 92;
const EMPTY: Filters = { q: '' };
const SUGGESTIONS = ['adunări', 'silabe', 'citire', 'tabla înmulțirii', 'ceasul', 'anotimpuri', 'labirint', 'ortograme'];

const SHORT: Record<SchoolLevel, string> = { presc: 'grădiniță', CP: 'pregătitoare', I: 'I', II: 'a II-a', III: 'a III-a', IV: 'a IV-a' };

/** „Grădiniță, clasa pregătitoare, I și a II-a”: the classes of a sheet, in one line. */
function classLine(levels: SchoolLevel[]): string {
  const school = levels.filter((l) => l !== 'presc');
  const order = CLASSES.map((c) => c.id);
  const inRow = school.length >= 3 && order.indexOf(school[school.length - 1]) - order.indexOf(school[0]) === school.length - 1;
  const classes = inRow ? `clasele ${SHORT[school[0]]} – ${SHORT[school[school.length - 1]]}` : school.length ? `clasa ${school.map((l) => SHORT[l]).join(', ')}` : '';
  return [...(levels.includes('presc') ? ['grădiniță'] : []), ...(classes ? [classes] : [])].join(' · ');
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-bold whitespace-nowrap transition-colors ${active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink hover:border-brand'}`}
    >
      {active && <Check className="w-3.5 h-3.5" aria-hidden />}
      {children}
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="sm:w-20 sm:pt-2.5 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>
      {/* phones: one line that scrolls sideways inside itself, so the results stay close to the box */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">{children}</div>
    </div>
  );
}

/** The small page on a card: drawn when the card comes near the screen, a blank sheet until then. */
function Thumb({ entry, level }: { entry: CatalogEntry; level: SchoolLevel }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') return setNear(true);
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '300px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return (
    <div ref={box} data-thumb className="relative shrink-0 overflow-hidden rounded-[3px] border border-line bg-white shadow-sm" style={{ width: THUMB, height: Math.round(THUMB * 1.4142) }} aria-hidden>
      {near && <SheetThumb entry={entry} level={level} width={THUMB} />}
    </div>
  );
}

function Card({ entry, level }: { entry: CatalogEntry; level?: SchoolLevel }) {
  const at = openLevel(entry, level);
  const codes = entry.codes[at];
  return (
    <li>
      <Link
        href={entryHref(entry, level)}
        data-result={entry.id}
        onClick={() => track('search_open', { kind: entry.kind, level: at.toLowerCase(), subject: entry.subject, free: entry.free })}
        className="group flex h-full gap-3.5 rounded-2xl border border-line bg-white p-3.5 transition-transform hover:-translate-y-0.5"
      >
        <Thumb entry={entry} level={at} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[17px] font-bold leading-snug text-ink group-hover:underline decoration-brand/40 underline-offset-2">{entry.title}</span>
          <span className="mt-0.5 text-[13px] leading-snug text-slate-600">{entry.family}</span>
          {entry.text && <span className="mt-1.5 text-sm leading-snug text-slate-700 line-clamp-2">{entry.text}</span>}
          <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5 text-xs font-bold">
            <span className="rounded-md bg-paper px-2 py-1 text-ink border border-line">{classLine(entry.levels)}</span>
            {codes && (
              <span className="rounded-md bg-rule px-2 py-1 text-ink" title={`${at === 'presc' ? 'Comportamente vizate' : 'Competențe specifice'}, ${CLASSES.find((c) => c.id === at)?.label.toLowerCase()}`}>
                {at === 'presc' ? '' : 'cod '}{codes.join(', ')}
              </span>
            )}
            {entry.kind === 'evaluare' && <span className="rounded-md bg-brand px-2 py-1 text-white">Evaluare</span>}
            {OPEN_ACCESS ? null : entry.free ? (
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-900">Gratuit</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-amber-900"><Lock className="w-3 h-3" aria-hidden /> Varianta completă</span>
            )}
            {entry.answers && <span className="rounded-md border border-line px-2 py-1 text-slate-700">Cu răspunsuri</span>}
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-ink">
            Deschide în generator <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </span>
      </Link>
    </li>
  );
}

export function CatalogSearch({ entries }: { entries: CatalogEntry[] }) {
  const prepared = useMemo(() => prepare(entries), [entries]);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [shown, setShown] = useState(PAGE);
  // the address is read after the page has loaded (the page itself is static): `ready` says it was
  const [ready, setReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => setFilters(filtersFromQuery(new URLSearchParams(window.location.search)));
    read();
    setReady(true);
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const results = useMemo(() => search(prepared, filters), [prepared, filters]);
  const active = !!(filters.q.trim() || filters.level || filters.subject || filters.kind || filters.free || filters.answers);

  const change = (next: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setShown(PAGE);
  };
  const toggle = <K extends keyof Filters>(key: K, value: Filters[K]) => change({ [key]: filters[key] === value ? undefined : value } as Partial<Filters>);

  // The search lives in the address, so it can be sent to a colleague: ?q=silabe&clasa=I.
  // A little after the last keystroke, not on each one (browsers limit how often the address may change).
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const query = filtersToQuery(filters);
      const url = query ? `/cauta?${query}` : '/cauta';
      if (url !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, '', url);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters, ready]);

  // Analytics: how much was found and which filters were on. Never the words typed.
  const count = results.length;
  useEffect(() => {
    if (!ready || !active) return;
    const timer = window.setTimeout(() => {
      track('search', {
        results: resultBand(count),
        typed: !!filters.q.trim(),
        ...(filters.level ? { level: filters.level.toLowerCase() } : {}),
        ...(filters.subject ? { subject: filters.subject } : {}),
        ...(filters.kind ? { kind: filters.kind } : {}),
        ...(filters.free ? { free: true } : {}),
        ...(filters.answers ? { answers: true } : {}),
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [filters, count, ready, active]);

  const reset = () => {
    setFilters(EMPTY);
    setShown(PAGE);
    input.current?.focus();
  };

  return (
    <div data-search-ready={ready || undefined}>
      <form role="search" aria-label="Caută fișe" onSubmit={(e) => { e.preventDefault(); input.current?.blur(); }} className="relative max-w-2xl">
        <label htmlFor="cauta-q" className="sr-only">Ce fișă cauți?</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden />
        <input
          ref={input}
          id="cauta-q"
          type="search"
          name="q"
          value={filters.q}
          onChange={(e) => change({ q: e.target.value.slice(0, 80) })}
          placeholder="adunări, silabe, toamnă, 1.4…"
          autoComplete="off"
          enterKeyHint="search"
          aria-controls="cauta-rezultate"
          className="h-14 w-full rounded-xl border border-line-strong bg-white pl-12 pr-12 text-lg font-semibold text-ink placeholder:font-normal placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.q && (
          <button type="button" onClick={() => { change({ q: '' }); input.current?.focus(); }} aria-label="Șterge textul" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-ink hover:bg-paper">
            <X className="w-5 h-5" aria-hidden />
          </button>
        )}
      </form>

      <div className="mt-6 space-y-3">
        <ChipRow label="Clasa">
          {CLASSES.map((c) => <Chip key={c.id} active={filters.level === c.id} onClick={() => toggle('level', c.id)}>{c.short}</Chip>)}
        </ChipRow>
        <ChipRow label="Materia">
          {SUBJECTS.map((s) => <Chip key={s.id} active={filters.subject === s.id} onClick={() => toggle('subject', s.id)}>{s.label}</Chip>)}
        </ChipRow>
        <ChipRow label="Arată">
          {KINDS.map((k) => <Chip key={k.id} active={filters.kind === k.id} onClick={() => toggle('kind', k.id)}>{k.id === 'fisa' ? 'Fișe' : 'Evaluări'}</Chip>)}
          {!OPEN_ACCESS && <Chip active={!!filters.free} onClick={() => toggle('free', true)}>Doar gratuite</Chip>}
          <Chip active={!!filters.answers} onClick={() => toggle('answers', true)}>Cu răspunsuri</Chip>
        </ChipRow>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2">
        <p role="status" aria-live="polite" className="text-lg font-bold text-ink" data-count={count}>
          {count === 0 ? 'Nicio fișă găsită' : active ? `${fise(count)} ${count === 1 ? 'găsită' : 'găsite'}` : `Toate cele ${fise(count)}`}
        </p>
        {active && (
          <button type="button" onClick={reset} className="min-h-10 text-sm font-bold text-brand underline decoration-brand/30 underline-offset-4 hover:text-brand">
            Șterge căutarea și filtrele
          </button>
        )}
      </div>

      <div id="cauta-rezultate">
        {count === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-6 sm:p-8">
            <p className="text-lg font-bold text-ink">Nu am găsit nimic pentru căutarea ta.</p>
            <ul className="mt-2 list-disc pl-5 text-slate-700 space-y-1">
              <li>Încearcă un cuvânt mai scurt sau mai general („adunări” în loc de „adunări cu trecere peste ordin”).</li>
              {(filters.level || filters.subject || filters.kind || filters.free || filters.answers) && <li>Scoate un filtru: poate fișa există la altă clasă sau în varianta completă.</li>}
              <li>Diacriticele nu contează: „scadere” găsește „Scăderi”.</li>
            </ul>
            <p className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-600">Căutări des folosite</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => <Chip key={s} active={false} onClick={() => { setFilters({ q: s }); setShown(PAGE); }}>{s}</Chip>)}
            </div>
            <p className="mt-5 text-slate-700">
              Sau pornește de la programă: <Link href="/programa" className="font-bold text-brand underline decoration-brand/30 underline-offset-2">fișe pe competențe</Link>,{' '}
              <Link href="/fise-de-lucru" className="font-bold text-brand underline decoration-brand/30 underline-offset-2">fișe de lucru pe clase</Link>.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.slice(0, shown).map((e) => <Card key={e.id} entry={e} level={filters.level} />)}
            </ul>
            {count > shown && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <button type="button" onClick={() => setShown((n) => n + PAGE)} className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-line-strong bg-white font-semibold text-ink hover:bg-paper">
                  Arată încă {Math.min(PAGE, count - shown)}
                </button>
                <p className="text-sm text-slate-600">{shown} din {count}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
