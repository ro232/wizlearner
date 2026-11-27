import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { linkPrefetch } from '@/lib/role-links';

const shell = 'flex h-full min-h-[88px] gap-3 rounded-xl border-2 p-4';
const iconBox = 'shrink-0 w-11 h-11 rounded-lg border-2 flex items-center justify-center';

/** A big card of the dashboards: one tool, one sentence, the whole card is the link. */
export function DashCard({ href, icon: Icon, title, text, primary = false }: { href: string; icon: LucideIcon; title: string; text: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={linkPrefetch(href)}
      data-dash-card
      className={`group ${shell} border-ink bg-white hover:bg-paper focus-visible:outline-ink ${primary ? 'shadow-[4px_4px_0_#C8102E]' : ''}`}
    >
      <span className={`${iconBox} border-ink bg-pencil`} aria-hidden>
        <Icon className="w-5 h-5 text-ink" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-lg font-extrabold leading-snug text-ink group-hover:text-pen">
          {title} <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
        </span>
        <span className="block text-slate-700">{text}</span>
      </span>
    </Link>
  );
}

/** A tool that is not built yet: it looks like a card, says „În curând” and cannot be clicked. */
export function SoonCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div data-soon-card aria-disabled="true" className={`${shell} border-dashed border-slate-400 bg-paper`}>
      <span className={`${iconBox} border-slate-400 bg-white`} aria-hidden>
        <Icon className="w-5 h-5 text-slate-600" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-lg font-extrabold leading-snug text-slate-700">
          {title}
          <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-extrabold text-white">În curând</span>
        </span>
        <span className="block text-slate-600">{text}</span>
      </span>
    </div>
  );
}
