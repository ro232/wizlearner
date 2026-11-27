import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { linkPrefetch } from '@/lib/role-links';

const shell = 'flex h-full min-h-[88px] gap-3.5 rounded-2xl border p-5';
const iconBox = 'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center';

/** A big card of the dashboards: one tool, one sentence, the whole card is the link. */
export function DashCard({ href, icon: Icon, title, text, primary = false }: { href: string; icon: LucideIcon; title: string; text: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={linkPrefetch(href)}
      data-dash-card
      className={`group ${shell} ${primary ? 'border-brand/40' : 'border-line'} bg-white transition-colors hover:border-line-strong hover:bg-paper`}
    >
      <span className={`${iconBox} bg-brand-soft`} aria-hidden>
        <Icon className="w-5 h-5 text-brand" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-lg font-bold leading-snug text-ink group-hover:text-brand">
          {title} <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
        </span>
        <span className="mt-0.5 block text-slate-600">{text}</span>
      </span>
    </Link>
  );
}

/** A tool that is not built yet: it looks like a card, says „În curând” and cannot be clicked. */
export function SoonCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div data-soon-card aria-disabled="true" className={`${shell} border-dashed border-line-strong bg-paper`}>
      <span className={`${iconBox} border border-line bg-white`} aria-hidden>
        <Icon className="w-5 h-5 text-slate-600" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-lg font-bold leading-snug text-slate-700">
          {title}
          <span className="rounded-md border border-line-strong bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">În curând</span>
        </span>
        <span className="block text-slate-600">{text}</span>
      </span>
    </div>
  );
}
