import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { SheetActions } from '@/components/seo/sheet-actions';
import { KIND_TITLES, SEO_SHEETS, relatedSheets, seoSheetBySlug } from '@/lib/seo/catalog';
import { SITE_URL } from '@/lib/seo/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_SHEETS.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const s = seoSheetBySlug(params.slug);
  if (!s) return {};
  const url = `${SITE_URL}/fise/${s.slug}`;
  return {
    title: `${s.title} · WorksheetWiz`,
    description: s.description,
    alternates: { canonical: url },
    openGraph: { title: s.title, description: s.description, url, type: 'article', locale: 'ro_RO', siteName: 'WorksheetWiz' },
  };
}

const PERKS = ['Liniatură ca în caietul de școală', 'Ordinea liniilor, puncte de start și săgeți', 'O pagină A4, gata de printat'];

export default function SeoSheetPage({ params }: { params: { slug: string } }) {
  const s = seoSheetBySlug(params.slug);
  if (!s) notFound();
  const related = relatedSheets(s.slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Fișe gratuite', item: `${SITE_URL}/fise` },
      { '@type': 'ListItem', position: 2, name: s.label, item: `${SITE_URL}/fise/${s.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="ruled border-b-2 border-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid lg:grid-cols-[1fr_auto] gap-10 items-start">
            <div className="space-y-6">
              <nav aria-label="Unde ești" className="text-sm font-bold text-slate-600">
                <Link href="/fise" className="hover:text-pen underline underline-offset-4">Fișe gratuite</Link>
                <span aria-hidden> / </span>
                <span>{KIND_TITLES[s.kind]}</span>
              </nav>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-ink">{s.h1}</h1>
              {s.intro.map((p) => (
                <p key={p} className="text-lg leading-relaxed text-slate-700 max-w-xl">{p}</p>
              ))}
              <ul className="space-y-2">
                {PERKS.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Check className="w-4 h-4 text-pen shrink-0" aria-hidden /> {p}
                  </li>
                ))}
              </ul>
              <SheetActions slug={s.slug} />
              <p className="text-sm text-slate-600">Fără cont, fără card. În generator poți pune numele copilului și alte litere.</p>
            </div>
            <div className="desk rounded-2xl border-2 border-ink p-5 sm:p-7 flex justify-center">
              <div className="rotate-1">
                <WorksheetPreview config={s.config} tier="full" width={340} />
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold text-ink">Alte fișe gratuite</h2>
            <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/fise/${r.slug}`} className="block h-full rounded-xl bg-white border-2 border-ink px-4 py-3 font-extrabold text-ink hover:-translate-y-0.5 hover:shadow-md transition-transform">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/fise" className="mt-6 inline-flex items-center font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">
              Toate fișele <ArrowRight className="w-4 h-4 ml-1" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
