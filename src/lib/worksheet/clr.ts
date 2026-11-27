/**
 * Data of the „Comunicare” sheets that fill the gaps of the programme (see clr-pages.ts):
 *
 * - "story:1–12"  Povestea în imagini — four pictures to put in order and the title to circle
 *                 (CLR CP 3.2: „Identificarea semnificației unei/ unor imagini care prezintă întâmplări,
 *                 fenomene, evenimente familiare”);
 * - "sign:1–9"    Semne și simboluri — set 1 the symbols of immediate need (clasa pregătitoare: „Simboluri
 *                 uzuale din universul apropiat: metrou, intrare, ieșire, spital, trecere de pietoni etc.”),
 *                 set 2 familiar symbols with a simple message (clasa I), set 3 symbols in a known context,
 *                 with the question what to do (clasa a II-a); then two more sets for each class (SIGN_SET_LEVELS):
 *                 the street and public places (CP), rules and recycling (I), weather warnings and the
 *                 pictograms on packages (II);
 * - "note:1–10"   Felicitarea, biletul, invitația … — a message to complete in capitals (CP 4.2, contents
 *                 „Felicitarea”, „Biletul”, „Scrierea funcțională folosind desene, simboluri”);
 * - "msg:1–9"     Citește mesajul — an invitation, a poster, a note, a card, a list … with questions (II 3.1,
 *                 contents „Biletul de mulțumire, de informare, de solicitare”, „Felicitarea”, „Afișul”);
 * - "written:1–2" Unde este ceva scris? — cards with and without writing (preschool D.3.3);
 * - "listen:1–18" Ascultă și răspunde — a short original text the teacher reads aloud (its own page, drawn after
 *                 the pupils' pages) and the pupil's page: pictures to circle in clasa pregătitoare (sets 1–6),
 *                 answers a / b / c in clasa I (7–12) and clasa a II-a (13–18); CLR 1.1 and 1.2 of each class;
 * - "book:1–6"    Fișa cărții (1–3: CP, I, II) and Jurnalul de lectură (4–6): the title, the favourite character
 *                 drawn, stars to colour, a sentence in clasa a II-a (CLR 3.4).
 *
 * Every story has one order (the pictures grow or change one way only: a seed into a flower, snow into a
 * snowman that melts, an egg into a rooster, sun, clouds, rain, rainbow); every sign one meaning; every
 * question one right answer among three. Pictures are Twemoji, quoted here so that
 * scripts/build-hint-icons.mjs draws them into icons.json; the road signs and a few pictograms that have
 * no faithful emoji (STOP with its word, the pedestrian crossing, H, M, exit, pharmacy, electric danger,
 * first aid, „fragil”, „cu partea aceasta în sus”, „nu este pentru copiii sub 3 ani”) are drawn as vector
 * shapes in clr-pages.ts; a few more are a frame drawn around a picture (COMPOSED_SIGNS: the red ring and
 * bar of a ban, the yellow triangle of a warning, a recycling bin).
 */

export type ClrKind = 'story' | 'sign' | 'note' | 'msg' | 'written' | 'listen' | 'book';
export const CLR_KINDS: ClrKind[] = ['story', 'sign', 'note', 'msg', 'written', 'listen', 'book'];
export const CLR_SETS: Record<ClrKind, number> = { story: 12, sign: 9, note: 10, msg: 9, written: 2, listen: 18, book: 6 };
export type ClrLevel = 'CP' | 'I' | 'II';

const CLR_ITEM = /^(story|sign|note|msg|written|listen|book):([1-9]\d?)$/;

export function isClrItem(item: string): boolean {
  const m = CLR_ITEM.exec(item);
  return !!m && Number(m[2]) <= CLR_SETS[m[1] as ClrKind];
}

/** The class each set of „Semne și simboluri” is written for. */
export const SIGN_SET_LEVELS: ClrLevel[] = ['CP', 'I', 'II', 'CP', 'CP', 'I', 'I', 'II', 'II'];
/** The class each set of „Ascultă și răspunde” is written for: six sets for each class. */
export const LISTEN_LEVELS: ClrLevel[] = [...Array<ClrLevel>(6).fill('CP'), ...Array<ClrLevel>(6).fill('I'), ...Array<ClrLevel>(6).fill('II')];
/** „Fișa cărții” (sets 1–3) and „Jurnalul de lectură” (sets 4–6), one of each for each class. */
export const BOOK_LEVELS: ClrLevel[] = ['CP', 'I', 'II', 'CP', 'I', 'II'];

/** The class a set is written for, for the kinds that have sets for several classes (null for the others). */
export function clrSetLevel(item: string): ClrLevel | null {
  if (!isClrItem(item)) return null;
  const [kind, n] = item.split(':');
  const levels = kind === 'sign' ? SIGN_SET_LEVELS : kind === 'listen' ? LISTEN_LEVELS : kind === 'book' ? BOOK_LEVELS : null;
  return levels ? levels[Number(n) - 1] : null;
}

/**
 * The free plan: set 1 of each kind; of the kinds with sets for several classes, the first set of each class
 * („Semne și simboluri” 1–3, „Ascultă și răspunde” 1, 7, 13, „Fișa cărții” 1–3).
 */
export function isFreeClrItem(item: string): boolean {
  if (!isClrItem(item)) return false;
  const [kind, n] = item.split(':');
  const levels = kind === 'sign' ? SIGN_SET_LEVELS : kind === 'listen' ? LISTEN_LEVELS : kind === 'book' ? BOOK_LEVELS : null;
  return levels ? levels.indexOf(levels[Number(n) - 1]) === Number(n) - 1 : n === '1';
}

// ───────────────────────── Povestea în imagini ─────────────────────────

/** A picture in a panel of 100 × 70 units: its centre and its size. */
export interface PanelPic { e: string; x: number; y: number; s: number }
/**
 * Things drawn in a panel: a snowball, a puddle, falling snow; a table (its top at y, `s` wide), a leaf with eggs,
 * a twig with a chrysalis hanging from it, a tree as it looks in a season (its foot at x, y; `s` tall).
 */
export interface PanelExtra { kind: 'snowball' | 'puddle' | 'flakes' | 'table' | 'eggs' | 'chrysalis' | 'tree'; x: number; y: number; s: number; season?: 'primavara' | 'vara' | 'toamna' | 'iarna' }
export interface Panel {
  pics: PanelPic[];
  /** `floor`: indoors. */
  ground: 'grass' | 'snow' | 'soil' | 'floor';
  extras?: PanelExtra[];
  /** What happens, for the answers and the adult („Fetița pune o sămânță în pământ.”). */
  caption: string;
}
export interface Story {
  /** The right title first; the page shuffles them. */
  titles: [string, string, string];
  /** The panels in the order of the story. */
  panels: Panel[];
}

const pic = (e: string, x: number, y: number, s: number): PanelPic => ({ e, x, y, s });

export const STORIES: Story[] = [
  {
    titles: ['Floarea fetiței', 'Iarna în parc', 'Pisica și mingea'],
    panels: [
      { pics: [pic('👧', 24, 36, 32), pic('🫘', 64, 60, 10), pic('☀️', 86, 13, 14)], ground: 'soil', caption: 'Fetița pune o sămânță în pământ.' },
      { pics: [pic('👧', 24, 36, 32), pic('🌱', 64, 46, 20), pic('💧', 56, 18, 8), pic('💧', 70, 13, 8)], ground: 'soil', caption: 'Fetița udă pământul și răsare o plantă mică.' },
      { pics: [pic('👧', 24, 36, 32), pic('🌿', 64, 38, 34), pic('☀️', 86, 13, 14)], ground: 'soil', caption: 'Planta crește.' },
      { pics: [pic('👧', 24, 36, 32), pic('🌻', 64, 33, 44)], ground: 'soil', caption: 'Planta a făcut o floare mare.' },
    ],
  },
  {
    titles: ['Omul de zăpadă', 'O zi la mare', 'Ziua mea de naștere'],
    panels: [
      { pics: [pic('🌨️', 30, 16, 24), pic('🌨️', 72, 14, 24)], ground: 'snow', extras: [{ kind: 'flakes', x: 50, y: 40, s: 1 }], caption: 'Ninge și zăpada acoperă curtea.' },
      { pics: [pic('👦', 26, 38, 32)], ground: 'snow', extras: [{ kind: 'snowball', x: 64, y: 50, s: 11 }], caption: 'Băiatul face un bulgăre mare de zăpadă.' },
      { pics: [pic('👦', 22, 38, 32), pic('⛄', 64, 34, 42)], ground: 'snow', caption: 'Omul de zăpadă este gata.' },
      { pics: [pic('☀️', 84, 14, 18), pic('🥕', 52, 56, 12)], ground: 'snow', extras: [{ kind: 'puddle', x: 52, y: 61, s: 24 }], caption: 'A ieșit soarele și omul de zăpadă s-a topit.' },
    ],
  },
  {
    titles: ['Din ou iese un pui', 'Ploaia de vară', 'La cumpărături'],
    panels: [
      { pics: [pic('🪺', 50, 46, 40)], ground: 'grass', caption: 'În cuib sunt ouă.' },
      { pics: [pic('🐣', 50, 44, 36)], ground: 'grass', caption: 'Din ou iese un pui.' },
      { pics: [pic('🐥', 50, 44, 30)], ground: 'grass', caption: 'Puiul se plimbă prin iarbă.' },
      { pics: [pic('🐓', 50, 38, 44)], ground: 'grass', caption: 'Puiul a crescut și s-a făcut cocoș.' },
    ],
  },
  {
    titles: ['Ploaia de vară', 'La săniuș', 'Puiul de găină'],
    panels: [
      { pics: [pic('☀️', 84, 14, 18), pic('👧', 30, 38, 32), pic('⚽', 64, 56, 12)], ground: 'grass', caption: 'Fetița se joacă afară, la soare.' },
      { pics: [pic('☁️', 40, 14, 24), pic('☁️', 72, 16, 22), pic('👧', 30, 38, 32), pic('⚽', 64, 56, 12)], ground: 'grass', caption: 'Pe cer vin norii.' },
      { pics: [pic('🌧️', 66, 15, 26), pic('☂️', 34, 20, 26), pic('👧', 34, 44, 26)], ground: 'grass', caption: 'Plouă și fetița stă sub umbrelă.' },
      { pics: [pic('🌈', 60, 22, 40), pic('👧', 24, 40, 28)], ground: 'grass', extras: [{ kind: 'puddle', x: 66, y: 61, s: 20 }], caption: 'Ploaia s-a oprit și pe cer a apărut curcubeul.' },
    ],
  },
  // ── the stories added later (5–12): each one grows or changes one way only
  {
    titles: ['Fluturele', 'Albina și floarea', 'Melcul grăbit'],
    panels: [
      { pics: [], ground: 'grass', extras: [{ kind: 'eggs', x: 50, y: 34, s: 46 }], caption: 'Pe o frunză sunt câteva ouă mici.' },
      { pics: [pic('🍃', 36, 40, 36), pic('🐛', 62, 40, 30)], ground: 'grass', caption: 'Din ou iese o omidă, care mănâncă frunze.' },
      { pics: [], ground: 'grass', extras: [{ kind: 'chrysalis', x: 50, y: 12, s: 60 }], caption: 'Omida se prinde de o crenguță și se face crisalidă.' },
      { pics: [pic('🦋', 56, 26, 36), pic('🌷', 26, 44, 24)], ground: 'grass', caption: 'Din crisalidă iese un fluture.' },
    ],
  },
  {
    titles: ['Mărul din livadă', 'Bradul de iarnă', 'La pescuit'],
    panels: [
      { pics: [pic('🌳', 50, 32, 52), pic('🌸', 40, 22, 9), pic('🌸', 58, 18, 9), pic('🌸', 52, 32, 9), pic('🌸', 62, 30, 9)], ground: 'grass', caption: 'Primăvara, mărul înflorește.' },
      { pics: [pic('🌳', 50, 32, 52), pic('🍏', 40, 23, 6), pic('🍏', 58, 19, 6), pic('🍏', 52, 33, 6), pic('🍏', 62, 30, 6)], ground: 'grass', caption: 'Din flori cresc mere mici și verzi.' },
      { pics: [pic('🌳', 50, 32, 52), pic('🍎', 40, 23, 11), pic('🍎', 58, 19, 11), pic('🍎', 51, 34, 11), pic('🍎', 63, 31, 11)], ground: 'grass', caption: 'Merele cresc mari și se coc.' },
      { pics: [pic('🌳', 76, 31, 44), pic('👧', 32, 40, 28), pic('🧺', 54, 53, 18), pic('🍎', 51, 46, 8), pic('🍎', 57, 46, 8)], ground: 'grass', caption: 'Fetița a cules merele în coș.' },
    ],
  },
  {
    titles: ['Tortul', 'Supa de legume', 'La piață'],
    panels: [
      { pics: [pic('🧑‍🍳', 25, 37, 28), pic('🥚', 50, 43, 11), pic('🥛', 65, 41, 15), pic('🧈', 82, 44, 13)], ground: 'floor', extras: [{ kind: 'table', x: 66, y: 50, s: 56 }], caption: 'Bucătarul pune pe masă ouă, lapte și unt.' },
      { pics: [pic('🧑‍🍳', 25, 37, 28), pic('🥣', 66, 38, 26)], ground: 'floor', extras: [{ kind: 'table', x: 66, y: 50, s: 56 }], caption: 'Le amestecă într-un castron.' },
      { pics: [pic('🧑‍🍳', 25, 37, 28), pic('🎂', 66, 34, 32)], ground: 'floor', extras: [{ kind: 'table', x: 66, y: 50, s: 56 }], caption: 'Tortul este gata.' },
      { pics: [pic('👦', 28, 38, 26), pic('👧', 86, 38, 26), pic('🍰', 48, 43, 14), pic('🍰', 66, 43, 14)], ground: 'floor', extras: [{ kind: 'table', x: 57, y: 50, s: 40 }], caption: 'Copiii mănâncă felii de tort.' },
    ],
  },
  {
    titles: ['Scrisoarea', 'La doctor', 'Mingea pierdută'],
    panels: [
      { pics: [pic('👧', 25, 37, 28), pic('📝', 62, 39, 22), pic('✏️', 84, 43, 13)], ground: 'floor', extras: [{ kind: 'table', x: 68, y: 50, s: 52 }], caption: 'Fetița scrie o scrisoare.' },
      { pics: [pic('👧', 25, 37, 28), pic('✉️', 66, 38, 24)], ground: 'floor', extras: [{ kind: 'table', x: 68, y: 50, s: 52 }], caption: 'Pune scrisoarea în plic.' },
      { pics: [pic('👧', 24, 38, 30), pic('📮', 70, 38, 34), pic('✉️', 49, 26, 13)], ground: 'grass', caption: 'Duce plicul la cutia poștală.' },
      { pics: [pic('👵', 34, 33, 32), pic('✉️', 68, 40, 20), pic('❤️', 70, 18, 12)], ground: 'floor', caption: 'Bunica primește scrisoarea și se bucură.' },
    ],
  },
  {
    titles: ['De la grâu la pâine', 'Ziua de naștere', 'Iarna pe uliță'],
    panels: [
      { pics: [pic('🌱', 18, 48, 15), pic('🌱', 38, 48, 15), pic('🌱', 58, 48, 15), pic('🌱', 78, 48, 15), pic('☀️', 86, 13, 14)], ground: 'soil', caption: 'Pe câmp răsare grâul.' },
      { pics: [pic('🌾', 18, 40, 30), pic('🌾', 38, 40, 30), pic('🌾', 58, 40, 30), pic('🌾', 78, 40, 30), pic('☀️', 86, 12, 14)], ground: 'soil', caption: 'Grâul crește înalt și se coace.' },
      { pics: [pic('🚜', 36, 40, 34), pic('🌾', 72, 42, 26), pic('🌾', 88, 42, 26)], ground: 'soil', caption: 'Tractorul vine să strângă grâul.' },
      { pics: [pic('🧑‍🍳', 25, 37, 28), pic('🍞', 60, 40, 22), pic('🍞', 80, 40, 22)], ground: 'floor', extras: [{ kind: 'table', x: 70, y: 50, s: 54 }], caption: 'Din făina de grâu, brutarul a făcut pâine.' },
    ],
  },
  {
    titles: ['Copacul și anotimpurile', 'O zi la mare', 'Cățelul jucăuș'],
    panels: [
      { pics: [pic('🌷', 76, 50, 13), pic('🌷', 88, 51, 11)], ground: 'grass', extras: [{ kind: 'tree', x: 42, y: 57, s: 50, season: 'primavara' }], caption: 'Primăvara, copacul înflorește.' },
      { pics: [pic('☀️', 84, 14, 20)], ground: 'grass', extras: [{ kind: 'tree', x: 42, y: 57, s: 50, season: 'vara' }], caption: 'Vara, copacul are frunze verzi și dese.' },
      { pics: [pic('🍂', 78, 50, 16), pic('☁️', 80, 14, 22)], ground: 'grass', extras: [{ kind: 'tree', x: 42, y: 57, s: 50, season: 'toamna' }], caption: 'Toamna, frunzele îngălbenesc și cad.' },
      { pics: [pic('🌨️', 80, 15, 24)], ground: 'snow', extras: [{ kind: 'tree', x: 42, y: 57, s: 50, season: 'iarna' }, { kind: 'flakes', x: 50, y: 40, s: 1 }], caption: 'Iarna, copacul este gol și nins.' },
    ],
  },
  {
    titles: ['Supa de legume', 'Tortul', 'Mărul din livadă'],
    panels: [
      { pics: [pic('🥕', 40, 42, 17), pic('🥔', 58, 44, 14), pic('🧅', 74, 43, 15), pic('🥕', 88, 42, 17)], ground: 'floor', extras: [{ kind: 'table', x: 63, y: 50, s: 66 }], caption: 'Pe masă sunt morcovi, cartofi și o ceapă.' },
      { pics: [pic('🧑‍🍳', 25, 37, 28), pic('🔪', 58, 40, 20), pic('🥕', 80, 43, 16)], ground: 'floor', extras: [{ kind: 'table', x: 68, y: 50, s: 54 }], caption: 'Bucătarul taie legumele.' },
      { pics: [pic('🧑‍🍳', 25, 37, 28), pic('🍲', 66, 36, 30), pic('🔥', 66, 55, 12)], ground: 'floor', caption: 'Supa fierbe în oală.' },
      { pics: [pic('👦', 26, 37, 28), pic('🥣', 66, 39, 24)], ground: 'floor', extras: [{ kind: 'table', x: 66, y: 50, s: 50 }], caption: 'Băiatul mănâncă supa.' },
    ],
  },
  {
    titles: ['Parcul curat', 'Furtuna', 'La bunici'],
    panels: [
      { pics: [pic('🌳', 80, 30, 38), pic('🥤', 22, 54, 12), pic('🧴', 40, 55, 11), pic('📰', 56, 55, 12)], ground: 'grass', caption: 'În parc, pe iarbă, sunt gunoaie.' },
      { pics: [pic('🌳', 80, 30, 38), pic('👦', 36, 40, 28), pic('🥤', 55, 38, 11), pic('📰', 18, 56, 11)], ground: 'grass', caption: 'Băiatul adună gunoaiele.' },
      { pics: [pic('👦', 32, 40, 28), pic('🗑️', 70, 45, 24), pic('🥤', 70, 22, 10)], ground: 'grass', caption: 'Le aruncă la coșul de gunoi.' },
      { pics: [pic('🌳', 80, 30, 38), pic('🌷', 26, 50, 13), pic('🌷', 42, 51, 12), pic('🦋', 46, 26, 14), pic('☀️', 30, 12, 14)], ground: 'grass', caption: 'Parcul este din nou curat.' },
    ],
  },
];

/** The name of each story in the picker. */
export const STORY_NAMES = ['Sămânța', 'Zăpada', 'Puiul', 'Ploaia', 'Fluturele', 'Mărul', 'Tortul', 'Scrisoarea', 'Pâinea', 'Copacul', 'Supa', 'Parcul curat'];

// ───────────────────────── Semne și simboluri ─────────────────────────

/** Signs drawn as vector shapes (clr-pages.ts signOps); every other sign is a Twemoji picture or a composed sign. */
export const DRAWN_SIGNS = ['stop', 'crossing', 'hospital', 'metro', 'exit', 'pharmacy', 'electric', 'firstaid', 'fragile', 'thisup', 'age3'] as const;
export type DrawnSign = (typeof DRAWN_SIGNS)[number];

/**
 * How a composed sign is framed: `ban` a red ring with a bar across the picture, `must` a blue ring (do this),
 * `blue` a blue disc with the picture in white (the cycle lane), `yellow` / `orange` / `red` the panel of a weather
 * warning, its border in the colour of the code and a small warning triangle in its corner, `ghs` the red diamond of the dangerous
 * products, `bin-…` a recycling bin of that colour with what goes in it on its label.
 */
export type SignFrame = 'ban' | 'must' | 'blue' | 'yellow' | 'orange' | 'red' | 'ghs' | 'bin-yellow' | 'bin-blue' | 'bin-green';
/** Signs made of a frame drawn around a Twemoji picture (clr-pages.ts signOps). */
export const COMPOSED_SIGNS: Record<string, { frame: SignFrame; e: string }> = {
  'bike-lane': { frame: 'blue', e: '🚲' },
  'ban-dog': { frame: 'ban', e: '🐕' },
  'ban-run': { frame: 'ban', e: '🏃' },
  'ban-fire': { frame: 'ban', e: '🔥' },
  'must-wash': { frame: 'must', e: '🧼' },
  'bin-plastic': { frame: 'bin-yellow', e: '🥫' },
  'bin-paper': { frame: 'bin-blue', e: '📰' },
  'bin-glass': { frame: 'bin-green', e: '🍾' },
  'code-rain': { frame: 'yellow', e: '🌧️' },
  'code-heat': { frame: 'red', e: '🌡️' },
  'code-snow': { frame: 'orange', e: '🌨️' },
  'code-storm': { frame: 'yellow', e: '🌩️' },
  'code-wind': { frame: 'yellow', e: '🌬️' },
  'code-fog': { frame: 'yellow', e: '🌫️' },
  'ghs-toxic': { frame: 'ghs', e: '☠️' },
  'ghs-fire': { frame: 'ghs', e: '🔥' },
};

/** Clasa pregătitoare and clasa I: join the sign with its meaning. [sign, meaning as printed]. */
export const SIGN_MATCH_SETS: [string, string][][] = [
  // CP: „Simboluri uzuale din universul apropiat: metrou, intrare, ieșire, spital, trecere de pietoni etc.” (capitals)
  [['stop', 'OPREȘTE!'], ['crossing', 'TRECERE DE PIETONI'], ['hospital', 'SPITAL'], ['🚾', 'TOALETĂ'], ['exit', 'IEȘIRE'], ['metro', 'METROU']],
  // clasa I: symbols of the familiar world that carry a simple message
  [['♻️', 'Reciclare'], ['🚭', 'Fumatul interzis'], ['electric', 'Pericol: curent electric!'], ['pharmacy', 'Farmacie'], ['🚸', 'Atenție, copii!'], ['⛔', 'Accesul interzis']],
];

/** Every set where the sign is joined with its meaning, by its number (sets 1, 2 and the ones added later). */
export const SIGN_MATCH: Record<number, [string, string][]> = {
  1: SIGN_MATCH_SETS[0],
  2: SIGN_MATCH_SETS[1],
  // clasa pregătitoare, on the street (capitals)
  4: [['🚦', 'SEMAFOR'], ['🅿️', 'PARCARE'], ['🚏', 'STAȚIE DE AUTOBUZ'], ['bike-lane', 'PISTĂ DE BICICLETE'], ['🚧', 'DRUM ÎN LUCRU'], ['🚷', 'PIETONII NU TREC']],
  // clasa pregătitoare, in public places
  5: [['ℹ️', 'INFORMAȚII'], ['🛗', 'LIFT'], ['🚰', 'APĂ DE BĂUT'], ['firstaid', 'PRIM AJUTOR'], ['🤫', 'LINIȘTE!'], ['ban-dog', 'FĂRĂ CÂINI']],
  // clasa I: rules at school and for safety
  6: [['ban-run', 'Nu alerga!'], ['must-wash', 'Spală-te pe mâini!'], ['🚯', 'Nu arunca gunoaie pe jos!'], ['🚱', 'Apa nu este bună de băut.'], ['⚠️', 'Atenție, pericol!'], ['ban-fire', 'Focul interzis']],
  // clasa I: recycling and the pictograms on packages
  7: [['bin-plastic', 'Plastic și metal'], ['bin-paper', 'Hârtie și carton'], ['bin-glass', 'Sticlă'], ['fragile', 'Fragil'], ['☔', 'Ferește de umezeală'], ['thisup', 'Cu partea aceasta în sus']],
};

/** Clasa a II-a: a sign in a known context, a question, three answers (one right). */
export interface SignQuestion { sign: string; q: string; options: [string, string, string]; answer: number }

export const SIGN_CONTEXT: SignQuestion[] = [
  { sign: '📵', q: 'La teatru vezi acest semn. Ce faci?', options: ['Închid telefonul.', 'Sun un prieten.', 'Ascult muzică la telefon.'], answer: 0 },
  { sign: '🚮', q: 'Vezi acest semn lângă un coș din parc. Ce îți cere?', options: ['Să te joci cu mingea.', 'Să arunci gunoiul la coș.', 'Să ieși din parc.'], answer: 1 },
  { sign: '🚸', q: 'Șoferul vede acest semn lângă școală. Ce face?', options: ['Merge mai repede.', 'Claxonează tare.', 'Merge încet și cu atenție.'], answer: 2 },
  { sign: 'electric', q: 'Semnul este pe ușa unei cutii de pe stradă. Ce faci?', options: ['Deschid ușa cutiei.', 'Mă joc lângă cutie.', 'Nu ating cutia.'], answer: 2 },
  { sign: '♿', q: 'Un loc din parcare are acest semn. Cine parchează acolo?', options: ['O persoană cu dizabilități.', 'Oricine vine primul.', 'Doar bicicletele.'], answer: 0 },
  { sign: '🚳', q: 'Vezi semnul la intrarea în parc. Ce înseamnă?', options: ['Aici se repară biciclete.', 'Aici nu ai voie cu bicicleta.', 'Aici se închiriază biciclete.'], answer: 1 },
];

/** Every set of signs in a context, by its number (set 3 and the ones added later). */
export const SIGN_CONTEXT_SETS: Record<number, SignQuestion[]> = {
  3: SIGN_CONTEXT,
  // weather warnings: the colour of the code is named in the question, so the sheet also works printed in black and white
  8: [
    { sign: 'code-rain', q: 'La știri apare acest semn: cod galben de ploi. Ce iei cu tine?', options: ['Umbrela.', 'Ochelarii de soare.', 'Sania.'], answer: 0 },
    { sign: 'code-heat', q: 'Semnul anunță cod roșu de caniculă. Ce faci la prânz?', options: ['Alerg mult prin curte.', 'Stau la umbră și beau apă.', 'Mă îmbrac gros.'], answer: 1 },
    { sign: 'code-snow', q: 'Semnul anunță cod portocaliu de ninsori și viscol. Cum te îmbraci?', options: ['Cu tricou și sandale.', 'Cu pantaloni scurți.', 'Cu geacă groasă, căciulă și mănuși.'], answer: 2 },
    { sign: 'code-storm', q: 'Semnul anunță furtună cu fulgere. Unde te adăpostești?', options: ['Sub un copac înalt.', 'Într-o clădire.', 'Pe terenul de fotbal.'], answer: 1 },
    { sign: 'code-wind', q: 'Semnul anunță vânt puternic. Ce faci pe stradă?', options: ['Mă țin departe de copaci și de panouri.', 'Îmi deschid umbrela.', 'Înalț zmeul lângă firele electrice.'], answer: 0 },
    { sign: 'code-fog', q: 'Semnul anunță ceață. Ce face șoferul?', options: ['Merge mai repede.', 'Stinge farurile.', 'Merge încet, cu farurile aprinse.'], answer: 2 },
  ],
  // the pictograms on packages and labels
  9: [
    { sign: 'ghs-toxic', q: 'Semnul este pe o sticlă din baie. Ce faci?', options: ['Miros ce este în ea.', 'Nu o deschid și nu gust din ea.', 'O torn în chiuvetă.'], answer: 1 },
    { sign: 'ghs-fire', q: 'Semnul este pe un tub de spray. Ce înseamnă?', options: ['Se aprinde ușor: se ține departe de foc.', 'Se pune la congelator.', 'Se poate bea.'], answer: 0 },
    { sign: '♻️', q: 'Semnul este pe o cutie de carton goală. Ce faci cu ea?', options: ['O arunc pe stradă.', 'O ard în curte.', 'O duc la reciclare.'], answer: 2 },
    { sign: 'fragile', q: 'Semnul este pe un colet. Cum îl duci?', options: ['Cu grijă, fără să îl trântesc.', 'Îl rostogolesc pe scări.', 'Mă așez pe el.'], answer: 0 },
    { sign: 'age3', q: 'Semnul este pe cutia unei jucării. Ce înseamnă?', options: ['Jucăria costă 3 lei.', 'Jucăria are 3 piese.', 'Jucăria nu este pentru copiii mai mici de 3 ani.'], answer: 2 },
    { sign: '☔', q: 'Semnul este pe o cutie de carton. Ce înseamnă?', options: ['În cutie este o umbrelă.', 'Cutia trebuie ferită de ploaie.', 'Cutia se spală cu apă.'], answer: 1 },
  ],
};

// ───────────────────────── Felicitarea, biletul, invitația (CP) ─────────────────────────

/** A piece of a line of the message: printed words, or a blank to write in. */
export type NotePiece = string | { blank: 'name' | 'bank' };
export interface NoteSet {
  title: string;
  /** What the child does, under the title. */
  instruction: string;
  /** The pictures on the card. */
  pictures: [string, string];
  lines: NotePiece[][];
  /** The words to choose from for the „bank” blank, with a picture each (empty: none). */
  bank: [string, string][];
  /** The drawing under the card. */
  draw: string;
}

export const NOTE_SETS: NoteSet[] = [
  {
    title: 'Felicitarea',
    instruction: 'Scrie felicitarea pentru un prieten: numele lui, ce îi dorești, numele tău.',
    pictures: ['🎂', '🎈'],
    lines: [['LA MULȚI ANI,', { blank: 'name' }, '!'], ['ÎȚI DORESC', { blank: 'bank' }, '!'], ['CU DRAG,', { blank: 'name' }]],
    bank: [['SĂNĂTATE', '🍎'], ['BUCURIE', '😀'], ['JUCĂRII', '🧸']],
    draw: 'Desenează un cadou pentru prietenul tău.',
  },
  {
    title: 'Biletul',
    instruction: 'Scrie un bilet pentru mama: unde ești și numele tău.',
    pictures: ['✉️', '🏠'],
    lines: [['MAMA,'], ['SUNT LA', { blank: 'bank' }, '.'], ['VIN ACASĂ LA CINĂ.'], ['TE IUBESC,', { blank: 'name' }]],
    bank: [['PARC', '🏞️'], ['BUNICI', '👵'], ['ȘCOALĂ', '🏫']],
    draw: 'Desenează locul unde ești.',
  },
  {
    title: 'Invitația',
    instruction: 'Scrie o invitație pentru un prieten: numele lui, la ce îl inviți, numele tău.',
    pictures: ['🎉', '🎁'],
    lines: [['DRAGĂ', { blank: 'name' }, ','], ['TE INVIT LA', { blank: 'bank' }, 'MEA.'], ['TE AȘTEPT CU DRAG!'], [{ blank: 'name' }]],
    bank: [['ZIUA', '🎂'], ['SERBAREA', '🎭']],
    draw: 'Desenează ce veți face împreună.',
  },
  // ── the messages added later (4–10)
  {
    title: 'Mulțumirea',
    instruction: 'Scrie un bilet de mulțumire: cui îi mulțumești, pentru ce, numele tău.',
    pictures: ['🌷', '❤️'],
    lines: [['DRAGĂ', { blank: 'name' }, ','], ['ÎȚI MULȚUMESC PENTRU', { blank: 'bank' }, '.'], ['CU DRAG,', { blank: 'name' }]],
    bank: [['CADOU', '🎁'], ['AJUTOR', '🤝'], ['CARTE', '📕']],
    draw: 'Desenează pentru ce mulțumești.',
  },
  {
    title: 'Scuzele',
    instruction: 'Scrie un bilet prin care îți ceri scuze: cui îi scrii, ce ai stricat, numele tău.',
    pictures: ['✉️', '🤝'],
    lines: [['DRAGĂ', { blank: 'name' }, ','], ['ÎMI PARE RĂU CĂ ȚI-AM STRICAT'], [{ blank: 'bank' }, '. TE ROG SĂ MĂ IERȚI.'], [{ blank: 'name' }]],
    bank: [['TURNUL', '🧱'], ['DESENUL', '🖌️'], ['JOCUL', '🧩']],
    draw: 'Desenează cum vă împăcați.',
  },
  {
    title: 'Lista de cumpărături',
    instruction: 'Scrie lista de cumpărături: trei lucruri și numele tău.',
    pictures: ['🛒', '🧺'],
    lines: [['DE CUMPĂRAT:'], ['1.', { blank: 'bank' }], ['2.', { blank: 'bank' }], ['3.', { blank: 'bank' }], ['SCRISĂ DE', { blank: 'name' }]],
    bank: [['PÂINE', '🍞'], ['LAPTE', '🥛'], ['MERE', '🍎']],
    draw: 'Desenează ce ai mai pune tu în coș.',
  },
  {
    title: 'Anunțul',
    instruction: 'Scrie un anunț: ce ai pierdut și numele tău.',
    pictures: ['📢', '🔍'],
    lines: [['AM PIERDUT UN', { blank: 'bank' }, '.'], ['DACĂ L-AI GĂSIT,'], ['TE ROG SĂ MI-L ADUCI.'], ['MULȚUMESC!', { blank: 'name' }]],
    bank: [['FULAR', '🧣'], ['PIX', '🖊️'], ['INEL', '💍']],
    draw: 'Desenează lucrul pierdut, ca să poată fi recunoscut.',
  },
  {
    title: 'Afișul',
    instruction: 'Scrie afișul clasei: la ce îi inviți pe ceilalți și în ce zi.',
    pictures: ['🎉', '🎈'],
    lines: [['VINO LA', { blank: 'bank' }], ['CLASEI NOASTRE!'], ['ZIUA:', { blank: 'name' }], ['TE AȘTEPTĂM CU DRAG!']],
    bank: [['SERBAREA', '🎭'], ['CONCERTUL', '🎺'], ['EXPOZIȚIA', '🖌️']],
    draw: 'Desenează ce se va vedea pe afiș.',
  },
  {
    title: 'Programul zilei',
    instruction: 'Scrie programul zilei tale: ce faci dimineața, la prânz și seara.',
    pictures: ['🕒', '☀️'],
    lines: [['PROGRAMUL MEU'], ['DIMINEAȚA:', { blank: 'bank' }], ['LA PRÂNZ:', { blank: 'bank' }], ['SEARA:', { blank: 'bank' }]],
    bank: [['ȘCOALĂ', '🏫'], ['MASĂ', '🍲'], ['SOMN', '🛏️']],
    draw: 'Desenează ce îți place cel mai mult să faci într-o zi.',
  },
  {
    title: 'Rețeta',
    instruction: 'Scrie rețeta salatei de fructe: două fructe alese de tine.',
    pictures: ['🥣', '🥄'],
    lines: [['SALATĂ DE FRUCTE'], ['TAI UN', { blank: 'bank' }], ['ȘI O', { blank: 'bank' }, '.'], ['PUN MIERE ȘI AMESTEC.'], ['POFTĂ BUNĂ!']],
    bank: [['MĂR', '🍎'], ['PARĂ', '🍐'], ['BANANĂ', '🍌']],
    draw: 'Desenează salata ta de fructe.',
  },
];

// ───────────────────────── Citește mesajul (clasa a II-a) ─────────────────────────

export interface MessageQuestion { q: string; options: [string, string, string]; answer: number }
export interface MessageSet {
  /** `afis` and `anunt` are posters (their lines centred); `lista`, `reteta` and `program` have a heading and one line per row. */
  kind: 'invitatie' | 'afis' | 'bilet' | 'felicitare' | 'anunt' | 'lista' | 'reteta' | 'program';
  /** As printed above the message („Invitația”). */
  title: string;
  /** The message: the greeting, the paragraphs, the signature (a poster: its lines, the first one big). */
  lines: string[];
  picture: string;
  questions: MessageQuestion[];
  /** A short answer the child writes under the questions. */
  reply: string;
}

export const MESSAGE_SETS: MessageSet[] = [
  {
    kind: 'invitatie',
    title: 'Invitația',
    picture: '🎈',
    lines: [
      'Dragă Andrei,',
      'Te invit la ziua mea de naștere, sâmbătă, 12 aprilie, la ora 16. Petrecerea va fi în curtea bunicilor mei, pe strada Florilor, numărul 7. Vino îmbrăcat lejer, pentru că ne vom juca afară!',
      'Te aștept cu drag,',
      'Ioana',
    ],
    questions: [
      { q: 'Cine a scris invitația?', options: ['Andrei', 'Ioana', 'bunicii'], answer: 1 },
      { q: 'În ce zi este petrecerea?', options: ['vineri', 'duminică', 'sâmbătă'], answer: 2 },
      { q: 'La ce oră începe petrecerea?', options: ['la ora 16', 'la ora 12', 'la ora 7'], answer: 0 },
      { q: 'Unde va fi petrecerea?', options: ['la școală', 'în curtea bunicilor', 'în parc'], answer: 1 },
    ],
    reply: 'Răspunde-i Ioanei: scrie dacă vii la petrecere.',
  },
  {
    kind: 'afis',
    title: 'Afișul',
    picture: '🎭',
    lines: ['SPECTACOL DE PĂPUȘI', '„Capra cu trei iezi”', 'Duminică, 20 mai, ora 11', 'Sala de festivități a Școlii nr. 3', 'Intrarea este liberă!', 'Vă așteptăm cu drag!'],
    questions: [
      { q: 'Ce spectacol se joacă?', options: ['„Scufița Roșie”', '„Capra cu trei iezi”', '„Albă-ca-Zăpada”'], answer: 1 },
      { q: 'Când are loc spectacolul?', options: ['duminică, 20 mai', 'luni, 20 mai', 'duminică, 11 mai'], answer: 0 },
      { q: 'Unde are loc spectacolul?', options: ['la teatru', 'în parc', 'în sala școlii'], answer: 2 },
      { q: 'Cât costă intrarea?', options: ['10 lei', '5 lei', 'nimic'], answer: 2 },
    ],
    reply: 'Scrie cu cine ai merge la spectacol.',
  },
  {
    kind: 'bilet',
    title: 'Biletul',
    picture: '✉️',
    lines: [
      'Mihai,',
      'Am plecat la piață să cumpăr fructe. Mâncarea este în frigider. După ce mănânci, te rog să-i dai de mâncare lui Pufi și să-ți faci temele. Mă întorc la ora 18.',
      'Mama',
    ],
    questions: [
      { q: 'Cui îi scrie mama?', options: ['lui Pufi', 'lui Mihai', 'bunicii'], answer: 1 },
      { q: 'Unde a plecat mama?', options: ['la piață', 'la serviciu', 'la școală'], answer: 0 },
      { q: 'Unde este mâncarea?', options: ['pe masă', 'la piață', 'în frigider'], answer: 2 },
      { q: 'Când se întoarce mama?', options: ['la ora 8', 'la ora 18', 'mâine'], answer: 1 },
    ],
    reply: 'Scrie-i mamei un bilet: ce ai făcut după masă.',
  },
  // ── the messages added later (4–9)
  {
    kind: 'felicitare',
    title: 'Felicitarea',
    picture: '🌷',
    lines: [
      'Dragă bunico,',
      'Îți urez „La mulți ani!” de ziua ta. Îți doresc multă sănătate și zile senine. Abia aștept să vin la tine în vacanța de vară, să culegem împreună cireșe.',
      'Cu drag,',
      'Ilinca',
    ],
    questions: [
      { q: 'Cui îi scrie Ilinca?', options: ['mamei', 'bunicii', 'unei prietene'], answer: 1 },
      { q: 'Cu ce ocazie a scris felicitarea?', options: ['de ziua bunicii', 'de Anul Nou', 'de 1 Iunie'], answer: 0 },
      { q: 'Ce îi dorește Ilinca bunicii?', options: ['multe cadouri', 'drum bun', 'multă sănătate'], answer: 2 },
      { q: 'Ce vor culege împreună în vacanță?', options: ['cireșe', 'mere', 'struguri'], answer: 0 },
    ],
    reply: 'Scrie o urare pentru cineva drag.',
  },
  {
    kind: 'bilet',
    title: 'Biletul de mulțumire',
    picture: '🧸',
    lines: [
      'Dragă Tudor,',
      'Îți mulțumesc pentru jocul de construcții pe care mi l-ai adus de ziua mea. Am construit deja un castel, împreună cu tata. Are o sută de piese! Te aștept sâmbătă să construim ceva nou.',
      'Vlad',
    ],
    questions: [
      { q: 'Cine a scris biletul?', options: ['Tudor', 'tata', 'Vlad'], answer: 2 },
      { q: 'Pentru ce mulțumește Vlad?', options: ['pentru un joc', 'pentru o carte', 'pentru o minge'], answer: 0 },
      { q: 'Ce a construit Vlad?', options: ['un pod', 'un castel', 'o rachetă'], answer: 1 },
      { q: 'Când îl așteaptă Vlad pe Tudor?', options: ['duminică', 'vineri', 'sâmbătă'], answer: 2 },
    ],
    reply: 'Scrie un bilet de mulțumire pentru un coleg.',
  },
  {
    kind: 'anunt',
    title: 'Anunțul',
    picture: '📢',
    lines: ['ANUNȚ', 'Cercul de șah începe luni, 6 octombrie', 'Unde: în sala de lectură', 'Când: în fiecare luni, de la ora 13', 'Înscrieri: la doamna bibliotecară', 'Adu cu tine un caiet!'],
    questions: [
      { q: 'Ce cerc începe?', options: ['cercul de pictură', 'cercul de șah', 'cercul de dans'], answer: 1 },
      { q: 'În ce zi se ține cercul?', options: ['luni', 'miercuri', 'vineri'], answer: 0 },
      { q: 'Unde se ține cercul?', options: ['în sala de sport', 'în curtea școlii', 'în sala de lectură'], answer: 2 },
      { q: 'La cine te înscrii?', options: ['la bibliotecară', 'la director', 'la un coleg'], answer: 0 },
    ],
    reply: 'Scrie la ce cerc ți-ar plăcea să mergi.',
  },
  {
    kind: 'lista',
    title: 'Lista de cumpărături',
    picture: '🛒',
    lines: ['De cumpărat de la piață', '– 2 kg de roșii', '– 1 kg de castraveți', '– 6 ouă', '– o pâine', '– un borcan cu miere', 'Nu uita sacoșa de pânză!'],
    questions: [
      { q: 'Câte kilograme de roșii sunt pe listă?', options: ['1 kg', '2 kg', '6 kg'], answer: 1 },
      { q: 'Câte ouă sunt pe listă?', options: ['6', '2', '10'], answer: 0 },
      { q: 'Ce este în borcan?', options: ['dulceață', 'zacuscă', 'miere'], answer: 2 },
      { q: 'Ce nu trebuie uitat?', options: ['umbrela', 'sacoșa de pânză', 'portofelul'], answer: 1 },
    ],
    reply: 'Scrie trei lucruri pe care le-ai cumpăra tu de la piață.',
  },
  {
    kind: 'reteta',
    title: 'Rețeta',
    picture: '🥣',
    lines: ['Salată de fructe', 'Ai nevoie de: un măr, o banană, o portocală și o lingură de miere.', '1. Spală fructele.', '2. Roagă un adult să le taie cubulețe.', '3. Pune fructele într-un castron.', '4. Adaugă mierea și amestecă.', 'Poftă bună!'],
    questions: [
      { q: 'Ce se pregătește după această rețetă?', options: ['o supă', 'o salată de fructe', 'un tort'], answer: 1 },
      { q: 'Câte fructe sunt în rețetă?', options: ['trei', 'două', 'cinci'], answer: 0 },
      { q: 'Ce faci mai întâi?', options: ['amesteci', 'adaugi mierea', 'speli fructele'], answer: 2 },
      { q: 'Cine taie fructele?', options: ['un adult', 'cel mai mic copil', 'nimeni'], answer: 0 },
    ],
    reply: 'Scrie ce fruct ai mai adăuga tu în salată.',
  },
  {
    kind: 'program',
    title: 'Programul',
    picture: '📚',
    lines: ['Programul bibliotecii școlii', 'Luni – joi: 9–15', 'Vineri: 9–13', 'Sâmbătă și duminică: închis', 'Cărțile se împrumută pentru două săptămâni.', 'Vă rugăm să păstrați liniștea!'],
    questions: [
      { q: 'Al cui este programul?', options: ['al bibliotecii', 'al cantinei', 'al sălii de sport'], answer: 0 },
      { q: 'Până la ce oră este deschis vinerea?', options: ['până la 15', 'până la 13', 'până la 9'], answer: 1 },
      { q: 'Când este închisă biblioteca?', options: ['luni', 'joi', 'sâmbătă și duminică'], answer: 2 },
      { q: 'Pentru cât timp se împrumută cărțile?', options: ['două zile', 'două săptămâni', 'o lună'], answer: 1 },
    ],
    reply: 'Scrie în ce zi ai merge tu la bibliotecă.',
  },
];

// ───────────────────────── Unde este ceva scris? (grădiniță) ─────────────────────────

/** A card: a picture, a word, or a picture with a word or with a decoration (shapes, dots, stars: not writing). */
export interface WrittenCard { picture?: string; word?: string; deco?: 'shapes' | 'dots' | 'stars' }

export const WRITTEN_SETS: WrittenCard[][] = [
  [
    { picture: '🍎', word: 'MĂR' }, { picture: '🐱' }, { word: 'MAMA' }, { picture: '🎈', deco: 'shapes' },
    { picture: '🚗' }, { picture: '🏠', word: 'CASĂ' }, { picture: '⭐', deco: 'dots' }, { word: 'ANA' },
    { picture: '🌷' }, { picture: '📕', word: 'POVEȘTI' }, { picture: '🐟', deco: 'stars' }, { picture: '☀️', word: 'SOARE' },
  ],
  [
    { word: 'TATA' }, { picture: '🐶' }, { picture: '🍐', word: 'PARĂ' }, { picture: '🌳', deco: 'shapes' },
    { word: 'GRĂDINIȚA' }, { picture: '🚌' }, { picture: '🎁', word: 'PENTRU TINE' }, { picture: '🦋', deco: 'dots' },
    { picture: '🥛', word: 'LAPTE' }, { picture: '🐢' }, { word: 'IOANA' }, { picture: '🌙', deco: 'stars' },
  ],
];

// ───────────────────────── Ascultă și răspunde (clasa pregătitoare, I, a II-a) ─────────────────────────

/** An answer to choose: in clasa pregătitoare a picture and its name (for the adult), later a few words. */
export type ListenOption = string | [picture: string, name: string];
export interface ListenQuestion { q: string; options: [ListenOption, ListenOption, ListenOption]; answer: number }
export interface ListenSet {
  title: string;
  /** The text the adult reads aloud, one sentence per entry. */
  sentences: string[];
  /** The first question asks what the text is about (1.1), the others ask for details (1.2). */
  questions: ListenQuestion[];
}

const pq = (q: string, a: [string, string], b: [string, string], c: [string, string], answer: number): ListenQuestion => ({ q, options: [a, b, c], answer });
const wq = (q: string, options: [string, string, string], answer: number): ListenQuestion => ({ q, options, answer });

/** Original texts, written for these sheets. Sets 1–6: clasa pregătitoare; 7–12: clasa I; 13–18: clasa a II-a (LISTEN_LEVELS). */
export const LISTEN_SETS: ListenSet[] = [
  // ── clasa pregătitoare: four or five short sentences; the child circles one of three pictures
  {
    title: 'Pisica Miți',
    sentences: ['Pisica Miți doarme pe un scaun.', 'Vine un fluture și se așază pe nasul ei.', 'Miți se trezește și sare după el.', 'Fluturele zboară afară pe fereastră.'],
    questions: [
      pq('Despre cine este povestea?', ['🐱', 'pisica'], ['🐶', 'câinele'], ['🐭', 'șoarecele'], 0),
      pq('Unde doarme Miți?', ['🛏️', 'pe pat'], ['🪑', 'pe scaun'], ['🧺', 'în coș'], 1),
      pq('Cine se așază pe nasul ei?', ['🐝', 'albina'], ['🐞', 'gărgărița'], ['🦋', 'fluturele'], 2),
      pq('Pe unde iese fluturele?', ['🚪', 'pe ușă'], ['🪟', 'pe fereastră'], ['🪜', 'pe scară'], 1),
    ],
  },
  {
    title: 'Balonul',
    sentences: ['Dan are un balon roșu.', 'Vântul bate tare și îi ia balonul din mână.', 'Balonul se oprește într-un copac.', 'Tata urcă pe o scară și îl ia de acolo.'],
    questions: [
      pq('Despre ce este povestea?', ['🚗', 'despre o mașină'], ['🎈', 'despre un balon'], ['🐟', 'despre un pește'], 1),
      pq('Cine îi ia lui Dan balonul din mână?', ['🌬️', 'vântul'], ['🐕', 'câinele'], ['🐦', 'pasărea'], 0),
      pq('Unde se oprește balonul?', ['🏠', 'pe casă'], ['☁️', 'în nori'], ['🌳', 'în copac'], 2),
      pq('Pe ce urcă tata?', ['🪜', 'pe scară'], ['🪑', 'pe scaun'], ['🚲', 'pe bicicletă'], 0),
    ],
  },
  {
    title: 'Iepurașul din grădină',
    sentences: ['Un iepuraș intră în grădina bunicului.', 'El roade un morcov, apoi încă unul.', 'Câinele Azor îl vede și latră.', 'Iepurașul fuge repede în pădure.'],
    questions: [
      pq('Despre cine este povestea?', ['🐿️', 'veverița'], ['🦔', 'ariciul'], ['🐇', 'iepurașul'], 2),
      pq('Ce roade iepurașul?', ['🥕', 'un morcov'], ['🍎', 'un măr'], ['🥬', 'o salată'], 0),
      pq('Cine latră?', ['🐱', 'pisica'], ['🐕', 'câinele'], ['🐓', 'cocoșul'], 1),
      pq('Unde fuge iepurașul?', ['🏠', 'în casă'], ['🌊', 'la apă'], ['🌲', 'în pădure'], 2),
    ],
  },
  {
    title: 'Ziua Irinei',
    sentences: ['Azi este ziua Irinei.', 'Mama a făcut un tort cu căpșuni.', 'Irina suflă în lumânări.', 'Ea primește în dar o carte cu povești.'],
    questions: [
      pq('Despre ce este vorba în poveste?', ['⛄', 'despre o zi de iarnă'], ['🎂', 'despre o zi de naștere'], ['🏖️', 'despre o zi la mare'], 1),
      pq('Cu ce este tortul?', ['🍓', 'cu căpșuni'], ['🍒', 'cu cireșe'], ['🍌', 'cu banane'], 0),
      pq('În ce suflă Irina?', ['🎈', 'în balon'], ['🎺', 'în trompetă'], ['🕯️', 'în lumânări'], 2),
      pq('Ce primește Irina în dar?', ['🧸', 'un ursuleț'], ['📕', 'o carte'], ['⚽', 'o minge'], 1),
    ],
  },
  {
    title: 'Ploaia',
    sentences: ['Afară plouă.', 'Radu își ia ghetele și umbrela.', 'El sare în bălți, iar apa îl stropește.', 'Când iese soarele, pe cer apare un curcubeu.'],
    questions: [
      pq('Despre ce este povestea?', ['☀️', 'despre o zi cu soare'], ['🌨️', 'despre o zi cu ninsoare'], ['🌧️', 'despre o zi cu ploaie'], 2),
      pq('Ce își ia Radu în picioare?', ['🥾', 'ghetele'], ['🧦', 'doar șosetele'], ['⛸️', 'patinele'], 0),
      pq('Ce mai ia Radu cu el?', ['🕶️', 'ochelarii de soare'], ['☂️', 'umbrela'], ['🧣', 'fularul'], 1),
      pq('Ce apare pe cer la sfârșit?', ['🌙', 'luna'], ['⭐', 'o stea'], ['🌈', 'curcubeul'], 2),
    ],
  },
  {
    title: 'La fermă',
    sentences: ['Sara merge la ferma bunicilor.', 'Dimineața, ea dă grăunțe găinilor.', 'Apoi mângâie un miel alb.', 'La prânz, bunica îi dă lapte proaspăt.'],
    questions: [
      pq('Despre ce este povestea?', ['🏡', 'despre o zi la fermă'], ['🏫', 'despre o zi la școală'], ['🏖️', 'despre o zi la mare'], 0),
      pq('Cui îi dă Sara grăunțe?', ['🐟', 'peștilor'], ['🐱', 'pisicii'], ['🐔', 'găinilor'], 2),
      pq('Ce animal mângâie Sara?', ['🐖', 'un purcel'], ['🐑', 'un miel'], ['🐴', 'un cal'], 1),
      pq('Ce bea Sara la prânz?', ['🥛', 'lapte'], ['🧃', 'suc'], ['🫖', 'ceai'], 0),
    ],
  },
  // ── clasa I: five or six sentences; four questions with the answers a, b, c
  {
    title: 'Puiul de vrabie',
    sentences: ['Un pui de vrabie a căzut din cuib.', 'Ilinca l-a găsit în iarbă, sub cireș.', 'Tatăl ei a adus o scară și a pus puiul înapoi în cuib.', 'Vrabia cea mare a venit îndată cu o râmă în cioc.', 'Ilinca s-a bucurat că puiul este în siguranță.'],
    questions: [
      wq('Despre ce este vorba în text?', ['despre un pui salvat', 'despre o pisică pierdută', 'despre o excursie la munte'], 0),
      wq('Unde a găsit Ilinca puiul?', ['pe acoperiș', 'în iarbă', 'în casă'], 1),
      wq('Ce a adus tatăl Ilincăi?', ['o cușcă', 'o plasă', 'o scară'], 2),
      wq('Ce avea vrabia în cioc?', ['o râmă', 'un bob de grâu', 'o crenguță'], 0),
    ],
  },
  {
    title: 'Sania cea nouă',
    sentences: ['A nins toată noaptea.', 'Matei a primit o sanie nouă, albastră.', 'El a urcat dealul împreună cu sora lui, Ana.', 'Au coborât de cinci ori și au râs mult.', 'Când s-au întors acasă, au băut ceai cald.'],
    questions: [
      wq('Care este titlul potrivit pentru text?', ['O zi la mare', 'La săniuș', 'Prima zi de școală'], 1),
      wq('Ce culoare are sania lui Matei?', ['roșie', 'verde', 'albastră'], 2),
      wq('Cu cine a urcat Matei dealul?', ['cu sora lui', 'cu bunicul', 'cu un coleg'], 0),
      wq('Ce au băut copiii acasă?', ['lapte', 'ceai cald', 'suc'], 1),
    ],
  },
  {
    title: 'Grădina clasei',
    sentences: ['Elevii clasei I au făcut o grădină mică în curtea școlii.', 'Au plantat ceapă, ridichi și flori.', 'În fiecare zi, câte doi copii udă straturile.', 'După o lună, ridichile au fost gata de cules.', 'Copiii au făcut din ele o salată.'],
    questions: [
      wq('Despre ce este vorba în text?', ['despre o serbare', 'despre grădina clasei', 'despre un concurs'], 1),
      wq('Unde este grădina?', ['în curtea școlii', 'în parc', 'la bunici'], 0),
      wq('Câți copii udă straturile în fiecare zi?', ['un copil', 'trei copii', 'doi copii'], 2),
      wq('Ce au făcut copiii din ridichi?', ['o supă', 'o salată', 'un suc'], 1),
    ],
  },
  {
    title: 'La dentist',
    sentences: ['Pe Tudor îl doare un dinte.', 'Mama îl duce la dentist.', 'Doamna doctor se uită la dinte cu o oglindă mică.', 'Ea îl curăță și îi pune o plombă.', 'Tudor nu a plâns deloc.', 'La plecare, a primit o periuță de dinți nouă.'],
    questions: [
      wq('Despre ce este vorba în text?', ['despre o vizită la dentist', 'despre o zi la bunici', 'despre un meci de fotbal'], 0),
      wq('Ce îl doare pe Tudor?', ['capul', 'un dinte', 'piciorul'], 1),
      wq('Cu ce se uită doamna doctor la dinte?', ['cu o lupă', 'cu o lanternă', 'cu o oglindă mică'], 2),
      wq('Ce a primit Tudor la plecare?', ['o periuță de dinți', 'un balon', 'o carte'], 0),
    ],
  },
  {
    title: 'Merele din livadă',
    sentences: ['Toamna, bunicul culege merele din livadă.', 'Sara și Vlad îl ajută și pun merele în lăzi.', 'Merele roșii sunt pentru mâncat.', 'Din cele galbene, bunica face compot.', 'Seara, toată casa miroase a plăcintă cu mere.'],
    questions: [
      wq('Despre ce este vorba în text?', ['despre o zi la mare', 'despre culesul merelor', 'despre o serbare'], 1),
      wq('Unde pun copiii merele?', ['în saci', 'în coșuri', 'în lăzi'], 2),
      wq('Ce face bunica din merele galbene?', ['compot', 'suc', 'dulceață'], 0),
      wq('A ce miroase casa seara?', ['a cozonac', 'a plăcintă cu mere', 'a pâine caldă'], 1),
    ],
  },
  {
    title: 'Furnicile',
    sentences: ['Furnicile trăiesc împreună într-un mușuroi.', 'Fiecare furnică are treaba ei.', 'Unele cară hrană, altele îngrijesc ouăle.', 'O furnică poate duce o bucățică mai grea decât ea.', 'Iarna, furnicile stau în mușuroi și mănâncă din ce au adunat.'],
    questions: [
      wq('Despre cine este vorba în text?', ['despre albine', 'despre furnici', 'despre fluturi'], 1),
      wq('Unde trăiesc furnicile?', ['într-un mușuroi', 'într-un stup', 'într-un cuib'], 0),
      wq('Ce poate duce o furnică?', ['doar o frunză', 'doar o picătură de apă', 'o bucățică mai grea decât ea'], 2),
      wq('Ce fac furnicile iarna?', ['pleacă în țările calde', 'stau în mușuroi', 'dorm pe frunze'], 1),
    ],
  },
  // ── clasa a II-a: seven or eight sentences, stories and informative texts; five questions
  {
    title: 'Cheia pierdută',
    sentences: [
      'Vineri după-amiază, Radu s-a întors de la școală și și-a căutat cheia în buzunar.',
      'Buzunarul era gol.',
      'A căutat în ghiozdan, printre caiete, dar nu a găsit-o nici acolo.',
      'Atunci și-a amintit că în pauză jucase fotbal în curtea școlii.',
      'S-a întors repede și a întrebat-o pe doamna de la poartă.',
      'Ea i-a arătat o cutie cu lucruri pierdute.',
      'Printre fulare și mănuși, Radu și-a zărit cheia cu breloc verde.',
      'I-a mulțumit doamnei și a plecat liniștit spre casă.',
    ],
    questions: [
      wq('Despre ce este vorba în text?', ['despre o cheie pierdută și găsită', 'despre un meci de fotbal câștigat', 'despre o zi ploioasă'], 0),
      wq('În ce zi s-a petrecut întâmplarea?', ['luni', 'miercuri', 'vineri'], 2),
      wq('Unde și-a căutat Radu cheia prima dată?', ['în ghiozdan', 'în buzunar', 'în penar'], 1),
      wq('Ce culoare avea brelocul cheii?', ['verde', 'roșu', 'galben'], 0),
      wq('Unde era cheia?', ['sub o bancă', 'la un coleg', 'în cutia cu lucruri pierdute'], 2),
    ],
  },
  {
    title: 'Delfinii',
    sentences: [
      'Delfinii trăiesc în mări și oceane, dar nu sunt pești.',
      'Ei respiră aer, de aceea ies des la suprafața apei.',
      'Puii de delfin beau lapte de la mama lor.',
      'Delfinii înoată în grupuri și se ajută între ei.',
      'Ei „vorbesc” prin fluierături și clicuri.',
      'În Marea Neagră trăiesc trei feluri de delfini.',
      'Oamenii trebuie să păstreze marea curată, pentru ca delfinii să fie sănătoși.',
    ],
    questions: [
      wq('Despre ce este vorba în text?', ['despre pești', 'despre delfini', 'despre vapoare'], 1),
      wq('De ce ies delfinii la suprafața apei?', ['ca să respire', 'ca să doarmă', 'ca să se încălzească'], 0),
      wq('Ce beau puii de delfin?', ['apă de mare', 'suc de alge', 'lapte'], 2),
      wq('Cum „vorbesc” delfinii?', ['prin semne cu coada', 'prin fluierături și clicuri', 'prin culori'], 1),
      wq('Câte feluri de delfini trăiesc în Marea Neagră?', ['două', 'cinci', 'trei'], 2),
    ],
  },
  {
    title: 'Concursul de desene',
    sentences: [
      'Clasa a II-a a organizat un concurs de desene cu tema „Anotimpul meu preferat”.',
      'Fiecare copil a desenat pe o foaie mare.',
      'Ilinca a pictat o livadă înflorită.',
      'Vlad a desenat un derdeluș plin de copii cu sănii.',
      'Desenele au fost prinse pe un panou, pe hol.',
      'Elevii din celelalte clase au votat cu buline colorate.',
      'Cele mai multe buline le-a primit desenul lui Vlad.',
      'Toți copiii au primit câte o diplomă și un creion.',
    ],
    questions: [
      wq('Care este titlul potrivit pentru text?', ['Concursul de desene', 'Excursia la munte', 'Ora de sport'], 0),
      wq('Care a fost tema concursului?', ['Animalul meu preferat', 'Anotimpul meu preferat', 'Jocul meu preferat'], 1),
      wq('Ce a pictat Ilinca?', ['un derdeluș', 'o plajă', 'o livadă înflorită'], 2),
      wq('Cu ce au votat elevii din celelalte clase?', ['cu buline colorate', 'cu steluțe', 'cu bilețele'], 0),
      wq('Ce anotimp a desenat Vlad?', ['vara', 'iarna', 'toamna'], 1),
    ],
  },
  {
    title: 'Curcubeul',
    sentences: [
      'Curcubeul apare atunci când plouă și, în același timp, strălucește soarele.',
      'Lumina soarelui trece prin picăturile de ploaie și se desface în culori.',
      'Curcubeul are șapte culori: roșu, portocaliu, galben, verde, albastru, indigo și violet.',
      'Ca să îl vezi, trebuie să stai cu spatele la soare.',
      'Uneori se văd două curcubeie, unul deasupra celuilalt.',
      'Curcubeul nu poate fi atins, pentru că este făcut doar din lumină.',
    ],
    questions: [
      wq('Despre ce este vorba în text?', ['despre ploaie', 'despre curcubeu', 'despre soare'], 1),
      wq('Când apare curcubeul?', ['când ninge', 'când este noapte', 'când plouă și strălucește soarele'], 2),
      wq('Câte culori are curcubeul?', ['șapte', 'cinci', 'zece'], 0),
      wq('Cum trebuie să stai ca să vezi curcubeul?', ['cu fața la soare', 'cu spatele la soare', 'cu ochii închiși'], 1),
      wq('De ce nu poate fi atins curcubeul?', ['pentru că este prea sus', 'pentru că este fierbinte', 'pentru că este făcut din lumină'], 2),
    ],
  },
  {
    title: 'Bunicul și stupii',
    sentences: [
      'Bunicul Sarei are zece stupi la marginea pădurii.',
      'Vara, Sara îl ajută să scoată mierea.',
      'Ei poartă pălării cu plasă, ca să nu fie înțepați.',
      'Bunicul scoate ramele din stup, iar Sara le duce la storcător.',
      'Mierea curge aurie într-un vas mare.',
      'La sfârșit, o pun în borcane și lipesc etichete.',
      'Sara îi duce un borcan doamnei învățătoare.',
      'Restul mierii se păstrează pentru iarnă.',
    ],
    questions: [
      wq('Despre ce este vorba în text?', ['despre o zi la pescuit', 'despre cum se scoate mierea', 'despre o excursie în pădure'], 1),
      wq('Câți stupi are bunicul?', ['zece', 'doi', 'o sută'], 0),
      wq('De ce poartă pălării cu plasă?', ['ca să nu îi ardă soarele', 'ca să fie eleganți', 'ca să nu fie înțepați'], 2),
      wq('Unde duce Sara ramele?', ['la storcător', 'în pivniță', 'la piață'], 0),
      wq('Cui îi duce Sara un borcan cu miere?', ['unei vecine', 'doamnei învățătoare', 'unei colege'], 1),
    ],
  },
  {
    title: 'Ziua Pământului',
    sentences: [
      'Pe 22 aprilie, în toată lumea se sărbătorește Ziua Pământului.',
      'Elevii școlii noastre au hotărât să facă ceva folositor.',
      'Clasele mici au strâns hârtiile din curte.',
      'Clasa a II-a a plantat cinci tei lângă gard.',
      'Elevii mai mari au vopsit băncile din parc.',
      'Doamna directoare a adus saci pentru plastic, hârtie și sticlă.',
      'La sfârșitul zilei, curtea arăta ca nouă.',
      'Copiii au promis să o păstreze curată tot anul.',
    ],
    questions: [
      wq('Despre ce este vorba în text?', ['despre o serbare de iarnă', 'despre un concurs de sport', 'despre Ziua Pământului la școală'], 2),
      wq('Când se sărbătorește Ziua Pământului?', ['pe 22 aprilie', 'pe 1 iunie', 'pe 1 martie'], 0),
      wq('Ce a plantat clasa a II-a?', ['trandafiri', 'cinci tei', 'doi brazi'], 1),
      wq('Ce au vopsit elevii mai mari?', ['gardul școlii', 'ușile claselor', 'băncile din parc'], 2),
      wq('Pentru ce erau sacii?', ['pentru plastic, hârtie și sticlă', 'pentru frunze', 'pentru jucării'], 0),
    ],
  },
];

// ───────────────────────── Fișa cărții, jurnalul de lectură (clasa pregătitoare, I, a II-a) ─────────────────────────

/** What a set of „Fișa cărții” is: the card of one book (sets 1–3) or the reading log (sets 4–6). */
export const BOOK_FORMS: ('card' | 'log')[] = ['card', 'card', 'card', 'log', 'log', 'log'];
