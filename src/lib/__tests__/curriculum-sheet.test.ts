import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { findCompetence } from '@/lib/curriculum';
import { SCHOOL_LEVELS, sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { MATH_TYPES } from '@/lib/worksheet/math';

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, ...over });
const LEVELS = SCHOOL_LEVELS.map((l) => l.id);

describe('curriculum competence of a sheet', () => {
  it('no class chosen → no label, nothing printed', () => {
    const c = cfg({ category: 'letters', selectedItems: ['A'] });
    expect(sheetCompetenceLabel(c, undefined)).toBeNull();
    const ops = buildWorksheetPages(c, 'full')[0].ops;
    expect(ops.some((o) => o.t === 'text' && /Competen|Comportament/.test(o.text))).toBe(false);
  });

  it('print letters', () => {
    const c = cfg({ category: 'letters', selectedItems: ['A'] });
    expect(sheetCompetenceLabel(c, 'presc')).toBe('Comportament D 3.4 · Educație timpurie, nivel preșcolar');
    expect(sheetCompetenceLabel(c, 'CP')).toBe('Competența 4.1 · Comunicare în limba română, clasa pregătitoare');
    // print letters are not written in clasa I / a II-a: no loose code
    expect(sheetCompetenceLabel(c, 'I')).toBeNull();
    expect(sheetCompetenceLabel(c, 'II')).toBeNull();
  });

  it('handwriting', () => {
    const letters = cfg({ category: 'letters', script: 'cursive', selectedItems: ['a'] });
    expect(sheetCompetenceLabel(letters, 'I')).toBe('Competența 4.1 · Comunicare în limba română, clasa I');
    expect(sheetCompetenceLabel(letters, 'presc')).toBeNull();
    expect(sheetCompetenceLabel(letters, 'II')).toBeNull(); // single letters are not „scrierea unor mesaje”
    const words = cfg({ category: 'letters', script: 'cursive', selectedItems: [], customWords: ['mama'] });
    expect(sheetCompetenceLabel(words, 'II')).toBe('Competența 4.1 · Comunicare în limba română, clasa a II-a');
  });

  it('math: codes per exercise, within the class number range', () => {
    const c = cfg({ category: 'math', selectedItems: ['cmp', 'add'], mathRange: 10 });
    expect(sheetCompetenceLabel(c, 'CP')).toBe('Competențele 1.2, 1.4 · Matematică și explorarea mediului, clasa pregătitoare');
    // 0–100 is beyond clasa pregătitoare (0–31): no code
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['add'], mathRange: 100 }), 'CP')).toBeNull();
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['add'], mathRange: 100 }), 'I')).toBe(
      'Competența 1.4 · Matematică și explorarea mediului, clasa I',
    );
    // operations are not a preschool behaviour; comparing is (E 2.1)
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['add'], mathRange: 10 }), 'presc')).toBeNull();
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['cmp'], mathRange: 5 }), 'presc')).toBe(
      'Comportament E 2.1 · Educație timpurie, nivel preșcolar',
    );
  });

  it('every code any sheet can print exists in the programme data', () => {
    const configs: WorksheetConfig[] = [
      cfg({ category: 'letters', selectedItems: ['A'] }),
      cfg({ category: 'letters', script: 'cursive', selectedItems: ['a'], customWords: ['mama'] }),
      cfg({ category: 'numbers', selectedItems: ['1'] }),
      cfg({ category: 'shapes', selectedItems: ['circle'] }),
      cfg({ category: 'prewrite', selectedItems: ['zigzag'] }),
      cfg({ category: 'games', selectedItems: ['find:A', 'count:5', 'dots:star'] }),
      ...MATH_TYPES.flatMap((t) => [5, 10, 20, 100].map((r) => cfg({ category: 'math', selectedItems: [t], mathRange: r }))),
    ];
    for (const c of configs) {
      for (const level of LEVELS as SchoolLevel[]) {
        const refs = sheetCompetences(c, level);
        for (const r of refs) expect(findCompetence(r), `${c.category} ${c.selectedItems} ${level} ${r.code}`).toBeDefined();
        expect(new Set(refs.map((r) => r.programme)).size).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the label is printed on every page, bottom left, clear of the page number', () => {
    const c = cfg({ category: 'letters', selectedItems: ['A', 'B', 'C', 'D', 'E'], rowsPerPage: 2, fillPage: false, curriculumLevel: 'CP' });
    const pages = buildWorksheetPages(c, 'full');
    expect(pages.length).toBeGreaterThan(1);
    for (const p of pages) {
      const label = p.ops.find((o) => o.t === 'text' && o.text.startsWith('Competența 4.1'));
      expect(label).toBeDefined();
      if (label && label.t === 'text') {
        expect(label.x).toBe(12);
        expect(label.y).toBeGreaterThan(p.height - 12);
      }
    }
  });
});
