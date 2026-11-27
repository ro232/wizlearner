/* eslint-disable @next/next/no-img-element -- static SVGs drawn at build time by the PDF engine; width and height are set */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { AdventBanner } from '@/components/home/advent-banner';
import { RoleCards } from '@/components/home/role-cards';
import { HERO_SHEET, POPULAR_SHEETS, sheetPage, sheetSvg } from '@/components/home/home-sheets';
import { routeMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = routeMetadata('/');

const wrap = 'max-w-[1120px] mx-auto px-4 sm:px-6';
const h2 = 'text-[26px] sm:text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink';
const primaryBtn = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-hover';
const secondaryBtn = 'inline-flex min-h-12 items-center justify-center rounded-xl border border-line-strong bg-white px-6 text-base font-semibold text-ink transition-colors hover:bg-paper';

function Hero() {
  return (
    <section className={`${wrap} pt-12 pb-14 sm:pt-[88px] sm:pb-[72px] grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-14 items-center`}>
      <div className="flex flex-col gap-6 min-w-0">
        <p className="text-sm font-semibold text-brand">Grădiniță, clasa pregătitoare, clasele I și a II-a</p>
        <h1 className="text-[38px] sm:text-[52px] lg:text-[56px] font-bold leading-[1.05] tracking-[-0.03em] text-ink">
          Fișe de lucru pe programă, gata de printat.
        </h1>
        <p className="max-w-[520px] text-lg sm:text-[19px] leading-relaxed text-slate-600">
          Alegi ce exersează copilul, scrii numele lui și descarci PDF-ul. Fără cont, în câteva secunde.
        </p>
        <div className="flex flex-col min-[420px]:flex-row flex-wrap gap-3">
          <Link href="/generator" prefetch={false} className={primaryBtn}>Fă o fișă</Link>
          <Link href="/cauta" className={secondaryBtn}>Caută printre 600 de fișe</Link>
        </div>
      </div>
      <figure className="mx-auto w-full max-w-[280px] sm:max-w-[340px]">
        <Link href={sheetPage(HERO_SHEET)} className="block rounded-xl border border-line bg-white p-3 transition-colors hover:border-line-strong">
          <img src={sheetSvg(HERO_SHEET)} alt={HERO_SHEET.alt} width={314} height={444} fetchPriority="high" decoding="async" className="block w-full h-auto" />
        </Link>
        <figcaption className="mt-3 flex justify-between gap-3 text-sm">
          <span className="font-semibold text-ink">{HERO_SHEET.title}</span>
          <span className="text-slate-600">{HERO_SHEET.level}</span>
        </figcaption>
      </figure>
    </section>
  );
}

const STEPS: { id?: string; title: string; text: string }[] = [
  { title: 'Alegi ce exersezi', text: 'Litere, cifre, grafisme, matematică sau jocuri, pe clasa copilului.' },
  { title: 'Scrii numele', text: 'Numele copilului apare pe fișă, de trasat. Pentru o grupă, lipești lista.' },
  // where the menu's „Temă pentru părinți” lands (/#tema)
  { id: 'tema', title: 'Printezi', text: 'Descarci PDF-ul sau trimiți fișa ca temă, cu link și cod QR.' },
];

function HowItWorks() {
  return (
    <section className={`${wrap} py-14 sm:py-[72px]`} aria-labelledby="cum-titlu">
      <h2 id="cum-titlu" className={h2}>Cum funcționează</h2>
      <ol className="mt-8 grid gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} id={s.id} className="flex flex-col gap-2.5 border-t-2 border-ink pt-5 scroll-mt-24">
            <span className="text-sm font-semibold text-brand">Pasul {i + 1}</span>
            <h3 className="text-xl font-bold text-ink">{s.title}</h3>
            <p className="text-base leading-relaxed text-slate-600">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PopularSheets() {
  return (
    <section className={`${wrap} pb-16 sm:pb-[88px]`} aria-labelledby="des-titlu">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="des-titlu" className={h2}>Fișe folosite des</h2>
        <Link href="/fise-de-lucru" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-brand hover:text-brand-hover hover:underline">Toate fișele</Link>
      </div>
      <ul className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-6">
        {POPULAR_SHEETS.map((s) => (
          <li key={sheetPage(s)}>
            <Link href={sheetPage(s)} className="group flex flex-col gap-3 rounded-xl text-ink">
              <span className="block rounded-xl border border-line bg-paper p-3 sm:p-4 transition-colors group-hover:border-line-strong">
                <img src={sheetSvg(s)} alt={s.alt} width={220} height={311} loading="lazy" decoding="async" className="block w-full h-auto rounded-md bg-white" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold group-hover:text-brand">{s.title}</span>
                <span className="text-sm text-slate-600">{s.level}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        {/* teacher or parent: one click to the right dashboard and menu */}
        <RoleCards />
        {/* SEZONIER: Calendarul de Advent, se ascunde singur din 26.12.2026; de scos după Crăciun */}
        <AdventBanner />
        <HowItWorks />
        <PopularSheets />
      </main>
      <Footer />
    </div>
  );
}
