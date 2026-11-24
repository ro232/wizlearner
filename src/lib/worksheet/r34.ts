import type { Block, Choice, MC, Ruling } from './blocks34';

/**
 * Limba și literatura română, clasa a III-a și a IV-a (programme llr-iii-iv, OMEN 5003/2014): the data of the sheets in the
 * „Jocuri” category (r34-pages.ts lays them out). Items are "kind:n"; each set is written for one class (R34_SETS):
 *
 * - "lect:1–6"  Citește și înțelege: an original text (narrative or informative) and questions on two pages: details,
 *               true / false, the order of events, the title or the conclusion, an opinion, the reader's own experience
 * - "aud:1–2"   Ascultă și răspunde: the questions for the pupils, and the text for the teacher to read aloud
 * - "parti:1–4" Părțile de vorbire, intuitively, from a short text: substantiv, adjectiv, pronume personal, verb; number,
 *               gender, person, tense; subiect and predicat; in clasa a IV-a also correcting agreement mistakes
 * - "orto:1–4"  Ortograme: s-a / sa, s-au / sau, i-a / ia, i-au / iau, l-a / la, v-a / va, ce-a / cea, ce-i / cei,
 *               s-ar / sar, n-ai / nai, ne-am / neam (in clasa a IV-a also finding and correcting the mistakes)
 * - "punct:1–2" Semnele de punctuație: . ? ! , : and the dialogue dash
 * - "voc:1–2"   Cuvinte cu înțeles asemănător, opus, cuvinte cu mai multe sensuri (no specific competence names them)
 * - "comp:1–4"  Compunere, on a plan: a lived event, a description (III); a portrait, a story (IV)
 * - "func:1–4"  Texte funcționale: invitația, afișul (III); scrisoarea, anunțul și biletul (IV)
 * - "dict:1–2"  Dictare: sentences with gaps for the words the teacher dictates
 * - "carte:1–2" Fișa cărții citite (III), jurnalul de lectură (IV)
 *
 * Every text is original, written for these sheets (none is taken from a textbook). Every question has one right answer,
 * found word for word in the text or plainly deduced from it; every spelling choice has only one form that fits the
 * sentence (the participle, the article or the meaning rules the other out). Correct Romanian with ș ț (comma below).
 * Writing rows: tip II in clasa a III-a, dictando in clasa a IV-a, as in the pupils' notebooks.
 */

export type R34Kind = 'lect' | 'aud' | 'parti' | 'orto' | 'punct' | 'voc' | 'comp' | 'func' | 'dict' | 'carte';
export const R34_KINDS: R34Kind[] = ['lect', 'aud', 'parti', 'orto', 'punct', 'voc', 'comp', 'func', 'dict', 'carte'];
export type Level34 = 'III' | 'IV';
export const R34_SETS: Record<R34Kind, Level34[]> = {
  lect: ['III', 'III', 'III', 'IV', 'IV', 'IV'],
  aud: ['III', 'IV'],
  parti: ['III', 'III', 'IV', 'IV'],
  orto: ['III', 'III', 'IV', 'IV'],
  punct: ['III', 'IV'],
  voc: ['III', 'IV'],
  comp: ['III', 'III', 'IV', 'IV'],
  func: ['III', 'III', 'IV', 'IV'],
  dict: ['III', 'IV'],
  carte: ['III', 'IV'],
};

const R34_ITEM = /^(lect:[1-6]|(parti|orto|comp|func):[1-4]|(aud|punct|voc|dict|carte):[12])$/;
export function isR34Item(item: string): boolean {
  return R34_ITEM.test(item);
}
export function r34Parts(item: string): [R34Kind, number] {
  const [k, n] = item.split(':');
  return [k as R34Kind, Number(n)];
}
export function r34SetLevel(item: string): Level34 | null {
  if (!isR34Item(item)) return null;
  const [k, n] = r34Parts(item);
  return R34_SETS[k][n - 1] ?? null;
}
/** The free plan: the first set of each class of each kind. */
export function isFreeR34Item(item: string): boolean {
  if (!isR34Item(item)) return false;
  const [k, n] = r34Parts(item);
  const levels = R34_SETS[k];
  return levels.indexOf(levels[n - 1]) === n - 1;
}
export function r34Items(): string[] {
  return R34_KINDS.flatMap((k) => R34_SETS[k].map((_, i) => `${k}:${i + 1}`));
}

export const ruling = (level: Level34): Ruling => (level === 'III' ? 'II' : 'dictando');

export const R34_TITLES: Record<R34Kind, string> = {
  lect: 'Citește și înțelege', aud: 'Ascultă și răspunde', parti: 'Părțile de vorbire', orto: 'Ortograme', punct: 'Semnele de punctuație',
  voc: 'Sinonime, antonime, omonime', comp: 'Compunere', func: 'Texte funcționale', dict: 'Dictare', carte: 'Fișa de lectură',
};

/** One page of a sheet. */
export interface R34Page { title: string; instruction: string; help?: string; blocks: Block[]; note?: string }
/** A sheet: one or two pages; `teacher` marks a page for the teacher only (the text of „Ascultă și răspunde”). */
export interface R34Sheet { level: Level34; pages: (R34Page & { teacher?: boolean })[] }

// ───────────────────────── the texts ─────────────────────────

export interface ReadingText34 { title: string; paragraphs: string[]; kind: 'narativ' | 'informativ' }

export const LECT_TEXTS: ReadingText34[] = [
  {
    title: 'Ghiozdanul uitat', kind: 'narativ',
    paragraphs: [
      'Era luni dimineață, iar Matei se grăbea spre școală. Mama îi pregătise un sandviș și un măr, pe care le pusese pe masa din bucătărie. Băiatul și-a încălțat repede ghetele, și-a luat geaca și a ieșit pe ușă fluierând.',
      'Abia când a ajuns la poarta școlii și-a dat seama că mâinile îi erau goale. Ghiozdanul rămăsese pe scaunul din hol! Matei s-a oprit speriat. În ghiozdan erau caietul de teme și cartea pe care trebuia să o prezinte colegilor.',
      'Deodată, a auzit o voce cunoscută. Era sora lui mai mare, Irina, care venea alergând cu ghiozdanul în brațe.',
      '— L-ai uitat lângă ușă, i-a spus ea, gâfâind.',
      'Matei i-a mulțumit și i-a promis că de acum își va pregăti lucrurile de cu seară. În pauză, i-a dăruit Irinei mărul lui roșu.',
    ],
  },
  {
    title: 'Cățelul din ploaie', kind: 'narativ',
    paragraphs: [
      'Într-o după-amiază de toamnă, Sara se întorcea de la școală cu bunicul. Ploua mărunt, iar frunzele ude se lipeau de trotuar. Lângă o bancă din parc, fetița a zărit un cățel mic, cu blana neagră și o pată albă pe frunte. Tremura de frig și scâncea încet.',
      '— Bunicule, uite! Cred că s-a rătăcit, a șoptit Sara.',
      'Bunicul s-a aplecat și a văzut la gâtul cățelului o zgardă roșie, cu un număr de telefon. L-au învelit în fularul Sarei și au sunat imediat. Peste un sfert de oră, un băiat cu glugă a venit în fugă prin ploaie. Când și-a văzut stăpânul, cățelul a început să latre de bucurie.',
      '— Îl cheamă Fulg. Îl căutăm de azi-dimineață, a spus băiatul cu lacrimi în ochi.',
      'Seara, Sara i-a povestit mamei totul. Fularul era ud leoarcă, dar fetița zâmbea.',
    ],
  },
  {
    title: 'Albinele, mici și harnice', kind: 'informativ',
    paragraphs: [
      'Albinele trăiesc în familii mari, numite colonii. Într-un stup pot locui zeci de mii de albine, iar fiecare are o treabă a ei. Regina depune ouăle. Albinele lucrătoare adună nectar și polen din flori, îngrijesc puii, curăță stupul și îl apără. Trântorii sunt masculii coloniei.',
      'Din nectarul florilor, albinele fac mierea. O păstrează în fagure, în căsuțe mici cu șase laturi, făcute din ceară. O albină care a găsit flori bogate în nectar se întoarce la stup și „dansează”. Prin acest dans, le arată celorlalte în ce direcție să zboare.',
      'Albinele sunt foarte importante pentru natură. Când trec de la o floare la alta, ele duc polenul. Așa, multe plante pot face fructe și semințe. Fără albine, am avea mai puține mere, cireșe sau dovleci.',
    ],
  },
  {
    title: 'Podul de peste pârâu', kind: 'narativ',
    paragraphs: [
      'Vara trecută, Andrei și-a petrecut vacanța la bunici, într-un sat de la poalele munților. În spatele casei curgea un pârâu limpede, iar dincolo de el se întindea o pădure deasă. Copiii din sat treceau pârâul sărind de pe o piatră pe alta, dar Andrei nu îndrăznea. Pietrele erau alunecoase și îi era teamă să nu cadă în apa rece.',
      'Într-o zi, Ilinca, nepoata vecinilor, i-a propus să construiască împreună un pod. Au adunat crengi groase, le-au legat cu sfoară și au așezat deasupra o scândură veche, găsită în șopron. Bunicul i-a privit de departe, fără să spună nimic. Abia la sfârșit s-a apropiat și a bătut în scândură două cuie, ca să nu se miște.',
      'Când podul a fost gata, Andrei a pășit primul pe el. Inima îi bătea tare, dar scândura nu s-a clintit. Ajuns pe celălalt mal, a râs cu poftă. De atunci, cei doi au trecut în fiecare zi în pădure, după zmeură, iar copiii din sat au început să folosească și ei podul.',
      'La plecare, bunicul i-a spus lui Andrei: „Frica se micșorează când o înfrunți cu un prieten alături.”',
    ],
  },
  {
    title: 'Desenul cu apus de soare', kind: 'narativ',
    paragraphs: [
      'Școala lui Tudor organiza un concurs de desene cu tema „Orașul meu peste o sută de ani”. Tudor s-a apucat imediat de lucru: a desenat mașini zburătoare, poduri de sticlă și clădiri cu grădini pe acoperiș. Lucra în fiecare seară și nu lăsa pe nimeni să se uite.',
      'Cu o zi înainte de concurs, sora lui mai mică, Ada, a vrut să-i arate o floare desenată de ea. S-a urcat pe scaun lângă masă și, fără să vrea, a răsturnat paharul cu apă peste desenul lui Tudor. Culorile s-au amestecat, iar cerul albastru s-a prelins peste case. Ada a izbucnit în plâns.',
      'La început, Tudor a fost foarte supărat. Apoi s-a uitat mai bine la foaie. Petele de culoare semănau cu un apus de soare deasupra orașului. A mai adăugat câteva păsări și o lună subțire, iar în colț a scris: „Desen realizat de Tudor și Ada”.',
      'La concurs, desenul a primit premiul pentru originalitate. Pe drumul spre casă, Ada ținea diploma strâns, ca pe o comoară.',
    ],
  },
  {
    title: 'Delta Dunării', kind: 'informativ',
    paragraphs: [
      'Delta Dunării se află în sud-estul României, acolo unde Dunărea se varsă în Marea Neagră. Înainte de a ajunge la mare, fluviul se desparte în trei brațe: Chilia, Sulina și Sfântu Gheorghe. Între ele se întind canale, lacuri, bălți și insule plutitoare de stuf, numite plaur.',
      'Delta este una dintre cele mai mari zone umede din Europa. Aici trăiesc peste trei sute de specii de păsări, printre care pelicanul, lebăda și cormoranul. În ape înoată știuci, crapi și somni. Unele păsări vin din țări îndepărtate doar ca să își crească puii aici, primăvara și vara.',
      'Pentru că natura de aici este atât de bogată și de rară, Delta Dunării a fost declarată rezervație a biosferei. Asta înseamnă că plantele și animalele sunt ocrotite prin lege. Vizitatorii trebuie să respecte reguli: nu au voie să facă zgomot lângă cuiburi, să rupă plante sau să lase gunoaie.',
      'Localnicii se deplasează mai ales cu barca. Pentru ei, apa este și drum, și sursă de hrană.',
    ],
  },
];

/** The texts of „Ascultă și răspunde”, read aloud by the teacher (printed on the teacher's page only). */
export const AUD_TEXTS: ReadingText34[] = [
  {
    title: 'Ariciul și alunele', kind: 'narativ',
    paragraphs: [
      'Ariciul Țepușel se pregătea de iarnă. Toată toamna strânsese mere, ghinde și ciuperci uscate în vizuina lui de sub rădăcina unui stejar. Într-o dimineață, a auzit pe cineva plângând. Era veverița Roșcata. Vântul îi spulberase cuibul, iar alunele ei se rostogoliseră printre frunze.',
      'Țepușel s-a gândit puțin, apoi a început să caute alunele. Le găsea ușor, pentru că avea nasul fin. Le-a înfipt în țepii de pe spate și le-a dus, câte zece, la noua casă a veveriței, o scorbură caldă din fagul bătrân.',
      'Până seara, toate alunele erau la locul lor. Roșcata i-a dăruit ariciului un șal împletit din mușchi verde.',
      '— Să-ți fie cald la iarnă, prietene! i-a spus ea.',
      'Țepușel a adormit în noaptea aceea cu șalul pe umeri, mai fericit ca oricând.',
    ],
  },
  {
    title: 'Bicicleta albastră', kind: 'narativ',
    paragraphs: [
      'Radu primise de ziua lui o bicicletă albastră. În prima săptămână n-a lăsat pe nimeni să se atingă de ea. O ștergea seara de praf și o ținea în hol, lângă ușă.',
      'Sâmbătă, vărul lui, Victor, a venit în vizită. Victor nu avea bicicletă și se uita la ea cu ochi mari. Radu s-a prefăcut că nu observă. Au jucat fotbal, apoi s-au uitat la desene animate, dar Victor privea mereu spre hol.',
      'Seara, după ce Victor a plecat, Radu a ieșit singur cu bicicleta în parc. A dat câteva ture, dar n-a mai simțit bucuria din primele zile. Parcă îi lipsea ceva. Pe drumul spre casă, a trecut pe lângă terenul unde se jucaseră și a văzut mingea lui Victor, uitată în iarbă.',
      'Duminică dimineață, Radu a sunat la ușa vărului său, cu mingea într-o mână și cu ghidonul bicicletei în cealaltă.',
      '— Ai uitat-o ieri, a spus el. Și... vrei să ne plimbăm cu bicicleta pe rând?',
    ],
  },
];

// ───────────────────────── helpers ─────────────────────────

const mc = (q: string, options: string[], answer: number): MC => ({ q, options, answer });
/**
 * An inline choice „Text {} text” between the right form and a wrong one. Which comes first is decided by the text itself
 * (a hash), so the right form is not always on the same side and the sheet stays the same every time.
 */
function ch(text: string, right: string, wrong: string): Choice {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.codePointAt(0)!, 16777619);
  const rightFirst = ((h >>> 0) >> 3) % 2 === 0;
  return { text, options: rightFirst ? [right, wrong] : [wrong, right], answer: rightFirst ? 0 : 1 };
}

// ───────────────────────── Citește și înțelege ─────────────────────────

interface LectQuestions {
  details: MC[];
  tf: { text: string; answer: boolean }[];
  order: string[];
  /** The order the events are printed in (indexes into `order`). */
  shown: number[];
  /** Page 2: the title / conclusion / meaning questions. */
  deeper: MC[];
  /** Page 2: open questions (opinion, feelings, own experience). */
  open: { q: string; rows: number; answer: string }[];
  /** Informative texts: a small organiser to fill (instead of the order of events). */
  organiser?: { text: string; answer: string }[];
}

const LECT_QUESTIONS: LectQuestions[] = [
  {
    details: [
      mc('Ce uitase Matei acasă?', ['geaca', 'ghiozdanul', 'ghetele'], 1),
      mc('Unde rămăsese ghiozdanul?', ['pe masa din bucătărie', 'pe scaunul din hol', 'în parc'], 1),
      mc('Cine i-a adus ghiozdanul?', ['mama', 'un coleg', 'Irina, sora lui'], 2),
    ],
    tf: [
      { text: 'Matei a ieșit din casă fluierând.', answer: true },
      { text: 'Mama a adus ghiozdanul la școală.', answer: false },
      { text: 'În ghiozdan era caietul de teme.', answer: true },
    ],
    order: ['Matei pleacă de acasă fluierând.', 'Matei observă că nu are ghiozdanul.', 'Irina vine alergând cu ghiozdanul.', 'Matei îi dăruiește Irinei mărul.'],
    shown: [2, 0, 3, 1],
    deeper: [mc('Care alt titlu se potrivește textului?', ['Sora grijulie', 'O zi de vacanță', 'Mărul fermecat'], 0)],
    open: [
      { q: 'Ce ai simțit când Irina a apărut cu ghiozdanul? Scrie un rând.', rows: 2, answer: 'Răspuns personal (de exemplu: m-am bucurat, am fost ușurat).' },
      { q: 'Ce părere ai despre Irina? De ce?', rows: 3, answer: 'Răspuns personal, cu o explicație (de exemplu: este o soră grijulie, pentru că a alergat după el cu ghiozdanul).' },
    ],
  },
  {
    details: [
      mc('Cu cine se întorcea Sara de la școală?', ['cu mama', 'cu bunicul', 'cu o colegă'], 1),
      mc('Ce avea cățelul la gât?', ['o zgardă roșie', 'un clopoțel', 'un fular'], 0),
      mc('Cum îl chema pe cățel?', ['Fulg', 'Bobi', 'Azor'], 0),
    ],
    tf: [
      { text: 'Afară ploua mărunt.', answer: true },
      { text: 'Cățelul avea blana albă, cu o pată neagră.', answer: false },
      { text: 'Băiatul îl căuta pe cățel de dimineață.', answer: true },
    ],
    order: ['Sara vede cățelul lângă bancă.', 'Bunicul găsește numărul de telefon pe zgardă.', 'Un băiat vine în fugă prin ploaie.', 'Sara îi povestește mamei întâmplarea.'],
    shown: [1, 3, 0, 2],
    deeper: [mc('Care alt titlu se potrivește textului?', ['Vacanța la mare', 'Un prieten regăsit', 'Fularul pierdut'], 1)],
    open: [
      { q: 'Ce ai simțit când cățelul și-a revăzut stăpânul? Scrie un rând.', rows: 2, answer: 'Răspuns personal.' },
      { q: 'Ce părere ai despre ce au făcut Sara și bunicul? De ce?', rows: 3, answer: 'Răspuns personal, cu o explicație (de exemplu: au făcut bine, pentru că l-au ajutat pe cățel să ajungă acasă).' },
    ],
  },
  {
    details: [
      mc('Cum se numesc familiile de albine?', ['colonii', 'turme', 'stoluri'], 0),
      mc('Cine depune ouăle?', ['trântorii', 'regina', 'albinele lucrătoare'], 1),
      mc('Câte laturi are o căsuță din fagure?', ['patru', 'cinci', 'șase'], 2),
    ],
    tf: [
      { text: 'Albinele fac mierea din nectarul florilor.', answer: true },
      { text: 'Trântorii adună polenul.', answer: false },
      { text: 'Albinele ajută plantele să facă fructe.', answer: true },
    ],
    order: [],
    shown: [],
    organiser: [
      { text: 'Regina {_}', answer: 'depune ouăle' },
      { text: 'Albinele lucrătoare {_}', answer: 'adună nectar și polen, îngrijesc puii, curăță și apără stupul' },
      { text: 'Fagurele este făcut din {_}', answer: 'ceară' },
    ],
    deeper: [
      mc('Care sunt cuvintele-cheie ale textului?', ['albine, stup, miere, flori', 'ploaie, parc, cățel', 'școală, ghiozdan, caiet'], 0),
      mc('De ce „dansează” o albină la stup?', ['ca să se încălzească', 'ca să le arate celorlalte unde sunt florile', 'ca să o sperie pe regină'], 1),
    ],
    open: [{ q: 'De ce sunt albinele importante pentru natură? Răspunde cu cuvintele tale.', rows: 3, answer: 'Duc polenul de la o floare la alta, așa că plantele pot face fructe și semințe.' }],
  },
  {
    details: [
      mc('Unde și-a petrecut Andrei vacanța?', ['la mare', 'la bunici, într-un sat de munte', 'într-o tabără'], 1),
      mc('De ce nu trecea Andrei pârâul?', ['îi era teamă să nu cadă', 'bunicul nu-l lăsa', 'apa era prea adâncă'], 0),
      mc('Ce a făcut bunicul la sfârșit?', ['a construit singur podul', 'a bătut două cuie în scândură', 'i-a certat pe copii'], 1),
    ],
    tf: [
      { text: 'Ilinca a avut ideea să construiască un pod.', answer: true },
      { text: 'Scândura a fost cumpărată de la magazin.', answer: false },
      { text: 'Copiii din sat au folosit și ei podul.', answer: true },
    ],
    order: ['Andrei nu îndrăznește să treacă pârâul pe pietre.', 'Ilinca îi propune să construiască un pod.', 'Bunicul bate două cuie în scândură.', 'Andrei trece primul podul.'],
    shown: [3, 1, 0, 2],
    deeper: [
      mc('Ce concluzie poți trage din text?', ['Cu ajutorul unui prieten poți trece peste o teamă.', 'Nu e bine să te apropii de un pârâu.', 'Bunicii nu au grijă de nepoți.'], 0),
      mc('Ce înseamnă în text „scândura nu s-a clintit”?', ['nu s-a mișcat deloc', 's-a rupt', 'a scârțâit tare'], 0),
    ],
    open: [
      { q: 'Crezi că Ilinca i-a fost o prietenă bună lui Andrei? Scrie și o propoziție din text care îți susține părerea.', rows: 3, answer: 'Răspuns personal, susținut cu o propoziție din text (de exemplu: „Ilinca... i-a propus să construiască împreună un pod.”).' },
      { q: 'Ți-a fost și ție teamă de ceva ce ai reușit apoi să faci? Povestește în două-trei rânduri.', rows: 3, answer: 'Răspuns personal.' },
    ],
  },
  {
    details: [
      mc('Care era tema concursului?', ['„Orașul meu peste o sută de ani”', '„Vacanța de vară”', '„Animalul meu preferat”'], 0),
      mc('Ce a răsturnat Ada?', ['cutia cu creioane', 'paharul cu apă', 'vaza cu flori'], 1),
      mc('Ce premiu a primit desenul?', ['premiul întâi', 'premiul pentru originalitate', 'premiul publicului'], 1),
    ],
    tf: [
      { text: 'Tudor le arăta tuturor desenul în fiecare seară.', answer: false },
      { text: 'Petele de culoare semănau cu un apus de soare.', answer: true },
      { text: 'Tudor a scris pe desen și numele Adei.', answer: true },
    ],
    order: ['Tudor desenează în fiecare seară orașul viitorului.', 'Ada răstoarnă paharul cu apă peste desen.', 'Tudor adaugă păsări și o lună subțire.', 'Desenul primește un premiu la concurs.'],
    shown: [2, 0, 3, 1],
    deeper: [
      mc('Ce concluzie poți trage din text?', ['O greșeală poate deveni ceva frumos dacă nu renunți.', 'Nu trebuie să desenezi seara.', 'Surorile mici strică totul.'], 0),
      mc('De ce a scris Tudor și numele Adei pe desen?', ['pentru că și ea a contribuit, chiar fără să vrea', 'pentru că așa a cerut învățătoarea', 'pentru că Ada a desenat tot orașul'], 0),
    ],
    open: [
      { q: 'Ce părere ai despre felul în care s-a purtat Tudor cu Ada? Scrie și o propoziție din text care îți susține părerea.', rows: 3, answer: 'Răspuns personal, susținut cu o propoziție din text (de exemplu: „…în colț a scris: «Desen realizat de Tudor și Ada»”).' },
      { q: 'Ți s-a întâmplat să strici ceva fără să vrei? Cum s-a terminat? Scrie în două-trei rânduri.', rows: 3, answer: 'Răspuns personal.' },
    ],
  },
  {
    details: [
      mc('Unde se varsă Dunărea?', ['în Marea Neagră', 'în Marea Mediterană', 'într-un lac'], 0),
      mc('Cum se numesc insulele plutitoare de stuf?', ['dune', 'plaur', 'faleze'], 1),
      mc('Care dintre acestea NU este un braț al Dunării?', ['Sulina', 'Siret', 'Chilia'], 1),
    ],
    tf: [
      { text: 'În Deltă trăiesc pelicani și lebede.', answer: true },
      { text: 'Vizitatorii au voie să rupă plante.', answer: false },
      { text: 'Localnicii se deplasează mai ales cu bicicleta.', answer: false },
    ],
    order: [],
    shown: [],
    organiser: [
      { text: 'Păsări din Deltă: {_}', answer: 'pelicanul, lebăda, cormoranul' },
      { text: 'Pești din Deltă: {_}', answer: 'știuca, crapul, somnul' },
      { text: 'Reguli pentru vizitatori: {_}', answer: 'fără zgomot lângă cuiburi, fără plante rupte, fără gunoaie' },
    ],
    deeper: [
      mc('Ce concluzie poți trage din text?', ['Delta este un loc bogat în viețuitoare, care trebuie ocrotit.', 'În Deltă nu locuiește nimeni.', 'Delta este un loc bun pentru fabrici.'], 0),
      mc('Ce înseamnă, după text, „rezervație a biosferei”?', ['un loc unde natura este ocrotită prin lege', 'un muzeu cu animale împăiate', 'un oraș mare de lângă mare'], 0),
    ],
    open: [
      { q: 'De ce crezi că vizitatorii nu au voie să facă zgomot lângă cuiburi? Sprijină-ți răspunsul pe text.', rows: 2, answer: 'Pentru că păsările își cresc puii acolo, iar animalele sunt ocrotite prin lege.' },
      { q: 'Ai vizitat un loc în care natura este ocrotită (o rezervație, un parc natural)? Ce ai văzut acolo? Dacă nu, ce ai vrea să vezi în Deltă?', rows: 2, answer: 'Răspuns personal.' },
    ],
  },
];

function lectSheet(n: number): R34Sheet {
  const t = LECT_TEXTS[n - 1];
  const q = LECT_QUESTIONS[n - 1];
  const level: Level34 = n <= 3 ? 'III' : 'IV';
  const r = ruling(level);
  const page2: Block[] = [];
  if (q.order.length) page2.push({ t: 'order', heading: 'Numerotează întâmplările în ordinea în care s-au petrecut (1, 2, 3, 4).', items: q.shown.map((i) => q.order[i]), answer: q.shown.map((i) => i + 1) });
  if (q.organiser) page2.push({ t: 'fill', heading: 'Completează cu informații din text.', items: q.organiser.map((o) => ({ text: o.text, answers: [o.answer] })) });
  page2.push({ t: 'mc', heading: 'Încercuiește litera răspunsului corect.', items: q.deeper });
  for (const o of q.open) page2.push({ t: 'question', heading: o.q, rows: o.rows, ruling: r, answer: o.answer });
  return {
    level,
    pages: [
      {
        title: t.title,
        instruction: 'Citește textul cu atenție, apoi răspunde la întrebări.',
        blocks: [
          { t: 'text', title: t.title, paragraphs: t.paragraphs, size: level === 'III' ? 4.3 : 4.1 },
          { t: 'mc', heading: 'Încercuiește litera răspunsului corect.', items: q.details },
          { t: 'tf', heading: 'Adevărat (A) sau fals (F)? Încercuiește.', items: q.tf },
        ],
      },
      { title: `${t.title} – întrebări`, instruction: `Gândește-te la textul „${t.title}” și răspunde.`, help: 'Poți să te uiți din nou în text.', blocks: page2 },
    ],
  };
}

export function lectText(n: number): ReadingText34 {
  return LECT_TEXTS[n - 1];
}
export function lectQuestions(n: number) {
  return LECT_QUESTIONS[n - 1];
}

// ───────────────────────── Ascultă și răspunde ─────────────────────────

const AUD_QUESTIONS: { details: MC[]; tf: { text: string; answer: boolean }[]; open: { q: string; rows: number; answer: string } }[] = [
  {
    details: [
      mc('Ce animal se pregătea de iarnă?', ['un urs', 'un arici', 'o vulpe'], 1),
      mc('Ce pățise veverița?', ['se rătăcise în pădure', 'vântul îi spulberase cuibul', 'se îmbolnăvise'], 1),
      mc('Cum a dus ariciul alunele?', ['într-un coș', 'înfipte în țepii de pe spate', 'în gură, câte una'], 1),
      mc('Ce înseamnă „spulberase” în poveste?', ['împrăștiase cu putere', 'construise', 'udase'], 0),
    ],
    tf: [
      { text: 'Vizuina ariciului era sub un stejar.', answer: true },
      { text: 'Veverița i-a dăruit ariciului un șal.', answer: true },
      { text: 'Ariciul nu a vrut să o ajute pe veveriță.', answer: false },
    ],
    open: { q: 'Ce ți-a plăcut cel mai mult din poveste?', rows: 3, answer: 'Răspuns personal.' },
  },
  {
    details: [
      mc('De ce privea Victor mereu spre hol?', ['își dorea și el să se plimbe cu bicicleta', 'îi era frig', 'aștepta pe cineva'], 0),
      mc('De ce nu a mai simțit Radu bucuria din primele zile?', ['bicicleta se stricase', 'îi părea rău că nu și-a împărțit bicicleta cu Victor', 'ploua în parc'], 1),
      mc('Ce a găsit Radu în iarbă?', ['o cheie', 'mingea lui Victor', 'o pereche de mănuși'], 1),
      mc('Ce înseamnă în text „s-a prefăcut că nu observă”?', ['s-a purtat ca și cum n-ar fi văzut', 's-a transformat în altcineva', 'a reparat ceva'], 0),
    ],
    tf: [
      { text: 'Bicicleta lui Radu era roșie.', answer: false },
      { text: 'Victor nu avea bicicletă.', answer: true },
      { text: 'Duminică, Radu i-a dus mingea lui Victor.', answer: true },
    ],
    open: { q: 'Ce crezi că i-a răspuns Victor? De ce?', rows: 4, answer: 'Răspuns personal (de exemplu: s-a bucurat și au mers împreună în parc).' },
  },
];

function audSheet(n: number): R34Sheet {
  const t = AUD_TEXTS[n - 1];
  const q = AUD_QUESTIONS[n - 1];
  const level: Level34 = n === 1 ? 'III' : 'IV';
  return {
    level,
    pages: [
      {
        title: `Ascultă: ${t.title}`,
        instruction: 'Ascultă cu atenție povestea citită de învățător, apoi răspunde.',
        help: 'Povestea se citește de două ori. Nu ai textul în față: amintește-ți ce ai auzit.',
        blocks: [
          { t: 'mc', heading: 'Încercuiește litera răspunsului corect.', items: q.details },
          { t: 'tf', heading: 'Adevărat (A) sau fals (F)? Încercuiește.', items: q.tf },
          { t: 'question', heading: q.open.q, rows: q.open.rows, ruling: ruling(level), answer: q.open.answer },
        ],
      },
      {
        teacher: true,
        title: `Pentru cadrul didactic: ${t.title}`,
        instruction: 'Citiți textul cu voce tare, rar și clar, de două ori.',
        help: 'Elevii primesc doar pagina cu întrebări. Răspunsurile sunt pe pagina de răspunsuri.',
        blocks: [{ t: 'text', title: t.title, paragraphs: t.paragraphs, size: 4.6 }],
      },
    ],
  };
}

// ───────────────────────── Părțile de vorbire ─────────────────────────

function partiSheet(n: number): R34Sheet {
  const level: Level34 = n <= 2 ? 'III' : 'IV';
  const r = ruling(level);
  if (n === 1) {
    return {
      level, pages: [{
        title: 'Părțile de vorbire', instruction: 'Citește textul, apoi rezolvă.', help: 'Substantivul numește ființe, lucruri, fenomene; adjectivul arată cum sunt; verbul arată ce fac.',
        blocks: [
          { t: 'text', title: 'În grădină', paragraphs: ['Bunica udă florile parfumate. Un fluture galben zboară deasupra lor. Motanul cel leneș doarme la soare. Eu culeg căpșuni dulci și le pun în coș.'], size: 4.4 },
          {
            t: 'table', heading: 'Scrie fiecare cuvânt din text în coloana potrivită.',
            bank: ['bunica', 'udă', 'parfumate', 'fluture', 'galben', 'zboară', 'motanul', 'leneș', 'doarme', 'căpșuni', 'dulci', 'culeg'],
            columns: ['Substantive', 'Adjective', 'Verbe'],
            answers: [['bunica', 'fluture', 'motanul', 'căpșuni'], ['parfumate', 'galben', 'leneș', 'dulci'], ['udă', 'zboară', 'doarme', 'culeg']], rows: 4,
          },
          {
            t: 'choice', heading: 'Încercuiește pronumele care poate ține locul cuvântului de la începutul propoziției.',
            items: [ch('Bunica udă florile. → {} udă florile.', 'Ea', 'El'), ch('Motanul doarme. → {} doarme.', 'El', 'Ea'), ch('Florile sunt parfumate. → {} sunt parfumate.', 'Ele', 'Ei')],
          },
          {
            t: 'fill', heading: 'Scrie cuvintele la plural (mai multe).',
            items: [{ text: 'o floare → multe {}', answers: ['flori'] }, { text: 'un fluture → mulți {}', answers: ['fluturi'] }, { text: 'o căpșună → multe {}', answers: ['căpșuni'] }, { text: 'un motan → mulți {}', answers: ['motani'] }],
            cols: 2, box: 24,
          },
        ],
        note: 'Programa cere intuirea părților de vorbire, fără definiții: copilul le recunoaște după întrebări (cine? ce? cum este? ce face?).',
      }],
    };
  }
  if (n === 2) {
    return {
      level, pages: [{
        title: 'Părțile de vorbire', instruction: 'Citește textul, apoi rezolvă.', help: 'Verbul ne spune ce face cineva și când: ieri (a trecut), acum (prezent), mâine (va veni).',
        blocks: [
          { t: 'text', title: 'Ziua de sport', paragraphs: ['Ieri am alergat în curtea școlii. Astăzi colegii mei joacă handbal. Mâine vom merge la bazin. Antrenorul nostru este vesel și răbdător.'], size: 4.4 },
          {
            t: 'choice', heading: 'Când se petrece acțiunea? Încercuiește.',
            items: [
              { text: 'Ieri am alergat. → {}', options: ['trecut', 'prezent', 'viitor'], answer: 0 },
              { text: 'Colegii joacă handbal. → {}', options: ['trecut', 'prezent', 'viitor'], answer: 1 },
              { text: 'Vom merge la bazin. → {}', options: ['trecut', 'prezent', 'viitor'], answer: 2 },
            ],
          },
          {
            t: 'choice', heading: 'Încercuiește pronumele potrivit.',
            items: [ch('{} citesc o carte.', 'Eu', 'Ei'), ch('{} alergi foarte repede.', 'Tu', 'Noi'), ch('{} cântăm în cor.', 'Noi', 'Voi'), ch('{} desenează un cal.', 'Ea', 'Eu')],
            cols: 2,
          },
          {
            t: 'choice', heading: 'Încercuiește cuvântul potrivit (un sau o).',
            items: [ch('{} minge', 'o', 'un'), ch('{} fluier', 'un', 'o'), ch('{} echipă', 'o', 'un'), ch('{} antrenor', 'un', 'o')],
            cols: 4,
          },
          {
            t: 'question', heading: 'Scrie două adjective care arată cum este antrenorul, din text.', rows: 1, ruling: r, answer: 'vesel, răbdător',
          },
        ],
      }],
    };
  }
  if (n === 3) {
    return {
      level, pages: [{
        title: 'Părțile de vorbire', instruction: 'Citește textul, apoi rezolvă.', help: 'Pronumele personal ține locul unui substantiv: eu, tu, el, ea, noi, voi, ei, ele.',
        blocks: [
          { t: 'text', title: 'La muzeu', paragraphs: ['Elevii clasei a IV-a au vizitat muzeul satului. Ghidul le-a arătat o casă veche și o moară de vânt. Ei au ascultat atenți poveștile lui. Ioana a fotografiat un covor colorat, iar noi am desenat fântâna cu cumpănă.'], size: 4.3 },
          {
            t: 'table', heading: 'Scrie fiecare cuvânt în coloana potrivită.',
            bank: ['elevii', 'au vizitat', 'veche', 'ei', 'au ascultat', 'atenți', 'covor', 'colorat', 'noi', 'am desenat', 'fântâna', 'ghidul'],
            columns: ['Substantive', 'Adjective', 'Pronume', 'Verbe'],
            answers: [['elevii', 'covor', 'fântâna', 'ghidul'], ['veche', 'atenți', 'colorat'], ['ei', 'noi'], ['au vizitat', 'au ascultat', 'am desenat']], rows: 4,
          },
          {
            t: 'fill', heading: 'Găsește greșeala de acord și scrie propoziția corect.',
            items: [
              { text: 'Copiii merge la muzeu.  {_}', answers: ['Copiii merg la muzeu.'] },
              { text: 'Moara este veche și frumoși.  {_}', answers: ['Moara este veche și frumoasă.'] },
              { text: 'Noi a ascultat poveștile.  {_}', answers: ['Noi am ascultat poveștile.'] },
            ],
          },
          {
            t: 'choice', heading: 'Ce parte de vorbire este cuvântul dintre ghilimele? Încercuiește.',
            items: [
              { text: '„colorat” din „un covor colorat”: {}', options: ['adjectiv', 'verb', 'substantiv'], answer: 0 },
              { text: '„moară” din „o moară de vânt”: {}', options: ['adjectiv', 'verb', 'substantiv'], answer: 2 },
            ],
          },
        ],
        note: 'Ultimele exerciții cer corectarea unor greșeli de acord (programa, IV 3.5: „Sesizarea abaterilor din textele citite în vederea corectării acestora”).',
      }],
    };
  }
  return {
    level, pages: [{
      title: 'Subiectul și predicatul', instruction: 'Citește propozițiile, apoi rezolvă.', help: 'Predicatul spune ce face cineva (verbul). Subiectul arată cine face acțiunea.',
      blocks: [
        {
          t: 'choice', heading: 'Încercuiește subiectul (cine face acțiunea?).',
          items: [
            { text: '„Păsările zboară spre sud.” → {}', options: ['Păsările', 'zboară', 'sud'], answer: 0 },
            { text: '„Mihai citește o poveste.” → {}', options: ['citește', 'Mihai', 'poveste'], answer: 1 },
            { text: '„Soarele strălucește pe cer.” → {}', options: ['strălucește', 'cer', 'Soarele'], answer: 2 },
          ],
        },
        {
          t: 'choice', heading: 'Încercuiește predicatul (ce face?).',
          items: [
            { text: '„Bunicul repară gardul.” → {}', options: ['Bunicul', 'repară', 'gardul'], answer: 1 },
            { text: '„Copiii au construit un om de zăpadă.” → {}', options: ['au construit', 'Copiii', 'zăpadă'], answer: 0 },
          ],
        },
        {
          t: 'fill', heading: 'Găsește greșeala de acord și scrie propoziția corect.',
          items: [
            { text: 'Florile din vază s-a ofilit.  {_}', answers: ['Florile din vază s-au ofilit.'] },
            { text: 'Tu cântă foarte frumos.  {_}', answers: ['Tu cânți foarte frumos.'] },
            { text: 'Câinele vecinilor latră toți.  {_}', answers: ['Câinii vecinilor latră toți.'] },
          ],
        },
        {
          t: 'fill', heading: 'Scrie verbul la timpul cerut.',
          items: [
            { text: 'Eu citesc. (viitor) → Eu {_}', answers: ['voi citi'] },
            { text: 'Noi alergăm. (trecut) → Noi {_}', answers: ['am alergat'] },
          ],
        },
        { t: 'question', heading: 'Scrie o propoziție în care subiectul este „prietenul meu”, iar predicatul „a câștigat”.', rows: 1, ruling: r, answer: 'De exemplu: Prietenul meu a câștigat concursul.' },
      ],
      note: 'Corectarea greșelilor de acord: programa, IV 3.5 „Sesizarea abaterilor din textele citite în vederea corectării acestora”.',
    }],
  };
}

// ───────────────────────── Ortograme ─────────────────────────

/** The orthogram sets: each choice has one form that fits (see the file note). */
function ortoSheet(n: number): R34Sheet {
  const level: Level34 = n <= 2 ? 'III' : 'IV';
  if (n === 1) {
    return {
      level, pages: [{
        title: 'Ortograme: s-a, sa, s-au, sau, i-a, ia, i-au, iau', instruction: 'Încercuiește forma corectă.',
        help: 's-a, s-au, i-a, i-au: urmează un verb care arată acțiunea (s-a dus, i-a dat). sa = a sa; sau = ori; ia, iau = a lua.',
        blocks: [
          {
            t: 'choice', heading: 's-a sau sa? s-au sau sau?',
            items: [
              ch('Mama {} dus la piață.', 's-a', 'sa'), ch('Ana își caută cartea {}.', 'sa', 's-a'), ch('Bunicul {} bucurat de vizită.', 's-a', 'sa'),
              ch('Copiii {} jucat în parc.', 's-au', 'sau'), ch('Vrei mere {} pere?', 'sau', 's-au'), ch('Frunzele {} îngălbenit.', 's-au', 'sau'),
            ],
            cols: 2,
          },
          {
            t: 'choice', heading: 'i-a sau ia? i-au sau iau?',
            items: [
              ch('Bunica {} dat o carte nepotului.', 'i-a', 'ia'), ch('Tata {} umbrela din cuier.', 'ia', 'i-a'), ch('Doamna învățătoare {} lăudat desenul.', 'i-a', 'ia'),
              ch('Eu {} trenul de la gară.', 'iau', 'i-au'), ch('Colegii {} trimis o felicitare.', 'i-au', 'iau'), ch('Mâine {} o carte de la bibliotecă.', 'iau', 'i-au'),
            ],
            cols: 2,
          },
          {
            t: 'fill', heading: 'Completează propozițiile cu „s-a” sau „sa”, „i-a” sau „ia”.',
            items: [
              { text: 'Pisica {} ascuns sub pat.', answers: ['s-a'] },
              { text: 'Maria {} un măr din coș.', answers: ['ia'] },
              { text: 'Prietenul meu și-a adus mingea {}.', answers: ['sa'] },
              { text: 'Mama {} cumpărat Ioanei o rochie.', answers: ['i-a'] },
            ],
            cols: 2, box: 13,
          },
        ],
      }],
    };
  }
  if (n === 2) {
    return {
      level, pages: [{
        title: 'Ortograme: l-a, la, v-a, va, ce-a, cea, ce-i, cei', instruction: 'Încercuiește forma corectă.',
        help: 'l-a, v-a: urmează un verb (l-a chemat, v-a ajutat). la = locul (la școală); va = va veni. cea, cei: cea mai, cei doi.',
        blocks: [
          {
            t: 'choice', heading: 'l-a sau la? v-a sau va?',
            items: [
              ch('Merg {} școală în fiecare dimineață.', 'la', 'l-a'), ch('Mama {} chemat acasă.', 'l-a', 'la'), ch('Câinele {} urmat până la poartă.', 'l-a', 'la'),
              ch('Mâine {} ploua toată ziua.', 'va', 'v-a'), ch('Cine {} ajutat la teme?', 'v-a', 'va'), ch('Trenul {} pleca la ora opt.', 'va', 'v-a'),
            ],
            cols: 2,
          },
          {
            t: 'choice', heading: 'ce-a sau cea? ce-i sau cei?',
            items: [
              ch('Ea este {} mai bună prietenă a mea.', 'cea', 'ce-a'), ch('Nu știu {} spus doamna.', 'ce-a', 'cea'), ch('{} doi frați s-au împăcat.', 'Cei', 'Ce-i'),
              ch('Spune-mi {} trebuie pentru drum.', 'ce-i', 'cei'), ch('Am ales rochia {} albastră.', 'cea', 'ce-a'), ch('{} mai mici copii stau în față.', 'Cei', 'Ce-i'),
            ],
            cols: 2,
          },
          {
            t: 'fill', heading: 'Completează cu „l-a” sau „la”, „v-a” sau „va”.',
            items: [
              { text: 'Bunicul {} dus pe Andrei {} pescuit.', answers: ['l-a', 'la'] },
              { text: 'Cine {} spus că mâine {} ninge?', answers: ['v-a', 'va'] },
            ],
            box: 13,
          },
        ],
      }],
    };
  }
  if (n === 3) {
    return {
      level, pages: [{
        title: 'Ortograme: găsește și corectează', instruction: 'Încercuiește forma corectă, apoi corectează greșelile.',
        help: 'Cratima arată că două cuvinte se rostesc împreună: s-a (se + a), i-au (îi + au), l-a (îl + a).',
        blocks: [
          {
            t: 'choice', heading: 'Încercuiește forma corectă.',
            items: [
              ch('Vântul {} oprit spre seară.', 's-a', 'sa'), ch('Ei {} întors târziu de la munte.', 's-au', 'sau'), ch('Poți veni azi {} mâine.', 'sau', 's-au'),
              ch('Prietenii {} adus flori bunicii.', 'i-au', 'iau'), ch('Eu {} cu mine o sticlă cu apă.', 'iau', 'i-au'), ch('Pescarul {} prins un crap mare.', 'a', 'l-a'),
            ],
            cols: 2,
          },
          {
            t: 'fill', heading: 'Fiecare propoziție are o greșeală. Scrie corect cuvântul greșit.',
            items: [
              { text: 'Sa făcut frig afară. → {}', answers: ['S-a'] },
              { text: 'Copiii sau speriat de tunet. → {}', answers: ['s-au'] },
              { text: 'Tata ia cumpărat Mariei o carte. → {}', answers: ['i-a'] },
              { text: 'Eu i-au o pâine de la brutărie. → {}', answers: ['iau'] },
              { text: 'Mama la trimis pe Dan după lapte. → {}', answers: ['l-a'] },
              { text: 'Cine va învățat jocul acesta? → {}', answers: ['v-a'] },
            ],
            cols: 2, box: 15,
          },
          {
            t: 'question', heading: 'Scrie o propoziție cu „s-au” și una cu „sau”.', rows: 2, ruling: 'dictando',
            answer: 'De exemplu: Elevii s-au întors din excursie. Vrei ceai sau lapte?',
          },
        ],
        note: 'IV 4.1 „Recunoașterea și remedierea greșelilor de ortografie și de punctuație în redactarea de text”.',
      }],
    };
  }
  return {
    level, pages: [{
      title: 'Ortograme: s-ar, sar, n-ai, nai, ne-am, neam', instruction: 'Încercuiește forma corectă, apoi corectează greșelile.',
      help: 's-ar putea, n-ai venit, ne-am jucat: cu cratimă. sar = a sări; naiul = un instrument; neamul = rudele.',
      blocks: [
        {
          t: 'choice', heading: 'Încercuiește forma corectă.',
          items: [
            ch('Copiii {} coarda în curte.', 'sar', 's-ar'), ch('{} putea să plouă diseară.', 'S-ar', 'Sar'), ch('Ciobanul cântă la {}.', 'nai', 'n-ai'),
            ch('De ce {} venit la film?', 'n-ai', 'nai'), ch('Ieri {} jucat fotbal.', 'ne-am', 'neam'), ch('Noi doi suntem din același {}.', 'neam', 'ne-am'),
          ],
          cols: 2,
        },
        {
          t: 'fill', heading: 'Fiecare propoziție are o greșeală. Scrie corect cuvântul greșit.',
          items: [
            { text: 'Neam întâlnit în parc. → {}', answers: ['Ne-am'] },
            { text: 'Nai uitat cheile? → {}', answers: ['N-ai'] },
            { text: 'Iepurii s-ar peste gard. → {}', answers: ['sar'] },
            { text: 'Sar bucura să te vadă. → {}', answers: ['S-ar'] },
          ],
          cols: 2, box: 15,
        },
        {
          t: 'fill', heading: 'Completează cu forma potrivită: s-a / sa, s-au / sau, ne-am / neam.',
          items: [
            { text: 'Ioana și-a pierdut agenda {}.', answers: ['sa'] },
            { text: 'Noi {} întors acasă înainte de ploaie.', answers: ['ne-am'] },
            { text: 'Elevii {} pregătit pentru serbare.', answers: ['s-au'] },
          ],
          box: 15,
        },
      ],
      note: 'IV 4.1 „Recunoașterea și remedierea greșelilor de ortografie și de punctuație în redactarea de text”.',
    }],
  };
}

// ───────────────────────── Semnele de punctuație ─────────────────────────

function punctSheet(n: number): R34Sheet {
  if (n === 1) {
    return {
      level: 'III', pages: [{
        title: 'Semnele de punctuație', instruction: 'Pune semnul potrivit în căsuță.', help: 'Punctul (.) încheie o propoziție; semnul întrebării (?) o întrebare; semnul exclamării (!) o mirare, o bucurie, un îndemn.',
        blocks: [
          {
            t: 'fill', heading: 'Ce semn pui la sfârșit: punct, semnul întrebării sau semnul exclamării?',
            items: [
              { text: 'Unde ai pus caietul de matematică {}', answers: ['?'] }, { text: 'Ce zi frumoasă {}', answers: ['!'] },
              { text: 'Mâine mergem la muzeul satului {}', answers: ['.'] }, { text: 'Cine a câștigat concursul {}', answers: ['?'] },
              { text: 'Bravo, ai reușit {}', answers: ['!'] }, { text: 'Pisica doarme pe pervaz {}', answers: ['.'] },
            ],
            cols: 2, box: 8,
          },
          {
            t: 'fill', heading: 'Pune virgulele și cele două puncte unde trebuie.',
            items: [
              { text: 'În coș am pus mere {} pere {} prune și struguri.', answers: [',', ','] },
              { text: 'La picnic am luat de toate {} sandvișuri, apă și fructe.', answers: [':'] },
              { text: 'Andrei {} vino repede aici!', answers: [','] },
            ],
            box: 8,
          },
          {
            t: 'write', heading: 'Scrie dialogul pe rânduri, cu linia de dialog și semnele potrivite.',
            prompts: ['Mama a întrebat Ce ai învățat azi la școală Am învățat despre albine a răspuns Ana'],
            rows: 4, ruling: 'II',
            answer: 'Mama a întrebat: / — Ce ai învățat azi la școală? / — Am învățat despre albine, a răspuns Ana.',
          },
        ],
        note: 'III 4.1 „Aplicarea regulilor de despărțire în silabe la capăt de rând, de ortografie și de punctuație în redactarea de text”.',
      }],
    };
  }
  return {
    level: 'IV', pages: [{
      title: 'Semnele de punctuație', instruction: 'Pune semnele care lipsesc și corectează greșelile.', help: 'Linia de dialog arată că vorbește cineva. Cele două puncte anunță o vorbire sau o enumerare.',
      blocks: [
        {
          t: 'fill', heading: 'Pune semnele de punctuație în căsuțe.',
          items: [
            { text: 'Doamna învățătoare ne-a spus {}', answers: [':'] },
            { text: '{} Mâine vom planta copaci în curtea școlii {}', answers: ['—', '.'] },
            { text: '{} Putem aduce și flori {} a întrebat Matei.', answers: ['—', '?'] },
            { text: 'În grădină cresc lalele {} narcise {} zambile și bujori.', answers: [',', ','] },
          ],
          box: 8,
        },
        {
          t: 'fill', heading: 'Fiecare propoziție are o greșeală de punctuație. Scrie propoziția corect.',
          items: [
            { text: 'Ce frumos cântă privighetoarea.  {_}', answers: ['Ce frumos cântă privighetoarea!'] },
            { text: 'Unde mergem în excursie!  {_}', answers: ['Unde mergem în excursie?'] },
            { text: 'Ionel vino la masă!  {_}', answers: ['Ionel, vino la masă!'] },
          ],
        },
        {
          t: 'write', heading: 'Scrie dialogul corect, pe rânduri, cu linia de dialog și semnele de punctuație.',
          prompts: ['Bunicul l-a întrebat pe Vlad Ți-a plăcut cartea pe care ți-am dăruit-o Foarte mult Am citit-o în două zile a spus Vlad'],
          rows: 5, ruling: 'dictando',
          answer: 'Bunicul l-a întrebat pe Vlad: / — Ți-a plăcut cartea pe care ți-am dăruit-o? / — Foarte mult! Am citit-o în două zile, a spus Vlad.',
        },
      ],
      note: 'IV 4.1 „Recunoașterea și remedierea greșelilor de ortografie și de punctuație în redactarea de text”.',
    }],
  };
}

// ───────────────────────── Vocabular ─────────────────────────

function vocSheet(n: number): R34Sheet {
  const level: Level34 = n === 1 ? 'III' : 'IV';
  const r = ruling(level);
  if (n === 1) {
    return {
      level, pages: [{
        title: 'Cuvinte cu înțeles asemănător sau opus', instruction: 'Citește și rezolvă.', help: 'Sinonime: au înțeles asemănător (frumos – chipeș). Antonime: au înțeles opus (cald – rece).',
        blocks: [
          {
            t: 'choice', heading: 'Încercuiește cuvântul cu înțeles asemănător.',
            items: [
              { text: 'harnic → {}', options: ['leneș', 'muncitor', 'vesel'], answer: 1 }, { text: 'a privi → {}', options: ['a se uita', 'a alerga', 'a auzi'], answer: 0 },
              { text: 'casă → {}', options: ['locuință', 'grădină', 'stradă'], answer: 0 }, { text: 'iute → {}', options: ['încet', 'repede', 'greu'], answer: 1 },
            ],
          },
          {
            t: 'fill', heading: 'Scrie cuvântul cu înțeles opus.',
            items: [
              { text: 'mare ≠ {}', answers: ['mic'] }, { text: 'cald ≠ {}', answers: ['rece'] }, { text: 'zi ≠ {}', answers: ['noapte'] },
              { text: 'a urca ≠ {}', answers: ['a coborî'] }, { text: 'vesel ≠ {}', answers: ['trist'] }, { text: 'aproape ≠ {}', answers: ['departe'] },
            ],
            cols: 3, box: 22,
          },
          {
            t: 'choice', heading: 'Același cuvânt, înțelesuri diferite. Ce înseamnă cuvântul în propoziție?',
            items: [
              { text: '„Am închis broasca ușii.” → {}', options: ['animalul', 'încuietoarea'], answer: 1 },
              { text: '„Broasca sare în lac.” → {}', options: ['animalul', 'încuietoarea'], answer: 0 },
              { text: '„Am cules un corn copt.” → {}', options: ['fructul', 'cornul animalului'], answer: 0 },
            ],
          },
          { t: 'question', heading: 'Scrie o propoziție cu un cuvânt și sinonimul lui (de exemplu: „frumos” și „minunat”).', rows: 1, ruling: r, answer: 'Răspuns personal.' },
        ],
        note: 'Programa nu numește sinonimele, antonimele și omonimele printre competențele specifice: fișa nu tipărește un cod.',
      }],
    };
  }
  return {
    level, pages: [{
      title: 'Sinonime, antonime, omonime', instruction: 'Citește și rezolvă.', help: 'Omonimele se scriu și se pronunță la fel, dar au înțelesuri diferite (lac – apă; lac – vopsea).',
      blocks: [
        {
          t: 'fill', heading: 'Înlocuiește cuvântul din paranteză cu un sinonim potrivit.',
          items: [
            { text: 'Dan a (sosit) {} primul.', answers: ['ajuns, venit'] }, { text: 'Era o zi (geroasă) {}.', answers: ['friguroasă, rece'] },
            { text: 'Copiii erau (bucuroși) {}.', answers: ['veseli, fericiți'] }, { text: 'Bunica (spune) {} o poveste.', answers: ['povestește, istorisește'] },
          ],
          cols: 2, box: 24,
        },
        {
          t: 'fill', heading: 'Scrie un cuvânt cu înțeles opus, ca propoziția să spună contrariul.',
          items: [
            { text: 'Drumul este lung. → Drumul este {}.', answers: ['scurt'] }, { text: 'Magazinul s-a închis. → Magazinul s-a {}.', answers: ['deschis'] },
            { text: 'Ana a câștigat. → Ana a {}.', answers: ['pierdut'] },
          ],
          box: 22,
        },
        {
          t: 'choice', heading: 'Ce înseamnă cuvântul în propoziție?',
          items: [
            { text: '„Pe lac plutesc rațe.” → lac: {}', options: ['întindere de apă', 'vopsea lucioasă'], answer: 0 },
            { text: '„Tata a dat cu lac pe masă.” → lac: {}', options: ['întindere de apă', 'vopsea lucioasă'], answer: 1 },
            { text: '„Leul a răcnit în cușcă.” → leu: {}', options: ['animalul', 'banul românesc'], answer: 0 },
            { text: '„Pâinea costă patru lei.” → lei: {}', options: ['animalele', 'banii românești'], answer: 1 },
          ],
        },
        { t: 'question', heading: 'Scrie două propoziții în care cuvântul „bancă” are înțelesuri diferite.', rows: 2, ruling: r, answer: 'De exemplu: Stăm pe o bancă în parc. Părinții au mers la bancă.' },
      ],
      note: 'Programa nu numește sinonimele, antonimele și omonimele printre competențele specifice: fișa nu tipărește un cod.',
    }],
  };
}

// ───────────────────────── Compunere ─────────────────────────

function compSheet(n: number): R34Sheet {
  const level: Level34 = n <= 2 ? 'III' : 'IV';
  const r = ruling(level);
  const base = (title: string, instruction: string, help: string, plan: string[], words: string, note?: string): R34Sheet => ({
    level,
    pages: [{
      title, instruction, help,
      blocks: [
        { t: 'write', heading: 'Planul compunerii', prompts: plan, rows: 0, ruling: r },
        { t: 'write', heading: words, rows: 'fill', ruling: r },
      ],
      ...(note ? { note } : {}),
    }],
  });
  if (n === 1) {
    return base(
      'Compunere: o întâmplare din vacanță', 'Povestește pe scurt o întâmplare pe care ai trăit-o în vacanță.', 'Dă-i un titlu potrivit și scrie-l pe primul rând, la mijloc.',
      ['Început: Când și unde s-a petrecut întâmplarea? Cine a fost acolo?', 'Cuprins: Ce s-a întâmplat? Care a fost momentul cel mai interesant?', 'Încheiere: Cum s-a terminat? Ce ai simțit?'],
      'Scrie compunerea. Cuvinte care te ajută: într-o zi, deodată, apoi, după aceea, în cele din urmă.',
      'III 4.4 „Povestirea pe scurt a unei întâmplări imaginate/ trăite”.',
    );
  }
  if (n === 2) {
    return base(
      'Compunere: descrierea animalului preferat', 'Descrie animalul tău preferat (sau un obiect drag din camera ta).', 'Răspunde pe rând la întrebări: așa obții o descriere.',
      ['Cum se numește? Unde trăiește?', 'Cum arată: ce mărime are, ce culoare, cum îi este blana sau pielea?', 'Ce face? Ce îi place?', 'De ce îți place ție?'],
      'Scrie descrierea. Adjective care te ajută: jucăuș, pufos, ager, blând, mare, mic, vesel, curios.',
      'III 4.3 „Realizarea unei scurte descrieri ale unor elemente din mediul apropiat pornind de la întrebări de sprijin”.',
    );
  }
  if (n === 3) {
    return base(
      'Compunere: portretul unui personaj', 'Alcătuiește portretul unui personaj dintr-o carte sau dintr-un film.', 'Folosește planul. Pentru trăsăturile morale, dă un exemplu din faptele personajului.',
      ['1. Prezentare: Cum se numește personajul? Din ce carte sau film este?', '2. Trăsături fizice: Cum arată (chip, statură, îmbrăcăminte)?', '3. Trăsături morale: Cum este (curajos, bun, isteț…)? Ce faptă o dovedește?', '4. Încheiere: Ce părere ai despre el? De ce?'],
      'Scrie portretul. Dă-i un titlu.',
      'IV 4.3 „Redactarea unei descrieri tip portret pe baza unui plan simplu”.',
    );
  }
  return base(
    'Compunere: o poveste cu început dat', 'Continuă povestea care începe așa: „Când am deschis cutia găsită în pod, din ea a ieșit…”', 'Imaginează-ți ce urmează. Scrie pe scurt, cu început, cuprins și încheiere.',
    ['Început: Ce ai găsit în cutie? Cum ai reacționat?', 'Cuprins: Ce întâmplare a urmat? Cine te-a ajutat?', 'Încheiere: Cum s-a terminat povestea? Ce ai învățat?'],
    'Scrie povestirea. Folosește cel puțin o dată dialogul (linia de dialog).',
    'IV 4.4 „Povestirea pe scurt a unei secvențe dintr-o poveste/ dintr-un film/ desen animat / a unei activități/ a unei întâmplări imaginate/trăite”.',
  );
}

// ───────────────────────── Texte funcționale ─────────────────────────

/** A form drawn as a card: labelled lines to write on, and a box to draw in. */
export interface FormField { label: string; lines: number }
export interface FuncForm { title: string; fields: FormField[]; draw?: string; layout: 'invitation' | 'poster' | 'letter' | 'notice' }

export const FUNC_FORMS: FuncForm[][] = [
  [{
    title: 'Invitație', layout: 'invitation', draw: 'Desenează ceva potrivit pentru petrecere (baloane, tort, cadouri).',
    fields: [{ label: 'Dragă', lines: 1 }, { label: 'Te invit la', lines: 2 }, { label: 'Data și ora:', lines: 1 }, { label: 'Locul:', lines: 1 }, { label: 'Te aștept cu drag!', lines: 0 }, { label: 'Semnătura:', lines: 1 }],
  }],
  [{
    title: 'Afiș', layout: 'poster', draw: 'Desenul afișului: să se vadă de departe despre ce este vorba.',
    fields: [{ label: 'Titlul (mare, ușor de citit):', lines: 1 }, { label: 'Ce eveniment este?', lines: 1 }, { label: 'Unde?', lines: 1 }, { label: 'Când (data și ora)?', lines: 1 }, { label: 'Cine organizează?', lines: 1 }],
  }],
  [{
    title: 'Scrisoare', layout: 'letter',
    fields: [{ label: 'Localitatea și data (sus, în dreapta):', lines: 1 }, { label: 'Formula de adresare (Dragă…,):', lines: 1 }, { label: 'Cuprinsul scrisorii:', lines: 15 }, { label: 'Formula de încheiere (Cu drag,):', lines: 1 }, { label: 'Semnătura:', lines: 1 }],
  }],
  [
    { title: 'Anunț', layout: 'notice', fields: [{ label: 'Titlul anunțului:', lines: 1 }, { label: 'Ce anunți?', lines: 3 }, { label: 'Cum poți fi găsit (unde, telefon):', lines: 1 }] },
    { title: 'Bilet', layout: 'notice', fields: [{ label: 'Către:', lines: 1 }, { label: 'Mesajul:', lines: 3 }, { label: 'Ora și semnătura:', lines: 1 }] },
  ],
];

function funcSheet(n: number): R34Sheet {
  const level: Level34 = n <= 2 ? 'III' : 'IV';
  const texts: [string, string, string, string][] = [
    ['Invitația', 'Scrie o invitație la ziua ta pentru un prieten. Completează fiecare parte.', 'O invitație spune: pe cine inviți, la ce, când și unde. Poți adăuga un desen.', 'III 4.2 „Redactarea unor texte funcționale simple care conțin limbaj vizual și verbal” (textul și desenul).'],
    ['Afișul', 'Fă un afiș pentru expoziția de desene a clasei tale.', 'Un afiș are un titlu mare, puțin text și un desen care atrage privirea.', 'III 4.2 „Redactarea unor texte funcționale simple care conțin limbaj vizual și verbal”.'],
    ['Scrisoarea', 'Scrie o scrisoare unui prieten sau unei rude care locuiește în alt oraș. Povestește-i ce ai mai făcut.', 'Nu uita: localitatea și data, formula de adresare, cuprinsul, formula de încheiere, semnătura.', 'IV 4.2 „Redactarea unor texte funcționale scurte pe suport de hârtie sau digital”.'],
    ['Anunțul și biletul', 'Scrie un anunț (de exemplu: ai găsit o minge în parc) și un bilet pentru părinți.', 'Anunțul este scurt și clar. Biletul spune cui scrii, ce vrei să afle și cine îl scrie.', 'IV 4.2 „Redactarea unor texte funcționale scurte pe suport de hârtie sau digital”.'],
  ];
  const [title, instruction, help, note] = texts[n - 1];
  return {
    level,
    pages: [{ title, instruction, help, note, blocks: FUNC_FORMS[n - 1].map((f) => ({ t: 'draw' as const, heading: f.title, height: 0, answers: [], draw: () => undefined })) }],
  };
}

// ───────────────────────── Dictare ─────────────────────────

/** A dictation sentence: the text, with [brackets] around the words left blank on the pupil's page. */
export const DICT_SETS: { level: Level34; sentences: string[]; full: string[] }[] = [
  {
    level: 'III',
    sentences: [
      'Afară [s-a] pornit o ploaie [rece] de toamnă.',
      '[Cireșele] din grădina bunicii sunt [coapte].',
      'Copiii [s-au] adunat lângă [fântână].',
      'Mâine [iau] cu mine o [ghindă] pentru colecție.',
      'Ce [frumos] [cântă] privighetoarea!',
      'Mama [i-a] cumpărat Ioanei un [ghiozdan] nou.',
    ],
    full: ['Pe câmp se văd flori de mușețel.', 'Vântul a scuturat frunzele ruginii.'],
  },
  {
    level: 'IV',
    sentences: [
      'În excursie am văzut un [cerb] lângă [izvor].',
      'Elevii [s-au] pregătit pentru [serbarea] de Crăciun.',
      'Bunicul [ne-a] povestit despre [neamul] nostru.',
      '— [Cine] [v-a] ajutat la proiect? a întrebat doamna.',
      'Pe masă erau [ghiocei], zambile și [lăcrămioare].',
      'Dacă vremea [ar] fi frumoasă, [ne-am] juca afară.',
    ],
    full: ['Toamna, păsările călătoare pleacă spre țările calde.', 'Ne-am bucurat când am primit diplomele.'],
  },
];

/** A dictation sentence on the pupil's page: the bracketed words as gaps. */
export const dictGapped = (s: string) => s.replace(/\[[^\]]+\]/g, '{_}');
export const dictWords = (s: string) => [...s.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
export const dictPlain = (s: string) => s.replace(/\[|\]/g, '');

function dictSheet(n: number): R34Sheet {
  const set = DICT_SETS[n - 1];
  const r = ruling(set.level);
  return {
    level: set.level,
    pages: [{
      title: 'Dictare', instruction: 'Ascultă propozițiile și completează cuvintele care lipsesc.', help: 'Învățătorul citește fiecare propoziție întreagă de două ori. Atenție la cratimă și la â, î!',
      blocks: [
        { t: 'fill', heading: 'Completează cuvintele dictate.', items: set.sentences.map((s) => ({ text: dictGapped(s), answers: [dictWords(s).join(', ')] })) },
        { t: 'write', heading: 'Scrie propozițiile dictate.', rows: 'fill', ruling: r, answer: `Propozițiile dictate: ${set.full.join(' ')}` },
      ],
      note: `Textul dictării este pe pagina de răspunsuri. ${set.level === 'III' ? 'III 4.1 „Aplicarea regulilor … de ortografie și de punctuație în redactarea de text”.' : 'IV 4.1 „Recunoașterea și remedierea greșelilor de ortografie și de punctuație…”.'}`,
    }],
  };
}

// ───────────────────────── Fișa de lectură ─────────────────────────

function carteSheet(n: number): R34Sheet {
  const level: Level34 = n === 1 ? 'III' : 'IV';
  const r = ruling(level);
  if (n === 1) {
    return {
      level, pages: [{
        title: 'Fișa cărții citite', instruction: 'Completează fișa după ce ai terminat de citit o carte.', help: 'Păstrează fișele în portofoliu: la sfârșitul anului vei vedea câte cărți ai citit.',
        blocks: [
          { t: 'fill', heading: 'Despre carte', items: [{ text: 'Titlul: {_}', answers: [''] }, { text: 'Autorul: {_}', answers: [''] }, { text: 'Personajele principale: {_}', answers: [''] }, { text: 'Unde și când se petrece: {_}', answers: [''] }] },
          { t: 'question', heading: 'Ce mi-a plăcut cel mai mult:', rows: 2, ruling: r, answer: '' },
          { t: 'choice', heading: 'Recomanzi cartea unui coleg?', items: [{ text: 'Da sau nu? {}', options: ['DA', 'NU'], answer: 0 }] },
          { t: 'question', heading: 'De ce?', rows: 1, ruling: r, answer: '' },
          { t: 'draw', heading: 'Desenează coperta cărții sau scena preferată. Colorează câte stele îi dai (1–5).', height: 40, answers: [], draw: () => undefined },
        ],
        note: 'III 3.6 „Aprecierea valorii cărților”.',
      }],
    };
  }
  return {
    level, pages: [{
      title: 'Jurnal de lectură', instruction: 'Notează ce citești în fiecare zi, timp de o săptămână.', help: 'Poți citi povești, poezii, reviste pentru copii sau texte despre natură, istorie, științe.',
      blocks: [
        { t: 'draw', heading: 'Jurnalul săptămânii', height: 92, answers: [], draw: () => undefined },
        { t: 'question', heading: 'Ce am aflat nou din lecturile mele:', rows: 2, ruling: r, answer: '' },
        { t: 'question', heading: 'Ce carte aș recomanda și de ce:', rows: 2, ruling: r, answer: '' },
      ],
      note: 'IV 3.6 „Manifestarea interesului pentru lectura literară și de informare”.',
    }],
  };
}

// ───────────────────────── every sheet ─────────────────────────

export function r34Sheet(item: string): R34Sheet {
  const [kind, n] = r34Parts(item);
  switch (kind) {
    case 'lect': return lectSheet(n);
    case 'aud': return audSheet(n);
    case 'parti': return partiSheet(n);
    case 'orto': return ortoSheet(n);
    case 'punct': return punctSheet(n);
    case 'voc': return vocSheet(n);
    case 'comp': return compSheet(n);
    case 'func': return funcSheet(n);
    case 'dict': return dictSheet(n);
    case 'carte': return carteSheet(n);
  }
}
