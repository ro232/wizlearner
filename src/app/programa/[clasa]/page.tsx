import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { pageMetadata } from '@/lib/seo/metadata';
import { CLASS_PAGES, classCoverage, classEvaluations, classPage, coverageCount, presetHref } from '@/lib/curriculum/presets';
import { needsDe } from '@/components/worksheet/plural';

export const dynamicParams = false;

export function generateStaticParams() {
  return CLASS_PAGES.map((c) => ({ clasa: c.slug }));
}

export function generateMetadata({ params }: { params: { clasa: string } }): Metadata {
  const c = classPage(params.clasa);
  if (!c) return {};
  const what = c.level === 'presc' ? 'comportamentele din curriculum' : 'competențele specifice din programă';
  return pageMetadata({
    title: `Fișe pe programă ${c.at}`,
    absoluteTitle: true,
    description: `Toate ${what} ${c.at}, cu fișele de lucru potrivite pentru fiecare. Codul competenței se tipărește pe fișă.`,
    path: `/programa/${c.slug}`,
  });
}

export default function ClassCurriculumPage({ params }: { params: { clasa: string } }) {
  const c = classPage(params.clasa);
  if (!c) notFound();
  const groups = classCoverage(c);
  const evaluations = classEvaluations(c);
  // the headline counts limba română and matematică (and the preschool curriculum); the other subjects
  // are counted apart, in their own group (presets.ts HEADLINE_PROGRAMMES)
  const { covered: withSheets, total } = coverageCount(groups.filter((g) => g.headline).flatMap((g) => g.items));
  const apart = groups.filter((g) => !g.headline);
  const word = c.level === 'presc' ? 'comportament' : 'competență';
  const order = c.level === 'presc' ? 'Curriculumul pentru educație timpurie, OMEN nr. 4694/2019' : c.level === 'III' || c.level === 'IV' ? 'programele aprobate prin OMEN nr. 5003/2014' : 'programele aprobate prin OMEN nr. 3418/2013';
  // the planner covers CP, I and II (src/lib/planning/subjects.ts PLAN_LEVELS)
  const planned = c.level === 'CP' || c.level === 'I' || c.level === 'II';

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <section className="ruled border-b-2 border-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <nav aria-label="Navigare" className="text-sm text-slate-600">
              <Link href="/programa" className="underline">Fișe pe programă</Link> / {c.title}
            </nav>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight text-ink max-w-3xl">Fișe pe programă {c.at}</h1>
            <p className="mt-4 text-lg text-slate-700 max-w-2xl">
              Pentru fiecare {word} din programă vezi fișele care îl lucrează. Deschizi fișa în generator, pui literele sau numele
              copilului și o descarci; codul se tipărește jos, pe fiecare pagină.
            </p>
            <p className="mt-3 text-sm font-bold text-ink">
              Avem fișe pentru {withSheets} din {total}{apart.length > 0 ? ' competențe de limba română și matematică' : c.level === 'III' || c.level === 'IV' ? `${needsDe(total) ? ' de' : ''} competențe de limba română și matematică` : ''}.
            </p>
            {apart.length > 0 && (
              <p className="mt-2 text-sm text-slate-700 max-w-2xl">
                {apart.map((g) => g.title).join(', ').replace(/, ([^,]*)$/, ' și $1')} se învață mai ales prin activități practice,
                joc și discuție, nu pe fișe. De aceea nu intră în numărătoarea de mai sus: la fiecare dintre ele vezi separat
                pentru câte competențe avem fișe.
              </p>
            )}
            {planned && (
              <p className="mt-2 text-sm text-slate-700">
                Ai nevoie și de planificarea calendaristică?{' '}
                <Link href={`/planificare?clasa=${c.level}`} className="font-bold underline">Fă-o pe 2026–2027, cu aceste competențe</Link>.
              </p>
            )}
            <p className="mt-2 text-sm text-slate-700">
              Fișele pe teme, cu explicații:{' '}
              <Link href={`/fise-de-lucru/${c.slug}`} className="font-bold underline">fișe de lucru {c.at.replace(/^la /, 'pentru ')}</Link>.
            </p>
          </div>
        </section>

        {evaluations.length > 0 && (
          <section className="py-10 border-b-2 border-ink/10" aria-labelledby="evaluari">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <h2 id="evaluari" className="text-2xl sm:text-3xl font-extrabold text-ink">Evaluări</h2>
              <p className="mt-2 text-slate-700 max-w-2xl">
                Câteva exerciții din fiecare temă, pe 2–3 pagini, cu antet de evaluare și autoevaluare. La final, pagina cu
                răspunsuri{c.level === 'presc' ? ' și o fișă de observare (fără calificative).' : ' și un tabel orientativ de calificative.'}
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {evaluations.map(({ preset: p, codes }) => (
                  <li key={p.id} className="rounded-xl border-2 border-ink bg-white p-4 flex flex-col gap-3">
                    <div>
                      <p className="font-extrabold text-ink">{p.title}</p>
                      <p className="mt-1 text-sm text-slate-700">{p.text}</p>
                      {codes.length > 0 && <p className="mt-1 text-xs text-slate-500">{c.level === 'presc' ? 'Comportamente' : 'Competențe'}: {codes.join(', ')}</p>}
                    </div>
                    <Link href={presetHref(p, c.level)} prefetch={false}
                      className="self-start inline-flex items-center gap-1 min-h-10 rounded-lg border-2 border-ink bg-paper px-3 text-sm font-bold text-ink hover:bg-pencil">
                      Deschide evaluarea <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {groups.map((g) => (
          <section key={g.title} className="py-10 border-b-2 border-ink/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">{g.title}</h2>
              {(() => {
                const n = coverageCount(g.items);
                return (
                  <p className="mt-2 text-sm text-slate-700 max-w-2xl">
                    <span className="font-bold text-ink">Fișe pentru {n.covered} din {n.total}.</span>
                    {g.note ? ` ${g.note}` : ''}
                  </p>
                );
              })()}
              <ol className="mt-6 space-y-3">
                {g.items.map((it) => (
                  <li key={it.code} className={`rounded-xl border-2 p-4 ${it.presets.length ? 'border-ink bg-white' : 'border-slate-200 bg-white/60'}`}>
                    <p className="text-ink">
                      <span className="font-extrabold tabular-nums mr-2">{it.code}</span>
                      {it.competence.text}
                    </p>
                    {it.presets.length ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {it.presets.map((p) => (
                          <li key={p.id}>
                            <Link href={presetHref(p, c.level)} prefetch={false} title={p.text}
                              className="inline-flex items-center gap-1 min-h-10 rounded-lg border-2 border-ink bg-paper px-3 text-sm font-bold text-ink hover:bg-pencil">
                              {p.title} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Încă nu avem o fișă pentru {c.level === 'presc' ? 'acest comportament' : 'această competență'}.</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}

        <section className="py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-sm text-slate-600 space-y-2">
            <p>Textele sunt preluate cuvânt cu cuvânt din programa în vigoare în anul școlar 2026–2027 ({order}).</p>
            <p>
              Alte clase:{' '}
              {CLASS_PAGES.filter((o) => o.slug !== c.slug).map((o, i, all) => (
                <span key={o.slug}>
                  <Link href={`/programa/${o.slug}`} className="underline">{o.title}</Link>
                  {i < all.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
