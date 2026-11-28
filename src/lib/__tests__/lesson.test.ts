import { beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { buildWorksheetPages, countWorksheetPages, glyphsForItem, hasContent, lessonSentenceFit, rowItems } from '@/lib/worksheet/layout';
import { configForSaving, defaultSheetName } from '@/lib/worksheet/saved';
import { createHomeworkToken, homeworkKeys, verifyHomeworkToken } from '@/lib/homework/token';
import { homeworkPages } from '@/lib/homework/pages';
import { pageToSvg } from '@/lib/glyphs/backends/svg';
import { flattenOps } from '@/lib/glyphs/geometry';
import { isItemAllowed } from '@/lib/access';
import { LETTER_GROUPS, groupItems, groupOf, itemInMode } from '@/lib/worksheet/letter-groups';
import { LESSON_DEFAULT_COUNTS, LESSON_SENTENCE_SMALL, hasLessonLetter, sanitizeLesson } from '@/lib/worksheet/lesson';
import { GROUP_HINTS, lessonSyllables, lessonTitle, lessonWords } from '@/lib/worksheet/lesson-text';
import { LETTER_LISTS } from '@/lib/curriculum/data/cuvinte';
import { presetById, presetConfig } from '@/lib/curriculum/presets';
import { hasIcon } from '@/lib/hints/icons';

/** „Lecția literei” (worksheet/lesson.ts, layout.ts lessonRows) and „Grupuri de litere” (worksheet/letter-groups.ts). */

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, ...over });
const fp = (c: WorksheetConfig) => buildWorksheetPages(c, 'full').map((p) => createHash('sha256').update(pageToSvg(p)).digest('hex'));
const M_WORDS = ['măr', 'mamă', 'masă', 'melc', 'mare'];
const lessonM = (over: Partial<WorksheetConfig> = {}, counts = LESSON_DEFAULT_COUNTS) =>
  cfg({ selectedItems: ['M'], lesson: { counts: { ...counts }, words: [...M_WORDS], sentence: 'Mama are mere.' }, ...over });
const kinds = (c: WorksheetConfig, tier: 'free' | 'full' = 'full') => rowItems(c, tier).map((r) => `${r.title ? `[${r.title}] ` : ''}${r.blank ? '_' : r.item}`);
const texts = (c: WorksheetConfig) => buildWorksheetPages(c, 'full').map((p) => flattenOps(p.ops).filter((o) => o.t === 'text').map((o) => (o as { text: string }).text));

describe('groups of letters: items', () => {
  it('ce, ci, ge, gi, che, chi, ghe, ghi, in the three letter modes', () => {
    expect(groupItems('lowercase')).toEqual(['ce', 'ci', 'ge', 'gi', 'che', 'chi', 'ghe', 'ghi']);
    expect(groupItems('uppercase')).toEqual(['CE', 'CI', 'GE', 'GI', 'CHE', 'CHI', 'GHE', 'GHI']);
    expect(groupItems('paired')).toEqual(['Ce', 'Ci', 'Ge', 'Gi', 'Che', 'Chi', 'Ghe', 'Ghi']);
  });

  it('never mistaken for a letter: a letter item is one letter or a capital with its own small letter', () => {
    for (const g of LETTER_GROUPS) for (const item of [g, g.toUpperCase(), itemInMode(g, 'paired')]) {
      expect(groupOf(item)).toBe(g);
      expect(itemFitsCategory(item, 'letters')).toBe(true);
      // not a letter item of any mode: the letter grid has no item with two different letters
      expect([...item].length > 1 && [...item][0].toLowerCase() === [...item][1].toLowerCase()).toBe(false);
    }
    for (const bad of ['cE', 'cHE', 'ca', 'gh', 'Cc', 'C', 'chee']) expect(groupOf(bad)).toBeNull();
    expect(itemFitsCategory('cE', 'letters')).toBe(false);
    expect(itemFitsCategory('ce', 'numbers')).toBe(false);
  });

  it('a group changes with the letter mode; letters keep working', () => {
    expect(itemInMode('CHE', 'lowercase')).toBe('che');
    expect(itemInMode('che', 'paired')).toBe('Che');
    expect(itemInMode('M', 'paired')).toBe('Mm');
    expect(itemInMode('Șș', 'lowercase')).toBe('ș');
  });

  it('access follows the letters of the group, as for any word: CE is free (C, E), the others need the full version', () => {
    expect(isItemAllowed('CE', 'letters', 'free')).toBe(true);
    expect(isItemAllowed('ce', 'letters', 'free')).toBe(true);
    for (const g of ['ci', 'ge', 'gi', 'che', 'chi', 'ghe', 'ghi']) expect(isItemAllowed(g, 'letters', 'free'), g).toBe(false);
    for (const g of LETTER_GROUPS) expect(isItemAllowed(g, 'letters', 'full')).toBe(true);
  });

  it('every group has a hint word that starts with it, with its picture', () => {
    for (const g of LETTER_GROUPS) {
      expect(GROUP_HINTS[g].word.startsWith(g), g).toBe(true);
      expect(hasIcon(GROUP_HINTS[g].emoji), g).toBe(true);
    }
  });
});

describe('groups of letters on a sheet', () => {
  it('one row per group, drawn as one unit (its letters side by side; handwriting: one joined line)', () => {
    expect(rowItems(cfg({ letterMode: 'lowercase', selectedItems: ['che', 'ci'], fillPage: false })).map((r) => [r.item, r.glyphs.length])).toEqual([['che', 3], ['ci', 2]]);
    expect(glyphsForItem('CHE', 'letters').map((g) => g.key)).toEqual(['C', 'H', 'E']);
    const cursive = glyphsForItem('che', 'letters', true);
    expect(cursive).toHaveLength(1);
    // a pair stays two separate handwriting letters, as before
    expect(glyphsForItem('Aa', 'letters', true)).toHaveLength(2);
  });

  it('the picture and the word of the group next to its model, not those of its first letter', () => {
    const [page] = buildWorksheetPages(cfg({ letterMode: 'lowercase', selectedItems: ['che'], fillPage: false }), 'full');
    const words = flattenOps(page.ops).filter((o) => o.t === 'text').map((o) => (o as { text: string }).text);
    expect(words).toContain('cheie');
    expect(words).not.toContain('casă');
  });

  it('rows for each item (rowsByItem) work for a group', () => {
    const c = sanitizeConfig(cfg({ letterMode: 'uppercase', selectedItems: ['A', 'CHE'], rowsByItem: { CHE: 3 }, fillPage: false }));
    expect(c.rowsByItem).toEqual({ CHE: 3 });
    expect(rowItems(c).map((r) => r.item)).toEqual(['A', 'CHE', 'CHE', 'CHE']);
  });

  it('a workbook page per group is titled „Grupul de litere”', () => {
    const t = texts(cfg({ letterMode: 'lowercase', selectedItems: ['ghi'], pagePerItem: true, itemWords: true }));
    expect(t[0]).toContain('Grupul de litere ghi');
    expect(t[0]).not.toContain('Litera ghi');
  });

  it('the groups are Romanian: dropped on the English alphabet', () => {
    expect(sanitizeConfig(cfg({ alphabet: 'en', letterMode: 'lowercase', selectedItems: ['a', 'ce'] })).selectedItems).toEqual(['a']);
  });
});

describe('syllables', () => {
  it('a consonant with the vowels (â only where words have it)', () => {
    expect(lessonSyllables('M')).toEqual(['ma', 'me', 'mi', 'mo', 'mu', 'mă', 'mâ']);
    expect(lessonSyllables('Șș')).toEqual(['șa', 'șe', 'și', 'șo', 'șu', 'șă']);
    expect(lessonSyllables('j')).toEqual(['ja', 'je', 'ji', 'jo', 'ju', 'jă']);
  });

  it('C and G without e and i (those are the groups), K without ă and â', () => {
    expect(lessonSyllables('C')).toEqual(['ca', 'co', 'cu', 'că', 'câ']);
    expect(lessonSyllables('g')).toEqual(['ga', 'go', 'gu', 'gă', 'gâ']);
    expect(lessonSyllables('K')).toEqual(['ka', 'ke', 'ki', 'ko', 'ku']);
  });

  it('a vowel with m, n, p, t, l; Î at the start of a word; Â inside words', () => {
    expect(lessonSyllables('A')).toEqual(['ma', 'na', 'pa', 'ta', 'la']);
    expect(lessonSyllables('Ăă')).toEqual(['mă', 'nă', 'pă', 'tă', 'lă']);
    expect(lessonSyllables('u')).toEqual(['mu', 'nu', 'pu', 'tu', 'lu']);
    expect(lessonSyllables('Î')).toEqual(['în', 'îm']);
    expect(lessonSyllables('Â')).toEqual(['mâ', 'pâ', 'câ', 'lâ', 'râ']);
  });

  it('Q, W, X, Y: none', () => {
    for (const l of ['Q', 'W', 'X', 'Y']) expect(lessonSyllables(l)).toEqual([]);
  });

  it('a group: itself and the forms with a vowel that words have', () => {
    expect(lessonSyllables('ce')).toEqual(['ce', 'cea', 'ci', 'cio', 'ciu']);
    expect(lessonSyllables('GI')).toEqual(['gi', 'gio', 'giu', 'ge', 'gea']);
    expect(lessonSyllables('Che')).toEqual(['che', 'chi']);
    expect(lessonSyllables('ghi')).toEqual(['ghi', 'ghe']);
  });

  it('every syllable of every letter and group has the letter (or the group family), Romanian letters only', () => {
    for (const l of LETTER_LISTS.map((x) => x.id)) {
      for (const syl of lessonSyllables(l)) {
        expect(syl, l).toMatch(/^[a-zăâîșț]{2,3}$/);
        expect(syl.includes(l.toLowerCase()), `${l}: ${syl}`).toBe(true);
      }
    }
    for (const g of LETTER_GROUPS) for (const syl of lessonSyllables(g)) expect(syl.startsWith(g.slice(0, -1)), `${g}: ${syl}`).toBe(true);
  });
});

describe('sanitizeConfig: the lesson', () => {
  it('counts 0–8, defaults for the missing ones; words cleaned, unique, at most 12; the sentence cleaned', () => {
    const l = sanitizeLesson({
      counts: { letter: 20, syll: -3, words: 2.6, sentence: 'x' },
      words: ['măr', 'măr', 'Ştefan', '<b>', 'a1', '', 7, ...Array.from({ length: 20 }, (_, i) => `cuvânt${'a'.repeat(i)}`)],
      sentence: '  Mama <script>are</script>\n mere 123!  ',
    });
    expect(l.counts).toEqual({ letter: 8, syll: 0, words: 3, sentence: LESSON_DEFAULT_COUNTS.sentence });
    expect(l.words?.slice(0, 2)).toEqual(['măr', 'Ștefan']);
    expect(l.words).toHaveLength(12);
    expect(l.sentence).toBe('Mama script are script mere !');
    expect(sanitizeLesson({ sentence: 'x'.repeat(200) }).sentence).toHaveLength(80);
    expect(sanitizeLesson(null)).toEqual({ counts: LESSON_DEFAULT_COUNTS });
    expect('sentence' in sanitizeLesson({ sentence: ' 12 ' })).toBe(false);
  });

  it('letters of the Romanian alphabet only; one letter or group (the first); no rows for each item', () => {
    const c = sanitizeConfig(cfg({ selectedItems: ['M', 'A'], rowsByItem: { M: 3 }, lesson: { counts: LESSON_DEFAULT_COUNTS } }));
    expect(c.selectedItems).toEqual(['M']);
    expect(c.rowsByItem).toBeUndefined();
    expect(c.lesson).toEqual({ counts: LESSON_DEFAULT_COUNTS });
    for (const other of [{ category: 'numbers' as const, selectedItems: ['1'] }, { alphabet: 'en' as const }]) {
      expect('lesson' in sanitizeConfig(cfg({ ...other, lesson: { counts: LESSON_DEFAULT_COUNTS } }))).toBe(false);
    }
    for (const bad of [null, 'x', [1], 3]) expect('lesson' in sanitizeConfig({ ...DEFAULT_CONFIG, lesson: bad })).toBe(false);
  });

  it('a valid lesson comes out unchanged; without one the config is as before', () => {
    const c = lessonM();
    expect(sanitizeConfig(c)).toEqual(c);
    expect(sanitizeConfig(sanitizeConfig(c))).toEqual(sanitizeConfig(c));
    expect('lesson' in sanitizeConfig(DEFAULT_CONFIG)).toBe(false);
  });
});

describe('the lesson sheet', () => {
  it('four parts in order, each titled over its first row', () => {
    expect(kinds(lessonM())).toEqual([
      '[Litera] M', 'M', 'M', 'M',
      '[Silabe] MA ME MI MO MU MĂ MÂ',
      '[Cuvinte] MĂR', 'MAMĂ', 'MASĂ',
      '[Propoziția] MAMA ARE MERE.', 'MAMA ARE MERE.',
    ]);
    const t = texts(lessonM()).flat();
    for (const title of ['Litera M', 'Litera', 'Silabe', 'Cuvinte', 'Propoziția']) expect(t).toContain(title);
  });

  it('the counts make the rows and the pages; 0 leaves a part out; no repeats to fill a page', () => {
    const small = lessonM({}, { letter: 1, syll: 1, words: 1, sentence: 1 });
    expect(kinds(small)).toHaveLength(4);
    expect(countWorksheetPages(small, 'full')).toBe(1);
    expect(countWorksheetPages(lessonM(), 'full')).toBe(2);
    const big = lessonM({}, { letter: 8, syll: 8, words: 8, sentence: 8 });
    expect(kinds(big)).toHaveLength(32);
    expect(countWorksheetPages(big, 'full')).toBeGreaterThan(3);
    const noSyll = kinds(lessonM({}, { ...LESSON_DEFAULT_COUNTS, syll: 0 }));
    expect(noSyll.some((k) => k.includes('MA ME'))).toBe(false);
    expect(noSyll.some((k) => k.startsWith('[Silabe]'))).toBe(false);
    const onlyWords = lessonM({}, { letter: 0, syll: 0, words: 2, sentence: 0 });
    expect(kinds(onlyWords)).toEqual(['[Cuvinte] MĂR', 'MAMĂ']);
    expect(hasContent(lessonM({}, { letter: 0, syll: 0, words: 0, sentence: 0 }), 'full')).toBe(false);
    // the rows per page of „Avansat” and the repeats of „Umple pagina” are for free letters
    expect(kinds(lessonM({ rowsPerPage: 3, fillPage: true }))).toEqual(kinds(lessonM()));
  });

  it('the words follow the letter mode and the word options; the sentence keeps the teacher’s capitals', () => {
    const lower = lessonM({ letterMode: 'lowercase', selectedItems: ['m'], wordCopyRow: true });
    expect(kinds(lower)).toEqual([
      '[Litera] m', 'm', 'm', 'm',
      '[Silabe] ma me mi mo mu mă mâ',
      '[Cuvinte] măr', '_', 'mamă', '_', 'masă', '_',
      '[Propoziția] Mama are mere.', 'Mama are mere.',
    ]);
    // the full stop is traced, as a dot that belongs to the last letter
    const sentence = rowItems(lower).find((r) => r.title === 'Propoziția')!;
    expect(sentence.glyphs.map((g) => g.key).join('')).toBe('Mama are mere.');
    expect(sentence.glyphs.at(-1)!.strokes.at(-1)!.mark).toBe(true);
  });

  it('handwriting: the syllables, the words and the sentence are joined lines; the full stop goes into the line', () => {
    const c = lessonM({ script: 'cursive', letterMode: 'paired', selectedItems: ['Mm'] });
    const rows = rowItems(c);
    expect(rows[0].glyphs).toHaveLength(2);
    for (const r of rows.filter((x) => x.word)) expect(r.glyphs, r.item).toHaveLength(1);
    expect(rows.find((r) => r.title === 'Propoziția')!.glyphs[0].key.endsWith('.')).toBe(true);
    expect(countWorksheetPages(c, 'full')).toBeGreaterThanOrEqual(2);
  });

  it('a group lesson: the group, its syllables, its words', () => {
    const c = cfg({ letterMode: 'lowercase', selectedItems: ['che'], lesson: { counts: LESSON_DEFAULT_COUNTS, words: ['cheie', 'ureche'], sentence: 'Cheia e mică.' } });
    expect(kinds(c)).toEqual(['[Grupul de litere] che', 'che', 'che', 'che', '[Silabe] che chi', '[Cuvinte] cheie', 'ureche', 'cheie', '[Propoziția] Cheia e mică.', 'Cheia e mică.']);
    expect(texts(c)[0][0]).toBe('Grupul de litere che');
  });

  it('on the free plan what has a letter of the full version stays off the sheet', () => {
    const c = cfg({ selectedItems: ['C'], lesson: { counts: LESSON_DEFAULT_COUNTS, words: ['cub', 'cec'], sentence: 'Cana e plină.' } });
    expect(kinds(c, 'free')).toEqual(['[Litera] C', 'C', 'C', 'C', '[Silabe] CA CĂ CÂ', '[Cuvinte] CEC', 'CEC', 'CEC']);
    expect(kinds(lessonM(), 'free')).toEqual([]);
  });

  it('a long sentence is shrunk to its row: the controls hear how much', () => {
    expect(lessonSentenceFit(lessonM())!).toBeGreaterThan(0.6);
    expect(lessonSentenceFit(lessonM({ letterMode: 'lowercase', selectedItems: ['m'] }))!).toBeGreaterThan(lessonSentenceFit(lessonM())!);
    expect(lessonSentenceFit(lessonM({ lesson: { counts: LESSON_DEFAULT_COUNTS, sentence: 'Am un ac.' } }))).toBe(1);
    expect(lessonSentenceFit(lessonM({ lesson: { counts: LESSON_DEFAULT_COUNTS, sentence: 'Mama și tata merg la munte cu mașina mare.' } }))!).toBeLessThan(LESSON_SENTENCE_SMALL);
    expect(lessonSentenceFit(lessonM({ lesson: { counts: LESSON_DEFAULT_COUNTS } }))).toBeNull();
    expect(lessonSentenceFit(cfg({ selectedItems: ['M'] }))).toBeNull();
  });

  it('„Altă variantă”: the next words of the list; the first variant is the sheet without a seed', () => {
    const v1 = kinds(lessonM());
    expect(kinds(lessonM({ variantSeed: 1 }))).toEqual(v1);
    const v2 = kinds(lessonM({ variantSeed: 2 }));
    expect(v2.filter((k) => /^(\[Cuvinte\] )?[A-ZĂ]+$/.test(k) && !/^(\[Litera\] )?M$/.test(k))).toEqual(['[Cuvinte] MELC', 'MARE', 'MĂR']);
    expect(fp(lessonM({ variantSeed: 2 }))).not.toEqual(fp(lessonM()));
  });

  it('the title and the name of a saved lesson', () => {
    expect(lessonTitle('Mm')).toBe('Litera M');
    expect(lessonTitle('ghi')).toBe('Grupul de litere ghi');
    expect(texts(lessonM({ customTitle: 'Lecția 12' }))[0][0]).toBe('Lecția 12');
    expect(defaultSheetName(lessonM())).toBe('Lecția literei: M');
  });
});

describe('the lesson leaves the page', () => {
  it('a saved sheet keeps the lesson, without the child’s name in a word or the sentence', () => {
    const c = lessonM({ childName: 'Mara', lesson: { counts: LESSON_DEFAULT_COUNTS, words: ['măr', 'Mara', 'melc'], sentence: 'Mara are mere.' } });
    const saved = configForSaving(c);
    expect(saved.lesson).toEqual({ counts: LESSON_DEFAULT_COUNTS, words: ['măr', 'melc'] });
    expect(configForSaving(lessonM()).lesson).toEqual(lessonM().lesson);
  });

  it('the homework link round-trips it: the parent prints the teacher’s sheet (and its variant)', () => {
    const key = homeworkKeys({ HOMEWORK_LINK_SECRET: 'test-secret-0123456789abcdef' })[0];
    const now = Date.UTC(2026, 10, 28);
    for (const c of [lessonM({ wordCopyRow: true }), lessonM({ variantSeed: 3, letterMode: 'lowercase', selectedItems: ['m'] }), cfg({ letterMode: 'lowercase', selectedItems: ['che'], lesson: { counts: { letter: 2, syll: 0, words: 1, sentence: 3 }, words: ['cheie'], sentence: 'Cheia e mică.' } })]) {
      const token = createHomeworkToken({ kind: 'sheet', config: configForSaving(c), tier: 'full', expiresAt: now + 86_400_000 } as never, key);
      const res = verifyHomeworkToken(token, [key], now);
      if (!res.ok || res.homework.kind !== 'sheet') throw new Error('link');
      expect(res.homework.config.lesson).toEqual(c.lesson);
      expect(homeworkPages(res.homework, '').map((p) => createHash('sha256').update(pageToSvg(p)).digest('hex'))).toEqual(fp(c));
    }
  });

  it('the ready-made lesson: M in CP (print), Mm in clasa I (handwriting), words from the list of M', () => {
    const p = presetById('lectia-literei')!;
    const cp = sanitizeConfig(presetConfig(p, 'CP'));
    expect(cp.selectedItems).toEqual(['M']);
    expect(cp.lesson?.words).toEqual(lessonWords(LETTER_LISTS.find((l) => l.id === 'M')!.words));
    expect(hasLessonLetter(cp.lesson!.sentence!, 'M')).toBe(true);
    expect(countWorksheetPages(cp, 'full')).toBe(2);
    const one = sanitizeConfig(presetConfig(p, 'I'));
    expect(one.selectedItems).toEqual(['Mm']);
    expect(one.script).toBe('cursive');
    expect(one.lesson?.words).toEqual(cp.lesson?.words);
    expect(countWorksheetPages(one, 'full')).toBe(2);
  });
});

describe('store: the lesson', () => {
  const store = useWorksheetStore;
  beforeEach(() => store.getState().resetConfig());

  it('on: the first letter stays; a letter chosen replaces it; off: the sheet of letters again', () => {
    const s = store.getState();
    s.toggleItem('M');
    s.toggleItem('A');
    s.setLessonMode(true);
    let c = store.getState().config;
    expect(c.selectedItems).toEqual(['M']);
    expect(c.lesson).toEqual({ counts: LESSON_DEFAULT_COUNTS });
    store.getState().setLessonItem('P', ['pom', 'pat']);
    store.getState().setLessonSentence('Pisica bea lapte.');
    store.getState().setLessonItem('CHE');
    c = store.getState().config;
    expect(c.selectedItems).toEqual(['CHE']);
    // the sentence has no „che”: it goes; the words come again with the lists
    expect(c.lesson).toEqual({ counts: LESSON_DEFAULT_COUNTS });
    store.getState().setLessonItem('L', ['lup']);
    store.getState().setLessonSentence('Lili bea lapte.');
    store.getState().setLessonItem('A');
    expect(store.getState().config.lesson?.sentence).toBe('Lili bea lapte.');
    store.getState().setLessonMode(false);
    expect('lesson' in store.getState().config).toBe(false);
    expect(store.getState().config.selectedItems).toEqual(['A']);
  });

  it('counts 0–8; words toggled; the letter follows the mode and the script', () => {
    const s = store.getState();
    s.setLessonMode(true);
    s.setLessonItem('CHE', ['cheie']);
    store.getState().setLessonCount('syll', 12);
    store.getState().setLessonCount('words', -1);
    expect(store.getState().config.lesson?.counts).toEqual({ ...LESSON_DEFAULT_COUNTS, syll: 8, words: 0 });
    store.getState().toggleLessonWord('ureche');
    store.getState().toggleLessonWord('cheie');
    expect(store.getState().config.lesson?.words).toEqual(['ureche']);
    store.getState().setLetterMode('lowercase');
    expect(store.getState().config.selectedItems).toEqual(['che']);
    store.getState().setLetterMode('uppercase');
    store.getState().setScript('cursive');
    expect(store.getState().config.selectedItems).toEqual(['Che']);
    expect(store.getState().config.letterMode).toBe('paired');
    store.getState().setAlphabet('en');
    expect('lesson' in store.getState().config).toBe(false);
    expect(store.getState().config.selectedItems).toEqual([]);
  });

  it('handwriting starts with fewer rows (two pages)', () => {
    store.getState().setScript('cursive');
    store.getState().setLessonMode(true);
    expect(store.getState().config.lesson?.counts).toEqual({ letter: 3, syll: 1, words: 2, sentence: 2 });
  });
});
