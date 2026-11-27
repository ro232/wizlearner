import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import {
  COPY_SETS, DRAW_SETS, FILL_SETS, GAP_SETS, MATCH_SETS, ORDER_SETS, READING_LEVELS, READ_KINDS, READ_PICTURES, TEXT_SETS,
  isReadingItem, readingSetLevel, type ReadKind, type ReadLevel,
} from '@/lib/worksheet/reading';
import { cursiveLine, fillLayout, gapLayout, matchLayout, orderLayout, readingItems, readingLabel, readingShortLabel, textAnswer, textW } from '@/lib/worksheet/reading-pages';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { gameKeySection } from '@/lib/worksheet/game-keys';
import { isEvaluationItem } from '@/lib/worksheet/evaluation';
import { hasIcon, iconOps } from '@/lib/hints/icons';
import { isItemAllowed } from '@/lib/access';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage, classEvaluations, presetById, presetConfig } from '@/lib/curriculum/presets';
import { flattenOps } from '@/lib/glyphs/geometry';
import type { PageOps } from '@/lib/glyphs/types';
import { newPdfDocument } from '@/lib/pdf/generate-pdf';
import { opsOutside } from './bounds';
import { texts, type TextOp } from './drawn';

const games = (items: string[], extra: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, ...extra });
const ITEMS = readingItems();
const item = (kind: ReadKind, n: number) => `read:${kind}:${n}`;
const SETS = (kind: ReadKind) => READING_LEVELS[kind].map((_, i) => i + 1);
const setsOf = (kind: ReadKind, level: ReadLevel) => READING_LEVELS[kind].map((l, i) => (l === level ? i + 1 : 0)).filter(Boolean);
const page = (it: string, extra: Partial<WorksheetConfig> = {}) => buildWorksheetPages(games([it], extra), 'full')[0];
const W_ROW = 210 - 12 - 23; // the writing rows start right of the item number
const words = (s: string) => s.toLocaleLowerCase('ro').split(/[^\p{L}-]+/u).filter(Boolean);

// The real widths of the texts, measured with the embedded Nunito (as the PDF draws them).
const fonts = { regular: readFileSync('public/fonts/Nunito-Regular.ttf').toString('base64'), bold: readFileSync('public/fonts/Nunito-Bold.ttf').toString('base64') };
const { doc } = newPdfDocument({ width: 210, height: 297, ops: [] }, fonts);
function realBox(t: TextOp) {
  doc.setFont('Nunito', t.weight === 'bold' ? 'bold' : 'normal');
  doc.setFontSize(t.size * (72 / 25.4));
  const w = doc.getTextWidth(t.text);
  const x0 = t.align === 'center' ? t.x - w / 2 : t.align === 'right' ? t.x - w : t.x;
  // from the top of the accents (Â Ă Î) to the bottom of the commas (ș ț, g p)
  return { minX: x0, maxX: x0 + w, minY: t.y - t.size * 0.92, maxY: t.y + t.size * 0.24 };
}
const overlap = (a: { minX: number; maxX: number; minY: number; maxY: number }, b: typeof a, slack = 0.2) =>
  a.minX < b.maxX - slack && b.minX < a.maxX - slack && a.minY < b.maxY - slack && b.minY < a.maxY - slack;

/** The pictures drawn on a page, top to bottom, as the words of READ_PICTURES. */
function pictures(p: PageOps): { word: string; cx: number; cy: number; size: number }[] {
  const out: { word: string; cx: number; cy: number; size: number }[] = [];
  for (const op of p.ops) {
    if (op.t !== 'group' || op.ops[0]?.t !== 'path') continue;
    for (const [word, emoji] of Object.entries(READ_PICTURES)) {
      const ref = iconOps(emoji, 0, 0, 10)[0];
      if (ref.t === 'group' && ref.ops[0].t === 'path' && op.ops[0].subpaths === ref.ops[0].subpaths && op.ops.length === ref.ops.length) {
        const size = (op.scale * 10) / ref.scale;
        out.push({ word, cx: op.tx + size / 2, cy: op.ty + size / 2, size });
      }
    }
  }
  return out.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
}

const CONFIGS: Partial<WorksheetConfig>[] = [
  {},
  { letterMode: 'lowercase', childName: 'Ana-Maria Ștefănescu' },
  { script: 'cursive', letterMode: 'paired' },
  { curriculumLevel: 'CP' },
  { curriculumLevel: 'I' },
  { curriculumLevel: 'II' },
];

describe('the words, sentences and texts', () => {
  it('Romanian letters: ș ț with the comma below, never the cedilla; no stray spaces', () => {
    const src = readFileSync('src/lib/worksheet/reading.ts', 'utf8');
    expect(src).not.toMatch(/[şţŞŢ]/);
    for (const it of ITEMS) for (const c of CONFIGS) for (const t of texts(page(it, c))) expect(t.text, it).not.toMatch(t.text.startsWith('Nume:') ? /[şţŞŢ]/ : /[şţŞŢ]|\s{2}|^\s|\s$/);
  });

  it('every word shown with a picture has one, and the pictures are drawn', () => {
    const shown = [...MATCH_SETS.flat(), ...GAP_SETS.flat().map((g) => g.word), ...COPY_SETS.filter((_, i) => READING_LEVELS.copy[i] === 'CP').flat()];
    for (const w of shown) expect(hasIcon(READ_PICTURES[w] ?? ''), w).toBe(true);
    for (const t of TEXT_SETS) if (t.picture) expect(hasIcon(t.picture), t.title).toBe(true);
    // one picture, one word
    expect(new Set(Object.values(READ_PICTURES)).size).toBe(Object.keys(READ_PICTURES).length);
  });

  it('clasa pregătitoare: short words without diphthongs, hiatus or the groups ce, ci, ge, gi, che, chi, ghe, ghi', () => {
    const cp: string[] = [];
    for (const kind of ['match', 'gap', 'draw', 'copy'] as const) {
      const all = { match: MATCH_SETS, gap: GAP_SETS.map((s) => s.map((g) => g.word)), draw: DRAW_SETS, copy: COPY_SETS }[kind];
      for (const n of setsOf(kind, 'CP')) cp.push(...all[n - 1].flatMap(words));
    }
    expect(cp.length).toBeGreaterThan(40);
    for (const w of cp) {
      expect(/[aeiouăâî]{2}/.test(w), w).toBe(false);
      expect(/[cg]h?[ei]/.test(w), w).toBe(false);
      // one or two syllables (a vowel per syllable)
      expect(w.match(/[aeiouăâî]/g)?.length ?? 0, w).toBeLessThanOrEqual(2);
    }
  });

  it('the sets have the sizes the pages are laid out for, and no word twice in a set', () => {
    for (const set of MATCH_SETS) expect(new Set(set).size).toBe(6);
    for (const set of GAP_SETS) expect(new Set(set.map((g) => g.word)).size).toBe(8);
    for (const set of DRAW_SETS) expect(new Set(set).size).toBe(6);
    for (const set of FILL_SETS) expect(new Set(set.map((f) => f.text)).size).toBe(6);
    for (const set of ORDER_SETS) expect(new Set(set).size).toBe(5);
    COPY_SETS.forEach((set, i) => expect(new Set(set).size, String(i)).toBe({ CP: 6, I: 5, II: 4 }[READING_LEVELS.copy[i]]));
    // no sentence is written twice in a kind
    for (const all of [FILL_SETS.flat().map((f) => f.text), ORDER_SETS.flat(), COPY_SETS.flat().filter((s) => s.includes(' '))]) expect(new Set(all).size).toBe(all.length);
    // copying: at most 30 words in clasa I, 50 in clasa a II-a (the contents of the programme)
    COPY_SETS.forEach((set, i) => {
      const level = READING_LEVELS.copy[i];
      if (level !== 'CP') expect(set.flatMap(words).length, String(i)).toBeLessThanOrEqual(level === 'I' ? 30 : 50);
      if (level !== 'CP') for (const s of set) expect(s, s).toMatch(/^\p{Lu}.*\.$/u);
    });
  });

  it('„Ce literă lipsește?”: one letter goes in the gap, the others make no name of the picture', () => {
    GAP_SETS.forEach((set, i) => {
      const level = READING_LEVELS.gap[i];
      for (const g of set) {
        expect([...g.word][g.at], g.word).toBe(g.answer);
        expect(new Set([g.answer, ...g.others]).size, g.word).toBe(3);
        // CP 1.3 „sunetul inițial și/ sau final”: the first or the last letter only
        if (level === 'CP') expect([0, [...g.word].length - 1], g.word).toContain(g.at);
        // „lună” / „luna”: both name the moon; „lumânare” / „lumînare” (old spelling)
        if (g.answer === 'ă' && g.at === [...g.word].length - 1) expect(g.others, g.word).not.toContain('a');
        if (g.answer === 'â') expect(g.others, g.word).not.toContain('î');
        // never a letter of ch / gh, which is no sound of its own
        expect(g.answer, g.word).not.toBe('h');
      }
    });
  });

  it('„Completează propoziția”: one gap, three different words, the answer once', () => {
    for (const set of FILL_SETS)
      for (const f of set) {
        expect(f.text.split('___').length, f.text).toBe(2);
        expect(new Set([f.answer, ...f.others]).size, f.text).toBe(3);
        expect(f.text, f.text).toMatch(/^\p{Lu}.*\.$/u);
      }
  });

  it('„Ordonează cuvintele”: the first word has the only capital, the last the only full stop', () => {
    ORDER_SETS.forEach((set, i) => {
      for (const s of set) {
        const w = s.split(' ');
        expect(w.length, s).toBeGreaterThanOrEqual(READING_LEVELS.order[i] === 'I' ? 3 : 5);
        expect(w[0], s).toMatch(/^\p{Lu}/u);
        for (const x of w.slice(1)) expect(x, s).toMatch(/^\p{Ll}/u);
        expect(w[w.length - 1], s).toMatch(/\.$/);
        for (const x of w.slice(0, -1)) expect(x, s).not.toMatch(/[.,!?;:]/);
      }
    });
  });

  it('„Citește și răspunde”: original texts within the length of the class, each question answered once in the text', () => {
    TEXT_SETS.forEach((t, i) => {
      const level = READING_LEVELS.text[i];
      const all = t.sentences.join(' ');
      const tokens = words(all);
      // clasa I: very short texts of 3–5 sentences; clasa a II-a: 5–8 sentences
      expect(t.sentences.length, t.title).toBeGreaterThanOrEqual(level === 'I' ? 3 : 5);
      expect(t.sentences.length, t.title).toBeLessThanOrEqual(level === 'I' ? 5 : 8);
      for (const s of t.sentences) expect(s, t.title).toMatch(/^[\p{Lu}„].*[.!?”]$/u);
      // the programme: texts of at most 75 words in clasa I, 120 in clasa a II-a
      expect(tokens.length, t.title).toBeLessThanOrEqual(level === 'I' ? 75 : 120);
      expect(t.questions.length, t.title).toBeGreaterThanOrEqual(3);
      expect(t.questions.length, t.title).toBeLessThanOrEqual(4);
      expect(t.questions.some((q) => q.options), t.title).toBe(true);
      for (const q of t.questions) expect(q.q, t.title).toMatch(q.options ? /^\p{Lu}.*\?$/u : /^\p{Lu}.*\.$/u);
      const has = (phrase: string) => {
        const p = words(phrase);
        return tokens.some((_, k) => p.every((x, j) => tokens[k + j] === x));
      };
      for (const q of t.questions) {
        if (q.options) {
          expect(new Set(q.options).size).toBe(3);
          q.options.forEach((o, k) => expect(has(o), `${t.title}: ${o}`).toBe(k === q.answer));
        } else expect([0, 1]).toContain(q.answer);
      }
      // the right answer is not always in the same place
      if (i >= 6) expect(new Set(t.questions.filter((q) => q.options).map((q) => q.answer)).size, t.title).toBe(3);
    });
    // at least ten texts for each class, no title twice
    for (const level of ['I', 'II'] as const) expect(setsOf('text', level).length, level).toBeGreaterThanOrEqual(10);
    expect(new Set(TEXT_SETS.map((t) => t.title)).size).toBe(TEXT_SETS.length);
    // both kinds of answer among the Da / Nu questions of a class
    for (const level of ['I', 'II'] as const) {
      const yn = TEXT_SETS.filter((_, i) => READING_LEVELS.text[i] === level).flatMap((t) => t.questions.filter((q) => !q.options).map((q) => q.answer));
      expect(new Set(yn).size, level).toBe(2);
    }
  });
});

describe('the items', () => {
  it('are activities with a label, and the store keeps exactly these', () => {
    expect(ITEMS).toHaveLength(READ_KINDS.reduce((n, k) => n + READING_LEVELS[k].length, 0));
    expect(ITEMS).toHaveLength(132);
    expect(new Set(ITEMS).size).toBe(ITEMS.length);
    // every kind has at least eight sets for each of its classes (the texts: ten)
    for (const kind of READ_KINDS) for (const level of new Set(READING_LEVELS[kind])) expect(setsOf(kind, level).length, `${kind} ${level}`).toBeGreaterThanOrEqual(kind === 'text' ? 10 : 8);
    expect([MATCH_SETS, GAP_SETS, DRAW_SETS, FILL_SETS, ORDER_SETS, COPY_SETS, TEXT_SETS].map((x) => x.length)).toEqual(READ_KINDS.map((k) => READING_LEVELS[k].length));
    for (const i of ITEMS) {
      expect(isReadingItem(i), i).toBe(true);
      expect(isActivityItem(i), i).toBe(true);
      expect(activityLabel(i)).toBe(readingLabel(i));
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
      expect(itemFitsCategory(i, 'letters'), i).toBe(false);
    }
    expect(readingLabel('read:gap:4')).toBe('Ce literă lipsește? (clasa I, 2)');
    expect(readingLabel('read:match:1')).toBe('Unește cuvântul cu imaginea (clasa pregătitoare, 1)');
    // the picker shows the sets class by class, numbered within the class
    expect(ITEMS.filter((i) => i.startsWith('read:copy:')).map(readingShortLabel)).toEqual(['CP', 'I', 'II'].flatMap((l) => [1, 2, 3, 4, 5, 6, 7, 8].map((k) => `${l} ${k}`)));
    expect(ITEMS.filter((i) => i.startsWith('read:copy:')).slice(0, 4)).toEqual(['read:copy:1', 'read:copy:2', 'read:copy:7', 'read:copy:8']);
    expect(readingLabel('read:text:7')).toBe('Citește și răspunde (clasa I, 4)');
    expect(readingLabel('read:gap:24')).toBe('Ce literă lipsește? (clasa a II-a, 8)');
    // the store's own copy of the ids (sanitize-config.ts) matches the builders exactly
    for (const kind of READ_KINDS) for (let n = 0; n <= 30; n++) expect(itemFitsCategory(`read:${kind}:${n}`, 'games'), `${kind} ${n}`).toBe(n >= 1 && n <= READING_LEVELS[kind].length);
    for (const no of ['read:gap:0', 'read:gap:25', 'read:match:17', 'read:text:21', 'read:gap:07', 'read:copy', 'read:x:1', 'read::1', 'reads:gap:1', 'read:gap:1:2', 'gap:1']) {
      expect(isReadingItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(isActivityItem(no));
    }
    expect(sanitizeConfig(games(['read:gap:1', 'read:text:6', 'read:text:20', 'read:text:21', 'read:x:1'])).selectedItems).toEqual(['read:gap:1', 'read:text:6', 'read:text:20']);
  });

  it('free plan: the first set of each class of each kind; the rest in the paid plan', () => {
    expect(ITEMS.filter((i) => isItemAllowed(i, 'games', 'free'))).toEqual([
      'read:match:1', 'read:match:4', 'read:gap:1', 'read:gap:3', 'read:gap:5', 'read:draw:1', 'read:draw:4',
      'read:fill:1', 'read:fill:4', 'read:order:1', 'read:order:4', 'read:copy:1', 'read:copy:3', 'read:copy:5', 'read:text:1', 'read:text:4',
    ]);
    expect(ITEMS.filter((i) => isItemAllowed(i, 'games', 'free')).map(readingShortLabel).every((l) => / 1$/.test(l))).toBe(true);
    for (const i of ITEMS) expect(isItemAllowed(i, 'games', 'full')).toBe(true);
    expect(hasContent(games(['read:gap:2', 'read:text:5']), 'free')).toBe(false);
    expect(buildWorksheetPages(games(['read:gap:1', 'read:gap:2', 'read:text:1']), 'free')).toHaveLength(2);
  });

  it('every reading sheet and evaluation on /programa opens on free sets, in each of its classes', () => {
    for (const p of SHEET_PRESETS.filter((x) => x.id.startsWith('citire-') || x.id === 'evaluare-citire'))
      for (const level of p.levels!) {
        const config = presetConfig(p, level);
        for (const i of config.selectedItems) expect(isItemAllowed(i, 'games', 'free'), `${p.id} ${level} ${i}`).toBe(true);
        expect(buildWorksheetPages(config, 'free').length, `${p.id} ${level}`).toBeGreaterThan(0);
      }
  });

  it('are the same every time (preview = PDF)', () => {
    const a = JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'));
    expect(JSON.stringify(buildWorksheetPages(games(ITEMS, { mathAnswers: true }), 'full'))).toBe(a);
  });

  it('one page per item, everything inside the A4 margins, in every setting', () => {
    for (const c of CONFIGS) {
      const pages = buildWorksheetPages(games(ITEMS, c), 'free');
      expect(pages.filter((p) => texts(p).some((t) => t.text === 'Nume: ______________     Data: ____________' || t.text.startsWith('Nume:')))).toHaveLength(16);
      for (const p of buildWorksheetPages(games(ITEMS, c), 'full')) {
        expect([p.width, p.height]).toEqual([210, 297]);
        // the drawing; the texts are checked with their measured widths below
        const drawing = { ...p, ops: flattenOps(p.ops).filter((o) => o.t !== 'text') as PageOps['ops'] };
        expect(opsOutside(drawing, { minX: 11, minY: 11, maxX: 199, maxY: 289 }), JSON.stringify(c)).toEqual([]);
        for (const t of texts(p)) {
          const b = realBox(t);
          expect(b.minY >= 11 && b.maxY <= 289 && b.minX >= 11.5 && b.maxX <= 198.5, `${t.text} ${JSON.stringify(c)}`).toBe(true);
        }
      }
    }
  });

  it('no text runs into another text or a picture (widths measured with the embedded font)', () => {
    for (const c of CONFIGS)
      for (const it of ITEMS) {
        const p = page(it, c);
        const boxes = texts(p).filter((t) => !t.rotate).map((t) => ({ t, b: realBox(t) }));
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i].b, boxes[j].b), `${it} ${JSON.stringify(c)}: „${boxes[i].t.text}” / „${boxes[j].t.text}”`).toBe(false);
        for (const pic of pictures(p)) {
          const pb = { minX: pic.cx - pic.size / 2, maxX: pic.cx + pic.size / 2, minY: pic.cy - pic.size / 2, maxY: pic.cy + pic.size / 2 };
          for (const { t, b } of boxes) expect(overlap(pb, b, 0.5), `${it}: ${pic.word} / „${t.text}”`).toBe(false);
        }
        // the texts inside the page, with their real widths
        for (const { t, b } of boxes) {
          expect(b.minX, `${it}: ${t.text}`).toBeGreaterThanOrEqual(11.5);
          expect(b.maxX, `${it}: ${t.text}`).toBeLessThanOrEqual(198.5);
        }
      }
  });

  it('the instruction at the top says what to do, in Romanian', () => {
    const top = (it: string, c: Partial<WorksheetConfig> = {}) => texts(page(it, c)).map((t) => t.text);
    expect(top('read:match:1')).toContain('Citește cuvântul și unește-l cu imaginea potrivită.');
    expect(top('read:gap:3')).toContain('Scrie în căsuță litera care lipsește.');
    expect(top('read:draw:2')).toContain('Citește ce scrie deasupra căsuței și desenează în ea.');
    expect(top('read:fill:4')).toContain('Completează propoziția cu cuvântul potrivit.');
    expect(top('read:order:2')).toContain('Așază cuvintele în ordine și scrie propoziția.');
    expect(top('read:copy:1')).toContain('Citește cuvântul și copiază-l pe rând.');
    expect(top('read:copy:3')).toContain('Transcrie propozițiile cu litere de mână.');
    expect(top('read:copy:3', { script: 'cursive' })).toContain('Copiază propozițiile cu litere de mână.');
    expect(top('read:text:5')).toContain('Citește textul, apoi răspunde la întrebări.');
  });
});

describe('what the child sees and the answers page agree', () => {
  const key = (it: string, c: Partial<WorksheetConfig> = {}) => gameKeySection(games([it], c), it)!;

  it('„Unește cuvântul cu imaginea”: six words, their six pictures, never a picture next to its word', () => {
    for (const n of SETS('match')) {
      const { words: w, pictures: pics } = matchLayout(n);
      expect([...w].sort()).toEqual([...MATCH_SETS[n - 1]].sort());
      expect([...pics].sort()).toEqual([...w].sort());
      w.forEach((x, i) => expect(pics[i], `${n} ${x}`).not.toBe(x));
      for (const c of [{}, { letterMode: 'lowercase' as const }]) {
        const p = page(item('match', n), c);
        expect(pictures(p).map((x) => x.word)).toEqual(pics);
        const level = READING_LEVELS.match[n - 1];
        const shown = w.map((x) => (level === 'CP' && !c.letterMode ? x.toLocaleUpperCase('ro') : x));
        const cards = texts(p).filter((t) => shown.includes(t.text)).map((t) => t.text);
        expect(cards).toEqual(shown);
        // the key: each word with the place of its picture
        expect(key(item('match', n), c).entries).toEqual(shown.map((x, i) => `${x} – imaginea ${pics.indexOf(w[i]) + 1}`));
      }
    }
  });

  it('„Ce literă lipsește?”: the word around the box, the three letters, the key', () => {
    for (const n of SETS('gap')) {
      const items = gapLayout(n);
      const p = page(item('gap', n));
      expect(pictures(p).map((x) => x.word)).toEqual(items.map((g) => g.word));
      const t = texts(p).map((x) => x.text);
      const up = READING_LEVELS.gap[n - 1] === 'CP' ? (s: string) => s.toLocaleUpperCase('ro') : (s: string) => s;
      items.forEach((g, i) => {
        const letters = [...up(g.word)];
        const before = letters.slice(0, g.at).join('');
        const after = letters.slice(g.at + 1).join('');
        if (before) expect(t, g.word).toContain(before);
        if (after) expect(t, g.word).toContain(after);
        for (const o of g.options) expect(t, g.word).toContain(up(o));
        expect(g.options.filter((o) => o === g.answer)).toHaveLength(1);
        expect(key(item('gap', n)).entries[i]).toBe(`${up(g.word)} – ${up(g.answer)}`);
      });
    }
  });

  it('„Completează propoziția”: the sentence, its three words, the key with the right word in place', () => {
    for (const n of SETS('fill')) {
      const items = fillLayout(n);
      const t = texts(page(item('fill', n))).map((x) => x.text);
      items.forEach((f, i) => {
        for (const o of f.options) expect(t, f.text).toContain(o);
        expect(key(item('fill', n)).entries[i]).toBe(f.text.replace('___', f.answer));
      });
    }
  });

  it('„Ordonează cuvintele”: the cards are the words of the sentence, none in its place; the key is the sentence', () => {
    for (const n of SETS('order')) {
      const items = orderLayout(n);
      const t = texts(page(item('order', n))).map((x) => x.text);
      items.forEach((o, i) => {
        const w = o.sentence.split(' ');
        expect([...o.cards].sort()).toEqual([...w].sort());
        o.cards.forEach((c, k) => expect(c, o.sentence).not.toBe(w[k]));
        for (const c of o.cards) expect(t).toContain(c);
        expect(key(item('order', n)).entries[i]).toBe(o.sentence);
      });
    }
  });

  it('„Citește și răspunde”: the text and the questions are printed, the key names the right option', () => {
    for (const n of SETS('text')) {
      const tx = TEXT_SETS[n - 1];
      const t = texts(page(item('text', n))).map((x) => x.text);
      expect(t).toContain(tx.title);
      expect(t.join(' ').replace(/\s+/g, ' ')).toContain(tx.sentences.join(' '));
      tx.questions.forEach((q, i) => {
        expect(t).toContain(`${i + 1}. ${q.q}`);
        expect(key(item('text', n)).entries[i]).toBe(textAnswer(q));
      });
    }
    expect(textAnswer(TEXT_SETS[0].questions[1])).toBe('b) pe pernă');
    expect(textAnswer(TEXT_SETS[0].questions[2])).toBe('Nu');
  });

  it('„Citește și desenează” and „Copiază” have nothing to check: no answers section', () => {
    for (const k of ['draw', 'copy'] as const) for (const n of SETS(k)) expect(gameKeySection(games([item(k, n)]), item(k, n))).toBeNull();
    const pages = buildWorksheetPages(games(['read:draw:1', 'read:copy:1'], { mathAnswers: true }), 'full');
    expect(pages).toHaveLength(2);
    const withKey = buildWorksheetPages(games(['read:gap:1', 'read:copy:1'], { mathAnswers: true }), 'full');
    expect(texts(withKey[2]).map((t) => t.text)).toContain('Răspunsuri');
  });
});

describe('writing', () => {
  const groups = (p: PageOps) => flattenOps(p.ops).length;
  const slanted = (p: PageOps) => flattenOps(p.ops).filter((o) => o.t === 'line' && Math.abs(o.x1 - o.x2) > 0.5 && Math.abs(o.y1 - o.y2) > 3 && o.strokeWidth < 0.2).length;

  it('clasa I writes on rows with slanted lines (tip I), clasa a II-a on rows without them', () => {
    expect(slanted(page('read:copy:3'))).toBeGreaterThan(100);
    expect(slanted(page('read:order:1'))).toBeGreaterThan(100);
    expect(slanted(page('read:copy:5'))).toBe(0);
    expect(slanted(page('read:order:4'))).toBe(0);
    expect(slanted(page('read:copy:1'))).toBe(0);
  });

  it('the model is in joined handwriting with „de mână”, in print otherwise; clasa pregătitoare is always print', () => {
    const sentences = (p: PageOps) => texts(p).map((t) => t.text).filter((t) => COPY_SETS.flat().includes(t));
    expect(sentences(page('read:copy:3'))).toEqual(COPY_SETS[2]);
    expect(sentences(page('read:copy:3', { script: 'cursive' }))).toEqual([]);
    expect(groups(page('read:copy:3', { script: 'cursive' }))).toBeGreaterThan(groups(page('read:copy:3')));
    expect(JSON.stringify(page('read:copy:1', { script: 'cursive' }).ops)).toBe(JSON.stringify(page('read:copy:1').ops));
    // capitals in CP unless the small letters are chosen
    expect(JSON.stringify(page('read:copy:1', { letterMode: 'lowercase' }).ops)).not.toBe(JSON.stringify(page('read:copy:1').ops));
  });

  it('a handwritten sentence has its full stop and commas, and fits the row', () => {
    const line = cursiveLine('Iarna, dealul este acoperit cu zăpadă.', 20, 100, 0.085);
    expect(line.ops.filter((o) => o.t === 'circle')).toHaveLength(1);
    expect(line.ops.filter((o) => o.t === 'line')).toHaveLength(1);
    // on the copy page of clasa a II-a it is the widest model: the rows are made to fit it
    expect(line.width).toBeLessThan(W_ROW);
    expect(line.width).toBeGreaterThan(80);
    const p = page('read:copy:6', { script: 'cursive' });
    expect(opsOutside(p, { minX: 12, minY: 12, maxX: 198, maxY: 285 })).toEqual([]);
  });

  it('the measured widths are those of the embedded font', () => {
    for (const s of ['Motanul Puf are blana albă.', 'ÎNGHEȚATĂ', 'șapte, opt, nouă']) {
      doc.setFont('Nunito', 'bold');
      doc.setFontSize(10 * (72 / 25.4));
      expect(Math.abs(textW(s, 10) - doc.getTextWidth(s))).toBeLessThan(0.05);
    }
  });
});

describe('the competences', () => {
  const codes = (it: string, level: SchoolLevel) => sheetCompetences(games([it]), level).map((r) => `${r.programme} ${r.code}`);
  const LEVELS: SchoolLevel[] = ['presc', 'CP', 'I', 'II'];
  const EXPECTED: Record<ReadKind, Partial<Record<ReadLevel, string>>> = {
    match: { CP: '3.1', I: '3.1' },
    gap: { CP: '1.3', I: '1.3', II: '1.3' },
    draw: { CP: '3.1', I: '3.1' },
    fill: { I: '3.1' },
    order: { I: '4.2', II: '4.2' },
    copy: { CP: '4.1', I: '4.1', II: '4.1' },
    text: { I: '3.2', II: '3.2' },
  };

  it('a set prints its code only in the class it is written for, from CLR', () => {
    for (const it of ITEMS) {
      const [, kind] = it.split(':') as [string, ReadKind];
      const own = readingSetLevel(it)!;
      for (const level of LEVELS) {
        const want = level === own && EXPECTED[kind][own] ? [`clr-p-ii ${EXPECTED[kind][own]}`] : [];
        expect(codes(it, level), `${it} ${level}`).toEqual(want);
      }
    }
  });

  it('the codes exist in the programme with these texts', () => {
    const text = (level: 'CP' | 'I' | 'II', code: string) => findCompetence({ programme: 'clr-p-ii', level, code })?.text;
    expect(text('CP', '3.1')).toBe('Recunoașterea unor cuvinte uzuale, din universul apropiat, scrise cu litere mari și mici de tipar');
    expect(text('I', '3.1')).toBe('Citirea unor cuvinte și propoziții scurte, scrise cu litere de tipar sau de mână');
    expect(text('CP', '1.3')).toBe('Identificarea sunetului inițial și/ sau final dintr-un cuvânt, a silabelor și a cuvintelor din propoziții rostite clar și rar');
    expect(text('I', '1.3')).toBe('Identificarea unor sunete, silabe, cuvinte în enunțuri rostite cu claritate');
    expect(text('II', '1.3')).toBe('Identificarea sunetelor și silabelor în cuvinte și a cuvintelor în enunțuri rostite cu claritate');
    expect(text('I', '4.2')).toBe('Redactarea unor mesaje scurte, formate din cuvinte scrise cu litere de mână, folosind materiale diverse');
    expect(text('II', '4.2')).toBe('Redactarea unor mesaje simple, cu respectarea convențiilor de bază');
    expect(text('CP', '4.1')).toBe('Trasarea elementelor grafice și a contururilor literelor, folosind resurse variate');
    expect(text('I', '4.1')).toBe('Scrierea literelor de mână');
    expect(text('II', '4.1')).toBe('Scrierea unor mesaje, în diverse contexte de comunicare');
    expect(text('I', '3.2')).toBe('Identificarea mesajului unui scurt text care prezintă întâmplări, fenomene, evenimente familiare');
    expect(text('II', '3.2')).toBe('Identificarea mesajului unui text în care se relatează întâmplări, fenomene din universul cunoscut');
  });

  it('the printed line names them', () => {
    const line = (it: string, level: SchoolLevel) => texts(page(it, { curriculumLevel: level })).map((t) => t.text).find((t) => t.startsWith('Competen'));
    expect(line('read:text:4', 'II')).toBe('Competența specifică 3.2 · Comunicare în limba română, clasa a II-a');
    expect(line('read:match:1', 'CP')).toBe('Competența specifică 3.1 · Comunicare în limba română, clasa pregătitoare');
    expect(line('read:text:1', 'II')).toBeUndefined();
  });

  it('the „Fișe pe programă” pages list the reading sheets under their codes, and the class evaluations', () => {
    const listed = (slug: string, code: string) =>
      classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).flatMap((g) => g.items).find((i) => i.code === code && i.programme === 'clr-p-ii')!.presets.map((p) => p.id).filter((id) => id.startsWith('citire-'));
    expect(listed('clasa-pregatitoare', '3.1')).toEqual(['citire-uneste', 'citire-deseneaza']);
    expect(listed('clasa-pregatitoare', '1.3')).toEqual(['citire-litera-lipsa']);
    expect(listed('clasa-pregatitoare', '4.1')).toEqual(['citire-copiaza']);
    expect(listed('clasa-1', '3.1')).toEqual(['citire-uneste', 'citire-deseneaza', 'citire-completeaza']);
    expect(listed('clasa-1', '3.2')).toEqual(['citire-text']);
    expect(listed('clasa-1', '4.1')).toEqual(['citire-copiaza']);
    expect(listed('clasa-1', '4.2')).toEqual(['citire-ordoneaza']);
    expect(listed('clasa-2', '1.3')).toEqual(['citire-litera-lipsa']);
    expect(listed('clasa-2', '3.2')).toEqual(['citire-text']);
    expect(listed('clasa-2', '4.1')).toEqual(['citire-copiaza']);
    expect(listed('clasa-2', '4.2')).toEqual(['citire-ordoneaza']);
    for (const p of SHEET_PRESETS.filter((x) => x.id.startsWith('citire-')))
      for (const level of p.levels!) expect(sheetCompetences(presetConfig(p, level), level).length, `${p.id} ${level}`).toBe(1);
    const ev = (slug: string) => classEvaluations(CLASS_PAGES.find((c) => c.slug === slug)!).find((e) => e.preset.id === 'evaluare-citire')?.codes;
    expect(ev('clasa-1')).toEqual(['1.3', '3.1', '3.2']);
    expect(ev('clasa-2')).toEqual(['1.3', '3.2', '4.2']);
    expect(ev('clasa-pregatitoare')).toBeUndefined();
  });
});

describe('the evaluation', () => {
  it('match, gap, fill, order and text have a short form; draw and copy do not', () => {
    // (the sets added after the first six have no short form yet: evaluation.ts names the sets 1–6)
    for (const it of ITEMS) {
      if (/^read:(draw|copy):/.test(it)) expect(isEvaluationItem(it), it).toBe(false);
      else if (Number(it.split(':')[2]) <= 6) expect(isEvaluationItem(it), it).toBe(true);
    }
  });

  it('the answers of the evaluation are those of the sheets', () => {
    const pages = buildWorksheetPages(presetConfig(presetById('evaluare-citire')!, 'II'), 'full');
    const all = pages.flatMap((p) => texts(p).map((t) => t.text));
    expect(all).toContain('Evaluare — Comunicare în limba română, clasa a II-a');
    expect(all).toContain(`a) ${orderLayout(4)[1].sentence}`);
    expect(all).toContain('1) b – opt');
    expect(all).toContain('3) Nu');
    const gapAnswers = all.filter((t) => /^[a-d]\) \p{L}+ – \p{L}$/u.test(t));
    expect(gapAnswers).toHaveLength(4);
    for (const a of gapAnswers) {
      const [, word, letter] = a.match(/^[a-d]\) (\p{L}+) – (\p{L})$/u)!;
      const g = GAP_SETS[4].find((x) => x.word === word)!;
      expect(g.answer, word).toBe(letter);
    }
  });

  it('the pictures of an evaluation are not repeated', () => {
    const p = buildWorksheetPages(presetConfig(presetById('evaluare-citire')!, 'I'), 'full').flatMap(pictures).map((x) => x.word);
    expect(new Set(p).size).toBe(p.length);
  });
});

