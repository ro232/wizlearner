'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Loader2, Lock } from 'lucide-react';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { DownloadError } from '@/components/worksheet/download-error';
import { pagini } from '@/components/worksheet/plural';
import { useDownload } from '@/hooks/use-download';
import { downloadPagesPdf } from '@/lib/pdf/actions';
import { track } from '@/lib/analytics';
import { defaultSheetName } from '@/lib/worksheet/saved';
import { themeById } from '@/lib/themes';
import { HOMEWORK_NAME_MAX, homeworkChildName, homeworkPages } from '@/lib/homework/pages';
import { LEVEL_LABEL, type Homework } from '@/lib/homework/shared';
import { BRAND_NAME } from '@/lib/brand';

const DATE = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' });

/** What the sheet holds, in a few words („Litere: A, M, Ș” / „Litere: M, A · Toamna”). */
function contents(hw: Homework): string {
  if (hw.kind === 'sheet') return defaultSheetName(hw.config);
  const theme = themeById(hw.group.themeId);
  const parts = [hw.group.letters.length ? `Litere: ${hw.group.letters.join(', ')}` : 'Numele copilului', theme ? `Tema: ${theme.title}` : ''];
  return parts.filter(Boolean).join(' · ');
}

/**
 * The parent's side of a homework link. The name typed here is used only in this browser: it is
 * drawn into the preview and the PDF on the phone and is not sent anywhere, not even to analytics
 * (which gets only whether a name was typed).
 */
export function HomeworkDownload({ homework }: { homework: Homework }) {
  const [name, setName] = useState('');
  const shownName = useDeferredValue(name);
  const pages = useMemo(() => homeworkPages(homework, shownName), [homework, shownName]);
  const { busy, error, run } = useDownload();
  const category = homework.kind === 'sheet' ? homework.config.category : 'letters';

  const download = () =>
    run('download', async () => {
      const childName = homeworkChildName(name);
      const all = homeworkPages(homework, childName);
      track('homework_download', { kind: homework.kind, category, level: homework.level?.toLowerCase(), pages: all.length, named: !!childName });
      await downloadPagesPdf(all, `Tema${childName ? `-${childName}` : ''}-${BRAND_NAME}.pdf`);
      return childName ? `Fișa lui ${childName} e descărcată. Spor la lucru!` : 'Fișa e descărcată. Spor la lucru!';
    });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
      <p className="font-extrabold text-[12px] tracking-[0.12em] uppercase text-pen">Temă pentru acasă</p>
      <h1 className="mt-1 text-[28px] sm:text-4xl font-extrabold leading-tight text-ink break-words">{homework.title || 'Fișa de lucru de azi'}</h1>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
        {homework.level && (
          <div className="flex gap-1"><dt className="sr-only">Clasa</dt><dd className="font-bold text-ink">{LEVEL_LABEL[homework.level]}</dd></div>
        )}
        <div className="flex gap-1"><dt className="sr-only">Conținut</dt><dd>{contents(homework)}</dd></div>
        <div className="flex gap-1"><dt className="sr-only">Pagini</dt><dd>{pagini(pages.length)}</dd></div>
      </dl>

      <div className="mt-5 rounded-2xl border-2 border-ink desk p-4 flex justify-center">
        <PagesPreview pages={pages} width={300} pageLabel="Pagina" />
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void download();
        }}
      >
        <div>
          <label htmlFor="child-name" className="block text-sm font-extrabold text-ink">
            Numele copilului <span className="font-semibold text-slate-600">(opțional, rămâne doar pe telefonul tău)</span>
          </label>
          <input
            id="child-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={HOMEWORK_NAME_MAX}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="ex. Ana"
            className="mt-2 w-full h-14 px-4 rounded-xl border-2 border-ink bg-white text-lg font-bold text-ink placeholder:text-slate-400 placeholder:font-semibold focus:outline-none focus:ring-4 focus:ring-pencil/60"
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
            <Lock className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
            Numele apare doar pe fișă. Nu este trimis nicăieri: fișa se face aici, pe telefon.
          </p>
        </div>

        <DownloadError message={error} />
        <button type="submit" disabled={busy !== null} data-btn="primary" className="w-full h-16 rounded-xl text-lg inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden /> : <Download className="w-6 h-6" aria-hidden />}
          {busy ? 'Se pregătește…' : 'Descarcă fișa (PDF)'}
        </button>
        <p className="text-center text-xs text-slate-600">Gratuit, fără cont. Linkul funcționează până pe {DATE.format(new Date(homework.expiresAt))}.</p>
      </form>

      <p className="mt-10 pt-5 border-t border-slate-300 text-center text-sm text-slate-600">
        Fișă trimisă de cadrul didactic prin {BRAND_NAME}.{' '}
        <Link href="/generator" className="font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">Fă și tu o fișă</Link>
      </p>
    </div>
  );
}
