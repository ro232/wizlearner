'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronDown, Lock, Plus } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { MAX_WORDS, cleanWord } from '@/stores/sanitize-config';
import { normalizeKey } from '@/lib/glyphs/data';
import { isWordAllowed } from '@/lib/worksheet/layout';
import type { WordList } from '@/lib/curriculum/data/cuvinte';
import { countOf } from './plural';

const cuvinte = (n: number) => countOf(n, 'cuvânt', 'cuvinte');

type Lists = { letters: readonly WordList[]; themes: readonly WordList[] };
// the lists are loaded once, when first opened (they are not needed to draw a sheet)
let loaded: Promise<Lists> | null = null;
const loadLists = () =>
  (loaded ??= import('@/lib/curriculum/data/cuvinte').then((m) => ({ letters: m.LETTER_LISTS, themes: m.THEME_LISTS })));

/**
 * The two options of the words to trace, under the words: an empty row after each word, and short
 * words repeated across their row. Shown when the sheet has words.
 */
export function WordOptions() {
  const config = useWorksheetStore((s) => s.config);
  const toggleCopy = useWorksheetStore((s) => s.toggleWordCopyRow);
  const toggleFill = useWorksheetStore((s) => s.toggleWordFillRow);
  if (config.category !== 'letters' || config.customWords.length === 0) return null;
  const options: [string, string, boolean, () => void, string][] = [
    ['Rând liber după cuvânt', 'copilul scrie cuvântul singur, pe rândul de sub el', !!config.wordCopyRow, toggleCopy, 'copy'],
    ['Umple rândul', 'un cuvânt scurt se repetă pe tot rândul', !!config.wordFillRow, toggleFill, 'fill'],
  ];
  return (
    <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2" data-word-options>
      {options.map(([label, sub, checked, onChange, id]) => (
        <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
          <input type="checkbox" checked={checked} onChange={onChange} data-word-option={id} className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300" />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold text-slate-800">{label}</span>
            <span className="block text-[11px] text-slate-500">{sub}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * „Liste de cuvinte”: ready-made words for „Cuvinte de trasat”, by letter or by theme, added all at
 * once or one by one (a word on the sheet is taken off with a second tap). At most MAX_WORDS words.
 */
export function WordLists({ onShowPaywall }: { onShowPaywall: () => void }) {
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const addCustomWords = useWorksheetStore((s) => s.addCustomWords);
  const removeCustomWord = useWorksheetStore((s) => s.removeCustomWord);
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<Lists | null>(null);
  const [kind, setKind] = useState<'letters' | 'themes'>('letters');
  const [picked, setPicked] = useState<string>('');

  useEffect(() => {
    if (!open || lists) return;
    let live = true;
    void loadLists().then((l) => live && setLists(l));
    return () => {
      live = false;
    };
  }, [open, lists]);

  // the letters chosen on the sheet come first (A for „A”, „a” and „Aa”), in the order of the alphabet
  const sheetLetters = config.category === 'letters' && lists
    ? lists.letters.map((l) => l.id).filter((id) => config.selectedItems.some((i) => normalizeKey(i).charAt(0).toUpperCase() === id))
    : [];
  const firstSheetLetter = sheetLetters[0] ?? '';
  useEffect(() => {
    if (open && !picked && kind === 'letters' && firstSheetLetter) setPicked(firstSheetLetter);
  }, [open, picked, kind, firstSheetLetter]);

  const on = new Set(config.category === 'letters' ? config.customWords.map(cleanWord) : []);
  const count = config.category === 'letters' ? config.customWords.length : 0;
  const room = Math.max(0, MAX_WORDS - count);
  const list = lists ? (kind === 'letters' ? lists.letters : lists.themes).find((l) => l.id === picked) : undefined;
  const missing = list ? list.words.filter((w) => !on.has(w)) : [];
  const usable = missing.filter((w) => isWordAllowed(w, tier));

  const addAll = () => {
    if (!usable.length) {
      if (missing.length) onShowPaywall();
      return;
    }
    addCustomWords(usable);
  };
  const toggle = (w: string) => {
    if (on.has(w)) {
      const kept = config.customWords.find((c) => cleanWord(c) === w);
      if (kept) removeCustomWord(kept);
      return;
    }
    if (!isWordAllowed(w, tier)) return onShowPaywall();
    if (room > 0) addCustomWords([w]);
  };
  const chooseKind = (k: 'letters' | 'themes') => {
    setKind(k);
    setPicked(k === 'letters' ? firstSheetLetter : '');
  };
  const tab = (active: boolean) =>
    `min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold ${active ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`;

  return (
    <div className="mt-2" data-word-lists>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="word-lists-panel"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-bold text-blue-700 hover:text-blue-900">
        <BookOpen className="h-4 w-4" aria-hidden /> Liste de cuvinte
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id="word-lists-panel" className="mt-1 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex gap-2" role="group" aria-label="Fel de listă">
            <button type="button" className={tab(kind === 'letters')} aria-pressed={kind === 'letters'} onClick={() => chooseKind('letters')}>Pe litere</button>
            <button type="button" className={tab(kind === 'themes')} aria-pressed={kind === 'themes'} onClick={() => chooseKind('themes')}>Pe teme</button>
          </div>
          {!lists ? (
            <p className="text-xs text-slate-500" aria-live="polite">Se încarcă listele…</p>
          ) : (
            <>
              {kind === 'letters' && sheetLetters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-600">Literele de pe fișă:</span>
                  {sheetLetters.map((id) => (
                    <button key={id} type="button" onClick={() => setPicked(id)} aria-pressed={picked === id}
                      className={`h-11 min-w-11 rounded-lg border px-2 text-base font-bold ${picked === id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-800'}`}>
                      {id}
                    </button>
                  ))}
                </div>
              )}
              <label htmlFor="word-list-pick" className="sr-only">{kind === 'letters' ? 'Alege litera' : 'Alege tema'}</label>
              <select id="word-list-pick" value={picked} onChange={(e) => setPicked(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{kind === 'letters' ? 'Alege litera…' : 'Alege tema…'}</option>
                {(kind === 'letters' ? lists.letters : lists.themes).map((l) => (
                  <option key={l.id} value={l.id}>{l.title}{l.inside ? ' (în cuvânt)' : ''} · {cuvinte(l.words.length)}</option>
                ))}
              </select>
              {list && (
                <div data-word-list={list.id}>
                  {list.inside && <p className="mb-1.5 text-[11px] text-slate-500">Puține cuvinte încep cu {list.id}: aici litera e în cuvânt.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {list.words.map((w) => {
                      const has = on.has(w);
                      // on the free plan a word with a letter of the full version opens the plans window
                      const locked = !has && !isWordAllowed(w, tier);
                      return (
                        <button key={w} type="button" onClick={() => toggle(w)} aria-pressed={has} disabled={!has && room === 0}
                          aria-label={has ? `Scoate ${w} de pe fișă` : locked ? `Adaugă ${w} (varianta completă)` : `Adaugă ${w}`}
                          {...(locked ? { 'data-locked': '' } : {})}
                          className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm font-semibold disabled:opacity-40 ${has ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400'}`}>
                          {has ? <Check className="h-3.5 w-3.5" aria-hidden /> : locked ? <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                          {w}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button type="button" onClick={addAll} disabled={!missing.length || room === 0} data-word-list-add
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                      <Plus className="h-4 w-4" aria-hidden />
                      {!missing.length ? 'Toate sunt pe fișă' : usable.length ? `Adaugă toate (${Math.min(usable.length, room)})` : 'Adaugă toate'}
                    </button>
                    <span className="text-[11px] text-slate-600" aria-live="polite" data-word-limit>
                      {room === 0
                        ? `Fișa are deja ${cuvinte(MAX_WORDS)}, cât încap. Scoate câteva ca să adaugi altele.`
                        : usable.length < missing.length
                          ? 'Gratuit: doar cuvintele din literele A–E; celelalte, în varianta completă.'
                          : missing.length > room
                          ? `Mai încap doar ${cuvinte(room)}: se adaugă primele.`
                          : `${cuvinte(count)} pe fișă din ${MAX_WORDS}.`}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
