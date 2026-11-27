'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { adventBannerVisible } from '@/lib/advent-season';

/**
 * SEASONAL (Advent 2026): the home page card that points to /advent. It hides itself from
 * 26 December 2026; after Christmas remove this file and its line in src/app/page.tsx.
 */
export function AdventBanner() {
  // the home page is prerendered: the visitor's own date decides, once in the browser
  const [visible, setVisible] = useState(true);
  useEffect(() => setVisible(adventBannerVisible()), []);
  if (!visible) return null;
  return (
    <section className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-14 sm:pt-[72px]" aria-label="Calendarul de Advent">
      <Link href="/advent" prefetch={false} className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6 text-ink transition-colors hover:border-line-strong">
        <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-soft" aria-hidden>
          <CalendarDays className="w-5 h-5 text-brand" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-lg">Calendarul de Advent, gratuit</span>
          <span className="block text-slate-600">O fișă pe zi, de la 1 la 24 decembrie, cu numele copilului. Grădiniță, pregătitoare și clasa I.</span>
        </span>
        <span className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand group-hover:text-brand-hover">
          Vezi calendarul <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </section>
  );
}
