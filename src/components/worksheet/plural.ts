/**
 * Romanian counts, written the way they are said:
 *   1 pagină · 2 pagini · 19 pagini · 20 de pagini · 31 de pagini · 101 pagini · 120 de pagini
 * From 20 up the noun takes „de”, except when the last two digits are 01–19.
 */
export function needsDe(n: number): boolean {
  const abs = Math.abs(Math.trunc(n));
  const lastTwo = abs % 100;
  return abs >= 20 && (lastTwo === 0 || lastTwo >= 20);
}

/** "1 pagină", "3 pagini", "25 de pagini". */
export function countOf(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  return `${n} ${needsDe(n) ? 'de ' : ''}${many}`;
}

export const pagini = (n: number) => countOf(n, 'pagină', 'pagini');
export const copii = (n: number) => countOf(n, 'copil', 'copii');
export const fise = (n: number) => countOf(n, 'fișă', 'fișe');
export const litere = (n: number) => countOf(n, 'literă', 'litere');
export const randuri = (n: number) => countOf(n, 'rând', 'rânduri');

/**
 * "1 aleasă" / "3 alese" for what was picked (litere, cifre, forme: feminine);
 * "1 ales" / "3 alese" for the neuter ones (exerciții, jocuri).
 */
export function alese(n: number, gender: 'f' | 'n' = 'f'): string {
  return n === 1 ? `1 ${gender === 'f' ? 'aleasă' : 'ales'}` : `${n} alese`;
}
