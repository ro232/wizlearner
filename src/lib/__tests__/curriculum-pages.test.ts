import { describe, expect, it } from 'vitest';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage, presetById, presetConfig, presetHref } from '@/lib/curriculum/presets';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { buildGroupPages, childSheetConfig } from '@/lib/worksheet/group';

describe('„Fișe pe programă” pages', () => {
  it('every preset builds a real sheet for every class', () => {
    for (const p of SHEET_PRESETS) for (const c of CLASS_PAGES) {
      const pages = buildWorksheetPages(presetConfig(p, c.level), 'full');
      expect(pages.length, `${p.id} ${c.slug}`).toBeGreaterThan(0);
    }
  });

  it('a sheet listed under a competence prints that very code', () => {
    for (const c of CLASS_PAGES) {
      for (const g of classCoverage(c)) for (const it of g.items) for (const p of it.presets) {
        const label = sheetCompetenceLabel(presetConfig(p, c.level), c.level);
        expect(label, `${p.id} ${c.slug} ${it.code}`).toContain(it.code);
      }
    }
  });

  it('coverage lists each competence of the class once, verbatim from the data', () => {
    const cp = classCoverage(CLASS_PAGES.find((c) => c.slug === 'clasa-pregatitoare')!);
    expect(cp.map((g) => g.title)).toEqual(['Comunicare în limba română', 'Matematică și explorarea mediului']);
    expect(cp[0].items).toHaveLength(15);
    expect(cp[1].items).toHaveLength(17);
    const c41 = cp[0].items.find((i) => i.code === '4.1')!;
    expect(c41.competence.text).toBe('Trasarea elementelor grafice și a contururilor literelor, folosind resurse variate');
    expect(c41.presets.map((p) => p.id)).toEqual(expect.arrayContaining(['litere-tipar', 'grafisme']));
    const presc = classCoverage(CLASS_PAGES[0]);
    expect(presc.map((g) => g.title[0])).toEqual(['D', 'E']);
    expect(presc.flatMap((g) => g.items).every((i) => /^[DE]\.\d\.\d$/.test(i.code))).toBe(true);
  });

  it('links open the generator with a known sheet and class', () => {
    const p = presetById('mate-adunari')!;
    expect(presetHref(p, 'I')).toBe('/generator?fisa=mate-adunari&clasa=I');
    // class I math opens on 0–100, within the class
    expect(presetConfig(p, 'I').mathRange).toBe(100);
    expect(sheetCompetences(presetConfig(p, 'I'), 'I').every((r) => findCompetence(r))).toBe(true);
  });
});

describe('group sheets with a class', () => {
  it('each child sheet prints the competence of the class', () => {
    const opts = { themeId: undefined, letters: ['A'], letterMode: 'paired' as const, script: 'print' as const, difficulty: 'beginner' as const, curriculumLevel: 'CP' as const };
    expect(childSheetConfig('Ana', opts).curriculumLevel).toBe('CP');
    const has = (pg: { ops: { t: string; text?: string }[] }) => pg.ops.some((o) => o.t === 'text' && (o.text ?? '').startsWith('Competența specifică 4.1'));
    const { pages } = buildGroupPages({ names: ['Ana', 'Ion'], ...opts });
    expect(pages.length).toBe(2);
    expect(pages.every(has)).toBe(true);
    // with the weekly pack: the „find the letter” pages have no CP code (none fits), the sheets keep theirs
    const pack = buildGroupPages({ names: ['Ana', 'Ion'], ...opts, withFindPages: true }).pages;
    expect(pack.length).toBe(4);
    expect(pack.filter(has).length).toBe(2);
  });
});
