import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CatalogSearch } from '@/components/search/catalog-search';
import { catalog } from '@/lib/catalog';
import { pageMetadata } from '@/lib/seo/metadata';

/**
 * „Caută fișe”: every sheet of the generator, with a search box and filters. The catalogue is
 * computed here, at build time, and sent to the browser once; searching happens there.
 * A search in the address (?q=…) is not indexed (next.config.mjs), the page itself is.
 */
export const metadata: Metadata = pageMetadata({
  title: 'Caută fișe de lucru după temă, clasă și competență',
  absoluteTitle: true,
  description: 'Caută printre sutele de fișe de lucru: după cuvânt, clasă, materie sau codul competenței din programă. Vezi care sunt gratuite și care au răspunsuri.',
  path: '/cauta',
});

export default function SearchPage() {
  const entries = catalog();
  const rounded = Math.floor(entries.length / 50) * 50;
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <section className="ruled border-b-2 border-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-2">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-ink">Caută fișe</h1>
            <p className="mt-3 text-lg sm:text-xl text-slate-700 max-w-2xl">
              Peste {rounded} de fișe, de la grădiniță la clasa a IV-a. Scrie ce cauți (o temă, un cuvânt de pe fișă, codul unei
              competențe) sau alege clasa și materia.
            </p>
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CatalogSearch entries={entries} />
          <p className="mt-12 text-slate-700">
            Vrei să vezi fișele pe competențe? Mergi la <Link href="/programa" className="font-bold underline">fișe pe programă</Link>. Pe teme, cu explicații:{' '}
            <Link href="/fise-de-lucru" className="font-bold underline">fișe de lucru pe clase</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
