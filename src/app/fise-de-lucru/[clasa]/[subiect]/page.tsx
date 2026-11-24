import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { LandingCrumbs } from '@/components/seo/landing-crumbs';
import { pageMetadata } from '@/lib/seo/metadata';
import { CLASS_NAME, LANDING_PAGES, LANDING_ROOT, areaTitle, landingJsonLd, landingPage, sameClassPages, sameTopicPages } from '@/lib/seo/landing';

export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ clasa: p.cls.slug, subiect: p.topic.slug }));
}

export function generateMetadata({ params }: { params: { clasa: string; subiect: string } }): Metadata {
  const p = landingPage(params.clasa, params.subiect);
  if (!p) return {};
  return pageMetadata({ title: p.title, absoluteTitle: true, description: p.description, path: p.path, type: 'article' });
}

const chip = 'inline-flex items-center min-h-10 rounded-lg border-2 border-ink bg-white px-3 text-sm font-bold text-ink hover:bg-pencil';

export default function LandingTopicPage({ params }: { params: { clasa: string; subiect: string } }) {
  const p = landingPage(params.clasa, params.subiect);
  if (!p) notFound();
  const sameClass = sameClassPages(p);
  const sameTopic = sameTopicPages(p);
  const [practise, ...rest] = p.body;
  const school = p.level !== 'presc';

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      {landingJsonLd(p).map((json, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      ))}
      <main>
        <section className="ruled border-b-2 border-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid lg:grid-cols-[1fr_auto] gap-10 items-start">
            <div className="space-y-5 min-w-0">
              <LandingCrumbs items={[{ name: 'Fișe de lucru', path: LANDING_ROOT }, { name: p.cls.title, path: `${LANDING_ROOT}/${p.cls.slug}` }, { name: p.topic.label }]} />
              <p className="text-sm font-extrabold uppercase tracking-wider text-pen">{areaTitle(p.topic.area, p.level)}</p>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-ink">
                {/* „clasa I” / „clasa a II-a” never break before the numeral */}
                {p.h1.slice(0, -CLASS_NAME[p.level].length)}
                <span className={p.level === 'I' || p.level === 'II' ? 'whitespace-nowrap' : undefined}>{CLASS_NAME[p.level]}</span>
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-slate-700 max-w-xl">{p.lead}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <Link href={p.cta.href} prefetch={false} data-btn="primary" className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl text-lg">
                  Deschide fișa în generator <ArrowRight className="w-5 h-5" aria-hidden />
                </Link>
                <span className="text-sm font-bold text-slate-700">{p.cta.free.badge}{p.cta.free.kind !== 'free' ? '' : ', fără cont'}</span>
              </div>
              {p.sheetLabel && (
                <p className="flex items-start gap-2 text-sm text-slate-700 max-w-xl">
                  <Check className="w-4 h-4 mt-0.5 text-pen shrink-0" aria-hidden />
                  <span>Pe fișă se tipărește: <strong className="text-ink">{p.sheetLabel}</strong></span>
                </p>
              )}
            </div>
            <figure className="desk rounded-2xl border-2 border-ink p-5 sm:p-7 flex flex-col items-center gap-3 justify-self-center">
              {/* A static SVG built with the page: no client code, the same drawing as the PDF. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt={`Prima pagină a fișei „${p.cta.title}” pentru ${CLASS_NAME[p.level]}`}
                width={300}
                height={424}
                decoding="async"
                className="w-[260px] sm:w-[300px] h-auto bg-white border border-ink/20 shadow-lg rotate-1"
              />
              <figcaption className="text-xs font-bold text-slate-600">Pagina 1 · {p.cta.title}</figcaption>
            </figure>
          </div>
        </section>

        <section className="py-12 border-b-2 border-ink/10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">Ce exersează copilul</h2>
              <p className="text-lg leading-relaxed text-slate-700">{practise}</p>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">Ce e pe fișă și cum o folosești</h2>
              {rest.map((t) => (
                <p key={t} className="text-lg leading-relaxed text-slate-700">{t}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 border-b-2 border-ink/10" aria-labelledby="variante">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 id="variante" className="text-2xl sm:text-3xl font-extrabold text-ink">{p.variants.length > 1 ? 'Fișele din această temă' : 'Fișa'}</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.variants.map((v) => (
                <li key={v.preset.id} className="rounded-xl border-2 border-ink bg-white p-4 flex flex-col gap-3">
                  <div className="flex-1">
                    <p className="font-extrabold text-ink">{v.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{v.text}</p>
                    <p className={`mt-2 text-xs font-bold ${v.free.kind === 'paid' ? 'text-slate-500' : 'text-emerald-700'}`}>{v.free.badge}</p>
                  </div>
                  <Link href={v.href} prefetch={false} className="self-start inline-flex items-center gap-1 min-h-10 rounded-lg border-2 border-ink bg-paper px-3 text-sm font-bold text-ink hover:bg-pencil">
                    Deschide <ArrowRight className="w-3.5 h-3.5" aria-hidden /><span className="sr-only"> „{v.title}”</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {p.competences.length > 0 && (
          <section className="py-12 border-b-2 border-ink/10" aria-labelledby="programa">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <h2 id="programa" className="text-2xl sm:text-3xl font-extrabold text-ink">{school ? 'Din programa școlară' : 'Din curriculum'}</h2>
              <ul className="mt-5 space-y-3">
                {p.competences.map((c) => (
                  <li key={`${c.subject}${c.code}`} className="rounded-xl border-2 border-ink/20 bg-white p-4">
                    <p className="text-sm font-bold text-slate-600">{c.name} · {c.subject}</p>
                    <p className="mt-1 text-ink">„{c.text}”</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-slate-600">
                Textul e preluat cuvânt cu cuvânt din {school ? 'programa în vigoare în anul școlar 2026–2027' : 'Curriculumul pentru educație timpurie (OMEN nr. 4694/2019)'}.{' '}
                <Link href={`/programa/${p.cls.slug}`} className="font-bold underline">Toate {school ? 'competențele' : 'comportamentele'} {p.cls.at.replace(/ (?=I|a )/g, '\u00a0')}</Link>
                {school && (
                  <>
                    {' · '}
                    <Link href={`/planificare?clasa=${p.level}`} className="font-bold underline">Planificarea calendaristică</Link>
                  </>
                )}
              </p>
            </div>
          </section>
        )}

        {p.fise.length > 0 && (
          <section className="py-12 border-b-2 border-ink/10" aria-labelledby="fise-gratuite">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <h2 id="fise-gratuite" className="text-2xl sm:text-3xl font-extrabold text-ink">Fișe gratuite, câte una pe pagină</h2>
              <p className="mt-1 text-slate-700">Fiecare se descarcă direct ca PDF, fără să deschizi generatorul.</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {p.fise.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/fise/${s.slug}`} prefetch={false} className={chip}>{s.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="py-12 border-b-2 border-ink/10" aria-labelledby="intrebari">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 id="intrebari" className="text-2xl sm:text-3xl font-extrabold text-ink">Întrebări frecvente</h2>
            <div className="mt-5 space-y-5">
              {p.faq.map((f) => (
                <div key={f.q}>
                  <h3 className="text-lg font-extrabold text-ink">{f.q}</h3>
                  <p className="mt-1 leading-relaxed text-slate-700">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
            {sameClass.length > 0 && (
              <div>
                <h2 className="text-2xl font-extrabold text-ink">Alte fișe pentru {CLASS_NAME[p.level]}</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {sameClass.map((r) => (
                    <li key={r.path}>
                      <Link href={r.path} prefetch={false} className={chip}>{r.topic.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sameTopic.length > 0 && (
              <div>
                <h2 className="text-2xl font-extrabold text-ink">{p.topic.label} la alte clase</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {sameTopic.map((r) => (
                    <li key={r.path}>
                      <Link href={r.path} prefetch={false} className={chip}>{r.h1}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={`${LANDING_ROOT}/${p.cls.slug}`} className="inline-flex items-center font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">
              Toate fișele pentru {CLASS_NAME[p.level]} <ArrowRight className="w-4 h-4 ml-1" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
