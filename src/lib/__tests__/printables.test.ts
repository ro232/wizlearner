import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { iconOps } from '@/lib/hints/icons';
import { ALPHABETS, LETTER_HINTS } from '@/lib/glyphs/data';
import { safeProps } from '@/lib/analytics';
import { PROJECT_LABELS, PROJECT_ROUTES, type ProjectKind } from '@/lib/projects';
import { buildAlphabetPages, letterPositions, posterWord, type AlphabetOptions } from '@/lib/printables/alphabet';
import { buildCardPages, cardGrid, cardsFor, commonSyllables, syllableList, pictureWords, CARD_SET_TITLES, type CardOptions, type CardSet } from '@/lib/printables/cards';
import { buildTokenPages, tokenList, TOKEN_GRID } from '@/lib/printables/tokens';
import { buildDiplomaPages, diplomaName, diplomaTitle, DIPLOMAS } from '@/lib/printables/diplomas';
import { CUT, cellAt, mirroredCell, numberWord, PALETTE } from '@/lib/printables/common';
import { DEFAULT_PRINTABLE, FREE_LETTERS, PRINTABLE_KINDS, PRINTABLE_IDS, allowedPrintable, buildPrintablePages, printableTitle, sanitizePrintable, type PrintableSettings } from '@/lib/printables';
import { PRINTABLE_SAMPLES } from './printables-samples';
import { opBox, opsOutside } from './bounds';
import { texts } from './drawn';

type Group = Extract<DrawOp, { t: 'group' }>;

/** Whether the page draws the picture of `emoji` (its shapes, in colour or as an outline to colour in). */
function hasPicture(page: PageOps, emoji: string): boolean {
  const ref = iconOps(emoji, 0, 0, 10)[0];
  if (ref.t !== 'group' || ref.ops[0].t !== 'path') return false;
  const first = ref.ops[0];
  return page.ops.some((op) => op.t === 'group' && op.ops.length === ref.ops.length && op.ops[0]?.t === 'path' && op.ops[0].subpaths === first.subpaths);
}

const isCut = (op: DrawOp): op is Extract<DrawOp, { t: 'line' }> => op.t === 'line' && op.stroke === CUT && !!op.dash;
const card = (o: Partial<CardOptions> = {}): CardOptions => ({ set: 'letters', letters: [], perPage: 12, backs: false, script: 'print', letterCase: 'upper', numberMax: 20, objects: false, ...o });
const poster = (o: Partial<AlphabetOptions> = {}): AlphabetOptions => ({ letters: [], script: 'print', ink: 'color', border: 'simple', strokeOrder: false, ...o });

describe('„Alfabetul pe perete”', () => {
  it('every letter of the Romanian alphabet has its poster, with its picture and its word', () => {
    for (const ink of ['color', 'outline'] as const)
      for (const script of ['print', 'cursive'] as const) {
        const pages = buildAlphabetPages(poster({ ink, script }), 'full');
        expect(pages).toHaveLength(ALPHABETS.ro.length);
        ALPHABETS.ro.forEach((l, i) => {
          const hint = posterWord(l);
          expect(hint, l).toEqual(LETTER_HINTS.ro[l]);
          expect(hasPicture(pages[i], hint.emoji), `${l}: ${hint.emoji}`).toBe(true);
          // the word is drawn in glyphs under the picture: as many glyph groups as letters (print), one joined word (handwriting)
          const wordGroups = pages[i].ops.filter((op): op is Group => op.t === 'group' && op.ty > 230 && op.ty < 275);
          expect(wordGroups.length, `${l}: ${hint.word}`).toBeGreaterThanOrEqual(script === 'print' && ink === 'color' ? [...hint.word].length : 1);
        });
      }
  });

  it('the word has the letter in it (Ă and Â inside the word, as in the letter hints)', () => {
    for (const l of ALPHABETS.ro) expect(letterPositions(posterWord(l).word, l).length, `${l}: ${posterWord(l).word}`).toBeGreaterThan(0);
    expect(posterWord('Ă').word).toBe('pălărie');
    expect(posterWord('Â').word).toBe('pâine');
    expect(letterPositions('pălărie', 'Ă')).toEqual([1, 3]);
  });

  it('picks the letter out in the word in its colour', () => {
    const [page] = buildAlphabetPages(poster({ letters: ['Ă'] }), 'full');
    const colors = page.ops.filter((op): op is Group => op.t === 'group' && op.ty > 230).map((g) => flattenOps(g.ops).find((o) => o.t === 'path')?.stroke);
    // p ă l ă r i e: the two ă in the poster's colour, the rest in ink
    expect(colors.filter((c) => c === PALETTE[1])).toHaveLength(2);
  });

  it('nothing leaves the page; the same baseline on every poster of a set', () => {
    for (const script of ['print', 'cursive'] as const)
      for (const strokeOrder of [false, true]) {
        const pages = buildAlphabetPages(poster({ script, strokeOrder, border: 'dots' }), 'free');
        const tops = new Set<string>();
        for (const p of pages) {
          expect(opsOutside(p, { minX: 4, minY: 4, maxX: 206, maxY: 293 })).toEqual([]);
          const big = p.ops.filter((op): op is Group => op.t === 'group' && op.scale > 0.4 && op.scale < 1);
          tops.add(big.map((g) => (g.ty + 100 * g.scale).toFixed(2)).join());
        }
        // capital and small letter sit on one line, the same on all 31 posters
        expect(tops.size).toBe(1);
      }
  });

  it('selected letters come in alphabet order; none selected is the whole alphabet', () => {
    const pages = buildAlphabetPages(poster({ letters: ['Ș', 'A', 'Î'] }), 'full');
    expect(pages.map((p) => ['A', 'Î', 'Ș'].find((l) => hasPicture(p, LETTER_HINTS.ro[l].emoji)))).toEqual(['A', 'Î', 'Ș']);
    expect(buildAlphabetPages(poster({ letters: [] }), 'full')).toHaveLength(31);
  });
});

describe('„Cartonașe”', () => {
  const sets = Object.keys(CARD_SET_TITLES) as CardSet[];

  it('every card stays inside its own cell, at 8 and 12 a page, for every set', () => {
    for (const set of sets)
      for (const perPage of [8, 12] as const)
        for (const script of ['print', 'cursive'] as const)
          for (const letterCase of ['upper', 'lower'] as const) {
            const o = card({ set, perPage, script, letterCase, numberMax: 100, objects: perPage === 8 });
            const g = cardGrid(perPage);
            for (const c of cardsFor(o)) {
              const ops: DrawOp[] = [];
              c.draw(ops, 0, 0, g.cw, g.ch);
              // 2 mm clear of the cut line all round
              expect(opsOutside({ width: g.cw, height: g.ch, ops }, { minX: 2, minY: 2, maxX: g.cw - 2, maxY: g.ch - 2 }), `${set} ${perPage} ${script} ${letterCase}: ${c.label}`).toEqual([]);
            }
          }
  });

  it('the grid sits within the A4 margins, with a dashed cut line along every edge of every card', () => {
    for (const perPage of [8, 12] as const) {
      const g = cardGrid(perPage);
      expect(g.x).toBeGreaterThanOrEqual(10);
      expect(g.x + g.cols * g.cw).toBeLessThanOrEqual(200 + 1e-9);
      expect(g.y).toBeGreaterThanOrEqual(10);
      expect(g.y + g.rows * g.ch).toBeLessThanOrEqual(287);
      // 14 cards: a full sheet and a sheet with a partial row
      const pages = buildCardPages(card({ perPage, letters: ALPHABETS.ro.slice(0, perPage + (perPage === 8 ? 3 : 2)) }), 'full');
      const counts = [perPage, perPage === 8 ? 3 : 2];
      pages.forEach((p, k) => {
        expect(opsOutside(p, { minX: 8, minY: 5, maxX: 202, maxY: 292 })).toEqual([]);
        const cuts = p.ops.filter(isCut);
        const covered = (x1: number, y1: number, x2: number, y2: number) =>
          cuts.some((c) => Math.abs(c.x1 - c.x2) < 1e-6 === (Math.abs(x1 - x2) < 1e-6) && Math.min(c.x1, c.x2) <= x1 + 1e-6 && Math.max(c.x1, c.x2) >= x2 - 1e-6 && Math.min(c.y1, c.y2) <= y1 + 1e-6 && Math.max(c.y1, c.y2) >= y2 - 1e-6);
        for (let i = 0; i < counts[k]; i++) {
          const c = cellAt(g, i);
          expect(covered(c.x, c.y, c.x + g.cw, c.y), `top ${i}`).toBe(true);
          expect(covered(c.x, c.y + g.ch, c.x + g.cw, c.y + g.ch), `bottom ${i}`).toBe(true);
          expect(covered(c.x, c.y, c.x, c.y + g.ch), `left ${i}`).toBe(true);
          expect(covered(c.x + g.cw, c.y, c.x + g.cw, c.y + g.ch), `right ${i}`).toBe(true);
        }
        // no cut line runs past the last card of a partial row
        const last = cellAt(g, counts[k] - 1);
        for (const c of cuts) expect(Math.max(c.y1, c.y2)).toBeLessThanOrEqual(last.y + g.ch + 1e-6);
        // and the scissors are there
        expect(hasPicture(p, '✂️')).toBe(true);
      });
    }
  });

  it('the back of each card lands behind it when printed on both sides (flipped on the long edge)', () => {
    for (const perPage of [8, 12] as const)
      for (const set of ['letters', 'digits', 'pictures'] as CardSet[]) {
        const o = card({ set, perPage, backs: true, letters: ['B', 'C', 'M', 'Ș', 'T'] });
        const pages = buildCardPages(o, 'full');
        const all = cardsFor(o);
        const g = cardGrid(perPage);
        const per = g.cols * g.rows;
        expect(pages).toHaveLength(2 * Math.ceil(all.length / per));
        for (let sheet = 0; sheet * 2 < pages.length; sheet++) {
          const back = pages[sheet * 2 + 1];
          const labels = texts(back).filter((t) => t.weight === 'bold' && t.text !== 'WorksheetWiz');
          const chunk = all.slice(sheet * per, (sheet + 1) * per);
          expect(labels.map((t) => t.text).sort()).toEqual(chunk.map((c) => c.label).sort());
          chunk.forEach((c, i) => {
            const front = cellAt(g, i);
            const t = labels.find((l) => l.text === c.label && Math.abs(l.y - (front.y + g.ch / 2)) < g.ch / 2)!;
            expect(t, c.label).toBeDefined();
            // same row, mirrored column: its centre is the front centre seen from behind
            expect(t.x).toBeCloseTo(210 - (front.x + g.cw / 2), 6);
            expect(mirroredCell(g, i).row).toBe(front.row);
          });
        }
      }
  });

  it('letters, syllables and pictures follow the chosen letters', () => {
    expect(cardsFor(card({ letters: ['M', 'A'] })).map((c) => c.label)).toEqual(['Aa', 'Mm']);
    expect(syllableList(['M', 'A', 'U', 'E'])).toEqual(['MA', 'ME', 'MU']);
    expect(syllableList(['N'])).toEqual(['NA', 'NE', 'NI', 'NO', 'NU', 'NĂ']);
    expect(syllableList(['A'])).toEqual(['MA', 'NA', 'PA', 'RA', 'SA', 'TA', 'LA', 'CA']);
    // nothing chosen: the most frequent open syllables of the words, each a real syllable of a word
    const common = commonSyllables();
    expect(common).toHaveLength(24);
    expect(syllableList([])).toEqual(common);
    expect(cardsFor(card({ set: 'syllables', letters: ['M'], letterCase: 'lower' })).map((c) => [c.label, c.sub])[0]).toEqual(['ma', 'MA']);
    expect(pictureWords(['Ș']).map((w) => w.word)).toEqual(['șarpe', 'șosete']);
  });

  it('numbers 0–20 with dots, 0–100 for games, the number said on the back', () => {
    const digits = cardsFor(card({ set: 'digits', numberMax: 100 }));
    expect(digits.map((c) => c.label)).toEqual(Array.from({ length: 21 }, (_, i) => String(i)));
    expect(digits[14].sub).toBe('paisprezece');
    const numbers = cardsFor(card({ set: 'numbers', numberMax: 100 }));
    expect(numbers).toHaveLength(101);
    // the dots of a ten-frame card: exactly n
    for (const n of [0, 7, 10, 13, 20]) {
      const ops: DrawOp[] = [];
      digits[n].draw(ops, 0, 0, 63, 67.5);
      expect(flattenOps(ops).filter((o) => o.t === 'circle' && o.fill).length, String(n)).toBe(n);
    }
  });

  it('says numbers as they are counted in Romanian', () => {
    expect([0, 1, 2, 9, 10, 11, 12, 14, 16, 19, 20, 21, 22, 40, 66, 99, 100].map(numberWord)).toEqual([
      'zero', 'unu', 'doi', 'nouă', 'zece', 'unsprezece', 'doisprezece', 'paisprezece', 'șaisprezece', 'nouăsprezece', 'douăzeci',
      'douăzeci și unu', 'douăzeci și doi', 'patruzeci', 'șaizeci și șase', 'nouăzeci și nouă', 'o sută',
    ]);
  });
});

describe('„Jetoane”', () => {
  it('fit one sheet each, inside the margins, round tokens with a dashed circle', () => {
    for (const set of ['math', 'letters'] as const)
      for (const shape of ['round', 'square'] as const)
        for (const numberMax of [10, 20] as const) {
          const o = { set, shape, letterCase: 'lower' as const, numberMax };
          const pages = buildTokenPages(o, 'full');
          expect(pages, `${set} ${shape}`).toHaveLength(1);
          expect(tokenList(o).length).toBeLessThanOrEqual(TOKEN_GRID.cols * TOKEN_GRID.rows);
          expect(opsOutside(pages[0], { minX: 10, minY: 5, maxX: 200, maxY: 292 })).toEqual([]);
          const dashedCircles = pages[0].ops.filter((op) => op.t === 'path' && op.dash && op.closed).length;
          expect(dashedCircles).toBe(shape === 'round' ? tokenList(o).length : 0);
        }
  });

  it('math tokens have every number and the five signs; letter tokens the whole alphabet without Q W X Y', () => {
    const math = tokenList({ set: 'math', shape: 'round', letterCase: 'upper', numberMax: 20 });
    for (let n = 0; n <= 20; n++) expect(math).toContain(String(n));
    for (const s of ['+', '−', '=', '<', '>']) expect(math).toContain(s);
    const letters = tokenList({ set: 'letters', shape: 'round', letterCase: 'upper', numberMax: 10 });
    expect(letters).toHaveLength(54);
    for (const l of ALPHABETS.ro.filter((x) => !'QWXY'.includes(x))) expect(letters, l).toContain(l);
  });
});

describe('„Diplome”', () => {
  const o = { diploma: 'merit' as const, feminine: false, nameScript: 'print' as const, border: 'simple' as const };

  it('one diploma per name of the list, with that name on it', () => {
    const names = ['Ana Popescu', 'ȘTEFAN IONESCU', 'maria-ioana'];
    const pages = buildDiplomaPages(o, { names, teacher: 'Prof. Elena Marin', date: '13 iunie 2027' }, 'full');
    expect(pages).toHaveLength(3);
    const shown = ['Ana Popescu', 'Ștefan Ionescu', 'Maria-Ioana'];
    pages.forEach((p, i) => {
      expect(p.width).toBeGreaterThan(p.height); // landscape
      const all = texts(p).map((t) => t.text);
      expect(all).toContain(shown[i]);
      for (const other of shown.filter((_, j) => j !== i)) expect(all).not.toContain(other);
      expect(all).toContain('Prof. Elena Marin');
      expect(all).toContain('13 iunie 2027');
      expect(all).toContain('Diplomă de merit');
      expect(opsOutside(p, { minX: 5, minY: 5, maxX: 292, maxY: 205 })).toEqual([]);
    });
  });

  it('a long name, a long reason, every title and border: nothing leaves the page or overlaps', () => {
    for (const d of DIPLOMAS)
      for (const nameScript of ['print', 'cursive'] as const)
        for (const border of ['simple', 'dots', 'none'] as const) {
          const [p] = buildDiplomaPages({ diploma: d.id, feminine: true, nameScript, border }, { names: ['Maximilian-Alexandru Constantinescu-Popovici'], school: 'Școala Gimnazială „Mihai Eminescu” nr. 112, București, clasa pregătitoare B', teacher: 'Prof. înv. primar Alexandra-Gabriela Dumitrescu', date: 'vineri, 13 iunie 2027' }, 'free');
          expect(opsOutside(p, { minX: 5, minY: 5, maxX: 292, maxY: 205 }), `${d.id} ${nameScript} ${border}`).toEqual([]);
          const boxes = texts(p).map((t) => ({ t: t.text, b: opBox(t)! }));
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i].b, b = boxes[j].b;
              const hit = a.minX < b.maxX - 0.3 && b.minX < a.maxX - 0.3 && a.minY < b.maxY - 0.3 && b.minY < a.maxY - 0.3;
              expect(hit, `${boxes[i].t} / ${boxes[j].t}`).toBe(false);
            }
        }
  });

  it('without a name, one diploma with the line to write it by hand; titles for a girl where Romanian needs them', () => {
    expect(buildDiplomaPages(o, { names: [] }, 'full')).toHaveLength(1);
    expect(buildDiplomaPages(o, { names: ['  ', ''] }, 'full')).toHaveLength(1);
    expect(diplomaTitle({ ...o, diploma: 'cititor', feminine: true })).toBe('Cea mai bună cititoare');
    expect(diplomaTitle({ ...o, diploma: 'cititor', feminine: false })).toBe('Cel mai bun cititor');
    expect(diplomaTitle({ ...o, diploma: 'gradinita', feminine: true })).toBe('Absolventă de grădiniță');
    expect(diplomaTitle({ ...o, diploma: 'curaj', feminine: true })).toBe('Diplomă pentru curaj');
    expect(diplomaTitle(o, { customTitle: '  Cel mai frumos  desen ' })).toBe('Cel mai frumos desen');
    expect(diplomaName('ŞTEFAN  ţuţu')).toBe('Ștefan Țuțu');
    expect(diplomaName('Ana-Maria McLean')).toBe('Ana-Maria McLean');
  });
});

describe('free and full plan', () => {
  const text = { names: ['Ana', 'Luca', 'Ioana'] };
  const settings = (patch: Partial<PrintableSettings>): PrintableSettings => ({ ...DEFAULT_PRINTABLE, ...patch });

  it('free: the posters and letter cards of A–E (with Ă, Â), a diploma for the first name', () => {
    expect(FREE_LETTERS).toEqual(['A', 'Ă', 'Â', 'B', 'C', 'D', 'E']);
    const all = allowedPrintable(settings({ kind: 'alphabet', letters: [...ALPHABETS.ro] }), text, 'free')!;
    expect(all.settings.letters).toEqual(FREE_LETTERS);
    expect(all.partial).toBe(true);
    expect(allowedPrintable(settings({ kind: 'alphabet', letters: ['A', 'B'] }), text, 'free')!.partial).toBe(false);
    expect(allowedPrintable(settings({ kind: 'alphabet', letters: ['M', 'Ș'] }), text, 'free')).toBeNull();
    expect(allowedPrintable(settings({ kind: 'cards', cardSet: 'letters', letters: ['C', 'M'] }), text, 'free')!.settings.letters).toEqual(['C']);
    const d = allowedPrintable(settings({ kind: 'diploma' }), text, 'free')!;
    expect(d.text.names).toEqual(['Ana']);
    expect(d.partial).toBe(true);
    expect(allowedPrintable(settings({ kind: 'diploma' }), { names: ['Ana'] }, 'free')!.partial).toBe(false);
    // the free pages carry the small „Creat cu …” line, the full plan's do not
    const mark = (p: PageOps[]) => p.every((page) => texts(page).some((t) => t.text.startsWith('Creat cu')));
    expect(mark(buildPrintablePages(d.settings, d.text, 'free'))).toBe(true);
    expect(buildPrintablePages(d.settings, text, 'full').some((page) => texts(page).some((t) => t.text.startsWith('Creat cu')))).toBe(false);
  });

  it('full plan only: other card sets, tokens, the timetable, „Ziua de azi”', () => {
    for (const cardSet of ['syllables', 'pictures', 'digits', 'numbers'] as const) expect(allowedPrintable(settings({ kind: 'cards', cardSet, letters: ['A'] }), text, 'free'), cardSet).toBeNull();
    for (const kind of ['tokens', 'timetable', 'today'] as const) expect(allowedPrintable(settings({ kind }), text, 'free'), kind).toBeNull();
    for (const tier of ['starter', 'full'] as const)
      for (const kind of PRINTABLE_KINDS) {
        const a = allowedPrintable(settings({ kind, letters: [...ALPHABETS.ro] }), text, tier)!;
        expect(a.partial).toBe(false);
        expect(a.text.names).toHaveLength(3);
      }
  });
});

describe('the children’s names never leave the page', () => {
  it('a saved project or a history row holds the settings only', () => {
    const page = {
      ...DEFAULT_PRINTABLE, kind: 'diploma', names: ['Ana Popescu'], namesText: 'Ana Popescu', teacher: 'Elena Marin', school: 'Grădinița 5', date: '13 iunie', customTitle: 'Pentru Ana', customReason: 'Ana e cea mai bună',
    };
    const saved = sanitizePrintable(page);
    expect(Object.keys(saved).sort()).toEqual(Object.keys(DEFAULT_PRINTABLE).sort());
    const json = JSON.stringify(saved) + printableTitle(saved);
    for (const typed of ['Ana', 'Elena', 'Grădinița', 'iunie', 'Pentru']) expect(json).not.toContain(typed);
    // an old or tampered project falls back to the defaults, field by field
    expect(sanitizePrintable({ kind: 'nope', letters: ['A', 'Ж', 7], perPage: 9, lessons: 'x' })).toMatchObject({ kind: 'alphabet', letters: ['A'], perPage: 12, lessons: 5 });
  });

  it('the page sends only identifiers to analytics and the settings to the history', () => {
    const src = readFileSync('src/app/planse/page.tsx', 'utf8');
    const call = src.match(/track\('printable_download', \{([^}]*)\}\)/)![1];
    expect(call.split(',').map((p) => p.split(':')[0].trim())).toEqual(['kind', 'format', 'tier', 'pages', 'count', 'named']);
    expect(call).not.toMatch(/namesText|teacher|school|date|custom|list\.names\[/);
    expect(src).toMatch(/logDownload\('printable', printableTitle\(allowed\.settings\), sanitizePrintable\(allowed\.settings\), pages\.length\)/);
    expect(src).toMatch(/configuration=\{sanitizePrintable\(s\)\}/);
    // what the event can carry: every printable id is an identifier that passes the allow-list
    for (const id of Object.values(PRINTABLE_IDS)) expect(safeProps({ kind: id, named: true, name: 'Ana' })).toEqual({ kind: id, named: true });
    // the names are not kept in the browser either
    expect(src).not.toMatch(/localStorage|sessionStorage|storeGroup/);
  });

  it('the account knows the new kind of project, in the code and in the database', () => {
    expect(PROJECT_ROUTES.printable).toBe('/planse');
    expect(PROJECT_LABELS.printable).toBeTruthy();
    const migrations = readdirSync('supabase/migrations').sort().map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8')).join('\n');
    const lastCheck = (table: string) => [...migrations.matchAll(new RegExp(`${table}_kind_check CHECK \\(kind IN \\(([^)]*)\\)\\)`, 'g'))].pop()![1];
    for (const table of ['saved_worksheets', 'download_history']) {
      const kinds = lastCheck(table).split(',').map((k) => k.trim().replace(/'/g, ''));
      expect(kinds.sort()).toEqual((Object.keys(PROJECT_ROUTES) as ProjectKind[]).sort());
    }
  });
});

describe('Romanian text', () => {
  it('ș and ț with the comma below everywhere, never the cedilla', () => {
    const cedilla = /[şţŞŢ]/;
    for (const [name, build] of Object.entries(PRINTABLE_SAMPLES))
      for (const p of build()) for (const t of texts(p)) expect(t.text, `${name}: ${t.text}`).not.toMatch(cedilla);
    for (const f of readdirSync('src/lib/printables')) expect(readFileSync(`src/lib/printables/${f}`, 'utf8'), f).not.toMatch(cedilla);
    expect(readFileSync('src/app/planse/page.tsx', 'utf8')).not.toMatch(cedilla);
    // a name typed with the cedilla prints with the comma
    const [p] = buildDiplomaPages({ diploma: 'curaj', feminine: false, nameScript: 'print', border: 'simple' }, { names: ['Ştefan Ţurcanu'], teacher: 'Ş. Ţ.' }, 'full');
    for (const t of texts(p)) expect(t.text).not.toMatch(cedilla);
  });
});
