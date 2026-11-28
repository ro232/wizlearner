'use client';

import React, { useEffect, useState } from 'react';
import { Check, Lock, Plus } from 'lucide-react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useRoleStore } from '@/stores/role-store';
import type { WordList } from '@/lib/curriculum/data/cuvinte';
import { groupOf } from '@/lib/worksheet/letter-groups';
import {
  LESSON_COUNT_MAX, LESSON_COUNT_MIN, LESSON_MAX_WORDS, LESSON_SENTENCE_MAX, LESSON_SENTENCE_SMALL, cleanLessonWord, lessonLetter, type LessonSection,
} from '@/lib/worksheet/lesson';
import { lessonCase, lessonSyllables, lessonWords } from '@/lib/worksheet/lesson-text';
import { isCursive, isWordAllowed, lessonSentenceFit } from '@/lib/worksheet/layout';
import { Stepper } from './item-rows';
import { WordOptions } from './word-lists';
import { pagini } from './plural';

type LessonData = { letters: readonly WordList[]; groups: readonly WordList[]; sentences: Readonly<Record<string, readonly string[]>> };
// the word lists and the suggested sentences are loaded once, when a lesson is first opened
let loaded: Promise<LessonData> | null = null;
const loadLessonData = () =>
  (loaded ??= Promise.all([import('@/lib/curriculum/data/cuvinte'), import('@/lib/curriculum/data/propozitii')]).then(([w, p]) => ({
    letters: w.LETTER_LISTS,
    groups: w.GROUP_LISTS,
    sentences: p.LESSON_SENTENCES,
  })));

/** The key of the lists for an item: the group („che”) or the capital letter („M”). */
const listKey = (item: string) => groupOf(item) ?? lessonLetter(item) ?? '';

/**
 * „Lecția literei”, under the picker: the rows of each of the four parts (0 leaves a part out), the
 * sentence with suggestions to start from, and the words with the letter (from the ready-made lists).
 * The line „Ies N pagini” is the page count of the preview.
 */
export function LessonPanel({ pages, onShowPaywall }: { pages?: number; onShowPaywall: () => void }) {
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);
  const setCount = useWorksheetStore((s) => s.setLessonCount);
  const setSentence = useWorksheetStore((s) => s.setLessonSentence);
  const setWords = useWorksheetStore((s) => s.setLessonWords);
  const toggleWord = useWorksheetStore((s) => s.toggleLessonWord);
  const parent = useRoleStore((s) => s.role) === 'parinte';
  const [data, setData] = useState<LessonData | null>(null);
  const [own, setOwn] = useState('');
  const lesson = config.category === 'letters' ? config.lesson : undefined;
  const item = config.selectedItems[0];
  const key = item ? listKey(item) : '';
  const list = data && key ? (groupOf(item) ? data.groups : data.letters).find((l) => l.id === key) : undefined;
  const wordsUnset = !!lesson && !!item && lesson.words === undefined;

  useEffect(() => {
    if (!lesson || data) return;
    let live = true;
    void loadLessonData().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [lesson, data]);
  // a letter just chosen: its words, shortest first (the teacher can take some out or add others)
  useEffect(() => {
    if (wordsUnset && list) setWords(lessonWords(list.words));
  }, [wordsUnset, list, setWords]);

  if (!lesson) return null;
  const group = item ? groupOf(item) : null;
  const cursive = isCursive(config);
  const syllables = item ? lessonSyllables(item) : [];
  const shownSyllables = lessonCase(syllables.join(' '), config.letterMode === 'uppercase' && !cursive ? 'uppercase' : 'lowercase');
  const words = lesson.words ?? [];
  const others = (list?.words ?? []).filter((w) => !words.includes(w));
  const fit = lessonSentenceFit(config);
  const sentence = lesson.sentence ?? '';
  const suggestions = data && key ? data.sentences[key] ?? [] : [];
  const unsignable = /[,!?]/.test(sentence);

  const parts: [LessonSection, string, string][] = [
    ['letter', group ? 'Grupul de litere' : 'Litera', parent ? 'litera scrisă singură, cu ordinea liniilor' : 'modelul și rânduri de urmărit'],
    ['syll', 'Silabe', syllables.length ? shownSyllables : group || !item ? 'litera cu vocalele' : 'litera aceasta nu are silabe de exersat'],
    ['words', 'Cuvinte', parent ? 'un cuvânt pe fiecare rând' : 'câte un cuvânt pe rând, din lista de mai jos'],
    ['sentence', 'Propoziția', parent ? 'propoziția de mai jos, pe fiecare rând' : 'propoziția scrisă mai jos'],
  ];
  const pickWord = (w: string) => {
    if (!words.includes(w) && !isWordAllowed(w, tier)) return onShowPaywall();
    toggleWord(w);
  };
  const addOwn = () => {
    const w = cleanLessonWord(own);
    if (!w) return;
    if (!isWordAllowed(w, tier)) return onShowPaywall();
    if (!words.includes(w)) toggleWord(w);
    setOwn('');
  };

  return (
    <div data-lesson-panel className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-3">
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Rânduri pe părți</span>
          {!!pages && (
            <span data-page-count aria-live="polite" className="text-xs font-semibold text-slate-600">
              {pages === 1 ? 'Iese o pagină' : `Ies ${pagini(pages)}`}
            </span>
          )}
        </div>
        <p className="mb-2 text-[11px] text-slate-600">
          {item
            ? parent ? 'Câte rânduri are fiecare parte. 0 o scoate de pe fișă.' : 'Câte rânduri are fiecare parte a lecției; 0 o scoate de pe fișă. Paginile se adaugă singure.'
            : 'Alege mai sus o literă sau un grup de litere.'}
        </p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" aria-label="Rânduri pe părți">
          {parts.map(([id, label, sub]) => (
            <li key={id} data-lesson-part={id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-1">
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-bold text-slate-800">{label}</span>
                <span className="block line-clamp-2 text-[11px] text-slate-500">{sub}</span>
              </span>
              <Stepper value={lesson.counts[id]} name={label} min={LESSON_COUNT_MIN} max={LESSON_COUNT_MAX} onChange={(n) => setCount(id, n)} />
            </li>
          ))}
        </ul>
      </div>

      {/* the sentence */}
      <div>
        <label htmlFor="lesson-sentence" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Propoziția</label>
        <input
          id="lesson-sentence"
          type="text"
          value={sentence}
          maxLength={LESSON_SENTENCE_MAX}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={parent ? 'ex. Mama are mere.' : 'o propoziție scurtă, cu litera lecției'}
          autoComplete="off"
          aria-describedby="lesson-sentence-help"
          className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p id="lesson-sentence-help" className="mt-1 text-[11px] text-slate-500" aria-live="polite">
          {fit !== null && fit < LESSON_SENTENCE_SMALL
            ? <span data-sentence-long className="font-semibold text-amber-700">Propoziția e lungă: pe rând, literele ies mici. Scurteaz-o pentru litere mari.</span>
            : `Una singură, de cel mult ${LESSON_SENTENCE_MAX} de semne; se scrie pe un rând.`}
          {unsignable && <span className="block">Semnele , ! ? nu se trasează; punctul de la sfârșit, da.</span>}
        </p>
        {suggestions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Propoziții de pornire">
            {suggestions.map((s) => {
              const locked = !isWordAllowed(s, tier);
              return (
                <button key={s} type="button" data-sentence-suggestion aria-pressed={s === sentence.trim()}
                  onClick={() => (locked ? onShowPaywall() : setSentence(s))}
                  aria-label={locked ? `${s} (varianta completă)` : `Folosește: ${s}`}
                  className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm font-semibold ${s === sentence.trim() ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400'}`}>
                  {locked && <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden />}
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* the words */}
      <div data-lesson-words>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Cuvinte</span>
        {!item ? null : !data ? (
          <p className="text-xs text-slate-500" aria-live="polite">Se încarcă cuvintele…</p>
        ) : (
          <>
            <p className="mb-1.5 text-[11px] text-slate-600">
              {parent ? 'Apasă un cuvânt ca să-l pui sau să-l scoți.' : `Pe fișă intră primele ${lesson.counts.words}; „Altă variantă” le ia pe următoarele. Apasă ca să pui sau să scoți.`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...words, ...others].map((w) => {
                const has = words.includes(w);
                const locked = !has && !isWordAllowed(w, tier);
                return (
                  <button key={w} type="button" onClick={() => pickWord(w)} aria-pressed={has} disabled={!has && words.length >= LESSON_MAX_WORDS}
                    aria-label={has ? `Scoate ${w} din lecție` : locked ? `Adaugă ${w} (varianta completă)` : `Adaugă ${w}`}
                    data-lesson-word={w}
                    className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm font-semibold disabled:opacity-40 ${has ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400'}`}>
                    {has ? <Check className="h-3.5 w-3.5" aria-hidden /> : locked ? <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                    {w}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <label htmlFor="lesson-own-word" className="sr-only">Alt cuvânt pentru lecție</label>
              <input id="lesson-own-word" type="text" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={24}
                onKeyDown={(e) => e.key === 'Enter' && addOwn()} placeholder="alt cuvânt" autoComplete="off"
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={addOwn} aria-label="Adaugă cuvântul în lecție" disabled={words.length >= LESSON_MAX_WORDS}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </>
        )}
        <WordOptions lesson />
      </div>
    </div>
  );
}
