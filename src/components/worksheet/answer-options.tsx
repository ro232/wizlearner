'use client';

import { useWorksheetStore } from '@/stores/worksheet-store';
import { SCHOOL_LEVELS } from '@/lib/curriculum/sheet';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { evaluationTitle, isEvaluationItem } from '@/lib/worksheet/evaluation';

/**
 * Math and games: „Pagină cu răspunsuri la final” and „Evaluare” (the chosen items as a short test;
 * its answers page is on unless the teacher turns it off for the class set, config.evaluationAnswers). One setting for every kind of sheet (config.mathAnswers, see answer-key.ts).
 */
export function AnswerOptions() {
  const config = useWorksheetStore((s) => s.config);
  const { toggleMathAnswers, toggleEvaluation, toggleEvaluationAnswers } = useWorksheetStore();
  const games = config.category === 'games';
  const evaluation = !!config.evaluation;
  // what an evaluation leaves out (connect the dots, find the letter, group, orientation)
  const left = evaluation ? config.selectedItems.filter((i) => !isEvaluationItem(i)) : [];
  const level = SCHOOL_LEVELS.some((l) => l.id === config.curriculumLevel);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3" data-answer-options>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={evaluation ? config.evaluationAnswers !== false : !!config.mathAnswers} onChange={evaluation ? toggleEvaluationAnswers : toggleMathAnswers}
          className="mt-0.5 w-5 h-5 shrink-0 accent-blue-600" aria-describedby="answers-help" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800">Pagină cu răspunsuri la final</span>
          <span id="answers-help" className="block text-xs text-slate-600">
            {evaluation
              ? 'Pentru tine: răspunsurile și calificativele orientative. Debifează când tipărești setul pentru toată clasa: PDF-ul rămâne fără pagina de răspunsuri.'
              : games
                ? 'Pentru părinte sau educatoare. Unește punctele și desenele nu au răspunsuri.'
                : 'Pentru părinte sau educatoare: rezultatele tuturor exercițiilor.'}
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={evaluation} onChange={toggleEvaluation} className="mt-0.5 w-5 h-5 shrink-0 accent-blue-600" aria-describedby="evaluation-help" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800">Evaluare</span>
          <span id="evaluation-help" className="block text-xs text-slate-600">
            Câteva exerciții din fiecare tip ales, pe 1–2 pagini pentru elev, cu antet de evaluare, total și calificativ, autoevaluare; calificativele orientative sunt la răspunsuri.
          </span>
        </span>
      </label>
      {evaluation && (
        <p className="text-xs text-slate-600" data-evaluation-note>
          În antet: „{evaluationTitle(config)}”.
          {!level && ' Alege clasa la „Competența din programă” (Mai multe opțiuni), ca să apară și ea.'}
          {left.length > 0 && ` Nu intră în evaluare: ${left.map((i) => (isActivityItem(i) ? activityLabel(i) : i)).join(', ')}.`}
        </p>
      )}
    </div>
  );
}
