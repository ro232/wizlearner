/**
 * The Romanian number words from 0 to 1000, as they are written in clasa a II-a („Numerele naturale
 * 0-1000: recunoaștere, formare, citire, scriere, (cu cifre și litere)”): the counting forms, which are
 * also the forms of the dictionary (DOOM 3):
 *
 * - 1–19: unu, doi … nouă, zece, unsprezece, doisprezece, treisprezece, paisprezece, cincisprezece,
 *   șaisprezece, șaptesprezece, optsprezece, nouăsprezece;
 * - the tens: douăzeci, treizeci, patruzeci, cincizeci, șaizeci, șaptezeci, optzeci, nouăzeci, joined
 *   to the units by „și” („douăzeci și unu”, „nouăzeci și nouă”);
 * - the hundreds are feminine: „o sută”, „două sute”, „trei sute” … „nouă sute”, then the rest after a
 *   space, without „și” („o sută unu”, „două sute douăzeci și patru”, „trei sute zece”);
 * - 1000: „o mie”.
 */

const UNITS = ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
const TEENS = ['zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'];
const TENS = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'];
/** The hundreds: feminine („o sută”, „două sute”). */
const HUNDREDS = ['', 'o sută', 'două sute', 'trei sute', 'patru sute', 'cinci sute', 'șase sute', 'șapte sute', 'opt sute', 'nouă sute'];

/** 0–99 as counted. */
function below100(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${TENS[t]} și ${UNITS[u]}` : TENS[t];
}

/** How a number from 0 to 1000 is written in words: „trei sute douăzeci și patru”, „o sută doisprezece”, „o mie”. */
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1000) throw new Error(`numberWords: ${n}`);
  if (n === 1000) return 'o mie';
  if (n < 100) return below100(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return rest ? `${HUNDREDS[h]} ${below100(rest)}` : HUNDREDS[h];
}


/**
 * The feminine forms of 1–99, as a count of „mii” (thousands are feminine, like „sute”): „o mie”, „două mii”,
 * „douăsprezece mii”, „douăzeci și una de mii”, „douăzeci și două de mii” (DOOM 3: „douăzeci și una de mii”).
 */
function below100Feminine(n: number): string {
  if (n === 1) return 'una';
  if (n === 2) return 'două';
  if (n === 12) return 'douăsprezece';
  if (n < 20) return below100(n);
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (u === 1) return `${TENS[t]} și una`;
  if (u === 2) return `${TENS[t]} și două`;
  return below100(n);
}

/** 1–999 as a count of thousands: the hundreds as they are, the rest feminine („două sute douăsprezece”). */
function thousandsCount(k: number): string {
  const h = Math.floor(k / 100);
  const rest = k % 100;
  const tail = rest ? below100Feminine(rest) : '';
  return h ? (rest ? `${HUNDREDS[h]} ${tail}` : HUNDREDS[h]) : tail;
}

/**
 * Whether the words of a number are ones a textbook prints the same way everywhere. Counts of thousands that end in
 * 01 or 02 after a hundred („o sută una mii” / „o sută una de mii”, „două sute două mii”) are written both ways in
 * print: the sheets never ask for them (see numberWordsLarge).
 */
export function hasSettledWords(n: number): boolean {
  const k = Math.floor(n / 1000);
  return !(k > 100 && (k % 100 === 1 || k % 100 === 2));
}

/**
 * How a number from 0 to 1 000 000 is written in words, as in clasa a III-a and a IV-a („formare, citire, scriere”):
 * - 0–1000 as numberWords;
 * - the thousands feminine: „o mie”, „două mii”, „unsprezece mii”, „douăsprezece mii”, „douăzeci de mii”,
 *   „douăzeci și una de mii”, „o sută de mii”, „trei sute cincisprezece mii”;
 * - „de” before „mii” when the count is 20 or more and does not end in 01–19 (as for any noun: „20 de mii”, „115 mii”);
 * - then the rest after a space, without „și”: „patru mii trei sute cincizeci și doi”, „o mie unu”;
 * - 1 000 000: „un milion”.
 */
export function numberWordsLarge(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1000000) throw new Error(`numberWordsLarge: ${n}`);
  if (n === 1000000) return 'un milion';
  if (n <= 1000) return numberWords(n);
  const k = Math.floor(n / 1000);
  const rest = n % 1000;
  const lastTwo = k % 100;
  const de = k >= 20 && (lastTwo === 0 || lastTwo >= 20);
  const thousands = k === 1 ? 'o mie' : `${thousandsCount(k)} ${de ? 'de ' : ''}mii`;
  return rest ? `${thousands} ${numberWords(rest)}` : thousands;
}
