import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CLASS_PAGES, coverageCount, headlineItems } from '@/lib/curriculum/presets';
import { landingPage } from '@/lib/seo/landing';
import { countOf } from '@/components/worksheet/plural';

/** The topics each class card shows: slugs of /fise-de-lucru/[clasa]/[subiect] (a test checks they exist). */
export const CLASS_TOPICS: Record<string, string[]> = {
  gradinita: ['grafisme', 'sunetul-initial', 'labirint', 'anotimpurile'],
  'clasa-pregatitoare': ['litere-de-tipar', 'despartirea-in-silabe', 'adunari', 'bani'],
  'clasa-1': ['litere-de-mana', 'citire', 'ceasul', 'probleme'],
  'clasa-2': ['tabla-inmultirii', 'impartiri', 'citire', 'calendarul'],
  'clasa-3': ['ortograme', 'compunere', 'cifre-romane', 'fractii'],
  'clasa-4': ['partile-de-vorbire', 'texte-functionale', 'ordinea-operatiilor', 'perimetrul'],
};

/** Shorter names for the small chips, where the topic's own label is long. */
const CHIP_LABEL: Record<string, string> = { anotimpurile: 'Anotimpuri', calendarul: 'Calendarul', 'despartirea-in-silabe': 'Silabe' };

/** The big mark in the corner of each card, as the class is written on a school notebook. */
const MARK: Record<string, string> = { gradinita: '3–6', 'clasa-pregatitoare': 'P', 'clasa-1': 'I', 'clasa-2': 'II', 'clasa-3': 'III', 'clasa-4': 'IV' };

export function ClassPicker() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {CLASS_PAGES.map((c) => {
        // limba română and matematică (presets.ts HEADLINE_PROGRAMMES): the other subjects are counted on the class page
        const { covered, total } = coverageCount(headlineItems(c));
        const presc = c.level === 'presc';
        const topics = (CLASS_TOPICS[c.slug] ?? []).map((t) => landingPage(c.slug, t)).filter((p) => !!p);
        return (
          <li key={c.slug} className="relative flex flex-col rounded-2xl border-2 border-ink bg-white p-5 shadow-[4px_4px_0_#1F2A44]">
            <span className="absolute top-3.5 right-4 font-display text-[30px] font-extrabold leading-none text-pen/90 select-none" aria-hidden>
              {MARK[c.slug]}
            </span>
            <h3 className="pr-12 text-[22px] leading-tight font-extrabold text-ink">
              <Link href={`/programa/${c.slug}`} className="hover:underline decoration-pen decoration-2 underline-offset-4">{c.title}</Link>
            </h3>
            <p className="mt-1 text-sm text-slate-600">{presc ? 'Curriculum pentru educație timpurie' : c.level === 'III' || c.level === 'IV' ? 'Limba și literatura română, matematică' : 'Limba română, matematică și mediu'}</p>

            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`Teme ${c.at}`}>
              {topics.map((p) => (
                <li key={p.path}>
                  <Link href={p.path} className="inline-flex items-center min-h-9 rounded-lg border-2 border-ink/20 bg-paper px-2.5 text-sm font-bold text-ink hover:border-ink">
                    {CHIP_LABEL[p.topic.slug] ?? p.topic.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-5">
              <p className="text-sm text-slate-700">
                Fișe pentru <strong className="text-ink">{covered} din {countOf(total, presc ? 'comportament' : 'competență', presc ? 'comportamente' : 'competențe')}</strong>
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-rule overflow-hidden" aria-hidden>
                <div className="h-full bg-ink" style={{ width: `${Math.round((covered / Math.max(1, total)) * 100)}%` }} />
              </div>
              <Link href={`/programa/${c.slug}`} className="mt-4 inline-flex items-center gap-1 font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">
                {presc ? 'Vezi comportamentele' : 'Vezi competențele'} <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
