'use client';

import { useEffect, useRef, useState } from 'react';
import { UserRound, Library, CalendarDays, Shapes, Check } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { DashCard } from '@/components/dashboard/dash-card';
import { CHILD_STAGES, stageLevel, useRoleStore, type ChildStage } from '@/stores/role-store';
import { STAGE_TOPICS } from '@/lib/role-links';
import { adventBannerVisible } from '@/lib/advent-season';

const wrap = 'max-w-4xl mx-auto px-4 sm:px-6';
const h2 = 'text-2xl sm:text-[28px] font-extrabold leading-tight text-ink';

/**
 * The parent's dashboard. First the child's age or class (remembered in this browser, never a
 * name), then four cards: the name sheet, the workbooks, the Advent calendar while it runs and the
 * sheets of that class by topic. No school paperwork here: a sheet is at most three clicks away
 * (the age, the card, „Descarcă PDF”).
 */
export default function ParentDashboard() {
  const stage = useRoleStore((s) => s.childStage);
  const hydrated = useRoleStore((s) => s.hydrated);
  const setStage = useRoleStore((s) => s.setChildStage);
  // „Schimbă”: the choices come back, with the current one marked
  const [changing, setChanging] = useState(false);
  // the visitor's own date decides, once in the browser (the page is prerendered)
  const [advent, setAdvent] = useState(false);
  useEffect(() => setAdvent(adventBannerVisible()), []);
  const cards = useRef<HTMLHeadingElement>(null);

  const level = stageLevel(stage);
  const chosen = CHILD_STAGES.find((s) => s.id === stage);
  const choosing = !chosen || changing;

  const pick = (id: ChildStage) => {
    setStage(id);
    setChanging(false);
    // the cards appear under the choice: keyboard and screen-reader users are taken to them
    requestAnimationFrame(() => cards.current?.focus());
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <section className="ruled border-b-2 border-ink">
          <div className={`${wrap} py-9 sm:py-12`}>
            <h1 className="text-[34px] sm:text-5xl font-extrabold leading-[1.05] text-ink">Fișe pentru copilul tău</h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-700">Alegi vârsta sau clasa, apoi fișa. O printezi acasă în câteva minute, fără cont.</p>
          </div>
        </section>

        <div className={`${wrap} py-10 min-h-[420px]`}>
          {!hydrated ? (
            // until the stored choice is read: an empty space of the same height, so nothing jumps
            <p className="text-sm text-slate-600" data-loading>Se încarcă…</p>
          ) : (
            <>
              <section aria-labelledby="varsta-titlu" data-step="varsta">
                {choosing ? (
                  <>
                    <h2 id="varsta-titlu" className={h2}>Câți ani are copilul sau în ce clasă este?</h2>
                    <div role="group" aria-labelledby="varsta-titlu" className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
                      {CHILD_STAGES.map((s) => (
                        <button key={s.id} type="button" data-stage={s.id} aria-pressed={stage === s.id} onClick={() => pick(s.id)}
                          className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 border-ink px-4 text-left text-lg font-extrabold text-ink hover:bg-white focus-visible:outline-ink ${stage === s.id ? 'bg-pencil' : 'bg-white/70'}`}>
                          {s.label}
                          {stage === s.id && <Check className="w-5 h-5 shrink-0" aria-hidden />}
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-600" data-note="clase-mari">Clasele a III-a și a IV-a: în lucru</p>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white px-4 py-3">
                    <h2 id="varsta-titlu" className="font-sans text-base font-bold tracking-normal text-slate-700">
                      Fișe pentru: <span className="font-extrabold text-ink" data-chosen-stage>{chosen.label}</span>
                    </h2>
                    <button type="button" onClick={() => setChanging(true)}
                      className="inline-flex min-h-11 items-center rounded-lg border-2 border-ink bg-white px-3 text-sm font-extrabold text-ink hover:bg-paper focus-visible:outline-ink">
                      Schimbă vârsta
                    </button>
                  </div>
                )}
              </section>

              {chosen && level && !changing && (
                <section className="mt-8" aria-labelledby="fise-titlu" data-step="fise">
                  <h2 id="fise-titlu" ref={cards} tabIndex={-1} className={`${h2} focus:outline-none`}>Ce printăm azi?</h2>
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                    <li><DashCard primary href="/nume" icon={UserRound} title="Fișă cu numele copilului" text="Scrii numele și descarci fișa de trasat. Gratuit, fără cont." /></li>
                    <li><DashCard href="/caiete" icon={Library} title="Caiete de lucru" text="Tot alfabetul sau toate cifrele, câte o pagină pentru fiecare." /></li>
                    {advent && (
                      <li><DashCard href="/advent" icon={CalendarDays} title="Calendar de Advent" text="O fișă pe zi, de la 1 la 24 decembrie, cu numele copilului." /></li>
                    )}
                    <li><DashCard href={STAGE_TOPICS[level].href} icon={Shapes} title="Fișe pe teme" text={`Litere, numere și jocuri pentru ${STAGE_TOPICS[level].where}, alese pe teme.`} /></li>
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
