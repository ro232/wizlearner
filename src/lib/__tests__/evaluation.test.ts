import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { buildEvaluationPages, calificativBands, evaluationTitle, isEvaluationItem, solved, varied } from '@/lib/worksheet/evaluation';
import { MATH_TYPES, problemAnswer, rng, seedOf, type MathRange } from '@/lib/worksheet/math';
import { wordProblems } from '@/lib/worksheet/problems';
import { PHONO_WORDS } from '@/lib/worksheet/phonology';
import { phonologyItems } from '@/lib/worksheet/phonology-pages';
import { sortingItems } from '@/lib/worksheet/sorting-pages';
import { SORT_OBJECTS } from '@/lib/worksheet/sorting';
import { isActivityItem } from '@/lib/worksheet/activities';
import { defaultSheetName } from '@/lib/worksheet/saved';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage, classEvaluations, presetById, presetConfig, presetHref } from '@/lib/curriculum/presets';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { useWorksheetStore } from '@/stores/worksheet-store';
import type { PageOps } from '@/lib/glyphs/types';
import { opsOutside } from './bounds';
import { drawnExercises, icons, readingOrder, solveDrawn, textOverlaps, texts } from './drawn';

const H = 297;
const inside = (p: PageOps) => opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height });
const isKey = (p: PageOps) => texts(p).some((t) => t.text === 'Răspunsuri' && t.size > 6);
const EVALUATIONS = SHEET_PRESETS.filter((p) => p.evaluation);
const wordOf = new Map([...PHONO_WORDS.map((w) => [w.picture, w.word] as const), ...SORT_OBJECTS.filter((o) => o.picture).map((o) => [o.picture, o.word] as const)]);

/** The items of an evaluation page: heading („2. Calculează.”) and where its block ends. */
function blocksOf(page: PageOps): { n: number; heading: string; top: number; bottom: number }[] {
  const heads = texts(page).filter((t) => /^\d+\. /.test(t.text) && t.weight === 'bold' && t.size > 3.5 && t.size <= 4.3 && t.y > 30 && t.y < 270);
  const selfTop = texts(page).find((t) => t.text === 'Autoevaluare:' || t.text === 'Cum am lucrat?')?.y ?? H - 19;
  return heads.map((h, i) => ({ n: Number(h.text.split('.')[0]), heading: h.text, top: h.y, bottom: heads[i + 1]?.y ?? selfTop - 8 }));
}

/** The answers page as sections: title → its answers. */
function keySections(pages: PageOps[]): { title: string; entries: string[] }[] {
  const out: { title: string; entries: string[] }[] = [];
  for (const page of pages)
    for (const t of texts(page)) {
      if (t.size === 4 && t.weight === 'bold' && /^\d+\. /.test(t.text)) out.push({ title: t.text, entries: [] });
      else if (t.fill === '#334155' && t.size <= 3.4 && out.length && !t.text.startsWith('Nume:') && !/răspunsuri corecte$|răspuns corect$/.test(t.text)) out[out.length - 1].entries.push(t.text);
    }
  return out;
}

describe('the evaluation presets', () => {
  it('one per subject and class: math for CP, I, II, sounds and syllables for CP and I, one for grădiniță, reading and writing for I and II', () => {
    expect(EVALUATIONS.map((p) => p.id)).toEqual(['evaluare-mate', 'evaluare-clr', 'evaluare-gradinita', 'evaluare-citire']);
    const at = (slug: string) => classEvaluations(CLASS_PAGES.find((c) => c.slug === slug)!).map((e) => e.preset.id);
    expect(at('gradinita')).toEqual(['evaluare-gradinita']);
    expect(at('clasa-pregatitoare')).toEqual(['evaluare-mate', 'evaluare-clr']);
    expect(at('clasa-1')).toEqual(['evaluare-mate', 'evaluare-clr', 'evaluare-citire']);
    expect(at('clasa-2')).toEqual(['evaluare-mate', 'evaluare-citire']);
    // listed apart, never under a competence
    for (const c of CLASS_PAGES) for (const g of classCoverage(c)) for (const it of g.items) expect(it.presets.some((p) => p.evaluation)).toBe(false);
    expect(presetHref(presetById('evaluare-mate')!, 'I')).toBe('/generator?fisa=evaluare-mate&clasa=I');
  });

  it('match the programme of the class: money for CP and I only, numbers in the class range', () => {
    const mate = presetById('evaluare-mate')!;
    expect(presetConfig(mate, 'CP')).toMatchObject({ category: 'math', evaluation: true, mathRange: 10, selectedItems: ['cmp', 'mix', 'problems', 'money'], curriculumLevel: 'CP' });
    expect(presetConfig(mate, 'I')).toMatchObject({ mathRange: 100, selectedItems: ['cmp', 'mix', 'problems', 'money'] });
    expect(presetConfig(mate, 'II').selectedItems).not.toContain('money');
    // clasa a II-a: 0–1000, „fără trecere peste ordin” as the programme's contents say
    expect(presetConfig(mate, 'II')).toMatchObject({ mathRange: 1000, mathCarry: 'without', selectedItems: ['cmp', 'mix', 'missing', 'problems'] });
    expect(presetConfig(presetById('evaluare-clr')!, 'CP').selectedItems.every((i) => /^(sound|first|syl|split):/.test(i))).toBe(true);
  });

  it('the codes they show exist in the programme and are printed on their pages', () => {
    for (const c of CLASS_PAGES)
      for (const { preset, codes } of classEvaluations(c)) {
        const config = presetConfig(preset, c.level);
        expect(codes.length, `${preset.id} ${c.level}`).toBeGreaterThan(0);
        for (const r of sheetCompetences(config, c.level)) expect(findCompetence(r)).toBeTruthy();
        const printed = buildWorksheetPages(config, 'full').flatMap((p) => texts(p).map((t) => t.text)).filter((t) => /^(Competen|Comportament)/.test(t)).join(' ');
        for (const code of codes) expect(printed, `${preset.id} ${c.level} ${code}`).toContain(code);
      }
  });

  it('survive the saved settings and open in the generator as they are', () => {
    for (const p of EVALUATIONS) for (const level of p.levels!) {
      const config = presetConfig(p, level);
      expect(JSON.parse(JSON.stringify(sanitizeConfig(config)))).toEqual(JSON.parse(JSON.stringify(config)));
      for (const item of config.selectedItems) expect(isEvaluationItem(item) && itemFitsCategory(item, config.category), item).toBe(true);
    }
  });
});

describe('an evaluation sheet', () => {
  for (const preset of EVALUATIONS)
    for (const level of preset.levels!) {
      it(`${preset.id}, ${level}: 2–3 pages, its header, self-check, the answers with calificative or observation`, () => {
        const config = presetConfig(preset, level);
        const pages = buildWorksheetPages(config, 'full');
        const sheets = pages.filter((p) => !isKey(p));
        const keys = pages.filter(isKey);
        expect(sheets.length, `${preset.id} ${level}`).toBeGreaterThanOrEqual(2);
        expect(sheets.length).toBeLessThanOrEqual(3);
        expect(keys.length).toBeGreaterThanOrEqual(1);
        expect(pages.indexOf(keys[0])).toBe(sheets.length);
        const title = evaluationTitle(config);
        expect(title).toBe(level === 'presc' ? 'Evaluare — nivel preșcolar' : `Evaluare — ${config.category === 'math' ? 'Matematică și explorarea mediului' : 'Comunicare în limba română'}, ${{ CP: 'clasa pregătitoare', I: 'clasa I', II: 'clasa a II-a' }[level as 'CP']}`);
        for (const [i, p] of sheets.entries()) {
          const t = texts(p).map((x) => x.text);
          expect(t).toContain(title);
          expect(t.some((x) => x.startsWith('Nume:') && x.includes('Data:'))).toBe(true);
          // the self-check row closes the last page only
          expect(t.includes(level === 'presc' ? 'Am reușit singur' : 'Mi-a fost ușor'), `page ${i + 1}`).toBe(i === sheets.length - 1);
          // the curriculum line names the items of this page
          const items = blocksOf(p).map((b) => config.selectedItems[b.n - 1]);
          expect(items.length).toBeGreaterThan(0);
          const label = sheetCompetenceLabel({ ...config, selectedItems: items }, level);
          expect(label).toBeTruthy();
          // on one line, or the codes over the programme when it is too long next to the page number
          expect(t.includes(label!) || label!.split(' · ').every((part) => t.includes(part)), `${label}`).toBe(true);
          expect(t).toContain(`Pagina ${i + 1} din ${pages.length}`);
        }
        const keyTexts = keys.flatMap((p) => texts(p).map((x) => x.text));
        expect(keyTexts.some((x) => /^(Competen|Comportament)/.test(x))).toBe(false);
        if (level === 'presc') {
          expect(keyTexts).not.toContain('Foarte bine (FB)');
          expect(keyTexts.some((x) => x.startsWith('Observare (opțional)'))).toBe(true);
        } else for (const c of ['Foarte bine (FB)', 'Bine (B)', 'Suficient (S)', 'Insuficient (I)']) expect(keyTexts).toContain(c);
        for (const p of pages) {
          expect(inside(p)).toEqual([]);
          expect(textOverlaps(p), `${preset.id} ${level}`).toEqual([]);
        }
      });
    }

  it('no picture twice in one evaluation', () => {
    for (const preset of EVALUATIONS.filter((p) => p.config.category === 'games'))
      for (const level of preset.levels!) {
        const all = buildWorksheetPages(presetConfig(preset, level), 'full').filter((p) => !isKey(p)).flatMap((p) => icons(p).map((i) => i.emoji));
        // sorting and counting pictures may repeat a kind on purpose (count: several of one); the words of the items do not
        const named = all.filter((e) => wordOf.has(e));
        const counted = new Map<string, number>();
        for (const e of named) counted.set(e, (counted.get(e) ?? 0) + 1);
        const twice = [...counted].filter(([, n]) => n > 1).map(([e]) => wordOf.get(e));
        expect(twice.filter((w) => !['morcov', 'câine', 'pisică', 'măr', 'floare', 'pară', 'balon', 'urs'].includes(w!)), `${preset.id} ${level}`).toEqual([]);
      }
  });
});

describe('the answers of an evaluation are those of the exercises drawn', () => {
  it('math: every item, every class range, many sets', () => {
    let checked = 0;
    const types = MATH_TYPES.filter((t) => t !== 'problems' && t !== 'money' && t !== 'addpic');
    for (const range of [5, 10, 20, 31, 100, 1000] as MathRange[])
      for (let seed = 1; seed <= 25; seed++) {
        const config: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'math', evaluation: true, selectedItems: [...MATH_TYPES], mathRange: range, mathSeed: seed, curriculumLevel: 'I' };
        const pages = buildWorksheetPages(config, 'full');
        const key = keySections(pages.filter(isKey));
        expect(key.map((s) => s.title.replace(/ \(.*$/, '')), `${range}/${seed}`).toHaveLength(MATH_TYPES.length);
        for (const page of pages.filter((p) => !isKey(p)))
          for (const b of blocksOf(page)) {
            const type = config.selectedItems[b.n - 1];
            const section = key[b.n - 1];
            if (type === 'problems') {
              // two problems of the page's set, the ones told in the block, with their answers
              const set = wordProblems(range, rng(seedOf(`problems:${range}:${seed}`)));
              const told = texts(page).filter((t) => t.y > b.top && t.y < b.bottom).map((t) => t.text).join(' ');
              expect(section.entries, `${range}/${seed}`).toHaveLength(2);
              for (const e of section.entries) {
                const p = set.find((x) => e === `${e.slice(0, 2)} ${problemAnswer(x, range)}`);
                expect(p, `${range}/${seed} ${e}`).toBeDefined();
                expect(told).toContain(p!.text.split(' ').slice(0, 3).join(' '));
              }
              continue;
            }
            if (!types.includes(type as never) && type !== 'addpic') continue;
            const drawn = drawnExercises(page, /^[a-z]\)$/, b, type === 'seq' || type === 'addpic' ? 186 : 93);
            expect(drawn.length, `${type} ${range}/${seed}`).toBe(section.entries.length);
            drawn.forEach((d, i) => {
              expect(section.entries[i], `${type} ${range}/${seed} ${d.cells.join(' ')}`).toMatch(new RegExp(`^${d.label.replace(')', '\\)')} `));
              // the written-out exercise is the drawn one with the right answer in its box
              const solution = solveDrawn(d.cells);
              const filled = solved({ cells: d.cells[0] === '+' ? d.cells.slice(1) : d.cells, answer: solution });
              expect(section.entries[i]).toBe(`${d.label} ${filled}`);
              checked++;
            });
            // a comparison shows more than one sign when the page's set has them
            if (type === 'cmp') expect(new Set(section.entries.map((e) => e.match(/[<>=]/)![0])).size, `${range}/${seed}`).toBeGreaterThan(1);
          }
      }
    expect(checked).toBeGreaterThan(3000);
  });

  it('games: the pictures drawn and the answers agree', () => {
    const ITEMS = ['count:5', 'count:10', ...phonologyItems().filter((i) => !i.startsWith('sound:') || ['sound:A', 'sound:M', 'sound:T'].includes(i)), ...sortingItems().filter((i) => /^(sort|odd):/.test(i))];
    for (const item of ITEMS) {
      const config: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'games', evaluation: true, selectedItems: [item], curriculumLevel: 'CP' };
      const pages = buildWorksheetPages(config, 'full');
      const [page] = pages;
      const [section] = keySections(pages.filter(isKey));
      expect(section, item).toBeDefined();
      const b = blocksOf(page)[0];
      const drawn = readingOrder(icons(page).filter((i) => i.cy > b.top && i.cy < b.bottom));
      const words = drawn.map((d) => wordOf.get(d.emoji)!);
      const [kind, arg] = item.split(':');
      const phono = (w: string) => PHONO_WORDS.find((p) => p.word === w)!;
      if (kind === 'count') {
        const rows = page.ops.filter((o) => o.t === 'rect' && o.fill === '#FBF7EE') as { y: number; h: number }[];
        expect(section.entries.join(' '), item).toBe(rows.map((r, i) => `${String.fromCharCode(97 + i)}) ${drawn.filter((d) => d.cy > r.y && d.cy < r.y + r.h).length}`).join(' '));
      } else if (kind === 'sound') {
        expect(words).toHaveLength(6);
        const yes = words.filter((w) => phono(w).initial === arg);
        expect(yes.length, item).toBeGreaterThanOrEqual(2);
        expect(section.entries, item).toEqual([`Se încercuiesc: ${yes.join(', ')}. Nu se încercuiesc: ${words.filter((w) => !yes.includes(w)).join(', ')}.`]);
      } else if (kind === 'first') {
        expect(section.entries.join(' '), item).toBe(words.map((w, i) => `${String.fromCharCode(97 + i)}) ${w.toLocaleUpperCase('ro')} – ${phono(w).initial}`).join(' '));
      } else if (kind === 'syl') {
        expect(words.map((w) => phono(w).syllables.length).sort()).toEqual([1, 2, 3, 4]);
        expect(section.entries.join(' '), item).toBe(words.map((w, i) => `${String.fromCharCode(97 + i)}) ${phono(w).syllables.join('-').toLocaleUpperCase('ro')} (${phono(w).syllables.length})`).join(' '));
      } else if (kind === 'split') {
        expect(section.entries.join(' '), item).toBe(words.map((w, i) => `${String.fromCharCode(97 + i)}) ${phono(w).syllables.join('-').toLocaleUpperCase('ro')}`).join(' '));
        // one box per syllable
        const boxes = page.ops.filter((o) => o.t === 'rect' && o.fill === '#ffffff' && o.stroke === '#1e3a5f' && o.y > b.top && o.y < b.bottom).length;
        expect(boxes, item).toBe(words.reduce((n, w) => n + phono(w).syllables.length, 0));
      } else if (kind === 'sort') {
        const row = drawn.filter((d) => Math.abs(d.cy - drawn[0].cy) < 6);
        const lines = section.entries;
        for (const line of lines) {
          const [label, list] = line.split(': ');
          for (const part of list.split(', ')) {
            const at = part.charCodeAt(0) - 97;
            if (part.length > 2) expect(wordOf.get(row[at].emoji), `${item} ${part}`).toBe(part.slice(3));
            const obj = SORT_OBJECTS.find((o) => o.word === part.slice(3));
            if (obj && /FRUCTE|LEGUME|DOMESTICE|SĂLBATICE|AER|USCAT|APĂ|HAINE|JUCĂRII/.test(label)) expect(label, `${item} ${part}`).toContain({ fructe: 'FRUCTE', legume: 'LEGUME', domestice: 'DOMESTICE', salbatice: 'SĂLBATICE', aer: 'AER', uscat: 'USCAT', apa: 'APĂ', haine: 'HAINE', jucarii: 'JUCĂRII' }[obj.cat as 'fructe']);
          }
        }
        expect(lines.join(' ').match(/[a-f]\)/g)!.length, item).toBe(6);
      } else if (kind === 'odd') {
        expect(words).toHaveLength(12);
        section.entries.forEach((e, r) => {
          const odd = e.slice(3).split(' (')[0];
          const row = words.slice(r * 4, r * 4 + 4);
          expect(row, `${item} ${e}`).toContain(odd);
          const cats = row.map((w) => SORT_OBJECTS.find((o) => o.word === w)!.cat);
          const oddCat = SORT_OBJECTS.find((o) => o.word === odd)!.cat;
          expect(cats.filter((c) => c === oddCat)).toHaveLength(1);
        });
      }
    }
  });
});

describe('evaluation rules', () => {
  it('calificative: four bands that cover every score once, best first', () => {
    for (let total = 4; total <= 60; total++) {
      const bands = calificativBands(total);
      expect(bands.map((b) => b.code)).toEqual(['FB', 'B', 'S', 'I']);
      expect(bands[0].max).toBe(total);
      expect(bands[3].min).toBe(0);
      for (let i = 1; i < 4; i++) expect(bands[i].max, `${total}`).toBe(bands[i - 1].min - 1);
      for (const b of bands) expect(b.min, `${total} ${b.code}`).toBeLessThanOrEqual(b.max);
      expect(bands[0].min).toBeGreaterThanOrEqual(Math.ceil(total * 0.8));
    }
    expect(calificativBands(18).map((b) => [b.min, b.max])).toEqual([[16, 18], [12, 15], [9, 11], [0, 8]]);
  });

  it('varied: the first ones, with every kind there is', () => {
    const xs = ['<', '<', '<', '<', '>', '='].map((k, i) => ({ k, i }));
    expect(varied(xs, 3, (x) => x.k).map((x) => x.i)).toEqual([0, 4, 5]);
    expect(varied(xs, 5, (x) => x.k).map((x) => x.i)).toEqual([0, 1, 2, 4, 5]);
    expect(varied([1, 2, 3, 4], 2, () => 'a')).toEqual([1, 2]);
  });

  it('items without a short form are left out; nothing to evaluate prints the ordinary sheet', () => {
    expect(isEvaluationItem('dots:star')).toBe(false);
    expect(isEvaluationItem('pos:1')).toBe(false);
    expect(isEvaluationItem('group:1')).toBe(false);
    expect(isEvaluationItem('find:A')).toBe(false);
    for (const t of MATH_TYPES) expect(isEvaluationItem(t)).toBe(true);
    for (const i of [...phonologyItems(), ...sortingItems(), 'count:5', 'count:10']) if (isEvaluationItem(i)) expect(isActivityItem(i), i).toBe(true);
    const dots: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'games', evaluation: true, selectedItems: ['dots:star'] };
    expect(buildEvaluationPages(dots, 'full')).toEqual([]);
    expect(buildWorksheetPages(dots, 'full')).toHaveLength(1);
    const mixed = buildWorksheetPages({ ...dots, selectedItems: ['dots:star', 'odd:1'] }, 'full');
    expect(mixed.filter((p) => !isKey(p))).toHaveLength(1);
  });

  it('free plan: numbers up to 10 and the free games only', () => {
    const pages = buildWorksheetPages({ ...presetConfig(presetById('evaluare-mate')!, 'I') }, 'free');
    const numbers = pages.filter((p) => !isKey(p)).flatMap((p) => texts(p)).filter((t) => /^\d+$/.test(t.text) && t.size > 7).map((t) => Number(t.text));
    expect(numbers.length).toBeGreaterThan(10);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(10);
    const g = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'games', evaluation: true, selectedItems: ['odd:1', 'odd:2', 'sound:M'] }, 'free');
    expect(keySections(g.filter(isKey)).map((s) => s.title)).toEqual(['1. Ce nu se potrivește? (3 răspunsuri)']);
  });

  it('the self-check row is optional, the answers page is not', () => {
    const config = presetConfig(presetById('evaluare-gradinita')!, 'presc');
    const without = buildWorksheetPages({ ...config, showRewardSection: false, mathAnswers: false }, 'full');
    expect(without.flatMap((p) => texts(p).map((t) => t.text))).not.toContain('Am reușit singur');
    expect(without.some(isKey)).toBe(true);
  });

  it('no class chosen: the subject in the header, no calificative', () => {
    const config: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'math', evaluation: true, selectedItems: ['add', 'sub'] };
    expect(evaluationTitle(config)).toBe('Evaluare — Matematică și explorarea mediului');
    const keyTexts = buildWorksheetPages(config, 'full').filter(isKey).flatMap((p) => texts(p).map((t) => t.text));
    expect(keyTexts).not.toContain('Foarte bine (FB)');
  });

  it('a saved evaluation is named so, and the setting is kept only where it means something', () => {
    expect(defaultSheetName(presetConfig(presetById('evaluare-mate')!, 'CP'))).toBe('Evaluare: Compară numerele, Adunări și scăderi, Probleme cu imagini, Bani');
    expect(sanitizeConfig({ category: 'games', selectedItems: ['odd:1'], evaluation: true }).evaluation).toBe(true);
    expect(sanitizeConfig({ category: 'letters', selectedItems: ['A'], evaluation: true }).evaluation).toBeUndefined();
    expect(sanitizeConfig({ category: 'math', evaluation: 'da' }).evaluation).toBeUndefined();
    // an old saved math sheet with its answers keeps them
    expect(sanitizeConfig({ category: 'math', selectedItems: ['add'], mathAnswers: true }).mathAnswers).toBe(true);
    for (const level of ['presc', 'CP', 'I', 'II'] as SchoolLevel[]) for (const tier of ['free', 'full'] as const) {
      const raw = { category: 'games', selectedItems: ['find:A', 'dots:star', 'pos:5'], evaluation: true, mathAnswers: true, curriculumLevel: level };
      expect(buildWorksheetPages(sanitizeConfig(raw), tier).length).toBeGreaterThan(0);
    }
  });

  it('the generator: another category starts as an ordinary sheet; the setting can be turned on and off', () => {
    useWorksheetStore.setState({ config: { ...presetConfig(presetById('evaluare-mate')!, 'I') } });
    expect(useWorksheetStore.getState().config.evaluation).toBe(true);
    useWorksheetStore.getState().toggleEvaluation();
    expect(useWorksheetStore.getState().config.evaluation).toBe(false);
    useWorksheetStore.getState().toggleEvaluation();
    useWorksheetStore.getState().setCategory('games');
    expect(useWorksheetStore.getState().config.evaluation).toBeUndefined();
  });
});
