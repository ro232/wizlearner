import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { LandingCrumbs } from '@/components/seo/landing-crumbs';
import { pageMetadata } from '@/lib/seo/metadata';
import { CLASS_NAME, LANDING_CLASSES, LANDING_ROOT, breadcrumbJsonLd, landingClass } from '@/lib/seo/landing';
import { countOf } from '@/components/worksheet/plural';

export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_CLASSES.map((c) => ({ clasa: c.cls.slug }));
}

export function generateMetadata({ params }: { params: { clasa: string } }): Metadata {
  const c = landingClass(params.clasa);
  if (!c) return {};
  return pageMetadata({ title: c.title, absoluteTitle: true, description: c.description, path: c.path });
}

const INTRO: Record<string, string> = {
  presc:
    'Fișe pe teme pentru grupa mică, mijlocie și mare: grafisme, litere, sunete și silabe, cifre, sortare, cunoașterea mediului și jocuri pe hârtie. Pe fiecare fișă se tipărește comportamentul din Curriculumul pentru educație timpurie pe care îl exersează.',
  CP: 'Fișe pe teme pentru clasa pregătitoare, după programele de Comunicare în limba română și Matematică și explorarea mediului. Pe fiecare fișă se tipărește competența specifică pe care o exersează, ca în planificare.',
  I: 'Fișe pe teme pentru clasa I: citire, scrierea literelor de mână, sunete și silabe, adunări și scăderi până la 100, ceasul, banii și explorarea mediului. Pe fiecare fișă se tipărește competența specifică din programă.',
  II: 'Fișe pe teme pentru clasa a II-a: citire și scriere, numere până la 1000, tabla înmulțirii, împărțiri, ceasul, calendarul și măsurările. Pe fiecare fișă se tipărește competența specifică din programă.',
  III: 'Fișe pe teme pentru clasa a III-a, după programele de Limba și literatura română și de Matematică: texte de citit cu întrebări, ortograme, compuneri cu plan, numere până la 10 000, cifre romane, fracții și perimetre. Pe fiecare fișă se tipărește competența specifică.',
  IV: 'Fișe pe teme pentru clasa a IV-a: lectură cu întrebări de înțelegere, părțile de vorbire, scrisoarea și anunțul, numere până la 1 000 000, ordinea operațiilor, fracții, transformări de unități și perimetre. Pe fiecare fișă se tipărește competența specifică.',
};

export default function LandingClassPage({ params }: { params: { clasa: string } }) {
  const c = landingClass(params.clasa);
  if (!c) notFound();
  const school = c.cls.level !== 'presc';
  const jsonLd = JSON.stringify(breadcrumbJsonLd([{ name: 'Fișe de lucru', path: LANDING_ROOT }, { name: c.cls.title, path: c.path }])).replace(/</g, '\\u003c');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <main>
        <section className="bg-white border-b border-line">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-4">
            <LandingCrumbs items={[{ name: 'Fișe de lucru', path: LANDING_ROOT }, { name: c.cls.title }]} />
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-ink max-w-3xl">{c.h1}</h1>
            <p className="text-lg text-slate-700 max-w-2xl">{INTRO[c.cls.level]}</p>
            <p className="text-sm text-slate-700">
              <Link href={`/programa/${c.cls.slug}`} className="font-bold underline">Fișele pe {school ? 'competențe' : 'comportamente'}</Link>
              {school && (
                <>
                  {' · '}
                  <Link href={`/planificare?clasa=${c.cls.level}`} className="font-bold underline">Planificarea calendaristică 2026–2027</Link>
                </>
              )}
            </p>
          </div>
        </section>

        {c.groups.map((g) => (
          <section key={g.area} className="py-10 border-b border-line">
            <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-ink">{g.title}</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.pages.map((p) => (
                  <li key={p.path}>
                    <Link href={p.path} className="group flex h-full flex-col rounded-xl border border-line bg-white p-4 hover:-translate-y-0.5 hover:shadow-md transition-transform">
                      <span className="font-bold text-ink group-hover:underline">{p.topic.label}</span>
                      <span className="mt-1 text-sm text-slate-700 flex-1">{p.lead}</span>
                      <span className="mt-3 text-xs font-bold text-slate-500">{countOf(p.variants.length, 'fișă', 'fișe')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="py-10">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 text-sm text-slate-600">
            <p>
              Alte clase:{' '}
              {LANDING_CLASSES.filter((o) => o.cls.slug !== c.cls.slug).map((o, i, all) => (
                <span key={o.cls.slug}>
                  <Link href={o.path} className="underline">{o.cls.title}</Link>
                  {i < all.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
            <Link href={`${LANDING_ROOT}`} className="mt-4 inline-flex items-center font-bold text-brand underline decoration-brand/30 underline-offset-4 hover:text-brand">
              Toate fișele de lucru, pe clase <ArrowRight className="w-4 h-4 ml-1" aria-hidden />
            </Link>
            <p className="mt-2">Fișele pentru {CLASS_NAME[c.cls.level]} se deschid în generator, unde pui numele copilului și descarci PDF-ul.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
