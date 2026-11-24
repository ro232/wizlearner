/**
 * Data of the sheets for three more subjects of clasa pregătitoare – a II-a (see subjects-pages.ts):
 *
 * - Arte vizuale și abilități practice: „Simetrie” (sym), „Desenează după model” (model), „Decupează
 *   și lipește” (cut), „Linii și puncte” (lines);
 * - Dezvoltare personală: „Emoțiile” (feel:1 the faces, feel:2 „Cum se simte?”), „Despre mine” (me),
 *   „Obiectele de igienă” (hyg), „Obiceiuri sănătoase” (habit), „Meserii și unelte” (job), „La ce
 *   folosesc meseriile?” (jobuse), „Reguli în clasă” (rules);
 * - Comunicare în limba modernă 1 (engleză): „Imagini și cuvinte” (en).
 *
 * Every row has one answer; pictures or words whose answer can be argued are left out on purpose:
 * - emotions: only the four basic emotions the programme names („bucurie, tristețe, frică, furie”),
 *   two faces each that nobody reads otherwise (no „surprised” face: the programme does not list it);
 * - hygiene objects: no sponge (it washes dishes too), no comb (the Twemoji one is an afro pick);
 * - jobs: the person drawn already shows the job; the right column shows a tool or what the job
 *   gives, never a second person;
 * - English: no greetings (a waving hand is both „hello” and „goodbye”), no bird next to a duck.
 *
 * Pictures are Twemoji (quoted here, so scripts/build-hint-icons.mjs draws them into icons.json).
 * Every word is written out as printed; nothing is derived.
 */

/**
 * One kind per curriculum code (curriculum/sheet.ts reads the codes by kind): the objects of hygiene
 * (CP 1.2) and the habits (I 1.2) are two kinds, as are the tools of a job (I 3.3) and what it is
 * good for (II 3.3).
 */
export type SubjectKind = 'sym' | 'model' | 'cut' | 'lines' | 'feel' | 'me' | 'hyg' | 'habit' | 'job' | 'jobuse' | 'rules' | 'en';
export const SUBJECT_KINDS: SubjectKind[] = ['sym', 'model', 'cut', 'lines', 'feel', 'me', 'hyg', 'habit', 'job', 'jobuse', 'rules', 'en'];
/** How many sets each kind has. */
export const SUBJECT_SETS: Record<SubjectKind, number> = { sym: 3, model: 3, cut: 2, lines: 2, feel: 2, me: 1, hyg: 1, habit: 1, job: 1, jobuse: 1, rules: 1, en: 3 };

const SUBJECT_ITEM = /^((sym|model|en):[1-3]|(cut|lines|feel):[12]|(me|hyg|habit|job|jobuse|rules):1)$/;

export function isSubjectItem(item: string): boolean {
  return SUBJECT_ITEM.test(item);
}

// ───────────────────────── Arte vizuale: „Simetrie” ─────────────────────────

/** The colours of the drawings, by the letter used in the pictures below. */
export const PIXEL_COLOURS: Record<string, string> = {
  r: '#E5484D', // roșu
  y: '#F5C542', // galben
  b: '#3E8EDE', // albastru
  g: '#46A758', // verde
  o: '#F08C2E', // portocaliu
  k: '#8D5A3B', // maro
  p: '#9B6BD3', // mov
  s: '#9AA4B2', // gri
};

export interface SymmetrySet {
  name: string;
  /** The LEFT half, one string per row ('.' = empty). The right half is its mirror image. */
  half: string[];
}

export const SYMMETRY_SETS: SymmetrySet[] = [
  { name: 'inimă', half: ['.rr.', 'rrrr', 'rrrr', 'rrrr', '.rrr', '..rr', '...r'] },
  {
    name: 'casă',
    half: ['....r', '...rr', '..rrr', '.rrrr', 'rrrrr', '.yyyy', '.ybby', '.ybby', '.yyyk', '.yyyk'],
  },
  {
    name: 'fluture',
    half: ['..k...', '...k..', 'pppppk', 'pypppk', 'pppppk', '.ppppk', '.ooook', 'oyoook', 'oooo.k', '.oo...'],
  },
];

/** The whole picture of a set: each row followed by its mirror image. */
export function symmetryFull(set: SymmetrySet): string[] {
  return set.half.map((r) => r + [...r].reverse().join(''));
}

// ───────────────────────── Arte vizuale: „Desenează după model” ─────────────────────────

export interface ModelSet {
  name: string;
  /** Dots on each side of the grid. */
  dots: number;
  /** The drawing: polylines through grid points [column, row], 0-based from the top left. */
  lines: [number, number][][];
}

export const MODEL_SETS: ModelSet[] = [
  // a house: the square, the roof, the door
  { name: 'casă', dots: 6, lines: [[[1, 2], [3, 0], [5, 2]], [[1, 2], [1, 5], [5, 5], [5, 2], [1, 2]], [[2, 5], [2, 3], [3, 3], [3, 5]]] },
  // a boat with its sail
  { name: 'barcă', dots: 7, lines: [[[0, 4], [6, 4], [5, 6], [1, 6], [0, 4]], [[3, 4], [3, 0], [5, 3], [3, 3]]] },
  // a fish with its tail and its fin
  { name: 'pește', dots: 8, lines: [[[1, 3], [3, 1], [5, 1], [6, 3], [5, 5], [3, 5], [1, 3]], [[6, 3], [7, 1], [7, 5], [6, 3]], [[3, 1], [4, 0], [5, 1]]] },
];

// ───────────────────────── Arte vizuale: „Decupează și lipește” ─────────────────────────

/** A piece, in mm on the base picture: a rectangle, a triangle (apex up) or a circle (x, y = centre). */
export interface CutPiece {
  shape: 'rect' | 'tri' | 'circle';
  x: number;
  y: number;
  w: number;
  h: number;
  colour: string;
  /** Its name, for the note to the adult. */
  name: string;
}

export interface CutSet {
  name: string;
  title: string;
  pieces: CutPiece[];
}

const piece = (shape: CutPiece['shape'], x: number, y: number, w: number, h: number, colour: string, name: string): CutPiece => ({ shape, x, y, w, h, colour, name });

/** Next to the line where the page is cut in two. */
export const SCISSORS = '✂️';

/** The base pictures are 120 × 84 mm; the pieces keep the same size below the cut line. */
export const CUT_SETS: CutSet[] = [
  {
    name: 'casa',
    title: 'Casa',
    pieces: [
      piece('rect', 30, 36, 56, 44, '#F5C542', 'peretele'),
      piece('tri', 24, 6, 68, 30, '#E5484D', 'acoperișul'),
      piece('rect', 50, 54, 16, 26, '#8D5A3B', 'ușa'),
      piece('rect', 36, 44, 12, 12, '#3E8EDE', 'fereastra din stânga'),
      piece('rect', 68, 44, 12, 12, '#3E8EDE', 'fereastra din dreapta'),
      piece('circle', 108, 14, 16, 16, '#F08C2E', 'soarele'),
    ],
  },
  {
    name: 'robotul',
    title: 'Robotul',
    pieces: [
      piece('rect', 44, 4, 32, 24, '#9AA4B2', 'capul'),
      piece('circle', 53, 15, 8, 8, '#3E8EDE', 'ochiul din stânga'),
      piece('circle', 67, 15, 8, 8, '#3E8EDE', 'ochiul din dreapta'),
      piece('rect', 38, 30, 44, 34, '#46A758', 'corpul'),
      piece('rect', 24, 32, 12, 26, '#F08C2E', 'brațul din stânga'),
      piece('rect', 84, 32, 12, 26, '#F08C2E', 'brațul din dreapta'),
      piece('rect', 44, 66, 12, 16, '#8D5A3B', 'piciorul din stânga'),
      piece('rect', 64, 66, 12, 16, '#8D5A3B', 'piciorul din dreapta'),
    ],
  },
];

// ───────────────────────── Arte vizuale: „Linii și puncte” ─────────────────────────

/** The kinds of lines and points, named as in the programme („linii frânte/ curbe/ orizontale/ verticale”). */
export type LineKind = 'horizontal' | 'vertical' | 'zigzag' | 'waves' | 'dots' | 'circles';
export const LINE_NAMES: Record<LineKind, string> = {
  horizontal: 'linii orizontale',
  vertical: 'linii verticale',
  zigzag: 'linie frântă',
  waves: 'linie curbă',
  dots: 'puncte',
  circles: 'cerculețe',
};

export interface LinesSet {
  name: string;
  title: string;
  /** The shape decorated: a scarf (rectangle, vertical stripes) or a fir tree (triangle, horizontal stripes). */
  shape: 'scarf' | 'tree';
  stripes: LineKind[];
}

export const LINES_SETS: LinesSet[] = [
  { name: 'fularul', title: 'Fularul', shape: 'scarf', stripes: ['vertical', 'dots', 'zigzag', 'horizontal', 'waves', 'circles'] },
  { name: 'bradul', title: 'Bradul', shape: 'tree', stripes: ['dots', 'waves', 'zigzag', 'circles', 'horizontal'] },
];

// ───────────────────────── Dezvoltare personală: „Emoțiile” ─────────────────────────

/** The basic emotions of the programme (contents: „bucurie, tristețe, frică, furie”), as printed. */
export const EMOTIONS = ['BUCURIE', 'TRISTEȚE', 'FRICĂ', 'FURIE'] as const;
/** One face for each emotion, in the order of EMOTIONS, for the choices of „Cum se simte?”. */
export const EMOTION_FACES = ['😀', '😢', '😨', '😠'] as const;

/** Face, index in EMOTIONS: two faces each. */
export const FACES: [string, number][] = [
  ['😀', 0], ['😄', 0], ['😢', 1], ['😭', 1], ['😨', 2], ['😱', 2], ['😠', 3], ['😡', 3],
];

/** Picture, situation, the expected emotion (index in EMOTIONS). */
export const SITUATIONS: [string, string, number][] = [
  ['🎁', 'Maria a primit un cadou de ziua ei.', 0],
  ['👴', 'Bunicul a venit în vizită la Andrei.', 0],
  ['🎈', 'Lui Matei i s-a spart balonul.', 1],
  ['🧸', 'Ioana nu-și găsește ursulețul de pluș.', 1],
  ['🌩️', 'Tună tare, iar Dan e singur în cameră.', 2],
  ['🐕', 'Un câine mare latră la Elena.', 2],
  ['🚗', 'Cineva i-a luat lui Radu mașinuța din mână.', 3],
  ['🧱', 'Un copil i-a dărâmat Anei turnul din cuburi, intenționat.', 3],
];

// ───────────────────────── Dezvoltare personală: „Igiena” ─────────────────────────

/** Picture, name, whether it is an object of personal hygiene. */
export const HYGIENE_OBJECTS: [string, string, boolean][] = [
  ['🪥', 'periuța de dinți', true],
  ['🧼', 'săpunul', true],
  ['🧻', 'hârtia igienică', true],
  ['🚿', 'dușul', true],
  ['🛁', 'cada', true],
  ['🧴', 'săpunul lichid', true],
  ['⚽', 'mingea', false],
  ['✏️', 'creionul', false],
  ['🍎', 'mărul', false],
  ['🧸', 'ursulețul', false],
  ['🚗', 'mașinuța', false],
  ['🪁', 'zmeul', false],
];

/** The two choices of the habits and of the class rules: „E BINE” and „NU E BINE”. */
export const YES_NO: [string, string][] = [['E BINE', '🙂'], ['NU E BINE', '🙁']];

/** Picture, habit, whether it is a good one. */
export const HABITS: [string, string, boolean][] = [
  ['🧼', 'Mă spăl pe mâini înainte de masă.', true],
  ['🍎', 'Mănânc fructele fără să le spăl.', false],
  ['🪥', 'Mă spăl pe dinți dimineața și seara.', true],
  ['🦷', 'Folosesc periuța de dinți a altcuiva.', false],
  ['🤧', 'Strănut într-un șervețel sau în cot.', true],
  ['🍪', 'Vin de afară și mănânc fără să mă spăl pe mâini.', false],
  ['👕', 'Îmi schimb hainele murdare cu haine curate.', true],
  ['🚽', 'După toaletă, plec fără să mă spăl pe mâini.', false],
];

// ───────────────────────── Dezvoltare personală: „Meserii” ─────────────────────────

/** Person, the job (as written under the picture), its tool, the tool's name. */
export const JOB_TOOLS: [string, string, string, string][] = [
  ['🧑‍🍳', 'bucătarul', '🍳', 'tigaia'],
  ['🧑‍🚒', 'pompierul', '🧯', 'stingătorul'],
  ['🧑‍⚕️', 'medicul', '🩺', 'stetoscopul'],
  ['🧑‍🌾', 'fermierul', '🚜', 'tractorul'],
  ['🧑‍🔧', 'mecanicul', '🔧', 'cheia'],
  ['🧑‍🎨', 'pictorul', '🖌️', 'pensula'],
];

/** Person, the job, what it gives (as printed on the card), its picture. Clasa a II-a: „La ce folosesc meseriile?”. */
export const JOB_USES: [string, string, string, string][] = [
  ['🧑‍⚕️', 'medicul', 'ne îngrijește când suntem bolnavi', '💊'],
  ['🧑‍🚒', 'pompierul', 'stinge incendiile', '🔥'],
  ['🧑‍🍳', 'bucătarul', 'gătește mâncarea', '🍲'],
  ['🧑‍🌾', 'fermierul', 'cultivă legume', '🥕'],
  ['🧑‍🔧', 'mecanicul', 'repară mașinile', '🚗'],
  ['🧑‍✈️', 'pilotul', 'conduce avionul', '✈️'],
];

// ───────────────────────── Dezvoltare personală: „Reguli în clasă” ─────────────────────────

/** Picture, rule, whether it is good to do so (CP contents: „Reguli de comunicare în activitatea școlară”). */
export const CLASS_RULES: [string, string, boolean][] = [
  ['🙋', 'Ridic mâna când vreau să răspund.', true],
  ['🗣️', 'Vorbesc în același timp cu colegul meu.', false],
  ['⏳', 'Îmi aștept rândul.', true],
  ['📢', 'Strig în clasă ca să fiu auzit.', false],
  ['👂', 'Ascult când vorbește un coleg.', true],
  ['😂', 'Râd de răspunsul unui coleg.', false],
  ['🙏', 'Spun „te rog” și „mulțumesc”.', true],
  ['🤝', 'Îl ajut pe colegul care îmi cere ajutorul.', true],
];

// ───────────────────────── Limba engleză: „Imagini și cuvinte” ─────────────────────────

/** Picture (a number: that many apples), the English word, the Romanian word (for the answers). */
export const ENGLISH_SETS: { title: string; pairs: [string, string, string][] }[] = [
  { title: 'Animals', pairs: [['🐶', 'dog', 'câine'], ['🐱', 'cat', 'pisică'], ['🐟', 'fish', 'pește'], ['🐄', 'cow', 'vacă'], ['🐷', 'pig', 'porc'], ['🐴', 'horse', 'cal']] },
  { title: 'Colours', pairs: [['🟥', 'red', 'roșu'], ['🟨', 'yellow', 'galben'], ['🟦', 'blue', 'albastru'], ['🟩', 'green', 'verde'], ['🟧', 'orange', 'portocaliu'], ['🟪', 'purple', 'mov']] },
  { title: 'Numbers', pairs: [['2', 'two', 'doi'], ['3', 'three', 'trei'], ['5', 'five', 'cinci'], ['7', 'seven', 'șapte'], ['8', 'eight', 'opt'], ['10', 'ten', 'zece']] },
];
/** What is counted on „Numbers”. */
export const COUNTED = '🍎';
