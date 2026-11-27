/**
 * „Citire și scriere”: the words, phrases, sentences and short texts of the reading and writing
 * sheets (see reading-pages.ts), written out by hand — none is generated, none is taken from a
 * textbook. The texts of „Citește și răspunde” are original.
 *
 * Items are "read:<kind>:<set>". The first six sets of each kind keep their numbers (saved sheets and the
 * presets name them); the sets written later are added after them, so the classes are not in order by number:
 * READING_LEVELS says which class a set is for, and the picker shows them class by class (reading-pages.ts
 * readingItems). Every set is meant for one class
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
const times = (level: ReadLevel, k: number): ReadLevel[] => Array.from({ length: k }, () => level);

/** The class each set is written for, set 1 first: the six first sets, then the sets added after them. */
export const READING_LEVELS: Record<ReadKind, ReadLevel[]> = {
  match: ['CP', 'CP', 'CP', 'I', 'I', 'I', ...times('CP', 5), ...times('I', 5)],
  gap: ['CP', 'CP', 'I', 'I', 'II', 'II', ...times('CP', 6), ...times('I', 6), ...times('II', 6)],
  draw: ['CP', 'CP', 'CP', 'I', 'I', 'I', ...times('CP', 5), ...times('I', 5)],
  fill: ['I', 'I', 'I', 'II', 'II', 'II', ...times('I', 5), ...times('II', 5)],
  order: ['I', 'I', 'I', 'II', 'II', 'II', ...times('I', 5), ...times('II', 5)],
  copy: ['CP', 'CP', 'I', 'I', 'II', 'II', ...times('CP', 6), ...times('I', 6), ...times('II', 6)],
  text: ['I', 'I', 'I', 'II', 'II', 'II', ...times('I', 7), ...times('II', 7)],
};

const READING_ITEM = /^read:(match|gap|draw|fill|order|copy|text):([1-9]\d?)$/;

export function isReadingItem(item: string): boolean {
  const m = READING_ITEM.exec(item);
  return !!m && Number(m[2]) <= READING_LEVELS[m[1] as ReadKind].length;
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
  // the words of the sets added later: clasa pregătitoare (short words) …
  ac: '🪡', barcă: '⛵', brad: '🎄', brânză: '🧀', cactus: '🌵', cadă: '🛁', capră: '🐐', carte: '📕', clopot: '🔔', cocoș: '🐓', coș: '🧺',
  crab: '🦀', cupă: '🏆', delfin: '🐬', duș: '🚿', foc: '🔥', frunză: '🍃', fular: '🧣', fulg: '❄️', hartă: '🗺️', inel: '💍', lacăt: '🔒',
  lapte: '🥛', lupă: '🔍', magnet: '🧲', munte: '⛰️', mână: '✋', nas: '👃', os: '🦴', pantof: '👞', pară: '🍐', plic: '✉️', pom: '🌳',
  porc: '🐖', porumb: '🌽', rață: '🦆', robot: '🤖', scară: '🪜', săpun: '🧼', tigru: '🐯', tobă: '🥁', topor: '🪓', tractor: '🚜',
  ușă: '🚪', vapor: '🚢', vulpe: '🦊', zar: '🎲', zebră: '🦓', șarpe: '🐍',
  // … clasa I and clasa a II-a
  ananas: '🍍', arici: '🦔', autobuz: '🚌', avion: '✈️', banană: '🍌', bufniță: '🦉', busolă: '🧭', cadou: '🎁', calculator: '💻',
  caracatiță: '🐙', castel: '🏰', ceas: '🕒', ciupercă: '🍄', creion: '✏️', curcubeu: '🌈', cămilă: '🐫', căpșună: '🍓', câine: '🐕',
  dinozaur: '🦖', dovleac: '🎃', elefant: '🐘', fantomă: '👻', foarfecă: '✂️', furnică: '🐜', găină: '🐔', găleată: '🪣', iepure: '🐇',
  lanternă: '🔦', leopard: '🐆', leu: '🦁', lămâie: '🍋', maimuță: '🐒', mașină: '🚗', mănuși: '🧤', mătură: '🧹', oaie: '🐑',
  ochelari: '👓', papagal: '🦜', pensulă: '🖌️', pepene: '🍉', periuță: '🪥', pian: '🎹', piersică: '🍑', pinguin: '🐧', pâine: '🍞',
  pălărie: '🎩', rachetă: '🚀', rinocer: '🦏', rochie: '👗', roșie: '🍅', sanie: '🛷', scoică: '🐚', semafor: '🚦', soare: '☀️',
  stea: '⭐', struguri: '🍇', telefon: '📱', termometru: '🌡️', tobogan: '🛝', trotinetă: '🛴', unicorn: '🦄', ursuleț: '🧸',
  usturoi: '🧄', vânătă: '🍆', zmeu: '🪁', șoarece: '🐭', țestoasă: '🐢',
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
  // ── the sets added later. Clasa pregătitoare (sets 7–11)
  ['pom', 'nas', 'vulpe', 'carte', 'tobă', 'foc'],
  ['barcă', 'ușă', 'porc', 'zar', 'inel', 'munte'],
  ['mână', 'pară', 'rață', 'robot', 'brad', 'lapte'],
  ['capră', 'cocoș', 'vapor', 'lacăt', 'frunză', 'coș'],
  ['tigru', 'șarpe', 'cadă', 'pantof', 'plic', 'fulg'],
  // clasa I (sets 12–16)
  ['ceas', 'iepure', 'pâine', 'soare', 'creion', 'găină'],
  ['mașină', 'căpșună', 'șoarece', 'foarfecă', 'stea', 'oaie'],
  ['arici', 'lămâie', 'pinguin', 'rochie', 'zmeu', 'bufniță'],
  ['maimuță', 'banană', 'avion', 'pălărie', 'ciupercă', 'leu'],
  ['câine', 'roșie', 'sanie', 'pepene', 'mănuși', 'curcubeu'],
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
  // ── the sets added later. Clasa pregătitoare (sets 7–12): the first or the last letter
  [
    ['pom', 0, 'p', 'b', 'd'],
    ['nas', 2, 's', 'z', 'ș'],
    ['vulpe', 0, 'v', 'f', 'b'],
    ['carte', 4, 'e', 'a', 'i'],
    ['tobă', 0, 't', 'd', 'p'],
    ['foc', 2, 'c', 'g', 't'],
    ['zar', 0, 'z', 's', 'j'],
    ['inel', 3, 'l', 'r', 'n'],
  ],
  [
    ['barcă', 0, 'b', 'p', 'd'],
    ['ușă', 0, 'u', 'o', 'a'],
    ['porc', 3, 'c', 't', 'g'],
    ['munte', 0, 'm', 'n', 'p'],
    ['brad', 3, 'd', 't', 'b'],
    ['lapte', 0, 'l', 'r', 'n'],
    ['robot', 4, 't', 'd', 'c'],
    ['pară', 0, 'p', 'b', 't'],
  ],
  [
    ['mână', 0, 'm', 'n', 'l'],
    ['rață', 0, 'r', 'l', 'n'],
    ['cocoș', 4, 'ș', 's', 'j'],
    ['vapor', 4, 'r', 'l', 'n'],
    ['lacăt', 4, 't', 'd', 'p'],
    ['frunză', 0, 'f', 'v', 'p'],
    ['coș', 0, 'c', 'g', 't'],
    ['capră', 4, 'ă', 'e', 'i'],
  ],
  [
    ['tigru', 0, 't', 'd', 'p'],
    ['șarpe', 0, 'ș', 's', 'j'],
    ['cadă', 0, 'c', 'g', 'p'],
    ['pantof', 5, 'f', 'v', 'p'],
    ['plic', 3, 'c', 'g', 't'],
    ['fulg', 3, 'g', 'c', 'd'],
    ['os', 0, 'o', 'u', 'e'],
    ['duș', 2, 'ș', 's', 'z'],
  ],
  [
    ['zebră', 0, 'z', 's', 'j'],
    ['delfin', 5, 'n', 'm', 'l'],
    ['crab', 3, 'b', 'p', 'd'],
    ['brânză', 0, 'b', 'p', 'd'],
    ['porumb', 0, 'p', 'b', 't'],
    ['săpun', 4, 'n', 'm', 'r'],
    ['fular', 4, 'r', 'l', 'n'],
    ['hartă', 4, 'ă', 'e', 'o'],
  ],
  [
    ['tractor', 0, 't', 'd', 'p'],
    ['magnet', 5, 't', 'd', 'c'],
    ['lupă', 0, 'l', 'r', 'n'],
    ['topor', 4, 'r', 'l', 'n'],
    ['scară', 0, 's', 'z', 'ș'],
    ['clopot', 5, 't', 'd', 'p'],
    ['cupă', 0, 'c', 'g', 't'],
    ['cactus', 5, 's', 'z', 'ș'],
  ],
  // clasa I (sets 13–18): a letter inside the word, the letter groups and the diphthongs
  [
    ['iepure', 3, 'u', 'o', 'a'],
    ['pâine', 1, 'â', 'a', 'ă'],
    ['soare', 2, 'a', 'e', 'u'],
    ['creion', 2, 'e', 'i', 'a'],
    ['găină', 3, 'n', 'm', 'l'],
    ['mașină', 2, 'ș', 's', 'j'],
    ['stea', 1, 't', 'd', 'p'],
    ['oaie', 1, 'a', 'e', 'u'],
  ],
  [
    ['căpșună', 3, 'ș', 's', 'j'],
    ['șoarece', 5, 'c', 'g', 't'],
    ['foarfecă', 4, 'f', 'v', 'p'],
    ['arici', 3, 'c', 'g', 't'],
    ['lămâie', 3, 'â', 'a', 'ă'],
    ['pinguin', 3, 'g', 'c', 'd'],
    ['rochie', 2, 'c', 'g', 't'],
    ['zmeu', 1, 'm', 'n', 'l'],
  ],
  [
    ['bufniță', 3, 'n', 'm', 'l'],
    ['maimuță', 5, 'ț', 't', 'ș'],
    ['banană', 2, 'n', 'm', 'l'],
    ['avion', 2, 'i', 'e', 'a'],
    ['pălărie', 4, 'r', 'l', 'n'],
    ['ciupercă', 4, 'e', 'a', 'i'],
    ['leu', 1, 'e', 'i', 'a'],
    ['câine', 1, 'â', 'a', 'ă'],
  ],
  [
    ['roșie', 2, 'ș', 's', 'j'],
    ['sanie', 2, 'n', 'm', 'l'],
    ['pepene', 2, 'p', 'b', 't'],
    ['mănuși', 3, 'u', 'o', 'a'],
    ['curcubeu', 3, 'c', 'g', 't'],
    ['ceas', 1, 'e', 'i', 'a'],
    ['elefant', 3, 'f', 'v', 'p'],
    ['papagal', 4, 'g', 'c', 'd'],
  ],
  [
    ['țestoasă', 3, 't', 'd', 'p'],
    ['caracatiță', 4, 'c', 'g', 't'],
    ['scoică', 2, 'o', 'u', 'a'],
    ['unicorn', 3, 'c', 'g', 't'],
    ['cadou', 2, 'd', 't', 'b'],
    ['pian', 1, 'i', 'e', 'a'],
    ['busolă', 2, 's', 'z', 'ș'],
    ['mătură', 3, 'u', 'o', 'a'],
  ],
  [
    ['găleată', 4, 'a', 'o', 'e'],
    ['castel', 3, 't', 'd', 'p'],
    ['ananas', 2, 'a', 'o', 'e'],
    ['telefon', 4, 'f', 'v', 'p'],
    ['semafor', 2, 'm', 'n', 'l'],
    ['ursuleț', 6, 'ț', 't', 'ș'],
    ['fantomă', 3, 't', 'd', 'p'],
    ['cămilă', 3, 'i', 'e', 'a'],
  ],
  // clasa a II-a (sets 19–24): long words, ă, â, ș, ț and the letter groups
  [
    ['caracatiță', 8, 'ț', 't', 'ș'],
    ['elefant', 5, 'n', 'm', 'r'],
    ['papagal', 2, 'p', 'b', 't'],
    ['rinocer', 4, 'c', 's', 'g'],
    ['ananas', 5, 's', 'z', 'ș'],
    ['semafor', 4, 'f', 'v', 'p'],
    ['telefon', 2, 'l', 'r', 'n'],
    ['trotinetă', 4, 'i', 'e', 'a'],
  ],
  [
    ['țestoasă', 4, 'o', 'u', 'e'],
    ['pălărie', 5, 'i', 'e', 'a'],
    ['foarfecă', 1, 'o', 'u', 'a'],
    ['curcubeu', 6, 'e', 'a', 'i'],
    ['căpșună', 2, 'p', 'b', 't'],
    ['bufniță', 5, 'ț', 't', 'ș'],
    ['unicorn', 5, 'r', 'l', 'n'],
    ['fantomă', 1, 'a', 'o', 'e'],
  ],
  [
    ['calculator', 3, 'c', 'g', 't'],
    ['dinozaur', 4, 'z', 's', 'j'],
    ['ochelari', 3, 'e', 'i', 'a'],
    ['lanternă', 3, 't', 'd', 'p'],
    ['termometru', 3, 'm', 'n', 'l'],
    ['tobogan', 2, 'b', 'p', 'd'],
    ['ursuleț', 3, 'u', 'o', 'a'],
    ['elicopter', 3, 'c', 'g', 't'],
  ],
  [
    ['maimuță', 3, 'm', 'n', 'l'],
    ['pinguin', 5, 'i', 'e', 'a'],
    ['șoarece', 0, 'ș', 's', 'j'],
    ['ciupercă', 6, 'c', 'g', 't'],
    ['pensulă', 3, 's', 'z', 'ș'],
    ['periuță', 5, 'ț', 't', 'ș'],
    ['busolă', 4, 'l', 'r', 'n'],
    ['struguri', 5, 'u', 'o', 'a'],
  ],
  [
    ['rachetă', 2, 'c', 'g', 't'],
    ['autobuz', 6, 'z', 's', 'j'],
    ['găleată', 1, 'ă', 'a', 'e'],
    ['castel', 5, 'l', 'r', 'n'],
    ['cămilă', 2, 'm', 'n', 'l'],
    ['furnică', 3, 'n', 'm', 'r'],
    ['mănuși', 4, 'ș', 's', 'j'],
    ['leopard', 2, 'o', 'u', 'a'],
  ],
  [
    ['lămâie', 4, 'i', 'e', 'a'],
    ['piersică', 2, 'e', 'a', 'i'],
    ['usturoi', 3, 'u', 'o', 'a'],
    ['vânătă', 1, 'â', 'a', 'ă'],
    ['trotinetă', 0, 't', 'd', 'p'],
    ['dovleac', 4, 'e', 'i', 'a'],
    ['banană', 4, 'n', 'm', 'l'],
    ['avion', 1, 'v', 'f', 'b'],
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
  // ── the sets added later. Clasa pregătitoare (sets 7–11): one thing, then its size, then two things
  ['un pom', 'o barcă', 'o carte', 'un inel', 'o ușă', 'un zar'],
  ['un brad', 'o pară', 'un robot', 'un coș', 'o tobă', 'un plic'],
  ['un pom mare', 'o barcă mică', 'un brad mic', 'o carte mare', 'un inel mic', 'o pară mare'],
  ['un nor și o lună', 'un pom și un măr', 'o casă și un brad', 'un pește și un rac', 'o barcă pe apă', 'un tort mare'],
  ['un robot mic', 'o cană cu lapte', 'un munte mare', 'un coș cu mere', 'o masă cu un tort', 'un șarpe lung'],
  // clasa I (sets 12–16)
  ['două pisici', 'un copac înalt', 'patru flori', 'o minge și un zmeu', 'trei pești', 'o casă cu două ferestre'],
  ['un iepure cu un morcov', 'două mere pe o farfurie', 'un om de zăpadă', 'cinci stele și o lună', 'o barcă cu pânze', 'trei fluturi'],
  ['o fetiță cu un balon', 'un cățel lângă o cușcă', 'două păsări pe o creangă', 'un tren cu trei vagoane', 'o floare în ghiveci', 'șase mere în coș'],
  ['un pește în acvariu', 'o umbrelă și doi nori', 'un tort cu patru lumânări', 'două ciuperci sub un brad', 'un soare mare', 'o pisică pe un gard'],
  ['o mașină pe drum', 'trei cireșe pe o ramură', 'un melc pe o frunză', 'două inimi', 'un castel cu un steag', 'patru bile într-o cutie'],
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
  // ── the sets added later. Clasa I (sets 7–11)
  [
    ['Pasărea are două ___.', 'aripi', 'roți', 'mâneci'],
    ['Mă încalț cu ___.', 'ghetele', 'mănușile', 'ochelarii'],
    ['Tata taie pâinea cu ___.', 'cuțitul', 'pieptenele', 'creionul'],
    ['Bem apă dintr-un ___.', 'pahar', 'pantof', 'sertar'],
    ['Rața înoată pe ___.', 'lac', 'gard', 'scaun'],
    ['Trenul merge pe ___.', 'șine', 'apă', 'nori'],
  ],
  [
    ['Bunica împletește un ___.', 'fular', 'tablou', 'pod'],
    ['Maimuța mănâncă o ___.', 'banană', 'pernă', 'lampă'],
    ['Scriu tema în ___.', 'caiet', 'pahar', 'pantof'],
    ['Rândunica își face ___ sub streașină.', 'cuib', 'pat', 'cort'],
    ['În pat, eu ___.', 'dorm', 'înot', 'schiez'],
    ['Mingea este ___.', 'rotundă', 'pătrată', 'ascuțită'],
  ],
  [
    ['Vara mâncăm ___ pe băț.', 'înghețată', 'supă', 'pâine'],
    ['Câinele roade un ___.', 'os', 'nor', 'lac'],
    ['Doctorul ne ascultă ___.', 'inima', 'ghiozdanul', 'umbrela'],
    ['Pictez cu ___.', 'pensula', 'furculița', 'cheia'],
    ['Calul trage ___.', 'căruța', 'casa', 'luna'],
    ['La bibliotecă găsim ___.', 'cărți', 'cartofi', 'valuri'],
  ],
  [
    ['Albinele trăiesc în ___.', 'stup', 'acvariu', 'grajd'],
    ['Ne ștergem pe mâini cu ___.', 'prosopul', 'covorul', 'caietul'],
    ['Elevii stau în ___.', 'bănci', 'copaci', 'cuiburi'],
    ['Primăvara înfloresc ___.', 'pomii', 'norii', 'pietrele'],
    ['Poștașul aduce o ___.', 'scrisoare', 'ploaie', 'pădure'],
    ['Spăl vasele cu ___ și detergent.', 'apă', 'nisip', 'făină'],
  ],
  [
    ['Ariciul are ___.', 'țepi', 'aripi', 'solzi'],
    ['Mergem la mare cu ___.', 'trenul', 'sania', 'liftul'],
    ['Brutarul face ___.', 'pâine', 'pantofi', 'scaune'],
    ['Înainte de masă, mă spăl pe ___.', 'mâini', 'ghete', 'cărți'],
    ['Fluturele are aripi ___.', 'colorate', 'gălăgioase', 'sărate'],
    ['În pădure cresc ___.', 'ciuperci', 'valuri', 'vapoare'],
  ],
  // clasa a II-a (sets 12–16)
  [
    ['La semafor, traversăm strada pe culoarea ___.', 'verde', 'roșie', 'galbenă'],
    ['Toamna, fermierii culeg ___ din vie.', 'strugurii', 'cartofii', 'peștii'],
    ['Meduzele și delfinii trăiesc în ___.', 'mare', 'pădure', 'deșert'],
    ['Ca să nu răcesc, iarna mă îmbrac ___.', 'gros', 'subțire', 'ușor'],
    ['La ora de muzică, noi ___ un cântec nou.', 'învățăm', 'mâncăm', 'plantăm'],
    ['Bunicul și-a pus ___ ca să poată citi ziarul.', 'ochelarii', 'mănușile', 'cizmele'],
  ],
  [
    ['Mecanicul a reparat ___ mașinii.', 'motorul', 'cuibul', 'penarul'],
    ['Dimineața, cocoșul ___ și trezește toată curtea.', 'cântă', 'latră', 'miaună'],
    ['Am pus florile într-o ___ cu apă.', 'vază', 'carte', 'pălărie'],
    ['După ce citesc, pun cartea înapoi pe ___.', 'raft', 'foc', 'gheață'],
    ['Cu ajutorul unei ___, vedem lucrurile mărite.', 'lupe', 'linguri', 'perne'],
    ['Zăpada se topește când vine ___.', 'căldura', 'gerul', 'viscolul'],
  ],
  [
    ['La grădina zoologică am văzut o ___ cu gâtul lung.', 'girafă', 'broască', 'vrabie'],
    ['Ca să ajungă la etajul zece, vecinul ia ___.', 'liftul', 'barca', 'sania'],
    ['Am ascuțit creionul cu ___.', 'ascuțitoarea', 'radiera', 'rigla'],
    ['Marinarii călătoresc pe mare cu ___.', 'vaporul', 'tramvaiul', 'tractorul'],
    ['Când mă doare un dinte, merg la ___.', 'dentist', 'brutar', 'croitor'],
    ['Curcubeul are șapte ___.', 'culori', 'colțuri', 'picioare'],
  ],
  [
    ['Păstrăm laptele și brânza în ___.', 'frigider', 'cuptor', 'sertar'],
    ['Sportivii aleargă pe pista ___.', 'stadionului', 'bibliotecii', 'brutăriei'],
    ['Pentru a trimite o scrisoare, lipim pe plic un ___.', 'timbru', 'nasture', 'magnet'],
    ['Apicultorul are grijă de ___.', 'albine', 'vapoare', 'ceasuri'],
    ['Am măsurat lungimea băncii cu ___.', 'rigla', 'cântarul', 'termometrul'],
    ['Seara, soarele ___ în spatele dealului.', 'apune', 'răsare', 'plouă'],
  ],
  [
    ['Am aprins ___ ca să văd pe întuneric.', 'lanterna', 'umbrela', 'furculița'],
    ['Țestoasa se ascunde în ___ ei.', 'carapacea', 'pălăria', 'geanta'],
    ['În deșert plouă foarte ___.', 'rar', 'des', 'zilnic'],
    ['Am udat răsadurile cu ___.', 'stropitoarea', 'mătura', 'foarfeca'],
    ['La cofetărie am cumpărat o ___ cu frișcă.', 'prăjitură', 'ciorbă', 'salată'],
    ['Pictorul își așază tabloul pe ___.', 'șevalet', 'aragaz', 'trambulină'],
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
  // ── the sets added later. Clasa I (sets 7–11): three to five words
  ['Ana udă florile.', 'Tata citește un ziar.', 'Vântul bate tare.', 'Noi mâncăm supă caldă.', 'Rața înoată pe lac.'],
  ['Radu desenează o casă.', 'Bunicul are un cal.', 'Ploaia udă iarba.', 'Eu beau lapte cald.', 'Mara scrie cu stiloul.'],
  ['Soarele apune seara.', 'Motanul prinde un șoarece.', 'Copiii cântă frumos.', 'Mama coace o pâine.', 'Vlad merge la bunici.'],
  ['Ariciul are țepi.', 'Sara pictează un fluture.', 'Trenul intră în gară.', 'Bunica ne așteaptă acasă.', 'Iepurele roade un morcov.'],
  ['Toamna plouă des.', 'Matei are o bicicletă.', 'Pisoiul doarme pe covor.', 'Noi ne jucăm afară.', 'Irina mănâncă un măr.'],
  // clasa a II-a (sets 12–16): five to seven words
  ['Ilinca a desenat un fluture colorat.', 'Vecinul nostru are un câine negru.', 'Elevii au plantat flori lângă școală.', 'Mama a cumpărat pâine de la brutărie.', 'Vulpea se ascunde în vizuină.'],
  ['Fratele meu repară bicicleta în curte.', 'Bunica a împletit un fular gros.', 'Furnicile cară boabe spre mușuroi.', 'Tata a aprins focul în sobă.', 'Noi am vizitat un muzeu vechi.'],
  ['Pompierii au salvat un pisoi din copac.', 'Sora mea cântă la vioară.', 'Ariciul și-a făcut culcuș sub frunze.', 'Noi am cules mere din livadă.', 'Ploaia a umplut butoiul din curte.'],
  ['Bunicul a prins un pește mare.', 'Copiii au împodobit bradul cu globuri.', 'Pisica doarme pe pervazul ferestrei.', 'Doctorul a consultat un copil răcit.', 'Vântul a răsturnat umbrela de pe terasă.'],
  ['Mara a găsit o scoică pe plajă.', 'Barza și-a făcut cuib pe stâlp.', 'Colegul meu a câștigat un concurs.', 'Noi am pictat un peisaj de iarnă.', 'Melcul își duce casa în spate.'],
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
  // ── the sets added later. Clasa pregătitoare (sets 7–12): six words with their pictures
  ['pom', 'nas', 'tobă', 'foc', 'zar', 'inel'],
  ['barcă', 'ușă', 'porc', 'brad', 'robot', 'pară'],
  ['mână', 'rață', 'cocoș', 'vapor', 'coș', 'lapte'],
  ['tigru', 'șarpe', 'cadă', 'plic', 'fulg', 'os'],
  ['zebră', 'crab', 'săpun', 'fular', 'hartă', 'munte'],
  ['lupă', 'topor', 'scară', 'clopot', 'cupă', 'cactus'],
  // clasa I (sets 13–18): five short sentences, at most 30 words in all
  ['Mara are o păpușă.', 'Radu bea ceai cald.', 'Bunicul sapă în grădină.', 'Afară plouă mărunt.', 'Noi mergem la joacă.'],
  ['Soarele răsare.', 'Vlad scrie o temă.', 'Sara udă florile.', 'Cățelul roade un os.', 'Mama face o supă.'],
  ['Toamna cad frunze.', 'Matei are un zmeu.', 'Irina cântă la pian.', 'Bunica țese un covor.', 'Eu citesc o poveste.'],
  ['Vine primăvara.', 'Ghiocelul a răsărit.', 'Păsările ciripesc vesel.', 'Tudor plantează un pom.', 'Albinele zboară pe flori.'],
  ['Ilinca are un pisoi.', 'Pisoiul bea lapte.', 'Apoi doarme în coș.', 'Seara se joacă iar.', 'Ilinca îl mângâie.'],
  ['Este vacanță.', 'Copiii merg la mare.', 'Ei fac un castel de nisip.', 'Valurile sunt mici.', 'Toți râd și se joacă.'],
  // clasa a II-a (sets 19–24): four sentences, at most 50 words in all
  ['Primăvara, livada este plină de flori.', 'Albinele zboară din pom în pom.', 'Bunicul văruiește trunchiul pomilor.', 'În curând vor apărea primele cireșe.'],
  ['Vara, mergem cu familia la munte.', 'Urcăm pe o potecă, printre brazi.', 'Sus, aerul este curat și răcoros.', 'De pe vârf se vede tot satul.'],
  ['Dimineața, clasa noastră este liniștită.', 'Doamna învățătoare deschide catalogul.', 'Noi scoatem caietele și penarele.', 'Prima oră este cea de matematică.'],
  ['Sâmbătă am fost la bunici, la țară.', 'Am hrănit găinile și am adunat ouăle.', 'Bunica a copt o plăcintă cu mere.', 'Seara am privit stelele de pe prispă.'],
  ['Ariciul adună frunze pentru culcuș.', 'Veverița își ascunde nucile în scorbură.', 'Ursul caută un bârlog călduros.', 'Toate animalele se pregătesc de iarnă.'],
  ['Am împrumutat o carte de la bibliotecă.', 'Este o poveste despre un cățel curajos.', 'Am citit zece pagini fără să mă opresc.', 'Mâine îi voi povesti totul colegei mele.'],
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
  /** The text, one sentence per entry (clasa I: 3–5, clasa a II-a: 5–8). */
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
  // ── the texts added later. Clasa I (sets 7–13): three to five short sentences
  {
    title: 'Melcul',
    picture: '🐌',
    sentences: ['După ploaie, un melc iese la plimbare.', 'El își duce casa în spate.', 'Melcul merge încet pe o frunză verde.', 'Când se sperie, se ascunde în cochilie.'],
    questions: [
      { q: 'Când iese melcul la plimbare?', options: ['după ploaie', 'la prânz', 'noaptea'], answer: 0 },
      { q: 'Pe ce merge melcul?', options: ['pe o piatră', 'pe o frunză', 'pe un gard'], answer: 1 },
      { q: 'Unde se ascunde melcul când se sperie?', options: ['sub o floare', 'în iarbă', 'în cochilie'], answer: 2 },
      { q: 'Melcul merge repede.', answer: 1 },
    ],
  },
  {
    title: 'La bunici',
    sentences: ['Vlad merge la bunici, la țară.', 'Bunica are găini și o vacă.', 'Vlad adună ouăle din cuibar.', 'Seara, bunicul îi spune o poveste.'],
    questions: [
      { q: 'Unde merge Vlad?', options: ['la mare', 'la bunici', 'la munte'], answer: 1 },
      { q: 'Ce adună Vlad din cuibar?', options: ['ouăle', 'merele', 'florile'], answer: 0 },
      { q: 'Cine îi spune lui Vlad o poveste?', options: ['tata', 'mama', 'bunicul'], answer: 2 },
      { q: 'Bunica are găini și o vacă.', answer: 0 },
    ],
  },
  {
    title: 'Toamna în parc',
    sentences: ['A venit toamna.', 'Frunzele cad din copaci.', 'Ilinca adună castane în parc.', 'Ea face din ele un lanț lung.'],
    questions: [
      { q: 'Ce cade din copaci?', options: ['frunzele', 'merele', 'nucile'], answer: 0 },
      { q: 'Ce adună Ilinca?', options: ['ghinde', 'castane', 'flori'], answer: 1 },
      { q: 'Unde adună Ilinca castane?', options: ['în curte', 'în pădure', 'în parc'], answer: 2 },
      { q: 'Ilinca face un lanț scurt.', answer: 1 },
    ],
  },
  {
    title: 'La școală',
    sentences: ['Sara merge la școală cu ghiozdanul în spate.', 'În clasă, ea scrie și citește.', 'În pauză, se joacă în curte cu Dan.', 'La prânz, mama o așteaptă la poartă.'],
    questions: [
      { q: 'Ce are Sara în spate?', options: ['ghiozdanul', 'umbrela', 'chitara'], answer: 0 },
      { q: 'Cu cine se joacă Sara în pauză?', options: ['cu Ana', 'cu Dan', 'cu Radu'], answer: 1 },
      { q: 'Cine o așteaptă pe Sara la poartă?', options: ['tata', 'bunica', 'mama'], answer: 2 },
      { q: 'În pauză, Sara se joacă în curte.', answer: 0 },
    ],
  },
  {
    title: 'Ariciul',
    picture: '🦔',
    sentences: ['Un arici trăiește sub un tufiș.', 'El are țepi pe spate.', 'Noaptea, ariciul caută râme și gândaci.', 'Iarna doarme într-un culcuș de frunze.'],
    questions: [
      { q: 'Unde trăiește ariciul?', options: ['sub un tufiș', 'într-un copac', 'pe un deal'], answer: 0 },
      { q: 'Ce are ariciul pe spate?', options: ['pene', 'solzi', 'țepi'], answer: 2 },
      { q: 'Când își caută ariciul hrana?', options: ['dimineața', 'noaptea', 'la prânz'], answer: 1 },
      { q: 'Iarna, ariciul doarme.', answer: 0 },
    ],
  },
  {
    title: 'Ploaia',
    sentences: ['Cerul este plin de nori.', 'Începe să plouă.', 'Radu își deschide umbrela.', 'El sare vesel peste o baltă.', 'Apoi apare curcubeul.'],
    questions: [
      { q: 'Cum este cerul?', options: ['senin', 'plin de nori', 'plin de stele'], answer: 1 },
      { q: 'Ce își deschide Radu?', options: ['umbrela', 'ghiozdanul', 'cartea'], answer: 0 },
      { q: 'Peste ce sare Radu?', options: ['peste un gard', 'peste o piatră', 'peste o baltă'], answer: 2 },
      { q: 'La sfârșit apare curcubeul.', answer: 0 },
    ],
  },
  {
    title: 'Mărțișorul',
    sentences: ['Este întâi martie.', 'Irina face un mărțișor pentru mama.', 'Ea leagă un fluture mic cu un șnur alb și roșu.', 'Mama îl prinde la haină și zâmbește.'],
    questions: [
      { q: 'Pentru cine face Irina mărțișorul?', options: ['pentru bunica', 'pentru mama', 'pentru sora ei'], answer: 1 },
      { q: 'Ce culori are șnurul?', options: ['alb și roșu', 'galben și verde', 'roșu și negru'], answer: 0 },
      { q: 'Unde prinde mama mărțișorul?', options: ['la pălărie', 'la geantă', 'la haină'], answer: 2 },
      { q: 'Mărțișorul are forma unei flori.', answer: 1 },
    ],
  },
  // clasa a II-a (sets 14–20): five to eight sentences, stories and informative texts
  {
    title: 'Rândunica',
    sentences: [
      'Rândunica este o pasăre mică, cu coada despicată.',
      'Ea își face cuibul din noroi, sub streașina caselor.',
      'Se hrănește cu insecte pe care le prinde din zbor.',
      'Toamna, când se face frig, rândunelele pleacă spre țările calde.',
      'Ele zboară mii de kilometri.',
      'Primăvara se întorc la același cuib.',
    ],
    questions: [
      { q: 'Din ce își face rândunica cuibul?', options: ['din paie', 'din noroi', 'din crengi'], answer: 1 },
      { q: 'Cu ce se hrănește rândunica?', options: ['cu semințe', 'cu fructe', 'cu insecte'], answer: 2 },
      { q: 'Când pleacă rândunelele spre țările calde?', options: ['toamna', 'iarna', 'vara'], answer: 0 },
      { q: 'Primăvara, rândunelele se întorc la același cuib.', answer: 0 },
    ],
  },
  {
    title: 'Cartea din bibliotecă',
    picture: '📚',
    sentences: [
      'Joi, clasa a II-a a mers la biblioteca școlii.',
      'Doamna bibliotecară le-a arătat copiilor rafturile cu povești.',
      'Tudor a ales o carte despre un pui de urs.',
      'El a completat o fișă și a primit cartea pentru două săptămâni.',
      'Acasă, a citit în fiecare seară câte un capitol.',
      'Când a terminat-o, le-a povestit colegilor ce i-a plăcut cel mai mult.',
    ],
    questions: [
      { q: 'În ce zi a mers clasa la bibliotecă?', options: ['luni', 'joi', 'vineri'], answer: 1 },
      { q: 'Despre ce era cartea aleasă de Tudor?', options: ['despre un pui de urs', 'despre un pui de lup', 'despre un cățel'], answer: 0 },
      { q: 'Pentru cât timp a primit Tudor cartea?', options: ['pentru două zile', 'pentru o lună', 'pentru două săptămâni'], answer: 2 },
      { q: 'Tudor a citit cartea la școală.', answer: 1 },
    ],
  },
  {
    title: 'Apa',
    picture: '💧',
    sentences: [
      'Apa este foarte importantă pentru viață.',
      'Oamenii, animalele și plantele au nevoie de ea în fiecare zi.',
      'Apa de băut vine din izvoare, din râuri și din lacuri.',
      'Înainte să ajungă la robinet, ea este curățată.',
      'Putem economisi apa dacă închidem robinetul când ne spălăm pe dinți.',
      'Un duș scurt consumă mai puțină apă decât o baie în cadă.',
    ],
    questions: [
      { q: 'Pentru ce este importantă apa?', options: ['pentru viață', 'pentru joacă', 'pentru sport'], answer: 0 },
      { q: 'Ce se întâmplă cu apa înainte să ajungă la robinet?', options: ['este încălzită', 'este colorată', 'este curățată'], answer: 2 },
      { q: 'Ce consumă mai puțină apă decât o baie?', options: ['un duș lung', 'un duș scurt', 'spălatul mașinii'], answer: 1 },
      { q: 'Apa de băut vine doar din mare.', answer: 1 },
    ],
  },
  {
    title: 'La săniuș',
    picture: '🛷',
    sentences: [
      'Peste noapte a nins mult.',
      'Dimineața, dealul din spatele blocului era alb.',
      'Irina și fratele ei, Matei, și-au luat săniile și au urcat până sus.',
      'La prima coborâre, sania lui Matei s-a răsturnat într-un troian.',
      'Băiatul s-a ridicat plin de zăpadă și a început să râdă.',
      'După o oră, cei doi s-au întors acasă cu obrajii roșii.',
      'Mama îi aștepta cu ceai cald și plăcintă.',
    ],
    questions: [
      { q: 'Când a nins?', options: ['peste noapte', 'la prânz', 'spre seară'], answer: 0 },
      { q: 'Ce s-a întâmplat cu sania lui Matei?', options: ['s-a rupt', 's-a răsturnat', 's-a pierdut'], answer: 1 },
      { q: 'Cu ce îi aștepta mama pe copii?', options: ['cu lapte și biscuiți', 'cu supă caldă', 'cu ceai cald și plăcintă'], answer: 2 },
      { q: 'Matei a plâns când a căzut.', answer: 1 },
    ],
  },
  {
    title: 'Pădurea',
    picture: '🌲',
    sentences: [
      'Pădurea este casa multor viețuitoare.',
      'În copaci își fac cuib păsările și veverițele.',
      'Printre rădăcini trăiesc furnici, melci și arici.',
      'Copacii curăță aerul și țin umbră în zilele călduroase.',
      'Din lemnul lor, oamenii fac mobilă, hârtie și creioane.',
      'De aceea trebuie să avem grijă de pădure și să nu lăsăm gunoaie în ea.',
    ],
    questions: [
      { q: 'Cine își face cuib în copaci?', options: ['păsările și veverițele', 'urșii și lupii', 'peștii și broaștele'], answer: 0 },
      { q: 'Ce curăță copacii?', options: ['apa', 'aerul', 'pământul'], answer: 1 },
      { q: 'Ce fac oamenii din lemn?', options: ['haine și pantofi', 'pâine și prăjituri', 'mobilă, hârtie și creioane'], answer: 2 },
      { q: 'În pădure putem lăsa gunoaie.', answer: 1 },
    ],
  },
  {
    title: 'Clătitele',
    sentences: [
      'Duminică dimineața, tata și Ilinca au făcut clătite.',
      'Ilinca a spart două ouă într-un castron și a turnat lapte.',
      'Tata a adăugat făina și a amestecat bine.',
      'Prima clătită s-a lipit de tigaie, dar următoarele au ieșit rumene.',
      'Fetița le-a umplut cu dulceață de caise.',
      'Când s-a trezit, mama a găsit masa pusă.',
    ],
    questions: [
      { q: 'Cine a făcut clătitele?', options: ['mama și Ilinca', 'tata și Ilinca', 'bunica și Ilinca'], answer: 1 },
      { q: 'Câte ouă a spart Ilinca?', options: ['două', 'trei', 'patru'], answer: 0 },
      { q: 'Cu ce au fost umplute clătitele?', options: ['cu ciocolată', 'cu brânză', 'cu dulceață de caise'], answer: 2 },
      { q: 'Prima clătită s-a lipit de tigaie.', answer: 0 },
    ],
  },
  {
    title: 'Ziua recoltei',
    picture: '🎃',
    sentences: [
      'În fiecare toamnă, în satul bunicilor se ține Ziua recoltei.',
      'Oamenii aduc în piață dovleci, mere, struguri și borcane cu miere.',
      'Copiii împodobesc o căruță cu spice și frunze ruginii.',
      'Cel mai mare dovleac primește un premiu.',
      'La sfârșit, toată lumea joacă hora în mijlocul satului.',
      'Anul acesta, dovleacul bunicului a cântărit treizeci de kilograme.',
    ],
    questions: [
      { q: 'Când se ține Ziua recoltei?', options: ['în fiecare toamnă', 'în fiecare vară', 'în fiecare iarnă'], answer: 0 },
      { q: 'Ce primește cel mai mare dovleac?', options: ['o diplomă', 'un premiu', 'o medalie'], answer: 1 },
      { q: 'Cu ce împodobesc copiii căruța?', options: ['cu baloane', 'cu flori și panglici', 'cu spice și frunze ruginii'], answer: 2 },
      { q: 'Dovleacul bunicului a cântărit treizeci de kilograme.', answer: 0 },
    ],
  },
];
