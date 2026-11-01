'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Library, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { stashProject } from '@/lib/projects';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { DEFAULT_CONFIG, type Difficulty, type LetterMode, type Script } from '@/types';

interface Child {
  id: string;
  name: string;
  level: Difficulty;
  script: Script;
  letter_mode: LetterMode;
}

const LEVELS: Record<Difficulty, string> = { beginner: 'Început', intermediate: 'Mijlociu', advanced: 'Avansat' };
const MODES: Record<LetterMode, string> = { uppercase: 'litere mari', lowercase: 'litere mici', paired: 'mari și mici' };
const PRESET: Record<Difficulty, object> = {
  beginner: { fontStyle: 'dashed', tracingVisibility: 8, letterSize: 'large', rowsPerPage: 4 },
  intermediate: { fontStyle: 'dotted', tracingVisibility: 5, letterSize: 'medium', rowsPerPage: 6 },
  advanced: { fontStyle: 'dotted', tracingVisibility: 3, letterSize: 'small', rowsPerPage: 8 },
};

/**
 * The children a parent or teacher makes sheets for: first name and how they work (level,
 * print or handwriting, which letters). Everything else on the site starts from here in one click.
 */
export function ChildrenPanel({ userId }: { userId: string }) {
  const router = useRouter();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [form, setForm] = useState<{ id?: string; name: string; level: Difficulty; script: Script; letter_mode: LetterMode } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) return setChildren([]);
    const { data } = await createClient().from('child_profiles').select('id, name, level, script, letter_mode').eq('user_id', userId).order('created_at');
    setChildren((data as Child[] | null) ?? []);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!form || !form.name.trim()) return;
    setError(null);
    const row = { name: form.name.trim().slice(0, 40), level: form.level, script: form.script, letter_mode: form.letter_mode };
    const supabase = createClient();
    const { error: err } = form.id
      ? await supabase.from('child_profiles').update(row).eq('id', form.id)
      : await supabase.from('child_profiles').insert({ ...row, user_id: userId });
    if (err) return setError('Nu am putut salva. Încearcă din nou.');
    setForm(null);
    void load();
  };
  const remove = async (id: string) => {
    await createClient().from('child_profiles').delete().eq('id', id);
    setConfirm(null);
    void load();
  };

  const sheet = (c: Child) => {
    useWorksheetStore.setState({
      config: { ...DEFAULT_CONFIG, ...PRESET[c.level], difficulty: c.level, script: c.script, letterMode: c.script === 'cursive' ? 'paired' : c.letter_mode, childName: c.name, customWords: [c.name], selectedItems: [] },
    });
    router.push('/generator');
  };
  const nameBook = (c: Child) => router.push(stashProject('name-book', { name: c.name, mode: c.script === 'cursive' ? 'paired' : c.letter_mode, script: c.script, kind: 'book' }));
  const workbook = (c: Child) =>
    router.push(stashProject('workbook', { book: c.script === 'cursive' ? 'cursive' : c.letter_mode === 'uppercase' ? 'upper' : c.letter_mode === 'lowercase' ? 'lower' : 'paired', level: c.level, withWords: true, name: c.name }));

  const pill = (on: boolean) => `h-9 px-3 rounded-lg border-2 text-sm font-bold ${on ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white text-ink hover:border-ink'}`;

  return (
    <div className="space-y-4">
      {children === null ? (
        <p className="text-slate-500 text-sm">Se încarcă…</p>
      ) : children.length === 0 && !form ? (
        <p className="text-slate-600">Adaugă copilul (sau copiii) cu nivelul lui, și de aici îi faci fișa, caietul cu numele sau caietul de litere dintr-un click.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {children.map((c) => (
            <li key={c.id} className="rounded-xl border-2 border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-extrabold text-ink">{c.name}</div>
                  <div className="text-xs text-slate-500">{LEVELS[c.level]} · {c.script === 'cursive' ? 'de mână' : `de tipar, ${MODES[c.letter_mode]}`}</div>
                </div>
                {confirm === c.id ? (
                  <span className="flex gap-1">
                    <button type="button" onClick={() => remove(c.id)} className="h-8 px-2 rounded-lg bg-red-600 text-white text-xs font-bold">Șterge</button>
                    <button type="button" onClick={() => setConfirm(null)} className="h-8 px-2 rounded-lg border border-slate-300 text-xs">Nu</button>
                  </span>
                ) : (
                  <span className="flex">
                    <button type="button" onClick={() => setForm({ id: c.id, name: c.name, level: c.level, script: c.script, letter_mode: c.letter_mode })} aria-label={`Modifică ${c.name}`} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button type="button" onClick={() => setConfirm(c.id)} aria-label={`Șterge ${c.name}`} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><Trash2 className="w-4 h-4 text-slate-400" /></button>
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => sheet(c)} className="h-9 px-3 rounded-lg border-2 border-ink text-sm font-bold text-ink hover:bg-paper">Fișă nouă</button>
                <button type="button" onClick={() => nameBook(c)} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border-2 border-slate-300 text-sm font-bold text-ink hover:border-ink"><UserRound className="w-4 h-4" aria-hidden /> Caietul cu numele</button>
                <button type="button" onClick={() => workbook(c)} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border-2 border-slate-300 text-sm font-bold text-ink hover:border-ink"><Library className="w-4 h-4" aria-hidden /> Caiet de litere</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <form className="rounded-xl border-2 border-ink p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div>
            <label htmlFor="child-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Prenumele</label>
            <input id="child-name" autoFocus value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex. Ana" autoComplete="off"
              className="w-full h-11 px-3 rounded-xl border border-slate-300" />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Nivel">
            {(Object.keys(LEVELS) as Difficulty[]).map((l) => <button key={l} type="button" onClick={() => setForm({ ...form, level: l })} aria-pressed={form.level === l} className={pill(form.level === l)}>{LEVELS[l]}</button>)}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Litere">
            <button type="button" onClick={() => setForm({ ...form, script: 'print' })} aria-pressed={form.script === 'print'} className={pill(form.script === 'print')}>De tipar</button>
            <button type="button" onClick={() => setForm({ ...form, script: 'cursive' })} aria-pressed={form.script === 'cursive'} className={pill(form.script === 'cursive')}>De mână (clasa I)</button>
          </div>
          {form.script === 'print' && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Ce litere">
              {(Object.keys(MODES) as LetterMode[]).map((m) => <button key={m} type="button" onClick={() => setForm({ ...form, letter_mode: m })} aria-pressed={form.letter_mode === m} className={pill(form.letter_mode === m)}>{MODES[m]}</button>)}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={!form.name.trim()} className="h-10 px-4 rounded-xl bg-ink text-white font-bold disabled:opacity-50">Salvează</button>
            <button type="button" onClick={() => setForm(null)} className="h-10 px-4 rounded-xl border border-slate-300">Renunță</button>
          </div>
          <p className="text-xs text-slate-500">Păstrăm doar prenumele și nivelul, ca să faci fișele mai repede. Le poți șterge oricând.</p>
        </form>
      ) : (
        <button type="button" onClick={() => setForm({ name: '', level: 'beginner', script: 'print', letter_mode: 'uppercase' })}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border-2 border-dashed border-slate-400 font-bold text-ink hover:border-ink">
          <Plus className="w-4 h-4" aria-hidden /> Adaugă un copil
        </button>
      )}
    </div>
  );
}
