import { describe, expect, it } from 'vitest';
import { alese, copii, countOf, needsDe, pagini } from '@/components/worksheet/plural';

describe('Romanian counts', () => {
  it('adds „de” from 20 up, but not after 01–19', () => {
    const withDe = [20, 21, 25, 31, 40, 60, 99, 100, 120, 200, 1000];
    const without = [0, 2, 3, 9, 10, 11, 19, 101, 102, 110, 119, 201, 1019];
    for (const n of withDe) expect(needsDe(n), String(n)).toBe(true);
    for (const n of without) expect(needsDe(n), String(n)).toBe(false);
  });

  it('writes pages and children', () => {
    expect(pagini(1)).toBe('1 pagină');
    expect(pagini(9)).toBe('9 pagini');
    expect(pagini(19)).toBe('19 pagini');
    expect(pagini(20)).toBe('20 de pagini');
    expect(pagini(31)).toBe('31 de pagini');
    expect(pagini(60)).toBe('60 de pagini');
    expect(pagini(101)).toBe('101 pagini');
    expect(copii(1)).toBe('1 copil');
    expect(copii(2)).toBe('2 copii');
    expect(copii(25)).toBe('25 de copii');
    expect(copii(40)).toBe('40 de copii');
    expect(countOf(0, 'copil', 'copii')).toBe('0 copii');
  });

  it('agrees „ales” with what was picked', () => {
    expect(alese(0)).toBe('0 alese');
    expect(alese(1)).toBe('1 aleasă');
    expect(alese(1, 'n')).toBe('1 ales');
    expect(alese(3)).toBe('3 alese');
    expect(alese(21, 'n')).toBe('21 alese');
  });
});
