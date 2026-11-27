'use client';
/* eslint-disable @next/next/no-img-element -- static SVGs drawn at build time by the PDF engine; width and height are set */

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { ROLE_HOME, useRoleStore, type Role } from '@/stores/role-store';

/**
 * Right under the hero: „Sunt educatoare / învățătoare” and „Sunt părinte”. A click remembers the
 * role in this browser (and on the profile, for a signed-in person) and opens that role's
 * dashboard. The cards are plain links, so they also work before the page's scripts have loaded.
 * The thumbnails are the static SVGs of the „Fișe de lucru” pages: no sheet engine is loaded here.
 */
const CARDS: { role: Role; title: string; text: string; go: string; sheet: string }[] = [
  {
    role: 'cadru',
    title: 'Sunt educatoare / învățătoare',
    text: 'Câte o fișă cu numele fiecărui copil din grupă, fișe pe programă și planificarea, toate într-un singur panou.',
    go: 'Deschide panoul pentru cadre didactice',
    sheet: '/fise-de-lucru/clasa-pregatitoare/despartirea-in-silabe/fisa.svg',
  },
  {
    role: 'parinte',
    title: 'Sunt părinte',
    text: 'Fișa cu numele copilului, caiete de printat acasă și fișe alese după vârsta lui, fără cont.',
    go: 'Deschide panoul pentru părinți',
    sheet: '/fise-de-lucru/gradinita/cifre/fisa.svg',
  },
];

export function RoleCards() {
  // null until the stored role is read, after the first render: the server HTML has no badge
  const role = useRoleStore((s) => s.role);
  return (
    <section className="border-b-2 border-ink bg-white py-12 sm:py-14" aria-labelledby="rol-titlu">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 id="rol-titlu" className="text-[28px] sm:text-[34px] font-extrabold leading-tight text-ink">Pentru cine faci fișe?</h2>
        <p className="mt-2 text-lg text-slate-700">Alegi o dată și primești meniul și panoul potrivite. Poți schimba oricând din meniu.</p>
        <ul className="mt-7 grid gap-5 md:grid-cols-2">
          {CARDS.map((c) => (
            <li key={c.role}>
              <Link
                href={ROLE_HOME[c.role]}
                data-role-card={c.role}
                onClick={() => useRoleStore.getState().setRole(c.role)}
                className="group flex h-full items-center gap-4 sm:gap-6 rounded-2xl border-2 border-ink bg-paper p-5 sm:p-6 shadow-md hover:-translate-y-0.5 hover:bg-white transition-transform focus-visible:outline-ink"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl sm:text-[28px] font-display font-extrabold leading-tight text-ink">{c.title}</span>
                  <span className="mt-2 block text-slate-700">{c.text}</span>
                  <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-extrabold text-pen">
                    {c.go} <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                  {role === c.role && (
                    <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Check className="w-4 h-4 text-pen" aria-hidden /> Rolul ales acum
                    </span>
                  )}
                </span>
                <img src={c.sheet} alt="" width={92} height={130} loading="lazy" decoding="async"
                  className="hidden min-[360px]:block shrink-0 w-[76px] sm:w-[92px] h-auto rounded-[3px] border-2 border-ink bg-white rotate-2 shadow-sm" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
