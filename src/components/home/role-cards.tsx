'use client';

import Link from 'next/link';
import { ArrowRight, Check, House, Users } from 'lucide-react';
import { ROLE_HOME, useRoleStore, type Role } from '@/stores/role-store';

/**
 * Right under the hero: „Sunt educatoare / învățătoare” and „Sunt părinte”. A click remembers the
 * role in this browser (and on the profile, for a signed-in person) and opens that role's
 * dashboard. The cards are plain links, so they also work before the page's scripts have loaded.
 */
const CARDS: { role: Role; title: string; text: string; go: string; icon: typeof Users }[] = [
  {
    role: 'cadru',
    title: 'Sunt educatoare / învățătoare',
    text: 'Câte o fișă cu numele fiecărui copil din grupă, fișe pe programă și planificarea, toate într-un singur panou.',
    go: 'Deschide panoul pentru cadre didactice',
    icon: Users,
  },
  {
    role: 'parinte',
    title: 'Sunt părinte',
    text: 'Fișa cu numele copilului, caiete de printat acasă și fișe alese după vârsta lui, fără cont.',
    go: 'Deschide panoul pentru părinți',
    icon: House,
  },
];

export function RoleCards() {
  // null until the stored role is read, after the first render: the server HTML has no badge
  const role = useRoleStore((s) => s.role);
  return (
    <section className="border-y border-line bg-paper" aria-labelledby="rol-titlu">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-14 sm:py-[72px]">
        <h2 id="rol-titlu" className="text-[26px] sm:text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink">Pentru cine faci fișe?</h2>
        <p className="mt-2 text-base sm:text-lg text-slate-600">Alegi o dată și primești meniul și panoul potrivite. Poți schimba oricând din meniu.</p>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {CARDS.map((c) => (
            <li key={c.role}>
              <Link
                href={ROLE_HOME[c.role]}
                data-role-card={c.role}
                onClick={() => useRoleStore.getState().setRole(c.role)}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-6 sm:p-8 text-ink transition-colors hover:border-line-strong"
              >
                <c.icon className="w-7 h-7 text-brand" strokeWidth={1.8} aria-hidden />
                <span className="text-xl sm:text-[22px] font-bold leading-snug">{c.title}</span>
                <span className="text-base leading-relaxed text-slate-600">{c.text}</span>
                <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-brand group-hover:text-brand-hover">
                  {c.go} <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                {role === c.role && (
                  <span className="-mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Check className="w-4 h-4 text-brand" aria-hidden /> Rolul ales acum
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
