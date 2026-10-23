import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { SubscribeButton } from '@/components/billing/subscribe-button';
import { PLANS, billingConfigured } from '@/lib/billing/plans';
import { stripe } from '@/lib/stripe';

export const metadata: Metadata = { title: 'Prețuri · WorksheetWiz' };
export const revalidate = 3600; // prices come from Stripe; refresh hourly

const FREE = ['Literele A–E (și Ă, Â), cifrele 0–5', 'Trei forme și trei exerciții grafice', 'Fișa cu numele copilului', 'Fișe pentru grupă: încearcă cu 3 copii', 'Caietul KDP, cu filigran'];
const FULL = ['Fișe pentru toată grupa, până la 40 de copii, pe teme', 'Tot alfabetul românesc și englez, mari și mici', 'Cifre și numere 0–20, toate formele și exercițiile', 'Orice cuvânt de trasat', 'Fișele salvate în cont', 'Caietul KDP fără filigran, pe care îl poți vinde'];

function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return '';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: amount % 100 ? 2 : 0 }).format(amount / 100);
}

async function loadPrices(): Promise<Record<string, string>> {
  if (!billingConfigured()) return {};
  const out: Record<string, string> = {};
  await Promise.all(
    PLANS.filter((p) => p.envPrice).map(async (p) => {
      try {
        const price = await stripe().prices.retrieve(p.envPrice!);
        out[p.id] = formatPrice(price.unit_amount, price.currency);
      } catch {
        /* a missing price just hides that plan */
      }
    }),
  );
  return out;
}

export default async function PricingPage() {
  const prices = await loadPrices();
  const live = PLANS.filter((p) => prices[p.id]);
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center">Prețuri</h1>
        <p className="mt-3 text-center text-slate-600">Începi gratuit. Treci la varianta completă când ai nevoie de fișe pentru toată grupa.</p>

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white p-6 border-2 border-slate-200 flex flex-col">
            <h2 className="text-xl font-bold text-slate-900">Gratuit</h2>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">0 lei</p>
            <ul className="mt-5 space-y-2 flex-1">
              {FREE.map((f) => <li key={f} className="flex gap-2 text-slate-700"><Check className="w-4 h-4 mt-1 text-green-600 shrink-0" aria-hidden />{f}</li>)}
            </ul>
            <Link href="/generator" className="mt-6 block text-center rounded-xl border-2 border-slate-300 h-12 leading-[44px] font-semibold text-slate-700 hover:bg-slate-50">Începe gratuit</Link>
          </div>

          <div className="rounded-2xl bg-white p-6 border-2 border-orange-300 flex flex-col">
            <h2 className="text-xl font-bold text-slate-900">Complet</h2>
            <ul className="mt-5 space-y-2 flex-1">
              {FULL.map((f) => <li key={f} className="flex gap-2 text-slate-700"><Check className="w-4 h-4 mt-1 text-green-600 shrink-0" aria-hidden />{f}</li>)}
            </ul>
            {live.length ? (
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {live.map((p, i) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-600">{p.title}</div>
                    <div className="text-2xl font-extrabold text-slate-900">{prices[p.id]}</div>
                    <div className="text-xs text-slate-500 mb-3">{p.period}</div>
                    <SubscribeButton plan={p.id} label="Abonează-te" highlight={i === live.length - 1} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-orange-50 p-4 text-sm text-slate-700">
                Plata online vine în curând. Dacă ai un cod de acces, îl activezi din <Link href="/cont" className="font-semibold underline">contul tău</Link>.
              </p>
            )}
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">Plata se face prin Stripe. Abonamentul se anulează oricând din cont; rămâi cu acces până la sfârșitul perioadei plătite.</p>
      </main>
      <Footer />
    </div>
  );
}
