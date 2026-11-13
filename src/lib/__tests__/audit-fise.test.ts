import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALPHABETS, getGlyph, hintFor, LETTER_HINTS, lettersOfWord, traceLetters, unsupportedLetters } from '@/lib/glyphs/data';
import { cursiveWord } from '@/lib/glyphs/cursive';
import { DEFAULT_GLYPH_STYLE, dashPeriod, dashPieces, glyphBounds, ownLead, renderGlyph, OWN_MARGIN } from '@/lib/glyphs/render';
import { flattenOps, flattenSubpath, polylineLength } from '@/lib/glyphs/geometry';
import type { DrawOp, Glyph, Pt } from '@/lib/glyphs/types';
import { DEFAULT_CONFIG } from '@/types';
import { buildWorksheetPages, glyphsForWord, rowItems, wordInCase } from '@/lib/worksheet/layout';
import { buildNameBookPages } from '@/lib/worksheet/name-book';
import { buildTraceRow, DEFAULT_ROW_STYLE, HINT_LABEL_ASCENT } from '@/lib/worksheet/rows';
import { mathExercises } from '@/lib/worksheet/math';
import { THEMES, isProperNoun } from '@/lib/themes';
import { hasIcon } from '@/lib/hints/icons';
import { madeWith, siteHost } from '@/lib/brand';
import { opBox } from './bounds';

const W = DEFAULT_GLYPH_STYLE.strokeWidth;
const PRINT = [...ALPHABETS.ro, ...ALPHABETS.ro.map((l) => l.toLowerCase()), ...'0123456789'.split('')];
const dense = (pts: Pt[], step = 1): Pt[] => {
  const out = pts.slice(0, 1);
  for (let i = 1; i < pts.length; i++) {
    const n = Math.max(1, Math.ceil(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: pts[i - 1].x + ((pts[i].x - pts[i - 1].x) * k) / n, y: pts[i - 1].y + ((pts[i].y - pts[i - 1].y) * k) / n });
  }
  return out;
};
const near = (p: Pt, pts: Pt[]) => Math.min(...pts.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
const strokePts = (g: Glyph, i: number) => g.strokes[i].subpaths.flatMap((sp) => dense(flattenSubpath(sp)));

describe('the comma of Ș and Ț (print)', () => {
  it('hangs clear under the letter, short, never touching it', () => {
    for (const key of ['Ș', 'Ț', 'ș', 'ț']) {
      const g = getGlyph(key)!;
      const comma = g.strokes[g.strokes.length - 1];
      const body = g.strokes.slice(0, -1).flatMap((_, i) => strokePts(g, i));
      const mark = comma.subpaths.flatMap((sp) => flattenSubpath(sp));
      const pen = comma.pen ?? 1;
      const bodyBottom = Math.max(...body.map((p) => p.y)) + W / 2;
      const commaTop = Math.min(...mark.map((p) => p.y)) - (W * pen) / 2;
      // a visible vertical gap of at least 0.8 pen widths between the ink of the letter and the comma
      expect(commaTop - bodyBottom, key).toBeGreaterThanOrEqual(W * 0.8);
      // and no ink of the comma anywhere near the letter
      for (const p of mark) expect(near(p, body) - W / 2 - (W * pen) / 2, key).toBeGreaterThanOrEqual(W * 0.8);
      expect(Math.max(...mark.map((p) => p.y)) - Math.min(...mark.map((p) => p.y)), key).toBeLessThanOrEqual(18);
      expect(pen, key).toBeLessThan(1);
    }
  });

  it('stays a separate, undashed sign on traced copies and in the outline of the find grid', () => {
    for (const variant of ['dashed', 'dotted', 'outline'] as const) {
      const ops = renderGlyph(getGlyph('Ș')!, { ...DEFAULT_GLYPH_STYLE, variant, startDots: false, arrows: false });
      const below = ops.filter((o) => o.t === 'path' && o.subpaths[0].start.y > 110);
      expect(below.length, variant).toBeGreaterThan(0);
      for (const o of below) if (o.t === 'path') expect(o.dash, variant).toBeUndefined();
    }
  });
});

describe('the dashed trace style', () => {
  const dashedOps = (g: Glyph, extra = {}) =>
    renderGlyph(g, { ...DEFAULT_GLYPH_STYLE, variant: 'dashed', startDots: false, arrows: false, dash: [1, 2], ...extra }).filter(
      (o): o is Extract<DrawOp, { t: 'path' }> => o.t === 'path',
    );

  it('every piece of every print letter and digit begins and ends on a dash', () => {
    for (const gap of [0.55, 1, 1.5])
      for (const key of PRINT) {
        for (const op of dashedOps(getGlyph(key)!, { dash: [1, 2 * gap] })) {
          if (!op.dash) continue;
          const len = polylineLength(flattenSubpath(op.subpaths[0]));
          const [d, g] = op.dash;
          expect(d, key).toBeGreaterThan(0);
          const pts = flattenSubpath(op.subpaths[0]);
          const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 3 && len > 30;
          // open piece: n dashes and n − 1 gaps fill it exactly; closed: n whole periods
          const n = closed ? len / (d + g) : (len + g) / (d + g);
          expect(Math.abs(n - Math.round(n)), `${key} ${len.toFixed(1)} [${d.toFixed(2)}, ${g.toFixed(2)}]`).toBeLessThan(0.01);
        }
      }
  });

  it('a stroke long enough to curve shows at least four dashes (arches of m, n, h; bowls; s)', () => {
    for (const key of PRINT) {
      const g = getGlyph(key)!;
      const period = dashPeriod(g, { ...DEFAULT_GLYPH_STYLE, variant: 'dashed', dash: [1, 2] });
      for (const stroke of g.strokes) {
        if (stroke.mark) continue;
        for (const piece of dashPieces(stroke.subpaths, W)) {
          if (piece.radius === Infinity || piece.length < W * 6) continue;
          const op = dashedOps({ ...g, strokes: [{ subpaths: [piece.subpath] }] }, { dashPeriod: period })[0];
          expect(op.dash, `${key} curved piece of ${piece.length.toFixed(0)}`).toBeDefined();
          const [d, gp] = op.dash!;
          expect(Math.round((piece.length + (piece.closed ? 0 : gp)) / (d + gp)), key).toBeGreaterThanOrEqual(4);
          // and the gap stays visible between round-capped dashes
          if (!piece.closed) expect(gp - W, key).toBeGreaterThanOrEqual(W * 0.4);
        }
      }
    }
    // the arch of n: six dashes, where the old fixed pattern gave three and a half
    const n = getGlyph('n')!;
    const arch = dashedOps(n)[1];
    const len = polylineLength(flattenSubpath(arch.subpaths[0]));
    expect(Math.round((len + arch.dash![1]) / (arch.dash![0] + arch.dash![1]))).toBeGreaterThanOrEqual(6);
  });

  it('cuts at sharp corners, so the points of V, W, Z, M are always drawn', () => {
    expect(dashedOps(getGlyph('V')!).length).toBe(2);
    expect(dashedOps(getGlyph('w')!).length).toBe(4);
    expect(dashedOps(getGlyph('Z')!).length).toBe(3);
    // handwriting: every stroke is still drawn, its smooth curves uncut
    const word = cursiveWord('fluture')!;
    expect(dashedOps(word, { strokeWidth: 6, dash: [1.6, 1.4] }).length).toBeGreaterThanOrEqual(word.strokes.filter((s) => !s.mark).length);
  });
});

describe('stroke-order numbers', () => {
  const labels = (g: Glyph, minDotRadius?: number) =>
    renderGlyph(g, { ...DEFAULT_GLYPH_STYLE, ...(minDotRadius ? { minDotRadius } : {}) }).filter(
      (o): o is Extract<DrawOp, { t: 'text' }> => o.t === 'text' && /^\d+$/.test(o.text),
    );

  it('never overlap each other', () => {
    for (const minDot of [undefined, 10.4, 14.5])
      for (const key of PRINT) {
        const ls = labels(getGlyph(key)!, minDot);
        const r = Math.max(W * 0.85, minDot ?? 0) * 0.8;
        for (let i = 0; i < ls.length; i++)
          for (let j = i + 1; j < ls.length; j++)
            expect(Math.hypot(ls[i].x - ls[j].x, ls[i].y - ls[j].y), `${key}: ${ls[i].text} and ${ls[j].text}`).toBeGreaterThanOrEqual(r * 2);
      }
  });

  it('each sits nearer to the first stretch of its own stroke than to any other stroke', () => {
    for (const key of PRINT) {
      const g = getGlyph(key)!;
      for (const l of labels(g)) {
        const i = Number(l.text) - 1;
        const mine = strokePts(g, i);
        const others = g.strokes.flatMap((_, j) => (j === i ? [] : strokePts(g, j)));
        if (!others.length) continue;
        const lead = ownLead(g.strokes[i], others, W).pts;
        // parts of other strokes this one is drawn over do not count (u: the second line retraces the first)
        const apart = others.filter((q) => near(q, mine) > W * 0.75);
        if (!apart.length) continue;
        const p = { x: l.x, y: l.y };
        expect(near(p, apart) - near(p, lead), `${key}: number ${l.text}`).toBeGreaterThanOrEqual(OWN_MARGIN - 0.6);
      }
    }
  });

  it('where two strokes leave the same point, each number is on the side its own stroke goes', () => {
    const side = (key: string) => {
      const g = getGlyph(key)!;
      const ls = labels(g);
      return [1, 2].map((n) => {
        const l = ls.find((x) => x.text === String(n))!;
        const s = g.strokes[n - 1].subpaths[0].start;
        const pts = dense(flattenSubpath(g.strokes[n - 1].subpaths[0]));
        const a = pts[Math.min(pts.length - 1, 30)];
        const o = g.strokes[2 - n].subpaths[0];
        const b = dense(flattenSubpath(o))[30];
        const dot = (v: Pt) => (l.x - s.x) * (v.x - s.x) + (l.y - s.y) * (v.y - s.y);
        return dot(a) - dot(b); // > 0: the number leans toward its own stroke
      });
    };
    for (const key of ['A', 'Ă', 'Â', 'E', 'F', 'B', 'D', 'P', 'R', 'M', 'N', '4', '5']) for (const v of side(key)) expect(v, key).toBeGreaterThan(0);
    // A: 1 left of the top, 2 right of it; E, F, 5: 1 beside the vertical, 2 above the bar
    const at = (key: string, n: number) => labels(getGlyph(key)!).find((x) => x.text === String(n))!;
    expect(at('A', 1).x).toBeLessThan(40);
    expect(at('A', 2).x).toBeGreaterThan(40);
    for (const key of ['E', 'F']) {
      expect(at(key, 1).x, key).toBeLessThan(-W);
      expect(at(key, 2).y, key).toBeLessThan(-W);
    }
    expect(at('5', 2).y).toBeLessThan(-W);
    // n, m, h, r: the number of the arch is inside the arch, not beside the stem
    for (const key of ['n', 'm', 'h', 'r', 'b', 'p']) expect(at(key, 2).x, key).toBeGreaterThan(W);
  });
});

describe('hint picture and word', () => {
  it('the picture never covers the word or its diacritics, at any letter size', () => {
    for (const s of [0.1, 0.14, 0.19, 0.13, 0.182, 0.247])
      for (const letter of ['M', 'Ă', 'Â', 'Î', 'Ș', 'Ț', 'G', 'P']) {
        const hint = hintFor(letter, 'ro')!;
        const ops: DrawOp[] = [];
        buildTraceRow(ops, [getGlyph(letter)!], { x: 12, width: 186, baseline: 60 }, { ...DEFAULT_ROW_STYLE, s, hint });
        const flat = flattenOps(ops);
        const text = flat.find((o) => o.t === 'text' && o.text === hint.word) as Extract<DrawOp, { t: 'text' }>;
        expect(text, hint.word).toBeDefined();
        const icon = flat.filter((o) => o.t === 'path' && o.fill && o.closed).map((o) => opBox(o)!);
        const iconBottom = Math.max(...icon.map((b) => b.maxY));
        expect(text.y - text.size * HINT_LABEL_ASCENT - iconBottom, `${hint.word} at ${s}`).toBeGreaterThanOrEqual(0.5);
        // the block stays inside the row (between the top line and a little under the baseline)
        expect(Math.min(...icon.map((b) => b.minY)), `${hint.word} at ${s}`).toBeGreaterThanOrEqual(60 - 100 * s - 1.5);
        expect(text.y + text.size * 0.25, `${hint.word} at ${s}`).toBeLessThanOrEqual(60 + 1.5);
      }
  });

  it('every Romanian hint word starts with the plain sound of its letter (no gi/ge, no ie)', () => {
    const inside = ['Ă', 'Â']; // never at the start of a word a child knows
    for (const [letter, hint] of Object.entries(LETTER_HINTS.ro)) {
      if (inside.includes(letter)) expect(hint.word.toUpperCase(), letter).toContain(letter);
      else expect(hint.word[0].toUpperCase(), letter).toBe(letter);
      expect(hasIcon(hint.emoji), letter).toBe(true);
    }
    expect(LETTER_HINTS.ro.G.word).not.toMatch(/^g[ei]/);
    expect(LETTER_HINTS.ro.I.word).not.toMatch(/^i[aeou]/);
    const used = Object.values(LETTER_HINTS.ro).map((h) => h.emoji);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe('find the letter', () => {
  it('the model letter keeps clear of the instruction above and of the grid below', () => {
    for (const mode of ['uppercase', 'lowercase'] as const) {
      const items = ALPHABETS.ro.map((l) => `find:${l}`);
      const pages = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, letterMode: mode }, 'full');
      pages.forEach((page, i) => {
        const model = page.ops.find((o) => o.t === 'group') as Extract<DrawOp, { t: 'group' }>;
        const boxes = flattenOps([model]).map((o) => opBox(o)!).filter(Boolean);
        const cells = page.ops.filter((o) => o.t === 'rect' && o.stroke === '#E6DECD') as Extract<DrawOp, { t: 'rect' }>[];
        const gridTop = Math.min(...cells.map((c) => c.y));
        const instruction = page.ops.filter((o) => o.t === 'text')[3] as Extract<DrawOp, { t: 'text' }>;
        expect(instruction.text).toContain('Colorează');
        expect(gridTop - Math.max(...boxes.map((b) => b.maxY)), `${mode} ${items[i]}: grid`).toBeGreaterThanOrEqual(1);
        expect(Math.min(...boxes.map((b) => b.minY)) - instruction.y, `${mode} ${items[i]}: instruction`).toBeGreaterThanOrEqual(1);
        // grid letters stay inside their cells, even the tallest (Ă) and the deepest (Ș with its comma)
        const letters = page.ops.filter((o) => o.t === 'group').slice(1) as Extract<DrawOp, { t: 'group' }>[];
        const tall = glyphBounds(getGlyph(mode === 'lowercase' ? 'ă' : 'Ă')!, 7).minY;
        const deep = glyphBounds(getGlyph(mode === 'lowercase' ? 'g' : 'Ș')!, 7).maxY;
        letters.forEach((grp, k) => {
          expect(grp.ty + tall * grp.scale, `${items[i]} cell ${k}`).toBeGreaterThanOrEqual(cells[k].y);
          expect(grp.ty + deep * grp.scale, `${items[i]} cell ${k}`).toBeLessThanOrEqual(cells[k].y + cells[k].h);
        });
      });
    }
  });
});

describe('capital letters', () => {
  it('the name workbook never writes the name without its capital', () => {
    for (const script of ['print', 'cursive'] as const) {
      const pages = buildNameBookPages('ioana', script);
      const titles = pages.map((p) => (p.ops.find((o) => o.t === 'text') as { text: string }).text);
      expect(titles.join('|')).not.toContain('litere mici');
      const text = JSON.stringify(pages);
      expect(text).not.toContain('singur');
    }
    expect(buildNameBookPages('ioana').some((p) => JSON.stringify(p).includes('Numele meu, scris mai mic'))).toBe(true);
    // every traced row of the name pages starts with the capital I (a single vertical line 100 high), never the small i
    const config = { ...DEFAULT_CONFIG, alphabet: 'ro' as const, childName: 'ioana', customWords: ['ioana'], letterMode: 'paired' as const };
    expect(rowItems(config, 'full')[0].item).toBe('Ioana');
  });

  it('common nouns are written small in handwriting and in pairs; proper names keep their capitals', () => {
    expect(wordInCase('AVION', 'paired', 'theme')).toBe('avion');
    expect(wordInCase('OM DE ZĂPADĂ', 'paired', 'theme')).toBe('om de zăpadă');
    expect(wordInCase('ROMÂNIA', 'paired', 'theme')).toBe('România');
    expect(wordInCase('MOȘ CRĂCIUN', 'paired', 'theme')).toBe('Moș Crăciun');
    expect(wordInCase('MOȘ NICOLAE', 'lowercase', 'theme')).toBe('moș nicolae');
    expect(wordInCase('BRAD', 'uppercase', 'theme')).toBe('BRAD');
    expect(isProperNoun('brad')).toBe(false);
    // the handwriting workbook: the word under the letter is "avion", not "Avion"
    const pages = buildWorksheetPages({ ...DEFAULT_CONFIG, alphabet: 'ro', script: 'cursive', letterMode: 'paired', selectedItems: ['Aa'], pagePerItem: true, itemWords: true, fillPage: false }, 'full');
    expect(pages).toHaveLength(1);
    const theme = THEMES.find((t) => t.id === 'craciun')!;
    const rows = rowItems({ ...DEFAULT_CONFIG, alphabet: 'ro', script: 'cursive', letterMode: 'paired', selectedItems: [], customWords: theme.words.map((w) => w.word), wordPictures: Object.fromEntries(theme.words.map((w) => [w.word, w.emoji])) }, 'full');
    expect(rows.map((r) => r.item)).toEqual(['brad', 'Moș Crăciun', 'cadou', 'stea', 'ren', 'clopoțel']);
  });
});

describe('themes', () => {
  it('has the December themes, with drawable words and printable pictures', () => {
    for (const id of ['1-decembrie', 'mos-nicolae', 'craciun', 'iarna']) expect(THEMES.find((t) => t.id === id), id).toBeDefined();
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    for (const t of THEMES) {
      expect(t.id).toMatch(/^[a-z0-9-]+$/);
      expect(t.words.length, t.id).toBe(6);
      for (const w of t.words) {
        expect(hasIcon(w.emoji), `${t.id} ${w.word}`).toBe(true);
        expect(w.word, t.id).toBe(w.word.toUpperCase());
        expect(unsupportedLetters(w.word), w.word).toEqual([]);
        expect(w.word.length, w.word).toBeLessThanOrEqual(12);
        expect(cursiveWord(w.word.toLowerCase()), w.word).toBeDefined();
      }
    }
    // a chestnut is called a chestnut
    expect(THEMES.flatMap((t) => t.words).find((w) => w.emoji === '🌰')?.word).toBe('CASTANĂ');
  });
});

describe('free-sheet footer', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('names the site only when its address is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(madeWith('ro')).toBe('Creat cu WorksheetWiz');
    expect(madeWith('en')).toBe('Made with WorksheetWiz');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.fise-exemplu.ro/');
    expect(madeWith('ro')).toBe('Creat cu fise-exemplu.ro');
    expect(madeWith('en')).toBe('Made with fise-exemplu.ro');
    expect(siteHost('wizlearner.vercel.app/preturi')).toBe('wizlearner.vercel.app');
    expect(siteHost('not a url')).toBeNull();
  });

  it('is what every kind of free sheet prints, and never a domain we do not own', () => {
    for (const url of ['', 'https://exemplu.ro']) {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', url);
      const want = url ? 'Creat cu exemplu.ro' : 'Creat cu WorksheetWiz';
      const sheets = [
        { ...DEFAULT_CONFIG, alphabet: 'ro' as const, selectedItems: ['A'] },
        { ...DEFAULT_CONFIG, category: 'math' as const, selectedItems: ['add'] },
        { ...DEFAULT_CONFIG, category: 'games' as const, selectedItems: ['find:A', 'count:5', 'dots:star'] },
      ];
      for (const config of sheets)
        for (const page of buildWorksheetPages(config, 'free')) {
          const texts = page.ops.filter((o) => o.t === 'text').map((o) => (o as { text: string }).text);
          expect(texts, config.category).toContain(want);
          expect(texts.join(' ').toLowerCase()).not.toContain('worksheetwiz.com');
        }
      expect(JSON.stringify(buildWorksheetPages({ ...DEFAULT_CONFIG, alphabet: 'en', selectedItems: ['A'] }, 'free'))).toContain(url ? 'Made with exemplu.ro' : 'Made with WorksheetWiz"');
      expect(JSON.stringify(buildWorksheetPages(sheets[0], 'full'))).not.toContain('Creat cu');
    }
  });
});

describe('math: small ranges', () => {
  const key = (e: { cells: (string | null)[] }) => e.cells.join(' ');
  const counts = (xs: string[]) => Object.values(xs.reduce<Record<string, number>>((a, k) => ({ ...a, [k]: (a[k] ?? 0) + 1 }), {}));

  it('fills the page by going round all the exercises evenly, never two alike in a row', () => {
    for (const seed of [1, 2, 3, 7, 99]) {
      for (const [type, range, slots, distinct] of [['nbr', 5, 16, 4], ['add', 5, 20, 10], ['nbr', 10, 16, 9], ['sub', 5, 20, 14]] as const) {
        const keys = mathExercises(type, range, seed, slots).map(key);
        expect(keys, `${type} ${range}`).toHaveLength(slots);
        expect(new Set(keys).size, `${type} ${range}`).toBe(distinct);
        const c = counts(keys);
        expect(Math.max(...c) - Math.min(...c), `${type} ${range} seed ${seed}`).toBeLessThanOrEqual(1);
        for (let i = 1; i < keys.length; i++) expect(keys[i], `${type} ${range} seed ${seed} at ${i}`).not.toBe(keys[i - 1]);
        expect(mathExercises(type, range, seed, slots).map(key)).toEqual(keys);
      }
    }
    expect(mathExercises('nbr', 5, 1, 16).map(key)).not.toEqual(mathExercises('nbr', 5, 2, 16).map(key));
    // a large range is untouched: no exercise twice
    const big = mathExercises('add', 20, 1, 20).map(key);
    expect(new Set(big).size).toBe(20);
  });

  it('the answers page gives picture sums their real range', () => {
    const pages = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['addpic', 'add'], mathRange: 20, mathAnswers: true }, 'full');
    const answers = pages[pages.length - 1].ops.filter((o) => o.t === 'text').map((o) => (o as { text: string }).text);
    expect(answers).toContain('Adunări cu imagini (0–10)');
    expect(answers).toContain('Adunări (0–20)');
    expect(answers).not.toContain('Adunări cu imagini (0–20)');
  });
});

describe('names with letters from other alphabets', () => {
  it('are traced with the base letter, never with a letter missing', () => {
    expect(traceLetters('László')).toBe('Laszlo');
    expect(traceLetters('Ákos Zoë Müller Erzsébet İbrahim Łukasz')).toBe('Akos Zoe Muller Erzsebet Ibrahim Lukasz');
    expect(traceLetters('Ştefan Țară înghețată mâță')).toBe('Ștefan Țară înghețată mâță');
    expect(glyphsForWord('László').map((g) => g.key).join('')).toBe('Laszlo');
    expect(glyphsForWord('ÁKOS').map((g) => g.key).join('')).toBe('AKOS');
    for (const name of ['László', 'Ákos', 'Zoë', 'Müller', 'Erzsébet']) {
      const plain = traceLetters(name);
      expect(cursiveWord(name)!.strokes.length, name).toBe(cursiveWord(plain)!.strokes.length);
      const rows = rowItems({ ...DEFAULT_CONFIG, alphabet: 'ro', letterMode: 'paired', selectedItems: [], childName: name, customWords: [name] }, 'free');
      expect(rows[0].glyphs.length, name).toBe([...name].length);
    }
    expect(lettersOfWord('Ákos', 'uppercase')).toEqual(['A', 'K', 'O', 'S']);
    expect(buildNameBookPages('Ákos')).toHaveLength(1 + 4 + 3 + 1 + 1);
  });

  it('unsupportedLetters lists what the interface should warn about', () => {
    expect(unsupportedLetters('László')).toEqual(['á', 'ó']);
    expect(unsupportedLetters('Ana-Maria Ştefănescu')).toEqual([]);
    expect(unsupportedLetters('Zoë Müller')).toEqual(['ë', 'ü']);
    expect(unsupportedLetters('Жук 12')).toEqual(['Ж', 'у', 'к']);
  });
});
