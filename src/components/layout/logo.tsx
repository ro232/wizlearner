import Link from 'next/link';
import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/brand';

/** The mark: a blue rounded square with three white lines, two long and one short (a bg-white page). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="26" height="26" rx="7" fill="#2448E8" />
      <path d="M7 10h14M7 15h14M7 20h9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0 min-h-11 rounded-lg text-ink" aria-label={`${BRAND_NAME}, prima pagină`}>
      <LogoMark size={small ? 24 : 28} />
      <span className={`font-bold tracking-[-0.02em] leading-none ${small ? 'text-[17px]' : 'text-xl'}`}>{BRAND_WORDMARK}</span>
    </Link>
  );
}
