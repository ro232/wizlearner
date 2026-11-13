import { describe, expect, it } from 'vitest';
import { buildGroupPages, parseNameList, parseNames, MAX_CHILDREN } from '@/lib/worksheet/group';

describe('the pasted list of children', () => {
  it('splits on new lines, commas, semicolons and tabs', () => {
    expect(parseNames('Ana\nLuca\r\nMaria')).toEqual(['Ana', 'Luca', 'Maria']);
    expect(parseNames('Ana, Luca; Maria')).toEqual(['Ana', 'Luca', 'Maria']);
    expect(parseNames('Ana\tLuca\tMaria-Ioana')).toEqual(['Ana', 'Luca', 'Maria-Ioana']);
  });

  it('reads a table copied from the register or from Excel: one child per row', () => {
    expect(parseNames('1\tPopescu Ana\t5 ani\n2\tIonescu Luca\t5 ani')).toEqual(['Popescu Ana', 'Ionescu Luca']);
    expect(parseNames('1.\tPopescu\tAna\t12.03.2021\n2.\tIonescu\tLuca\t01.09.2021\n')).toEqual(['Popescu Ana', 'Ionescu Luca']);
    expect(parseNames('1 Ana Popescu\n2. Luca\n3) Maria\n4 - Ilinca')).toEqual(['Ana Popescu', 'Luca', 'Maria', 'Ilinca']);
  });

  it('keeps two children with the same name, and says so', () => {
    const list = parseNameList('Maria\nLuca\nmaria\nMARIA\nLuca\nAna');
    expect(list.names).toEqual(['Maria', 'Luca', 'maria', 'MARIA', 'Luca', 'Ana']);
    expect(list.keys).toEqual(['Maria', 'Luca', 'maria#2', 'MARIA#3', 'Luca#2', 'Ana']);
    expect(new Set(list.keys).size).toBe(list.keys.length);
    expect(list.repeated).toEqual([{ name: 'Maria', count: 3 }, { name: 'Luca', count: 2 }]);
    expect(parseNameList('Ana\nLuca').repeated).toEqual([]);
  });

  it('each namesake gets a sheet, and a level of their own', () => {
    const list = parseNameList('Maria\nMaria\nLuca');
    const base = { names: list.names, keys: list.keys, themeId: 'toamna', letters: ['A'], letterMode: 'uppercase' as const, difficulty: 'beginner' as const };
    const same = buildGroupPages(base);
    expect(same.perChild).toEqual([1, 1, 1]);
    expect(JSON.stringify(same.pages[0])).toBe(JSON.stringify(same.pages[1]));
    const mixed = buildGroupPages({ ...base, levels: { 'Maria#2': 'advanced' } });
    expect(JSON.stringify(mixed.pages[0])).toBe(JSON.stringify(same.pages[0]));
    expect(JSON.stringify(mixed.pages[1])).not.toBe(JSON.stringify(same.pages[1]));
    expect(JSON.stringify(mixed.pages[2])).toBe(JSON.stringify(same.pages[2]));
  });

  it('counts the whole list when it passes the cap', () => {
    const list = parseNameList(Array.from({ length: 45 }, (_, i) => `Copil ${String.fromCharCode(65 + (i % 26))}${i > 25 ? 'a' : ''}`).join('\n'));
    expect(list.names).toHaveLength(MAX_CHILDREN);
    expect(list.total).toBe(45);
    expect(parseNameList('Ana\n\n ,; \nLuca').total).toBe(2);
    expect(parseNameList('').names).toEqual([]);
  });
});
