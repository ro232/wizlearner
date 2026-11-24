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

