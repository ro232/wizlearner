/**
 * „Citire și scriere”: the words, phrases, sentences and short texts of the reading and writing
 * sheets (see reading-pages.ts), written out by hand — none is generated, none is taken from a
 * textbook. The texts of „Citește și răspunde” are original.
 *
 * Items are "read:<kind>:<set>", six sets of each kind. Every set is meant for one class
 * (READING_LEVELS): clasa pregătitoare reads short words of one or two syllables, in capitals by
 * default (the sheet follows the letter mode), without diphthongs, hiatus or the groups ce, ci, ge,
 * gi, che, chi, ghe, ghi (CLR CP, contents: „Cuvinte alcătuite din una, două sau trei silabe, care nu
 * conțin diftongi, triftongi sau consoane redate în scris prin grupurile de litere…”); clasa I reads
 * small letters, the letter groups and diphthongs, short sentences („Citirea textelor scurte (de
 * maxim 75 de cuvinte)”); clasa a II-a longer words, sentences and texts („Textul (de maxim 120 de
 * cuvinte)”). The curriculum code is printed only for the class of the set (curriculum/sheet.ts).
 *
 * Every item has exactly one right answer:
 * - the pictures are the curated ones of the sounds-and-syllables sheets (one usual name each);
 * - a missing letter is the letter of the pictured word; no other option makes another name of the
 *   picture (never „a” for a final „ă”: „luna” is the moon too; never „î” for „â”);
 * - a sentence to complete has one option that fits; the others are plainly wrong in meaning
 *   (checked against double meanings: „a găti o masă”, „a stinge lumina”);
 * - a sentence to put in order starts with its only capital and ends with its only full stop, and
 *   no other order of the middle words is a Romanian sentence;
 * - a question about a text is answered word for word in the text, and only one option is.
 *
 * Correct Romanian with ș ț (comma below) and ă â î; see src/lib/__tests__/reading.test.ts.
 */

export type ReadKind = 'match' | 'gap' | 'draw' | 'fill' | 'order' | 'copy' | 'text';
export type ReadLevel = 'CP' | 'I' | 'II';

export const READ_KINDS: ReadKind[] = ['match', 'gap', 'draw', 'fill', 'order', 'copy', 'text'];
export const READ_SETS = 6;

/** The class each set is written for, set 1 first. */
export const READING_LEVELS: Record<ReadKind, ReadLevel[]> = {
  match: ['CP', 'CP', 'CP', 'I', 'I', 'I'],
  gap: ['CP', 'CP', 'I', 'I', 'II', 'II'],
  draw: ['CP', 'CP', 'CP', 'I', 'I', 'I'],
  fill: ['I', 'I', 'I', 'II', 'II', 'II'],
  order: ['I', 'I', 'I', 'II', 'II', 'II'],
  copy: ['CP', 'CP', 'I', 'I', 'II', 'II'],
  text: ['I', 'I', 'I', 'II', 'II', 'II'],
};

const READING_ITEM = /^read:(match|gap|draw|fill|order|copy|text):[1-6]$/;

export function isReadingItem(item: string): boolean {
  return READING_ITEM.test(item);
}

/** "read:gap:3" → ['gap', 3]. */
export function readingParts(item: string): [ReadKind, number] {
  const [, kind, n] = item.split(':');
  return [kind as ReadKind, Number(n)];
}

/** The class a reading item is written for (null for anything else). */
export function readingSetLevel(item: string): ReadLevel | null {
  if (!isReadingItem(item)) return null;
  const [kind, n] = readingParts(item);
  return READING_LEVELS[kind][n - 1];
}

// ───────────────────────── pictures ─────────────────────────

/** The picture (Twemoji key in src/lib/hints/icons.json) of every word the sheets show with one. */
export const READ_PICTURES: Record<string, string> = {
  albină: '🐝',
  ambulanță: '🚑',
  balenă: '🐋',
  balon: '🎈',
  bec: '💡',
  bicicletă: '🚲',
  broască: '🐸',
  cal: '🐴',
  cartof: '🥔',
  casă: '🏠',
  castravete: '🥒',
  ceapă: '🧅',
  chitară: '🎸',
  ciocolată: '🍫',
  cireșe: '🍒',
  cort: '⛺',
  crocodil: '🐊',
  dinte: '🦷',
  elicopter: '🚁',
  floare: '🌷',
  fluture: '🦋',
  ghiozdan: '🎒',
  girafă: '🦒',
  gărgăriță: '🐞',
  hipopotam: '🦛',
  înghețată: '🍦',
  lebădă: '🦢',
  lingură: '🥄',
  lumânare: '🕯️',
  lună: '🌙',
  lup: '🐺',
  melc: '🐌',
  microfon: '🎤',
  minge: '⚽',
  morcov: '🥕',
  măr: '🍎',
  nor: '☁️',
  oglindă: '🪞',
  parașută: '🪂',
  pat: '🛏️',
  pește: '🐟',
  pisică: '🐱',
  portocală: '🍊',
  rechin: '🦈',
  suc: '🧃',
  televizor: '📺',
  tort: '🎂',
  trandafir: '🌹',
  tren: '🚂',
  trompetă: '🎺',
  umbrelă: '☂️',
  ureche: '👂',
  urs: '🐻',
  vacă: '🐄',
  veveriță: '🐿️',
  vioară: '🎻',
};

// ───────────────────────── „Unește cuvântul cu imaginea” ─────────────────────────

/** Six words per set; the pictures are drawn in another order. */
export const MATCH_SETS: string[][] = [
  // clasa pregătitoare: one or two syllables, no diphthong, no letter group
  ['casă', 'bec', 'cal', 'balon', 'dinte', 'cort'],
  ['lună', 'nor', 'pat', 'urs', 'măr', 'tort'],
  ['lup', 'pește', 'vacă', 'tren', 'suc', 'melc'],
  // clasa I: two or three syllables, with ce, ci, ge, gi, che, chi, ghi and diphthongs
  ['minge', 'pisică', 'floare', 'ceapă', 'rechin', 'girafă'],
  ['albină', 'chitară', 'vioară', 'ureche', 'oglindă', 'lingură'],
  ['ciocolată', 'ghiozdan', 'cireșe', 'umbrelă', 'lumânare', 'broască'],
];

// ───────────────────────── „Ce literă lipsește?” ─────────────────────────

export interface GapWord {
  word: string;
  /** Index of the missing letter in the word. */
  at: number;
  /** The letter that goes in the gap (small letter). */
  answer: string;
  /** Two other letters to choose from: neither makes a name of the picture. */
  others: [string, string];
}

// word, index of the gap, the letter, two other letters
const GAP_RAW: [string, number, string, string, string][][] = [
  // clasa pregătitoare: the first or the last letter (CP 1.3: „sunetul inițial și/ sau final”)
  [
    ['bec', 0, 'b', 'd', 'p'],
    ['cal', 2, 'l', 'r', 'n'],
    ['nor', 0, 'n', 'm', 'l'],
    ['pat', 2, 't', 's', 'c'],
    ['dinte', 0, 'd', 'b', 'p'],
    ['balon', 4, 'n', 'm', 'r'],
    ['măr', 0, 'm', 'n', 'l'],
    ['lună', 3, 'ă', 'e', 'o'],
  ],
  [
    ['urs', 0, 'u', 'o', 'i'],
    ['tort', 3, 't', 'd', 'n'],
    ['lup', 0, 'l', 'n', 's'],
    ['suc', 2, 'c', 't', 'p'],
    ['vacă', 0, 'v', 'b', 'p'],
    ['tren', 3, 'n', 'm', 'l'],
    ['cort', 0, 'c', 'g', 'd'],
    ['melc', 3, 'c', 't', 's'],
  ],
  // clasa I: a letter inside the word
  [
    ['pisică', 3, 'i', 'e', 'a'],
    ['morcov', 3, 'c', 'g', 't'],
    ['lingură', 3, 'g', 'c', 'd'],
    ['balenă', 3, 'e', 'i', 'a'],
    ['cartof', 3, 't', 'd', 'p'],
    ['fluture', 3, 't', 'd', 'c'],
    ['albină', 3, 'i', 'e', 'u'],
    ['lebădă', 3, 'ă', 'a', 'o'],
  ],
  // clasa I: the letter groups and the diphthongs
  [
    ['minge', 3, 'g', 'c', 'j'],
    ['rechin', 4, 'i', 'e', 'a'],
    ['ureche', 3, 'c', 'g', 't'],
    ['ceapă', 1, 'e', 'i', 'a'],
    ['girafă', 3, 'a', 'o', 'e'],
    ['chitară', 4, 'a', 'o', 'e'],
    ['oglindă', 3, 'i', 'e', 'u'],
    ['floare', 2, 'o', 'u', 'a'],
  ],
  // clasa a II-a: long words
  [
    ['hipopotam', 5, 'o', 'u', 'a'],
    ['televizor', 6, 'z', 'j', 'v'],
    ['elicopter', 6, 't', 'd', 'p'],
    ['bicicletă', 4, 'c', 's', 'g'],
    ['trandafir', 6, 'f', 'v', 'p'],
    ['castravete', 7, 'e', 'i', 'a'],
    ['portocală', 6, 'a', 'o', 'e'],
    ['parașută', 4, 'ș', 's', 'ț'],
  ],
  // clasa a II-a: ă, â, ș, ț and the letter groups
  [
    ['veveriță', 6, 'ț', 't', 'ș'],
    ['gărgăriță', 1, 'ă', 'a', 'e'],
    ['înghețată', 2, 'g', 'c', 'j'],
    ['lumânare', 3, 'â', 'a', 'ă'],
    ['ambulanță', 2, 'b', 'p', 'd'],
    ['crocodil', 5, 'd', 't', 'b'],
    ['microfon', 5, 'f', 'v', 'p'],
    ['trompetă', 4, 'p', 'b', 't'],
  ],
];

export const GAP_SETS: GapWord[][] = GAP_RAW.map((set) => set.map(([word, at, answer, a, b]) => ({ word, at, answer, others: [a, b] })));

// ───────────────────────── „Citește și desenează” ─────────────────────────

/** Six phrases per set, one per box. No colour words: the drawing is checked by looking at it. */
export const DRAW_SETS: string[][] = [
  // clasa pregătitoare: „un” / „o” and a word read on its own
  ['un măr', 'o casă', 'un nor', 'un balon', 'o lună', 'un pește'],
  ['un bec', 'o barcă', 'un copac', 'un melc', 'un tort', 'o cană'],
  ['un măr mare', 'un nor mic', 'o casă mare', 'un pește mic', 'un balon mare', 'o lună mică'],
  // clasa I: numbers, plurals, two things
  ['doi nori', 'trei mere', 'o floare', 'patru stele', 'un soare', 'cinci bile'],
  ['o casă cu o ușă', 'un copac cu trei mere', 'doi pești în apă', 'o minge mare și una mică', 'un nor și un soare', 'trei baloane'],
  ['o pisică lângă o casă', 'un fluture pe o floare', 'două ciuperci', 'un brad cu o stea', 'o barcă pe apă', 'doi copaci și un soare'],
];

// ───────────────────────── „Completează propoziția” ─────────────────────────

export interface FillSentence {
  /** The sentence, with "___" where the word goes. */
  text: string;
  answer: string;
  others: [string, string];
}

const FILL_RAW: [string, string, string, string][][] = [
  // clasa I
  [
    ['Pisica bea ___.', 'lapte', 'pâine', 'nor'],
    ['Câinele ___ la poartă.', 'latră', 'zboară', 'citește'],
    ['Mama gătește o ___ bună.', 'supă', 'carte', 'ușă'],
    ['Noaptea, pe cer strălucește ___.', 'luna', 'mingea', 'casa'],
    ['Peștele înoată în ___.', 'apă', 'pat', 'pom'],
    ['Iarna cade ___.', 'zăpadă', 'soare', 'iarbă'],
  ],
  [
    ['Copiii merg la ___.', 'școală', 'lingură', 'nor'],
    ['Albina face ___.', 'miere', 'pâine', 'zăpadă'],
    ['Bunicul citește o ___.', 'carte', 'ploaie', 'pisică'],
    ['Vara, afară este ___.', 'cald', 'ger', 'zăpadă'],
    ['Vaca ne dă ___.', 'lapte', 'ouă', 'miere'],
    ['Ne spălăm pe mâini cu ___.', 'săpun', 'zahăr', 'cretă'],
  ],
  [
    ['Găina face ___.', 'ouă', 'lapte', 'miere'],
    ['Toamna cad ___ din copaci.', 'frunzele', 'mașinile', 'norii'],
    ['Eleva scrie cu ___.', 'creionul', 'perna', 'mingea'],
    ['Soarele ne dă ___ și căldură.', 'lumină', 'zăpadă', 'ploaie'],
    ['Iepurașul mănâncă un ___.', 'morcov', 'pantof', 'nor'],
    ['Dimineața ne spălăm pe ___.', 'dinți', 'pantofi', 'caiete'],
  ],
  // clasa a II-a
  [
    ['În fiecare dimineață, bunica udă ___ din grădină.', 'florile', 'norii', 'stelele'],
    ['Pentru că ploua, am luat cu mine o ___.', 'umbrelă', 'minge', 'sanie'],
    ['Pompierii au stins repede ___.', 'focul', 'zăpada', 'iarba'],
    ['Elevii ascultă cu atenție ___ doamnei învățătoare.', 'povestea', 'pâinea', 'umbrela'],
    ['Am cumpărat pâine caldă de la ___.', 'brutărie', 'farmacie', 'bibliotecă'],
    ['După ploaie, pe cer a apărut un ___.', 'curcubeu', 'pește', 'pantof'],
  ],
  [
    ['Veverița adună ___ pentru iarnă.', 'alune', 'creioane', 'jucării'],
    ['Când e frig, ne punem pe cap o ___.', 'căciulă', 'șosetă', 'mănușă'],
    ['Trenul a oprit în ___.', 'gară', 'mare', 'nori'],
    ['Fluturii zboară din floare în ___.', 'floare', 'apă', 'pământ'],
    ['Pe tablă, învățătoarea scrie cu ___.', 'creta', 'foarfeca', 'radiera'],
    ['Seara, înainte de culcare, citesc o ___.', 'poveste', 'pernă', 'bancă'],
  ],
  [
    ['Ursul doarme toată iarna în ___.', 'bârlog', 'cuib', 'acvariu'],
    ['Am pus scrisoarea în ___ și am trimis-o.', 'plic', 'oală', 'cuptor'],
    ['Grădinarul sapă pământul cu ___.', 'lopata', 'pensula', 'perna'],
    ['Am mers la ___ să vedem un film.', 'cinema', 'brutărie', 'piață'],
    ['Iarna, copiii fac un om de ___.', 'zăpadă', 'hârtie', 'sticlă'],
    ['Rândunelele pleacă toamna în țările ___.', 'calde', 'înghețate', 'reci'],
  ],
];

export const FILL_SETS: FillSentence[][] = FILL_RAW.map((set) => set.map(([text, answer, a, b]) => ({ text, answer, others: [a, b] })));

// ───────────────────────── „Ordonează cuvintele” ─────────────────────────

/** Five sentences per set, written in the right order (the sheet shuffles the words). */
export const ORDER_SETS: string[][] = [
  // clasa I: three to five words
  ['Pisica bea lapte.', 'Mama citește o carte.', 'Soarele strălucește pe cer.', 'Copiii merg la școală.', 'Câinele latră tare.'],
  ['Bunica face plăcinte.', 'Albina zboară pe flori.', 'Eu am un ghiozdan nou.', 'Peștele înoată în apă.', 'Tata spală mașina.'],
  ['Iarna ninge mult.', 'Fluturele stă pe floare.', 'Fetița are o minge roșie.', 'Vaca paște iarbă verde.', 'Noi plantăm un copac.'],
  // clasa a II-a: five to seven words
  ['Bunicul repară gardul din grădină.', 'Copiii construiesc un castel de nisip.', 'Pisica s-a ascuns sub pat.', 'Elevii scriu o compunere frumoasă.', 'Mama a pregătit o prăjitură gustoasă.'],
  ['Veverița adună alune în scorbură.', 'Fratele meu joacă fotbal în curte.', 'Păsările își fac cuib în copac.', 'Noi citim povești la bibliotecă.', 'Ploaia udă florile din grădină.'],
  ['Bunica ne-a citit o poveste frumoasă.', 'Copiii au construit un om de zăpadă.', 'Albinele adună nectar din flori.', 'Tata a vopsit gardul casei.', 'Vântul a rupt o creangă mare.'],
];

// ───────────────────────── „Copiază” ─────────────────────────

/** Clasa pregătitoare: six words with their pictures. Clasa I and a II-a: sentences. */
export const COPY_SETS: string[][] = [
  ['casă', 'măr', 'nor', 'balon', 'lună', 'pat'],
  ['lup', 'suc', 'bec', 'vacă', 'cort', 'dinte'],
  ['Mama are flori.', 'Dan are un câine.', 'Ana citește o carte.', 'Afară ninge.', 'Eu merg la școală.'],
  ['Pisica doarme.', 'Tata taie lemne.', 'Ioana cântă frumos.', 'Bunica face cozonac.', 'Noi avem un brad.'],
  ['Toamna, pădurea este plină de culori.', 'Veverița ascunde alune pentru iarnă.', 'Copiii adună frunze ruginii în parc.', 'Vântul suflă și cad castanele.'],
  ['Iarna, dealul este acoperit cu zăpadă.', 'Copiii se dau cu sania și râd.', 'Bunica ne face un ceai cald.', 'Seara, toți stăm lângă sobă.'],
];

// ───────────────────────── „Citește și răspunde” ─────────────────────────

export interface TextQuestion {
  /** The question, or a sentence to judge with Da / Nu. */
  q: string;
  /** Three options to circle; none for a Da / Nu question. */
  options?: [string, string, string];
  /** The index of the right option, or for Da / Nu: 0 = Da, 1 = Nu. */
  answer: number;
}

export interface ReadingText {
  title: string;
  /** The text, one sentence per entry (3–5). */
  sentences: string[];
  /** A picture next to the title, when one fits without telling the answers. */
  picture?: string;
  questions: TextQuestion[];
}

export const TEXT_SETS: ReadingText[] = [
  // clasa I
  {
    title: 'Motanul Puf',
    picture: '🐱',
    sentences: ['Motanul Puf are blana albă.', 'El doarme mult pe pernă.', 'Dimineața, Puf bea lapte.', 'Apoi se joacă cu un ghem de lână.'],
    questions: [
      { q: 'Ce culoare are blana lui Puf?', options: ['albă', 'neagră', 'gri'], answer: 0 },
      { q: 'Unde doarme Puf?', options: ['în coș', 'pe pernă', 'sub masă'], answer: 1 },
      { q: 'Puf se joacă cu o minge.', answer: 1 },
    ],
  },
  {
    title: 'În parc',
    picture: '🦆',
    sentences: ['Duminică, Ana merge în parc cu bunicul.', 'Ei văd rațe pe lac.', 'Ana le dă rațelor pâine.', 'Bunicul îi cumpără Anei o înghețată.'],
    questions: [
      { q: 'Cu cine merge Ana în parc?', options: ['cu mama', 'cu bunicul', 'cu fratele'], answer: 1 },
      { q: 'Ce văd ei pe lac?', options: ['rațe', 'bărci', 'pești'], answer: 0 },
      { q: 'Bunicul îi cumpără Anei un balon.', answer: 1 },
    ],
  },
  {
    title: 'Ghiocelul',
    sentences: ['A venit primăvara.', 'În grădină a răsărit un ghiocel.', 'Floarea are petale albe.', 'Copiii se bucură când o văd.'],
    questions: [
      { q: 'Ce anotimp a venit?', options: ['iarna', 'primăvara', 'vara'], answer: 1 },
      { q: 'Unde a răsărit ghiocelul?', options: ['în grădină', 'în pădure', 'în ghiveci'], answer: 0 },
      { q: 'Ghiocelul are petale albe.', answer: 0 },
    ],
  },
  // clasa a II-a
  {
    title: 'Ziua lui Andrei',
    picture: '🎂',
    sentences: [
      'Sâmbătă a fost ziua lui Andrei.',
      'El a împlinit opt ani.',
      'Mama a pregătit un tort cu ciocolată, iar tata a umflat baloane colorate.',
      'Prietenii lui au venit la petrecere și i-au adus cadouri.',
      'Andrei a primit o carte despre dinozauri și s-a bucurat mult.',
    ],
    questions: [
      { q: 'Câți ani a împlinit Andrei?', options: ['șapte', 'opt', 'nouă'], answer: 1 },
      { q: 'Ce fel de tort a pregătit mama?', options: ['cu fructe', 'cu ciocolată', 'cu frișcă'], answer: 1 },
      { q: 'Andrei a primit o carte despre mașini.', answer: 1 },
    ],
  },
  {
    title: 'Excursia la munte',
    picture: '⛰️',
    sentences: [
      'Elevii clasei a II-a au plecat într-o excursie la munte.',
      'Au mers cu autocarul până la cabană.',
      'Pe drum au văzut o cascadă și multe păsări.',
      'La cabană, au mâncat și s-au odihnit.',
      'Seara, s-au întors acasă obosiți, dar fericiți.',
    ],
    questions: [
      { q: 'Cu ce au mers elevii până la cabană?', options: ['cu trenul', 'cu autocarul', 'pe jos'], answer: 1 },
      { q: 'Ce au văzut pe drum?', options: ['o cascadă', 'un lac', 'un urs'], answer: 0 },
      { q: 'Elevii s-au întors acasă dimineața.', answer: 1 },
    ],
  },
  {
    title: 'Vrăbiuța',
    sentences: [
      'Afară era un ger cumplit.',
      'Pe pervazul ferestrei s-a așezat o vrăbiuță flămândă.',
      'Maria a văzut-o și i-a pus câteva semințe într-un capac.',
      'Pasărea a ciugulit repede și a zburat în copac.',
      'De atunci, vine în fiecare dimineață la fereastră.',
    ],
    questions: [
      { q: 'Unde s-a așezat vrăbiuța?', options: ['pe acoperiș', 'pe pervazul ferestrei', 'pe gard'], answer: 1 },
      { q: 'Ce i-a pus Maria vrăbiuței?', options: ['firimituri de pâine', 'semințe', 'apă'], answer: 1 },
      { q: 'Vrăbiuța vine la fereastră în fiecare dimineață.', answer: 0 },
    ],
  },
];
