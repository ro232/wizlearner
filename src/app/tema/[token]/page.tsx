import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo, LogoMark } from '@/components/layout/logo';
import { Footer } from '@/components/layout/footer';
import { HomeworkDownload } from '@/components/homework/homework-download';
import { homeworkKeys, verifyHomeworkToken } from '@/lib/homework/token';
import { BRAND_NAME } from '@/lib/brand';

/**
 * „Temă pentru acasă”: the page a parent opens from the teacher's link (see src/lib/homework).
 * The link is checked here, on the server (signature and expiry); the page gets the sheet's
 * settings only, and the PDF is drawn on the phone with the name the parent types, which is
 * never sent anywhere. Not for search engines: every link is someone's homework.
 */
export const dynamic = 'force-dynamic';

const NOINDEX = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } as const;

const read = (token: string) => {
  let t = token;
  try {
    t = decodeURIComponent(token);
  } catch {
    // keep it as it came
  }
  return verifyHomeworkToken(t, homeworkKeys());
};

export function generateMetadata({ params }: { params: { token: string } }): Metadata {
  const res = read(params.token);
  const title = res.ok && res.homework.title ? `Temă pentru acasă: ${res.homework.title}` : 'Temă pentru acasă';
  const description = 'Fișa de lucru trimisă de cadrul didactic. Scrieți numele copilului dacă doriți și descărcați PDF-ul, gratuit și fără cont.';
  return {
    title: { absolute: `${title} · ${BRAND_NAME}` },
    description,
    robots: NOINDEX,
    referrer: 'no-referrer',
    openGraph: { title, description, type: 'website', siteName: BRAND_NAME, locale: 'ro_RO' },
  };
}

export default function HomeworkPage({ params }: { params: { token: string } }) {
  const res = read(params.token);
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-line bg-white">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center">
          <Logo small />
        </div>
      </header>
      <main className="flex-1">
        {res.ok ? <HomeworkDownload homework={res.homework} /> : <Unavailable expired={res.reason === 'expired'} />}
      </main>
      <Footer />
    </div>
  );
}

function Unavailable({ expired }: { expired: boolean }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-14 text-center">
      <div className="inline-flex"><LogoMark size={44} /></div>
      <h1 className="mt-4 text-3xl font-bold leading-tight text-ink">{expired ? 'Tema aceasta a expirat' : 'Linkul nu se deschide'}</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        {expired
          ? 'Linkurile pentru teme funcționează doar câteva săptămâni. Cereți cadrului didactic un link nou.'
          : 'Linkul pare incomplet sau a fost schimbat. Deschideți-l încă o dată, întreg, din mesajul primit, sau cereți cadrului didactic un link nou.'}
      </p>
      <div className="mt-8 flex flex-col gap-3 items-center">
        <Link href="/fise" data-btn="primary" className="inline-flex items-center justify-center min-h-12 px-6 text-base">Fișe gratuite</Link>
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-brand hover:text-brand-hover hover:underline">Prima pagină {BRAND_NAME}</Link>
      </div>
    </div>
  );
}
