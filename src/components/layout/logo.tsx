import Link from 'next/link';

/** The pencil mark: yellow body, red eraser band, navy outline. */
export function PencilMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <g transform="rotate(35 17 17)">
        <rect x="13" y="1.5" width="8" height="22" rx="1.5" fill="#F2B632" stroke="#1F2A44" strokeWidth="2" />
        <rect x="13" y="1.5" width="8" height="5" fill="#C8102E" stroke="#1F2A44" strokeWidth="2" />
        <path d="M13 23.5 L17 32 L21 23.5 Z" fill="#F4D9B0" stroke="#1F2A44" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15.6 29 L17 32 L18.4 29 Z" fill="#1F2A44" />
      </g>
    </svg>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="WorksheetWiz, prima pagină">
      <span className="transition-transform group-hover:-rotate-6">
        <PencilMark size={small ? 26 : 32} />
      </span>
      <span className={`font-display font-extrabold tracking-tight text-ink ${small ? 'text-lg' : 'text-[22px]'}`}>
        Worksheet<span className="text-pen">Wiz</span>
      </span>
    </Link>
  );
}
