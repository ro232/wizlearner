/**
 * Data of the „Explorarea mediului” sheets (see explore-pages.ts): the parts of a plant and of the
 * body, the senses, where animals live and how they move, their young, the seasons, the weather and
 * water. Every row has one answer; pictures whose answer can be argued are left out on purpose:
 * - habitats: the fox, the wolf, the owl, the reindeer and the seal also live near the poles, the
 *   frog on land, the snake and the lizard in Romania: none of them is in a row;
 * - movement: the duck and the penguin both walk and swim, the bat is not a bird: left out;
 * - young: the goose („boboc”) with the duck („boboc”, „rățușcă”) would give two answers: no goose;
 * - seasons: only what a child of 4–7 ties to one season (no umbrella, no apple, no bee);
 * - water: only pictures where the water is plainly ice or snow, or plainly liquid; no steam, fog or
 *   cloud (they are drops of liquid water, which a picture cannot show).
 *
 * Pictures are Twemoji (quoted here, so scripts/build-hint-icons.mjs draws them into icons.json).
 * Every word is written out as printed („ÎN PĂDURE”, „puiul ieșit din ou”); nothing is derived.
 *
 * The sets and kinds added later keep the same rule; what was left out there, and why:
 * - body covering: no sheep (wool or fur?), no horse (hair), no hedgehog (spines), no tortoise, no shark;
 * - domestic / wild: no duck, goose, rabbit or camel (kept and wild alike);
 * - what they eat: every set has one way to pair the animals with their food (a set never has the cat with both the
 *   milk and the fish, or two leaf eaters);
 * - materials: only things made of one material (no window, no mirror in its frame, no hammer, no ladder, no pen), and
 *   no cup with a straw (it is drawn like a glass);
 * - recycling: no drink carton and no drinking glass (they do not go where a child would put them);
 * - day and night: the Moon is „seen best at night”, never „only at night”;
 * - living things: the teddy bear and the robot are there on purpose, as things that only look alive.
 */

export type ExploreKind =
  | 'plant' | 'body' | 'senses' | 'home' | 'habitat' | 'move' | 'baby' | 'season' | 'weather' | 'wear' | 'water' | 'melt'
  | 'cycle' | 'cover' | 'eat' | 'tame' | 'alive' | 'food' | 'mat' | 'recycle' | 'day' | 'space' | 'obs';
export const EXPLORE_KINDS: ExploreKind[] = [
  'plant', 'body', 'senses', 'home', 'habitat', 'move', 'baby', 'season', 'weather', 'wear', 'water', 'melt',
  'cycle', 'cover', 'eat', 'tame', 'alive', 'food', 'mat', 'recycle', 'day', 'space', 'obs',
];
/** How many sets each kind has. */
export const EXPLORE_SETS: Record<ExploreKind, number> = {
  plant: 3, body: 3, senses: 3, home: 3, habitat: 3, move: 3, baby: 3, season: 7, weather: 3, wear: 3, water: 4, melt: 3,
  cycle: 3, cover: 3, eat: 3, tame: 3, alive: 3, food: 3, mat: 3, recycle: 3, day: 3, space: 4, obs: 3,
};

const EXPLORE_ITEM = /^([a-z]+):([1-9])$/;

export function isExploreItem(item: string): boolean {
  const m = EXPLORE_ITEM.exec(item);
  return !!m && m[1] in EXPLORE_SETS && Number(m[2]) <= EXPLORE_SETS[m[1] as ExploreKind];
}

// ───────────────────────── labelling: plant, body ─────────────────────────

/** The parts as they are written in the boxes and the word bank. */
export const PLANT_PARTS = ['RĂDĂCINĂ', 'TULPINĂ', 'FRUNZĂ', 'FLOARE', 'FRUCT'] as const;
export const BODY_PARTS = ['CAP', 'GÂT', 'TRUNCHI', 'MÂINI', 'PICIOARE'] as const;
/** plant:2 the tree, plant:3 the tulip; body:2 the face, body:3 the organs (clasa I); water:4 the water cycle; space:4 the planets. */
export const TREE_PARTS = ['RĂDĂCINI', 'TRUNCHI', 'RAMURI', 'FRUNZE', 'FRUCTE'] as const;
export const TULIP_PARTS = ['RĂDĂCINI', 'BULB', 'TULPINĂ', 'FRUNZĂ', 'PETALE'] as const;
export const FACE_PARTS = ['PĂR', 'OCHI', 'NAS', 'GURĂ', 'URECHE'] as const;
export const ORGANS = ['CREIER', 'PLĂMÂNI', 'INIMĂ', 'STOMAC', 'RINICHI'] as const;
/** In the order of the cycle: from the sea up, to the clouds, down as rain, back to the sea. */
export const WATER_CYCLE = ['SE EVAPORĂ', 'SE FAC NORI', 'PLOUĂ', 'CURGE SPRE MARE'] as const;
/** From the Sun outwards. */
export const PLANETS = ['MERCUR', 'VENUS', 'PĂMÂNT', 'MARTE', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUN'] as const;

// ───────────────────────── the senses ─────────────────────────

/** Sense organ, its name, the sense. */
export const SENSES: [string, string, string][] = [
  ['👁️', 'ochiul', 'VĂZ'],
  ['👂', 'urechea', 'AUZ'],
  ['👃', 'nasul', 'MIROS'],
  ['👅', 'limba', 'GUST'],
  ['✋', 'mâna (pielea)', 'PIPĂIT'],
];

/** A row with a sentence to read (or to listen to) and one right choice; `options`: the two words of this row only. */
export interface SentenceRow { picture: string; text: string; answer: number; options?: [string, string] }
export interface SentenceSet { title: string; instruction: string; help?: string; choices: Choice[]; rows: SentenceRow[] }
const say = (picture: string, text: string, answer: number, options?: [string, string]): SentenceRow => ({ picture, text, answer, ...(options ? { options } : {}) });

/** senses:2 — what tells you about it; senses:3 — the sense organ (the choices are pictures). */
export const SENSE_SETS: SentenceSet[] = [
  {
    title: 'Ce simț folosești?', instruction: 'Citește și încercuiește simțul cu care afli.',
    choices: [{ label: 'VĂZ', symbol: '' }, { label: 'AUZ', symbol: '' }, { label: 'MIROS', symbol: '' }, { label: 'GUST', symbol: '' }, { label: 'PIPĂIT', symbol: '' }],
    rows: [
      say('🔔', 'Sunetul clopoțelului', 1), say('🌈', 'Culorile curcubeului', 0), say('🍋', 'Lămâia acră', 3), say('🌹', 'Parfumul trandafirului', 2),
      say('🧊', 'Gheața rece', 4), say('🎸', 'Cântecul chitarei', 1), say('🧸', 'Blana moale a ursulețului', 4), say('🍯', 'Mierea dulce', 3),
    ],
  },
  {
    title: 'Cu ce simți?', instruction: 'Citește și încercuiește organul de simț potrivit.',
    choices: [{ label: 'OCHII', symbol: '👁️' }, { label: 'URECHILE', symbol: '👂' }, { label: 'NASUL', symbol: '👃' }, { label: 'LIMBA', symbol: '👅' }, { label: 'PIELEA', symbol: '✋' }],
    rows: [
      say('🎺', 'Aud trompeta cu …', 1), say('📺', 'Văd desenele animate cu …', 0), say('🍎', 'Simt gustul mărului cu …', 3),
      say('🌷', 'Simt mirosul florii cu …', 2), say('🚿', 'Simt că apa este caldă cu …', 4), say('🌩️', 'Aud tunetul cu …', 1),
    ],
  },
];

// ───────────────────────── where they live, how they move ─────────────────────────

export interface Choice {
  /** As printed under the picture of the choice („ÎN PĂDURE”). */
  label: string;
  /** A picture for the choice; empty: drawn on the page (the wavy line of „se târăște”). */
  symbol: string;
}

export interface ChoiceRow {
  picture: string;
  /** Its name, for the answers („ursul”). */
  name: string;
  /** Index of the right choice. */
  answer: number;
}

export interface ChoiceSet {
  title: string;
  instruction: string;
  choices: Choice[];
  rows: ChoiceRow[];
}

const row = (picture: string, name: string, answer: number): ChoiceRow => ({ picture, name, answer });

const HOME_CHOICES: Choice[] = [{ label: 'ÎN PĂDURE', symbol: '🌲' }, { label: 'LA FERMĂ', symbol: '🏡' }, { label: 'ÎN APĂ', symbol: '🌊' }];

export const HOME_SETS: ChoiceSet[] = [
  {
    title: 'Cine unde trăiește?', instruction: 'Încercuiește locul unde trăiește fiecare animal.', choices: HOME_CHOICES,
    rows: [row('🐻', 'ursul', 0), row('🐄', 'vaca', 1), row('🐟', 'peștele', 2), row('🐿️', 'veverița', 0), row('🐑', 'oaia', 1), row('🐬', 'delfinul', 2), row('🦔', 'ariciul', 0), row('🐔', 'găina', 1)],
  },
  {
    title: 'Cine unde trăiește?', instruction: 'Încercuiește locul unde trăiește fiecare animal.', choices: HOME_CHOICES,
    rows: [row('🐙', 'caracatița', 2), row('🐖', 'porcul', 1), row('🐻', 'ursul', 0), row('🐳', 'balena', 2), row('🐐', 'capra', 1), row('🐿️', 'veverița', 0), row('🦀', 'crabul', 2), row('🐴', 'calul', 1)],
  },
  {
    title: 'Cine unde trăiește?', instruction: 'Încercuiește locul unde trăiește fiecare animal.', choices: HOME_CHOICES,
    rows: [row('🐗', 'mistrețul', 0), row('🐓', 'cocoșul', 1), row('🦈', 'rechinul', 2), row('🦌', 'cerbul', 0), row('🦃', 'curcanul', 1), row('🦞', 'racul', 2), row('🦡', 'bursucul', 0), row('🐏', 'berbecul', 1)],
  },
];

/** Clasa a II-a, „Medii de viață”: a table with one X per row. */
export const HABITAT_SET: ChoiceSet = {
  title: 'Mediile de viață',
  instruction: 'Pune un X în coloana mediului de viață al fiecărui animal.',
  choices: [{ label: 'PĂDUREA', symbol: '🌲' }, { label: 'DEȘERTUL', symbol: '🏜️' }, { label: 'POLUL NORD', symbol: '🧊' }, { label: 'POLUL SUD', symbol: '🧊' }, { label: 'MAREA NEAGRĂ', symbol: '🌊' }],
  rows: [row('🐻', 'ursul brun', 0), row('🐫', 'cămila', 1), row('🐻‍❄️', 'ursul polar', 2), row('🐧', 'pinguinul', 3), row('🐬', 'delfinul', 4), row('🐿️', 'veverița', 0), row('🦀', 'crabul', 4), row('🦔', 'ariciul', 0)],
};

/** The three tables of „Medii de viață” (the contents of clasa a II-a: „lacul/iazul/balta, pădurea, Delta Dunării, Marea Neagră, deșertul, Polul Nord, Polul Sud”). */
export const HABITAT_SETS: ChoiceSet[] = [
  HABITAT_SET,
  {
    ...HABITAT_SET,
    choices: [{ label: 'BALTA', symbol: '🪷' }, { label: 'PĂDUREA', symbol: '🌲' }, { label: 'DEȘERTUL', symbol: '🏜️' }, { label: 'POLUL NORD', symbol: '🧊' }, { label: 'POLUL SUD', symbol: '🧊' }],
    rows: [row('🦢', 'lebăda', 0), row('🐗', 'mistrețul', 1), row('🐫', 'cămila', 2), row('🐻‍❄️', 'ursul polar', 3), row('🐧', 'pinguinul', 4), row('🦆', 'rața sălbatică', 0), row('🦂', 'scorpionul', 2), row('🦡', 'bursucul', 1)],
  },
  {
    ...HABITAT_SET,
    choices: [{ label: 'DELTA DUNĂRII', symbol: '🪷' }, { label: 'PĂDUREA', symbol: '🌲' }, { label: 'MAREA NEAGRĂ', symbol: '🌊' }, { label: 'DEȘERTUL', symbol: '🏜️' }, { label: 'POLUL SUD', symbol: '🧊' }],
    rows: [row('🐸', 'broasca', 0), row('🦌', 'cerbul', 1), row('🐬', 'delfinul', 2), row('🦂', 'scorpionul', 3), row('🐧', 'pinguinul', 4), row('🪼', 'meduza', 2), row('🐿️', 'veverița', 1), row('🦢', 'lebăda', 0)],
  },
];

export const MOVE_SET: ChoiceSet = {
  title: 'Cum se deplasează?',
  instruction: 'Încercuiește cum se deplasează fiecare animal.',
  choices: [{ label: 'ZBOARĂ', symbol: '🪽' }, { label: 'ÎNOATĂ', symbol: '🌊' }, { label: 'MERGE', symbol: '👣' }, { label: 'SE TÂRĂȘTE', symbol: '' }],
  rows: [row('🦅', 'vulturul', 0), row('🐟', 'peștele', 1), row('🦒', 'girafa', 2), row('🐍', 'șarpele', 3), row('🐝', 'albina', 0), row('🐬', 'delfinul', 1), row('🐎', 'calul', 2), row('🐌', 'melcul', 3)],
};

export const MOVE_SETS: ChoiceSet[] = [
  MOVE_SET,
  { ...MOVE_SET, rows: [row('🦋', 'fluturele', 0), row('🐳', 'balena', 1), row('🐘', 'elefantul', 2), row('🐛', 'omida', 3), row('🦜', 'papagalul', 0), row('🐠', 'peștele', 1), row('🐈', 'pisica', 2), row('🪱', 'râma', 3)] },
  { ...MOVE_SET, rows: [row('🦉', 'bufnița', 0), row('🦈', 'rechinul', 1), row('🦓', 'zebra', 2), row('🐍', 'șarpele', 3), row('🐦', 'vrabia', 0), row('🐋', 'balena', 1), row('🐫', 'cămila', 2), row('🐌', 'melcul', 3)] },
];

// ───────────────────────── young animals ─────────────────────────

/** Animal, its name, its young (as printed). */
export const BABY_SETS: [string, string, string][][] = [
  [['🐄', 'vaca', 'VIȚEL'], ['🐑', 'oaia', 'MIEL'], ['🐔', 'găina', 'PUI'], ['🐎', 'calul', 'MÂNZ'], ['🐐', 'capra', 'IED'], ['🐖', 'porcul', 'PURCEL']],
  [['🐕', 'câinele', 'CĂȚEL'], ['🐈', 'pisica', 'PISOI'], ['🦆', 'rața', 'RĂȚUȘCĂ'], ['🐇', 'iepurele', 'IEPURAȘ'], ['🐄', 'vaca', 'VIȚEL'], ['🐑', 'oaia', 'MIEL']],
  // the goose here, without the duck (both have a „boboc”)
  [['🪿', 'gâsca', 'BOBOC'], ['🐸', 'broasca', 'MORMOLOC'], ['🐻', 'ursul', 'URSULEȚ'], ['🐈', 'pisica', 'PISOI'], ['🐕', 'câinele', 'CĂȚEL'], ['🐔', 'găina', 'PUI']],
];

// ───────────────────────── seasons ─────────────────────────

export type Season = 'primavara' | 'vara' | 'toamna' | 'iarna';
export const SEASONS: Season[] = ['primavara', 'vara', 'toamna', 'iarna'];
/** As printed under the trees. */
export const SEASON_LABELS: Record<Season, string> = { primavara: 'PRIMĂVARA', vara: 'VARA', toamna: 'TOAMNA', iarna: 'IARNA' };
/** In „Ce se întâmplă …?” and „Încercuiește tot ce vezi …”. */
export const SEASON_WORDS: Record<Season, string> = { primavara: 'primăvara', vara: 'vara', toamna: 'toamna', iarna: 'iarna' };

/** Picture and name of what belongs to one season only. */
export const SEASON_THINGS: Record<Season, [string, string][]> = {
  primavara: [['🌷', 'laleaua'], ['🐣', 'puiul ieșit din ou'], ['🌸', 'floarea de cireș'], ['🌱', 'planta care răsare'], ['🪺', 'cuibul cu ouă']],
  vara: [['🏖️', 'plaja'], ['🍉', 'pepenele'], ['🩳', 'pantalonii scurți'], ['🕶️', 'ochelarii de soare'], ['👙', 'costumul de baie']],
  toamna: [['🍂', 'frunzele căzute'], ['🍁', 'frunza de arțar'], ['🍇', 'strugurii'], ['🎃', 'dovleacul'], ['🌰', 'castana']],
  iarna: [['⛄', 'omul de zăpadă'], ['🛷', 'sania'], ['⛸️', 'patinele'], ['🧤', 'mănușile'], ['🎄', 'bradul de Crăciun']],
};

// ───────────────────────── weather ─────────────────────────

/** Symbol, word (the CP contents: „ploaie, ninsoare, vânt, fulger, tunet”). */
export const WEATHER: [string, string][] = [['☀️', 'SOARE'], ['☁️', 'NORI'], ['🌧️', 'PLOAIE'], ['🌨️', 'NINSOARE'], ['🌬️', 'VÂNT'], ['🌩️', 'FULGER']];

/** „Dacă plouă, iau umbrela”: the weather, what goes with it, both names. */
export const WEAR: [string, string, string, string][] = [
  ['🌧️', 'plouă', '☂️', 'umbrela'],
  ['☀️', 'e soare', '🕶️', 'ochelarii de soare'],
  ['🌨️', 'ninge', '🛷', 'sania'],
  ['🌬️', 'bate vântul', '🪁', 'zmeul'],
];

/** The three sets of „dacă …, atunci …”: set 1 above, then what you put on or do, then what happens. */
export const WEAR_SETS: { title: string; instruction: string; help: string; pairs: [string, string, string, string][] }[] = [
  { title: 'Ce iei cu tine?', instruction: 'Unește vremea cu ce îți trebuie atunci.', help: 'Dacă plouă, atunci iei umbrela. Prima linie este exemplul.', pairs: WEAR },
  {
    title: 'Dacă plouă, atunci…', instruction: 'Unește vremea cu ce ți se potrivește atunci.', help: 'Dacă fulgeră, atunci intri în casă. Prima linie este exemplul.',
    pairs: [['🌧️', 'plouă', '🥾', 'ghetele'], ['☀️', 'e soare', '🧢', 'șapca'], ['🌨️', 'ninge', '🎿', 'schiurile'], ['🌩️', 'fulgeră', '🏠', 'casa (stai înăuntru)']],
  },
  {
    title: 'Dacă ninge, atunci…', instruction: 'Unește vremea cu ce se întâmplă atunci.', help: 'Dacă ninge, atunci putem face un om de zăpadă. Prima linie este exemplul.',
    pairs: [['🌨️', 'ninge', '⛄', 'omul de zăpadă'], ['🌬️', 'bate vântul', '🍂', 'frunzele care zboară'], ['🌦️', 'plouă cu soare', '🌈', 'curcubeul'], ['☀️', 'e foarte cald', '⛱️', 'umbrela de plajă']],
  },
];

/** weather:2 — warm or cold, by what you need then (no ice cream: it is cold itself). */
export const WARM_COLD: [string, string, 0 | 1][] = [
  ['🩳', 'pantalonii scurți', 0], ['🧤', 'mănușile', 1], ['👙', 'costumul de baie', 0], ['🧣', 'fularul', 1], ['⛱️', 'umbrela de plajă', 0], ['🛷', 'sania', 1], ['🧥', 'paltonul', 1],
];

/** weather:3 — the phenomenon each sentence is about (the CP contents: „ploaie, ninsoare, vânt, fulger, tunet”). */
export const WEATHER_SAY: SentenceSet = {
  title: 'Ce vreme este?', instruction: 'Citește și încercuiește despre ce vreme este vorba.',
  choices: [{ label: 'PLOAIE', symbol: '' }, { label: 'NINSOARE', symbol: '' }, { label: 'VÂNT', symbol: '' }, { label: 'FULGER', symbol: '' }],
  rows: [
    say('☂️', 'Deschid umbrela ca să nu mă ud.', 0), say('⛄', 'Totul este alb și facem un om de zăpadă.', 1), say('🪁', 'Zmeul se înalță sus, pe cer.', 2),
    say('🏠', 'Pe cer apare o lumină puternică, apoi se aude tunetul.', 3), say('🌈', 'După ea, apare curcubeul.', 0), say('🛷', 'Mergem la săniuș.', 1), say('🍂', 'Frunzele zboară prin aer.', 2),
  ],
};

// ───────────────────────── water ─────────────────────────

export const WATER_STATES = ['SOLIDĂ', 'LICHIDĂ'] as const;
/** Picture, name, 0 = solidă, 1 = lichidă. */
export const WATER_ROWS: [string, string, 0 | 1][] = [
  ['🧊', 'gheața', 0], ['💧', 'picătura de apă', 1], ['⛄', 'omul de zăpadă', 0], ['🌊', 'valul mării', 1], ['❄️', 'fulgul de nea', 0], ['🌧️', 'ploaia', 1], ['🚿', 'apa de la duș', 1],
];

/** water:3 — a second set, solid or liquid. */
export const WATER_ROWS_2: [string, string, 0 | 1][] = [
  ['🏔️', 'zăpada de pe munte', 0], ['⛲', 'apa din fântână', 1], ['🌨️', 'ninsoarea', 0], ['🏞️', 'apa râului', 1], ['🧊', 'cubul de gheață', 0], ['🪣', 'apa din găleată', 1], ['☔', 'picăturile de ploaie', 1],
];

/** A grid of twelve pictures, some to circle. Picture, name, to circle or not. */
export interface CircleSet { title: string; instruction: string; help: string; pictures: [string, string, boolean][] }

/** water:2 — where there is water (the CP contents: „Prezența apei în natură sub diverse forme (precipitații, râuri, lacuri, mare etc.)”). */
export const WATER_WHERE: CircleSet = {
  title: 'Unde este apă?', instruction: 'Încercuiește imaginile în care este apă.', help: 'Și zăpada și gheața sunt apă. Prima imagine încercuită este exemplul.',
  pictures: [
    ['🌊', 'marea', true], ['🌧️', 'ploaia', true], ['🏞️', 'râul', true], ['⛄', 'omul de zăpadă', true], ['🧊', 'gheața', true], ['⛲', 'fântâna arteziană', true],
    ['🔥', 'focul', false], ['🪨', 'piatra', false], ['📕', 'cartea', false], ['🧱', 'cărămida', false], ['🔑', 'cheia', false], ['🪑', 'scaunul', false],
  ],
};

export const MELT_OPTIONS = ['SE TOPEȘTE', 'ÎNGHEAȚĂ', 'FIERBE', 'SE EVAPORĂ'] as const;
/** Picture, sentence, index of the answer in MELT_OPTIONS. */
export const MELT_ROWS: [string, string, number][] = [
  ['🧊', 'Cubul de gheață stă la soare.', 0],
  ['🪣', 'Apa din găleată stă afară, în ger.', 1],
  ['🫖', 'Apa din ceainic stă mult pe foc.', 2],
  ['👕', 'Tricoul ud stă la soare.', 3],
  ['⛄', 'Omul de zăpadă stă la soare, primăvara.', 0],
  ['💧', 'Balta de pe stradă stă la soare, vara.', 3],
];

/** melt:2 and melt:3 — more sentences, the same four answers. */
export const MELT_ROWS_MORE: [string, string, number][][] = [
  [
    ['❄️', 'Fulgul de nea cade în palma caldă.', 0],
    ['🏞️', 'Apa lacului stă în ger, iarna.', 1],
    ['🍲', 'Apa din oală stă mult pe foc.', 2],
    ['🧦', 'Șosetele ude stau pe calorifer.', 3],
    ['🧊', 'Gheața din pahar stă pe masă, în cameră.', 0],
    ['🌧️', 'Apa de pe asfalt stă la soare, după ploaie.', 3],
  ],
  [
    ['⛄', 'Bulgărele de zăpadă stă în casă.', 0],
    ['💧', 'Apa de pe trotuar stă în ger, peste noapte.', 1],
    ['🫖', 'Apa pentru ceai stă pe aragazul aprins.', 2],
    ['👕', 'Rufele ude stau pe sârmă, în vânt.', 3],
    ['🧊', 'Cubul de gheață stă în ceaiul fierbinte.', 0],
    ['🏞️', 'Apa din baltă stă la soare, toată vara.', 3],
  ],
];

// ───────────────────────── how they grow: the stages in order ─────────────────────────

/** Stages drawn as vector shapes (explore-pages.ts stageOps); every other stage is a Twemoji picture. */
export const DRAWN_STAGES = ['leaf-eggs', 'chrysalis', 'frog-eggs', 'tadpole', 'tadpole-legs', 'seed', 'tree-primavara', 'tree-vara', 'tree-toamna', 'tree-iarna'] as const;

export interface Cycle {
  /** What grows or changes, for the answers („găina”). */
  name: string;
  /** The four stages in order: picture (or a drawn stage) and its name. */
  stages: [string, string][];
}

/** Three rows on a page. Every row has one order from its first stage, which the page gives. */
export const CYCLE_SETS: Cycle[][] = [
  [
    { name: 'găina', stages: [['🥚', 'oul'], ['🐣', 'puiul iese din ou'], ['🐥', 'puiul'], ['🐔', 'găina']] },
    { name: 'fluturele', stages: [['leaf-eggs', 'ouăle pe frunză'], ['🐛', 'omida'], ['chrysalis', 'crisalida'], ['🦋', 'fluturele']] },
    { name: 'fasolea', stages: [['🫘', 'bobul'], ['🌱', 'planta răsare'], ['🌿', 'planta crește'], ['🫛', 'păstaia']] },
  ],
  [
    { name: 'broasca', stages: [['frog-eggs', 'ouăle din apă'], ['tadpole', 'mormolocul'], ['tadpole-legs', 'mormolocul cu picioare'], ['🐸', 'broasca']] },
    { name: 'omul', stages: [['👶', 'bebelușul'], ['🧒', 'copilul'], ['🧔', 'adultul'], ['👴', 'bunicul']] },
    { name: 'pasărea', stages: [['🪹', 'cuibul gol'], ['🪺', 'cuibul cu ouă'], ['🐣', 'puiul iese din ou'], ['🐦', 'pasărea']] },
  ],
  [
    { name: 'dovleacul', stages: [['seed', 'sămânța'], ['🌱', 'planta răsare'], ['🌼', 'floarea'], ['🎃', 'dovleacul']] },
    { name: 'ziua', stages: [['🌅', 'dimineața'], ['☀️', 'prânzul'], ['🌇', 'seara'], ['🌙', 'noaptea']] },
    { name: 'copacul', stages: [['tree-primavara', 'primăvara'], ['tree-vara', 'vara'], ['tree-toamna', 'toamna'], ['tree-iarna', 'iarna']] },
  ],
];

// ───────────────────────── animals: covering, food, domestic or wild ─────────────────────────

const two = (title: string, instruction: string, a: string, b: string, rows: ChoiceRow[]): ChoiceSet => ({ title, instruction, choices: [{ label: a, symbol: '' }, { label: b, symbol: '' }], rows });

const COVER_CHOICES: Choice[] = [{ label: 'BLANĂ', symbol: '' }, { label: 'PENE', symbol: '' }, { label: 'SOLZI', symbol: '' }];
const cover = (rows: ChoiceRow[]): ChoiceSet => ({ title: 'Cu ce este acoperit corpul?', instruction: 'Încercuiește cu ce este acoperit corpul fiecărui animal.', choices: COVER_CHOICES, rows });
export const COVER_SETS: ChoiceSet[] = [
  cover([row('🐻', 'ursul', 0), row('🐔', 'găina', 1), row('🐟', 'peștele', 2), row('🐱', 'pisica', 0), row('🦉', 'bufnița', 1), row('🐍', 'șarpele', 2), row('🐇', 'iepurele', 0), row('🦆', 'rața', 1)]),
  cover([row('🐕', 'câinele', 0), row('🦜', 'papagalul', 1), row('🐊', 'crocodilul', 2), row('🦊', 'vulpea', 0), row('🦅', 'vulturul', 1), row('🦎', 'șopârla', 2), row('🐿️', 'veverița', 0), row('🐓', 'cocoșul', 1)]),
  cover([row('🦁', 'leul', 0), row('🦢', 'lebăda', 1), row('🐠', 'peștele', 2), row('🐒', 'maimuța', 0), row('🐧', 'pinguinul', 1), row('🐍', 'șarpele', 2), row('🐼', 'ursul panda', 0), row('🦚', 'păunul', 1)]),
];

/** Animal, its name, its food, the name of the food. */
export const EAT_SETS: [string, string, string, string][][] = [
  [['🐇', 'iepurele', '🥕', 'morcovul'], ['🐻', 'ursul', '🍯', 'mierea'], ['🐕', 'câinele', '🦴', 'osul'], ['🐭', 'șoarecele', '🧀', 'cașcavalul'], ['🐒', 'maimuța', '🍌', 'banana'], ['🐔', 'găina', '🌽', 'porumbul']],
  [['🐸', 'broasca', '🪰', 'musca'], ['🦉', 'bufnița', '🐁', 'șoarecele'], ['🐄', 'vaca', '🌿', 'iarba'], ['🐝', 'albina', '🌼', 'floarea'], ['🐧', 'pinguinul', '🐟', 'peștele'], ['🐼', 'ursul panda', '🎍', 'bambusul']],
  [['🦁', 'leul', '🥩', 'carnea'], ['🐦', 'vrabia', '🪱', 'râma'], ['🦭', 'foca', '🐟', 'peștele'], ['🦋', 'fluturele', '🌷', 'floarea'], ['🦒', 'girafa', '🍃', 'frunzele'], ['🐿️', 'veverița', '🥜', 'alunele']],
];

const tame = (rows: ChoiceRow[]): ChoiceSet => two('Domestic sau sălbatic?', 'Încercuiește cum este fiecare animal: domestic sau sălbatic.', 'DOMESTIC', 'SĂLBATIC', rows);
export const TAME_SETS: ChoiceSet[] = [
  tame([row('🐄', 'vaca', 0), row('🐻', 'ursul', 1), row('🐔', 'găina', 0), row('🐺', 'lupul', 1), row('🐑', 'oaia', 0), row('🦊', 'vulpea', 1), row('🐎', 'calul', 0), row('🐿️', 'veverița', 1)]),
  tame([row('🐖', 'porcul', 0), row('🦁', 'leul', 1), row('🐈', 'pisica', 0), row('🐘', 'elefantul', 1), row('🐐', 'capra', 0), row('🦒', 'girafa', 1), row('🐕', 'câinele', 0), row('🦌', 'cerbul', 1)]),
  tame([row('🦃', 'curcanul', 0), row('🐯', 'tigrul', 1), row('🐓', 'cocoșul', 0), row('🦓', 'zebra', 1), row('🐏', 'berbecul', 0), row('🐊', 'crocodilul', 1), row('🐂', 'boul', 0), row('🦔', 'ariciul', 1)]),
];

// ───────────────────────── living or not; what a plant needs ─────────────────────────

/** alive:1 — the grid: the child is among the living things. */
export const ALIVE_GRID: CircleSet = {
  title: 'Ce este viu?', instruction: 'Încercuiește tot ce este viu.', help: 'Și tu ești o ființă vie: crești, respiri și te hrănești. Prima imagine încercuită este exemplul.',
  pictures: [
    ['🧒', 'copilul', true], ['🐕', 'câinele', true], ['🌳', 'copacul', true], ['🐟', 'peștele', true], ['🦋', 'fluturele', true], ['🌷', 'laleaua', true],
    ['🪨', 'piatra', false], ['🚗', 'mașina', false], ['⚽', 'mingea', false], ['🪑', 'scaunul', false], ['📕', 'cartea', false], ['🧸', 'ursulețul de pluș', false],
  ],
};
export const ALIVE_SETS: ChoiceSet[] = [
  two('Viu sau neviu?', 'Încercuiește: este viu sau nu este viu?', 'VIU', 'NU ESTE VIU', [row('👧', 'fetița', 0), row('🤖', 'robotul', 1), row('🐱', 'pisica', 0), row('☁️', 'norul', 1), row('🌻', 'floarea-soarelui', 0), row('🚲', 'bicicleta', 1), row('🐌', 'melcul', 0), row('🌙', 'luna', 1)]),
  two('Ce îi trebuie plantei?', 'Încercuiește: are planta nevoie de asta ca să crească?', 'ARE NEVOIE', 'NU ARE NEVOIE', [row('💧', 'apa', 0), row('🍫', 'ciocolata', 1), row('☀️', 'lumina soarelui', 0), row('📺', 'televizorul', 1), row('🌬️', 'aerul', 0), row('🧸', 'ursulețul de pluș', 1), row('🪴', 'pământul din ghiveci', 0), row('📱', 'telefonul', 1)]),
];

// ───────────────────────── healthy food, teeth ─────────────────────────

export const FOOD_SETS: ChoiceSet[] = [
  two('Mănânc sănătos', 'Încercuiește cât de des este bine să mănânci sau să bei ce este în imagine.', 'ÎN FIECARE ZI', 'RAR', [row('🍎', 'mărul', 0), row('🍭', 'acadeaua', 1), row('🥕', 'morcovul', 0), row('🍟', 'cartofii prăjiți', 1), row('🥦', 'broccoli', 0), row('🍩', 'gogoașa', 1), row('🥛', 'laptele', 0), row('🥤', 'sucul acidulat', 1)]),
  two('Dinți sănătoși', 'Încercuiește: este bun pentru dinți sau îi strică?', 'BUN PENTRU DINȚI', 'STRICĂ DINȚII', [row('🪥', 'periuța de dinți', 0), row('🍭', 'acadeaua', 1), row('🍎', 'mărul', 0), row('🍬', 'bomboana', 1), row('🥛', 'laptele', 0), row('🥤', 'sucul acidulat', 1), row('🧀', 'cașcavalul', 0), row('🍫', 'ciocolata', 1)]),
  {
    title: 'Grupele de alimente', instruction: 'Încercuiește grupa din care face parte fiecare aliment.',
    choices: [{ label: 'FRUCTE, LEGUME', symbol: '' }, { label: 'LACTATE', symbol: '' }, { label: 'CARNE, PEȘTE', symbol: '' }, { label: 'CEREALE', symbol: '' }],
    rows: [row('🍎', 'mărul', 0), row('🧀', 'cașcavalul', 1), row('🍗', 'pulpa de pui', 2), row('🍞', 'pâinea', 3), row('🥕', 'morcovul', 0), row('🥛', 'laptele', 1), row('🐟', 'peștele', 2), row('🍚', 'orezul', 3)],
  },
];

// ───────────────────────── materials, recycling ─────────────────────────

const MAT_CHOICES: Choice[] = [{ label: 'LEMN', symbol: '' }, { label: 'METAL', symbol: '' }, { label: 'PLASTIC', symbol: '' }, { label: 'STICLĂ', symbol: '' }];
const mat = (rows: ChoiceRow[]): ChoiceSet => ({ title: 'Din ce este făcut?', instruction: 'Încercuiește materialul din care este făcut fiecare obiect.', choices: MAT_CHOICES, rows });
export const MAT_SETS: ChoiceSet[] = [
  mat([row('🪑', 'scaunul', 0), row('🔑', 'cheia', 1), row('🪥', 'periuța de dinți', 2), row('🫙', 'borcanul', 3), row('✏️', 'creionul', 0), row('🥄', 'lingura', 1), row('🪮', 'pieptenele', 2), row('💡', 'becul', 3)]),
  mat([row('🚪', 'ușa', 0), row('🪙', 'moneda', 1), row('🧴', 'flaconul', 2), row('🥛', 'paharul', 3), row('🪵', 'bușteanul', 0), row('📎', 'agrafa', 1), row('🥏', 'discul zburător', 2), row('🧪', 'eprubeta', 3)]),
  mat([row('🎻', 'vioara', 0), row('🔔', 'clopotul', 1), row('🪀', 'jucăria yo-yo', 2), row('🍾', 'sticla', 3), row('🛷', 'sania', 0), row('🥫', 'conserva', 1), row('🎲', 'zarul', 2), row('🔮', 'globul de sticlă', 3)]),
];

/** recycle:1 three containers, recycle:2 with the compost; recycle:3: sentences, right or not (RECYCLE_SAY). */
export const RECYCLE_SETS: ChoiceSet[] = [
  {
    title: 'Reciclăm', instruction: 'Încercuiește unde aruncăm fiecare lucru, ca să fie reciclat.',
    choices: [{ label: 'PLASTIC, METAL', symbol: '' }, { label: 'HÂRTIE, CARTON', symbol: '' }, { label: 'STICLĂ', symbol: '' }],
    rows: [row('🪣', 'găleata de plastic', 0), row('📰', 'ziarul', 1), row('🍾', 'sticla', 2), row('🥫', 'conserva', 0), row('📦', 'cutia de carton', 1), row('🫙', 'borcanul', 2), row('🧴', 'flaconul', 0), row('📄', 'foaia de hârtie', 1)],
  },
  {
    title: 'Reciclăm', instruction: 'Încercuiește unde aruncăm fiecare lucru. La compost merg resturile de plante.',
    choices: [{ label: 'PLASTIC, METAL', symbol: '' }, { label: 'HÂRTIE, CARTON', symbol: '' }, { label: 'STICLĂ', symbol: '' }, { label: 'COMPOST', symbol: '' }],
    rows: [row('🧴', 'flaconul', 0), row('✉️', 'plicul', 1), row('🍾', 'sticla', 2), row('🍂', 'frunzele uscate', 3), row('🥫', 'conserva', 0), row('📦', 'cutia de carton', 1), row('🫙', 'borcanul', 2), row('🥬', 'frunzele de salată', 3)],
  },
];
export const RECYCLE_SAY: SentenceSet = {
  title: 'Avem grijă de natură', instruction: 'Citește și încercuiește: e bine sau nu e bine?',
  choices: [{ label: 'E BINE', symbol: '' }, { label: 'NU E BINE', symbol: '' }],
  rows: [
    say('🚮', 'Arunc ambalajul la coș.', 0), say('🚿', 'Las apa să curgă cât mă spăl pe dinți.', 1), say('💡', 'Sting lumina când ies din cameră.', 0), say('🌳', 'Rup crengile copacilor.', 1),
    say('♻️', 'Duc sticlele goale la reciclare.', 0), say('🌲', 'Las gunoaie în pădure.', 1), say('🌷', 'Ud florile din grădină.', 0), say('🪺', 'Iau ouăle din cuibul păsărilor.', 1),
  ],
};

// ───────────────────────── day and night, the Earth, the Sun, the Moon ─────────────────────────

/** day:1 — when you see or use it. */
export const DAY_SET: ChoiceSet = two('Ziua sau noaptea?', 'Încercuiește când vezi sau folosești ce este în imagine.', 'ZIUA', 'NOAPTEA', [
  row('☀️', 'soarele', 0), row('🌙', 'luna', 1), row('🌈', 'curcubeul', 0), row('🦉', 'bufnița', 1), row('🕶️', 'ochelarii de soare', 0), row('⭐', 'steaua', 1), row('⛱️', 'umbrela de plajă', 0), row('🦇', 'liliacul', 1),
]);
/** day:2 the parts of the day; day:3 true or false about day and night (the contents of clasa a II-a: „Ciclul zi-noapte”). */
export const DAY_SAY: SentenceSet[] = [
  {
    title: 'Părțile zilei', instruction: 'Citește și încercuiește partea zilei.',
    choices: [{ label: 'DIMINEAȚA', symbol: '' }, { label: 'LA PRÂNZ', symbol: '' }, { label: 'SEARA', symbol: '' }, { label: 'NOAPTEA', symbol: '' }],
    rows: [say('🌅', 'Soarele răsare.', 0), say('☀️', 'Soarele este sus pe cer.', 1), say('🌇', 'Soarele apune.', 2), say('🌙', 'Pe cer se văd luna și stelele.', 3), say('🥣', 'Mănânc micul dejun.', 0), say('🛏️', 'Toată lumea doarme adânc.', 3)],
  },
  {
    title: 'Ziua și noaptea: adevărat sau fals?', instruction: 'Citește și încercuiește DA, dacă este adevărat, sau NU, dacă este fals.',
    choices: [{ label: 'DA', symbol: '' }, { label: 'NU', symbol: '' }],
    rows: [
      say('🌍', 'Pământul se învârte în jurul axei sale.', 0), say('☀️', 'Noaptea, Soarele se stinge.', 1), say('🌍', 'Când la noi este zi, în altă parte a Pământului este noapte.', 0),
      say('🕒', 'O zi și o noapte durează împreună 24 de ore.', 0), say('🌙', 'Luna luminează mai puternic decât Soarele.', 1), say('🌅', 'Soarele răsare seara și apune dimineața.', 1),
    ],
  },
];

/** space:1 — a sentence about the Sun, the Earth or the Moon, and the word that describes it (two to choose from). */
export const SPACE_DESCRIBE: SentenceSet = {
  title: 'Cum sunt Pământul, Soarele și Luna?', instruction: 'Ascultă propoziția și încercuiește cuvântul potrivit.',
  help: 'Un adult citește propozițiile. Copilul spune apoi toată propoziția. Primul rând este exemplul.',
  choices: [],
  rows: [
    say('☀️', 'Soarele este …', 0, ['FIERBINTE', 'RECE']), say('🌍', 'Pământul are forma unei …', 0, ['MINGI', 'CUTII']), say('🌙', 'Luna se vede cel mai bine …', 1, ['ZIUA', 'NOAPTEA']),
    say('⭐', 'Stelele sunt foarte …', 1, ['APROAPE', 'DEPARTE']), say('🌍', 'Noi trăim pe …', 0, ['PĂMÂNT', 'LUNĂ']), say('☀️', 'Soarele ne dă lumină și …', 0, ['CĂLDURĂ', 'FRIG']),
    say('🌙', 'Luna este mai … decât Pământul.', 1, ['MARE', 'MICĂ']),
  ],
};
/** space:2 — picture and name. */
export const SPACE_NAMES: [string, string][] = [['☀️', 'SOARELE'], ['🌍', 'PĂMÂNTUL'], ['🌙', 'LUNA'], ['⭐', 'STEAUA'], ['🪐', 'PLANETA'], ['🚀', 'RACHETA']];
/** space:3 (clasa I: „Soarele, sursă de căldură și lumină”) — whom the sentence is about; the pictures do not tell. */
export const SPACE_WHO: SentenceSet = {
  title: 'Soarele, Pământul sau Luna?', instruction: 'Citește și încercuiește despre cine este vorba.',
  choices: [{ label: 'SOARELE', symbol: '' }, { label: 'PĂMÂNTUL', symbol: '' }, { label: 'LUNA', symbol: '' }],
  rows: [
    say('🔥', 'Este o stea fierbinte.', 0), say('🏠', 'Este planeta pe care trăim.', 1), say('🦉', 'Se vede pe cer mai ales noaptea.', 2), say('🌻', 'Ne dă lumină și căldură.', 0),
    say('🌊', 'Are mări, oceane și uscat.', 1), say('🚀', 'Acolo au ajuns astronauții cu racheta.', 2), say('🪐', 'Planetele se învârt în jurul său.', 0),
  ],
};

// ───────────────────────── observation sheets (nothing to check) ─────────────────────────

export const WEEK_DAYS = ['LUNI', 'MARȚI', 'MIERCURI', 'JOI', 'VINERI'] as const;
/** What the child draws of the plant, on four days. */
export const PLANT_LOG = ['Ziua 1: am pus sămânța', 'Ziua 4', 'Ziua 7', 'Ziua 10'] as const;
