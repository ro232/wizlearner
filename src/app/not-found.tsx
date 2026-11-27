import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { LogoMark } from '@/components/layout/logo';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Pagina nu a fost găsită · ${BRAND_NAME}`,
  description: 'Pagina pe care o cauți nu există. Fă o fișă nouă sau alege una din fișele gratuite.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex"><LogoMark size={48} /></div>
          <p className="mt-5 text-sm font-semibold text-brand">Eroare 404</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold leading-tight tracking-[-0.03em] text-ink">Pagina asta nu e în caiet</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Adresa e greșită sau pagina a fost mutată. Fișele sunt la locul lor: fă una nouă sau alege din cele gratuite.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/generator" data-btn="primary" prefetch={false} className="inline-flex items-center justify-center min-h-12 px-6 text-base">Fă o fișă</Link>
            <Link href="/fise" className="inline-flex min-h-12 items-center justify-center px-6 rounded-xl border border-line-strong bg-white font-semibold text-ink hover:bg-paper">Fișe gratuite</Link>
          </div>
          <p className="mt-6">
            <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-brand hover:text-brand-hover hover:underline">Înapoi la prima pagină</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
