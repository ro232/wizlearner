import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { SORT_OBJECTS, CATEGORY_FAMILY, obj } from '@/lib/worksheet/sorting';
import {
  SORTING_SETS, SORT_SETS, colourMisleads, drawPanels, gridLayout, groupSet, isSortingItem, oddRows, sceneLayout,
  secondGroupLink, sortLayout, sortPictures, sortingItems, sortingLabel, type GridLayout, type SceneLayout,
} from '@/lib/worksheet/sorting-pages';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { hasIcon } from '@/lib/hints/icons';
import { wrapText } from '@/lib/book/text';
import { isItemAllowed } from '@/lib/access';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage } from '@/lib/curriculum/presets';
import { flattenOps } from '@/lib/glyphs/geometry';
import { opsOutside } from './bounds';

const games = (items: string[], extra: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, ...extra });
const sets = Array.from({ length: SORTING_SETS }, (_, i) => i + 1);
const TOP = 53; // the top of the activity area under a header with a help line
const texts = (item: string) => flattenOps(buildWorksheetPages(games([item]), 'full')[0].ops).flatMap((o) => (o.t === 'text' ? [o.text] : []));

describe('the pictures and their word forms', () => {
  it('every picture is drawn, no word or picture twice', () => {
    for (const o of SORT_OBJECTS) if (o.picture) expect(hasIcon(o.picture), `${o.word} ${o.picture}`).toBe(true);
    expect(new Set(SORT_OBJECTS.map((o) => o.word)).size).toBe(SORT_OBJECTS.length);
    const pictures = SORT_OBJECTS.map((o) => o.picture).filter(Boolean);
    expect(new Set(pictures).size).toBe(pictures.length);
  });

  it('the forms are written with ș ț (comma below) and agree with the article', () => {
    for (const o of SORT_OBJECTS) {
      for (const f of [o.word, o.gen, o.indef]) expect(f, o.word).not.toMatch(/[şţŞŢ]/);
      expect(o.indef, o.word).toMatch(/^(un|o) /);
      expect(o.indef.replace(/^(un|o) /, ''), o.word).toBe(o.word);
      // feminine: „o minge” → „mingii”, „o masă” → „mesei”; masculine/neuter: „un câine” → „câinelui”
      if (o.indef.startsWith('o ')) expect(o.gen, o.word).toMatch(/(ei|ii)$/);
      else expect(o.gen, o.word).toMatch(/lui$/);
    }
  });

  it('the irregular genitives are spelled out, not derived', () => {
    const gen = (w: string) => obj(w).gen;
    expect([gen('minge'), gen('mașină'), gen('câine'), gen('masă'), gen('pară'), gen('ceapă'), gen('vânătă')]).toEqual(['mingii', 'mașinii', 'câinelui', 'mesei', 'perei', 'cepei', 'vinetei']);
    expect([gen('barcă'), gen('șapcă'), gen('carte'), gen('oaie'), gen('floare'), gen('vioară'), gen('lună')]).toEqual(['bărcii', 'șepcii', 'cărții', 'oii', 'florii', 'viorii', 'lunii']);
  });

  it('pictures whose group can be argued are not in the list', () => {
    for (const w of ['roșie', 'pepene', 'rață', 'iepure', 'găină', 'struguri', 'mănuși', 'șosete']) expect(SORT_OBJECTS.some((o) => o.word === w), w).toBe(false);
  });
});

describe('the items', () => {
  const items = sortingItems();

  it('are activities with a label, and the store keeps exactly these', () => {
    expect(items).toHaveLength(4 * SORTING_SETS);
    for (const i of items) {
      expect(isActivityItem(i), i).toBe(true);
      expect(activityLabel(i)).toBe(sortingLabel(i));
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
    }
    expect(sortingLabel('sort:1')).toBe('Sortează: fructe, legume');
    expect(sortingLabel('odd:4')).toBe('Ce nu se potrivește? (4)');
    for (const no of ['sort:0', 'sort:7', 'odd:', 'group:x', 'pos:10', 'sorts:1', 'pos']) {
      expect(isSortingItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(isActivityItem(no));
    }
    expect(sanitizeConfig(games(['sort:1', 'pos:6', 'pos:7', 'odd:3'])).selectedItems).toEqual(['sort:1', 'pos:6', 'odd:3']);
    expect(itemFitsCategory('sort:1', 'letters')).toBe(false);
  });

  it('one page per item, everything on the A4 paper (with the competence line)', () => {
    for (const level of ['presc', 'CP'] as const) {
      const pages = buildWorksheetPages(games(items, { curriculumLevel: level, childName: 'Ana-Maria Ștefănescu' }), 'full');
      expect(pages).toHaveLength(items.length);
      pages.forEach((p, i) => {
        expect([p.width, p.height]).toEqual([210, 297]);
        expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${level} ${items[i]}`).toEqual([]);
      });
    }
  });

  it('are the same every time (preview = PDF)', () => {
    const a = JSON.stringify(buildWorksheetPages(games(items), 'full'));
    expect(JSON.stringify(buildWorksheetPages(games(items), 'full'))).toBe(a);
  });

  it('the instruction at the top says what to do, in Romanian', () => {
    expect(texts('sort:2')).toContain('Unește fiecare imagine cu grupa ei.');
    expect(texts('sort:2')).toContain('Sortează: animale domestice și sălbatice');
    expect(texts('odd:5')).toContain('Taie cu un X imaginea care nu se potrivește.');
    expect(texts('group:3')).toContain('Numără fiecare fel de imagine și scrie numărul în tabel.');
    expect(texts('pos:1')).toContain('Privește desenul și încercuiește răspunsul corect.');
    expect(texts('pos:3')).toContain('Privește grila și încercuiește răspunsul corect.');
    expect(texts('pos:6')).toContain('Desenează în fiecare căsuță ce ți se cere.');
    for (const i of items) for (const t of texts(i)) expect(t, i).not.toMatch(/[şţŞŢ]/);
  });

  it('free plan: set 1 of each; the rest in the paid plan', () => {
    expect(items.filter((i) => isItemAllowed(i, 'games', 'free'))).toEqual(['sort:1', 'odd:1', 'group:1', 'pos:1']);
    for (const i of items) expect(isItemAllowed(i, 'games', 'full')).toBe(true);
    expect(hasContent(games(['sort:2', 'pos:5']), 'free')).toBe(false);
    expect(buildWorksheetPages(games(['sort:1', 'sort:2', 'pos:1', 'pos:3']), 'free')).toHaveLength(2);
  });
});

describe('„Sortează”', () => {
  it('every set has the same number of pictures in each group, each picture in the group of its category', () => {
    for (const n of sets) {
      const def = SORT_SETS[n - 1];
      const pics = sortPictures(n);
      const per = def.groups.length === 2 ? 4 : 3;
      expect(pics, `sort:${n}`).toHaveLength(per * def.groups.length);
      def.groups.forEach((g, gi) => {
        const mine = pics.filter((p) => p.group === gi);
        expect(mine, `sort:${n} ${g.label}`).toHaveLength(per);
        if (def.by === 'category') for (const p of mine) expect(obj(p.word).cat, `sort:${n} ${p.word}`).toBe(g.cat);
        if (def.by === 'shape') for (const p of mine) expect(p.shape).toBe(g.shape);
      });
      // size: the same pictures once big, once small; shape: no colour belongs to one shape only
      if (def.by === 'size') {
        const big = pics.filter((p) => p.group === 0);
        expect(big.every((p) => p.scale === 1)).toBe(true);
        expect(pics.filter((p) => p.group === 1).every((p) => p.scale < 0.5)).toBe(true);
        expect(new Set(big.map((p) => p.word))).toEqual(new Set(pics.filter((p) => p.group === 1).map((p) => p.word)));
      }
      if (def.by === 'shape') expect(new Set(pics.map((p) => p.colour)).size).toBeGreaterThan(2);
      // never three of a group in a row
      expect(pics.some((p, i) => i >= 2 && pics[i - 1].group === p.group && pics[i - 2].group === p.group), `sort:${n}`).toBe(false);
    }
  });

  it('the pictures sit between the boxes: a line from a picture never crosses a box or another picture', () => {
    for (const n of sets) {
      const { pictures, boxes } = sortLayout(n, TOP);
      for (const p of pictures) {
        for (const b of boxes) expect(p.cx + p.size / 2 + 5 < b.x || p.cx - p.size / 2 - 5 > b.x + b.w, `sort:${n}`).toBe(true);
        expect(p.cy - p.size / 2).toBeGreaterThan(TOP - 1);
      }
      for (let i = 1; i < pictures.length; i++) expect(pictures[i].cy - pictures[i - 1].cy, `sort:${n}`).toBeGreaterThanOrEqual(pictures[i].size);
      // with two groups, each picture's dot faces its own box
      if (boxes.length === 2) for (const p of pictures) expect(Math.sign(p.dot.x - p.cx)).toBe(p.group === 0 ? -1 : 1);
    }
  });
});

describe('„Ce nu se potrivește?”', () => {
  it('every row has exactly one picture from another category: the intruder', () => {
    for (const n of sets) {
      const rows = oddRows(n);
      expect(rows).toHaveLength(6);
      for (const [r, row] of rows.entries()) {
        const why = `odd:${n} row ${r + 1}: ${row.objects.map((o) => o.word).join(' ')}`;
        expect(row.objects, why).toHaveLength(4);
        const outside = row.objects.filter((o) => o.cat !== row.cat);
        expect(outside, why).toEqual([row.objects[row.intruder]]);
        // sets 1–3: another kind of thing; sets 4–6: the neighbouring group of the same kind
        const sameFamily = CATEGORY_FAMILY[outside[0].cat] === CATEGORY_FAMILY[row.cat];
        expect(sameFamily, why).toBe(n >= 4);
        // no second answer: neither by colour nor by a picture that also fits another group
        expect(colourMisleads(row.objects, row.intruder), why).toBe(false);
        expect(secondGroupLink(row.objects), why).toBe(false);
      }
      const words = rows.flatMap((r) => r.objects.map((o) => o.word));
      expect(new Set(words).size, `odd:${n}`).toBe(words.length);
    }
  });

  it('the checks catch the traps they are for', () => {
    // three red and a yellow banana: colour points at the banana, not at the intruder
    expect(colourMisleads(['măr', 'căpșună', 'banană', 'parașută'].map(obj), 3)).toBe(true);
    // a kite among things that fly
    expect(secondGroupLink(['avion', 'elicopter', 'zmeu', 'rachetă'].map(obj))).toBe(true);
    // a teddy bear among wild animals
    expect(secondGroupLink(['leu', 'urs', 'ursuleț', 'lup'].map(obj))).toBe(true);
  });
});

describe('„Grupează și numără”', () => {
  it('different counts of 2–8 per kind, every picture placed, none on top of another', () => {
    for (const n of sets) {
      const set = groupSet(n, TOP);
      const counts = set.kinds.map((k) => k.count);
      expect(new Set(counts).size, `group:${n}`).toBe(counts.length);
      for (const c of counts) expect(c).toBeGreaterThanOrEqual(2);
      for (const c of counts) expect(c).toBeLessThanOrEqual(8);
      expect(set.kinds.length).toBe(n <= 3 ? 3 : 4);
      for (const k of set.kinds) {
        expect(k.object.cat).toBe(set.cat);
        expect(set.placed.filter((p) => p.object === k.object), `group:${n} ${k.object.word}`).toHaveLength(k.count);
      }
      for (let i = 0; i < set.placed.length; i++)
        for (let j = i + 1; j < set.placed.length; j++) {
          const a = set.placed[i];
          const b = set.placed[j];
          const apart = Math.abs(a.cx - b.cx) >= (a.size + b.size) / 2 + 4.9 || Math.abs(a.cy - b.cy) >= (a.size + b.size) / 2 + 4.9;
          expect(apart, `group:${n} pictures ${i} and ${j}`).toBe(true);
        }
    }
  });
});

describe('„Orientare în spațiu”', () => {
  /** Whether a placed object of the scene is in the relation of the question, read from the drawing. */
  function holds(scene: SceneLayout, relation: string, word: string): boolean {
    const o = scene.objects.find((x) => x.object.word === word)!;
    const left = o.cx - o.size / 2;
    const right = o.cx + o.size / 2;
    const top = o.cy - o.size / 2;
    const bottom = o.cy + o.size / 2;
    const overTable = o.cx > scene.table.x0 && o.cx < scene.table.x1;
    switch (relation) {
      case 'on': return overTable && Math.abs(bottom - scene.table.top) < 0.5;
      case 'above': return overTable && bottom < scene.table.top - 5;
      case 'under': return overTable && top > scene.table.top + 4 && bottom <= scene.floor;
      case 'in': return o.cx > scene.box.x0 && o.cx < scene.box.x1 && bottom > scene.box.top && bottom < scene.floor && top < scene.box.top;
      case 'left': return right < scene.table.x0;
      case 'right': return left > scene.box.x1;
      default: throw new Error(relation);
    }
  }

  it('the scene: each answer is where the question says, and no other option is', () => {
    for (const n of [1, 2]) {
      const scene = sceneLayout(n, TOP);
      expect(new Set(scene.objects.map((o) => o.object.word)).size).toBe(6);
      expect(scene.questions).toHaveLength(5);
      for (const q of scene.questions) {
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.options).toContain(q.answer);
        expect(holds(scene, q.relation, q.answer.word), `pos:${n} ${q.text} ${q.answer.word}`).toBe(true);
        for (const o of q.options) if (o !== q.answer) expect(holds(scene, q.relation, o.word), `pos:${n} ${q.text} ${o.word}`).toBe(false);
        // the options never offer „on the table” for „above the table” or the reverse
        if (q.relation === 'above') expect(q.options.some((o) => holds(scene, 'on', o.word))).toBe(false);
        if (q.relation === 'on') expect(q.options.some((o) => holds(scene, 'above', o.word))).toBe(false);
      }
    }
  });

  /** Row and column of a picture in the grid. */
  const where = (g: GridLayout, word: string) => {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (g.cells[r][c].word === word) return { r, c };
    throw new Error(word);
  };

  it('the grid: each answer is in the stated position; no other option is even loosely there', () => {
    for (const n of [3, 4]) {
      const g = gridLayout(n, TOP);
      expect(new Set(g.cells.flat().map((o) => o.word)).size).toBe(9);
      expect(new Set(g.questions.map((q) => q.answer)).size, `pos:${n}: five different answers`).toBe(5);
      for (const q of g.questions) {
        const [kind, ...args] = q.relation.split(' ');
        const a = where(g, q.answer.word);
        const others = q.options.filter((o) => o !== q.answer).map((o) => where(g, o.word));
        expect(q.options).toHaveLength(3);
        const why = `pos:${n} ${q.text}`;
        if (kind === 'cell') {
          const [r, c] = args.map(Number);
          expect(a, why).toEqual({ r, c });
        } else if (kind === 'between') {
          const line = Number(args[1]);
          if (args[0] === 'row') {
            expect(a, why).toEqual({ r: line, c: 1 });
            expect(q.text).toBe(`Ce se află între ${g.cells[line][0].word} și ${g.cells[line][2].word}?`);
            for (const o of others) expect(o.r, why).not.toBe(line);
          } else {
            expect(a, why).toEqual({ r: 1, c: line });
            expect(q.text).toBe(`Ce se află între ${g.cells[0][line].word} și ${g.cells[2][line].word}?`);
            for (const o of others) expect(o.c, why).not.toBe(line);
          }
        } else {
          const [r, c] = args.map(Number);
          const ref = g.cells[r][c];
          if (kind === 'above') {
            expect(a, why).toEqual({ r: r - 1, c });
            expect(q.text).toBe(`Ce se află deasupra ${ref.gen}?`);
            for (const o of others) expect(o.r, why).toBeGreaterThanOrEqual(r);
          } else if (kind === 'under') {
            expect(a, why).toEqual({ r: r + 1, c });
            expect(q.text).toBe(`Ce se află sub ${ref.word}?`);
            for (const o of others) expect(o.r, why).toBeLessThanOrEqual(r);
          } else if (kind === 'left') {
            expect(a, why).toEqual({ r, c: c - 1 });
            expect(q.text).toBe(`Ce se află în stânga ${ref.gen}?`);
            for (const o of others) expect(o.c, why).toBeGreaterThanOrEqual(c);
          } else if (kind === 'right') {
            expect(a, why).toEqual({ r, c: c + 1 });
            expect(q.text).toBe(`Ce se află în dreapta ${ref.gen}?`);
            for (const o of others) expect(o.c, why).toBeLessThanOrEqual(c);
          } else throw new Error(q.relation);
          for (const o of q.options) expect(o, why).not.toBe(ref);
        }
      }
    }
  });

  it('the drawings: the sentence names the reference with the right form, with room on the stated side', () => {
    for (const n of [5, 6]) {
      const panels = drawPanels(n, TOP);
      expect(panels).toHaveLength(6);
      expect(new Set(panels.map((p) => p.relation)).size).toBe(6);
      for (const p of panels) {
        const why = `pos:${n} ${p.text}`;
        const { area: a, refBox: b } = p;
        expect(wrapText(`1. ${p.text}`, p.panel.w - 8, 3.9).length, why).toBeLessThanOrEqual(2);
        expect(p.thing.word).not.toBe(p.ref.word);
        expect(b.x >= a.x - 0.01 && b.y >= a.y - 0.01 && b.x + b.w <= a.x + a.w + 0.01 && b.y + b.h <= a.y + a.h + 0.01, why).toBe(true);
        const t = p.thing.indef;
        switch (p.relation) {
          case 'deasupra': expect(p.text).toBe(`Desenează ${t} deasupra ${p.ref.gen}.`); expect(b.y - a.y, why).toBeGreaterThan(22); break;
          case 'stanga': expect(p.text).toBe(`Desenează ${t} în stânga ${p.ref.gen}.`); expect(b.x - a.x, why).toBeGreaterThan(40); break;
          case 'dreapta': expect(p.text).toBe(`Desenează ${t} în dreapta ${p.ref.gen}.`); expect(a.x + a.w - b.x - b.w, why).toBeGreaterThan(40); break;
          case 'langa': expect(p.text).toBe(`Desenează ${t} lângă ${p.ref.word}.`); expect(Math.min(b.x - a.x, a.x + a.w - b.x - b.w), why).toBeGreaterThan(20); break;
          case 'sub': expect(p.text).toBe(`Desenează ${t} sub masă.`); expect(b.h, why).toBeGreaterThan(30); break;
          case 'pe': expect(p.text).toBe(`Desenează ${t} pe masă.`); expect(b.y - a.y, why).toBeGreaterThan(22); break;
          case 'in': expect(p.text).toBe(`Desenează ${t} în cutie.`); expect(b.w > 30 && b.h > 20, why).toBe(true); break;
        }
        // a sun, a cloud or a star only above
        if (['soare', 'nor', 'stea'].includes(p.thing.word)) expect(p.relation).toBe('deasupra');
      }
    }
  });
});

describe('the competences', () => {
  const label = (item: string, level: 'presc' | 'CP' | 'I' | 'II') => sheetCompetenceLabel(games([item]), level);
  const PRESC = 'Curriculum pentru educație timpurie, nivel preșcolar';
  const MEM = (cls: string) => `Matematică și explorarea mediului, ${cls}`;

  it('sorting: E.2.4 in preschool, MEM 5.1 in CP; nothing in clasa I / a II-a (two criteria / tables)', () => {
    for (const n of sets) {
      expect(label(`sort:${n}`, 'presc')).toBe(`Comportament vizat E.2.4 · ${PRESC}`);
      expect(label(`sort:${n}`, 'CP')).toBe(`Competența specifică 5.1 · ${MEM('clasa pregătitoare')}`);
      expect(label(`sort:${n}`, 'I')).toBeNull();
      expect(label(`sort:${n}`, 'II')).toBeNull();
    }
  });

  it('odd one out: E.2.4 in preschool only (the criterion is not given)', () => {
    expect(label('odd:1', 'presc')).toBe(`Comportament vizat E.2.4 · ${PRESC}`);
    for (const l of ['CP', 'I', 'II'] as const) expect(label('odd:4', l)).toBeNull();
  });

  it('group and count: E.2.1 and E.2.4 in preschool, 1.1 and 5.1 in CP', () => {
    expect(label('group:1', 'presc')).toBe(`Comportamente vizate E.2.1, E.2.4 · ${PRESC}`);
    expect(label('group:6', 'CP')).toBe(`Competențele specifice 1.1, 5.1 · ${MEM('clasa pregătitoare')}`);
    expect(label('group:1', 'I')).toBeNull();
    expect(label('group:1', 'II')).toBeNull();
  });

  it('orientation: MEM 2.1 in CP and clasa I; nothing in preschool or clasa a II-a', () => {
    for (const n of sets) {
      expect(label(`pos:${n}`, 'presc')).toBeNull();
      expect(label(`pos:${n}`, 'CP')).toBe(`Competența specifică 2.1 · ${MEM('clasa pregătitoare')}`);
      expect(label(`pos:${n}`, 'I')).toBe(`Competența specifică 2.1 · ${MEM('clasa I')}`);
      expect(label(`pos:${n}`, 'II')).toBeNull();
    }
    // with a sorting page on the same sheet: both codes
    expect(sheetCompetenceLabel(games(['sort:1', 'pos:1']), 'CP')).toBe(`Competențele specifice 2.1, 5.1 · ${MEM('clasa pregătitoare')}`);
  });

  it('the codes exist in the programme data with the official texts', () => {
    const text = (item: string, level: 'presc' | 'CP' | 'I') => sheetCompetences(games([item]), level).map((r) => findCompetence(r)?.text);
    expect(text('sort:1', 'presc')).toEqual(['Efectuează operații de seriere, grupare, clasificare, măsurare a obiectelor']);
    expect(text('sort:1', 'CP')).toEqual(['Sortarea/clasificarea unor obiecte/ materiale etc., pe baza unui criteriu dat']);
    expect(text('group:1', 'presc')).toEqual(['Demonstrează familiarizarea cu conceptul de număr și cu numerația', 'Efectuează operații de seriere, grupare, clasificare, măsurare a obiectelor']);
    expect(text('group:1', 'CP')).toEqual(['Recunoașterea și scrierea numerelor în concentrul 0-31', 'Sortarea/clasificarea unor obiecte/ materiale etc., pe baza unui criteriu dat']);
    expect(text('pos:1', 'CP')[0]).toMatch(/^Orientarea și mișcarea în spațiu în raport cu repere\/direcții precizate, folosind sintagme de tipul: în, pe, deasupra, dedesubt, lângă/);
    expect(text('pos:1', 'I')[0]).toMatch(/^Orientarea și mișcarea în spațiu în raport cu repere\/direcții date folosind sintagme de tipul: în, pe, deasupra, dedesubt, lângă/);
  });

  it('the „Fișe pe programă” pages list the new sheets under those codes', () => {
    for (const id of ['sorteaza', 'intrusul', 'grupeaza-numara', 'orientare']) expect(SHEET_PRESETS.some((p) => p.id === id), id).toBe(true);
    const listed = (slug: string, code: string) =>
      classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).flatMap((g) => g.items).filter((i) => i.code === code && (slug === 'gradinita' || i.programme === 'mem-p-ii')).flatMap((i) => i.presets.map((p) => p.id));
    expect(listed('gradinita', 'E.2.4')).toEqual(['sorteaza', 'intrusul', 'grupeaza-numara']);
    expect(listed('gradinita', 'E.2.1')).toContain('grupeaza-numara');
    expect(listed('clasa-pregatitoare', '5.1')).toEqual(['sorteaza', 'grupeaza-numara']);
    expect(listed('clasa-pregatitoare', '2.1')).toEqual(['orientare']);
    expect(listed('clasa-1', '2.1')).toEqual(['orientare']);
    expect(listed('clasa-2', '2.1')).toEqual([]);
    expect(listed('clasa-2', '5.1')).toEqual([]);
  });
});
