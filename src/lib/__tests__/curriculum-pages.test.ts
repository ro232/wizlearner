import { describe, expect, it } from 'vitest';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, HEADLINE_PROGRAMMES, SHEET_PRESETS, classCoverage, coverageCount, headlineItems, presetById, presetConfig, presetHref } from '@/lib/curriculum/presets';
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
    expect(cp.map((g) => g.title)).toEqual(['Comunicare în limba română', 'Matematică și explorarea mediului', 'Arte vizuale și abilități practice', 'Dezvoltare personală', 'Comunicare în limba modernă 1']);
    expect(cp.map((g) => g.items.length)).toEqual([15, 17, 9, 8, 8]);
    const c41 = cp[0].items.find((i) => i.code === '4.1')!;
    expect(c41.competence.text).toBe('Trasarea elementelor grafice și a contururilor literelor, folosind resurse variate');
    expect(c41.presets.map((p) => p.id)).toEqual(expect.arrayContaining(['litere-tipar', 'grafisme']));
    const presc = classCoverage(CLASS_PAGES[0]);
    expect(presc.map((g) => g.title[0])).toEqual(['D', 'E']);
    expect(presc.flatMap((g) => g.items).every((i) => /^[DE]\.\d\.\d$/.test(i.code))).toBe(true);
  });

  it('the headline counts limba română and matematică; the other subjects show their own count and say why', () => {
    expect(HEADLINE_PROGRAMMES).toEqual(['et-presc', 'clr-p-ii', 'mem-p-ii']);
    for (const c of CLASS_PAGES) {
      const groups = classCoverage(c);
      for (const g of groups) {
        expect(g.headline, `${c.slug} ${g.title}`).toBe(HEADLINE_PROGRAMMES.includes(g.programme));
        // a group counted apart explains why
        if (!g.headline) expect(g.note, `${c.slug} ${g.title}`).toMatch(/^Se lucrează|^O singură programă/);
      }
      // the headline is exactly the CLR + MEM (preschool: D + E) items, as before the new subjects
      expect(headlineItems(c)).toEqual(groups.filter((g) => g.headline).flatMap((g) => g.items));
    }
    const at = (slug: string) => classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!);
    // the groups of the new subjects: the competences per class, read from the programmes
    expect(at('clasa-1').filter((g) => !g.headline).map((g) => [g.programme, g.items.length])).toEqual([['avap-p-ii', 9], ['dp-p-ii', 8], ['lm-p-ii', 9]]);
    expect(at('clasa-2').filter((g) => !g.headline).map((g) => [g.programme, g.items.length])).toEqual([['avap-p-ii', 9], ['dp-p-ii', 8], ['lm-p-ii', 9]]);
    // and how many of them have a sheet (subjects-pages.ts; codes in curriculum/sheet.ts)
    const counts = (slug: string) => at(slug).filter((g) => !g.headline).map((g) => coverageCount(g.items));
    expect(counts('clasa-pregatitoare')).toEqual([{ covered: 2, total: 9 }, { covered: 4, total: 8 }, { covered: 1, total: 8 }]);
    expect(counts('clasa-1')).toEqual([{ covered: 2, total: 9 }, { covered: 4, total: 8 }, { covered: 1, total: 9 }]);
    expect(counts('clasa-2')).toEqual([{ covered: 0, total: 9 }, { covered: 1, total: 8 }, { covered: 1, total: 9 }]);
  });

  it('lists „Banii” under 6.3 (CP, I, II) and „Adunări 0–31” under CP 1.4 only', () => {
    const presetsAt = (slug: string, code: string) =>
      classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!)
        .find((g) => g.title === 'Matematică și explorarea mediului')!
        .items.find((i) => i.code === code)!
        .presets.map((p) => p.id);
    expect(presetsAt('clasa-pregatitoare', '6.3')).toEqual(['mate-bani']);
    expect(presetsAt('clasa-1', '6.3')).toEqual(['mate-bani']);
    expect(presetsAt('clasa-2', '6.3')).toEqual(['mate-bani']);
    expect(presetConfig(presetById('mate-bani')!, 'II').mathRange).toBe(1000);
    expect(presetsAt('clasa-pregatitoare', '1.4')).toContain('mate-adunari-31');
    expect(presetsAt('clasa-1', '1.4')).not.toContain('mate-adunari-31');
    expect(presetConfig(presetById('mate-adunari-31')!, 'CP').mathRange).toBe(31);
    expect(presetConfig(presetById('mate-bani')!, 'I').mathRange).toBe(100);
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
