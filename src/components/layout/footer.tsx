import Link from 'next/link';
import { Logo } from './logo';
import { OPERATOR, operatorDetails } from '@/lib/legal';

/** Where consumers can take a dispute (ANPC, Ordinul 449/2022). Text links only. */
export const ANPC_SAL_URL = 'https://reclamatiisal.anpc.ro/';
export const ANPC_URL = 'https://anpc.ro/';

const link = 'underline underline-offset-2 hover:text-pen';

export function Footer() {
  // Company identification, only from the fields that are filled in.
  const items: React.ReactNode[] = [
    OPERATOR.name && <strong className="text-ink">{OPERATOR.name}</strong>,
    ...operatorDetails().map((d) => `${d.label}${d.label === 'Sediu' ? ':' : ''} ${d.value}`),
    OPERATOR.email && <>E-mail: <a href={`mailto:${OPERATOR.email}`} className={link}>{OPERATOR.email}</a></>,
    OPERATOR.phone && <>Telefon: <a href={`tel:${OPERATOR.phone.replace(/[^\d+]/g, '')}`} className={link}>{OPERATOR.phone}</a></>,
  ].filter(Boolean);

  return (
    <footer className="border-t-2 border-ink py-10 bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <Logo small />
          <nav aria-label="Pagini legale" className="flex flex-wrap justify-center gap-x-5 text-sm font-bold text-slate-600 [&>a]:py-2.5">
            <Link href="/fise" className="hover:text-pen">Fișe gratuite</Link>
            <Link href="/preturi" className="hover:text-pen">Prețuri</Link>
            <Link href="/confidentialitate" className="hover:text-pen">Confidențialitate</Link>
            <Link href="/termeni" className="hover:text-pen">Termeni</Link>
            {OPERATOR.email && (
              <a href={`mailto:${OPERATOR.email}?subject=WorksheetWiz`} className="hover:text-pen">
                Ai o idee? Scrie-ne
              </a>
            )}
          </nav>
        </div>

        <div className="mt-6 pt-5 border-t border-ink/15 space-y-2 text-xs leading-relaxed text-slate-600 text-center md:text-left">
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
            Făcut pentru cei mici, în România · © 2026 WorksheetWiz · Imagini:{' '}
            <a href="https://github.com/jdecked/twemoji" className={link} target="_blank" rel="noopener noreferrer">Twemoji</a>, CC-BY 4.0
          </p>
        </div>
      </div>
    </footer>
  );
}
