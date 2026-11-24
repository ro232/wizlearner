'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, FileText, Loader2, Minus, Plus, RotateCcw, Lock, AlertTriangle } from 'lucide-react';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { DownloadError } from '@/components/worksheet/download-error';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useDownload } from '@/hooks/use-download';
import { useToast } from '@/components/ui/toast';
import { track } from '@/lib/analytics';
import { presetById, presetHref } from '@/lib/curriculum/presets';
import { canHostProgram, courseWeeks, rangeLabel } from '@/lib/planning/calendar';
import {
  buildPlan,
  defaultHours,
  onlyModules,
  periodLabel,
  resetRow,
  setHoursPerWeek,
  shiftWeek,
  updateRow,
  weekNumbers,
  type Plan,
  type PlanRow,
  type RowPatch,
} from '@/lib/planning/plan';
import { planFilename, noteLines } from '@/lib/planning/document';
import { downloadPlanDocx, downloadPlanPdf } from '@/lib/planning/actions';
import { clearDraft, loadDraft, storeDraft } from '@/lib/planning/draft';
import { FEBRUARY_OPTIONS, PROGRAMS, SCHOOL_YEAR_LABEL, courseIntervals, vacationAfter, type FebruaryOption, type ProgramId } from '@/lib/planning/school-year-2026-2027';
import { MAX_HOURS_PER_WEEK, PLAN_LEVELS, PLAN_SUBJECTS, planLevel, planSubject, type PlanLevel, type SubjectId } from '@/lib/planning/subjects';

const label = 'block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2';
const pill = (active: boolean) =>
  `min-h-11 px-3 rounded-lg border-2 font-bold text-sm transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white text-ink hover:border-ink'}`;
const input = 'w-full min-h-11 px-3 border-2 border-slate-300 rounded-lg bg-white text-sm text-ink focus:outline-none focus:border-ink';
const cellInput = 'w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white text-sm text-ink focus:outline-none focus:border-ink';

/** Enough rows to show the whole text of a cell (about `perLine` characters per line). */
const rowsFor = (text: string, perLine: number, min = 2, max = 14) =>
  Math.max(min, Math.min(max, text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0)));

/** The free download is the first module; the whole year and the Word file are in the full plan. */
const FREE_MODULES = [1];

export function PlanningTool() {
  const tier = useWorksheetStore((s) => s.tier);
  const paid = tier !== 'free';
  const toast = useToast();
  const { busy, error, run } = useDownload<'pdf' | 'docx'>();
  const [showPaywall, setShowPaywall] = useState(false);

  const [plan, setPlan] = useState<Plan>(() => buildPlan({ level: 'CP', subject: 'clr' }));
  /** bumped on every new proposal, so the row editors start over */
  const [version, setVersion] = useState(0);
  const [school, setSchool] = useState('');
  const [teacher, setTeacher] = useState('');
  const [withSheets, setWithSheets] = useState(false);
  const [restored, setRestored] = useState(false);
  const started = useRef(false);

  // the draft from this browser, then the class and subject of the link (?clasa=I&disciplina=mem)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const draft = loadDraft();
    let next = draft?.plan ?? null;
    if (draft) {
      setSchool(draft.school);
      setTeacher(draft.teacher);
      setWithSheets(draft.withSheets);
    }
    try {
      const q = new URLSearchParams(window.location.search);
      const level = PLAN_LEVELS.find((l) => l.id === q.get('clasa'))?.id;
      const subject = PLAN_SUBJECTS.find((s) => s.id === q.get('disciplina'))?.id;
      if ((level && level !== next?.level) || (subject && subject !== next?.subject)) {
        const l = level ?? next?.level ?? 'CP';
        const s = subject ?? next?.subject ?? 'clr';
        next = buildPlan({ level: l, subject: s, february: next?.february, programs: next?.programs });
      }
    } catch {
      // no address bar to read: keep the draft
    }
    if (next) {
      setPlan(next);
      setVersion((v) => v + 1);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) storeDraft({ plan, school, teacher, withSheets });
  }, [restored, plan, school, teacher, withSheets]);

  const rebuild = (o: { level?: PlanLevel; subject?: SubjectId; february?: FebruaryOption['id']; programs?: Plan['programs'] }) => {
    const level = o.level ?? plan.level;
    const subject = o.subject ?? plan.subject;
    // a new class or subject starts from the framework plan's hours
    const hoursPerWeek = o.level || o.subject ? defaultHours(subject, level) : plan.hoursPerWeek;
    setPlan(buildPlan({ level, subject, hoursPerWeek, february: o.february ?? plan.february, programs: o.programs ?? plan.programs }));
    setVersion((v) => v + 1);
  };

  const edit = (id: string, patch: RowPatch) => setPlan((p) => updateRow(p, id, patch));

  const teachingWeeks = plan.weeks.filter((w) => !w.program).length;
  const totalHours = plan.rows.reduce((s, r) => s + r.hours, 0);
  const subject = planSubject(plan.subject);
  const levelId = plan.level.toLowerCase();

  // weeks a programme can go in (Art. 4), for the current February choice
  const programWeeks = useMemo(() => courseWeeks(plan.february).filter(canHostProgram), [plan.february]);
  const programModule = (id: ProgramId) => plan.weeks.find((w) => w.program === id)?.module;

  const download = (format: 'pdf' | 'docx', full: boolean) => {
    if ((format === 'docx' || full) && !paid) {
      setShowPaywall(true);
      return;
    }
    const meta = { school, teacher, withSheets, ...(full ? {} : { modules: FREE_MODULES }) };
    const target = full ? plan : onlyModules(plan, FREE_MODULES);
    void run(format, async () => {
      if (format === 'pdf') {
        const pages = await downloadPlanPdf(target, meta);
        track('planificare_download', { format: 'pdf', level: levelId, subject: plan.subject, tier, pages });
        return full ? 'Gata: planificarea pe tot anul, în PDF.' : 'Gata: primul modul, în PDF.';
      }
      await downloadPlanDocx(target, meta, planFilename(plan, 'docx'));
      track('planificare_download', { format: 'docx', level: levelId, subject: plan.subject, tier });
      return 'Gata: planificarea în Word (.docx).';
    });
  };

  const intervals = courseIntervals(plan.february);

  return (
    <>
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />

      <section className="py-8 sm:py-10 border-b-2 border-ink/10" aria-labelledby="setari">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-6 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
          <div className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-6 shadow-[4px_4px_0_#1F2A44] space-y-5">
            <h2 id="setari" className="text-xl font-extrabold text-ink">1. Clasa și disciplina</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <span className={label}>Clasa</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Clasa">
                  {PLAN_LEVELS.map((l) => (
                    <button key={l.id} type="button" aria-pressed={plan.level === l.id} onClick={() => rebuild({ level: l.id })} className={pill(plan.level === l.id)}>
                      {l.title}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={label}>Disciplina</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Disciplina">
                  {PLAN_SUBJECTS.map((s) => (
                    <button key={s.id} type="button" aria-pressed={plan.subject === s.id} onClick={() => rebuild({ subject: s.id })} className={`${pill(plan.subject === s.id)} text-left`}>
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="ore" className={label}>Ore pe săptămână</label>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="O oră mai puțin" className={pill(false)} onClick={() => setPlan((p) => setHoursPerWeek(p, p.hoursPerWeek - 1))}><Minus className="w-4 h-4" aria-hidden /></button>
                  <input id="ore" type="number" inputMode="numeric" min={1} max={MAX_HOURS_PER_WEEK} value={plan.hoursPerWeek}
                    onChange={(e) => setPlan((p) => setHoursPerWeek(p, Number(e.target.value)))} className={`${input.replace('w-full ', '')} w-20 text-center font-bold`} />
                  <button type="button" aria-label="O oră în plus" className={pill(false)} onClick={() => setPlan((p) => setHoursPerWeek(p, p.hoursPerWeek + 1))}><Plus className="w-4 h-4" aria-hidden /></button>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">Planul-cadru (OMEN 3371/2013): {subject.hours[plan.level]} ore la clasa {planLevel(plan.level).name}.</p>
              </div>
              <div>
                <label htmlFor="februarie" className={label}>Vacanța din februarie (a județului)</label>
                <select id="februarie" value={plan.february} onChange={(e) => rebuild({ february: e.target.value as FebruaryOption['id'] })} className={input}>
                  {FEBRUARY_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <p className="mt-1.5 text-xs text-slate-600">O stabilește inspectoratul școlar județean.</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {PROGRAMS.map((p) => {
                const other = PROGRAMS.find((o) => o.id !== p.id)!.id;
                const otherModule = programModule(other);
                return (
                  <div key={p.id}>
                    <label htmlFor={`program-${p.id}`} className={label}>„{p.title}” (săptămâna școlii)</label>
                    <select id={`program-${p.id}`} value={plan.programs[p.id] ?? ''} className={input}
                      onChange={(e) => rebuild({ programs: { ...plan.programs, [p.id]: e.target.value || null } })}>
                      <option value="">Nu e stabilită încă</option>
                      {programWeeks.map((w) => (
                        <option key={w.monday} value={w.monday} disabled={w.module === otherModule}>
                          S{w.n} · {rangeLabel(w.first, w.last)} (modulul {w.module})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 -mt-2">
              Cele două programe au câte 5 zile, între 7 septembrie 2026 și 23 aprilie 2027, în module diferite; fiecare școală își alege săptămânile.
            </p>
            {plan.ignored.length > 0 && (
              <p role="status" className="flex items-start gap-2 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                Săptămâna aleasă pentru {plan.ignored.map((id) => `„${PROGRAMS.find((p) => p.id === id)?.title}”`).join(' și ')} nu mai e o săptămână de cursuri cu vacanța aleasă (sau e în același modul cu celălalt program). Alege alta.
              </p>
            )}
          </div>

          <aside className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-6 shadow-[4px_4px_0_#1F2A44] space-y-4 self-start" aria-labelledby="document">
            <h2 id="document" className="text-xl font-extrabold text-ink">2. Documentul</h2>
            <div>
              <label htmlFor="scoala" className={label}>Unitatea de învățământ</label>
              <input id="scoala" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={200} placeholder="opțional" className={input} />
            </div>
            <div>
              <label htmlFor="cadru" className={label}>Cadrul didactic</label>
              <input id="cadru" value={teacher} onChange={(e) => setTeacher(e.target.value)} maxLength={200} placeholder="opțional" className={input} autoComplete="name" />
              <p className="mt-1.5 text-xs text-slate-600">Apar doar în antetul documentului. Rămân în acest browser, nu le trimitem nicăieri.</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" checked={withSheets} onChange={(e) => setWithSheets(e.target.checked)} className="mt-1 w-4 h-4 accent-ink" />
              Adaugă în document coloana „Fișe WorksheetWiz”
            </label>
            <div className="space-y-3 pt-1">
              {paid ? (
                <>
                  <button type="button" data-btn="primary" disabled={busy !== null} onClick={() => download('docx', true)} className="w-full min-h-12 px-4 rounded-xl inline-flex items-center justify-center gap-2">
                    {busy === 'docx' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <FileText className="w-4 h-4" aria-hidden />} Descarcă Word (.docx)
                  </button>
                  <button type="button" data-btn="ink" disabled={busy !== null} onClick={() => download('pdf', true)} className="w-full min-h-12 px-4 rounded-xl inline-flex items-center justify-center gap-2">
                    {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Download className="w-4 h-4" aria-hidden />} Descarcă PDF
                  </button>
                </>
              ) : (
                <>
                  <button type="button" data-btn="ink" disabled={busy !== null} onClick={() => download('pdf', false)} className="w-full min-h-12 px-4 rounded-xl inline-flex items-center justify-center gap-2">
                    {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Download className="w-4 h-4" aria-hidden />} PDF gratuit: modulul 1
                  </button>
                  <button type="button" onClick={() => download('docx', true)} className="w-full min-h-12 px-4 rounded-xl border-2 border-ink bg-paper font-extrabold text-ink inline-flex items-center justify-center gap-2 hover:bg-pencil/40">
                    <Lock className="w-4 h-4" aria-hidden /> Tot anul: Word și PDF
                  </button>
                  <p className="text-xs text-slate-600">
                    Vezi gratuit planificarea întreagă aici, pe pagină. Word-ul și PDF-ul pe tot anul sunt în <Link href="/preturi" className="underline font-bold">varianta completă</Link>.
                  </p>
                </>
              )}
              <DownloadError message={error} />
            </div>
          </aside>
        </div>
      </section>

      <section className="py-8 sm:py-10" aria-labelledby="plan">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="plan" className="text-2xl sm:text-3xl font-extrabold text-ink">3. Planificarea propusă</h2>
              <p className="mt-1 text-slate-700">
                {subject.title}, clasa {planLevel(plan.level).name} · {plan.weeks.length} săptămâni de cursuri, {teachingWeeks} în planificare · {totalHours} ore
              </p>
            </div>
            <button type="button" onClick={() => { clearDraft(); rebuild({}); toast('Am refăcut propunerea de la zero.'); }}
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg border-2 border-slate-300 bg-white text-sm font-bold text-ink hover:border-ink">
              <RotateCcw className="w-4 h-4" aria-hidden /> Refă propunerea
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600 max-w-3xl">
            Poți schimba titlurile, competențele, conținuturile, orele și observațiile direct în tabel; cu − și + muți o săptămână între o unitate și vecina ei din același modul.
            Modificările rămân în acest browser.
          </p>

          <div className="mt-6 space-y-6">
            {intervals.map((iv) => {
              const rows = plan.rows.filter((r) => r.module === iv.module);
              const weeks = plan.weeks.filter((w) => w.module === iv.module).length;
              return (
                <div key={iv.module} className="rounded-2xl border-2 border-ink bg-white overflow-hidden">
                  <h3 className="px-4 py-3 bg-ink text-white font-extrabold">
                    Modulul {iv.module} <span className="font-semibold text-white/80">· {rangeLabel(iv.start, iv.end, true)} · {weeks} săptămâni</span>
                  </h3>
                  <div className="hidden lg:grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,2.4fr)_5rem_8.5rem_minmax(0,1.4fr)] gap-3 px-4 py-2 bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-700" aria-hidden>
                    <span>Unitatea de învățare</span><span>Competențe</span><span>Conținuturi</span><span>Ore</span><span>Săptămâna</span><span>Observații</span>
                  </div>
                  <ul className="divide-y-2 divide-slate-100">
                    {rows.map((r) => (
                      <PlanRowEditor key={`${version}-${r.id}`} row={r} plan={plan} onEdit={edit}
                        onShift={(d) => setPlan((p) => shiftWeek(p, r.id, d))} onReset={() => setPlan((p) => resetRow(p, r.id))} />
                    ))}
                  </ul>
                  <p className="px-4 py-2 text-sm text-slate-600 bg-paper border-t-2 border-slate-100">{vacationAfter(iv.module, plan.february)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-1.5">
            {noteLines(plan).map((n) => <p key={n}>{n}</p>)}
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Structura anului școlar {SCHOOL_YEAR_LABEL}: Ordinul nr. 3.194/2026 (M. Of. nr. 126/16.02.2026). Competențele și conținuturile, cuvânt cu cuvânt din programă:{' '}
            <Link href={`/programa/${plan.level === 'CP' ? 'clasa-pregatitoare' : plan.level === 'I' ? 'clasa-1' : 'clasa-2'}`} className="underline">Fișe pe programă</Link>.
          </p>
        </div>
      </section>
    </>
  );
}

function PlanRowEditor({ row, plan, onEdit, onShift, onReset }: {
  row: PlanRow;
  plan: Plan;
  onEdit: (id: string, patch: RowPatch) => void;
  onShift: (delta: 1 | -1) => void;
  onReset: () => void;
}) {
  // the typed text stays as typed; the plan gets the parsed value
  const [codesText, setCodesText] = useState(row.codes.join(', '));
  const [contentsText, setContentsText] = useState(row.contents.join('\n'));
  const program = row.kind === 'program';
  const fieldLabel = 'lg:hidden block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1';
  const period = `${weekNumbers(row.weeks)} · ${periodLabel(row.weeks, plan.weeks)}`;

  if (program) {
    return (
      <li className="px-4 py-3 bg-pencil/10 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,2.4fr)_5rem_8.5rem_minmax(0,1.4fr)] gap-3 text-sm">
        <p className="font-extrabold text-ink">{row.title}</p>
        <p className="hidden lg:block text-slate-500">–</p>
        <p className="text-slate-700">{row.contents.join(' ')}</p>
        <p className="hidden lg:block text-slate-500">–</p>
        <p className="text-slate-700 tabular-nums">{period}</p>
        <p className="text-slate-600">{row.notes}</p>
      </li>
    );
  }

  return (
    <li className="px-4 py-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,2.4fr)_5rem_8.5rem_minmax(0,1.4fr)] [&>*]:min-w-0">
      <div>
        <label className={fieldLabel} htmlFor={`t-${row.id}`}>Unitatea de învățare</label>
        <textarea id={`t-${row.id}`} rows={rowsFor(row.title, 22)} value={row.title} aria-label="Unitatea de învățare" onChange={(e) => onEdit(row.id, { title: e.target.value })} className={`${cellInput} font-bold resize-y`} />
        {row.sheets.length > 0 && (
          <div className="mt-2">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Fișe</span>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {row.sheets.map((id) => {
                const p = presetById(id);
                if (!p) return null;
                return (
                  <li key={id}>
                    <Link href={presetHref(p, plan.level)} prefetch={false} target="_blank" rel="noopener" title={p.text}
                      className="inline-flex items-center gap-1 min-h-8 rounded-md border border-ink/60 bg-paper px-2 text-xs font-bold text-ink hover:bg-pencil">
                      {p.title} <ArrowRight className="w-3 h-3" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <div>
        <label className={fieldLabel} htmlFor={`c-${row.id}`}>Competențe specifice</label>
        <textarea id={`c-${row.id}`} value={codesText} aria-label="Competențe specifice" rows={rowsFor(codesText, 10, 1, 8)}
          onChange={(e) => { setCodesText(e.target.value); onEdit(row.id, { codes: e.target.value.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean) }); }}
          className={`${cellInput} tabular-nums resize-y`} />
      </div>
      <div>
        <label className={fieldLabel} htmlFor={`k-${row.id}`}>Conținuturi</label>
        <textarea id={`k-${row.id}`} rows={rowsFor(contentsText, 52, 3, 16)} value={contentsText} aria-label="Conținuturi, câte unul pe rând"
          onChange={(e) => { setContentsText(e.target.value); onEdit(row.id, { contents: e.target.value.split('\n').map((x) => x.replace(/^\s*[•-]\s*/, '').trim()).filter(Boolean) }); }}
          className={`${cellInput} resize-y leading-snug`} />
      </div>
      <div>
        <label className={fieldLabel} htmlFor={`h-${row.id}`}>Nr. ore</label>
        <input id={`h-${row.id}`} type="number" min={0} max={500} inputMode="numeric" value={row.hours} aria-label="Număr de ore"
          onChange={(e) => onEdit(row.id, { hours: Number(e.target.value) })} className={`${cellInput} text-center font-bold`} />
        {(row.hoursEdited || row.notesEdited) && (
          <button type="button" onClick={onReset} className="mt-1 text-[11px] font-bold text-blue-700 underline">calcul automat</button>
        )}
      </div>
      <div>
        <span className={fieldLabel}>Săptămâna</span>
        <p className="text-sm text-ink tabular-nums">{weekNumbers(row.weeks)}</p>
        <p className="text-xs text-slate-600">{periodLabel(row.weeks, plan.weeks)}</p>
        <div className="mt-1.5 flex gap-1.5">
          <button type="button" onClick={() => onShift(-1)} disabled={row.weeks.length <= 1} aria-label={`O săptămână mai puțin pentru ${row.title}`}
            className="w-9 h-9 inline-flex items-center justify-center rounded-md border-2 border-slate-300 bg-white text-ink hover:border-ink disabled:opacity-40"><Minus className="w-4 h-4" aria-hidden /></button>
          <button type="button" onClick={() => onShift(1)} aria-label={`O săptămână în plus pentru ${row.title}`}
            className="w-9 h-9 inline-flex items-center justify-center rounded-md border-2 border-slate-300 bg-white text-ink hover:border-ink"><Plus className="w-4 h-4" aria-hidden /></button>
        </div>
      </div>
      <div>
        <label className={fieldLabel} htmlFor={`o-${row.id}`}>Observații</label>
        <textarea id={`o-${row.id}`} rows={rowsFor(row.notes, 30, 2, 10)} value={row.notes} aria-label="Observații" onChange={(e) => onEdit(row.id, { notes: e.target.value })} className={`${cellInput} resize-y text-xs leading-snug`} />
      </div>
    </li>
  );
}
