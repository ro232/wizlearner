'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { adventBannerVisible } from '@/lib/worksheet/advent';

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
    <section className="px-4 sm:px-6 pt-10" aria-label="Calendarul de Advent">
      <Link href="/advent" className="group max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border-2 border-ink bg-white p-5 sm:p-6 shadow-md hover:bg-paper">
        <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pencil border-2 border-ink" aria-hidden>
          <CalendarDays className="w-6 h-6 text-ink" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-extrabold text-lg text-ink">Calendarul de Advent, gratuit</span>
          <span className="block text-slate-700">O fișă pe zi, de la 1 la 24 decembrie, cu numele copilului. Grădiniță, pregătitoare și clasa I.</span>
        </span>
        <span className="inline-flex items-center gap-1 font-extrabold text-pen">
          Vezi calendarul <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </section>
  );
}
