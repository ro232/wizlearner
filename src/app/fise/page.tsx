import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { KIND_TITLES, SEO_SHEETS, type SeoKind } from '@/lib/seo/catalog';
import { SITE_URL } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Fișe de lucru gratuite pentru grădiniță și clasa pregătitoare · WorksheetWiz',
  description: 'Fișe gratuite de printat: fiecare literă a alfabetului românesc (inclusiv Ă, Â, Î, Ș, Ț), cifrele 0–10, teme de grădiniță și jocuri „unește punctele”. PDF A4.',
  alternates: { canonical: `${SITE_URL}/fise` },
};

const KIND_TEXT: Record<SeoKind, string> = {
  litere: 'Fiecare literă, mare și mică, cu un cuvânt și o imagine.',
  mana: 'Scrisul de mână de la școală, pe liniatură tip I, cu cuvinte legate.',
  cifre: 'Cifrele de la 0 la 9 și numărul 10.',
  teme: 'Cuvintele temei săptămânii, cu imagini.',
  jocuri: 'Găsește litera și unește punctele.',
};

export default function SheetsIndexPage() {
  const kinds = Object.keys(KIND_TITLES) as SeoKind[];
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <section className="ruled border-b-2 border-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-ink max-w-3xl">Fișe gratuite, gata de printat</h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-700 max-w-2xl">
              Alege o fișă, descarc-o ca PDF și printeaz-o. Toate au liniatură de caiet, ordinea liniilor și diacriticele corecte.
            </p>
          </div>
        </section>
        {kinds.map((k) => (
          <section key={k} className="py-12 border-b-2 border-ink/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <h2 className="text-3xl font-extrabold text-ink">{KIND_TITLES[k]}</h2>
              <p className="mt-1 text-slate-700">{KIND_TEXT[k]}</p>
              <ul className={`mt-6 grid gap-3 ${['litere', 'mana', 'cifre'].includes(k) ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-11' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                {SEO_SHEETS.filter((s) => s.kind === k).map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/fise/${s.slug}`}
                      aria-label={s.label}
                      className={`flex items-center justify-center h-full rounded-xl bg-white border-2 border-ink font-extrabold text-ink hover:bg-pencil hover:-translate-y-0.5 transition-transform ${['litere', 'mana', 'cifre'].includes(k) ? `aspect-square text-2xl font-display ${k === 'mana' ? 'italic' : ''}` : 'px-4 py-3 justify-start'}`}
                    >
                      {k === 'litere' ? s.label.replace('Litera ', '') : k === 'mana' ? s.label.replace(/^Litera (.+) de mână$/, '$1') : k === 'cifre' ? s.label.replace(/^(Cifra|Numărul) /, '') : s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
        <section className="py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-extrabold text-ink">Vrei fișa cu numele copilului?</h2>
            <p className="mt-2 text-slate-700">În generator alegi literele, cuvintele și numele, iar fișa se face pe loc.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/nume" data-btn="primary" className="inline-flex items-center justify-center h-12 px-6 rounded-xl">Fișa cu numele</Link>
              <Link href="/generator" className="inline-flex items-center justify-center h-12 px-6 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">Deschide generatorul</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
