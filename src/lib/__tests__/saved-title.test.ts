import { describe, expect, it } from 'vitest';
import { configForSaving, defaultSheetName, isChildName } from '@/lib/worksheet/saved';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { normalizeKey } from '@/lib/glyphs/data';

const sheet = (patch: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, ...patch });
const fold = (s: string) => normalizeKey(s).toLocaleLowerCase('ro');

/** Everything that would leave the browser for the account. */
const sent = (c: WorksheetConfig) => fold(`${defaultSheetName(c)} ${JSON.stringify(configForSaving(c))}`);

describe('the child’s name never leaves the browser with a sheet', () => {
  const NAMES = ['Maria Popescu', 'Ionuț', 'Ştefan', 'Ștefan', 'ȘTEFAN', 'ana-maria', 'Țuțu', 'Ţuţu', 'Luca'];

  it.each(NAMES)('title and saved settings without „%s”', (name) => {
    const first = name.split(/[\s-]/)[0];
    const spellings = [name, name.toUpperCase(), name.toLowerCase(), normalizeKey(name), `  ${name} `, first, first.toUpperCase(), name.replace(/ș/g, 'ş').replace(/ț/g, 'ţ').replace(/Ș/g, 'Ş').replace(/Ț/g, 'Ţ')];
    for (const traced of spellings) {
      // „Trasează-l”, „Fișă nouă” from „Copiii mei”, the guided start
      const c = sheet({ childName: name, selectedItems: ['A', 'B'], customWords: [traced, 'BEC'], wordPictures: { [traced]: '🙂', BEC: '💡' } });
      const out = sent(c);
      for (const part of fold(name).split(/[\s-]+/)) expect(out, `${name} / ${traced}`).not.toContain(part);
      expect(defaultSheetName(c)).toBe('Litere: A, B, BEC');
      expect(configForSaving(c).customWords).toEqual(['BEC']);
      expect(configForSaving(c).childName).toBe('');
    }
  });

  it('the exact cases from the audit', () => {
    expect(defaultSheetName(sheet({ childName: 'Ionuț', selectedItems: ['A', 'B'], customWords: ['Ionuț'] }))).toBe('Litere: A, B');
    expect(defaultSheetName(sheet({ childName: 'Maria Popescu', customWords: ['Maria Popescu'] }))).toBe('Litere');
  });

  it('a title that quotes the name is dropped, others are kept', () => {
    expect(configForSaving(sheet({ childName: 'Ștefan', customTitle: 'Numele meu: ŞTEFAN' })).customTitle).toBe('');
    expect(configForSaving(sheet({ childName: 'Ana Pop', customTitle: 'Fișa Anei' })).customTitle).toBe('Fișa Anei');
    expect(configForSaving(sheet({ childName: 'Ana Pop', customTitle: 'Pentru ana' })).customTitle).toBe('');
    expect(configForSaving(sheet({ childName: 'Ana', customTitle: 'Litera Mm' })).customTitle).toBe('Litera Mm');
    expect(configForSaving(sheet({ childName: '', customTitle: 'Numele meu', customWords: ['MAMA'] }))).toMatchObject({ customTitle: 'Numele meu', customWords: ['MAMA'] });
  });

  it('does not mistake letters and other words for the name', () => {
    expect(isChildName('A', 'A. Popescu')).toBe(false);
    expect(isChildName('MAMA', 'Maria')).toBe(false);
    expect(isChildName('maria', 'Maria Popescu')).toBe(true);
    const c = sheet({ childName: 'Ana', selectedItems: ['A', 'N'], customWords: ['ANANAS'] });
    expect(defaultSheetName(c)).toBe('Litere: A, N, ANANAS');
  });

  it('names sheets in words, not internal ids', () => {
    expect(defaultSheetName(sheet({ category: 'math', selectedItems: ['add', 'cmp'], childName: 'Ada', customWords: ['Ada'] }))).toBe('Matematică: Adunări, Compară numerele');
    expect(defaultSheetName(sheet({ category: 'games', selectedItems: ['find:A'] }))).toBe('Jocuri: Găsește A');
    expect(defaultSheetName(sheet({ category: 'numbers', selectedItems: ['1', '2'], customWords: ['Ana'] }))).toBe('Cifre: 1, 2');
    expect(defaultSheetName(sheet({}))).toBe('Litere');
  });
});
