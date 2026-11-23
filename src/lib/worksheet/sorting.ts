/**
 * Pictures for the sorting, grouping and spatial-orientation sheets („Sortează”, „Ce nu se
 * potrivește?”, „Grupează și numără”, „Orientare în spațiu”; see sorting-pages.ts).
 *
 * Every picture belongs to one category a child of 5–7 recognises without discussion. Pictures
 * whose category can be argued are left out on purpose: the tomato and the watermelon (fruit or
 * vegetable?), the duck (the Twemoji duck is a wild mallard), the rabbit (pet or wild?), the hen
 * (a bird among mammals would be a second odd one out), the plural pictures (mănuși, șosete,
 * struguri). Some pictures also fit a second group (a kite and a balloon fly, a teddy is a bear, a
 * toy drum or a scooter is a toy): `alsoLike` names it, and an odd-one-out row never puts such a
 * picture next to one of that second group, so a row always has exactly one answer.
 *
 * The forms used in the generated sentences are written out for every word, never derived:
 * - `gen`: genitive with the definite article, after „deasupra”, „în stânga”, „în dreapta”
 *   („deasupra mingii”, „în stânga câinelui”, „în dreapta mesei”);
 * - `word`: the bare form, after „sub”, „pe”, „în”, „lângă”, „între” („sub masă”, „lângă casă”);
 * - `indef`: with the indefinite article, as the object of „Desenează” („o minge”, „un soare”).
 *
 * `color` is the colour a child sees first in the picture; the odd-one-out rows are checked so
 * that colour never points at another picture than the intruder (see sorting.test.ts).
 */

export type SortCategory =
  | 'fructe' | 'legume'
  | 'domestice' | 'salbatice'
  | 'apa' | 'uscat' | 'aer'
  | 'haine' | 'jucarii' | 'instrumente'
  | 'diverse';

/** The wider family of a category: two categories of one family make the „close” odd-one-out rows. */
export const CATEGORY_FAMILY: Record<SortCategory, string> = {
  fructe: 'hrana', legume: 'hrana',
  domestice: 'animale', salbatice: 'animale',
  apa: 'transport', uscat: 'transport', aer: 'transport',
  haine: 'haine', jucarii: 'jucarii', instrumente: 'instrumente',
  diverse: 'diverse',
};

/** How the category is named on the sheet, for the adult („Grupa celor trei: fructe”). */
export const CATEGORY_NAMES: Record<SortCategory, string> = {
  fructe: 'fructe', legume: 'legume',
  domestice: 'animale domestice', salbatice: 'animale sălbatice',
  apa: 'se deplasează pe apă', uscat: 'se deplasează pe uscat', aer: 'se deplasează în aer',
  haine: 'haine', jucarii: 'jucării', instrumente: 'instrumente muzicale',
  diverse: 'diverse',
};

export type Colour = 'red' | 'yellow' | 'green' | 'orange' | 'brown' | 'purple' | 'white' | 'grey' | 'blue' | 'pink' | 'black';

export interface SortObject {
  /** The bare form, also the name of the picture („minge”). */
  word: string;
  /** Genitive with the definite article („mingii”). */
  gen: string;
  /** With the indefinite article („o minge”). */
  indef: string;
  /** Picture key (emoji) in src/lib/hints/icons.json; empty for the objects drawn by hand (masă, cutie). */
  picture: string;
  cat: SortCategory;
  color: Colour;
  /** Groups the picture can also be seen in (a kite: „în aer”), besides its own category. */
  alsoLike?: SortCategory[];
}

// word, genitive, indefinite, picture, category, colour
const RAW: [string, string, string, string, SortCategory, Colour][] = [
  // fructe
  ['măr', 'mărului', 'un măr', '🍎', 'fructe', 'red'],
  ['pară', 'perei', 'o pară', '🍐', 'fructe', 'green'],
  ['banană', 'bananei', 'o banană', '🍌', 'fructe', 'yellow'],
  ['căpșună', 'căpșunii', 'o căpșună', '🍓', 'fructe', 'red'],
  ['lămâie', 'lămâii', 'o lămâie', '🍋', 'fructe', 'yellow'],
  ['portocală', 'portocalei', 'o portocală', '🍊', 'fructe', 'orange'],
  ['ananas', 'ananasului', 'un ananas', '🍍', 'fructe', 'yellow'],
  ['piersică', 'piersicii', 'o piersică', '🍑', 'fructe', 'orange'],
  // legume
  ['morcov', 'morcovului', 'un morcov', '🥕', 'legume', 'orange'],
  ['cartof', 'cartofului', 'un cartof', '🥔', 'legume', 'brown'],
  ['castravete', 'castravetelui', 'un castravete', '🥒', 'legume', 'green'],
  ['ceapă', 'cepei', 'o ceapă', '🧅', 'legume', 'white'],
  ['usturoi', 'usturoiului', 'un usturoi', '🧄', 'legume', 'white'],
  ['vânătă', 'vinetei', 'o vânătă', '🍆', 'legume', 'purple'],
  ['ardei', 'ardeiului', 'un ardei', '🫑', 'legume', 'green'],
  // animale domestice
  ['pisică', 'pisicii', 'o pisică', '🐱', 'domestice', 'yellow'],
  ['câine', 'câinelui', 'un câine', '🐶', 'domestice', 'brown'],
  ['vacă', 'vacii', 'o vacă', '🐄', 'domestice', 'white'],
  ['oaie', 'oii', 'o oaie', '🐑', 'domestice', 'white'],
  ['cal', 'calului', 'un cal', '🐴', 'domestice', 'brown'],
  ['porc', 'porcului', 'un porc', '🐷', 'domestice', 'pink'],
  ['capră', 'caprei', 'o capră', '🐐', 'domestice', 'grey'],
  // animale sălbatice
  ['leu', 'leului', 'un leu', '🦁', 'salbatice', 'yellow'],
  ['tigru', 'tigrului', 'un tigru', '🐯', 'salbatice', 'orange'],
  ['vulpe', 'vulpii', 'o vulpe', '🦊', 'salbatice', 'orange'],
  ['lup', 'lupului', 'un lup', '🐺', 'salbatice', 'grey'],
  ['urs', 'ursului', 'un urs', '🐻', 'salbatice', 'brown'],
  ['elefant', 'elefantului', 'un elefant', '🐘', 'salbatice', 'grey'],
  ['zebră', 'zebrei', 'o zebră', '🦓', 'salbatice', 'white'],
  ['girafă', 'girafei', 'o girafă', '🦒', 'salbatice', 'yellow'],
  ['hipopotam', 'hipopotamului', 'un hipopotam', '🦛', 'salbatice', 'grey'],
  ['veveriță', 'veveriței', 'o veveriță', '🐿️', 'salbatice', 'brown'],
  ['arici', 'ariciului', 'un arici', '🦔', 'salbatice', 'brown'],
  // se deplasează pe apă
  ['barcă', 'bărcii', 'o barcă', '⛵', 'apa', 'white'],
  ['vapor', 'vaporului', 'un vapor', '🚢', 'apa', 'grey'],
  ['canoe', 'canoei', 'o canoe', '🛶', 'apa', 'red'],
  ['șalupă', 'șalupei', 'o șalupă', '🚤', 'apa', 'yellow'],
  // se deplasează pe uscat
  ['mașină', 'mașinii', 'o mașină', '🚗', 'uscat', 'red'],
  ['autobuz', 'autobuzului', 'un autobuz', '🚌', 'uscat', 'grey'],
  ['bicicletă', 'bicicletei', 'o bicicletă', '🚲', 'uscat', 'red'],
  ['tren', 'trenului', 'un tren', '🚂', 'uscat', 'black'],
  ['tractor', 'tractorului', 'un tractor', '🚜', 'uscat', 'green'],
  ['trotinetă', 'trotinetei', 'o trotinetă', '🛴', 'uscat', 'blue'],
  ['ambulanță', 'ambulanței', 'o ambulanță', '🚑', 'uscat', 'white'],
  // se deplasează în aer
  ['avion', 'avionului', 'un avion', '✈️', 'aer', 'grey'],
  ['elicopter', 'elicopterului', 'un elicopter', '🚁', 'aer', 'yellow'],
  ['rachetă', 'rachetei', 'o rachetă', '🚀', 'aer', 'blue'],
  ['parașută', 'parașutei', 'o parașută', '🪂', 'aer', 'red'],
  // haine
  ['fular', 'fularului', 'un fular', '🧣', 'haine', 'red'],
  ['pantof', 'pantofului', 'un pantof', '👞', 'haine', 'brown'],
  ['pălărie', 'pălăriei', 'o pălărie', '🎩', 'haine', 'black'],
  ['tricou', 'tricoului', 'un tricou', '👕', 'haine', 'blue'],
  ['rochie', 'rochiei', 'o rochie', '👗', 'haine', 'blue'],
  ['șapcă', 'șepcii', 'o șapcă', '🧢', 'haine', 'blue'],
  ['bocanc', 'bocancului', 'un bocanc', '🥾', 'haine', 'brown'],
  // jucării
  ['minge', 'mingii', 'o minge', '⚽', 'jucarii', 'white'],
  ['zar', 'zarului', 'un zar', '🎲', 'jucarii', 'red'],
  ['zmeu', 'zmeului', 'un zmeu', '🪁', 'jucarii', 'blue'],
  ['balon', 'balonului', 'un balon', '🎈', 'jucarii', 'red'],
  ['ursuleț', 'ursulețului', 'un ursuleț', '🧸', 'jucarii', 'brown'],
  // instrumente muzicale
  ['tobă', 'tobei', 'o tobă', '🥁', 'instrumente', 'red'],
  ['trompetă', 'trompetei', 'o trompetă', '🎺', 'instrumente', 'yellow'],
  ['vioară', 'viorii', 'o vioară', '🎻', 'instrumente', 'orange'],
  ['chitară', 'chitarei', 'o chitară', '🎸', 'instrumente', 'red'],
  ['xilofon', 'xilofonului', 'un xilofon', '🎹', 'instrumente', 'red'],
  // diverse: the scenes, the grid and the drawings
  ['casă', 'casei', 'o casă', '🏠', 'diverse', 'yellow'],
  ['copac', 'copacului', 'un copac', '🌳', 'diverse', 'green'],
  ['floare', 'florii', 'o floare', '🌷', 'diverse', 'pink'],
  ['stea', 'stelei', 'o stea', '⭐', 'diverse', 'yellow'],
  ['lună', 'lunii', 'o lună', '🌙', 'diverse', 'yellow'],
  ['soare', 'soarelui', 'un soare', '☀️', 'diverse', 'yellow'],
  ['nor', 'norului', 'un nor', '☁️', 'diverse', 'white'],
  ['carte', 'cărții', 'o carte', '📖', 'diverse', 'white'],
  ['tort', 'tortului', 'un tort', '🎂', 'diverse', 'pink'],
  ['pește', 'peștelui', 'un pește', '🐟', 'diverse', 'blue'],
  ['fluture', 'fluturelui', 'un fluture', '🦋', 'diverse', 'blue'],
  ['albină', 'albinei', 'o albină', '🐝', 'diverse', 'yellow'],
  ['umbrelă', 'umbrelei', 'o umbrelă', '☂️', 'diverse', 'purple'],
  ['coș', 'coșului', 'un coș', '🧺', 'diverse', 'brown'],
  ['bec', 'becului', 'un bec', '💡', 'diverse', 'yellow'],
  ['inimă', 'inimii', 'o inimă', '❤️', 'diverse', 'red'],
  ['cerc', 'cercului', 'un cerc', '', 'diverse', 'black'],
  ['pătrat', 'pătratului', 'un pătrat', '', 'diverse', 'black'],
  ['triunghi', 'triunghiului', 'un triunghi', '', 'diverse', 'black'],
  // drawn by hand on the orientation sheets
  ['masă', 'mesei', 'o masă', '', 'diverse', 'brown'],
  ['cutie', 'cutiei', 'o cutie', '', 'diverse', 'brown'],
];

const ALSO_LIKE: Record<string, SortCategory[]> = {
  zmeu: ['aer'],
  balon: ['aer'],
  ursuleț: ['domestice', 'salbatice'],
  bicicletă: ['jucarii'],
  trotinetă: ['jucarii'],
  tobă: ['jucarii'],
  trompetă: ['jucarii'],
  vioară: ['jucarii'],
  chitară: ['jucarii'],
  xilofon: ['jucarii'],
};

export const SORT_OBJECTS: SortObject[] = RAW.map(([word, gen, indef, picture, cat, color]) => ({
  word, gen, indef, picture, cat, color, ...(ALSO_LIKE[word] ? { alsoLike: ALSO_LIKE[word] } : {}),
}));

const BY_WORD = new Map(SORT_OBJECTS.map((o) => [o.word, o]));

/** The object of a word; throws on a word that is not in the list (a typo in the sets). */
export function obj(word: string): SortObject {
  const o = BY_WORD.get(word);
  if (!o) throw new Error(`sorting: unknown word „${word}”`);
  return o;
}

export function objectsOf(cat: SortCategory): SortObject[] {
  return SORT_OBJECTS.filter((o) => o.cat === cat);
}

/** The pictures on the group boxes of „Sortează” (not objects to sort). */
export const GROUP_SYMBOLS = {
  domestice: '🏠',
  salbatice: '🌳',
  aer: '☁️',
  uscat: '🛣️',
  apa: '🌊',
} as const;
