import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PlanningTool } from '@/components/planning/planning-tool';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Planificare calendaristică 2026–2027, CP, clasa I și a II-a',
  absoluteTitle: true,
  description: 'Planificarea calendaristică pe module și săptămâni pentru CLR și MEM, din programa școlară și structura anului 2026–2027. O editezi și o descarci în Word.',
  path: '/planificare',
});

export default function PlanningPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <section className="bg-white border-b border-line">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <nav aria-label="Navigare" className="text-sm text-slate-600">
              <Link href="/programa" className="underline">Fișe pe programă</Link> / Planificare calendaristică
            </nav>
            <h1 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight text-ink max-w-3xl">Planificare calendaristică <span className="whitespace-nowrap">2026–2027</span></h1>
            <p className="mt-4 text-lg text-slate-700 max-w-2xl">
              Alegi clasa și disciplina și primești o propunere pe cele cinci module ale anului: unitățile de învățare, competențele
              specifice, conținuturile din programă, orele și săptămânile, cu vacanțele și zilele libere scoase. O ajustezi aici și o
              descarci în Word sau PDF.
            </p>
            <p className="mt-3 text-sm font-bold text-ink max-w-2xl">
              E o propunere orientativă, nu un document aprobat de minister: o adaptezi clasei și graficului școlii tale.
            </p>
          </div>
        </section>
        <PlanningTool />
      </main>
      <Footer />
    </div>
  );
}
