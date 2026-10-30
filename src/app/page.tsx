'use client';

import Link from 'next/link';
import { ArrowRight, Check, UserRound, BookOpen, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { GuidedStart } from '@/components/home/guided-start';
import { SheetGallery } from '@/components/home/sheet-gallery';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';

// A real sheet, drawn by the same engine as the downloads: what you see is what you print.
const SAMPLE: WorksheetConfig = {
  ...DEFAULT_CONFIG,
  selectedItems: ['A', 'Ă', 'Ș'],
  customWords: ['Ana'],
  letterMode: 'uppercase',
  childName: 'Ana',
  rowsPerPage: 5,
};

function Hero() {
  return (
    <section className="ruled border-b-2 border-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div className="space-y-7">
          <p className="inline-block font-extrabold text-[13px] tracking-[0.12em] uppercase text-pen border-b-2 border-pen pb-1">
            Alfabetul românesc complet · Ă Â Î Ș Ț
          </p>
          <h1 className="text-[44px] sm:text-6xl lg:text-[68px] font-extrabold leading-[1.02] text-ink">
            Fișe de scris ca la școală, gata într-un minut.
          </h1>
          <p className="text-lg sm:text-xl leading-relaxed text-slate-700 max-w-xl">
            Litere cu ordinea liniilor, puncte de start și săgeți. Pui numele copilului, descarci PDF-ul și printezi. Pentru acasă,
            grădiniță și clasa pregătitoare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/generator" data-btn="primary" className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl text-base">
              Fă o fișă gratuit <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/nume" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper">
              <UserRound className="w-4 h-4" aria-hidden /> Fișa cu numele copilului
            </Link>
          </div>
          <p className="text-sm text-slate-600">Fără cont, fără card.</p>
        </div>

        <div className="relative flex justify-center py-6" aria-label="Exemplu de fișă">
          <div className="absolute top-10 left-1/2 -translate-x-[46%] w-[300px] sm:w-[380px] h-[90%] bg-white border-2 border-ink rounded-[3px] -rotate-[5deg]" aria-hidden />
          <div className="relative rotate-[1.5deg]">
            <WorksheetPreview config={SAMPLE} tier="full" width={380} />
          </div>
          <span className="absolute -top-1 right-2 sm:right-8 rotate-[8deg] bg-pencil text-ink font-display font-extrabold text-lg px-4 py-1.5 rounded-lg border-2 border-ink shadow-md">
            Ana, bravo!
          </span>
        </div>
      </div>
    </section>
  );
}

function FirstSheet() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-ink text-center">Prima ta fișă, în 3 pași</h2>
        <p className="mt-3 text-center text-lg text-slate-700">Răspunzi la trei întrebări și ajungi direct la fișa gata făcută.</p>
        <div className="mt-10">
          <GuidedStart />
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section className="py-20 border-y-2 border-ink bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-ink">Fișe gata făcute</h2>
        <p className="mt-3 text-lg text-slate-700 max-w-2xl">Descarcă-le așa cum sunt, sau deschide-le în generator și schimbă ce vrei.</p>
        <div className="mt-10">
          <SheetGallery />
        </div>
        <Link href="/fise" className="mt-10 inline-flex items-center font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">
          Toate fișele gratuite: fiecare literă, cifră și temă <ArrowRight className="w-4 h-4 ml-1" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function ForWhom() {
  const groups = [
    { icon: UserRound, title: 'Părinți', text: 'O fișă cu numele copilului sau cu literele pe care le învață acum, în două minute, înainte de școală.', href: '/nume', cta: 'Fișa cu numele' },
    { icon: Users, title: 'Educatoare și învățătoare', text: 'Lipești lista copiilor și primești câte o fișă pentru fiecare: numele lui, literele săptămânii și cuvintele temei, cu imagini.', href: '/grupa', cta: 'Fișe pentru grupă' },
    { icon: BookOpen, title: 'Autori pe Amazon KDP', text: 'Un caiet complet de 60 de pagini, cu interior și copertă la dimensiunile cerute de KDP.', href: '/book', cta: 'Fă un caiet' },
  ];
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-ink text-center mb-12">Pentru cine e</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {groups.map((g) => (
            <div key={g.title} className="rounded-2xl bg-white shadow-lg p-6 flex flex-col">
              <span className="w-11 h-11 rounded-xl bg-pencil border-2 border-ink flex items-center justify-center">
                <g.icon className="w-5 h-5 text-ink" aria-hidden />
              </span>
              <h3 className="mt-4 text-2xl font-extrabold text-ink">{g.title}</h3>
              <p className="mt-2 text-slate-700 flex-1">{g.text}</p>
              <Link href={g.href} className="mt-5 inline-flex items-center font-extrabold text-ink underline decoration-pen decoration-2 underline-offset-4 hover:text-pen">
                {g.cta} <ArrowRight className="w-4 h-4 ml-1" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const free = ['Literele A–E (și Ă, Â), cifrele 0–5', 'Trei forme și trei exerciții grafice', 'Jocuri: găsește litera A–E, numără până la 5, steaua cu puncte', 'Fișa cu numele copilului', 'Fișe pentru grupă: încearcă cu 3 copii', 'Caietul KDP, cu filigran'];
  const full = ['Fișe pentru toată grupa, până la 40 de copii, pe teme', 'Tot alfabetul românesc și englez, mari și mici', 'Cifre și numere 0–20, toate formele și exercițiile', 'Toate jocurile și pachetul săptămânii pentru grupă', 'Orice cuvânt de trasat, fișe salvate în cont', 'Caietul KDP fără filigran'];
  return (
    <section id="preturi" className="py-20 ruled border-y-2 border-ink">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-ink text-center mb-12">Gratuit sau complet</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: 'Gratuit', items: free, note: 'Pentru totdeauna, fără cont.', href: '/generator', cta: 'Începe gratuit' },
            { name: 'Complet', items: full, note: 'Abonament lunar sau pe an școlar.', href: '/preturi', cta: 'Vezi prețurile' },
          ].map((p, i) => (
            <div key={p.name} className={`rounded-2xl bg-white p-6 flex flex-col ${i ? 'shadow-xl' : 'shadow-md'}`}>
              <h3 className="text-2xl font-extrabold text-ink">{p.name}</h3>
              <ul className="mt-4 space-y-2 flex-1">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-slate-800">
                    <Check className="w-4 h-4 mt-1 text-pen shrink-0" aria-hidden />
                    {it}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-slate-600">{p.note}</p>
              <Link href={p.href} {...(i ? { 'data-btn': 'primary' } : {})}
                className={`mt-4 inline-flex items-center justify-center h-12 rounded-xl font-extrabold ${i ? '' : 'border-2 border-ink text-ink hover:bg-paper'}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <Hero />
        <FirstSheet />
        <Gallery />
        <ForWhom />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
