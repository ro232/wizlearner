import Link from 'next/link';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer className="border-t-2 border-ink py-10 bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-5">
        <Logo small />
        <p className="text-xs text-slate-500 text-center md:text-left">
          Făcut pentru cei mici, în România · © 2026 WorksheetWiz
          <br />
          Imagini: <a href="https://github.com/jdecked/twemoji" className="underline hover:text-pen" target="_blank" rel="noopener noreferrer">Twemoji</a>, CC-BY 4.0
        </p>
        <nav aria-label="Pagini legale" className="flex gap-5 text-xs font-bold text-slate-600">
          <Link href="/preturi" className="hover:text-pen">Prețuri</Link>
          <Link href="/confidentialitate" className="hover:text-pen">Confidențialitate</Link>
          <Link href="/termeni" className="hover:text-pen">Termeni</Link>
        </nav>
      </div>
    </footer>
  );
}
