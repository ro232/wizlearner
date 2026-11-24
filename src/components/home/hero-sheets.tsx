/* eslint-disable @next/next/no-img-element -- static SVGs drawn at build time by the PDF engine; width and height are set */

/**
 * Three real sheets fanned out, one per class, as the static SVGs of the „Fișe de lucru” pages
 * (/fise-de-lucru/[clasa]/[subiect]/fisa.svg, the same drawing as the PDF). The front one has its
 * printed competence code circled in red pen and written out large under the fan.
 */
const SHEETS = {
  left: { src: '/fise-de-lucru/clasa-1/litere-de-mana/fisa.svg', alt: 'Fișă de clasa I: literele de mână A, B, C de urmărit și de scris' },
  right: { src: '/fise-de-lucru/clasa-2/ceasul/fisa.svg', alt: 'Fișă de clasa a II-a: cât este ceasul, din 5 în 5 minute' },
  front: { src: '/fise-de-lucru/clasa-pregatitoare/despartirea-in-silabe/fisa.svg', alt: 'Fișă de clasa pregătitoare: câte silabe are cuvântul' },
};

/** What the front sheet prints at the bottom of the page (src/lib/curriculum/sheet.ts). */
export const HERO_CODE = 'Competența specifică 1.3 · Comunicare în limba română, clasa pregătitoare';

const sheet = 'absolute top-0 bg-white border-2 border-ink rounded-[3px] w-[180px] h-[254px] sm:w-[230px] sm:h-[325px] lg:w-[250px] lg:h-[354px]';

export function HeroSheets() {
  return (
    <figure className="relative mx-auto w-full max-w-[520px]">
      <div className="relative h-[290px] sm:h-[365px] lg:h-[392px]">
        <img src={SHEETS.left.src} alt={SHEETS.left.alt} width={250} height={354} decoding="async"
          className={`${sheet} left-1/2 -translate-x-[96%] translate-y-6 -rotate-[8deg] shadow-md`} />
        <img src={SHEETS.right.src} alt={SHEETS.right.alt} width={250} height={354} decoding="async"
          className={`${sheet} left-1/2 -translate-x-[4%] translate-y-6 rotate-[7deg] shadow-md`} />
        <div className={`${sheet} left-1/2 -translate-x-1/2 -rotate-1 shadow-xl`}>
          <img src={SHEETS.front.src} alt={SHEETS.front.alt} width={250} height={354} fetchPriority="high" className="w-full h-full rounded-[2px]" />
          {/* the red-pen ring around the printed code (bottom left of the page) */}
          <svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden
            className="absolute left-[1%] bottom-[0.3%] w-[64%] h-[6.5%] overflow-visible">
            <path d="M8 4 C30 -1 78 0 95 5 C102 8 98 16 80 18 C55 21 18 20 6 15 C-2 12 1 6 14 3"
              fill="none" stroke="#C8102E" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
      <figcaption className="relative mx-auto -mt-1 w-[min(100%,340px)] rounded-xl border-2 border-pen bg-white px-4 py-3 text-left shadow-[4px_4px_0_#C8102E]">
        <span className="absolute -top-[9px] left-10 w-4 h-4 rotate-45 bg-white border-l-2 border-t-2 border-pen" aria-hidden />
        <span className="block text-[13px] font-bold text-pen">Tipărit jos, pe fiecare fișă</span>
        <span className="block text-[15px] font-extrabold leading-snug text-ink">{HERO_CODE}</span>
      </figcaption>
    </figure>
  );
}
