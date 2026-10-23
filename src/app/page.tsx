'use client';

import Link from 'next/link';
import { ArrowRight, Check, Download, MousePointerClick, Printer, UserRound, BookOpen, PenLine, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';

// A real sheet, drawn by the same engine as the downloads: what you see is what you get.
const SAMPLE: WorksheetConfig = {
  ...DEFAULT_CONFIG,
  selectedItems: ['A', 'Ă', 'Ș'],
  customWords: ['Ana'],
  letterMode: 'uppercase',
  childName: 'Ana',
  rowsPerPage: 5,
};

const ORANGE = 'linear-gradient(135deg, #E8913A, #d97706)';

function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 md:pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        <div className="space-y-7 animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1 text-xs font-semibold text-blue-700">
            Alfabetul românesc complet · Ă Â Î Ș Ț
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-slate-900">
            Fișe de scris pentru cei mici, <span className="gradient-text-blue">gata într-un minut</span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-600 max-w-xl">
            Litere, cifre, forme și exerciții grafice, cu ordinea liniilor ca la școală: puncte de start numerotate și săgeți.
            Adaugi numele copilului, descarci PDF-ul și printezi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/generator">
              <Button size="lg" className="w-full sm:w-auto text-white px-7 h-14 text-base rounded-2xl shadow-lg" style={{ background: ORANGE }}>
                Fă o fișă gratuit <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
              </Button>
            </Link>
            <Link href="/nume">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 text-base rounded-2xl border-2 border-slate-300">
                <UserRound className="w-4 h-4 mr-2" aria-hidden /> Fișa cu numele copilului
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500">Fără cont, fără card. Pentru grădiniță, clasa pregătitoare și acasă.</p>
        </div>
        <div className="flex justify-center">
          <WorksheetPreview config={SAMPLE} tier="full" width={400} />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: MousePointerClick, title: 'Alegi ce exersați', text: 'Literele mari sau mici, cifrele, formele ori exercițiile grafice. Sau scrii un nume ori un cuvânt.' },
    { icon: PenLine, title: 'Potrivești nivelul', text: 'De la „cu mult ajutor” la „mai mult singur”. Ultimele căsuțe din rând rămân libere pentru scris fără model.' },
    { icon: Printer, title: 'Descarci și printezi', text: 'Primești un PDF A4 identic cu ce vezi pe ecran, cu diacriticele corecte.' },
  ];
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12">Cum funcționează</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><s.icon className="w-5 h-5" aria-hidden /></span>
                <span className="text-sm font-bold text-slate-400">Pasul {i + 1}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForWhom() {
  const groups = [
    { icon: UserRound, title: 'Părinți', text: 'O fișă cu numele copilului sau literele pe care le învață acum, în două minute, înainte de școală.', href: '/nume', cta: 'Fișa cu numele' },
    { icon: Users, title: 'Educatoare și învățătoare', text: 'Lipești lista copiilor și primești câte o fișă pentru fiecare: numele lui, literele săptămânii și cuvintele temei, cu imagini.', href: '/grupa', cta: 'Fișe pentru grupă' },
    { icon: BookOpen, title: 'Autori pe Amazon KDP', text: 'Un caiet complet de 60 de pagini, cu interior și copertă la dimensiunile cerute de KDP.', href: '/book', cta: 'Fă un caiet' },
  ];
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12">Pentru cine e</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {groups.map((g) => (
            <div key={g.title} className="rounded-2xl border border-slate-200 p-6 flex flex-col">
              <g.icon className="w-6 h-6 text-orange-500" aria-hidden />
              <h3 className="mt-3 text-lg font-bold text-slate-900">{g.title}</h3>
              <p className="mt-2 text-slate-600 flex-1">{g.text}</p>
              <Link href={g.href} className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 hover:underline">
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
  const free = ['Literele A–E (și Ă, Â)', 'Cifrele 0–5', 'Trei forme și trei exerciții grafice', 'Fișa cu numele copilului', 'Fișe pentru grupă: încearcă cu 3 copii', 'Caietul KDP, cu filigran'];
  const full = ['Fișe pentru toată grupa, până la 40 de copii, pe teme', 'Tot alfabetul românesc și englez, mari și mici', 'Cifre și numere 0–20, toate formele și exercițiile', 'Orice cuvânt de trasat', 'Caietul KDP fără filigran'];
  return (
    <section id="preturi" className="py-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12">Ce e gratuit și ce e în varianta completă</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[{ name: 'Gratuit', items: free, note: 'Pentru totdeauna, fără cont.' }, { name: 'Complet', items: full, note: 'Abonament lunar sau pe an școlar. Vezi prețurile.' }].map((p, i) => (
            <div key={p.name} className={`rounded-2xl bg-white p-6 border-2 ${i ? 'border-orange-300' : 'border-slate-200'}`}>
              <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
              <ul className="mt-4 space-y-2">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-slate-700"><Check className="w-4 h-4 mt-1 text-green-600 shrink-0" aria-hidden />{it}</li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-slate-500">{p.note}</p>
              {i === 1 && <Link href="/preturi" className="mt-3 inline-flex items-center text-sm font-semibold text-blue-700 hover:underline">Vezi prețurile <ArrowRight className="w-4 h-4 ml-1" aria-hidden /></Link>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 rounded-3xl p-10 md:p-14 text-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}>
        <h2 className="text-3xl md:text-4xl font-bold text-white">Prima fișă e la un click distanță</h2>
        <p className="mt-4 text-lg text-blue-100">Alege câteva litere și vezi rezultatul pe loc.</p>
        <Link href="/generator" className="inline-block mt-8">
          <Button size="lg" className="text-white px-8 h-14 text-lg rounded-2xl shadow-lg" style={{ background: ORANGE }}>
            <Download className="w-5 h-5 mr-2" aria-hidden /> Fă o fișă gratuit
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <ForWhom />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
