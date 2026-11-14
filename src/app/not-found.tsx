import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PencilMark } from '@/components/layout/logo';

export const metadata: Metadata = {
  title: 'Pagina nu a fost găsită · WorksheetWiz',
  description: 'Pagina pe care o cauți nu există. Fă o fișă nouă sau alege una din fișele gratuite.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <main className="ruled flex-1 border-b-2 border-ink">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex -rotate-6"><PencilMark size={64} /></div>
          <p className="mt-4 font-extrabold text-[13px] tracking-[0.12em] uppercase text-pen">Eroare 404</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold leading-tight text-ink">Pagina asta nu e în caiet</h1>
          <p className="mt-4 text-lg text-slate-700">
            Adresa e greșită sau pagina a fost mutată. Fișele sunt la locul lor: fă una nouă sau alege din cele gratuite.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/generator" data-btn="primary" className="inline-flex items-center justify-center h-14 px-7 rounded-xl text-base">Fă o fișă</Link>
            <Link href="/fise" className="inline-flex items-center justify-center h-14 px-6 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">Fișe gratuite</Link>
          </div>
          <p className="mt-6">
            <Link href="/" className="font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">Înapoi la prima pagină</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
