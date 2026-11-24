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
    expect(sheetCompetenceLabel(c, 'presc')).toBe('Comportament vizat D.3.4 · Curriculum pentru educație timpurie, nivel preșcolar');
    expect(sheetCompetenceLabel(c, 'CP')).toBe('Competența specifică 4.1 · Comunicare în limba română, clasa pregătitoare');
    // print letters are not written in clasa I / a II-a: no loose code
    expect(sheetCompetenceLabel(c, 'I')).toBeNull();
    expect(sheetCompetenceLabel(c, 'II')).toBeNull();
  });

  it('handwriting', () => {
    const letters = cfg({ category: 'letters', script: 'cursive', selectedItems: ['a'] });
    expect(sheetCompetenceLabel(letters, 'I')).toBe('Competența specifică 4.1 · Comunicare în limba română, clasa I');
    expect(sheetCompetenceLabel(letters, 'presc')).toBeNull();
    expect(sheetCompetenceLabel(letters, 'CP')).toBeNull(); // handwriting letters start in clasa I
    expect(sheetCompetenceLabel(letters, 'II')).toBeNull(); // traced letters are not „scrierea unor mesaje”
    const words = cfg({ category: 'letters', script: 'cursive', selectedItems: [], customWords: ['mama'] });
    expect(sheetCompetenceLabel(words, 'II')).toBeNull(); // nor is a traced word
  });

  it('math: codes per exercise, within the class number range', () => {
    const c = cfg({ category: 'math', selectedItems: ['cmp', 'add'], mathRange: 10 });
    expect(sheetCompetenceLabel(c, 'CP')).toBe('Competențele specifice 1.2, 1.4 · Matematică și explorarea mediului, clasa pregătitoare');
    // CP adds or takes away 1–5 elements: 0–20 operations get no code, comparing still does
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['cmp', 'add'], mathRange: 20 }), 'CP')).toBe(
      'Competența specifică 1.2 · Matematică și explorarea mediului, clasa pregătitoare',
    );
    // 0–100 is beyond clasa pregătitoare (0–31): no code
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['add'], mathRange: 100 }), 'CP')).toBeNull();
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['add'], mathRange: 100 }), 'I')).toBe(
      'Competența specifică 1.4 · Matematică și explorarea mediului, clasa I',
    );
    // neither operations nor the signs <, >, = are preschool behaviours; sequences are (E 2.1)
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['add'], mathRange: 10 }), 'presc')).toBeNull();
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['cmp'], mathRange: 5 }), 'presc')).toBeNull();
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['seq'], mathRange: 10 }), 'presc')).toBe(
      'Comportament vizat E.2.1 · Curriculum pentru educație timpurie, nivel preșcolar',
    );
  });

  it('math 0–31 and money (Bani) follow the programme texts', () => {
    const at = (over: Partial<WorksheetConfig>, level: SchoolLevel) => sheetCompetences(cfg({ category: 'math', ...over }), level).map((r) => `${r.level} ${r.code}`);
    // 0–31 operations always add or take away 1–5: CP 1.4
    expect(at({ selectedItems: ['add', 'sub', 'mix', 'missing', 'addpic'], mathRange: 31 }, 'CP')).toEqual(['CP 1.4']);
    expect(at({ selectedItems: ['cmp', 'seq', 'nbr'], mathRange: 31 }, 'CP')).toEqual(['CP 1.2', 'CP 1.3']);
    expect(at({ selectedItems: ['add'], mathRange: 31, mathCarry: 'with' }, 'CP')).toEqual(['CP 1.4']);
    // 0–20 sums are not limited to 1–5: still no CP code for them
    expect(at({ selectedItems: ['add'], mathRange: 20 }, 'CP')).toEqual([]);
    expect(at({ selectedItems: ['add'], mathRange: 31 }, 'I')).toEqual(['I 1.4']);
    expect(at({ selectedItems: ['add'], mathRange: 31 }, 'presc')).toEqual([]);
    // money: CP 6.3 up to 31, I 6.3 up to 100, II 6.3 only for 0–1000 (the sheet with 200 and 500 de lei); not preschool
    expect(at({ selectedItems: ['money'], mathRange: 10 }, 'CP')).toEqual(['CP 6.3']);
    expect(at({ selectedItems: ['money'], mathRange: 31 }, 'CP')).toEqual(['CP 6.3']);
    expect(at({ selectedItems: ['money'], mathRange: 100 }, 'CP')).toEqual([]);
    expect(at({ selectedItems: ['money'], mathRange: 100 }, 'I')).toEqual(['I 6.3']);
    expect(at({ selectedItems: ['money'], mathRange: 10 }, 'presc')).toEqual([]);
    expect(at({ selectedItems: ['money'], mathRange: 100 }, 'II')).toEqual([]);
    expect(at({ selectedItems: ['money'], mathRange: 1000 }, 'II')).toEqual(['II 6.3']);
    expect(at({ selectedItems: ['money'], mathRange: 1000 }, 'I')).toEqual([]);
    expect(sheetCompetenceLabel(cfg({ category: 'math', selectedItems: ['add', 'money'], mathRange: 31 }), 'CP')).toBe(
      'Competențele specifice 1.4, 6.3 · Matematică și explorarea mediului, clasa pregătitoare',
    );
  });

  it('shapes, digits and games follow the programme texts', () => {
    // CP and clasa I name only pătrat, triunghi, dreptunghi, cerc
    expect(sheetCompetenceLabel(cfg({ category: 'shapes', selectedItems: ['circle', 'square'] }), 'CP')).toBe(
      'Competența specifică 2.2 · Matematică și explorarea mediului, clasa pregătitoare',
    );
    expect(sheetCompetenceLabel(cfg({ category: 'shapes', selectedItems: ['circle', 'star'] }), 'CP')).toBeNull();
    expect(sheetCompetenceLabel(cfg({ category: 'shapes', selectedItems: ['star'] }), 'presc')).toBe(
      'Comportament vizat E.2.2 · Curriculum pentru educație timpurie, nivel preșcolar',
    );
    expect(sheetCompetenceLabel(cfg({ category: 'numbers', selectedItems: ['1'] }), 'II')).toBeNull();
    expect(sheetCompetenceLabel(cfg({ category: 'games', selectedItems: ['find:A'] }), 'presc')).toBe(
      'Comportament vizat D.3.4 · Curriculum pentru educație timpurie, nivel preșcolar',
    );
    expect(sheetCompetenceLabel(cfg({ category: 'games', selectedItems: ['dots:star'] }), 'presc')).toBeNull();
  });

  it('every code any sheet can print exists in the programme data', () => {
    const configs: WorksheetConfig[] = [
      cfg({ category: 'letters', selectedItems: ['A'] }),
      cfg({ category: 'letters', script: 'cursive', selectedItems: ['a'], customWords: ['mama'] }),
      cfg({ category: 'numbers', selectedItems: ['1'] }),
      cfg({ category: 'shapes', selectedItems: ['circle'] }),
      cfg({ category: 'shapes', selectedItems: ['circle', 'heart'] }),
      cfg({ category: 'prewrite', selectedItems: ['zigzag'] }),
      cfg({ category: 'games', selectedItems: ['find:A', 'count:5', 'dots:star'] }),
      ...MATH_TYPES.flatMap((t) => [5, 10, 20, 31, 100, 1000].map((r) => cfg({ category: 'math', selectedItems: [t], mathRange: r }))),
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
      const label = p.ops.find((o) => o.t === 'text' && o.text.startsWith('Competența specifică 4.1'));
      expect(label).toBeDefined();
      if (label && label.t === 'text') {
        expect(label.x).toBe(12);
        expect(label.y).toBeGreaterThan(p.height - 12);
      }
    }
  });
});
