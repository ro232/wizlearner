import Link from 'next/link';
import { Pencil, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t py-10 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}
          >
            <Pencil className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold">
            <span className="text-slate-900">Worksheet</span>
            <span className="gradient-text">Wiz</span>
          </span>
        </Link>
        <p className="text-xs text-slate-500">
          Făcut cu <Heart className="w-3 h-3 inline text-red-400 fill-red-400 mx-0.5" aria-hidden /> pentru cei mici  •  © 2026 WorksheetWiz
          <br />
          Imagini: <a href="https://github.com/jdecked/twemoji" className="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer">Twemoji</a>, CC-BY 4.0
        </p>
        <div className="flex gap-5 text-xs font-medium text-slate-500">
          <Link href="/confidentialitate" className="hover:text-blue-600 transition-colors">Confidențialitate</Link>
          <Link href="/termeni" className="hover:text-blue-600 transition-colors">Termeni</Link>
        </div>
      </div>
    </footer>
  );
}
