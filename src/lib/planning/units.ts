/**
 * The units of learning of the proposed plan.
 *
 * The year is cut into thematic units (the themes of src/lib/calendar.ts and of the seasons), the
 * same for both subjects, so the two plans of a class go together. Each unit is placed in a module
 * and gets that module's weeks by its weight; „1 Decembrie” always gets the week of 1 December.
 *
 * For each class and subject, every unit names the contents it works on and the specific
 * competences it targets. Contents are pointers into the programme's `contents` (the JSON data of
 * src/lib/curriculum), never retyped: [group, item] = the group's index among that class's groups,
 * in the programme's order, and the item's index in it (a test checks every pointer, and that every
 * content and every specific competence of the class appears in the year).
 *
 *   Comunicare în limba română, groups of each class:
 *     0 Comunicare orală · 1 Citire/ lectură · 2 Scriere/ redactare · 3 Elemente de construcție a comunicării
 *   Matematică și explorarea mediului:
 *     CP  0 Numere · 1 Orientare spațială · 2 Figuri plane · 3 Corpuri · 4 Lungime · 5 Timp · 6 Bani · 7 Date ·
 *         8 Corpul omenesc · 9 Plante și animale · 10 Pământul · 11 Universul · 12 Forțe și mișcare · 13 Energie
 *     I   0 Numere · 1 Orientare spațială · 2 Figuri plane · 3 Corpuri · 4 Lungime · 5 Capacitate · 6 Timp · 7 Bani ·
 *         8 Date · 9 Corpul omenesc · 10 Plante și animale · 11 Pământul · 12 Universul · 13 Forțe și mișcare · 14 Energie
 *     II  0 Numere · 1 Figuri plane · 2 Corpuri · 3 Lungime · 4 Capacitate · 5 Masă · 6 Timp · 7 Bani · 8 Date ·
 *         9 Corpul omenesc · 10 Plante și animale · 11 Pământul · 12 Universul · 13 Forțe și mișcare · 14 Energie
 *
 * The recap units (initial evaluation in clasa I and a II-a, the final one every year) have their
 * own short text instead of programme contents, and target every competence of the year.
 *
 * `sheets` are WorksheetWiz presets (src/lib/curriculum/presets.ts); only those that print one of
 * the unit's codes in that class are shown (a test checks the list).
 */
import type { PlanLevel, SubjectId } from './subjects';

export type UnitId =
  | 'start' | 'toamna'
  | 'fructe-legume' | 'familia' | '1-decembrie' | 'iarna-sarbatori'
  | 'iarna' | 'animale-salbatice'
  | 'primavara' | 'transport' | 'sarbatori-primavara'
  | 'animale-domestice' | 'vara' | 'final';

export interface ThematicUnit {
  id: UnitId;
  module: number;
  /** share of the module's free weeks */
  weight: number;
  /** a fixed number of weeks instead of a share */
  weeks?: number;
  /** the unit takes exactly the week that contains this day */
  anchor?: string;
  /** a recap / evaluation unit */
  recap?: boolean;
  title: (level: PlanLevel) => string;
}

const same = (t: string) => () => t;

export const THEMATIC_UNITS: ThematicUnit[] = [
  { id: 'start', module: 1, weight: 0, weeks: 2, recap: true, title: (l) => (l === 'CP' ? 'Bun venit în clasa pregătitoare!' : 'Din nou la școală! Recapitulare și evaluare inițială') },
  { id: 'toamna', module: 1, weight: 1, title: same('Toamna') },
  { id: 'fructe-legume', module: 2, weight: 1, title: same('Fructe și legume, daruri ale toamnei') },
  { id: 'familia', module: 2, weight: 1, title: same('Familia mea') },
  { id: '1-decembrie', module: 2, weight: 0, anchor: '2026-12-01', title: same('1 Decembrie – Ziua României') },
  { id: 'iarna-sarbatori', module: 2, weight: 1, title: same('Sărbătorile iernii') },
  { id: 'iarna', module: 3, weight: 1, title: same('Bucuriile iernii') },
  { id: 'animale-salbatice', module: 3, weight: 1, title: same('Animale sălbatice') },
  { id: 'primavara', module: 4, weight: 2, title: same('Primăvara') },
  { id: 'transport', module: 4, weight: 1, title: same('Mijloace de transport') },
  { id: 'sarbatori-primavara', module: 4, weight: 1, title: same('Sărbători de primăvară') },
  { id: 'animale-domestice', module: 5, weight: 1, title: same('Animale domestice') },
  { id: 'vara', module: 5, weight: 1, title: same('Vine vara!') },
  { id: 'final', module: 5, weight: 0, weeks: 2, recap: true, title: (l) => (l === 'CP' ? 'Recapitulare finală' : 'Recapitulare și evaluare finală') },
];

/** [group, item]: see the table at the top of this file. */
export type ContentRef = readonly [number, number];

export interface UnitPlan {
  contents: ContentRef[];
  codes: string[];
  sheets?: string[];
  /** recap units: the text of the „Conținuturi” cell */
  text?: string[];
}

type SubjectPlan = Record<UnitId, UnitPlan>;

const ALL = '*';

/** CP's welcome unit works on contents; the recap units of I and II are recaps. */
const RECAP_START = (prev: string, sheets: string[], codes: string[]): UnitPlan => ({
  contents: [],
  codes,
  sheets,
  text: [`Recapitularea conținuturilor din ${prev}`, 'Evaluare inițială'],
});
const RECAP_END = (cls: string, sheets: string[]): UnitPlan => ({
  contents: [],
  codes: [ALL],
  sheets,
  text: [`Recapitularea conținuturilor din ${cls}`, 'Evaluare finală'],
});

export const UNIT_PLANS: Record<SubjectId, Record<PlanLevel, SubjectPlan>> = {
  clr: {
    CP: {
      start: { contents: [[0, 0], [0, 3], [1, 0], [2, 0]], codes: ['1.1', '1.4', '2.2', '2.3', '4.1'], sheets: ['grafisme'] },
      toamna: { contents: [[0, 1], [3, 1], [3, 5], [3, 6], [2, 0]], codes: ['1.3', '2.1', '3.2', '4.1'], sheets: ['sunetul-initial', 'cate-silabe', 'desparte-silabe', 'grafisme'] },
      'fructe-legume': { contents: [[1, 2], [2, 1], [3, 7], [0, 6]], codes: ['1.3', '2.4', '3.1', '3.2', '4.1'], sheets: ['litere-tipar', 'primul-sunet', 'citire-uneste'] },
      familia: { contents: [[0, 4], [1, 2], [2, 1], [1, 4]], codes: ['1.2', '2.2', '2.3', '3.1', '4.1'], sheets: ['litere-perechi', 'citire-uneste'] },
      '1-decembrie': { contents: [[0, 2], [1, 3], [1, 2]], codes: ['2.1', '2.4', '3.1', '3.3'], sheets: ['citire-uneste'] },
      'iarna-sarbatori': { contents: [[2, 4], [2, 2], [1, 2], [2, 1], [0, 5]], codes: ['1.4', '3.1', '4.1', '4.2', '4.3'], sheets: ['litere-perechi', 'citire-copiaza'] },
      iarna: { contents: [[1, 2], [2, 1], [1, 5], [1, 6], [3, 2]], codes: ['1.1', '2.1', '3.1', '3.2', '4.1'], sheets: ['litere-tipar', 'citire-deseneaza'] },
      'animale-salbatice': { contents: [[1, 2], [1, 4], [3, 3], [0, 6], [1, 1]], codes: ['1.2', '2.4', '3.1', '3.4', '4.1'], sheets: ['citire-uneste', 'citire-copiaza'] },
      primavara: { contents: [[1, 2], [2, 1], [1, 7], [2, 3]], codes: ['2.2', '3.1', '3.2', '4.1', '4.3'], sheets: ['litere-perechi', 'citire-deseneaza'] },
      transport: { contents: [[1, 3], [1, 4], [0, 3], [3, 6]], codes: ['1.3', '2.3', '3.1', '3.3'], sheets: ['desparte-silabe', 'citire-uneste'] },
      'sarbatori-primavara': { contents: [[2, 4], [2, 5], [1, 2], [2, 1]], codes: ['3.1', '4.1', '4.2', '4.3'], sheets: ['litere-tipar', 'citire-copiaza'] },
      'animale-domestice': { contents: [[0, 4], [1, 4], [1, 6], [3, 7]], codes: ['1.1', '1.2', '1.3', '2.2', '3.1'], sheets: ['primul-sunet', 'citire-litera-lipsa', 'citire-uneste'] },
      vara: { contents: [[0, 6], [1, 0], [2, 5], [3, 2], [3, 3]], codes: ['1.4', '2.1', '2.4', '3.1', '3.4', '4.2'], sheets: ['citire-deseneaza'] },
      final: RECAP_END('clasa pregătitoare', ['evaluare-clr']),
    },
    I: {
      start: RECAP_START('clasa pregătitoare', ['evaluare-clr'], ['1.1', '1.3', '2.1', '3.1', '4.1']),
      toamna: { contents: [[0, 0], [0, 4], [1, 2], [2, 1], [2, 13], [3, 6], [3, 7]], codes: ['1.1', '1.3', '2.3', '3.1', '4.1'], sheets: ['litere-mana', 'sunetul-initial', 'cate-silabe'] },
      'fructe-legume': { contents: [[1, 2], [2, 1], [1, 5], [3, 9], [3, 1], [3, 8]], codes: ['1.3', '2.1', '3.1', '4.1'], sheets: ['litere-mana', 'desparte-silabe', 'citire-uneste'] },
      familia: { contents: [[0, 5], [0, 8], [1, 2], [2, 1], [2, 16]], codes: ['1.2', '2.2', '2.4', '3.1', '4.1'], sheets: ['citire-copiaza', 'litere-mana'] },
      '1-decembrie': { contents: [[2, 6], [0, 2], [1, 7]], codes: ['1.4', '2.1', '3.1', '4.2'], sheets: ['citire-completeaza', 'citire-ordoneaza'] },
      'iarna-sarbatori': { contents: [[2, 18], [2, 15], [0, 3], [1, 2], [2, 1]], codes: ['1.4', '2.1', '3.1', '4.1', '4.2', '4.3'], sheets: ['litere-mana', 'citire-copiaza'] },
      iarna: { contents: [[1, 3], [2, 2], [2, 7], [1, 6]], codes: ['1.3', '3.1', '4.1', '4.2'], sheets: ['citire-litera-lipsa', 'citire-copiaza'] },
      'animale-salbatice': { contents: [[1, 8], [1, 10], [0, 9], [3, 2], [3, 3]], codes: ['1.1', '1.2', '2.2', '3.2', '3.4'], sheets: ['citire-text'] },
      primavara: { contents: [[2, 5], [2, 9], [2, 10], [3, 10], [1, 7]], codes: ['1.3', '2.1', '3.1', '4.2'], sheets: ['citire-ordoneaza', 'citire-completeaza'] },
      transport: { contents: [[1, 1], [1, 9], [2, 14], [0, 6], [0, 10]], codes: ['1.4', '2.3', '2.4', '3.3', '4.2'], sheets: ['citire-ordoneaza'] },
      'sarbatori-primavara': { contents: [[2, 17], [2, 18], [2, 11], [0, 4]], codes: ['2.3', '3.2', '4.2', '4.3'], sheets: ['citire-ordoneaza', 'citire-text'] },
      'animale-domestice': { contents: [[1, 4], [2, 0], [1, 8], [3, 4], [2, 4]], codes: ['1.3', '2.1', '3.1', '3.2', '4.1'], sheets: ['citire-text', 'citire-completeaza'] },
      vara: { contents: [[2, 19], [2, 20], [1, 0], [0, 7], [0, 1]], codes: ['1.4', '2.4', '3.3', '3.4', '4.2', '4.3'], sheets: ['citire-ordoneaza'] },
      final: RECAP_END('clasa I', ['evaluare-citire', 'evaluare-clr']),
    },
    II: {
      start: RECAP_START('clasa I', ['evaluare-citire'], ['1.1', '2.1', '3.1', '3.2', '4.1']),
      toamna: { contents: [[1, 3], [2, 0], [0, 0], [2, 13], [3, 6], [0, 12]], codes: ['1.3', '2.1', '2.3', '3.1', '4.1'], sheets: ['citire-copiaza', 'citire-litera-lipsa'] },
      'fructe-legume': { contents: [[1, 4], [1, 6], [1, 7], [2, 14], [3, 7]], codes: ['1.3', '3.1', '3.2', '4.2'], sheets: ['citire-text', 'citire-ordoneaza'] },
      familia: { contents: [[0, 5], [0, 8], [2, 2], [1, 2], [2, 10]], codes: ['1.2', '2.2', '2.3', '4.1', '4.2'], sheets: ['citire-copiaza', 'citire-ordoneaza'] },
      '1-decembrie': { contents: [[1, 14], [0, 2], [0, 3], [2, 9]], codes: ['1.1', '2.4', '3.1', '3.3', '4.2'], sheets: ['citire-ordoneaza'] },
      'iarna-sarbatori': { contents: [[2, 20], [1, 12], [1, 13], [0, 14]], codes: ['1.4', '2.4', '3.4', '4.1', '4.3'], sheets: ['citire-copiaza'] },
      iarna: { contents: [[1, 9], [1, 10], [1, 11], [0, 9], [2, 17]], codes: ['1.1', '1.2', '2.2', '3.2', '4.1'], sheets: ['citire-text', 'citire-copiaza'] },
      'animale-salbatice': { contents: [[2, 5], [2, 6], [3, 2], [3, 3], [0, 10], [2, 18]], codes: ['1.3', '2.1', '3.2', '4.1'], sheets: ['citire-litera-lipsa'] },
      primavara: { contents: [[2, 4], [2, 7], [2, 22], [3, 8], [1, 5]], codes: ['2.2', '3.1', '4.1', '4.2', '4.3'], sheets: ['citire-ordoneaza'] },
      transport: { contents: [[2, 19], [2, 21], [0, 6], [0, 11], [1, 8]], codes: ['1.4', '2.3', '3.3', '4.2', '4.3'], sheets: ['citire-ordoneaza'] },
      'sarbatori-primavara': { contents: [[2, 11], [0, 4], [2, 16], [3, 4], [0, 13]], codes: ['1.3', '2.1', '2.3', '3.2', '4.1'], sheets: ['citire-copiaza', 'citire-litera-lipsa'] },
      'animale-domestice': { contents: [[1, 0], [1, 1], [3, 1], [0, 1]], codes: ['1.1', '2.1', '3.1', '3.4'], sheets: [] },
      vara: { contents: [[2, 23], [2, 15], [2, 1], [0, 7], [0, 8]], codes: ['1.2', '2.4', '3.4', '4.2', '4.3'], sheets: ['citire-ordoneaza'] },
      final: RECAP_END('clasa a II-a', ['evaluare-citire']),
    },
  },
  mem: {
    CP: {
      start: { contents: [[1, 0], [7, 0], [2, 0]], codes: ['2.1', '2.2', '4.1', '5.1'], sheets: ['orientare', 'sorteaza', 'forme'] },
      toamna: { contents: [[0, 1], [5, 1], [9, 0], [10, 1]], codes: ['1.1', '1.2', '3.1', '4.1', '6.2'], sheets: ['cifre', 'numara', 'mate-compara'] },
      'fructe-legume': { contents: [[0, 1], [9, 1], [8, 3], [7, 0]], codes: ['1.1', '1.3', '3.2', '4.2', '5.1'], sheets: ['mate-sir', 'grupeaza-numara', 'sorteaza'] },
      familia: { contents: [[0, 4], [8, 0], [8, 1]], codes: ['1.4', '1.6', '3.2', '4.1'], sheets: ['mate-adunari', 'mate-scaderi', 'mate-imagini'] },
      '1-decembrie': { contents: [[0, 4], [0, 6]], codes: ['1.4', '1.6', '5.2'], sheets: ['mate-probleme', 'mate-imagini'] },
      'iarna-sarbatori': { contents: [[0, 2], [6, 0], [5, 0]], codes: ['1.1', '1.2', '6.2', '6.3'], sheets: ['mate-bani', 'mate-saptamana', 'mate-compara'] },
      iarna: { contents: [[0, 2], [10, 0], [8, 2], [3, 0]], codes: ['1.1', '1.3', '2.2', '3.2', '4.2'], sheets: ['mate-vecini', 'mate-figuri'] },
      'animale-salbatice': { contents: [[0, 3], [0, 5], [9, 2]], codes: ['1.1', '1.4', '1.5', '4.1', '4.2'], sheets: ['mate-adunari-31', 'mate-grupe'] },
      primavara: { contents: [[0, 3], [4, 0], [9, 0], [11, 0]], codes: ['1.1', '1.2', '1.3', '3.1', '6.1'], sheets: ['mate-lungimi', 'mate-sir', 'mate-compara'] },
      transport: { contents: [[0, 5], [0, 6], [12, 0], [12, 1]], codes: ['1.4', '1.6', '4.2', '5.2'], sheets: ['mate-probleme', 'mate-adunari-31', 'mate-lipsa'] },
      'sarbatori-primavara': { contents: [[6, 1], [6, 0]], codes: ['1.5', '5.2', '6.3'], sheets: ['mate-bani', 'mate-grupe'] },
      'animale-domestice': { contents: [[13, 1], [0, 5], [7, 0], [9, 1]], codes: ['1.5', '3.1', '4.1', '5.1'], sheets: ['grupeaza-numara', 'mate-grupe'] },
      vara: { contents: [[13, 0], [5, 1], [2, 0], [1, 0]], codes: ['2.1', '2.2', '3.2', '4.2', '6.2'], sheets: ['orientare', 'forme', 'mate-figuri'] },
      final: RECAP_END('clasa pregătitoare', ['evaluare-mate']),
    },
    I: {
      start: RECAP_START('clasa pregătitoare', ['evaluare-mate'], ['1.1', '1.2', '1.4', '2.2', '5.2']),
      toamna: { contents: [[0, 1], [0, 3], [6, 2], [10, 0]], codes: ['1.1', '1.2', '1.4', '4.1', '6.2'], sheets: ['mate-compara', 'mate-adunari', 'mate-luni'] },
      'fructe-legume': { contents: [[0, 4], [0, 3], [8, 0], [5, 0]], codes: ['1.4', '1.6', '3.2', '5.1', '6.1'], sheets: ['mate-adunari', 'mate-scaderi', 'mate-lipsa'] },
      familia: { contents: [[0, 2], [9, 0], [6, 1]], codes: ['1.1', '1.3', '4.1', '6.2'], sheets: ['mate-sir', 'mate-vecini', 'mate-saptamana'] },
      '1-decembrie': { contents: [[0, 2], [0, 7]], codes: ['1.2', '1.6', '5.2'], sheets: ['mate-probleme', 'mate-compara'] },
      'iarna-sarbatori': { contents: [[7, 0], [7, 1], [0, 5]], codes: ['1.4', '5.2', '6.3'], sheets: ['mate-bani', 'mate-adunari'] },
      iarna: { contents: [[11, 0], [0, 5], [0, 6]], codes: ['1.4', '3.1', '4.1', '4.2'], sheets: ['mate-adunari', 'mate-scaderi', 'mate-lipsa'] },
      'animale-salbatice': { contents: [[10, 1], [1, 0], [0, 5], [0, 8]], codes: ['1.5', '2.1', '3.2', '5.2'], sheets: ['orientare', 'mate-probleme', 'mate-grupe'] },
      primavara: { contents: [[4, 0], [4, 1], [12, 0], [6, 2]], codes: ['3.1', '4.1', '6.1', '6.4'], sheets: ['mate-rigla', 'mate-lungimi'] },
      transport: { contents: [[6, 0], [13, 0], [0, 8]], codes: ['1.6', '4.2', '5.2', '6.2'], sheets: ['mate-ceas', 'mate-ceas-acele', 'mate-probleme'] },
      'sarbatori-primavara': { contents: [[5, 1], [5, 0], [7, 1]], codes: ['1.5', '6.1', '6.3', '6.4'], sheets: ['mate-bani', 'mate-grupe'] },
      'animale-domestice': { contents: [[2, 0], [3, 0], [14, 1], [8, 0]], codes: ['1.3', '2.2', '3.1', '5.1'], sheets: ['forme', 'mate-figuri'] },
      vara: { contents: [[14, 0], [1, 0], [0, 2]], codes: ['1.1', '1.3', '2.1', '3.2', '4.2'], sheets: ['mate-sir', 'orientare'] },
      final: RECAP_END('clasa I', ['evaluare-mate']),
    },
    II: {
      start: RECAP_START('clasa I', ['evaluare-mate'], ['1.1', '1.2', '1.4', '5.2', '6.2']),
      toamna: { contents: [[0, 1], [0, 2], [8, 0], [6, 2]], codes: ['1.1', '1.2', '1.3', '5.1', '6.2'], sheets: ['mate-compara', 'mate-sir', 'mate-luni'] },
      'fructe-legume': { contents: [[0, 3], [9, 0], [5, 0], [5, 1]], codes: ['1.4', '3.2', '6.1', '6.4'], sheets: ['mate-adunari', 'mate-scaderi', 'mate-balanta'] },
      familia: { contents: [[0, 3], [0, 10], [6, 1]], codes: ['1.4', '1.6', '5.2', '6.2'], sheets: ['mate-probleme', 'mate-calendar', 'mate-lipsa'] },
      '1-decembrie': { contents: [[11, 1], [11, 0]], codes: ['3.2', '4.1', '5.1'], sheets: [] },
      'iarna-sarbatori': { contents: [[7, 0], [7, 2], [7, 1]], codes: ['1.4', '5.2', '6.3'], sheets: ['mate-bani'] },
      iarna: { contents: [[0, 4], [0, 5], [9, 1]], codes: ['1.5', '1.6', '3.1', '4.2'], sheets: ['mate-grupe', 'mate-inmultiri'] },
      'animale-salbatice': { contents: [[0, 4], [10, 1], [10, 0]], codes: ['1.5', '3.2', '4.1', '5.2'], sheets: ['mate-inmultiri', 'mate-factor-lipsa'] },
      primavara: { contents: [[0, 6], [0, 7], [12, 1]], codes: ['1.5', '1.6', '4.2', '5.2'], sheets: ['mate-impartiri', 'mate-factor-lipsa'] },
      transport: { contents: [[6, 0], [6, 3], [3, 0], [3, 1]], codes: ['2.1', '6.1', '6.2', '6.4'], sheets: ['mate-ceas', 'mate-ceas-acele', 'mate-rigla', 'mate-unitati'] },
      'sarbatori-primavara': { contents: [[0, 8], [0, 9], [4, 0]], codes: ['1.6', '2.2', '3.1', '6.4'], sheets: ['mate-unitati'] },
      'animale-domestice': { contents: [[1, 0], [2, 0], [13, 0]], codes: ['2.1', '2.2', '3.1', '4.1'], sheets: [] },
      vara: { contents: [[12, 0], [14, 0], [14, 1], [0, 10]], codes: ['1.3', '3.2', '4.2', '5.1', '5.2'], sheets: ['mate-probleme'] },
      final: RECAP_END('clasa a II-a', ['evaluare-mate']),
    },
  },
};

/** The marker for „every specific competence of the year” in a recap unit. */
export const ALL_CODES = ALL;
