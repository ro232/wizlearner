'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Users, Check, ChevronLeft, ChevronRight, CalendarDays, Save, Trash2, Loader2, Eraser } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useToast } from '@/components/ui/toast';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { THEMES, themeById } from '@/lib/themes';
import { ALPHABETS } from '@/lib/glyphs/data';
import { buildGroupPages, parseNameList, MAX_CHILDREN, MAX_LETTERS } from '@/lib/worksheet/group';
import { SCHOOL_YEAR, WEEKS_IN_YEAR, weekLabel, weekOfSchoolYear } from '@/lib/calendar';
import { clearGroupDraft, loadGroupDraft, loadGroups, storeGroupDraft, storeGroups, type SavedGroup } from '@/lib/saved-groups';
import { sanitizeGroupProject } from '@/components/projects/sanitize-project';
import { DownloadError } from '@/components/worksheet/download-error';
import { ForeignLettersNote } from '@/components/worksheet/foreign-letters-note';
import { copii, countOf, fise, pagini } from '@/components/worksheet/plural';
import { useDownload } from '@/hooks/use-download';
import { downloadPagesPdf } from '@/lib/pdf/actions';
import { logDownload, takeProject } from '@/lib/projects';
import type { Difficulty, LetterMode, Script } from '@/types';

/** On the free plan the group sheets can be tried with a few children. */
const FREE_GROUP_LIMIT = 3;

const EXAMPLE = 'Ana Popescu\nȘtefan\nMaria-Ioana\nLuca\nIrina';

const LEVELS: { id: Difficulty; label: string; short: string }[] = [
  { id: 'beginner', label: 'Început', short: 'Î' },
  { id: 'intermediate', label: 'Mijlociu', short: 'M' },
  { id: 'advanced', label: 'Avansat', short: 'A' },
];

const label = 'block text-xs font-extrabold text-slate-700 uppercase tracking-wider';
const pill = (active: boolean) =>
  `rounded-lg border-2 font-bold transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white text-ink hover:border-ink'}`;

export default function GroupPage() {
  const tier = useWorksheetStore((s) => s.tier);
  const toast = useToast();
  const [namesText, setNamesText] = useState('');
  const [levels, setLevels] = useState<Record<string, Difficulty>>({});
  const [week, setWeek] = useState<number | null>(null);
  const [themeId, setThemeId] = useState<string | undefined>(THEMES[0].id);
  const [letters, setLetters] = useState<string[]>([]);
  const [letterMode, setLetterMode] = useState<LetterMode>('uppercase');
  const [script, setScript] = useState<Script>('print');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [withFind, setWithFind] = useState(true);
  const { busy: busyWith, error, run } = useDownload();
  const busy = busyWith !== null;
  const [showPaywall, setShowPaywall] = useState(false);
  /** after a free download of part of the group: how many children were left out */
  const [leftOut, setLeftOut] = useState(0);
  // a changed list makes the offer stale
  useEffect(() => setLeftOut(0), [namesText]);

  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState('');

  // What was on the page last time comes back by itself (kept in this browser only): the pasted
  // list, the group, the levels and, within the same week, the week, theme and letters.
  // Settings reopened from the account's history („Refă”) win over the plan of the week.
  const [restored, setRestored] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const project = sanitizeGroupProject(takeProject<unknown>('group'));
    const saved = loadGroups();
    setGroups(saved);
    const draft = loadGroupDraft();
    const now = weekOfSchoolYear(new Date());
    if (draft) {
      setNamesText(draft.namesText);
      setGroupName(draft.groupName);
      setGroupId(saved.some((g) => g.id === draft.groupId) ? draft.groupId : '');
      setLevels(draft.levels);
      setLetterMode(draft.letterMode);
      setScript(draft.script);
      setDifficulty(draft.difficulty);
      setWithFind(draft.withFind);
    } else if (saved[0]) {
      openGroup(saved[0]);
    }
    if (project) {
      setWeek(null);
      setThemeId(project.themeId);
      setLetters(project.letters);
      setLetterMode(project.letterMode);
      setScript(project.script);
      setDifficulty(project.difficulty);
      setWithFind(project.withFind);
    } else if (draft && draft.writtenInWeek === now) {
      setWeek(draft.week && SCHOOL_YEAR[draft.week - 1] ? draft.week : null);
      setThemeId(draft.themeId && themeById(draft.themeId) ? draft.themeId : undefined);
      setLetters(draft.letters.filter((l) => ALPHABETS.ro.includes(l)).slice(0, MAX_LETTERS));
    } else if (now) {
      applyWeek(now);
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // …and is written back at every change. Nothing here is sent anywhere.
  useEffect(() => {
    if (!restored) return;
    storeGroupDraft({ namesText, groupName, groupId, levels, week, writtenInWeek: weekOfSchoolYear(new Date()), themeId, letters, letterMode, script, difficulty, withFind });
  }, [restored, namesText, groupName, groupId, levels, week, themeId, letters, letterMode, script, difficulty, withFind]);

  const list = useMemo(() => parseNameList(namesText), [namesText]);
  const names = list.names;
  const overFree = tier === 'free' && names.length > FREE_GROUP_LIMIT;
  const limit = tier === 'free' ? FREE_GROUP_LIMIT : MAX_CHILDREN;
  // What the preview shows is exactly what the button downloads.
  const previewNames = names.length ? names.slice(0, limit) : ['Ana'];
  const previewKeys = names.length ? list.keys.slice(0, limit) : ['Ana'];
  const { pages } = useMemo(
    () => buildGroupPages({ names: previewNames, keys: previewKeys, themeId, letters, letterMode, script, difficulty, levels, withFindPages: withFind }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewKeys.join('\n'), themeId, letters, letterMode, script, difficulty, levels, withFind],
  );

  function applyWeek(w: number) {
    const plan = SCHOOL_YEAR[w - 1];
    if (!plan) return;
    setWeek(w);
    setThemeId(plan.themeId);
    setLetters(plan.letters);
  }

  function openGroup(g: SavedGroup) {
    setGroupId(g.id);
    setGroupName(g.name);
    setNamesText(g.namesText);
    setLevels(g.levels ?? {});
  }

  const newGroup = () => {
    setGroupId('');
    setGroupName('');
    setNamesText('');
    setLevels({});
  };

  // Empties the list here and in the browser's memory (a shared computer in the staff room).
  const clearList = () => {
    newGroup();
    clearGroupDraft();
    toast('Lista a fost golită. Grupele salvate rămân.');
  };

  const saveGroup = () => {
    const name = groupName.trim() || `Grupa ${groups.length + 1}`;
    const id = groupId || `g${Date.now()}`;
    const next = [{ id, name, namesText, levels }, ...groups.filter((g) => g.id !== id)];
    if (storeGroups(next)) {
      setGroups(next);
      setGroupId(id);
      setGroupName(name);
      toast(`„${name}” e salvată în acest browser.`);
    } else {
      toast('Browserul nu permite salvarea aici (fereastră privată?).');
    }
  };

  const deleteGroup = () => {
    const next = groups.filter((g) => g.id !== groupId);
    storeGroups(next);
    setGroups(next);
    newGroup();
    toast('Grupa a fost ștearsă din acest browser.');
  };

  const cycleLevel = (child: string) =>
    setLevels((cur) => {
      const order: (Difficulty | undefined)[] = [undefined, 'beginner', 'intermediate', 'advanced'];
      const nextLevel = order[(order.indexOf(cur[child]) + 1) % order.length];
      const copy = { ...cur };
      if (nextLevel) copy[child] = nextLevel;
      else delete copy[child];
      return copy;
    });

  const toggleLetter = (l: string) =>
    setLetters((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : cur.length >= MAX_LETTERS ? [...cur.slice(1), l] : [...cur, l]));

  // Free plan: the first children only; the button says so before it is pressed.
  const download = () =>
    run('download', async () => {
      const count = previewNames.length;
      const planPart = week ? `-sapt-${week}` : '';
      await downloadPagesPdf(pages, `fise-grupa${planPart}-${themeId ?? 'litere'}.pdf`);
      // history keeps the settings only, never the children's names
      void logDownload('group', `Grupă: ${copii(count)}${themeId ? ` · ${themeById(themeId)?.title ?? themeId}` : ''}`, { themeId, letters, letterMode, script, difficulty, withFind }, pages.length);
      setLeftOut(overFree ? names.length - count : 0);
      return overFree
        ? `Gata: fișele primilor ${count} copii.`
        : count === 1 ? 'Gata: fișa copilului.' : `Gata: ${fise(count)}, câte una pentru fiecare copil.`;
    });

  const plan = week ? SCHOOL_YEAR[week - 1] : null;
  const planTheme = plan ? themeById(plan.themeId) : undefined;

  return (
    <div className="min-h-screen bg-paper">
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 [&>*]:min-w-0">
        <section className="space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-ink">Fișe pentru toată grupa</h1>
            <p className="mt-2 text-slate-700">
              Lipești lista copiilor o singură dată. În fiecare săptămână alegi săptămâna din plan și descarci câte o fișă pentru
              fiecare copil: numele lui, literele săptămânii și cuvintele temei, cu imagini.
            </p>
          </div>

          {/* Week of the school year */}
          <div className="rounded-2xl bg-white shadow-lg p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`${label} flex items-center gap-1.5 whitespace-nowrap`}>
                <CalendarDays className="w-4 h-4" aria-hidden /> Săptămâna din plan
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <button type="button" aria-label="Săptămâna anterioară" disabled={!week || week <= 1} onClick={() => week && applyWeek(week - 1)}
                  className="w-9 h-9 rounded-lg border-2 border-ink flex items-center justify-center disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                </button>
                <select aria-label="Alege săptămâna" value={week ?? ''} onChange={(e) => e.target.value && applyWeek(Number(e.target.value))}
                  className="h-9 min-w-0 w-full max-w-[220px] rounded-lg border-2 border-ink bg-white px-2 font-bold text-ink">
                  <option value="">alege…</option>
                  {SCHOOL_YEAR.map((w) => (
                    <option key={w.week} value={w.week}>
                      Săpt. {w.week} · {weekLabel(w.week)}
                    </option>
                  ))}
                </select>
                <button type="button" aria-label="Săptămâna următoare" disabled={!!week && week >= WEEKS_IN_YEAR} onClick={() => applyWeek(week ? week + 1 : 1)}
                  className="w-9 h-9 rounded-lg border-2 border-ink flex items-center justify-center disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </div>
            {plan ? (
              <p className="mt-3 text-slate-800">
                <b>{planTheme?.title}</b>
                {plan.letters.length ? <> · literele <b>{plan.letters.join(', ')}</b></> : ' · numele și primele exerciții'}
                <span className="block text-xs text-slate-600 mt-1">Plan sugerat pentru anul școlar 2026–2027. Poți schimba tema sau literele mai jos.</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Alege o săptămână și tema și literele se completează singure.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-6">
            {/* Saved groups */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[160px]">
                <label htmlFor="group-name" className={label}>Grupa</label>
                <input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="ex. Grupa mare Fluturașii" autoComplete="off"
                  className="mt-2 w-full h-11 px-3 rounded-xl border-2 border-slate-300 bg-white focus:border-ink focus:outline-none" />
              </div>
              {groups.length > 0 && (
                <select aria-label="Grupele salvate" value={groupId} onChange={(e) => { const g = groups.find((x) => x.id === e.target.value); if (g) openGroup(g); else newGroup(); }}
                  className="h-11 rounded-xl border-2 border-slate-300 bg-white px-2 font-bold text-ink">
                  <option value="">+ grupă nouă</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              <button type="button" onClick={saveGroup} disabled={!names.length} className="h-11 px-4 rounded-xl border-2 border-ink bg-white font-extrabold text-ink inline-flex items-center gap-1.5 hover:bg-paper disabled:opacity-40">
                <Save className="w-4 h-4" aria-hidden /> Salvează
              </button>
              {groupId && (
                <button type="button" onClick={deleteGroup} aria-label="Șterge grupa" className="h-11 w-11 rounded-xl border-2 border-slate-300 bg-white inline-flex items-center justify-center hover:border-pen">
                  <Trash2 className="w-4 h-4 text-slate-600" aria-hidden />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="names" className={`${label} flex items-center gap-1.5`}>
                  <Users className="w-3.5 h-3.5" aria-hidden /> Copiii din grupă
                </label>
                <span className="flex items-center gap-3 text-xs text-slate-600">
                  {copii(names.length)}
                  {namesText && (
                    <button type="button" onClick={clearList} className="inline-flex items-center gap-1 font-bold text-ink underline underline-offset-2 hover:text-pen">
                      <Eraser className="w-3.5 h-3.5" aria-hidden /> Golește lista
                    </button>
                  )}
                </span>
              </div>
              <textarea id="names" rows={5} value={namesText} onChange={(e) => setNamesText(e.target.value)} placeholder={EXAMPLE}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-ink" />
              <p className="text-[11px] text-slate-600 mt-1">
                Câte un nume pe rând (merge și copiat din catalog sau din Excel). Lista se păstrează singură, doar în browserul tău.
                {tier === 'free' && ` Gratuit poți încerca cu ${FREE_GROUP_LIMIT} copii.`}
              </p>
              <ForeignLettersNote names={names} className="mt-2" />
              {list.total > MAX_CHILDREN && (
                <p role="status" className="mt-2 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Lista are {countOf(list.total, 'nume', 'nume')}. Pe un PDF intră cel mult {MAX_CHILDREN}: primii {MAX_CHILDREN} primesc fișă, pentru ceilalți {list.total - MAX_CHILDREN} fă o a doua grupă.
                </p>
              )}
              {list.repeated.length > 0 && (
                <p role="status" className="mt-2 text-xs font-semibold text-slate-700">
                  {list.repeated.map((r) => `${r.count} copii cu același nume: ${r.name}`).join(' · ')}. Fiecare primește fișa lui.
                </p>
              )}

              {names.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-600 mb-2">Apasă pe un copil ca să-i dai alt nivel decât grupei (Î = Început, M = Mijlociu, A = Avansat).</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {names.map((n, i) => {
                      const key = list.keys[i];
                      const lv = LEVELS.find((l) => l.id === levels[key]);
                      return (
                        <li key={key}>
                          <button type="button" onClick={() => cycleLevel(key)} aria-label={`${n}: ${lv ? `nivel ${lv.label}` : 'nivelul grupei'}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border-2 pl-3 pr-1 py-0.5 text-sm font-bold ${lv ? 'border-ink bg-white text-ink' : 'border-slate-300 bg-paper text-slate-700'}`}>
                            {n}
                            <span className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center ${lv ? 'bg-pen text-white' : 'bg-slate-200 text-slate-600'}`}>{lv ? lv.short : '–'}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <span className={`${label} mb-2`}>Tema</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setThemeId(t.id)} aria-pressed={themeId === t.id}
                    className={`relative p-2.5 rounded-xl border-2 text-left ${themeId === t.id ? 'border-ink bg-white shadow-md' : 'border-slate-300 bg-white hover:border-ink'}`}>
                    <div className="text-sm font-extrabold text-ink">{t.title}</div>
                    <div className="text-[11px] text-slate-600">{t.when}</div>
                    {themeId === t.id && <Check className="absolute top-2 right-2 w-4 h-4 text-pen" aria-hidden />}
                  </button>
                ))}
                <button type="button" onClick={() => setThemeId(undefined)} aria-pressed={!themeId}
                  className={`p-2.5 rounded-xl border-2 text-left ${!themeId ? 'border-ink bg-white shadow-md' : 'border-slate-300 bg-white hover:border-ink'}`}>
                  <div className="text-sm font-extrabold text-ink">Fără temă</div>
                  <div className="text-[11px] text-slate-600">doar numele și literele</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={label}>Literele săptămânii</span>
                <span className="text-xs text-slate-600">cel mult {MAX_LETTERS}</span>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-11 gap-1">
                {ALPHABETS.ro.map((l) => (
                  <button key={l} type="button" onClick={() => toggleLetter(l)} aria-pressed={letters.includes(l)} className={`h-9 text-sm ${pill(letters.includes(l))}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <span className={`${label} mb-2`}>Scriem</span>
                <div className="grid grid-cols-3 gap-2">
                  {([['uppercase', 'MARI'], ['paired', 'Prima mare']] as const).map(([m, l]) => (
                    <button key={m} type="button" onClick={() => { setLetterMode(m); setScript('print'); }} aria-pressed={script === 'print' && letterMode === m} className={`h-10 text-sm ${pill(script === 'print' && letterMode === m)}`}>{l}</button>
                  ))}
                  <button type="button" onClick={() => setScript('cursive')} aria-pressed={script === 'cursive'} className={`h-10 text-sm italic ${pill(script === 'cursive')}`} title="Scris de mână, legat (clasa I)">De mână</button>
                </div>
              </div>
              <div>
                <span className={`${label} mb-2`}>Nivelul grupei</span>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button key={l.id} type="button" onClick={() => setDifficulty(l.id)} aria-pressed={difficulty === l.id} className={`h-10 text-xs ${pill(difficulty === l.id)}`}>{l.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-slate-300 bg-paper p-3">
              <input type="checkbox" checked={withFind} onChange={() => setWithFind((v) => !v)} disabled={!letters.length} className="mt-1 w-4 h-4" />
              <span>
                <span className="block font-extrabold text-ink">Pachetul săptămânii</span>
                <span className="block text-sm text-slate-600">
                  {letters.length ? `După fișa de scris, fiecare copil primește și jocul „Găsește litera” pentru ${letters.join(' și ')}.` : 'Alege literele săptămânii ca să adaugi jocul „Găsește litera”.'}
                </span>
              </span>
            </label>

            <DownloadError message={error} />
            <button type="button" onClick={download} disabled={busy || names.length === 0} data-btn="primary"
              className="w-full min-h-14 py-2 px-3 rounded-xl text-base inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden /> : <Download className="w-5 h-5 shrink-0" aria-hidden />}
              {busy ? 'Se pregătește…'
                : names.length === 0 ? 'Adaugă numele copiilor'
                : overFree ? `Descarcă fișele primilor ${FREE_GROUP_LIMIT} copii (${pagini(pages.length)})`
                : `Descarcă fișele (${copii(names.length)}, ${pagini(pages.length)})`}
            </button>
            {overFree && leftOut > 0 && (
              <div role="status" data-free-offer className="rounded-xl border-2 border-ink bg-white p-4 shadow-[4px_4px_0_#F2B632]">
                <p className="font-extrabold text-ink">Ai fișele pentru primii {FREE_GROUP_LIMIT} copii.</p>
                <p className="mt-1 text-sm text-slate-700">
                  Pentru restul grupei ({copii(leftOut)}), cu numele fiecăruia, în fiecare săptămână: varianta completă.
                </p>
                <button type="button" onClick={() => setShowPaywall(true)} data-btn="primary"
                  className="mt-3 w-full min-h-11 rounded-xl px-3 font-bold">
                  Fișe pentru toată grupa
                </button>
              </div>
            )}
            {overFree && !leftOut && (
              <p className="text-sm text-slate-700" data-free-note>
                Gratuit descarci fișele primilor {FREE_GROUP_LIMIT} copii din listă. Toată grupa ({copii(names.length)}) face parte din varianta completă.{' '}
                <button type="button" onClick={() => setShowPaywall(true)} className="font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-2">Vezi varianta completă</button>
              </p>
            )}
          </div>
        </section>

        <section aria-label="Previzualizare" className="lg:sticky lg:top-24 lg:self-start flex flex-col items-center gap-3">
          <div className="desk rounded-2xl border-2 border-ink p-4 sm:p-8 w-full flex justify-center">
            <PagesPreview pages={pages} width={440} pageLabel="Pagina" />
          </div>
          {!names.length && <p className="text-sm text-slate-600">Exemplu pentru „Ana”. Adaugă numele copiilor ca să le vezi fișele.</p>}
          {overFree && <p className="text-sm text-slate-600">Previzualizare pentru primii {FREE_GROUP_LIMIT} copii din {names.length}.</p>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
