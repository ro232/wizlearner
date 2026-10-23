'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Download, FileText, Image as ImageIcon, Eye } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PagesPreview } from '@/components/worksheet/pages-preview';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { buildBookPages, DEFAULT_BOOK_CONFIG, type BookConfig } from '@/lib/book/interior';
import { buildCoverPage } from '@/lib/book/cover';
import { coverGeometry, interiorMargins, TRIM_SIZES, PAPER_LABELS, type TrimKey, type PaperKey } from '@/lib/book/spec';
import { downloadBookInterior, downloadBookCover } from '@/lib/pdf/generate-book';
import { PATTERN_IDS } from '@/lib/glyphs/patterns';
import { ALPHABETS } from '@/lib/glyphs/data';

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider';

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-slate-300 cursor-pointer" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

export default function BookPage() {
  const tier = useWorksheetStore((s) => s.tier);
  const [config, setConfig] = useState<BookConfig>({ ...DEFAULT_BOOK_CONFIG });
  const [view, setView] = useState<'interior' | 'cover'>('interior');
  const [busy, setBusy] = useState<'interior' | 'cover' | null>(null);

  const effective = useMemo<BookConfig>(() => ({ ...config, watermark: tier !== 'full' }), [config, tier]);
  const pages = useMemo(() => buildBookPages(effective), [effective]);
  const cover = useMemo(() => buildCoverPage(effective, pages.length), [effective, pages.length]);
  const geometry = coverGeometry(effective.trim, pages.length, effective.paper);
  const margins = interiorMargins(pages.length, effective.bleed);
  const letterCount = ALPHABETS[effective.alphabet].length;

  const set = <K extends keyof BookConfig>(key: K, value: BookConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));
  const flip = (key: keyof BookConfig) => setConfig((c) => ({ ...c, [key]: !c[key] }));

  const run = async (what: 'interior' | 'cover') => {
    setBusy(what);
    try {
      if (what === 'interior') await downloadBookInterior(effective);
      else await downloadBookCover(effective, pages.length);
    } catch (err) {
      console.error('Book PDF failed', err);
    } finally {
      setBusy(null);
    }
  };

  const mm = (v: number) => `${v.toFixed(1)} mm`;
  const inch = (v: number) => `${(v / 25.4).toFixed(2)} in`;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: settings */}
          <div className="lg:w-[42%] space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-full bg-white rounded-2xl shadow-lg p-6 space-y-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" aria-hidden /> Caiet pentru Amazon KDP
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Un caiet de scris complet, gata de încărcat pe Amazon KDP.</p>
                </div>
                {tier !== 'full' && <Badge variant="secondary">Cu filigran (planul Complet îl scoate)</Badge>}
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Titlu</label>
                <input className={inputClass} value={config.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Subtitlu</label>
                <input className={inputClass} value={config.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className={labelClass}>Autor / brand</label>
                  <input className={inputClass} value={config.author} onChange={(e) => set('author', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>An</label>
                  <input className={inputClass} type="number" value={config.year} onChange={(e) => set('year', Number(e.target.value) || new Date().getFullYear())} />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Alfabet</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'ro' as const, label: 'Română', display: 'A Ă Â Î Ș Ț · 31 litere' },
                    { value: 'en' as const, label: 'Engleză', display: 'A–Z · 26 litere' },
                  ].map(({ value, label, display }) => (
                    <button
                      key={value}
                      onClick={() => set('alphabet', value)}
                      className={`p-2 rounded-lg border-2 transition-all text-center ${
                        config.alphabet === value ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold">{label}</div>
                      <div className="text-xs text-slate-600">{display}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className={labelClass}>Format</label>
                  <select className={inputClass} value={config.trim} onChange={(e) => set('trim', e.target.value as TrimKey)}>
                    {(Object.keys(TRIM_SIZES) as TrimKey[]).map((k) => (
                      <option key={k} value={k}>
                        {TRIM_SIZES[k].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Hârtie</label>
                  <select className={inputClass} value={config.paper} onChange={(e) => set('paper', e.target.value as PaperKey)}>
                    {(Object.keys(PAPER_LABELS) as PaperKey[]).map((k) => (
                      <option key={k} value={k}>
                        {PAPER_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Stil de trasare</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dashed', 'dotted', 'outline'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => set('variant', v)}
                      className={`p-2 rounded-lg border-2 transition-all text-center capitalize text-sm font-bold ${
                        config.variant === v ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {{ dashed: 'Liniuțe', dotted: 'Puncte', outline: 'Contur' }[v]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Numere până la</label>
                  <Badge variant="secondary">{config.numbersMax}</Badge>
                </div>
                <input type="range" min="5" max="20" value={config.numbersMax} onChange={(e) => set('numbersMax', Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
              </div>

              <div className="space-y-1 pt-3 border-t border-slate-200">
                <Toggle label={`Exerciții grafice (${PATTERN_IDS.length} pagini)`} checked={config.includePrewriting} onChange={() => flip('includePrewriting')} />
                <Toggle label={`Literele, câte o pagină (${letterCount} pagini)`} checked={config.includeLetters} onChange={() => flip('includeLetters')} />
                <Toggle label={`Cifre și numere 0–${config.numbersMax} (${config.numbersMax + 1} pagini)`} checked={config.includeNumbers} onChange={() => flip('includeNumbers')} />
                <Toggle label="Pagini de recapitulare" checked={config.includeReview} onChange={() => flip('includeReview')} />
                <Toggle label="Diplomă la final" checked={config.includeCertificate} onChange={() => flip('includeCertificate')} />
                <Toggle label="Bleed (doar dacă desenele ajung la marginea foii)" checked={config.bleed} onChange={() => flip('bleed')} />
              </div>
            </div>
          </div>

          {/* RIGHT: stats + preview + downloads */}
          <div className="lg:w-[58%] lg:sticky lg:top-20 lg:self-start space-y-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <Card className="shadow-md bg-white">
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Pagini</div>
                  <div className="text-2xl font-bold text-blue-700">{pages.length}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Cotor</div>
                  <div className="font-semibold text-slate-800">{mm(geometry.spine)}</div>
                  <div className="text-xs text-slate-500">{inch(geometry.spine)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Fișier copertă</div>
                  <div className="font-semibold text-slate-800">
                    {inch(geometry.width)} × {inch(geometry.height)}
                  </div>
                  <div className="text-xs text-slate-500">cu bleed 0.125 in</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Margine cotor / exterior</div>
                  <div className="font-semibold text-slate-800">
                    {mm(margins.inside)} / {mm(margins.outside)}
                  </div>
                  <div className="text-xs text-slate-500">peste minimul KDP</div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
              <CardHeader className="py-3.5 px-5 border-b" style={{ background: 'rgba(248,250,252,0.8)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF', color: '#2E5C8A' }}>
                      <Eye className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Previzualizare</span>
                  </div>
                  <div className="flex gap-1">
                    {(['interior', 'cover'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${view === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {v === 'interior' ? 'Interior' : 'Copertă'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex justify-center desk">
                {view === 'interior' ? (
                  <PagesPreview pages={pages} width={420} pageLabel="Pagina" />
                ) : (
                  <PagesPreview pages={[cover]} width={640} />
                )}
              </CardContent>
            </Card>

            <div className="grid sm:grid-cols-2 gap-3">
              <Button
                onClick={() => run('interior')}
                disabled={busy !== null}
                className="h-14 rounded-2xl text-white shadow-xl font-bold text-base disabled:opacity-50"
                data-btn="primary"
              >
                <FileText className="w-5 h-5 mr-2" />
                {busy === 'interior' ? 'Se pregătește…' : `PDF interior (${pages.length} pagini)`}
              </Button>
              <Button
                onClick={() => run('cover')}
                disabled={busy !== null}
                className="h-14 rounded-2xl text-white shadow-xl font-bold text-base disabled:opacity-50"
                data-btn="ink"
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                {busy === 'cover' ? 'Se pregătește…' : 'PDF copertă (față, cotor, spate)'}
              </Button>
            </div>
            <p className="text-xs text-slate-500 flex items-start gap-2">
              <Download className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              În KDP încarci interiorul și coperta ca două PDF-uri separate. Grosimea cotorului e calculată din numărul de pagini și
              tipul hârtiei; colțul din dreapta-jos al spatelui rămâne liber pentru codul de bare. Verifică-le în KDP Print Previewer
              înainte de publicare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
