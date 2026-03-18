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
          Made with <Heart className="w-3 h-3 inline text-red-400 fill-red-400 mx-0.5" /> for little learners  •  © 2026 WorksheetWiz
        </p>
        <div className="flex gap-5 text-xs font-medium text-slate-500">
          <button className="hover:text-blue-600 transition-colors">Privacy</button>
          <button className="hover:text-blue-600 transition-colors">Terms</button>
          <button className="hover:text-blue-600 transition-colors">Contact</button>
        </div>
      </div>
    </footer>
  );
}
