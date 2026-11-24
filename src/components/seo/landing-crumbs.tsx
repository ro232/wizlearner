import Link from 'next/link';

/** The visible breadcrumb of the „Fișe de lucru” pages (the JSON-LD one is built in landing.ts). */
export function LandingCrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Unde ești" className="text-sm font-bold text-slate-600">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((c, i) => (
          <li key={c.name} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {c.path ? (
              <Link href={c.path} className="underline underline-offset-4 hover:text-pen">{c.name}</Link>
            ) : (
              <span aria-current="page">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
