import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { warnIfOperatorIncomplete } from '@/lib/legal';

/** Plain reading layout for the legal pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  // Rendered on the server (at build time): leaves a reminder in the log while company details are missing.
  warnIfOperatorIncomplete();
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima actualizare: {updated}</p>
        <div className="mt-8 space-y-5 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-pen">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** Date shown at the top of both legal pages. */
export const LEGAL_UPDATED = '13 noiembrie 2026';
