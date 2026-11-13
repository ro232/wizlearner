/**
 * Weekly themes used in Romanian kindergartens and the preparatory class. Each theme is a
 * handful of short, concrete words a child can recognise from the picture, in capitals
 * (how they are first taught) — the sheet builder writes them in the chosen case.
 *
 * Pictures come from the hint icon set: after adding a word here, run `npm run build:icons`.
 */
export interface ThemeWord {
  word: string;
  emoji: string;
  /** A proper name: it keeps its capitals when the sheet is written with small letters ("România"). */
  proper?: boolean;
}

export interface Theme {
  id: string;
  title: string;
  /** When in the school year it usually comes up (shown as a hint, not a rule). */
  when: string;
  icon: string;
  words: ThemeWord[];
}

export const THEMES: Theme[] = [
  {
    id: 'toamna', title: 'Toamna', when: 'septembrie–noiembrie', icon: '🍂',
    words: [
      { word: 'MĂR', emoji: '🍎' }, { word: 'PARĂ', emoji: '🍐' }, { word: 'CASTANĂ', emoji: '🌰' },
      { word: 'FRUNZĂ', emoji: '🍂' }, { word: 'DOVLEAC', emoji: '🎃' }, { word: 'STRUGURI', emoji: '🍇' },
    ],
  },
  {
    id: 'animale-domestice', title: 'Animale domestice', when: 'oricând', icon: '🐄',
    words: [
      { word: 'VACĂ', emoji: '🐄' }, { word: 'OAIE', emoji: '🐑' }, { word: 'CAL', emoji: '🐴' },
      { word: 'PORC', emoji: '🐷' }, { word: 'CÂINE', emoji: '🐶' }, { word: 'PISICĂ', emoji: '🐱' },
    ],
  },
  {
    id: 'animale-salbatice', title: 'Animale sălbatice', when: 'oricând', icon: '🦊',
    words: [
      { word: 'URS', emoji: '🐻' }, { word: 'LUP', emoji: '🐺' }, { word: 'VULPE', emoji: '🦊' },
      { word: 'IEPURE', emoji: '🐰' }, { word: 'LEU', emoji: '🦁' }, { word: 'ZEBRĂ', emoji: '🦓' },
    ],
  },
  {
    id: '1-decembrie', title: '1 Decembrie', when: 'săptămâna de 1 decembrie', icon: '🇷🇴',
    words: [
      { word: 'ROMÂNIA', emoji: '🇷🇴', proper: true }, { word: 'HARTĂ', emoji: '🗺️' }, { word: 'CETATE', emoji: '🏰' },
      { word: 'UNIRE', emoji: '🤝' }, { word: 'MUNTE', emoji: '⛰️' }, { word: 'INIMĂ', emoji: '❤️' },
    ],
  },
  {
    id: 'mos-nicolae', title: 'Moș Nicolae', when: 'săptămâna de 6 decembrie', icon: '🥾',
    words: [
      { word: 'MOȘ NICOLAE', emoji: '🎅', proper: true }, { word: 'GHETE', emoji: '🥾' }, { word: 'CADOU', emoji: '🎁' },
      { word: 'BOMBOANE', emoji: '🍬' }, { word: 'PORTOCALĂ', emoji: '🍊' }, { word: 'CIOCOLATĂ', emoji: '🍫' },
    ],
  },
  {
    id: 'craciun', title: 'Crăciun', when: 'decembrie', icon: '🎄',
    words: [
      { word: 'BRAD', emoji: '🎄' }, { word: 'MOȘ CRĂCIUN', emoji: '🎅', proper: true }, { word: 'CADOU', emoji: '🎁' },
      { word: 'STEA', emoji: '⭐' }, { word: 'REN', emoji: '🦌' }, { word: 'CLOPOȚEL', emoji: '🔔' },
    ],
  },
  {
    id: 'iarna', title: 'Iarna', when: 'decembrie–februarie', icon: '⛄',
    words: [
      { word: 'OM DE ZĂPADĂ', emoji: '⛄' }, { word: 'SANIE', emoji: '🛷' }, { word: 'FULG', emoji: '❄️' },
      { word: 'MĂNUȘI', emoji: '🧤' }, { word: 'FULAR', emoji: '🧣' }, { word: 'PATINE', emoji: '⛸️' },
    ],
  },
  {
    id: 'primavara', title: 'Primăvara', when: 'martie–mai', icon: '🌷',
    words: [
      { word: 'FLOARE', emoji: '🌷' }, { word: 'SOARE', emoji: '☀️' }, { word: 'FLUTURE', emoji: '🦋' },
      { word: 'ALBINĂ', emoji: '🐝' }, { word: 'OU', emoji: '🥚' }, { word: 'PLOAIE', emoji: '🌧️' },
    ],
  },
  {
    id: 'familia', title: 'Familia mea', when: 'oricând', icon: '🏠',
    words: [
      { word: 'MAMA', emoji: '👩' }, { word: 'TATA', emoji: '👨' }, { word: 'BUNICA', emoji: '👵' },
      { word: 'BUNICUL', emoji: '👴' }, { word: 'FRATE', emoji: '👦' }, { word: 'SORĂ', emoji: '👧' },
    ],
  },
  {
    id: 'mijloace-de-transport', title: 'Mijloace de transport', when: 'oricând', icon: '🚂',
    words: [
      { word: 'TREN', emoji: '🚂' }, { word: 'AVION', emoji: '✈️' }, { word: 'MAȘINĂ', emoji: '🚗' },
      { word: 'BARCĂ', emoji: '⛵' }, { word: 'AUTOBUZ', emoji: '🚌' }, { word: 'BICICLETĂ', emoji: '🚲' },
    ],
  },
  {
    id: 'fructe-legume', title: 'Fructe și legume', when: 'oricând', icon: '🥕',
    words: [
      { word: 'MORCOV', emoji: '🥕' }, { word: 'ROȘIE', emoji: '🍅' }, { word: 'BANANĂ', emoji: '🍌' },
      { word: 'CAPȘUNĂ', emoji: '🍓' }, { word: 'CARTOF', emoji: '🥔' }, { word: 'LĂMÂIE', emoji: '🍋' },
    ],
  },
];

export function themeById(id: string | undefined): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}

const PROPER = new Set(THEMES.flatMap((t) => t.words.filter((w) => w.proper).map((w) => w.word.toUpperCase())));

/** True for the theme words that are proper names (written with capitals even among small letters). */
export function isProperNoun(word: string): boolean {
  return PROPER.has(word.normalize('NFC').trim().toUpperCase());
}
