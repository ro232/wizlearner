import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { competencesFor } from '@/lib/curriculum';
import { SHEET_PRESETS } from '@/lib/curriculum/presets';
import { canHostProgram, courseWeeks, schoolWeeks } from '@/lib/planning/calendar';
import {
  COURSE_WEEKS,
  DEFAULT_PROGRAM_WEEKS,
  FEBRUARY_OPTIONS,
  FREE_DAYS,
  courseIntervals,
  type ProgramId,
} from '@/lib/planning/school-year-2026-2027';
import {
  buildPlan,
  contentGroups,
  contentText,
  onlyModules,
  planProblems,
  presetMatches,
  setHoursPerWeek,
  shiftWeek,
  updateRow,
  weekNumbers,
  type Plan,
} from '@/lib/planning/plan';
import { PLAN_LEVELS, PLAN_SUBJECTS, type PlanLevel, type SubjectId } from '@/lib/planning/subjects';
import { ALL_CODES, THEMATIC_UNITS, UNIT_PLANS } from '@/lib/planning/units';
import { noteLines, planDocument } from '@/lib/planning/document';
import { restoreDraft } from '@/lib/planning/draft';
import { buildPlanPages, PAGE, approxMeasure } from '@/lib/planning/pdf-layout';
import { createPlanPdf, nunitoMeasure } from '@/lib/planning/pdf';
import { planDocxBuffer } from '@/lib/planning/docx';
import { flattenOps } from '@/lib/glyphs/geometry';

const LEVELS = PLAN_LEVELS.map((l) => l.id);
const SUBJECTS = PLAN_SUBJECTS.map((s) => s.id);
const COMBOS = LEVELS.flatMap((level) => SUBJECTS.map((subject) => ({ level, subject })));
const fonts = {
  regular: readFileSync('public/fonts/Nunito-Regular.ttf').toString('base64'),
  bold: readFileSync('public/fonts/Nunito-Bold.ttf').toString('base64'),
};

/** Where a school might place its programme weeks (Mondays): the default, none, both early, both late. */
const PROGRAM_CHOICES: Partial<Record<ProgramId, string | null>>[] = [
  {},
  { 'scoala-altfel': null, 'saptamana-verde': null },
  { 'saptamana-verde': '2026-09-14', 'scoala-altfel': '2026-11-09' },
  { 'saptamana-verde': '2027-01-18', 'scoala-altfel': '2027-04-19' },
];

function checkCover(plan: Plan) {
  // every week of courses exactly once
  const all = plan.rows.flatMap((r) => r.weeks).sort((a, b) => a - b);
  expect(all).toEqual(plan.weeks.map((w) => w.n));
  expect(planProblems(plan)).toEqual([]);
  // a row's weeks are in its module; programme weeks are rows of their own, with no hours
  for (const r of plan.rows) {
    for (const n of r.weeks) expect(plan.weeks[n - 1].module, `${r.title} S${n}`).toBe(r.module);
    if (r.kind === 'program') {
      expect(r.hours).toBe(0);
      expect(r.weeks.every((n) => plan.weeks[n - 1].program)).toBe(true);
    } else {
      expect(r.weeks.every((n) => !plan.weeks[n - 1].program), r.title).toBe(true);
    }
  }
}

describe('school year 2026–2027 (OMEC 3194/2026)', () => {
  it('has the order’s 36 weeks of courses whatever the county’s February week', () => {
    for (const f of FEBRUARY_OPTIONS) {
      const weeks = courseWeeks(f.id);
      expect(weeks.length, f.id).toBe(COURSE_WEEKS);
      expect(weeks.map((w) => w.n)).toEqual(weeks.map((_, i) => i + 1));
      expect(weeks[0].first).toBe('2026-09-07');
      expect(weeks[weeks.length - 1].last).toBe('2027-06-18');
    }
  });

  it('never puts a vacation day, a weekend or a free day among the days of courses', () => {
    for (const f of FEBRUARY_OPTIONS) {
      const ivs = courseIntervals(f.id);
      for (const w of courseWeeks(f.id)) {
        const iv = ivs.find((i) => i.module === w.module)!;
        for (const d of w.days) {
          expect(d >= iv.start && d <= iv.end, `${d} in module ${w.module}`).toBe(true);
          expect(new Date(`${d}T00:00:00Z`).getUTCDay() % 6, d).not.toBe(0);
          expect(FREE_DAYS.some((h) => h.date === d), d).toBe(false);
        }
      }
      // the vacation week of February is not a week of courses
      const opt = FEBRUARY_OPTIONS.find((o) => o.id === f.id)!;
      expect(courseWeeks(f.id).some((w) => w.first > opt.module3End && w.last < opt.module4Start)).toBe(false);
    }
  });

  it('knows the free days and the two short weeks', () => {
    const weeks = courseWeeks();
    const free = weeks.flatMap((w) => w.holidays.map((h) => h.date));
    expect(free).toEqual(['2026-10-05', '2026-11-30', '2026-12-01', '2027-06-01']);
    expect(weeks.filter((w) => w.short).map((w) => [w.first, w.last, w.days.length])).toEqual([
      ['2026-12-21', '2026-12-22', 2],
      ['2027-05-05', '2027-05-07', 3],
    ]);
  });

  it('places „Școala altfel” and „Săptămâna verde” only where the order allows', () => {
    // defaults are valid for every February choice
    for (const f of FEBRUARY_OPTIONS) {
      const { weeks, ignored } = schoolWeeks({ february: f.id, programs: DEFAULT_PROGRAM_WEEKS });
      expect(ignored).toEqual([]);
      expect(weeks.filter((w) => w.program).length).toBe(2);
    }
    // a holiday week, after 23 April, the same module twice: refused
    expect(schoolWeeks({ programs: { 'scoala-altfel': '2026-10-05' } }).ignored).toEqual(['scoala-altfel']);
    expect(schoolWeeks({ programs: { 'scoala-altfel': '2027-05-10' } }).ignored).toEqual(['scoala-altfel']);
    expect(schoolWeeks({ programs: { 'saptamana-verde': '2026-09-14', 'scoala-altfel': '2026-09-21' } }).ignored).toEqual(['scoala-altfel']);
    for (const w of courseWeeks()) if (canHostProgram(w)) expect(w.last <= '2027-04-23' && !w.short && !w.holidays.length).toBe(true);
  });
});

describe('the proposed plan', () => {
  it('covers every school week exactly once, for every class, subject, February week and programme choice', () => {
    for (const c of COMBOS)
      for (const f of FEBRUARY_OPTIONS)
        for (const programs of PROGRAM_CHOICES) {
          const plan = buildPlan({ ...c, february: f.id, programs });
          checkCover(plan);
          expect(plan.ignored).toEqual([]);
          expect(plan.rows.filter((r) => r.kind === 'program').length).toBe(Object.values({ ...DEFAULT_PROGRAM_WEEKS, ...programs }).filter(Boolean).length);
        }
  });

  it('hours: weeks × hours per week', () => {
    for (const c of COMBOS) {
      const plan = buildPlan(c);
      const teaching = plan.weeks.filter((w) => !w.program).length;
      expect(teaching).toBe(34);
      expect(plan.rows.reduce((s, r) => s + r.hours, 0)).toBe(teaching * plan.hoursPerWeek);
      for (const r of plan.rows) expect(r.hours).toBe(r.kind === 'program' ? 0 : r.weeks.length * plan.hoursPerWeek);
    }
  });

  it('uses the framework plan’s weekly hours (OMEN 3371/2013)', () => {
    const h = (level: PlanLevel, subject: SubjectId) => buildPlan({ level, subject }).hoursPerWeek;
    expect([h('CP', 'clr'), h('I', 'clr'), h('II', 'clr')]).toEqual([5, 7, 6]);
    expect([h('CP', 'mem'), h('I', 'mem'), h('II', 'mem')]).toEqual([4, 4, 5]);
  });

  it('every specific competence of the class appears in a unit that is not a recap', () => {
    for (const c of COMBOS)
      for (const programs of PROGRAM_CHOICES) {
        const plan = buildPlan({ ...c, programs });
        const used = new Set(plan.rows.filter((r) => r.kind === 'unit').flatMap((r) => r.codes));
        for (const sc of competencesFor(PLAN_SUBJECTS.find((s) => s.id === c.subject)!.programme, c.level)) expect(used.has(sc.code), `${c.subject} ${c.level} ${sc.code}`).toBe(true);
      }
  });

  it('unit data: codes exist, pointers resolve to the programme, every content of the class is used', () => {
    const HEADINGS = new Set(['Vocabular', 'Fonetică', 'Ortografia', 'Punctuația', 'Organizarea textului scris']);
    for (const { level, subject } of COMBOS) {
      const codes = competencesFor(PLAN_SUBJECTS.find((s) => s.id === subject)!.programme, level).map((x) => x.code);
      const used = new Set<string>();
      for (const u of THEMATIC_UNITS) {
        const p = UNIT_PLANS[subject][level][u.id];
        expect(p, `${subject} ${level} ${u.id}`).toBeTruthy();
        for (const code of p.codes) expect(code === ALL_CODES || codes.includes(code), `${subject} ${level} ${u.id} ${code}`).toBe(true);
        for (const ref of p.contents) {
          expect(contentText(subject, level, ref), `${subject} ${level} ${u.id} [${ref}]`).toBeTruthy();
          used.add(ref.join('.'));
        }
        if (p.text) expect(p.contents).toEqual([]);
        else expect(p.contents.length).toBeGreaterThan(0);
      }
      contentGroups(subject, level).forEach((g, gi) =>
        g.items.forEach((item, ii) => {
          if (HEADINGS.has(item.trim()) || item.trim().endsWith(':')) return;
          expect(used.has(`${gi}.${ii}`), `${subject} ${level} unused: „${item}”`).toBe(true);
        }),
      );
    }
  });

  it('content texts are the programme’s words (sub-items after their line, subdomain first)', () => {
    expect(contentText('mem', 'CP', [0, 1])).toBe('Numerele naturale 0-31: recunoaștere, formare, citire, scriere (cu cifre), comparare, ordonare: de la 0 la 10');
    expect(contentText('mem', 'CP', [4, 0])).toBe('Lungime: Unități nonstandard');
    expect(contentText('mem', 'II', [6, 0])).toBe('Timp: Ora (1 oră = 60 de minute; 5 minute; jumătatea de oră, sfertul de oră)');
    expect(contentText('clr', 'I', [1, 3])).toBe('Grupurile de litere ce, ci, ge, gi, che, chi, ghe, ghi');
    const toamna = buildPlan({ level: 'II', subject: 'mem' }).rows.find((r) => r.id === 'toamna')!;
    expect(toamna.contents[0]).toMatch(/: de la 0 la 100; de la 100 la 1000$/);
  });

  it('lists only sheets that print one of the unit’s codes in that class', () => {
    for (const { level, subject } of COMBOS) {
      for (const u of THEMATIC_UNITS) {
        const p = UNIT_PLANS[subject][level][u.id];
        for (const id of p.sheets ?? []) {
          const preset = SHEET_PRESETS.find((x) => x.id === id);
          expect(preset, id).toBeTruthy();
          expect(presetMatches(preset!, subject, level, p.codes), `${subject} ${level} ${u.id}: ${id}`).toBe(true);
        }
      }
      const plan = buildPlan({ level, subject });
      expect(plan.rows.filter((r) => r.sheets.length).length).toBeGreaterThan(8);
    }
  });

  it('„1 Decembrie” gets the week of 1 December; the year starts and ends with its units', () => {
    for (const c of COMBOS) {
      const plan = buildPlan(c);
      const dec = plan.rows.find((r) => r.id === '1-decembrie')!;
      expect(dec.weeks.map((n) => plan.weeks[n - 1].monday)).toEqual(['2026-11-30']);
      expect(dec.notes).toContain('Ziua Națională a României');
      expect(plan.rows[0].id).toBe('start');
      expect(plan.rows[0].weeks).toEqual([1, 2]);
      expect(plan.rows[plan.rows.length - 1].id).toBe('final');
      expect(plan.rows[plan.rows.length - 1].weeks).toEqual([35, 36]);
      expect(plan.rows[0].kind).toBe(c.level === 'CP' ? 'unit' : 'recap');
    }
  });

  it('notes name the free days, the short weeks and a programme week inside a unit', () => {
    const plan = buildPlan({ level: 'I', subject: 'clr' });
    const notes = plan.rows.map((r) => r.notes).join('\n');
    expect(notes).toContain('5 octombrie (luni): Ziua Internațională a Educației, fără cursuri');
    expect(notes).toContain('21–22 decembrie: săptămână de 2 zile');
    expect(notes).toContain('5–7 mai: săptămână de 3 zile');
    expect(notes).toContain('1 iunie (marți): Ziua Copilului, fără cursuri');
    expect(notes).toMatch(/S6: Săptămâna verde/);
  });
});

describe('editing the plan', () => {
  it('moving a week keeps every week in exactly one row and the hours in step', () => {
    let plan = buildPlan({ level: 'II', subject: 'clr' });
    const before = plan.rows.find((r) => r.id === 'familia')!.weeks.length;
    plan = shiftWeek(plan, 'familia', 1);
    expect(plan.rows.find((r) => r.id === 'familia')!.weeks.length).toBe(before + 1);
    checkCover(plan);
    plan = shiftWeek(plan, 'familia', -1);
    plan = shiftWeek(plan, 'familia', -1);
    checkCover(plan);
    // every unit, both ways, many times: never an empty unit, never a week lost
    for (let k = 0; k < 40; k++) for (const r of plan.rows) plan = shiftWeek(plan, r.id, k % 3 ? 1 : -1);
    checkCover(plan);
    expect(plan.rows.reduce((s, r) => s + r.hours, 0)).toBe(34 * plan.hoursPerWeek);
    // a unit alone in its anchor slot or a single-week unit cannot give its last week
    const one = plan.rows.find((r) => r.kind !== 'program' && r.weeks.length === 1);
    if (one) expect(shiftWeek(plan, one.id, -1).rows.find((r) => r.id === one.id)!.weeks.length).toBe(1);
  });

  it('hours typed by hand stay; the others follow the hours per week', () => {
    let plan = buildPlan({ level: 'CP', subject: 'mem' });
    plan = updateRow(plan, 'toamna', { hours: 3, title: 'Toamna în livadă' });
    plan = setHoursPerWeek(plan, 5);
    expect(plan.rows.find((r) => r.id === 'toamna')).toMatchObject({ hours: 3, title: 'Toamna în livadă', hoursEdited: true });
    const fam = plan.rows.find((r) => r.id === 'familia')!;
    expect(fam.hours).toBe(fam.weeks.length * 5);
  });

  it('the draft comes back from storage, and garbage is ignored', () => {
    let plan = buildPlan({ level: 'I', subject: 'mem', february: 'mar-01' });
    plan = shiftWeek(updateRow(plan, 'iarna', { notes: 'Concurs de sănii' }), 'toamna', 1);
    const stored = JSON.parse(JSON.stringify({
      level: plan.level, subject: plan.subject, hoursPerWeek: plan.hoursPerWeek, february: plan.february, programs: plan.programs,
      rows: plan.rows, school: 'Școala nr. 1', teacher: 'Ana', withSheets: true,
    }));
    const back = restoreDraft(stored)!;
    expect(back.plan.rows.map((r) => [r.id, r.weeks, r.notes])).toEqual(plan.rows.map((r) => [r.id, r.weeks, r.notes]));
    expect(back.school).toBe('Școala nr. 1');
    // rows that no longer fit the weeks: a fresh proposal
    const broken = { ...stored, rows: stored.rows.map((r: { weeks: number[] }) => ({ ...r, weeks: [1] })) };
    checkCover(restoreDraft(broken)!.plan);
    for (const bad of [null, 1, 'x', {}, { level: 'V', subject: 'clr', february: 'feb-15' }]) expect(restoreDraft(bad)).toBeNull();
  });
});

describe('documents', () => {
  const meta = { school: 'Școala Gimnazială „Ștefan cel Mare” Țicleni', teacher: 'Țurcanu Ștefania' };

  it('the note is honest: a proposal, adapted by the teacher, not approved by the ministry', () => {
    const text = noteLines({ subject: 'clr' }).join(' ');
    expect(text).toContain('Propunere orientativă');
    expect(text).toContain('Nu este un document aprobat de Ministerul Educației');
    expect(text).toContain('OMEN nr. 3418/19.03.2013');
    expect(text).toContain('OMEC nr. 3.194/2026');
    expect(text).not.toMatch(/aprobat[ăa]? de minister\b(?!ul)/i);
  });

  it('the free document has only the first module and says so', () => {
    const plan = buildPlan({ level: 'CP', subject: 'clr' });
    const doc = planDocument(onlyModules(plan, [1]), { modules: [1] });
    expect(doc.sections.map((s) => s.title.slice(0, 10))).toEqual(['MODULUL 1 ']);
    expect(doc.partial).toMatch(/primul modul/);
    expect(planDocument(plan).sections.length).toBe(5);
    expect(planDocument(plan).partial).toBeUndefined();
  });

  it('the .docx is a valid Word file: landscape A4, the header fields, the table, ș and ț with the comma below', async () => {
    const plan = buildPlan({ level: 'II', subject: 'clr' });
    const files = unzipSync(await planDocxBuffer(plan, { ...meta, withSheets: true }));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['[Content_Types].xml', 'word/document.xml', 'word/styles.xml']));
    const xml = strFromU8(files['word/document.xml']);
    for (const s of ['Unitatea de învățământ', 'Cadrul didactic', 'Clasa', 'Disciplina', 'An școlar', '2026–2027', 'Nr. ore/săptămână', 'Avizat director', 'Avizat responsabil comisie metodică / șef de catedră', 'PLANIFICARE CALENDARISTICĂ', 'Comunicare în limba română', 'Competențe specifice', 'Conținuturi', 'Fișe Liniatura', 'MODULUL 5', 'Vacanța de iarnă', 'Nu este un document aprobat', meta.school.replace('„', '„').replace('”', '”'), meta.teacher]) {
      expect(xml, s).toContain(s.replace(/&/g, '&amp;'));
    }
    expect(xml).toMatch(/[șț]/);
    expect(xml).not.toMatch(/[ŞşŢţ]/); // never ş ţ with a cedilla
    expect(xml).toMatch(/<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/);
    expect(xml).toContain('<w:tblHeader/>');
    // every unit's title is in the file
    for (const r of plan.rows) expect(xml, r.title).toContain(r.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;'));
  });

  it('PDF pages: landscape A4, every text inside the margins (measured in Nunito)', () => {
    const measure = nunitoMeasure(fonts);
    for (const c of COMBOS)
      for (const withSheets of [false, true]) {
        const pages = buildPlanPages(planDocument(buildPlan(c), { ...meta, withSheets }), measure);
        expect(pages.length).toBeGreaterThanOrEqual(2);
        expect(pages.length).toBeLessThanOrEqual(6);
        for (const [pi, p] of pages.entries()) {
          expect([p.width, p.height]).toEqual([297, 210]);
          for (const op of flattenOps(p.ops)) {
            if (op.t === 'text') {
              const w = measure(op.text, op.size, op.weight === 'bold');
              const x0 = op.align === 'center' ? op.x - w / 2 : op.align === 'right' ? op.x - w : op.x;
              const where = `${c.subject} ${c.level} p${pi + 1} „${op.text}”`;
              expect(x0, where).toBeGreaterThanOrEqual(PAGE.margin - 0.01);
              expect(x0 + w, where).toBeLessThanOrEqual(PAGE.width - PAGE.margin + 0.01);
              expect(op.y - op.size, where).toBeGreaterThanOrEqual(PAGE.margin - 0.5);
              expect(op.y, where).toBeLessThanOrEqual(PAGE.height - PAGE.margin + 0.01);
            } else if (op.t === 'rect') {
              expect(op.x).toBeGreaterThanOrEqual(PAGE.margin - 0.01);
              expect(op.x + op.w).toBeLessThanOrEqual(PAGE.width - PAGE.margin + 0.01);
              expect(op.y + op.h).toBeLessThanOrEqual(PAGE.height - PAGE.margin);
            }
          }
        }
      }
  });

  it('PDF: every unit is printed, a row taller than a page is split, the font is embedded', () => {
    const plan = buildPlan({ level: 'I', subject: 'clr' });
    const pages = buildPlanPages(planDocument(plan, meta), approxMeasure);
    const texts = pages.flatMap((p) => flattenOps(p.ops)).filter((o) => o.t === 'text').map((o) => (o as { text: string }).text).join('\n');
    for (const r of plan.rows) expect(texts, r.title).toContain(r.title.split(' ')[0]);
    expect(texts).toContain('Pagina 1 din');
    // a huge unit is split over pages instead of running off the page
    const huge = updateRow(plan, 'toamna', { contents: Array.from({ length: 120 }, (_, i) => `Conținut lung numărul ${i + 1}, scris ca să umple pagina`) });
    const hugePages = buildPlanPages(planDocument(huge, meta), approxMeasure);
    expect(hugePages.length).toBeGreaterThan(pages.length + 1);
    for (const p of hugePages) for (const op of flattenOps(p.ops)) if (op.t === 'text') expect(op.y).toBeLessThanOrEqual(PAGE.height - PAGE.margin + 0.01);
    const pdf = createPlanPdf(plan, meta, fonts).output();
    expect(pdf).toMatch(/\/FontName \/[A-Z+]*Nunito/);
  });

  it('week labels', () => {
    expect(weekNumbers([3, 4, 5, 7])).toBe('S3–S5, S7');
    expect(weekNumbers([12])).toBe('S12');
  });
});
