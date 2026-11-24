import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, QrCode, UserRound, Library, FileDown, Check } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroSheets } from '@/components/home/hero-sheets';
import { ClassPicker } from '@/components/home/class-picker';
import { PlanExcerpt } from '@/components/home/plan-excerpt';
import { SheetGallery } from '@/components/home/sheet-gallery';
import { AdventBanner } from '@/components/home/advent-banner';
import { homeworkShareText } from '@/lib/homework/shared';
import { SITE_URL } from '@/lib/seo/site';
import { routeMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = routeMetadata('/');

const wrap = 'max-w-6xl mx-auto px-4 sm:px-6';
const h2 = 'text-[32px] sm:text-[42px] font-extrabold leading-[1.08] text-ink';
const lead = 'mt-4 text-lg leading-relaxed text-slate-700';
const secondaryBtn = 'inline-flex items-center justify-center gap-2 h-14 px-6 rounded-xl border-2 border-ink bg-white font-extrabold text-ink hover:bg-paper';

function Hero() {
  return (
    <section className="ruled border-b-2 border-ink overflow-x-clip">
      <div className={`${wrap} py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-10 items-center`}>
        <div className="space-y-6">
          <h1 className="text-[40px] sm:text-[56px] lg:text-[58px] xl:text-[64px] font-extrabold leading-[1.03] text-ink">
            Fișe pe programă, de la grădiniță la <span className="whitespace-nowrap">clasa a II-a</span>
          </h1>
          <p className="text-lg sm:text-xl leading-relaxed text-slate-700 max-w-xl">
            Alegi clasa și competența, deschizi fișa și o descarci ca PDF <span className="whitespace-nowrap">într-un</span> minut. Jos, pe fiecare pagină, se tipărește codul
            competenței, ca în planificare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/generator" data-btn="primary" className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl text-base">
              Fă o fișă gratuit <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/programa" className={secondaryBtn}>Alege clasa</Link>
          </div>
          <p className="text-sm text-slate-600">Fără cont, fără card.</p>
          <p className="max-w-xl border-t border-ink/15 pt-4 text-slate-700">
            Ești părinte? Fă o <Link href="/nume" className="font-bold text-ink underline decoration-pen underline-offset-2">fișă cu numele copilului</Link> sau
            descarcă una din <Link href="/fise" className="font-bold text-ink underline decoration-pen underline-offset-2">fișele gratuite</Link>.
          </p>
        </div>
        <HeroSheets />
      </div>
    </section>
  );
}

function Classes() {
  return (
    <section id="clase" className="py-16 sm:py-20 scroll-mt-20" aria-labelledby="clase-titlu">
      <div className={wrap}>
        <h2 id="clase-titlu" className={h2}>Alege clasa</h2>
        <p className={`${lead} max-w-2xl`}>
          Pentru fiecare competență din programă vezi fișele care o lucrează. Numărul de pe card arată pentru câte competențe avem
          deja fișe.
        </p>
        <div className="mt-10">
          <ClassPicker />
        </div>
      </div>
    </section>
  );
}

const CONTENTS = [
  { title: 'Limba română', items: ['Litere de tipar și de mână, cu ordinea liniilor', 'Sunete și silabe', 'Citire și scriere, cu texte originale'] },
  { title: 'Matematică și mediu', items: ['Adunări și scăderi până la 1000, cu și fără trecere peste ordin', 'Înmulțiri și împărțiri', 'Banii, ceasul, calendarul, măsurări, fracții', 'Probleme cu imagini', 'Plante, corpul omenesc, animale, anotimpuri, vremea, apa'] },
  { title: 'Pentru cei mici', items: ['Grafisme, cifre și forme de trasat', 'Sortează, ce nu se potrivește, unde se află', 'Colorează după cod, labirint, diferențe, umbre'] },
];

function Programme() {
  return (
    <section className="py-16 sm:py-20 border-y-2 border-ink bg-white" aria-labelledby="programa-titlu">
      <div className={`${wrap} grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14`}>
        <div>
          <h2 id="programa-titlu" className={h2}>De la grafisme la tabla împărțirii</h2>
          <p className={lead}>
            În generator alegi tema și clasa; fișa ia numerele și textele potrivite clasei și tipărește codul competenței. Fișele cu
            exerciții pot avea la final pagina cu răspunsuri.
          </p>
          <div className="mt-6 rounded-xl border-2 border-ink bg-paper p-5">
            <h3 className="text-xl font-extrabold text-ink">Evaluări pe clasă</h3>
            <p className="mt-2 text-slate-700">
              Exerciții din fiecare temă pe 2–3 pagini, cu antet de evaluare, pagina cu răspunsuri și un tabel orientativ de
              calificative (FB, B, S, I). La grădiniță, cu fișă de observare. Le găsești pe pagina fiecărei clase.
            </p>
          </div>
          <Link href="/generator" data-btn="primary" className="mt-8 inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl text-base">
            Deschide generatorul <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 content-start">
          {CONTENTS.map((g, i) => (
            <div key={g.title} className={i === 1 ? 'sm:row-span-2' : ''}>
              <h3 className="font-sans text-sm font-extrabold tracking-normal text-pen">{g.title}</h3>
              <ul className="mt-2 border-t-2 border-ink">
                {g.items.map((it) => (
                  <li key={it} className="flex gap-2.5 border-b border-rule py-2.5 text-ink">
                    <Check className="w-4 h-4 mt-1 shrink-0 text-pen" aria-hidden />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Planning() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="planificare-titlu">
      <div className={`${wrap} grid gap-10 lg:grid-cols-2 lg:gap-14 items-center`}>
        <div>
          <h2 id="planificare-titlu" className={h2}>Planificarea calendaristică pe <span className="whitespace-nowrap">2026–2027</span></h2>
          <p className={lead}>
            Alegi clasa (pregătitoare, I sau a II-a) și disciplina (CLR sau MEM). Primești unitățile pe cele cinci module, cu
            competențele, conținuturile din programă, orele și săptămânile. Vacanțele și zilele libere sunt deja scoase.
          </p>
          <p className="mt-3 text-slate-700">
            O ajustezi pe pagină și o descarci în Word sau PDF. E o propunere orientativă, pe care o potrivești graficului școlii tale.
          </p>
          <Link href="/planificare" className={`${secondaryBtn} mt-8`}>
            Fă planificarea <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
        <PlanExcerpt />
      </div>
    </section>
  );
}

const GROUP_NAMES = ['Ana Popescu', 'Ștefan', 'Maria-Ioana', 'Luca', 'Irina'];

function GroupSketch() {
  return (
    <div className="desk mt-8 rounded-2xl border-2 border-ink p-5 flex items-center gap-3 sm:gap-6 overflow-hidden" aria-hidden>
      <ol className="w-[46%] max-w-[190px] shrink-0 rounded-md bg-white border border-ink/20 px-3 py-1 text-[13px] sm:text-sm font-bold text-ink">
        {GROUP_NAMES.map((n) => <li key={n} className="truncate border-b border-rule last:border-0 py-1">{n}</li>)}
      </ol>
      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-pen" />
      <div className="relative flex-1 h-[168px] min-w-0">
        {GROUP_NAMES.slice(0, 3).map((n, i) => (
          <div key={n} className="absolute top-0 left-0 w-[92px] sm:w-[104px] h-[124px] bg-white border-2 border-ink rounded-[3px] p-2 shadow-sm"
            style={{ transform: `translate(${i * 12}px, ${i * 24}px) rotate(${(i - 1) * 2}deg)` }}>
            <div className="text-[10px] font-extrabold text-ink truncate">{n}</div>
            <div className="mt-1 h-px bg-pen/50" />
            {[0, 1, 2, 3].map((k) => <div key={k} className="mt-[16px] h-px bg-rule" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassTools() {
  const host = new URL(SITE_URL).host;
  const message = homeworkShareText(`${host}/tema/…`, 'Adunări până la 10');
  return (
    <section className="py-16 sm:py-20 border-y-2 border-ink bg-white" aria-label="Pentru grupă și teme">
      <div className={`${wrap} grid gap-14 lg:grid-cols-2 lg:gap-12`}>
        <div className="flex flex-col">
          <h2 className={h2}>O fișă pentru fiecare copil, cu numele lui</h2>
          <p className={lead}>
            Lipești lista grupei, copiată din catalog sau din Excel, și primești câte o fișă pentru fiecare copil: numele lui, literele
            săptămânii și cuvintele temei. Numele rămân în browserul tău și nu ajung la noi.
          </p>
          <GroupSketch />
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/grupa" data-btn="primary" className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl text-base">
              Fă fișele pentru grupă <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <span className="text-sm text-slate-600">Gratuit încerci cu 3 copii.</span>
          </div>
        </div>

        <div id="tema" className="flex flex-col scroll-mt-20">
          <h2 className={h2}>Tema ajunge la părinți ca link sau cod QR</h2>
          <p className={lead}>
            Apeși „Trimite ca temă” în generator sau pe pagina grupei. Părinții deschid linkul pe telefon, scriu numele copilului și
            descarcă fișa, gratuit și fără cont.
          </p>
          <div className="desk mt-8 rounded-2xl border-2 border-ink p-5">
            <p className="text-[13px] font-bold text-slate-600">Mesajul pe care îl trimiți pe WhatsApp</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="flex-1 min-w-0 rounded-2xl rounded-bl-sm border-2 border-ink bg-white px-4 py-3 text-[15px] leading-snug text-ink whitespace-pre-line break-words">
                {message}
              </p>
              <span className="shrink-0 w-14 h-14 rounded-lg border-2 border-ink bg-white flex items-center justify-center" aria-hidden>
                <QrCode className="w-9 h-9 text-ink" />
              </span>
            </div>
          </div>
          <p className="mt-6 text-slate-700">
            Linkul merge o săptămână, 30 de zile sau 3 luni, cum alegi. Trimiterea temelor e inclusă în abonament.
          </p>
          <Link href="/generator" className={`${secondaryBtn} mt-6 self-start`}>
            Fă o fișă și trimite-o
          </Link>
        </div>
      </div>
    </section>
  );
}

function Printables() {
  return (
    <section className="ruled border-b-2 border-ink" aria-labelledby="planse-titlu">
      <div className={`${wrap} py-12 sm:py-14 flex flex-col md:flex-row md:items-center gap-6 md:gap-10`}>
        <div className="flex-1">
          <h2 id="planse-titlu" className="text-[28px] sm:text-[34px] font-extrabold leading-tight text-ink">Planșe, cartonașe și diplome pentru clasă</h2>
          <p className="mt-3 text-lg text-slate-700 max-w-2xl">
            Alfabetul pentru peretele clasei, cartonașe și jetoane de decupat, diplome cu numele fiecărui copil, orarul și panoul
            „Ziua de azi”. PDF A4, gata de printat.
          </p>
        </div>
        <Link href="/planse" className={`${secondaryBtn} shrink-0 self-start md:self-auto`}>
          Vezi planșele <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

const PARENT_LINKS = [
  { href: '/nume', icon: UserRound, title: 'Fișa cu numele', text: 'O pagină gratuită sau un caiet întreg cu numele lui: copertă, o pagină pentru fiecare literă, un joc și diplomă.' },
  { href: '/caiete', icon: Library, title: 'Caiete gata', text: 'Tot alfabetul sau toate cifrele, câte o pagină pentru fiecare, la nivelul copilului.' },
  { href: '/fise', icon: FileDown, title: 'Fișe gratuite', text: 'Fiecare literă, cifră și joc, ca PDF de printat.' },
];

function Parents() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="parinti-titlu">
      <div className={wrap}>
        <h2 id="parinti-titlu" className={h2}>Fișe pentru acasă, cu numele copilului</h2>
        <p className={`${lead} max-w-2xl`}>Scrii numele copilului, alegi literele sau cifrele și printezi acasă. Fișele de mai jos le descarci gratuit, fără cont.</p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {PARENT_LINKS.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="group flex h-full gap-3 rounded-xl border-2 border-ink bg-white p-4 hover:bg-paper">
                <span className="shrink-0 w-10 h-10 rounded-lg bg-pencil border-2 border-ink flex items-center justify-center" aria-hidden>
                  <p.icon className="w-5 h-5 text-ink" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-extrabold text-lg text-ink group-hover:text-pen">
                    {p.title} <ArrowRight className="w-4 h-4" aria-hidden />
                  </span>
                  <span className="block text-slate-700">{p.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-14">
          <SheetGallery />
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="ruled border-t-2 border-ink" aria-labelledby="preturi-titlu">
      <div className={`${wrap} py-14 sm:py-16`}>
        <div className="max-w-3xl rounded-2xl border-2 border-ink bg-white p-6 sm:p-8 shadow-xl">
          <h2 id="preturi-titlu" className="text-[28px] sm:text-[34px] font-extrabold leading-tight text-ink">Începi gratuit, fără cont</h2>
          <p className="mt-3 text-lg text-slate-700">
            Gratuit ai literele A–E, cifrele 0–5, matematica până la 10 și fișa cu numele copilului. Varianta completă aduce tot alfabetul, numerele mari, fișe pentru toată grupa (până la 40 de copii), planificarea pe tot anul
            în Word și temele pentru părinți.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Link href="/preturi" data-btn="primary" className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-xl text-base">
              Vezi prețurile <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <Hero />
        {/* SEZONIER: Calendarul de Advent, se ascunde singur din 26.12.2026; de scos după Crăciun */}
        <AdventBanner />
        <Classes />
        <Programme />
        <Planning />
        <ClassTools />
        <Printables />
        <Parents />
        <PricingTeaser />
      </main>
      <Footer />
    </div>
  );
}
