import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { PHONO_WORDS } from '@/lib/worksheet/phonology';
import {
  PHONO_SETS, SOUND_LETTERS, firstSet, isPhonologyItem, phonologyItems, phonologyLabel, soundSet, splitSet, sylSet,
} from '@/lib/worksheet/phonology-pages';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { hasIcon } from '@/lib/hints/icons';
import { isItemAllowed } from '@/lib/access';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage } from '@/lib/curriculum/presets';
import { opsOutside } from './bounds';

const games = (items: string[], extra: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, ...extra });
const VOWELS = 'aeiouăâî';
const isVowel = (c: string) => VOWELS.includes(c);

describe('the „Sunete și silabe” words', () => {
  it('every split joins back into the word exactly, and every syllable has a vowel', () => {
    for (const w of PHONO_WORDS) {
      expect(w.syllables.join(''), w.word).toBe(w.word);
      for (const s of w.syllables) expect([...s].some(isVowel), `${w.word}: ${s}`).toBe(true);
    }
  });

  it('the initial is the first letter, and the first letter is the first sound', () => {
    for (const w of PHONO_WORDS) {
      expect(w.initial, w.word).toBe(w.word.charAt(0).toLocaleUpperCase('ro'));
      // traps: c/g + e/i (and ch/gh + e/i), diphthongs, foreign letters, h before a consonant
      expect(/^([cg]h?[ei]|ea|ia|ie|io|iu|oa|ua|[xwykq]|h[^aeiouăâî])/.test(w.word), w.word).toBe(false);
    }
  });

  it('every picture is drawn, and no picture or word is used twice', () => {
    for (const w of PHONO_WORDS) expect(hasIcon(w.picture), `${w.word} ${w.picture}`).toBe(true);
    expect(new Set(PHONO_WORDS.map((w) => w.word)).size).toBe(PHONO_WORDS.length);
    expect(new Set(PHONO_WORDS.map((w) => w.picture)).size).toBe(PHONO_WORDS.length);
  });

  it('no vowel sequence whose split could be argued, except those DOOM 3 spells out', () => {
    // a-vi-on (hiatus) and do-vleac (diphthong) have their split given in DOOM 3; „arici” ends in a
    // non-syllabic i after a consonant (one syllable: -rici), which is not a vowel sequence.
    const allowed = new Set(['avion', 'dovleac']);
    for (const w of PHONO_WORDS) {
      if (allowed.has(w.word)) continue;
      expect(/[aeiouăâî]{2}/.test(w.word), w.word).toBe(false);
    }
  });

  it('every boundary follows the DOOM 3 consonant rules (a second derivation of the split)', () => {
    const obstruent = 'bcdfghptv';
    for (const w of PHONO_WORDS) {
      for (let k = 0; k + 1 < w.syllables.length; k++) {
        const a = w.syllables[k];
        const b = w.syllables[k + 1];
        // consonants between the last vowel of a and the first vowel of b (ch/gh as one)
        const coda = a.slice(a.search(/[aeiouăâî][^aeiouăâî]*$/) + 1);
        const onset = b.slice(0, b.search(/[aeiouăâî]/)).replace(/([cg])h/g, '$1');
        const n = coda.length + onset.length;
        const why = `${w.word}: ${w.syllables.join('-')}`;
        if (n <= 1) expect(coda, why).toBe(''); // ca-să: one consonant goes to the next syllable
        else if (n === 2) {
          const pair = coda + onset;
          const mutaCumLiquida = obstruent.includes(pair[0]) && 'lr'.includes(pair[1]);
          expect(coda.length, why).toBe(mutaCumLiquida ? 0 : 1); // ca-pră, do-vleac / car-te
        } else expect(coda.length, why).toBe(1); // cas-tra-ve-te, um-bre-lă (no lpt/mpt/nct… words)
      }
    }
  });

  it('a balanced mix of syllable counts, and between 60 and 130 words', () => {
    expect(PHONO_WORDS.length).toBeGreaterThanOrEqual(60);
    expect(PHONO_WORDS.length).toBeLessThanOrEqual(130);
    const by = (n: number) => PHONO_WORDS.filter((w) => w.syllables.length === n).length;
    expect(by(1)).toBeGreaterThanOrEqual(12);
    expect(by(2)).toBeGreaterThanOrEqual(20);
    expect(by(3)).toBeGreaterThanOrEqual(20);
    expect(by(4)).toBeGreaterThanOrEqual(10);
    expect(PHONO_WORDS.every((w) => w.syllables.length <= 4)).toBe(true);
  });
});

describe('the „Sunete și silabe” sets', () => {
  const free = new Set(['A', 'B', 'C', 'D', 'E']);

  it('every sound page has at least four pictures with the sound and twelve in all', () => {
    for (const l of SOUND_LETTERS) {
      const { words, targets } = soundSet(l);
      expect(targets, l).toBeGreaterThanOrEqual(4);
      expect(words).toHaveLength(12);
      expect(words.filter((w) => w.initial === l)).toHaveLength(targets);
      expect(new Set(words.map((w) => w.word)).size).toBe(12);
    }
  });

  it('set 1 of each exercise uses only the free letters A–E', () => {
    expect(firstSet(1).every((w) => free.has(w.initial))).toBe(true);
    expect(sylSet(1).every((w) => free.has(w.initial))).toBe(true);
    expect(splitSet(1).every((w) => free.has(w.initial))).toBe(true);
  });

  it('every set is full, without a word twice on a page', () => {
    for (let n = 1; n <= PHONO_SETS; n++) {
      const f = firstSet(n);
      expect(f).toHaveLength(12);
      expect(new Set(f.map((w) => w.word)).size, `first ${n}`).toBe(12);
      const s = sylSet(n);
      expect(s).toHaveLength(8);
      expect(new Set(s.map((w) => w.word)).size, `syl ${n}`).toBe(8);
      for (const c of [1, 2, 3, 4]) expect(s.filter((w) => w.syllables.length === c), `syl ${n} / ${c}`).toHaveLength(2);
      const d = splitSet(n);
      expect(d).toHaveLength(5);
      expect(new Set(d.map((w) => w.word)).size, `split ${n}`).toBe(5);
      expect(d.every((w) => w.syllables.length === 2 || w.syllables.length === 3)).toBe(true);
    }
  });
});

describe('the „Sunete și silabe” pages', () => {
  const items = phonologyItems();

  it('items are activities, with a label, and the store keeps exactly these', () => {
    expect(items.length).toBe(SOUND_LETTERS.length + 3 * PHONO_SETS);
    for (const i of items) {
      expect(isActivityItem(i), i).toBe(true);
      expect(activityLabel(i)).toBe(phonologyLabel(i));
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
    }
    for (const no of ['sound:E', 'sound:Ș', 'sound:', 'first:0', 'first:7', 'syl:10', 'split:x', 'sylab:1']) {
      expect(isPhonologyItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(isActivityItem(no));
    }
    expect(sanitizeConfig(games(['sound:A', 'split:6', 'sound:E'])).selectedItems).toEqual(['sound:A', 'split:6']);
  });

  it('one page per item, everything on the A4 paper, in every letter case', () => {
    for (const mode of ['uppercase', 'lowercase', 'paired'] as const) {
      const pages = buildWorksheetPages(games(items, { letterMode: mode, curriculumLevel: 'CP' }), 'full');
      expect(pages).toHaveLength(items.length);
      pages.forEach((p, i) => {
        expect([p.width, p.height]).toEqual([210, 297]);
        expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${mode} ${items[i]}`).toEqual([]);
      });
    }
  });

  it('the instruction at the top says what to do, in Romanian', () => {
    const texts = (item: string) => buildWorksheetPages(games([item]), 'full')[0].ops.filter((o) => o.t === 'text').map((o) => (o.t === 'text' ? o.text : ''));
    expect(texts('sound:M')).toContain('Încercuiește imaginile care încep cu sunetul M.');
    expect(texts('first:3')).toContain('Scrie în căsuță litera cu care începe cuvântul.');
    expect(texts('syl:2')).toContain('Colorează câte o bulină pentru fiecare silabă.');
    expect(texts('split:2')).toContain('Urmărește silabele, apoi scrie-le singur în căsuțele goale.');
  });

  it('are the same every time (preview = PDF)', () => {
    const a = JSON.stringify(buildWorksheetPages(games(['sound:B', 'syl:4', 'split:3']), 'full'));
    expect(JSON.stringify(buildWorksheetPages(games(['sound:B', 'syl:4', 'split:3']), 'full'))).toBe(a);
  });

  it('free plan: the sounds A–E and set 1 of each exercise; the rest in the paid plan', () => {
    const freeItems = items.filter((i) => isItemAllowed(i, 'games', 'free'));
    expect(freeItems).toEqual(['sound:A', 'sound:B', 'sound:C', 'sound:D', 'first:1', 'syl:1', 'split:1']);
    for (const i of items) expect(isItemAllowed(i, 'games', 'full')).toBe(true);
    expect(hasContent(games(['sound:M', 'first:2', 'syl:6']), 'free')).toBe(false);
    expect(buildWorksheetPages(games(['sound:A', 'sound:M', 'syl:1', 'split:2']), 'free')).toHaveLength(2);
  });
});

describe('the „Sunete și silabe” competences', () => {
  it('print D.3.2 in preschool, CLR 1.3 in CP and clasa I, and nothing in clasa a II-a', () => {
    for (const item of ['sound:A', 'first:1', 'syl:1']) {
      expect(sheetCompetenceLabel(games([item]), 'presc'), item).toBe('Comportament vizat D.3.2 · Curriculum pentru educație timpurie, nivel preșcolar');
    }
    for (const item of ['sound:A', 'first:1', 'syl:1', 'split:1']) {
      expect(sheetCompetenceLabel(games([item]), 'CP'), item).toBe('Competența specifică 1.3 · Comunicare în limba română, clasa pregătitoare');
      expect(sheetCompetenceLabel(games([item]), 'I'), item).toBe('Competența specifică 1.3 · Comunicare în limba română, clasa I');
      expect(sheetCompetenceLabel(games([item]), 'II'), item).toBeNull();
    }
    // writing syllables is not a preschool behaviour
    expect(sheetCompetenceLabel(games(['split:1']), 'presc')).toBeNull();
    // with „find the letter” (D.3.4) on the same sheet, both behaviours
    expect(sheetCompetenceLabel(games(['find:A', 'sound:A']), 'presc')).toBe('Comportamente vizate D.3.2, D.3.4 · Curriculum pentru educație timpurie, nivel preșcolar');
  });

  it('the codes exist in the programme data with the official texts', () => {
    for (const level of ['presc', 'CP', 'I'] as const) {
      for (const r of sheetCompetences(games(['sound:A', 'syl:1']), level)) expect(findCompetence(r)).toBeDefined();
    }
    const [presc] = sheetCompetences(games(['sound:A']), 'presc');
    expect(findCompetence(presc)?.text).toBe('Discriminează/diferențiează fonetic cuvinte, silabe, sunete și asociază sunete cu litere');
    const [cp] = sheetCompetences(games(['sound:A']), 'CP');
    expect(findCompetence(cp)?.text).toBe('Identificarea sunetului inițial și/ sau final dintr-un cuvânt, a silabelor și a cuvintelor din propoziții rostite clar și rar');
    const [one] = sheetCompetences(games(['sound:A']), 'I');
    expect(findCompetence(one)?.text).toBe('Identificarea unor sunete, silabe, cuvinte în enunțuri rostite cu claritate');
  });

  it('the „Fișe pe programă” pages list the new sheets under D.3.2 and CLR 1.3', () => {
    const ids = ['sunetul-initial', 'primul-sunet', 'cate-silabe', 'desparte-silabe'];
    for (const id of ids) expect(SHEET_PRESETS.some((p) => p.id === id), id).toBe(true);
    const listed = (slug: string, code: string) =>
      classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).flatMap((g) => g.items).find((i) => i.code === code && (slug === 'gradinita' || i.programme === 'clr-p-ii'))!.presets.map((p) => p.id);
    expect(listed('gradinita', 'D.3.2')).toEqual(['sunetul-initial', 'primul-sunet', 'cate-silabe']);
    // „Ce literă lipsește?” (reading-pages.ts) practises 1.3 too
    expect(listed('clasa-pregatitoare', '1.3')).toEqual([...ids, 'citire-litera-lipsa']);
    expect(listed('clasa-1', '1.3')).toEqual([...ids, 'citire-litera-lipsa']);
  });
});
