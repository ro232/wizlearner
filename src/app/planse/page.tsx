'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, Download, Grid3x3, LayoutGrid, Printer, Sun, Type, CircleDot, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { DownloadError } from '@/components/worksheet/download-error';
import { ForeignLettersNote } from '@/components/worksheet/foreign-letters-note';
import { SaveProjectButton } from '@/components/projects/save-project-button';
import { pagini } from '@/components/worksheet/plural';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useDownload } from '@/hooks/use-download';
import { downloadPagesPdf, printPagesPdf } from '@/lib/pdf/actions';
import { track } from '@/lib/analytics';
import { logDownload, takeProject } from '@/lib/projects';
import { ALPHABETS } from '@/lib/glyphs/data';
import { parseNameList, MAX_CHILDREN } from '@/lib/worksheet/group';
import {
  DEFAULT_PRINTABLE, FREE_LETTERS, PRINTABLE_IDS, PRINTABLE_KINDS, PRINTABLE_TITLES, allowedPrintable, buildPrintablePages, printableCount, printableTitle, sanitizePrintable,
  type PrintableKind, type PrintableSettings,
} from '@/lib/printables';
import { CARD_SET_TITLES, type CardSet } from '@/lib/printables/cards';
import { DIPLOMAS, diplomaById } from '@/lib/printables/diplomas';
import type { DiplomaText } from '@/lib/printables/diplomas';

const PRODUCTS: { kind: PrintableKind; icon: typeof Type; sub: string }[] = [
  { kind: 'alphabet', icon: Type, sub: 'o literă pe pagină, cu imagine' },
  { kind: 'cards', icon: LayoutGrid, sub: 'litere, silabe, imagini, numere' },
  { kind: 'tokens', icon: CircleDot, sub: 'numere, semne, litere' },
  { kind: 'diploma', icon: Award, sub: 'cu numele fiecărui copil' },
  { kind: 'timetable', icon: Grid3x3, sub: 'de completat de mână' },
  { kind: 'today', icon: Sun, sub: 'ziua, data, vremea' },
];

const label = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2';
const pill = (on: boolean) => `min-h-10 px-2 py-1.5 rounded-lg border text-sm font-bold text-center ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-ink hover:border-brand'}`;
const field = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-line';

function Choice<T extends string | number | boolean>({ title, value, options, onChange }: { title: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <span className={label}>{title}</span>
      <div className={`grid gap-2 ${options.length > 3 ? 'grid-cols-2 sm:grid-cols-3' : options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} role="group" aria-label={title}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" onClick={() => onChange(v)} aria-pressed={value === v} className={pill(value === v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * „Planșe pentru clasă”: the alphabet on the wall, cards and tokens to cut out, diplomas for the
 * whole group, the timetable and the „Ziua de azi” board, each a PDF made here in the browser.
 *
 * The names on the diplomas and the other texts typed for them (teacher, school, date, a title of
 * one's own) only live in this page: they are not stored (not even in this browser), not sent, not
 * in analytics, not in a saved project or the download history — those get the settings alone
 * (sanitizePrintable). What the free plan downloads: see allowedPrintable in src/lib/printables.
 */
export default function PrintablesPage() {
  const tier = useWorksheetStore((s) => s.tier);
  const [s, setS] = useState<PrintableSettings>({ ...DEFAULT_PRINTABLE, letters: [...ALPHABETS.ro] });
  const [namesText, setNamesText] = useState('');
  const [teacher, setTeacher] = useState('');
  const [school, setSchool] = useState('');
  const [date, setDate] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const { busy: busyWith, error, run } = useDownload<'download' | 'print'>();
  const busy = busyWith !== null;
  const set = (patch: Partial<PrintableSettings>) => setS((cur) => ({ ...cur, ...patch }));

  // reopened from the account (settings only), or opened on one product (/planse?p=diplome)
  useEffect(() => {
    const saved = takeProject<unknown>('printable');
    if (saved) return setS(sanitizePrintable(saved));
    const p = new URLSearchParams(window.location.search).get('p');
    const kind = PRINTABLE_KINDS.find((k) => PRINTABLE_IDS[k] === p);
    if (kind) set({ kind });
  }, []);
  useEffect(() => setPageIndex(0), [s.kind, s.cardSet]);

  const list = useMemo(() => parseNameList(namesText), [namesText]);
  const text: DiplomaText = useMemo(
    () => ({ names: list.names, teacher, school, date, customTitle, customReason }),
    [list.names, teacher, school, date, customTitle, customReason],
  );
  const allowed = useMemo(() => allowedPrintable(s, text, tier), [s, text, tier]);
  // the preview shows what the button downloads; when nothing of it is free, the whole thing
  const pages = useMemo(() => (allowed ? buildPrintablePages(allowed.settings, allowed.text, tier) : buildPrintablePages(s, text, tier)), [allowed, s, text, tier]);
  const count = allowed ? printableCount(allowed.settings, allowed.text) : printableCount(s, text);

  const usesLetters = s.kind === 'alphabet' || (s.kind === 'cards' && ['letters', 'syllables', 'pictures'].includes(s.cardSet));
  const kindTitle = PRINTABLE_TITLES[s.kind];

  const go = (what: 'download' | 'print') => {
    if (!allowed) return setShowPaywall(true);
    void run(what, async () => {
      const id = PRINTABLE_IDS[s.kind];
      track('printable_download', { kind: id, format: what === 'print' ? 'print' : 'pdf', tier, pages: pages.length, count, named: s.kind === 'diploma' && list.names.length > 0 });
      // the history keeps how it was made, never the names or the typed texts
      void logDownload('printable', printableTitle(allowed.settings), sanitizePrintable(allowed.settings), pages.length);
      if (what === 'print') return printPagesPdf(pages);
      await downloadPagesPdf(pages, `${s.kind === 'diploma' ? (count > 1 ? 'diplome' : 'diploma') : `planse-${id}`}.pdf`);
      if (allowed.partial && s.kind === 'diploma') return 'Gata: diploma pentru primul nume din listă.';
      if (allowed.partial) return `Gata: ${pagini(pages.length)}, cu literele gratuite.`;
      return `${kindTitle}: gata, ${pagini(pages.length)}.`;
    });
  };

  const toggleLetter = (l: string) => set({ letters: s.letters.includes(l) ? s.letters.filter((x) => x !== l) : ALPHABETS.ro.filter((x) => x === l || s.letters.includes(x)) });
  const diploma = diplomaById(s.diploma);
  const freeNote =
    tier !== 'free' ? null
    : !allowed ? `${kindTitle}${s.kind === 'cards' ? ` (${CARD_SET_TITLES[s.cardSet].toLocaleLowerCase('ro')})` : ''} face parte din varianta completă. Previzualizarea e gratuită.`
    : allowed.partial && s.kind === 'diploma' ? `Gratuit descarci diploma primului copil din listă. Diplome pentru toată grupa: varianta completă.`
    : allowed.partial ? `Gratuit descarci literele ${FREE_LETTERS.join(', ')}. Tot alfabetul face parte din varianta completă.`
    : null;

  const buttonText =
    busyWith === 'download' ? 'Se pregătește…'
    : !allowed ? 'Descarcă (varianta completă)'
    : s.kind === 'diploma' ? (count > 1 ? `Descarcă ${count} diplome` : 'Descarcă diploma')
    : `Descarcă PDF (${pagini(pages.length)})`;

  return (
    <div className="min-h-screen bg-white">
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <Navbar />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 [&>*]:min-w-0">
        <section className="space-y-6">
          <div>
            <p className="inline-block font-bold text-[13px] tracking-[0.12em] uppercase text-pen border-b border-brand pb-1">Pentru clasă și grupă</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-ink">Planșe, cartonașe și diplome</h1>
            <p className="mt-2 text-slate-700">
              Alfabetul pentru peretele clasei, cartonașe și jetoane de decupat, diplome cu numele fiecărui copil, orarul și panoul „Ziua de azi”.
              Alegi, vezi pagina și descarci PDF-ul gata de printat.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label="Ce faci">
            {PRODUCTS.map(({ kind, icon: Icon, sub }) => (
              <button key={kind} type="button" onClick={() => set({ kind })} aria-pressed={s.kind === kind}
                className={`p-3 rounded-xl border text-left min-w-0 ${s.kind === kind ? 'border-brand bg-brand-soft' : 'border-slate-300 bg-white hover:border-brand'}`}>
                <Icon className="w-5 h-5 text-pen" aria-hidden />
                <div className="mt-1 font-bold text-ink leading-tight">{PRINTABLE_TITLES[kind]}</div>
                <div className="text-xs text-slate-600 leading-snug">{sub}</div>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-line p-5 sm:p-6 space-y-5">
            {s.kind === 'cards' && (
              <Choice title="Cartonașe cu" value={s.cardSet} onChange={(v: CardSet) => set({ cardSet: v, letters: v === 'syllables' ? [] : s.letters.length ? s.letters : [...ALPHABETS.ro] })}
                options={(Object.keys(CARD_SET_TITLES) as CardSet[]).map((k) => [k, CARD_SET_TITLES[k]])} />
            )}

            {usesLetters && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{s.kind === 'cards' && s.cardSet === 'syllables' ? 'Literele învățate' : 'Literele'}</span>
                  <span className="flex flex-wrap gap-3 text-xs font-bold">
                    <button type="button" onClick={() => set({ letters: [...ALPHABETS.ro] })} className="underline underline-offset-2 text-ink hover:text-brand">Toate</button>
                    <button type="button" onClick={() => set({ letters: [...FREE_LETTERS] })} className="underline underline-offset-2 text-ink hover:text-brand">A–E{tier === 'free' ? ' (gratuit)' : ''}</button>
                    {s.kind === 'cards' && s.cardSet === 'syllables' && (
                      <button type="button" onClick={() => set({ letters: [] })} className="underline underline-offset-2 text-ink hover:text-brand">Cele mai folosite silabe</button>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-11 gap-1">
                  {ALPHABETS.ro.map((l) => (
                    <button key={l} type="button" onClick={() => toggleLetter(l)} aria-pressed={s.letters.includes(l)} className={`h-9 text-sm rounded-lg border font-bold ${s.letters.includes(l) ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-ink hover:border-brand'}`}>{l}</button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  {s.kind === 'cards' && s.cardSet === 'syllables'
                    ? s.letters.length ? 'Fiecare consoană aleasă cu fiecare vocală aleasă (MA, ME, MU…).' : 'Nicio literă aleasă: cele mai folosite silabe din cuvintele copiilor.'
                    : !s.letters.length ? 'Nicio literă aleasă: tot alfabetul.' : `${count} ${s.kind === 'alphabet' ? (count === 1 ? 'planșă' : 'planșe') : count === 1 ? 'cartonaș' : 'cartonașe'}.`}
                </p>
              </div>
            )}

            {s.kind === 'alphabet' && (
              <>
                <Choice title="Literele" value={s.script} onChange={(v) => set({ script: v })} options={[['print', 'de tipar'], ['cursive', 'de mână']]} />
                <Choice title="Culori" value={s.ink} onChange={(v) => set({ ink: v })} options={[['color', 'colorat'], ['outline', 'contur (de colorat)']]} />
                <Choice title="Chenar" value={s.border} onChange={(v) => set({ border: v })} options={[['simple', 'linie dublă'], ['dots', 'buline'], ['none', 'fără']]} />
                {s.script === 'print' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={s.strokeOrder} onChange={() => set({ strokeOrder: !s.strokeOrder })} className="w-4 h-4" />
                    <span className="text-sm text-slate-700">Cu ordinea liniilor (puncte de start și săgeți)</span>
                  </label>
                )}
              </>
            )}

            {s.kind === 'cards' && (
              <>
                {(s.cardSet === 'letters' || s.cardSet === 'pictures') && (
                  <Choice title="Scris" value={s.script} onChange={(v) => set({ script: v })} options={[['print', 'de tipar'], ['cursive', 'de mână']]} />
                )}
                {(s.cardSet === 'syllables' || (s.cardSet === 'pictures' && s.script === 'print')) && (
                  <Choice title="Litere" value={s.letterCase} onChange={(v) => set({ letterCase: v })} options={[['upper', 'MARI'], ['lower', 'mici']]} />
                )}
                {s.cardSet === 'digits' && (
                  <>
                    <Choice title="Numerele" value={s.numberMax === 10 ? 10 : 20} onChange={(v) => set({ numberMax: v })} options={[[10, '0–10'], [20, '0–20']]} />
                    <Choice title="În căsuțe" value={s.objects} onChange={(v) => set({ objects: v })} options={[[false, 'buline'], [true, 'obiecte']]} />
                  </>
                )}
                {s.cardSet === 'numbers' && (
                  <Choice title="Numerele" value={s.numberMax} onChange={(v) => set({ numberMax: v })} options={[[10, '0–10'], [20, '0–20'], [100, '0–100']]} />
                )}
                <Choice title="Pe o pagină" value={s.perPage} onChange={(v) => set({ perPage: v })} options={[[8, '8 cartonașe mari'], [12, '12 cartonașe']]} />
                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-300 bg-paper p-3">
                  <input type="checkbox" checked={s.backs} onChange={() => set({ backs: !s.backs })} className="mt-1 w-4 h-4" />
                  <span>
                    <span className="block font-bold text-ink">Cu spatele cartonașelor</span>
                    <span className="block text-sm text-slate-600">După fiecare pagină, spatele ei: ce e pe cartonaș, scris mic, pentru cel care îl arată. Printează față-verso, cu întoarcere pe latura lungă.</span>
                  </span>
                </label>
              </>
            )}

            {s.kind === 'tokens' && (
              <>
                <Choice title="Jetoane cu" value={s.tokenSet} onChange={(v) => set({ tokenSet: v })} options={[['math', 'numere și semne'], ['letters', 'litere']]} />
                <Choice title="Forma" value={s.tokenShape} onChange={(v) => set({ tokenShape: v })} options={[['round', 'rotunde'], ['square', 'pătrate']]} />
                {s.tokenSet === 'math'
                  ? <Choice title="Numerele" value={s.numberMax === 10 ? 10 : 20} onChange={(v) => set({ numberMax: v })} options={[[10, '0–10, de două ori'], [20, '0–20']]} />
                  : <Choice title="Litere" value={s.letterCase} onChange={(v) => set({ letterCase: v })} options={[['upper', 'MARI'], ['lower', 'mici']]} />}
                <p className="text-xs text-slate-600">{s.tokenSet === 'math' ? 'Cu semnele + − = < > pentru exerciții.' : 'Vocalele roșii, consoanele albastre, ca în abecedar. Vocalele și literele des folosite de mai multe ori.'}</p>
              </>
            )}

            {s.kind === 'diploma' && (
              <>
                <div>
                  <label htmlFor="diploma-kind" className={label}>Diploma</label>
                  <select id="diploma-kind" value={s.diploma} onChange={(e) => set({ diploma: e.target.value as PrintableSettings['diploma'] })} className={`${field} font-bold text-ink`}>
                    {DIPLOMAS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                  {diploma.titleF && (
                    <label className="mt-2 flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={s.feminine} onChange={() => set({ feminine: !s.feminine })} className="w-4 h-4" />
                      <span className="text-sm text-slate-700">Pentru fete: „{diploma.titleF}”</span>
                    </label>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="diploma-names" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"><Users className="w-3.5 h-3.5" aria-hidden /> Numele copiilor</label>
                    <span className="text-xs text-slate-600">{list.names.length ? `${list.names.length} ${list.names.length === 1 ? 'diplomă' : 'diplome'}` : 'fără nume: se scrie de mână'}</span>
                  </div>
                  <textarea id="diploma-names" rows={4} value={namesText} onChange={(e) => setNamesText(e.target.value)} placeholder={'Ana Popescu\nȘtefan\nMaria-Ioana'} autoComplete="off" className={`${field} text-sm`} />
                  <p className="mt-1 text-[11px] text-slate-600">
                    Câte un nume pe rând (merge și copiat din catalog). O diplomă pentru fiecare nume, cel mult {MAX_CHILDREN}.
                    {tier === 'free' && ' Gratuit: diploma primului copil.'} Numele nu se salvează și nu pleacă din browserul tău.
                  </p>
                  <ForeignLettersNote names={list.names} className="mt-2" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="diploma-teacher" className={label}>Cadrul didactic</label>
                    <input id="diploma-teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="ex. Prof. Ioana Marin" autoComplete="off" maxLength={60} className={field} />
                  </div>
                  <div>
                    <label htmlFor="diploma-date" className={label}>Data</label>
                    <div className="flex gap-2">
                      <input id="diploma-date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="ex. 13 iunie 2027" autoComplete="off" maxLength={30} className={`${field} min-w-0`} />
                      <button type="button" onClick={() => setDate(new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }))} className="shrink-0 px-3 rounded-xl border border-slate-300 text-sm font-bold text-ink hover:border-brand" title="Data de azi">
                        <CalendarDays className="w-4 h-4" aria-hidden /><span className="sr-only">Data de azi</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="diploma-school" className={label}>Școala sau grădinița, grupa</label>
                  <input id="diploma-school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="ex. Grădinița nr. 12, grupa mare Fluturașii" autoComplete="off" maxLength={90} className={field} />
                </div>
                <details className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-ink">Alt titlu sau alt text</summary>
                  <div className="mt-3 space-y-3">
                    <input aria-label="Titlul diplomei" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={s.feminine && diploma.titleF ? diploma.titleF : diploma.title} maxLength={50} className={field} />
                    <textarea aria-label="Textul de sub nume" rows={2} value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder={diploma.reason} maxLength={160} className={`${field} text-sm`} />
                  </div>
                </details>
                <Choice title="Numele scris" value={s.nameScript} onChange={(v) => set({ nameScript: v })} options={[['cursive', 'de mână'], ['print', 'de tipar']]} />
                <Choice title="Chenar" value={s.border} onChange={(v) => set({ border: v })} options={[['simple', 'auriu'], ['dots', 'stele colorate'], ['none', 'simplu']]} />
              </>
            )}

            {s.kind === 'timetable' && (
              <>
                <Choice title="Ore pe zi" value={s.lessons} onChange={(v) => set({ lessons: v })} options={[[4, '4'], [5, '5'], [6, '6'], [7, '7']]} />
                <Choice title="Chenar" value={s.border} onChange={(v) => set({ border: v })} options={[['simple', 'linie dublă'], ['dots', 'buline'], ['none', 'fără']]} />
              </>
            )}
            {s.kind === 'today' && (
              <>
                <p className="text-sm text-slate-700">Pentru întâlnirea de dimineață: copiii încercuiesc (sau prind cu o clamă) ziua, vremea și anotimpul, și scriu data.</p>
                <Choice title="Chenar" value={s.border} onChange={(v) => set({ border: v })} options={[['simple', 'linie dublă'], ['dots', 'buline'], ['none', 'fără']]} />
              </>
            )}

            {freeNote && (
              <p className="text-sm text-slate-700" data-free-note>
                {freeNote}{' '}
                <button type="button" onClick={() => setShowPaywall(true)} className="font-bold text-brand underline decoration-brand/30 underline-offset-2">Vezi varianta completă</button>
              </p>
            )}
            <DownloadError message={error} />
            {/* the row wraps: on a 360 px phone the buttons do not fit side by side */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => go('download')} disabled={busy} className="flex-1 basis-48 min-w-0 min-h-12 h-auto py-2 whitespace-normal rounded-2xl text-white font-bold disabled:opacity-50" data-btn="primary">
                <Download className="w-5 h-5 mr-2 shrink-0" aria-hidden /> {buttonText}
              </Button>
              <SaveProjectButton kind="printable" name={printableTitle(s)} configuration={sanitizePrintable(s)} onPaywall={() => setShowPaywall(true)} back="/planse" />
              <Button variant="outline" onClick={() => go('print')} disabled={busy} className="h-12 px-4 rounded-2xl border" aria-label="Printează">
                <Printer className="w-5 h-5" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <h2 className="font-bold text-ink text-base">Sfaturi de printat</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Planșele și diplomele arată cel mai bine pe hârtie mai groasă (160–200 g). Varianta „contur” economisește cerneala și copiii o pot colora.</li>
              <li>Cartonașele și jetoanele se decupează pe liniile punctate; laminate, țin tot anul.</li>
              <li>Printează la „mărime reală” (100%), nu „potrivit în pagină”.</li>
            </ul>
          </div>
        </section>

        <section aria-label="Previzualizare" className="lg:sticky lg:top-24 lg:self-start space-y-2">
          <p className="text-sm font-semibold text-slate-700">{kindTitle}: {pagini(pages.length)}</p>
          <div className="desk rounded-2xl border border-line p-4 sm:p-8 flex justify-center">
            <PagesPreview pages={pages} width={pages[0] && pages[0].width > pages[0].height ? 520 : 420} pageLabel="Pagina" pageIndex={pageIndex} onPageChange={setPageIndex} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
