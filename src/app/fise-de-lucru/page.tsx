import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { pageMetadata } from '@/lib/seo/metadata';
import { LANDING_CLASSES, LANDING_INDEX } from '@/lib/seo/landing';

export const metadata: Metadata = pageMetadata({ title: LANDING_INDEX.title, absoluteTitle: true, description: LANDING_INDEX.description, path: LANDING_INDEX.path });

export default function LandingIndexPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <section className="ruled border-b-2 border-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-ink max-w-3xl">Fișe de lucru pe clase și teme</h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-700 max-w-2xl">
              Alegi clasa și tema, citești ce exersează copilul și deschizi fișa în generator. Pe fiecare fișă se tipărește competența
              din programă, ca s-o pui direct în portofoliu.
            </p>
            <p className="mt-3 text-sm text-slate-700">
              Cauți o singură literă sau cifră? Vezi <Link href="/fise" className="font-bold underline">fișele gratuite</Link>. Vrei
              fișele pe competențe? Vezi <Link href="/programa" className="font-bold underline">Fișe pe programă</Link>.
            </p>
          </div>
        </section>

        {LANDING_CLASSES.map((c) => (
          <section key={c.cls.slug} className="py-10 border-b-2 border-ink/10" aria-labelledby={`clasa-${c.cls.slug}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2 id={`clasa-${c.cls.slug}`} className="text-2xl sm:text-3xl font-extrabold text-ink">{c.cls.title}</h2>
                <Link href={c.path} className="inline-flex items-center font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">
                  {c.h1} <ArrowRight className="w-4 h-4 ml-1" aria-hidden />
                </Link>
              </div>
              {c.groups.map((g) => (
                <div key={g.area} className="mt-5">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">{g.title}</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {g.pages.map((p) => (
                      <li key={p.path}>
                        <Link href={p.path} prefetch={false} className="inline-flex items-center min-h-10 rounded-lg border-2 border-ink bg-white px-3 text-sm font-bold text-ink hover:bg-pencil">
                          {p.topic.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
