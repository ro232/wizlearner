'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Users, ListChecks, CalendarRange, Library, LayoutGrid, Search, CalendarCheck, Send, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { DashCard, SoonCard } from '@/components/dashboard/dash-card';
import { useAuth } from '@/hooks/use-auth';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { loadGroups, type SavedGroup } from '@/lib/saved-groups';
import { subscriptionSummary } from '@/lib/billing/summary';
import { OPEN_ACCESS } from '@/lib/open-access';
import { copii } from '@/components/worksheet/plural';

// The account parts (saved children, saved sheets) are fetched only for a signed-in person.
const SavedChildren = dynamic(() => import('@/components/dashboard/teacher-account').then((m) => m.SavedChildren), { ssr: false, loading: () => <p className="text-sm text-slate-600">Se încarcă…</p> });
const RecentSheets = dynamic(() => import('@/components/dashboard/teacher-account').then((m) => m.RecentSheets), { ssr: false, loading: () => <p className="text-sm text-slate-600">Se încarcă…</p> });

const TIER = { free: 'Gratuit', starter: 'Starter', full: 'Complet' } as const;

const wrap = 'max-w-[1120px] mx-auto px-4 sm:px-6';
const h2 = 'text-2xl sm:text-[28px] font-bold leading-tight text-ink';
const panel = 'rounded-2xl border border-line bg-white p-5 sm:p-6';
const textLink = 'font-bold text-brand underline decoration-brand/30 underline-offset-2';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 font-semibold text-ink hover:bg-paper';

/** How many children a saved list holds: one per filled line, as it was pasted. */
const listSize = (g: SavedGroup) => g.namesText.split('\n').filter((line) => line.trim()).length;

/**
 * The teacher's dashboard: the tools of every week as big cards, the groups saved in this
 * browser, the last saved sheets and the plan. Open to everyone; it only gathers links and what
 * the account pages already show. Children's names stay where they were: in this browser
 * (saved-groups.ts) or, for the children saved in the account, in the existing panel of /cont.
 */
export default function TeacherDashboard() {
  const { user, profile, loading } = useAuth();
  const tier = useWorksheetStore((s) => s.tier);
  // read after the first render: the groups live in this browser only
  const [groups, setGroups] = useState<SavedGroup[] | null>(null);
  useEffect(() => setGroups(loadGroups()), []);

  const summary = user ? subscriptionSummary(profile?.subscription_status, profile?.subscription_period_end, tier) : null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <section className="bg-white border-b border-line">
          <div className={`${wrap} py-9 sm:py-12`}>
            <h1 className="text-[34px] sm:text-5xl font-bold leading-[1.05] text-ink">Panoul cadrului didactic</h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-700">Uneltele pentru grupă sau clasă, la un click: fișe cu numele fiecărui copil, fișe pe programă, planificare.</p>
          </div>
        </section>

        <section className={`${wrap} py-10`} aria-labelledby="actiuni-titlu">
          <h2 id="actiuni-titlu" className={h2}>Ce faci azi?</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <li><DashCard primary href="/grupa" icon={Users} title="Fișă pentru toată grupa" text="Lipești lista și primești câte o fișă cu numele fiecărui copil." /></li>
            <li><DashCard href="/programa" icon={ListChecks} title="Fișe după programă" text="Alegi clasa și competența; codul se tipărește pe fișă." /></li>
            <li><DashCard href="/planificare" icon={CalendarRange} title="Planificare" text="Planificarea calendaristică 2026–2027, în Word sau PDF." /></li>
            <li><DashCard href="/caiete" icon={Library} title="Caiete" text="Tot alfabetul sau toate cifrele, gata de printat." /></li>
            <li><DashCard href="/planse" icon={LayoutGrid} title="Planșe și diplome" text="Alfabetul pentru perete, cartonașe, diplome cu nume." /></li>
            <li><DashCard href="/cauta" icon={Search} title="Caută fișe" text="Toate fișele, după temă, clasă și materie." /></li>
            <li><SoonCard icon={CalendarCheck} title="Tema săptămânii" text="Fișele săptămânii, alese după planificarea ta." /></li>
            <li><SoonCard icon={Send} title="Teme trimise părinților" text="Ce teme ai trimis și până când sunt valabile linkurile." /></li>
          </ul>
        </section>

        <div className={`${wrap} pb-12 grid gap-6 lg:grid-cols-2`}>
          <section className={panel} aria-labelledby="grupe-titlu">
            <h2 id="grupe-titlu" className={h2}>Grupele mele</h2>
            {groups === null ? (
              <p className="mt-3 min-h-[72px] text-sm text-slate-600">Se încarcă…</p>
            ) : groups.length > 0 ? (
              <>
                <ul className="mt-3 divide-y divide-line" data-groups>
                  {groups.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-ink">{g.name || 'Grupă fără nume'}</span>
                        <span className="text-sm text-slate-600">{copii(listSize(g))}</span>
                      </span>
                      <Link href="/grupa" prefetch={false} className={`${button} shrink-0 text-sm`} aria-label={`Fă fișe pentru ${g.name || 'grupa fără nume'}`}>
                        Fă fișe <ArrowRight className="w-4 h-4" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-slate-600">Listele sunt păstrate doar în acest browser; numele copiilor nu ajung la noi.</p>
              </>
            ) : (
              <div className="mt-3 min-h-[72px]">
                <p className="text-slate-700">Lipești lista grupei o singură dată, o salvezi în acest browser și de aici o deschizi dintr-un click. Numele copiilor nu ajung la noi.</p>
                <Link href="/grupa" prefetch={false} className={`${button} mt-4`}>
                  Creează grupa <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
            )}
            {user && (
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="font-sans text-sm font-bold tracking-normal text-pen">Copiii salvați în cont</h3>
                <div className="mt-2">
                  <SavedChildren userId={user.id} />
                </div>
              </div>
            )}
          </section>

          <section className={panel} aria-labelledby="recente-titlu">
            <h2 id="recente-titlu" className={h2}>Fișe recente</h2>
            <div className="mt-3 min-h-[72px]">
              {loading ? (
                <p className="text-sm text-slate-600">Se încarcă…</p>
              ) : user ? (
                <RecentSheets userId={user.id} />
              ) : (
                <>
                  <p className="text-slate-700">Ultima fișă făcută rămâne în acest browser. Cu un cont le salvezi pe toate și le refaci de pe orice calculator.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/generator" prefetch={false} className={button}>
                      Continuă ultima fișă <ArrowRight className="w-4 h-4" aria-hidden />
                    </Link>
                    <Link href="/auth/login?next=/panou/cadru" className={`${button} border-line`}>Intră în cont</Link>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Test period (OPEN_ACCESS): everything is open, so no plan and no offer are shown. */}
        {!OPEN_ACCESS && !loading && (
          <section className={`${wrap} pb-12`} aria-labelledby="abonament-titlu" data-plan>
            <div className="rounded-xl border border-line bg-white/70 px-5 py-4 text-slate-700">
              <h2 id="abonament-titlu" className="font-sans text-sm font-bold tracking-normal text-ink">Varianta ta: {TIER[tier]}</h2>
              <p className="mt-1 text-sm">
                {summary ? summary.text : tier === 'free' ? (user ? 'Ai varianta gratuită.' : 'Folosești varianta gratuită, fără cont.') : 'Ai acces la toate fișele și uneltele.'}
                {tier === 'free' && (
                  <> <Link href="/preturi" className={textLink}>Vezi ce aduce varianta completă</Link></>
                )}
                {user && tier !== 'free' && (
                  <> <Link href="/cont" className={textLink}>Contul tău</Link></>
                )}
              </p>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
