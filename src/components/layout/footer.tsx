import Link from 'next/link';
import { Logo } from './logo';
import { OPERATOR, operatorDetails } from '@/lib/legal';
import { BRAND_NAME } from '@/lib/brand';

/** Where consumers can take a dispute (ANPC, Ordinul 449/2022). Text links only. */
export const ANPC_SAL_URL = 'https://reclamatiisal.anpc.ro/';
export const ANPC_URL = 'https://anpc.ro/';

const link = 'underline underline-offset-2 hover:text-brand';

export function Footer() {
  // Company identification, only from the fields that are filled in.
  const items: React.ReactNode[] = [
    OPERATOR.name && <strong className="font-semibold text-ink">{OPERATOR.name}</strong>,
    ...operatorDetails().map((d) => `${d.label}${d.label === 'Sediu' ? ':' : ''} ${d.value}`),
    OPERATOR.email && <>E-mail: <a href={`mailto:${OPERATOR.email}`} className={link}>{OPERATOR.email}</a></>,
    OPERATOR.phone && <>Telefon: <a href={`tel:${OPERATOR.phone.replace(/[^\d+]/g, '')}`} className={link}>{OPERATOR.phone}</a></>,
  ].filter(Boolean);

  return (
    <footer className="border-t border-line bg-white py-10 sm:py-12">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-10">
          <Logo small />
          <nav aria-label="Pagini legale" className="flex flex-1 flex-wrap gap-x-6 gap-y-0 text-sm text-slate-600 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
            <Link href="/cauta" className="hover:text-brand">Caută fișe</Link>
            <Link href="/fise" className="hover:text-brand">Fișe gratuite</Link>
            <Link href="/fise-de-lucru" className="hover:text-brand">Fișe de lucru pe clase</Link>
            <Link href="/programa" className="hover:text-brand">Fișe pe programă</Link>
            <Link href="/planificare" className="hover:text-brand">Planificare calendaristică</Link>
            <Link href="/advent" prefetch={false} className="hover:text-brand">Calendar de Advent</Link>
            <Link href="/planse" className="hover:text-brand">Planșe și diplome</Link>
            <Link href="/book" prefetch={false} className="hover:text-brand">Caiet KDP</Link>
            <Link href="/preturi" className="hover:text-brand">Prețuri</Link>
            <Link href="/confidentialitate" className="hover:text-brand">Confidențialitate</Link>
            <Link href="/termeni" className="hover:text-brand">Termeni</Link>
            {OPERATOR.email && (
              <a href={`mailto:${OPERATOR.email}?subject=${BRAND_NAME}`} className="hover:text-brand">
                Ai o idee? Scrie-ne
              </a>
            )}
          </nav>
        </div>

        <div className="mt-6 pt-5 border-t border-line space-y-2 text-xs leading-relaxed text-slate-600">
          {items.length > 0 && (
            <address className="not-italic" data-testid="operator">
              {items.map((item, i) => (
                <span key={i}>{i > 0 && ' · '}{item}</span>
              ))}
            </address>
          )}
          <p>
            Litigii de consum:{' '}
            <a href={ANPC_SAL_URL} className={link} target="_blank" rel="noopener noreferrer">ANPC – Soluționarea alternativă a litigiilor</a>
            {' · '}
            <a href={ANPC_URL} className={link} target="_blank" rel="noopener noreferrer">anpc.ro</a>
          </p>
          <p>
            Făcut pentru cei mici, în România · © 2026 {BRAND_NAME} · Imagini:{' '}
            <a href="https://github.com/jdecked/twemoji" className={link} target="_blank" rel="noopener noreferrer">Twemoji</a>, CC-BY 4.0
          </p>
        </div>
      </div>
    </footer>
  );
}
