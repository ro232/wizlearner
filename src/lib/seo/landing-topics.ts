import type { SchoolLevel } from '@/lib/curriculum/sheet';
import { countOf } from '@/components/worksheet/plural';
import { grid } from '@/lib/worksheet/math';
import { lei, notesFor } from '@/lib/worksheet/money';
import { SOUND_LETTERS } from '@/lib/worksheet/phonology-pages';
import { isItemAllowed } from '@/lib/access';

/**
 * The topics of the „Fișe de lucru” landing pages (/fise-de-lucru/[clasa]/[subiect]): one page per
 * topic and class, for what teachers and parents type into Google („fișe adunări clasa I”).
 *
 * Which classes a topic has is not written here: landing.ts lists a topic in a class only when one
 * of its presets exists for that class and prints a code of that class's programme (or is an
 * evaluation). The copy below is written by hand for each topic, with the class-specific parts
 * picked by `by()`; a missing class in `by()` throws, so a test catches a page without its text.
 */

export type Area = 'clr' | 'mem' | 'joc' | 'eval';

export interface Faq {
  q: string;
  a: string;
}

/** What the copy of a page knows about its class. */
export interface Ctx {
  level: SchoolLevel;
  /** „clasa I”, „grădiniță” */
  name: string;
  /** The number range the class's math sheets open with (10, 10, 100, 1000). */
  range: number;
  /** Whether a preset is on this page (exists for the class). */
  has: (presetId: string) => boolean;
}

export interface TopicCopy {
  /** One sentence under the heading. */
  lead: string;
  /** Two to four short paragraphs: what the child practises, what is on the sheet, how it is used. */
  body: string[];
  /** Meta description, at most 155 characters. */
  description: string;
  /** Questions about this topic (the page adds the shared ones: the code, the free plan …). */
  faq: Faq[];
}

export interface TopicPreset {
  id: string;
  /** Only in these classes (unset: every class where the preset exists). */
  levels?: SchoolLevel[];
}

export interface Topic {
  slug: string;
  /** The search phrase before the class: „Fișe adunări” → „Fișe adunări clasa I”. */
  phrase: string | ((level: SchoolLevel) => string);
  /** Short name in lists and links: „Adunări”. */
  label: string;
  area: Area;
  presets: TopicPreset[];
  /** Only these classes (unset: every class with a fitting preset). */
  levels?: SchoolLevel[];
  /** Pages of the same topic in other classes that live under another slug. */
  family?: string;
  /** No preset of this topic prints a code (labirint …): listed without one, and the page says why. */
  codeless?: boolean;
  /** Free single-item sheets at /fise/… to link (letters, digits, dot-to-dot). */
  fiseKinds?: ('litere' | 'mana' | 'cifre' | 'jocuri')[];
  copy: (c: Ctx) => TopicCopy;
}

/** The class-specific text; throws when the class is missing, so no page goes out without it. */
export function by<T>(c: Ctx, texts: Partial<Record<SchoolLevel | 'default', T>>): T {
  const t = texts[c.level] ?? texts.default;
  if (t === undefined) throw new Error(`no text for ${c.level}`);
  return t;
}

const p = (id: string, ...levels: SchoolLevel[]): TopicPreset => (levels.length ? { id, levels } : { id });
const exercises = (n: number) => countOf(n, 'exercițiu', 'exerciții');

export const TOPICS: Topic[] = [
  // ───────────────────────── Matematică ─────────────────────────
  {
    slug: 'adunari',
    phrase: 'Fișe adunări',
    label: 'Adunări',
    area: 'mem',
    presets: [p('mate-adunari'), p('mate-adunari-31'), p('mate-imagini'), p('calculeaza-coloreaza'), p('mate-grupe', 'CP', 'I'), p('mate-lipsa')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Adunări cu 1–5 unități, de la obiecte desenate la exerciții scrise până la 31.',
        I: 'Adunări până la 100, mental și în scris, fără și cu trecere peste ordin.',
        II: 'Adunări cu numere de trei cifre, în concentrul 0–1000, fără trecere peste ordin.',
      }),
      body: [
        by(c, {
          CP: 'Programa clasei pregătitoare cere adunări în concentrul 0–31, prin adăugarea a 1–5 elemente la o mulțime dată. De aceea fișele încep cu numere până la 10 și cu obiecte desenate, pe care copilul le numără înainte să scrie suma, apoi trec la exerciții scrise până la 31.',
          I: 'La clasa I, copilul adună până la 100, mental și în scris, sprijinindu-se des pe numărare. Începe cu exerciții fără trecere peste ordin (34 + 5, 40 + 30) și ajunge la cele cu trecere (38 + 7), în care unitățile formează o nouă zece.',
          II: 'La clasa a II-a, adunările trec la numere de trei cifre. În concentrul 0–1000, programa cere adunări fără trecere peste ordin (324 + 152), făcute mental și în scris, cu numărare sau grupare ori de câte ori e nevoie.',
        }),
        `Pe pagină sunt ${exercises(grid('add', c.range as 10).count)}, pe două coloane, cu loc pentru rezultat. Titlul spune concentrul și felul exercițiilor, antetul are rând pentru nume și dată, iar jos se tipărește competența din programă.`,
        by(c, {
          CP: 'Pentru început ai și „Adunări cu imagini”, unde copilul numără fructele sau stelele desenate, și „Calculează și colorează”, în care rezultatul spune culoarea fiecărei părți a desenului.',
          I: 'Copiilor care au încă nevoie de sprijin le dai „Adunări cu imagini” sau „Grupe egale”, care leagă adunarea de obiecte numărate; celor siguri pe ei, „Numărul care lipsește”.',
          II: '„Numărul care lipsește” (□ + 25 = 60) e pasul următor, când adunarea e sigură: copilul trebuie să gândească invers, ca la scădere.',
        }),
        'Învățătorii o dau ca exercițiu de fixare după lecție, ca temă sau la lucrul pe grupe. Butonul „Alte exerciții” face o fișă nouă cu aceleași reguli, așa că fiecare zi a săptămânii poate avea foaia ei.',
      ],
      description: by(c, {
        CP: 'Fișe de adunări pentru clasa pregătitoare: 1–5 unități, cu obiecte desenate, apoi exerciții scrise până la 31. PDF de printat, cu competența din programă.',
        I: 'Fișe de adunări pentru clasa I, până la 100: fără și cu trecere peste ordin, cu imagini sau numărul care lipsește. PDF de printat, cu competența pe fișă.',
        II: 'Fișe de adunări pentru clasa a II-a: numere de trei cifre, până la 1000, fără trecere peste ordin, ca în programă. PDF de printat, cu pagină de răspunsuri.',
      }),
      faq: [
        {
          q: 'Pot alege adunări fără sau cu trecere peste ordin?',
          a: by(c, {
            CP: 'La numerele până la 10 nu e cazul. Pentru concentrul 0–31 folosești varianta „Adunări 0–31”: în generator alegi fără trecere, cu trecere peste ordin sau amândouă amestecate (alegerea face parte din varianta completă).',
            I: 'Da. De la concentrul 0–20 în sus, generatorul îți dă de ales: fără trecere, cu trecere peste ordin sau amândouă amestecate. Fișa pentru clasa I pornește fără trecere peste ordin.',
            II: 'Generatorul le are pe toate trei, dar codul 1.4 al clasei a II-a se tipărește doar pe fișele fără trecere peste ordin din concentrul 0–1000, pentru că așa le descrie programa.',
          }),
        },
      ],
    }),
  },
  {
    slug: 'scaderi',
    phrase: 'Fișe scăderi',
    label: 'Scăderi',
    area: 'mem',
    presets: [p('mate-scaderi'), p('mate-lipsa')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Scăderi cu 1–5 unități, cu numere până la 10 și fără rezultat negativ.',
        I: 'Scăderi până la 100, fără și cu trecere peste ordin.',
        II: 'Scăderi cu numere de trei cifre, în concentrul 0–1000, fără trecere peste ordin.',
      }),
      body: [
        by(c, {
          CP: 'La clasa pregătitoare, a scădea înseamnă să iei 1–5 elemente dintr-o mulțime și să vezi câte rămân. Fișa pornește cu numere până la 10, iar rezultatul nu e niciodată negativ, așa că fiecare exercițiu se poate face cu degetele sau cu jetoane pe bancă.',
          I: 'La clasa I, copilul scade până la 100, mental și în scris. Întâi vin scăderile fără trecere peste ordin (47 − 5, 80 − 30), apoi cele în care trebuie să „împrumute” o zece (52 − 7), care cer cel mai mult exercițiu.',
          II: 'La clasa a II-a, scăderile se fac cu numere de trei cifre. În concentrul 0–1000 programa cere scăderi fără trecere peste ordin (586 − 243), iar copilul folosește și numele termenilor: descăzut, scăzător, diferență.',
        }),
        `Pe pagină sunt ${exercises(grid('sub', c.range as 10).count)}, pe două coloane, cu spațiu pentru rezultat; antetul are nume și dată, iar subsolul codul competenței. „Numărul care lipsește” (9 − □ = 6) e varianta pentru copiii care scad deja sigur.`,
        'Merge bine imediat după adunări: aceleași numere, operația inversă. Dacă vrei o fișă diferită pentru fiecare bancă, apeși „Alte exerciții”; dacă vrei ca cei mici să se verifice singuri, le dai la final pagina cu răspunsuri.',
      ],
      description: by(c, {
        CP: 'Fișe de scăderi pentru clasa pregătitoare: 1–5 unități, numere până la 10, fără rezultat negativ. PDF de printat, cu competența din programă pe fișă.',
        I: 'Fișe de scăderi pentru clasa I, până la 100: fără și cu trecere peste ordin, plus numărul care lipsește. PDF de printat, cu pagină de răspunsuri.',
        II: 'Fișe de scăderi pentru clasa a II-a: numere de trei cifre, până la 1000, fără trecere peste ordin. PDF de printat, cu competența din programă pe fișă.',
      }),
      faq: [
        {
          q: 'Ce înseamnă scădere cu trecere peste ordin?',
          a: `E scăderea în care unitățile descăzutului sunt mai puține decât ale scăzătorului, ca la 52 − 7: copilul „împrumută” o zece. ${by(c, {
            CP: 'Pe fișele cu numere până la 10 nu apare.',
            I: 'La clasa I e partea cea mai grea a anului; în generator alegi fără, cu trecere sau amândouă amestecate.',
            II: 'Pe fișa clasei a II-a, în concentrul 0–1000, nu apare, cum cere programa; o poți alege din generator pentru recapitularea numerelor până la 100.',
          })}`,
        },
      ],
    }),
  },
  {
    slug: 'compararea-numerelor',
    phrase: 'Fișe compararea numerelor',
    label: 'Compararea numerelor',
    area: 'mem',
    presets: [p('mate-compara')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Mai mare, mai mic sau egal: semnele <, > și = cu numere până la 10.',
        I: 'Compararea numerelor până la 100, cu semnele <, > și =.',
        II: 'Compararea numerelor de trei cifre, până la 1000, cu semnele <, > și =.',
      }),
      body: [
        by(c, {
          CP: 'Copilul compară două numere și pune între ele semnul potrivit. Programa clasei pregătitoare cere compararea în concentrul 0–31; fișa pornește cu numere până la 10, unde copilul își poate imagina încă ușor cantitățile.',
          I: 'La clasa I, copilul compară numere de două cifre: întâi zecile, apoi, dacă zecile sunt egale, unitățile. Perechile apropiate, ca 46 și 64, arată repede dacă a înțeles ce înseamnă locul fiecărei cifre.',
          II: 'La clasa a II-a se compară numere până la 1000: întâi sutele, apoi zecile, apoi unitățile. E un exercițiu scurt, bun la începutul orei, înainte de adunări și scăderi.',
        }),
        `Fișa are ${countOf(grid('cmp', c.range as 10).count, 'pereche', 'perechi')} de numere, pe două coloane, cu loc pentru semn între ele, și instrucțiunea scrisă sus: „Pune semnul potrivit: <, > sau =”.`,
        'Un sprijin folosit des la clasă: semnul e o „gură” deschisă spre numărul mai mare. Fișa se potrivește la recapitulare, ca probă de cinci minute, sau ca temă după lecția despre șirul numerelor.',
      ],
      description: by(c, {
        CP: 'Fișe de comparare a numerelor pentru clasa pregătitoare: semnele <, > și = cu numere până la 10. PDF de printat, cu competența 1.2 tipărită pe fișă.',
        I: 'Fișe de comparare a numerelor pentru clasa I: perechi de numere până la 100 și semnele <, >, =. PDF de printat, cu pagină de răspunsuri.',
        II: 'Fișe de comparare a numerelor pentru clasa a II-a: numere de trei cifre, până la 1000, cu semnele <, >, =. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'De la ce clasă se folosesc semnele <, > și =?',
          a: 'Din clasa pregătitoare, odată cu compararea numerelor până la 31. La grădiniță copiii compară cantități (mai multe, mai puține), dar fără semne; de aceea fișa nu are variantă pentru grădiniță.',
        },
      ],
    }),
  },
  {
    slug: 'cifre',
    phrase: 'Fișe cifre',
    label: 'Cifre',
    area: 'mem',
    presets: [p('cifre'), p('numara')],
    fiseKinds: ['cifre'],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Cifrele de la 0 la 9, de trasat cu ordinea liniilor, și obiecte de numărat.',
        CP: 'Scrierea cifrelor pe liniatură, cu ordinea liniilor, și fișe de numărat.',
        I: 'Cifrele scrise corect și ordonat, ca bază pentru numerele până la 100.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul se familiarizează cu numărul și numerația: numără obiecte, recunoaște cifra și încearcă s-o scrie. Fișa de cifre îi arată, cu puncte numerotate și săgeți, de unde pornește fiecare linie, iar „Numără și scrie” leagă cifra de cantitatea pe care o reprezintă.',
          CP: 'La clasa pregătitoare, copilul învață să recunoască și să scrie numerele până la 31. Totul începe cu cifrele de la 0 la 9, scrise corect de la prima linie: unde pune creionul, încotro merge, cât de mare e cifra pe rând.',
          I: 'La clasa I cifrele sunt în general cunoscute, dar multor copii le trebuie încă exercițiu ca să le scrie egal și citeț, mai ales pe cele pe care le scriu în oglindă. Fișa e utilă la începutul anului și pentru copiii care au nevoie de recuperare.',
        }),
        'Fiecare cifră are un model, apoi rânduri de urmărit în care modelul se estompează treptat, până la rândul liber. Fișa se deschide cu cifrele 1, 2 și 3; în generator alegi oricare cifre, schimbi mărimea și pui numele copilului.',
        by(c, {
          presc: 'Multe educatoare lucrează o cifră pe săptămână: o numără pe degete, o modelează din plastilină, apoi o trasează pe fișă. „Numără și scrie” vine la final, când copilul leagă cifra de un grup de obiecte.',
          CP: 'La clasă, fișa merge după ce cifra a fost numărată cu obiecte și scrisă în aer sau pe tablă. „Numără și scrie” e varianta de verificare: copilul numără imaginile și scrie singur cifra.',
          I: 'Dacă un copil inversează o cifră, dă-i o fișă doar cu acea cifră și cu cea cu care o confundă, câteva zile la rând, până o scrie corect fără model.',
        }),
      ],
      description: by(c, {
        presc: 'Fișe cu cifre pentru grădiniță: cifrele 0–9 de trasat, cu ordinea liniilor și săgeți, plus „Numără și scrie”. PDF de printat, cu comportamentul vizat.',
        CP: 'Fișe cu cifre pentru clasa pregătitoare: cifrele 0–9 pe liniatură, cu ordinea liniilor, și fișe de numărat. PDF de printat, cu competența 1.1 pe fișă.',
        I: 'Fișe cu cifre pentru clasa I: scrierea corectă a cifrelor 0–9, cu ordinea liniilor și modelul care se estompează. PDF de printat, cu competența 1.1.',
      }),
      faq: [
        {
          q: 'Pot face o fișă doar cu o cifră?',
          a: 'Da. În generator alegi o singură cifră sau mai multe. Pentru fiecare cifră de la 0 la 9 și pentru numărul 10 ai și câte o fișă gratuită separată, gata de descărcat, în lista de mai jos.',
        },
      ],
    }),
  },
  {
    slug: 'sirul-numerelor',
    phrase: 'Fișe șirul numerelor',
    label: 'Șirul numerelor',
    area: 'mem',
    presets: [p('mate-sir'), p('mate-vecini'), p('uneste-punctele')],
    fiseKinds: ['jocuri'],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Numerele în ordine până la 10: completează șirul și găsește vecinii.',
        CP: 'Numerele în ordine: șiruri cu goluri, vecinii numerelor și „Unește punctele”.',
        I: 'Șirul numerelor până la 100: numărul dinainte, cel de după și golurile din șir.',
        II: 'Numerele în ordine până la 1000: șiruri cu goluri și vecinii numerelor.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul învață să numere în ordine și să spună ce număr vine după altul. Fișa îi dă șiruri scurte, cu goluri de completat, și perechi de „vecini”: numărul dinainte și cel de după.',
          CP: 'Programa clasei pregătitoare cere ordonarea numerelor până la 31, folosind poziționarea pe axa numerelor. Șirurile cu goluri și vecinii numerelor exersează exact asta, iar „Unește punctele” transformă numărarea în ordine într-un desen.',
          I: 'La clasa I, copilul ordonează numerele până la 100, le așază pe axă și face estimări. Șirurile cu goluri îl pun să numere înainte și înapoi, iar vecinii îl ajută la trecerea peste zeci (39, 40, 41), unde se greșește des.',
          II: 'La clasa a II-a, ordonarea se face până la 1000. Copilul completează șiruri și scrie vecinii unor numere de trei cifre, cu atenție la trecerea peste zeci și sute (199, 200, 201).',
        }),
        `„Completează șirul” are ${countOf(grid('seq', c.range as 10).count, 'șir', 'șiruri')} cu goluri, iar „Vecinii numerelor” are ${countOf(grid('nbr', c.range as 10).count, 'număr', 'numere')}, fiecare cu numărul dinainte și cel de după de completat.${c.has('uneste-punctele') ? ' „Unește punctele” are un desen ascuns, care apare când copilul trage liniile în ordinea numerelor.' : ''}`,
        'Sunt fișe scurte, bune la începutul orei sau pentru copiii care termină mai repede. La recapitulare schimbi concentrul din generator și folosești aceeași fișă pe numere mai mari.',
      ],
      description: by(c, {
        presc: 'Fișe cu șirul numerelor pentru grădiniță: numere în ordine până la 10, goluri de completat și vecinii numerelor. PDF de printat, cu comportamentul vizat.',
        CP: 'Fișe cu șirul numerelor pentru clasa pregătitoare: șiruri cu goluri, vecinii numerelor și „Unește punctele”. PDF de printat, cu competența 1.3.',
        I: 'Fișe cu șirul numerelor pentru clasa I: numere până la 100 în ordine, goluri de completat și vecini. PDF de printat, cu competența 1.3 pe fișă.',
        II: 'Fișe cu șirul numerelor pentru clasa a II-a: numere până la 1000, șiruri cu goluri și vecinii numerelor. PDF de printat, cu competența 1.3.',
      }),
      faq: [
        {
          q: 'Ce sunt „vecinii” unui număr?',
          a: `Numărul care vine imediat înainte și cel care vine imediat după el: vecinii lui 7 sunt 6 și 8. ${by(c, {
            presc: 'La grădiniță ajunge să-i spună cu voce tare, cu degetele sau cu jetoane alături.',
            CP: 'La clasa pregătitoare se lucrează mai întâi pe axa numerelor desenată pe tablă, apoi pe fișă.',
            default: 'La numere ca 40 sau 300, copilul trebuie să treacă peste zeci sau sute, de aceea exercițiul rămâne util și la clasele mari.',
          })}`,
        },
      ],
    }),
  },
  {
    slug: 'bani',
    phrase: 'Fișe bani',
    label: 'Banii',
    area: 'mem',
    presets: [p('mate-bani')],
    copy: (c) => {
      const notes = notesFor(c.range).map(lei);
      const list = `${notes.slice(0, -1).join(', ')} și ${notes[notes.length - 1]}`;
      return {
        lead: by(c, {
          CP: 'Bancnote de 1 leu, 5 lei și 10 lei: numără, compară și schimbă.',
          I: 'Banii până la 100 de lei: numără sume, compară, plătește și schimbă bancnote.',
          II: 'Leul până la 1000: bancnote de 100, 200 și 500 de lei, schimburi și plăți.',
        }),
        body: [
          by(c, {
            CP: 'La clasa pregătitoare, banii apar în probleme-joc de tip „venituri-cheltuieli”, cu numere mici. Copilul numără bancnotele desenate, spune unde sunt mai mulți bani și află câte bancnote mici fac una mare.',
            I: 'La clasa I, copilul face schimburi echivalente valoric cu numere până la 100: numără sume, compară două grămezi de bani și alege bancnotele cu care plătește un obiect.',
            II: 'La clasa a II-a, programa adaugă bancnotele de 200 și 500 de lei și calculele până la 1000. Copilul numără, compară și schimbă sume mari, ca la cumpărături adevărate.',
          }),
          `Pe fișă sunt bancnotele de ${list}, desenate ca dreptunghiuri simple cu valoarea scrisă pe ele, nu ca poze cu bani adevărați, așa că se văd bine și printate alb-negru. Pagina are șase rânduri: de două ori „Câți lei sunt?”, de două ori „Unde sunt mai mulți bani?”, o plată și un rând de schimburi.`,
          'Fișa merge bine după un „magazin” la clasă, cu bani de jucărie: copiii cumpără, dau rest, apoi rezolvă fișa ca să fixeze ce au făcut. Acasă, o poți face înainte de o ieșire la piață, cu bani adevărați la îndemână.',
        ],
        description: by(c, {
          CP: 'Fișe cu bani pentru clasa pregătitoare: bancnote de 1 leu, 5 lei și 10 lei de numărat, comparat și schimbat. PDF de printat, cu competența 6.3.',
          I: 'Fișe cu bani pentru clasa I: lei până la 100, de numărat, comparat, plătit și schimbat, cu bancnote desenate simplu. PDF de printat, cu competența 6.3.',
          II: 'Fișe cu bani pentru clasa a II-a: bancnote de 100, 200 și 500 de lei, sume până la 1000, schimburi și plăți. PDF de printat, cu competența 6.3.',
        }),
        faq: [
          {
            q: 'De ce nu sunt monede pe fișă?',
            a: 'Monedele (banii) cer sume care nu sunt lei întregi (1 leu = 100 de bani), adică numere cu virgulă, pe care copiii nu le folosesc încă. Fișa rămâne la bancnote, cu sume întregi, potrivite concentrului clasei.',
          },
        ],
      };
    },
  },
  {
    slug: 'probleme',
    phrase: 'Fișe probleme',
    label: 'Probleme',
    area: 'mem',
    presets: [p('mate-probleme')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Probleme scurte de adunare și scădere cu 1–5 unități, cu obiectele desenate.',
        I: 'Probleme de adunare și scădere până la 100, cu o operație și cu două operații.',
        II: 'Probleme de tipul a ± b = x și a ± b ± c = x, cu numere până la 1000.',
      }),
      body: [
        by(c, {
          CP: 'La clasa pregătitoare, problemele se rezolvă cu ajutorul obiectelor: „În coș sunt 4 mere. Mai punem 2. Câte mere sunt acum?”. Obiectele sunt desenate lângă text, ca cel mic să le poată număra, iar numărul adăugat sau luat e mereu între 1 și 5.',
          I: 'La clasa I, copilul rezolvă probleme simple de adunare sau scădere până la 100, cu sprijin în imagini. Pe fișă, ultima problemă cere două operații, pasul pe care programa îl pregătește pentru clasa a II-a.',
          II: 'La clasa a II-a, problemele au numere până la 1000 și pot cere două operații (a ± b ± c = x). Copilul citește enunțul, scrie rezolvarea în căsuțe și formulează răspunsul pe rândul de la final.',
        }),
        'Fiecare problemă are una-două propoziții și întrebarea, fără nume de copii, ca să se potrivească oricărei clase. Sub ea sunt căsuțele „Rezolvare:” și rândul „Răspuns: ____”; când obiectele sunt puține, sunt desenate pe rând, altfel apare câte o imagine pentru fiecare număr.',
        'Fișa e potrivită după ce problemele au fost lucrate oral și cu obiecte. Învățătorii o folosesc și ca temă: părintele citește enunțul cu voce tare, iar copilul scrie rezolvarea singur.',
      ],
      description: by(c, {
        CP: 'Fișe cu probleme pentru clasa pregătitoare: adunări și scăderi cu 1–5 unități, cu obiectele desenate. PDF de printat, cu competența 5.2 pe fișă.',
        I: 'Fișe cu probleme pentru clasa I: adunare și scădere până la 100, cu imagini, rezolvare și răspuns. PDF de printat, cu pagină de răspunsuri.',
        II: 'Fișe cu probleme pentru clasa a II-a: a ± b = x și a ± b ± c = x, până la 1000, cu rezolvare și răspuns. PDF de printat, cu competența 5.2.',
      }),
      faq: [
        {
          q: 'Problemele sunt aceleași la fiecare descărcare?',
          a: 'Nu neapărat. Fișa se deschide cu un set fix, ca să o poți retipări identic, iar butonul „Alte exerciții” face alte probleme, cu aceleași reguli și același concentru.',
        },
      ],
    }),
  },
  {
    slug: 'ceasul',
    phrase: 'Fișe ceasul',
    label: 'Ceasul',
    area: 'mem',
    presets: [p('mate-ceas'), p('mate-ceas-acele')],
    copy: (c) => ({
      lead: by(c, {
        I: 'Citește ora pe ceas și desenează acele: ora fixă și jumătatea de oră.',
        II: 'Ceasul până la minut: ore fixe, jumătăți, sferturi și din 5 în 5 minute.',
      }),
      body: [
        by(c, {
          I: 'Programa clasei I pune ceasul la „ora fixă” și „jumătatea de oră”. Copilul învață că acul mic arată ora, iar acul mare, când stă la 6, arată jumătatea: „ora 3 și jumătate”.',
          II: 'La clasa a II-a, programa adaugă sfertul de oră și minutele: 1 oră are 60 de minute, iar acul mare se citește din 5 în 5. Copilul spune „4 fără un sfert” sau „3 și 20 de minute” și scrie ora în cifre.',
        }),
        `Fișa „Cât este ceasul?” are șase ceasuri, cu cifrele de la 1 la 12, acul orelor scurt și gros și acul minutelor lung și subțire; copilul scrie ora sub fiecare. „Desenează acele ceasului” e invers: ora e scrisă, iar acele le desenează el.${c.level === 'II' ? ' Fișa clasei a II-a pornește din 5 în 5 minute; în generator poți coborî la sferturi, la jumătăți sau la ore fixe.' : ''}`,
        'Ceasul se învață mai ușor cu un ceas adevărat sau din carton pe bancă. Fișa vine după, ca să fixeze: întâi citirea orei, apoi desenarea acelor, care cere mai multă atenție.',
      ],
      description: by(c, {
        I: 'Fișe cu ceasul pentru clasa I: citește ora și desenează acele, la ore fixe și jumătăți, ca în programă. PDF de printat, cu competența 6.2 pe fișă.',
        II: 'Fișe cu ceasul pentru clasa a II-a: ore fixe, jumătăți, sferturi și minute din 5 în 5, de citit și de desenat. PDF de printat, cu competența 6.2.',
      }),
      faq: [
        {
          q: 'Pot face fișa doar cu ore fixe?',
          a: 'Da. În generator alegi pasul: ore fixe, și jumătăți, și sferturi sau din 5 în 5 minute. Orele fixe și jumătățile sunt gratuite; sferturile și minutele fac parte din varianta completă.',
        },
      ],
    }),
  },
  {
    slug: 'tabla-inmultirii',
    phrase: 'Fișe tabla înmulțirii',
    label: 'Tabla înmulțirii',
    area: 'mem',
    presets: [p('mate-inmultiri'), p('mate-factor-lipsa'), p('mate-grupe', 'II')],
    copy: (c) => ({
      lead: by(c, { II: 'Tabla înmulțirii cu 2–10, o tablă aleasă sau toate amestecate, produse până la 100.' }),
      body: [
        'La clasa a II-a, înmulțirea se învață ca adunare repetată: 3 · 4 înseamnă 4 + 4 + 4. Programa cere înmulțiri în concentrul 0–100, de aceea pe fișă sunt doar produse din tablele 2–10, cu factori de la 1 la 10.',
        `Pe fișa „Înmulțiri” sunt ${exercises(20)}. Când alegi o singură tablă (de exemplu tabla cu 3), prima coloană o ia în ordine, de la 3 · 1 la 3 · 10, iar a doua are aceleași înmulțiri amestecate, ca să nu fie învățate doar pe de rost, în șir.`,
        '„Grupe egale” e calea de intrare: grupele desenate se numără, apoi se scrie adunarea și înmulțirea (3 grupe a câte 4: 4 + 4 + 4 = 12, 3 · 4 = 12). „Numărul lipsă” (3 · □ = 12) vine la final, când tabla e știută și copilul o poate folosi invers.',
        'Un ritm folosit des: o tablă pe săptămână, cu fișa în ordine luni și cea amestecată vineri. Pagina cu răspunsuri îl lasă pe copil să se verifice singur acasă.',
      ],
      description: by(c, {
        II: 'Fișe cu tabla înmulțirii pentru clasa a II-a: tablele 2–10 în ordine sau amestecate, grupe egale și numărul lipsă. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Pot face fișa doar cu tabla înmulțirii cu un anumit număr?',
          a: 'Da. În generator alegi tabla cu 2, 3 și așa mai departe până la 10, sau toate tablele amestecate. Tabla cu 2 e gratuită; celelalte table și varianta amestecată fac parte din varianta completă.',
        },
      ],
    }),
  },
  {
    slug: 'impartiri',
    phrase: 'Fișe împărțiri',
    label: 'Împărțiri',
    area: 'mem',
    presets: [p('mate-impartiri'), p('mate-factor-lipsa')],
    copy: (c) => ({
      lead: by(c, { II: 'Împărțiri exacte din tabla împărțirii, cu numere până la 100.' }),
      body: [
        'La clasa a II-a, împărțirea se învață ca scădere repetată și ca operația inversă înmulțirii: 12 : 3 = 4, pentru că 3 · 4 = 12. Programa cere împărțiri cu rest 0 în concentrul 0–100, așa că fiecare exercițiu de pe fișă se împarte exact.',
        `Pe fișa „Împărțiri” sunt ${exercises(20)}, toate din tablele 2–10. Dacă alegi o singură tablă, prima coloană o ia în ordine (3 : 3, 6 : 3 … 30 : 3), iar a doua amestecă aceleași împărțiri.`,
        '„Numărul lipsă la înmulțire și împărțire” (□ : 4 = 5, 12 : □ = 4) leagă cele două operații și e bun pentru recapitulare. Fișa vine după ce copilul a împărțit obiecte reale în grupe egale și știe tabla înmulțirii pe care o folosește.',
      ],
      description: by(c, {
        II: 'Fișe cu împărțiri pentru clasa a II-a: împărțiri exacte din tablele 2–10, numere până la 100, și numărul lipsă. PDF de printat, cu competența 1.5.',
      }),
      faq: [
        {
          q: 'Pe fișă apar împărțiri cu rest?',
          a: 'Nu. Programa clasei a II-a cere împărțirea cu rest 0, așa că toate exercițiile se împart exact. Împărțirea cu rest vine în clasele următoare.',
        },
      ],
    }),
  },
  {
    slug: 'calendarul',
    phrase: (l) => (l === 'CP' ? 'Fișe zilele săptămânii' : l === 'I' ? 'Fișe zilele săptămânii și lunile anului' : 'Fișe calendarul și lunile anului'),
    label: 'Zilele săptămânii și calendarul',
    area: 'mem',
    presets: [p('mate-saptamana'), p('mate-luni'), p('mate-calendar')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Zilele săptămânii în ordine: ziua de după, cea dinainte, ieri și mâine.',
        I: 'Zilele săptămânii, lunile anului și anotimpurile, în ordine.',
        II: 'Zile, luni, anotimpuri și calendarul unei luni adevărate: poimâine, alaltăieri.',
      }),
      body: [
        by(c, {
          CP: 'Programa clasei pregătitoare cere denumirea și ordonarea zilelor săptămânii. Copilul scrie zilele în ordine, completează ziua de după și pe cea dinainte și răspunde la „ieri” și „mâine”, cuvinte pe care le folosește zilnic, dar pe care abia acum le leagă de un șir.',
          I: 'La clasa I, copilul ordonează zilele săptămânii și lunile anului și leagă fiecare lună de anotimpul ei. Fișele cer și ziua de după, cea dinainte, ieri și mâine, ca timpul să devină o succesiune clară.',
          II: 'La clasa a II-a se adaugă calendarul: copilul citește o lună reală din 2026 sau 2027 și răspunde în ce zi a săptămânii cade o dată, ce zi e poimâine sau alaltăieri, câte zile are luna.',
        }),
        'Numele zilelor și ale lunilor sunt scrise cu literă mică, cum se scriu în română: luni, marți, ianuarie, februarie. Exercițiile sunt de completat pe rânduri, iar copilul scrie singur numele zilei sau al lunii.',
        'La clasă, fișa merge cu calendarul de perete și cu rutina de dimineață („Azi este…”). Pentru acasă, e o temă scurtă, de zece minute, care poate fi repetată în fiecare lună.',
      ],
      description: by(c, {
        CP: 'Fișe cu zilele săptămânii pentru clasa pregătitoare: zilele în ordine, ziua de după, cea dinainte, ieri și mâine. PDF de printat, cu competența 6.2.',
        I: 'Fișe cu zilele săptămânii și lunile anului pentru clasa I: ordinea lor și anotimpul fiecărei luni. PDF de printat, cu competența 6.2 pe fișă.',
        II: 'Fișe cu calendarul pentru clasa a II-a: zilele, lunile, anotimpurile și o lună reală, cu poimâine și alaltăieri. PDF de printat, cu competența 6.2.',
      }),
      faq: [
        {
          q: 'Se scriu zilele și lunile cu literă mare?',
          a: 'Nu. În română, zilele săptămânii și lunile anului se scriu cu literă mică (luni, ianuarie), în afară de începutul propoziției. Fișa le scrie așa peste tot, ca să nu învețe copilul o greșeală.',
        },
      ],
    }),
  },
  {
    slug: 'masurari',
    phrase: 'Fișe măsurări',
    label: 'Măsurări',
    area: 'mem',
    presets: [p('mate-lungimi'), p('mate-balanta'), p('mate-rigla'), p('mate-unitati')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Lung și scurt, greu și ușor: măsurăm cu cuburi și comparăm pe balanță.',
        CP: 'Lungimi măsurate cu cuburi sau agrafe: cel mai lung, cel mai scurt.',
        I: 'Lungimi în unități neconvenționale și în centimetri, cu rigla.',
        II: 'Lungimi, mase și capacități: cuburi, balanța, rigla și unitățile de măsură.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul se familiarizează cu mărimea, lungimea și greutatea obiectelor și învață să le compare și să le ordoneze. Fișele îi dau obiecte desenate de măsurat cu cuburi și o balanță care arată care obiect e mai greu.',
          CP: 'La clasa pregătitoare, lungimile se măsoară cu unități neconvenționale: cuburi, agrafe, palme. Copilul numără câte unități are fiecare obiect desenat, apoi spune care e cel mai lung și care e cel mai scurt.',
          I: 'La clasa I, copilul măsoară întâi cu cuburi sau agrafe, apoi cunoaște centimetrul și rigla. Pe fișa cu rigla citește lungimi în centimetri și desenează linii de o lungime dată, cu rigla lui.',
          II: 'La clasa a II-a, programa cere măsurarea lungimilor, a maselor și a capacităților și cunoașterea unităților: metrul, centimetrul, litrul, mililitrul, kilogramul, gramul. Fișele merg de la balanță și cuburi la unitățile de măsură și instrumentele lor.',
        }),
        'Desenele sunt făcute să nu lase loc de dubii: obiectele încep exact unde încep unitățile și se termină la marginea unei unități, iar două obiecte de pe aceeași fișă nu au niciodată aceeași lungime.',
        'Măsurarea se face întâi cu obiecte reale, pe bancă sau pe covor. Fișa vine după, ca să verifice dacă copilul numără corect unitățile și dacă poate compara rezultatele.',
      ],
      description: by(c, {
        presc: 'Fișe de măsurare pentru grădiniță: lungimi măsurate cu cuburi și balanța „mai greu, mai ușor”. PDF de printat, cu comportamentele vizate pe fișă.',
        CP: 'Fișe de măsurare pentru clasa pregătitoare: lungimi măsurate cu cuburi sau agrafe, cel mai lung și cel mai scurt. PDF de printat, cu competența 6.1.',
        I: 'Fișe de măsurare pentru clasa I: lungimi cu cuburi sau agrafe și în centimetri, cu rigla. PDF de printat, cu competențele din programă pe fișă.',
        II: 'Fișe de măsurare pentru clasa a II-a: lungimi, mase, capacități, rigla și unitățile de măsură (m, cm, l, ml, kg, g). PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'De ce se măsoară întâi cu cuburi sau agrafe?',
          a: 'Pentru că așa începe programa: copilul înțelege întâi că a măsura înseamnă a număra de câte ori încape o unitate, și abia apoi folosește centimetrul. Cuburile și agrafele se pot pune și pe bancă, lângă desen.',
        },
      ],
    }),
  },
  {
    slug: 'figuri-geometrice',
    phrase: (l) => (l === 'presc' ? 'Fișe forme geometrice' : 'Fișe figuri geometrice'),
    label: 'Figuri geometrice',
    area: 'mem',
    presets: [p('forme'), p('mate-figuri')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Cercul, pătratul, triunghiul și dreptunghiul: de trasat și de găsit într-un desen.',
        default: 'Pătrat, dreptunghi, triunghi, cerc: de trasat și de numărat într-un desen.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul se familiarizează cu forma obiectelor și învață să numească formele de bază. Pe o fișă le trasează pe linia punctată, pe cealaltă le caută într-un desen făcut din forme: o casă, un tren, o rachetă.',
          CP: 'Programa clasei pregătitoare numește patru figuri plane: pătratul, triunghiul, dreptunghiul și cercul. Copilul le trasează, apoi le recunoaște într-un desen și scrie câte sunt din fiecare.',
          I: 'La clasa I, copilul recunoaște figurile geometrice în mediul apropiat și în desene. Fișa cu desen făcut din pătrate, dreptunghiuri, triunghiuri și cercuri îl pune să le numere și să treacă numărul în tabel.',
        }),
        'Desenele sunt gândite pentru copii mici: formele nu se suprapun, deci nu apar forme noi acolo unde se ating două, pătratul e exact pătrat, iar dreptunghiul e vizibil mai lung decât înalt, ca să nu fie confundate.',
        'Merge bine după o plimbare prin clasă în care copiii caută forme pe pereți, pe mese și pe ferestre. Fișa de trasat pregătește și mâna pentru scris, prin liniile drepte și cercurile închise.',
      ],
      description: by(c, {
        presc: 'Fișe cu forme geometrice pentru grădiniță: cerc, pătrat, triunghi și dreptunghi de trasat și de găsit într-un desen. PDF de printat, gata de lucru.',
        CP: 'Fișe cu figuri geometrice pentru clasa pregătitoare: pătrat, dreptunghi, triunghi și cerc de trasat și de numărat. PDF de printat, cu competența 2.2.',
        I: 'Fișe cu figuri geometrice pentru clasa I: pătrat, dreptunghi, triunghi și cerc, numărate într-un desen și trasate. PDF de printat, cu competența 2.2.',
      }),
      faq: [
        {
          q: 'Pot adăuga și alte forme, ca ovalul sau steaua?',
          a: 'În generator, la „Forme”, ai mai multe forme de trasat. Codul din programă se tipărește însă doar pentru cele patru figuri pe care le numește programa la clasa pregătitoare și la clasa I.',
        },
      ],
    }),
  },
  {
    slug: 'matematica',
    phrase: 'Fișe matematică',
    label: 'Matematică',
    area: 'mem',
    levels: ['presc'],
    presets: [p('cifre', 'presc'), p('numara', 'presc'), p('mate-sir', 'presc'), p('mate-vecini', 'presc'), p('coloreaza-dupa-cod'), p('grupeaza-numara', 'presc'), p('mate-lungimi', 'presc'), p('mate-balanta', 'presc'), p('mate-figuri', 'presc'), p('forme', 'presc')],
    copy: (c) => ({
      lead: by(c, { presc: 'Numere până la 10, forme, măsurări și grupări: matematica de la grădiniță, pe fișe.' }),
      body: [
        'La grădiniță, matematica înseamnă să numeri obiecte, să recunoști cifrele, să compari mărimi și să grupezi lucruri după o regulă. Curriculumul pentru educație timpurie le pune în domeniul „Dezvoltarea cognitivă și cunoașterea lumii”, iar fișele de aici urmează comportamentele de acolo.',
        'Ai fișe de cifre și de numărat, șiruri până la 10, „Colorează după cod” cu numerele de la 1 la 5, „Grupează și numără”, măsurări cu cuburi, balanța și forme de trasat sau de găsit într-un desen. Fiecare fișă are un singur fel de exercițiu, cu instrucțiunea scrisă sus, pe care o citește adultul.',
        'Educatoarele aleg de obicei o fișă pe zi, după activitatea cu obiecte reale. Acasă, o fișă de zece minute ajunge; dacă cel mic obosește, se poate termina a doua zi.',
      ],
      description: by(c, {
        presc: 'Fișe de matematică pentru grădiniță: cifre, numărat, șiruri, colorează după cod, grupări, măsurări și forme. PDF de printat, cu comportamentul vizat.',
      }),
      faq: [
        {
          q: 'De la ce vârstă se potrivesc?',
          a: 'Cele mai multe sunt pentru grupa mijlocie și grupa mare (4–6 ani). Pentru cei de 3–4 ani alege fișele cu desene și puține obiecte, ca „Colorează după cod” sau „Numără și scrie”, și lucrează împreună cu ei.',
        },
      ],
    }),
  },
  {
    slug: 'coloreaza-dupa-cod',
    phrase: 'Fișe colorează după cod',
    label: 'Colorează după cod',
    area: 'mem',
    presets: [p('coloreaza-dupa-cod'), p('calculeaza-coloreaza')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Un desen cu numere de la 1 la 5: fiecare parte se colorează cu culoarea numărului ei.',
        CP: 'Calculează și colorează: rezultatul adunării sau scăderii spune culoarea.',
      }),
      body: [
        by(c, {
          presc: 'Copilul recunoaște cifrele de la 1 la 5 și le leagă de culori: fiecare parte a desenului are un număr, iar legenda de jos spune ce culoare îi corespunde. E un exercițiu de numerație care arată ca o joacă.',
          CP: 'La clasa pregătitoare, fiecare parte a desenului are o adunare sau o scădere cu rezultatul de la 1 la 5. Copilul calculează, caută rezultatul în legendă și colorează: exersează adunările și scăderile cu 1–5 unități fără să simtă că face un test.',
        }),
        'Legenda are pentru fiecare număr și pata de culoare, și numele culorii scris, așa că fișa merge și printată alb-negru. Desenele sunt simple, cu zone mari, potrivite pentru creioane colorate groase: un pește, o căsuță, un fluture, o floare, o barcă și bradul de Crăciun.',
        'E o fișă bună pentru finalul zilei sau pentru copiii care termină mai repede. Dacă vrei să vezi doar dacă a recunoscut numerele, ajunge să coloreze câte o bucățică din fiecare zonă.',
      ],
      description: by(c, {
        presc: 'Fișe „Colorează după cod” pentru grădiniță: desene cu numere de la 1 la 5 și legenda culorilor. PDF de printat, cu comportamentul vizat.',
        CP: 'Fișe „Calculează și colorează” pentru clasa pregătitoare: adunări și scăderi cu rezultatul 1–5, care dau culoarea. PDF de printat, cu competența 1.4.',
      }),
      faq: [
        {
          q: 'Câte desene sunt?',
          a: 'Șase: peștele, căsuța, fluturele, floarea, barca și bradul de Crăciun. Primul e gratuit; celelalte cinci sunt în varianta completă și se aleg din generator.',
        },
      ],
    }),
  },
  {
    slug: 'orientare-in-spatiu',
    phrase: 'Fișe orientare în spațiu',
    label: 'Orientare în spațiu',
    area: 'mem',
    presets: [p('orientare')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Pe, sub, deasupra, în, lângă, stânga, dreapta: unde se află fiecare lucru?',
        I: 'Poziții în spațiu: deasupra, dedesubt, între, în stânga, în dreapta, la mijloc.',
      }),
      body: [
        by(c, {
          CP: 'Programa clasei pregătitoare cere orientarea în spațiu față de repere date, cu cuvinte ca „în”, „pe”, „deasupra”, „dedesubt”, „lângă”, „în fața”, „în spatele”, „stânga”, „dreapta”. Pe fișă, copilul citește (sau ascultă) întrebarea și încercuiește imaginea potrivită.',
          I: 'La clasa I, orientarea în spațiu se face după repere și direcții date. Copilul lucrează pe o masă cu o cutie, pe un caroiaj de 3 × 3 sau desenează singur „deasupra casei”, „sub copac”, în șase căsuțe.',
        }),
        'Primele fișe au o masă și o cutie, cu lucruri puse pe, sub, deasupra sau în ele; următoarele au un caroiaj cu colțuri, mijloc și vecini, iar ultimele cer un desen. Pentru fiecare întrebare sunt trei imagini, dintre care una singură e corectă.',
        'Înainte de fișă, cuvintele se exersează cu jucării sau cu propriul corp („pune mâna deasupra capului”). Stânga și dreapta rămân grele multă vreme; un semn pe mâna stângă ajută.',
      ],
      description: by(c, {
        CP: 'Fișe de orientare în spațiu pentru clasa pregătitoare: pe, sub, deasupra, în, lângă, stânga, dreapta. PDF de printat, cu competența 2.1 pe fișă.',
        I: 'Fișe de orientare în spațiu pentru clasa I: poziții pe caroiaj, între, deasupra, dedesubt, stânga, dreapta. PDF de printat, cu competența 2.1 pe fișă.',
      }),
      faq: [
        {
          q: 'Există și pentru grădiniță?',
          a: 'Fișele se pot folosi și la grupa mare, dar nu tipăresc un comportament din curriculum: cel care vorbește despre orientare în spațiu se referă la simțuri, nu la o fișă. De aceea pagina are doar clasa pregătitoare și clasa I.',
        },
      ],
    }),
  },
  {
    slug: 'sortare',
    phrase: 'Fișe sortare',
    label: 'Sortare și clasificare',
    area: 'mem',
    presets: [p('sorteaza'), p('intrusul'), p('grupeaza-numara')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Sortează, găsește intrusul, grupează și numără: gândire logică pe imagini.',
        CP: 'Sortarea după un criteriu dat: fructe sau legume, mari sau mici, apoi numărate.',
      }),
      body: [
        by(c, {
          presc: 'Curriculumul pentru grădiniță cere operații de seriere, grupare și clasificare a obiectelor. Copilul unește fiecare imagine cu grupa ei, taie imaginea care nu se potrivește și numără câte lucruri sunt din fiecare fel.',
          CP: 'La clasa pregătitoare, sortarea se face pe baza unui criteriu dat: căsuțele grupelor îi spun copilului regula. Pe „Grupează și numără” trece apoi numărul fiecărui fel de imagine în tabel, legând clasificarea de numerație.',
        }),
        `„Sortează” are șase seturi: fructe și legume, animale de casă și sălbatice, apă, uscat și aer, mare și mic, forme, haine și jucării.${c.has('intrusul') ? ' La „Ce nu se potrivește?” primele seturi au intrusul dintr-o categorie cu totul alta, iar ultimele dintr-una apropiată, deci mai greu de găsit.' : ''}`,
        'Merge bine după o activitate cu obiecte adevărate: copiii pun fructele într-un coș și legumele în altul, apoi fac fișa. Întreabă-l mereu „de ce?”: explicația contează mai mult decât linia trasă.',
      ],
      description: by(c, {
        presc: 'Fișe de sortare pentru grădiniță: sortează pe grupe, găsește intrusul, grupează și numără, cu imagini colorate. PDF de printat, cu comportamentul vizat.',
        CP: 'Fișe de sortare pentru clasa pregătitoare: clasificare după un criteriu dat, apoi „Grupează și numără”. PDF de printat, cu competența 5.1 pe fișă.',
      }),
      faq: [
        {
          q: 'Copilul nu știe încă să citească. Poate face fișa singur?',
          a: 'Da, după ce adultul îi citește instrucțiunea. Tot ce are de făcut se face pe imagini: unește, taie sau numără, așa că nu trebuie să citească nimic singur.',
        },
      ],
    }),
  },

  // ───────────────────────── Jocuri pe hârtie (grădiniță) ─────────────────────────
  {
    slug: 'labirint',
    phrase: 'Fișe labirint',
    label: 'Labirint',
    area: 'joc',
    codeless: true,
    presets: [p('labirint')],
    copy: (c) => ({
      lead: by(c, { presc: 'Labirinturi cu un singur drum, de la iepuraș la morcov: ușor, mediu și greu.' }),
      body: [
        'Labirintul e un joc de atenție și de control al creionului: copilul caută drumul cu privirea, apoi îl trasează fără să atingă pereții. E unul dintre cele mai bune exerciții înainte de scris, pentru că mâna învață să meargă pe un culoar îngust și să se oprească la timp.',
        'Fiecare labirint are un singur drum corect, de la imaginea de sus la cea de jos: iepurașul la morcov, albina la floare, cățelul la os, Moș Crăciun la sanie, pinguinul la pește, maimuța la banană. Sunt de trei mărimi, de 6 × 6, 9 × 9 și 12 × 12 căsuțe, ca să crești greutatea pe măsură ce copilul prinde curaj.',
        'Pentru cei mici, lasă-l să urmărească întâi drumul cu degetul, apoi cu creionul. Dacă se blochează, nu-l corecta imediat: întoarcerea dintr-o fundătură e chiar partea care îl învață.',
      ],
      description: by(c, {
        presc: 'Fișe cu labirint pentru grădiniță: un singur drum, de la iepuraș la morcov, în 6 × 6, 9 × 9 sau 12 × 12 căsuțe. PDF de printat, cu soluție.',
      }),
      faq: [
        {
          q: 'Labirintul are soluție?',
          a: 'Da. În generator bifezi „Pagină cu răspunsuri la final”, iar pe ultima pagină drumul corect e desenat peste labirint.',
        },
      ],
    }),
  },
  {
    slug: 'gaseste-diferentele',
    phrase: 'Fișe găsește diferențele',
    label: 'Găsește diferențele',
    area: 'joc',
    codeless: true,
    presets: [p('gaseste-diferentele')],
    copy: (c) => ({
      lead: by(c, { presc: 'Aceeași imagine de două ori: găsește 3, 4 sau 5 diferențe.' }),
      body: [
        '„Găsește diferențele” antrenează atenția și observația: copilul compară două imagini aproape la fel și caută ce s-a schimbat. E un exercițiu pe care îl face cu plăcere și care îl pregătește să observe detaliile mici, de care are nevoie la citit.',
        'În a doua imagine lipsește un lucru, apare altul în locul lui sau unul s-a mutat. Copilul încercuiește fiecare diferență în imaginea de jos și colorează câte un cerc pentru fiecare găsită, ca să știe câte i-au mai rămas. Scenele sunt în curte, la mare, în parc, la fermă, în pădure și iarna, cu 3, 4 sau 5 diferențe.',
        'Începe cu scenele cu 3 diferențe și vorbiți despre ce vede („Ce face cățelul în prima imagine?”). Așa exercițiul devine și unul de vocabular.',
      ],
      description: by(c, {
        presc: 'Fișe „Găsește diferențele” pentru grădiniță: aceeași scenă de două ori, cu 3–5 diferențe de încercuit. Atenție și observație. PDF de printat.',
      }),
      faq: [
        {
          q: 'Are și răspunsurile?',
          a: 'Da. Cu „Pagină cu răspunsuri la final”, ultima pagină arată unde sunt diferențele, ca să verifici repede.',
        },
      ],
    }),
  },
  {
    slug: 'gaseste-umbra',
    phrase: 'Fișe găsește umbra',
    label: 'Găsește umbra',
    area: 'joc',
    codeless: true,
    presets: [p('gaseste-umbra')],
    copy: (c) => ({
      lead: by(c, { presc: 'Șase imagini și umbrele lor: unește fiecare imagine cu umbra ei.' }),
      body: [
        'Copilul se uită la forma fiecărei imagini și o caută printre umbre, unde nu mai are culori și detalii care să-l ajute. Exersează percepția formei, aceeași pe care o folosește mai târziu când deosebește literele asemănătoare.',
        'Pe fișă sunt șase imagini și, amestecate, umbrele lor. Copilul trage o linie de la punctul imaginii la punctul umbrei; prima linie e trasă ca exemplu. Seturile au animale, fructe și legume, mijloace de transport, jucării, animale sălbatice și imagini de Crăciun.',
        'Pentru cei mici, acoperă jumătate din imagini și lucrați câte trei. Liniile de la punct la punct sunt și un bun exercițiu de mână, înainte de grafisme.',
      ],
      description: by(c, {
        presc: 'Fișe „Găsește umbra” pentru grădiniță: unește șase imagini cu umbrele lor, de la animale la jucării. Percepția formei și atenție. PDF de printat.',
      }),
      faq: [
        {
          q: 'De la ce vârstă se potrivește?',
          a: 'Din grupa mică, cu un adult alături care numește imaginile și arată prima linie; la grupa mare, copiii o fac de obicei singuri.',
        },
      ],
    }),
  },

  // ───────────────────────── Comunicare ─────────────────────────
  {
    slug: 'grafisme',
    phrase: (l) => (l === 'presc' ? 'Fișe grafisme' : 'Fișe elemente grafice'),
    label: 'Grafisme',
    area: 'clr',
    presets: [p('grafisme'), p('urmareste-linia')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Linii, zigzag, valuri și bucle: mâna se pregătește pentru litere.',
        CP: 'Elementele grafice ale scrisului: bastonașe, zigzag, valuri, bucle.',
      }),
      body: [
        by(c, {
          presc: 'Curriculumul pentru grădiniță cere ca cel mic să asimileze unele elemente ale scrisului. Grafismele sunt primul pas: linii drepte, oblice, zigzag, valuri, cârlige și bucle, trasate de la stânga la dreapta, în ritmul mâinii.',
          CP: 'La clasa pregătitoare, programa începe scrisul cu trasarea elementelor grafice și a contururilor literelor. Bastonașele, zigzagul, valurile și buclele de pe fișă sunt bucățile din care se fac apoi literele.',
        }),
        '„Elemente grafice” pune fiecare element pe liniatură, cu model, rânduri de urmărit și rând liber. „Urmărește linia” face din același element un drum: copilul trasează linia punctată de la o imagine la alta, de la iepuraș la morcov sau de la albină la floare.',
        'Înainte de fișă, elementul se face mare, în aer, pe tablă sau în nisip. Pe hârtie contează mai puțin viteza și mai mult direcția corectă și o mână relaxată; trei rânduri bine făcute valorează mai mult decât o pagină grăbită.',
      ],
      description: by(c, {
        presc: 'Fișe cu grafisme pentru grădiniță: linii, zigzag, valuri și bucle de trasat, plus „Urmărește linia”. PDF de printat, cu comportamentul D.3.4 pe fișă.',
        CP: 'Fișe cu elemente grafice pentru clasa pregătitoare: bastonașe, zigzag, valuri și bucle pe liniatură. PDF de printat, cu competența 4.1 pe fișă.',
      }),
      faq: [
        {
          q: 'Câte grafisme să facă pe zi?',
          a: 'Puține și bine: un element nou și unul cunoscut, câteva rânduri din fiecare. Când mâna obosește, liniile se strâmbă și copilul exersează de fapt greșeala; mai bine se oprește și continuă a doua zi.',
        },
      ],
    }),
  },
  {
    slug: 'litere-de-tipar',
    phrase: 'Fișe litere de tipar',
    label: 'Litere de tipar',
    area: 'clr',
    presets: [p('litere-tipar'), p('litere-perechi'), p('gaseste-litera')],
    fiseKinds: ['litere'],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Literele de tipar, mari și mici, cu ordinea liniilor și alfabetul românesc complet.',
        CP: 'Literele de tipar pe liniatură, mari și mici, cu ordinea liniilor și diacritice corecte.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul recunoaște literele și încearcă să le scrie, mai ales pe cele din numele lui. Fișa îi arată cu puncte numerotate și săgeți de unde pornește fiecare linie a literei, iar „Găsește litera” îl pune să o caute printre litere care seamănă.',
          CP: 'La clasa pregătitoare, programa cere trasarea contururilor literelor de tipar. Copilul scrie litera mare și pe cea mică pe liniatură, cu ordinea corectă a liniilor, pregătind astfel scrisul de mână din clasa I.',
        }),
        'Alfabetul e cel românesc, cu Ă, Â, Î, Ș și Ț, iar Ș și Ț au virguliță dedesubt, nu sedilă. Fișa se deschide cu A, B și C; în generator alegi orice litere, doar mari, doar mici sau perechi (Aa, Bb), și pui numele copilului în antet.',
        'Pentru litera săptămânii ai și câte o fișă gratuită pentru fiecare literă, cu un cuvânt și o imagine, în lista de mai jos. Educatoarele și învățătorii le folosesc după ce litera a fost auzită, rostită și găsită în cuvinte.',
      ],
      description: by(c, {
        presc: 'Fișe cu litere de tipar pentru grădiniță: litere mari și mici de trasat, cu ordinea liniilor, și „Găsește litera”. Cu Ă, Â, Î, Ș, Ț, PDF de printat.',
        CP: 'Fișe cu litere de tipar pentru clasa pregătitoare: litere mari și mici pe liniatură, cu ordinea liniilor și diacritice. PDF de printat, cu competența 4.1.',
      }),
      faq: [
        {
          q: 'În ce ordine se învață literele?',
          a: by(c, {
            presc: 'La grădiniță nu există o ordine impusă. Multe educatoare încep cu literele din numele copiilor sau cu vocalele; fișa merge cu orice ordine, pentru că alegi literele din generator.',
            CP: 'Ordinea o dă abecedarul clasei. Fișa nu impune una: alegi din generator literele învățate până acum și faci recapitulări cu ele.',
          }),
        },
      ],
    }),
  },
  {
    slug: 'litere-de-mana',
    phrase: 'Fișe litere de mână',
    label: 'Litere de mână',
    area: 'clr',
    presets: [p('litere-mana')],
    fiseKinds: ['mana'],
    copy: (c) => ({
      lead: by(c, { I: 'Literele de mână, mari și mici, pe liniatură tip I, cu ordinea liniilor.' }),
      body: [
        'Programa clasei I cere scrierea literelor de mână. Copilul învață forma fiecărei litere, înclinarea și, mai ales, felul în care se leagă de următoarea, ca un cuvânt să se scrie dintr-o singură linie.',
        'Fișa e pe liniatura caietului tip I, cu liniile oblice care arată înclinarea, și are litera mare și cea mică, cu ordinea liniilor. Pe ultimele rânduri modelul se estompează, ca cel mic să scrie singur. Se deschide cu Aa, Bb și Cc; în generator alegi orice litere și pui numele copilului.',
        'Pentru fiecare literă ai și o fișă gratuită separată, cu un cuvânt scris legat, în lista de mai jos. La clasă, ele se potrivesc după lecția despre litera nouă; acasă, ca temă scurtă, dacă litera din caiet nu a ieșit încă bine.',
      ],
      description: by(c, {
        I: 'Fișe cu litere de mână pentru clasa I: litere mari și mici pe liniatura tip I, cu ordinea liniilor și modelul care se estompează. PDF, cu competența 4.1.',
      }),
      faq: [
        {
          q: 'Literele sunt ca în caietul de la școală?',
          a: 'Sunt litere de mână legate, pe liniatura tip I, cu înclinarea caietului. Forma unor litere variază puțin de la un abecedar la altul; dacă la clasă o literă se scrie altfel, spune-i copilului că ambele sunt corecte și urmați modelul învățătorului.',
        },
      ],
    }),
  },
  {
    slug: 'sunetul-initial',
    phrase: 'Fișe sunetul inițial',
    label: 'Sunetul inițial',
    area: 'clr',
    presets: [p('sunetul-initial'), p('primul-sunet')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Cu ce sunet începe cuvântul? Încercuiește imaginile și ascultă primul sunet.',
        CP: 'Sunetul de la începutul cuvântului: încercuiește imaginile, apoi scrie litera.',
        I: 'Sunetul inițial, ca pas spre despărțirea în silabe și scrierea corectă.',
      }),
      body: [
        by(c, {
          presc: 'Curriculumul pentru grădiniță cere ca cel mic să diferențieze fonetic cuvinte, silabe și sunete și să asocieze sunete cu litere. Pe fișă, copilul numește cu voce tare imaginile și încercuiește doar pe cele care încep cu sunetul dat: „albină”, „avion”, dar nu „minge”.',
          CP: 'La clasa pregătitoare, programa cere identificarea sunetului inițial și final al unui cuvânt rostit clar și rar. Copilul încercuiește imaginile care încep cu un sunet, apoi, pe „Primul sunet”, scrie sub fiecare imagine litera cu care începe cuvântul.',
          I: 'La clasa I, identificarea sunetelor rămâne baza scrisului corect: cine aude bine primul sunet scrie mai puține litere greșite. Fișele sunt bune pentru recapitulare la începutul anului și pentru copiii care confundă sunete apropiate.',
        }),
        '„Sunetul de la început” are imagini colorate cu cuvinte cunoscute, dintre care copilul le alege pe cele care încep cu sunetul dat. „Primul sunet” are sub fiecare imagine loc pentru litera cu care începe cuvântul, iar un set amestecă mai multe sunete.',
        'Exercițiul se face cu voce tare: adultul spune cuvântul rar, apăsând puțin pe primul sunet, iar copilul repetă. Abia după ce aude sunetul, îl caută pe fișă.',
      ],
      description: by(c, {
        presc: 'Fișe cu sunetul inițial pentru grădiniță: imagini de încercuit după primul sunet al cuvântului. Auz fonematic, pregătire pentru citit. PDF de printat.',
        CP: 'Fișe cu sunetul inițial pentru clasa pregătitoare: încercuiește imaginile și scrie litera de început. PDF de printat, cu competența 1.3 pe fișă.',
        I: 'Fișe cu sunetul inițial pentru clasa I: primul sunet al cuvântului, încercuit și scris, pentru recapitulare. PDF de printat, cu competența 1.3 pe fișă.',
      }),
      faq: [
        {
          q: 'Pot alege sunetul?',
          a: `Da. În generator alegi unul dintre sunetele ${SOUND_LETTERS.join(', ')}. ${SOUND_LETTERS.filter((l) => isItemAllowed(`sound:${l}`, 'games', 'free')).join(', ')} sunt gratuite, celelalte fac parte din varianta completă. „Primul sunet” are șase seturi de imagini.`,
        },
      ],
    }),
  },
  {
    slug: 'despartirea-in-silabe',
    phrase: (l) => (l === 'presc' ? 'Fișe silabe' : 'Fișe despărțire în silabe'),
    label: 'Despărțirea în silabe',
    area: 'clr',
    presets: [p('cate-silabe'), p('desparte-silabe')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Câte silabe are cuvântul? Bate din palme și colorează câte o bulină pentru fiecare.',
        CP: 'Câte silabe are cuvântul și care sunt ele: colorează bulinele, apoi scrie silabele.',
        I: 'Despărțirea cuvintelor în silabe, de urmărit și de scris în căsuțe.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul învață să audă silabele: spune cuvântul rar și bate din palme pentru fiecare bucată. Pe fișă, colorează câte o bulină pentru fiecare silabă a cuvântului din imagine.',
          CP: 'La clasa pregătitoare, programa cere identificarea silabelor din cuvintele rostite clar și rar. Întâi copilul numără silabele și colorează bulinele, apoi, pe „Desparte în silabe”, le urmărește și le scrie singur în căsuțe.',
          I: 'La clasa I, despărțirea în silabe ajută la citire și la scrierea corectă a cuvintelor lungi. Pe fișă copilul urmărește silabele cuvântului, apoi le scrie singur, câte una în fiecare căsuță.',
        }),
        'Cuvintele sunt alese din universul copilului și au câte o imagine, ca să le recunoască înainte să le poată citi. Fiecare exercițiu are șase seturi de cuvinte; primul e gratuit, celelalte sunt în varianta completă.',
        'Silabele se exersează întâi oral, cu bătăi din palme sau pași. Fișa vine după, ca să vadă că bucățile auzite se pot și număra, și scrie.',
      ],
      description: by(c, {
        presc: 'Fișe cu silabe pentru grădiniță: câte silabe are cuvântul, cu imagini și buline de colorat. Auz fonematic, pregătire pentru citit. PDF de printat.',
        CP: 'Fișe de despărțire în silabe pentru clasa pregătitoare: numără silabele, apoi scrie-le în căsuțe. PDF de printat, cu competența 1.3 pe fișă.',
        I: 'Fișe de despărțire în silabe pentru clasa I: cuvinte cu imagini, silabe de urmărit și de scris în căsuțe. PDF de printat, cu competența 1.3 pe fișă.',
      }),
      faq: [
        {
          q: 'Cum se desparte corect un cuvânt în silabe?',
          a: 'Pentru copii, regula practică e să spună cuvântul rar: fiecare deschidere a gurii e o silabă și are o vocală. Regulile complete de despărțire se învață treptat; cuvintele de pe fișă sunt alese ca despărțirea să fie clară.',
        },
      ],
    }),
  },
  {
    slug: 'citire',
    phrase: 'Fișe citire',
    label: 'Citire',
    area: 'clr',
    presets: [p('citire-uneste'), p('citire-deseneaza'), p('citire-completeaza'), p('citire-text'), p('citire-litera-lipsa')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Primele cuvinte citite: unește cuvântul cu imaginea, citește și desenează.',
        I: 'Cuvinte, propoziții și texte scurte, de citit și de înțeles.',
        II: 'Texte scurte cu întrebări și cuvinte cu litera lipsă, pentru citirea cu înțeles.',
      }),
      body: [
        by(c, {
          CP: 'La clasa pregătitoare, copilul recunoaște cuvinte uzuale scrise cu litere mari și mici de tipar. Pe fișe citește cuvinte scurte, le unește cu imaginea lor, citește „un nor”, „doi nori” și desenează ce a citit.',
          I: 'La clasa I, copilul citește cuvinte și propoziții scurte, apoi un text scurt despre întâmplări familiare. Fișele merg de la cuvânt (unește cu imaginea, litera care lipsește) la propoziție (completează) și la text (citește și răspunde).',
          II: 'La clasa a II-a, citirea trece la texte: copilul citește un text scurt despre o întâmplare și răspunde la întrebări despre el. Fișa cu litera lipsă exersează cuvinte mai lungi, unde un sunet scăpat schimbă cuvântul.',
        }),
        'Cuvintele și textele sunt scrise pentru clasa respectivă: la pregătitoare cu litere de tipar, mari sau mici, de la clasa I cu litere mici și propoziții. Textele sunt originale, scurte, cu trei întrebări la care copilul încercuiește răspunsul sau alege Da ori Nu.',
        'Fișele de citire se potrivesc la lucrul individual, cât învățătorul ascultă pe rând câte un copil. Acasă, lasă-l să citească întâi cu voce tare, apoi să rezolve singur.',
      ],
      description: by(c, {
        CP: 'Fișe de citire pentru clasa pregătitoare: cuvinte de unit cu imaginea, citește și desenează, litera care lipsește. PDF de printat, cu competența pe fișă.',
        I: 'Fișe de citire pentru clasa I: cuvinte și imagini, propoziții de completat, text scurt cu întrebări. PDF de printat, cu competențele din programă pe fișă.',
        II: 'Fișe de citire pentru clasa a II-a: text scurt cu întrebări și cuvinte cu litera lipsă. Citire cu înțeles, PDF de printat, cu competența pe fișă.',
      }),
      faq: [
        {
          q: 'Textele sunt din manual?',
          a: 'Nu. Textele și propozițiile sunt scrise de noi, scurte și potrivite clasei, ca să nu repete manualul pe care copilul l-a citit deja. Pentru fiecare fel de exercițiu sunt mai multe seturi, pe clase.',
        },
      ],
    }),
  },
  {
    slug: 'scriere',
    phrase: 'Fișe scriere',
    label: 'Scriere și copiere',
    area: 'clr',
    presets: [p('citire-copiaza'), p('citire-ordoneaza')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Copierea cuvintelor cu litere de tipar, pe liniatură cu trei linii.',
        I: 'Propoziții de copiat de mână și cuvinte de ordonat într-o propoziție.',
        II: 'Copiere și propoziții ordonate, cu literă mare la început și punct la final.',
      }),
      body: [
        by(c, {
          CP: 'La clasa pregătitoare, scrisul înseamnă încă litere de tipar. Pe fișa „Copiază”, copilul vede un cuvânt scurt și îl scrie dedesubt, pe liniatura cu trei linii, literă cu literă.',
          I: 'La clasa I, copilul copiază propoziții scurte cu litere de mână, pe liniatura caietului tip I, și redactează mesaje scurte. Pe „Ordonează cuvintele”, așază cuvintele amestecate în ordine și scrie propoziția pe rând.',
          II: 'La clasa a II-a, programa cere scrierea unor mesaje și respectarea convențiilor de bază: literă mare la început, punct la final, spațiu între cuvinte. Copierea și propozițiile ordonate exersează exact aceste reguli.',
        }),
        by(c, {
          CP: 'Modelul e scris cu litere de tipar, iar rândul de scris are liniatură ca în caiet. Cuvintele sunt scurte și cunoscute, ca atenția să meargă la forma literelor, nu la citit.',
          I: 'Pe „Copiază” modelul e de tipar sau, dacă alegi „de mână”, scris legat, iar sub el e liniatura tip I. Pe „Ordonează cuvintele” cuvintele sunt de tipar, iar propoziția se scrie de mână, pe rândul de dedesubt.',
          II: 'La clasa a II-a, liniatura nu mai are liniile oblice, ca în caietele clasei. Propozițiile sunt mai lungi, iar la ordonare cuvântul cu literă mare și punctul îl ajută pe copil să găsească începutul și sfârșitul.',
        }),
        'Copierea pare simplă, dar cere atenție: copilul se uită la model, ține minte o bucată și o scrie. O fișă pe zi, făcută îngrijit, e mai utilă decât trei făcute în grabă.',
      ],
      description: by(c, {
        CP: 'Fișe de scriere pentru clasa pregătitoare: cuvinte de copiat cu litere de tipar, pe liniatură. PDF de printat, cu competența 4.1 din programă pe fișă.',
        I: 'Fișe de scriere pentru clasa I: propoziții de copiat de mână pe liniatură tip I și cuvinte de ordonat. PDF de printat, cu competențele din programă.',
        II: 'Fișe de scriere pentru clasa a II-a: copiere și propoziții de ordonat, cu literă mare și punct. PDF de printat, cu competențele din programă pe fișă.',
      }),
      faq: [
        {
          q: 'Modelul poate fi scris de mână?',
          a: by(c, {
            CP: 'La clasa pregătitoare se scrie cu litere de tipar, așa că modelul rămâne de tipar. Literele de mână încep în clasa I.',
            default: 'Da. Fișa se deschide cu modelul de tipar; în generator alegi „de mână”, iar modelul se scrie legat. Rândurile de scris rămân pe liniatura clasei.',
          }),
        },
      ],
    }),
  },

  // ───────────────────────── Explorarea mediului ─────────────────────────
  {
    slug: 'explorarea-mediului',
    phrase: 'Fișe explorarea mediului',
    label: 'Explorarea mediului',
    area: 'mem',
    family: 'mediu',
    // grădiniță has its own page, „Cunoașterea mediului” (the school subject is „Explorarea mediului”)
    levels: ['CP', 'I', 'II'],
    presets: [
      p('partile-plantei'), p('partile-corpului'), p('simturile'), p('cine-unde-traieste'), p('cum-se-deplaseaza'), p('anotimpurile'), p('vremea'), p('ce-iei-cu-tine'),
      p('apa-solida-lichida'), p('ce-se-intampla-cu-apa'), p('mediile-de-viata'),
    ],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Plante, animale, corpul omenesc, anotimpuri și vreme: explorarea mediului pe fișe.',
        I: 'Apa și transformările ei: solidă sau lichidă, se topește, îngheață, fierbe.',
        II: 'Mediile de viață: pădurea, deșertul, polii și Marea Neagră, cu animalele lor.',
      }),
      body: [
        by(c, {
          CP: 'La clasa pregătitoare, explorarea mediului înseamnă să observi și să spui ce ai observat: părțile unei plante, ale corpului, simțurile, unde trăiesc și cum se deplasează animalele, semnele fiecărui anotimp și ale vremii. Fișele le pun pe hârtie, cu desene și cuvinte de scris sau de lipit.',
          I: 'La clasa I, conținuturile de explorare includ transformările apei: solidificare, topire, evaporare, fierbere. Copilul încercuiește dacă apa e solidă sau lichidă în fiecare imagine, apoi citește ce se întâmplă cu ea și alege consecința.',
          II: 'La clasa a II-a, programa numește mediile de viață: lacul, pădurea, Delta Dunării, Marea Neagră, deșertul, Polul Nord și Polul Sud. Pe fișă, copilul pune un X în tabel pentru mediul fiecărui animal (pădurea, deșertul, polii, Marea Neagră), adică sortează și înregistrează date, cum cere competența.',
        }),
        by(c, {
          CP: 'Fiecare fișă are un singur subiect și puțin text, ca să poată fi făcută și de copiii care încă nu citesc. La „Părțile plantei” și „Părțile corpului”, cuvintele sunt jos, pe fișă, și se pot scrie sau decupa și lipi în căsuțe.',
          I: 'Fișele cer o propoziție citită și o alegere, deci se potrivesc după experiment: gheață care se topește pe bancă, apă care fierbe în ceainic, aburul de pe geam.',
          II: 'Tabelul are mediile pe coloane și animalele pe rânduri; la final, merită discutat de ce fiecare animal trăiește acolo: ce mănâncă, cum se apără de frig sau de căldură.',
        }),
        'Cel mai bine funcționează după o observație reală: o plantă adusă în clasă, o plimbare în curte, o fereastră udă de ploaie. Fișa e partea în care copilul spune, în scris sau prin desen, ce a văzut.',
      ],
      description: by(c, {
        CP: 'Fișe de explorarea mediului pentru clasa pregătitoare: plante, animale, corpul, simțurile, anotimpuri și vreme. PDF de printat, cu competența pe fișă.',
        I: 'Fișe de explorarea mediului pentru clasa I: apa solidă sau lichidă, topire, înghețare, fierbere, evaporare. PDF de printat, cu competența pe fișă.',
        II: 'Fișe de explorarea mediului pentru clasa a II-a: mediile de viață ale animalelor, în tabel, de la pădure la poli. PDF de printat, cu competența 5.1.',
      }),
      faq: [
        {
          q: 'Copilul trebuie să știe să scrie?',
          a: by(c, {
            CP: 'Nu neapărat. Cuvintele sunt pe fișă și se pot decupa și lipi, iar celelalte fișe cer doar încercuiri și linii. Cei care scriu deja pot copia cuvântul în căsuță.',
            default: 'Fișa cere puțin scris: încercuiri, un X în tabel sau un cuvânt. Accentul e pe ce a observat copilul, nu pe cât scrie.',
          }),
        },
      ],
    }),
  },
  {
    slug: 'cunoasterea-mediului',
    phrase: 'Fișe cunoașterea mediului',
    label: 'Cunoașterea mediului',
    area: 'mem',
    family: 'mediu',
    levels: ['presc'],
    presets: [
      p('partile-plantei'), p('partile-corpului'), p('simturile'), p('cine-unde-traieste'), p('cum-se-deplaseaza'), p('puiul-cui-este'), p('anotimpurile'), p('vremea'), p('ce-iei-cu-tine'),
    ],
    copy: (c) => ({
      lead: by(c, { presc: 'Plante, animale și puii lor, corpul și simțurile, anotimpurile și vremea.' }),
      body: [
        'Curriculumul pentru grădiniță cere ca cel mic să identifice caracteristici ale lumii vii, ale Pământului și ale fenomenelor din jur. Fișele de aici iau pe rând plantele, animalele și puii lor, corpul omenesc și simțurile, anotimpurile și vremea.',
        'Sunt fișe cu desene mari și o sarcină simplă: unește, încercuiește sau lipește. La „Părțile plantei” și „Părțile corpului”, cuvintele sunt jos, pe fișă, ca să fie decupate și lipite de copiii care nu scriu încă. „Puiul cui este?” leagă vaca de vițel, oaia de miel, calul de mânz și îmbogățește vocabularul.',
        'Educatoarele le folosesc în săptămâna tematică: după povestea despre toamnă vine fișa cu anotimpurile, după vizita la fermă cea cu animalele. O fișă la sfârșitul activității fixează ce s-a discutat.',
      ],
      description: by(c, {
        presc: 'Fișe de cunoașterea mediului pentru grădiniță: plante, animale și pui, corpul, simțurile, anotimpuri, vreme. PDF de printat, cu comportamentul vizat.',
      }),
      faq: [
        {
          q: 'Se potrivesc cu temele din planificare?',
          a: 'Da, mai ales cu temele „Cine sunt/suntem?” și „Când, cum și de ce se întâmplă?”, dar și cu proiectele despre toamnă, animale sau corpul omenesc. Pe fișă se tipărește comportamentul din curriculum, ca să-l treci ușor în planificare.',
        },
      ],
    }),
  },
  {
    slug: 'anotimpurile',
    phrase: 'Fișe anotimpuri',
    label: 'Anotimpurile și vremea',
    area: 'mem',
    presets: [p('anotimpurile'), p('vremea'), p('ce-iei-cu-tine')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Primăvara, vara, toamna, iarna: semnele fiecărui anotimp și vremea de afară.',
        CP: 'Anotimpurile, semnele vremii și „dacă plouă, atunci iau umbrela”.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul învață să recunoască semnele fiecărui anotimp și ale vremii: frunzele care cad, zăpada, soarele puternic. Pe fișe încercuiește anotimpul fiecărei imagini, unește semnele vremii cu numele lor și alege ce ia cu el când plouă sau ninge.',
          CP: 'La clasa pregătitoare, anotimpurile sunt un exemplu de fenomen care se repetă, din care copilul descoperă o regularitate. Fișa cu vremea leagă simbolurile de nume, iar „Ce iei cu tine?” exersează relațiile de tipul „dacă… atunci…”, pe care le cere programa.',
        }),
        '„Anotimpurile” are patru copaci, câte unul pentru fiecare anotimp, și imagini de încercuit; seturile următoare întreabă ce se întâmplă primăvara, vara, toamna și iarna. „Vremea” are soarele, norii, ploaia, ninsoarea, vântul și fulgerul, iar „Ce iei cu tine?” leagă vremea de lucrurile de care ai nevoie afară.',
        'Fișele merg bine la calendarul naturii de dimineață: copiii spun cum e vremea afară, apoi lucrează fișa. Seturile pe anotimpuri se pot păstra pentru începutul fiecărui anotimp.',
      ],
      description: by(c, {
        presc: 'Fișe cu anotimpurile pentru grădiniță: semnele fiecărui anotimp, vremea și ce iei cu tine când plouă. PDF de printat, cu comportamentul vizat pe fișă.',
        CP: 'Fișe cu anotimpurile pentru clasa pregătitoare: semnele anotimpurilor, vremea și „dacă plouă, atunci…”. PDF de printat, cu competențele din programă.',
      }),
      faq: [
        {
          q: 'Sunt fișe separate pentru fiecare anotimp?',
          a: 'Da. Pe lângă fișa cu toate cele patru anotimpuri, generatorul are câte un set pentru primăvară, vară, toamnă și iarnă („Ce se întâmplă toamna?”). Prima fișă e gratuită, seturile pe anotimpuri fac parte din varianta completă.',
        },
      ],
    }),
  },
  {
    slug: 'corpul-omenesc',
    phrase: 'Fișe corpul omenesc',
    label: 'Corpul omenesc și simțurile',
    area: 'mem',
    presets: [p('partile-corpului'), p('simturile')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Cap, gât, trunchi, mâini, picioare și cele cinci simțuri.',
        CP: 'Părțile corpului și simțurile, cu cuvinte de scris sau de lipit.',
      }),
      body: [
        by(c, {
          presc: 'La grădiniță, copilul își descoperă corpul și învață cum află lucruri despre lume: vede cu ochii, aude cu urechile, miroase cu nasul, gustă cu limba, pipăie cu mâna. Fișele îl pun să numească părțile corpului și să lege fiecare organ de simțul lui.',
          CP: 'Conținuturile clasei pregătitoare includ corpul omenesc, părțile lui și simțurile. Copilul formulează ce a observat folosind cuvinte și desene: scrie sau lipește numele părților corpului și unește organele de simț cu simțul lor.',
        }),
        'Pe „Părțile corpului”, de la capul, gâtul, trunchiul, mâinile și picioarele desenate pleacă linii spre căsuțe goale, iar cuvintele sunt jos, de scris sau de decupat și lipit. Pe „Simțurile”, ochiul, urechea, nasul, limba și mâna se unesc cu simțul lor.',
        'Înainte de fișă, jucați „Simon spune”: „atinge-ți genunchiul”, „arată-mi cotul”. Pentru simțuri ajută o cutie cu obiecte de pipăit sau câteva mirosuri cunoscute.',
      ],
      description: by(c, {
        presc: 'Fișe cu corpul omenesc pentru grădiniță: părțile corpului și cele cinci simțuri, de unit, scris sau lipit. PDF de printat, cu comportamentul vizat.',
        CP: 'Fișe cu corpul omenesc pentru clasa pregătitoare: părțile corpului și simțurile, cu cuvinte de scris sau lipit. PDF de printat, cu competența 4.1.',
      }),
      faq: [
        {
          q: 'Cuvintele se pot decupa?',
          a: 'Da. Cuvintele sunt tipărite jos, pe aceeași pagină, ca să poată fi decupate și lipite în căsuțe de copiii care nu scriu încă; ceilalți le pot copia.',
        },
      ],
    }),
  },
  {
    slug: 'plante-si-animale',
    phrase: 'Fișe plante și animale',
    label: 'Plante și animale',
    area: 'mem',
    presets: [p('partile-plantei'), p('cine-unde-traieste'), p('cum-se-deplaseaza'), p('puiul-cui-este'), p('mediile-de-viata')],
    copy: (c) => ({
      lead: by(c, {
        presc: 'Părțile plantei, unde trăiesc animalele, cum se mișcă și cum se numesc puii lor.',
        CP: 'Părțile plantei, locul fiecărui animal și felul în care se deplasează.',
        II: 'Animalele și mediile lor de viață, înregistrate într-un tabel.',
      }),
      body: [
        by(c, {
          presc: 'Copilul descoperă că plantele au părți cu nume (rădăcină, tulpină, frunză, floare, fruct) și că fiecare animal are locul lui: în pădure, la fermă sau în apă. Învață și cum se deplasează animalele și cum se numesc puii lor.',
          CP: 'La clasa pregătitoare, copilul descrie părțile unei plante și sortează animalele după un criteriu dat: unde trăiesc (pădure, fermă, apă) și cum se deplasează (zboară, înoată, merge, se târăște).',
          II: 'La clasa a II-a, animalele sunt așezate în mediile lor de viață: pădurea, deșertul, Polul Nord, Polul Sud, Marea Neagră. Copilul sortează și înregistrează datele în tabel, cu un X pentru fiecare animal.',
        }),
        by(c, {
          II: 'Tabelul e un prim pas spre lucrul cu date: rândurile sunt animalele, coloanele mediile, iar copilul citește tabelul pe orizontală și pe verticală.',
          default: '„Părțile plantei” are o plantă desenată cu linii spre căsuțe și cuvintele de scris sau de lipit. „Cine unde trăiește?” și „Cum se deplasează?” cer încercuiri, deci merg și pentru cei care nu citesc încă.',
        }),
        'O plantă adevărată adusă în clasă, cu rădăcina scoasă din ghiveci, face fișa mult mai ușoară. Pentru animale ajută o carte cu imagini sau o vizită la grădina zoologică.',
      ],
      description: by(c, {
        presc: 'Fișe cu plante și animale pentru grădiniță: părțile plantei, unde trăiesc animalele, cum se mișcă, puii lor. PDF de printat, cu comportamentul vizat.',
        CP: 'Fișe cu plante și animale pentru clasa pregătitoare: părțile plantei, unde trăiesc și cum se deplasează animalele. PDF de printat, cu competența pe fișă.',
        II: 'Fișe cu animale pentru clasa a II-a: mediile de viață, de la pădure și deșert la poli și Marea Neagră, într-un tabel. PDF de printat, cu competența 5.1.',
      }),
      faq: [
        {
          q: 'Animalele sunt din România?',
          a: 'În mare parte da: animale de la fermă, din pădure și din apele noastre. La mediile de viață ale clasei a II-a apar și animale din deșert și de la poli, pentru că programa le cere.',
        },
      ],
    }),
  },

  // ───────────────────────── Evaluări ─────────────────────────
  {
    slug: 'evaluare-matematica',
    phrase: 'Evaluare matematică',
    label: 'Evaluare la matematică',
    area: 'eval',
    presets: [p('evaluare-mate')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Comparare, adunări și scăderi, probleme cu imagini și bani, pe 2–3 pagini, cu răspunsuri.',
        I: 'Numere până la 100: comparare, adunări și scăderi, probleme și bani, cu răspunsuri.',
        II: 'Numere până la 1000, tabla înmulțirii, ceasul și probleme, cu răspunsuri.',
      }),
      body: [
        by(c, {
          CP: 'Evaluarea adună câteva exerciții din fiecare temă a clasei pregătitoare: compararea numerelor, adunări și scăderi, o problemă cu obiecte desenate și banii. Numerele sunt până la 10, ca evaluarea să verifice înțelegerea, nu viteza de calcul.',
          I: 'Evaluarea pentru clasa I are compararea numerelor până la 100, adunări și scăderi, probleme simple și bani. E potrivită la finalul unei unități sau ca evaluare sumativă de modul.',
          II: 'Evaluarea pentru clasa a II-a are compararea numerelor până la 1000, adunări și scăderi fără trecere peste ordin, numărul care lipsește, tabla înmulțirii, ceasul cu sferturi și minute și o problemă.',
        }),
        'Fiecare temă devine un item numerotat („1. Compară numerele.”), cu câteva exerciții. Antetul spune disciplina și clasa, ultima pagină poate avea un rând de autoevaluare, iar pagina de răspunsuri se tipărește mereu, cu un tabel orientativ de calificative (FB, B, S, I) după numărul de răspunsuri corecte.',
        'Tabelul de calificative e orientativ: îl adaptezi descriptorilor de performanță ai clasei tale. Cu „Alte exerciții” faci o a doua variantă, cu aceleași cerințe, pentru colegul de bancă.',
      ],
      description: by(c, {
        CP: 'Evaluare la matematică pentru clasa pregătitoare: comparare, adunări, scăderi, probleme și bani, cu răspunsuri și calificative orientative. PDF de printat.',
        I: 'Evaluare la matematică pentru clasa I: numere până la 100, adunări, scăderi, probleme și bani, cu răspunsuri și calificative orientative. PDF de printat.',
        II: 'Evaluare la matematică pentru clasa a II-a: numere până la 1000, tabla înmulțirii, ceasul, probleme, cu răspunsuri și calificative. PDF de printat.',
      }),
      faq: [
        {
          q: 'Pot schimba exercițiile din evaluare?',
          a: 'Da. În generator adaugi sau scoți tipuri de exerciții și schimbi concentrul; evaluarea se refac singură, cu pagina de răspunsuri potrivită. Codurile competențelor se tipăresc pe fiecare pagină.',
        },
      ],
    }),
  },
  {
    slug: 'evaluare-sunete-si-silabe',
    phrase: 'Evaluare sunete și silabe',
    label: 'Evaluare: sunete și silabe',
    area: 'eval',
    presets: [p('evaluare-clr')],
    copy: (c) => ({
      lead: by(c, {
        CP: 'Sunetul de la început, primul sunet, câte silabe și despărțirea în silabe, cu răspunsuri.',
        I: 'Sunete și silabe, cu litere mici, ca evaluare la începutul clasei I.',
      }),
      body: [
        by(c, {
          CP: 'La clasa pregătitoare, evaluarea la comunicare verifică auzul fonematic: dacă copilul aude sunetul de la începutul cuvântului, dacă scrie litera potrivită și dacă împarte cuvântul în silabe. Literele sunt mari, de tipar, cum le citesc copiii la început.',
          I: 'La începutul clasei I, evaluarea verifică ce a rămas din pregătitoare: sunetul inițial, litera de început, numărul de silabe și despărțirea în silabe. Varianta pentru clasa I folosește și literele mici.',
        }),
        'Sunt patru itemi numerotați, cu câte câteva imagini fiecare, pe două-trei pagini. Antetul are disciplina și clasa, iar la final se tipărește mereu pagina cu răspunsuri și un tabel orientativ de calificative.',
        'Instrucțiunile se citesc cu voce tare, item cu item, iar cuvintele din imagini se spun împreună înainte de lucru, ca să nu evaluezi vocabularul în locul auzului.',
      ],
      description: by(c, {
        CP: 'Evaluare la comunicare pentru clasa pregătitoare: sunetul inițial, primul sunet, silabe, despărțire în silabe, cu răspunsuri. PDF de printat, gata de dat.',
        I: 'Evaluare sunete și silabe pentru clasa I: sunetul inițial, litera de început și despărțirea în silabe, cu răspunsuri și calificative. PDF de printat.',
      }),
      faq: [
        {
          q: 'Se potrivește ca evaluare inițială?',
          a: by(c, {
            CP: 'Mai degrabă după primele săptămâni de școală, când copiii au lucrat deja oral cu sunete și silabe. La începutul anului, cei mai mulți nu au încă exercițiul scrierii literelor.',
            I: 'Da. Verifică exact ce ar trebui să fi rămas din clasa pregătitoare și îți arată de la început cine are nevoie de sprijin la auzul fonematic.',
          }),
        },
      ],
    }),
  },
  {
    slug: 'evaluare-citire',
    phrase: 'Evaluare citire',
    label: 'Evaluare: citire și scriere',
    area: 'eval',
    presets: [p('evaluare-citire')],
    copy: (c) => ({
      lead: by(c, {
        I: 'Cuvinte și imagini, litera care lipsește, propoziția de completat și un text cu întrebări.',
        II: 'Litera lipsă, propoziții de ordonat și de completat, un text cu întrebări.',
      }),
      body: [
        by(c, {
          I: 'Evaluarea pentru clasa I verifică citirea de la cuvânt la text: copilul unește cuvintele cu imaginile, scrie litera care lipsește, completează o propoziție și citește un text scurt, apoi răspunde la întrebări despre el.',
          II: 'Evaluarea pentru clasa a II-a are seturile clasei: litera care lipsește din cuvinte mai lungi, propoziții de ordonat și scris cu literă mare și punct, propoziții de completat și un text cu întrebări.',
        }),
        'Itemii sunt numerotați, pe două-trei pagini, cu antetul disciplinei și al clasei. Textul e original și scurt, ca să nu fie unul pe care copiii l-au citit deja în manual, iar pagina cu răspunsuri și tabelul orientativ de calificative se tipăresc mereu la final.',
        'Merge ca evaluare la sfârșitul unui modul sau ca probă de citire cu înțeles. Pentru o imagine completă, adaugă o citire cu voce tare, pe care fișa nu o poate măsura.',
      ],
      description: by(c, {
        I: 'Evaluare la citire pentru clasa I: cuvinte și imagini, litera lipsă, propoziție de completat, text cu întrebări, cu răspunsuri. PDF de printat.',
        II: 'Evaluare la citire pentru clasa a II-a: litera lipsă, propoziții de ordonat și completat, text cu întrebări, cu răspunsuri. PDF de printat.',
      }),
      faq: [
        {
          q: 'Cât durează evaluarea?',
          a: 'De obicei o oră de curs, cu instrucțiunile citite de învățător. Copiii care citesc mai încet pot primi textul la început, ca să aibă timp să-l citească de două ori.',
        },
      ],
    }),
  },
  {
    slug: 'evaluare',
    phrase: 'Evaluare',
    label: 'Evaluare',
    area: 'eval',
    presets: [p('evaluare-gradinita')],
    copy: (c) => ({
      lead: by(c, { presc: 'Sortează, numără, ce nu se potrivește și sunetul de la început, cu fișă de observare.' }),
      body: [
        'Evaluarea pentru grădiniță adună patru activități cunoscute: sortarea pe grupe, numărarea până la 5, găsirea imaginii care nu se potrivește și sunetul de la începutul cuvântului. Nu are calificative: la grădiniță se observă progresul, nu se notează.',
        'Itemii sunt numerotați și au imagini mari. La final se tipărește pagina cu răspunsuri și, dacă vrei, o fișă de observare, în care treci pentru fiecare copil ce a reușit singur și ce cu sprijin.',
        'Se face în grupuri mici, cu educatoarea alături, care citește instrucțiunea fiecărui item. E bună la sfârșitul unui proiect tematic sau înainte de discuția cu părinții.',
      ],
      description: by(c, {
        presc: 'Evaluare pentru grădiniță: sortare, numărat, ce nu se potrivește și sunetul inițial, cu răspunsuri și fișă de observare, fără calificative. PDF.',
      }),
      faq: [
        {
          q: 'De ce nu are calificative?',
          a: 'Pentru că la grădiniță nu se dau calificative. În locul tabelului de calificative de la școală, evaluarea are o fișă de observare, în care notezi ce face copilul singur și ce face cu sprijin.',
        },
      ],
    }),
  },
];
