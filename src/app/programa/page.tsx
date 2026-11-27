import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { pageMetadata } from '@/lib/seo/metadata';
import { CLASS_PAGES, coverageCount, headlineItems } from '@/lib/curriculum/presets';

export const metadata: Metadata = pageMetadata({
  title: 'Fișe pe programă: de la grădiniță la clasa a IV-a',
  absoluteTitle: true,
  description: 'Competențele din programa școlară, cu fișele de lucru potrivite pentru fiecare. Codul competenței se tipărește pe fișă, pentru portofoliu și planificare.',
  path: '/programa',
});

export default function CurriculumIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <section className="bg-white border-b border-line">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight text-ink max-w-3xl">Fișe pe programă</h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-700 max-w-2xl">
              Alegi clasa, vezi competențele din programa școlară și deschizi fișa potrivită pentru fiecare. Pe fișă se tipărește
              codul competenței, ca în planificare.
            </p>
          </div>
        </section>
        <section className="py-12">
          <ul className="max-w-[1120px] mx-auto px-4 sm:px-6 grid gap-4 sm:grid-cols-2">
            {CLASS_PAGES.map((c) => {
              // limba română and matematică; the other subjects are counted on the class page (HEADLINE_PROGRAMMES)
              const { covered: withSheets, total } = coverageCount(headlineItems(c));
              return (
                <li key={c.slug}>
                  <Link href={`/programa/${c.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 hover:-translate-y-0.5 transition-transform">
                    <span className="text-2xl font-bold text-ink">{c.title}</span>
                    <span className="mt-1 text-slate-700">
                      {c.level === 'presc' ? 'Curriculum pentru educație timpurie' : c.level === 'III' || c.level === 'IV' ? 'Limba și literatura română · Matematică' : 'Limba română · Matematică și explorarea mediului · Arte vizuale · Dezvoltare personală · Limba modernă'}
                    </span>
                    <span className="mt-3 text-sm text-slate-600">
                      Fișe pentru {withSheets} din {total} {c.level === 'presc' ? 'comportamente' : 'competențe de limba română și matematică'}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1 font-bold text-ink group-hover:underline">
                      Vezi competențele <ArrowRight className="w-4 h-4" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="max-w-[1120px] mx-auto px-4 sm:px-6 mt-8 text-slate-700">
            Cauți fișele pe teme (adunări, citire, ceasul…)? Vezi{' '}
            <Link href="/fise-de-lucru" className="font-bold underline">fișele de lucru pe clase</Link>.
          </p>
          <p className="max-w-[1120px] mx-auto px-4 sm:px-6 mt-4 text-slate-700">
            Pentru clasa pregătitoare, clasa I și a II-a poți face și{' '}
            <Link href="/planificare" className="font-bold underline">planificarea calendaristică pe 2026–2027</Link>, cu fișele potrivite fiecărei unități.
          </p>
          <p className="max-w-[1120px] mx-auto px-4 sm:px-6 mt-4 text-sm text-slate-600">
            Textele competențelor sunt preluate cuvânt cu cuvânt din programele în vigoare în anul școlar 2026–2027: Curriculumul pentru
            educație timpurie (OMEN nr. 4694/2019), programele pentru clasa pregătitoare, clasa I și clasa a II-a (OMEN nr. 3418/2013) și
            programele de Limba și literatura română și de Matematică pentru clasele a III-a și a IV-a (OMEN nr. 5003/2014).
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
