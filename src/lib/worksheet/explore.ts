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
 */

export type ExploreKind = 'plant' | 'body' | 'senses' | 'home' | 'habitat' | 'move' | 'baby' | 'season' | 'weather' | 'wear' | 'water' | 'melt';
export const EXPLORE_KINDS: ExploreKind[] = ['plant', 'body', 'senses', 'home', 'habitat', 'move', 'baby', 'season', 'weather', 'wear', 'water', 'melt'];
/** How many sets each kind has. */
export const EXPLORE_SETS: Record<ExploreKind, number> = { plant: 1, body: 1, senses: 1, home: 2, habitat: 1, move: 1, baby: 2, season: 5, weather: 1, wear: 1, water: 1, melt: 1 };

const EXPLORE_ITEM = /^((plant|body|senses|habitat|move|weather|wear|water|melt):1|(home|baby):[12]|season:[1-5])$/;

export function isExploreItem(item: string): boolean {
  return EXPLORE_ITEM.test(item);
}

// ───────────────────────── labelling: plant, body ─────────────────────────

/** The parts as they are written in the boxes and the word bank. */
export const PLANT_PARTS = ['RĂDĂCINĂ', 'TULPINĂ', 'FRUNZĂ', 'FLOARE', 'FRUCT'] as const;
export const BODY_PARTS = ['CAP', 'GÂT', 'TRUNCHI', 'MÂINI', 'PICIOARE'] as const;

// ───────────────────────── the senses ─────────────────────────

/** Sense organ, its name, the sense. */
export const SENSES: [string, string, string][] = [
  ['👁️', 'ochiul', 'VĂZ'],
  ['👂', 'urechea', 'AUZ'],
  ['👃', 'nasul', 'MIROS'],
  ['👅', 'limba', 'GUST'],
  ['✋', 'mâna (pielea)', 'PIPĂIT'],
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
];

/** Clasa a II-a, „Medii de viață”: a table with one X per row. */
export const HABITAT_SET: ChoiceSet = {
  title: 'Mediile de viață',
  instruction: 'Pune un X în coloana mediului de viață al fiecărui animal.',
  choices: [{ label: 'PĂDUREA', symbol: '🌲' }, { label: 'DEȘERTUL', symbol: '🏜️' }, { label: 'POLUL NORD', symbol: '🧊' }, { label: 'POLUL SUD', symbol: '🧊' }, { label: 'MAREA NEAGRĂ', symbol: '🌊' }],
  rows: [row('🐻', 'ursul brun', 0), row('🐫', 'cămila', 1), row('🐻‍❄️', 'ursul polar', 2), row('🐧', 'pinguinul', 3), row('🐬', 'delfinul', 4), row('🐿️', 'veverița', 0), row('🦀', 'crabul', 4), row('🦔', 'ariciul', 0)],
};

export const MOVE_SET: ChoiceSet = {
  title: 'Cum se deplasează?',
  instruction: 'Încercuiește cum se deplasează fiecare animal.',
  choices: [{ label: 'ZBOARĂ', symbol: '🪽' }, { label: 'ÎNOATĂ', symbol: '🌊' }, { label: 'MERGE', symbol: '👣' }, { label: 'SE TÂRĂȘTE', symbol: '' }],
  rows: [row('🦅', 'vulturul', 0), row('🐟', 'peștele', 1), row('🦒', 'girafa', 2), row('🐍', 'șarpele', 3), row('🐝', 'albina', 0), row('🐬', 'delfinul', 1), row('🐎', 'calul', 2), row('🐌', 'melcul', 3)],
};

// ───────────────────────── young animals ─────────────────────────

/** Animal, its name, its young (as printed). */
export const BABY_SETS: [string, string, string][][] = [
  [['🐄', 'vaca', 'VIȚEL'], ['🐑', 'oaia', 'MIEL'], ['🐔', 'găina', 'PUI'], ['🐎', 'calul', 'MÂNZ'], ['🐐', 'capra', 'IED'], ['🐖', 'porcul', 'PURCEL']],
  [['🐕', 'câinele', 'CĂȚEL'], ['🐈', 'pisica', 'PISOI'], ['🦆', 'rața', 'RĂȚUȘCĂ'], ['🐇', 'iepurele', 'IEPURAȘ'], ['🐄', 'vaca', 'VIȚEL'], ['🐑', 'oaia', 'MIEL']],
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

// ───────────────────────── water ─────────────────────────

export const WATER_STATES = ['SOLIDĂ', 'LICHIDĂ'] as const;
/** Picture, name, 0 = solidă, 1 = lichidă. */
export const WATER_ROWS: [string, string, 0 | 1][] = [
  ['🧊', 'gheața', 0], ['💧', 'picătura de apă', 1], ['⛄', 'omul de zăpadă', 0], ['🌊', 'valul mării', 1], ['❄️', 'fulgul de nea', 0], ['🌧️', 'ploaia', 1], ['🚿', 'apa de la duș', 1],
];

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
