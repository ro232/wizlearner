/**
 * Data of the „Comunicare” sheets that fill the gaps of the programme (see clr-pages.ts):
 *
 * - "story:1–4"   Povestea în imagini — four pictures to put in order and the title to circle
 *                 (CLR CP 3.2: „Identificarea semnificației unei/ unor imagini care prezintă întâmplări,
 *                 fenomene, evenimente familiare”);
 * - "sign:1–3"    Semne și simboluri — set 1 the symbols of immediate need (clasa pregătitoare: „Simboluri
 *                 uzuale din universul apropiat: metrou, intrare, ieșire, spital, trecere de pietoni etc.”),
 *                 set 2 familiar symbols with a simple message (clasa I), set 3 symbols in a known context,
 *                 with the question what to do (clasa a II-a);
 * - "note:1–3"    Felicitarea, biletul, invitația — a message to complete in capitals (CP 4.2, contents
 *                 „Felicitarea”, „Biletul”);
 * - "msg:1–3"     Citește mesajul — an invitation, a poster and a note with questions (II 3.1, contents
 *                 „Biletul…”, „Felicitarea”, „Afișul”);
 * - "written:1–2" Unde este ceva scris? — cards with and without writing (preschool D.3.3).
 *
 * Every story has one order (the pictures grow or change one way only: a seed into a flower, snow into a
 * snowman that melts, an egg into a rooster, sun, clouds, rain, rainbow); every sign one meaning; every
 * question one right answer among three. Pictures are Twemoji, quoted here so that
 * scripts/build-hint-icons.mjs draws them into icons.json; the road signs and a few pictograms that have
 * no faithful emoji (STOP with its word, the pedestrian crossing, H, M, exit, pharmacy, electric danger)
 * are drawn as vector shapes in clr-pages.ts.
 */

export type ClrKind = 'story' | 'sign' | 'note' | 'msg' | 'written';
export const CLR_KINDS: ClrKind[] = ['story', 'sign', 'note', 'msg', 'written'];
export const CLR_SETS: Record<ClrKind, number> = { story: 4, sign: 3, note: 3, msg: 3, written: 2 };

const CLR_ITEM = /^(story:[1-4]|(sign|note|msg):[1-3]|written:[12])$/;

export function isClrItem(item: string): boolean {
  return CLR_ITEM.test(item);
}

/** The free plan: set 1 of each kind; „Semne și simboluri” has one set per class, all three free. */
export function isFreeClrItem(item: string): boolean {
  return isClrItem(item) && (item.endsWith(':1') || item.startsWith('sign:'));
}

// ───────────────────────── Povestea în imagini ─────────────────────────

/** A picture in a panel of 100 × 70 units: its centre and its size. */
export interface PanelPic { e: string; x: number; y: number; s: number }
/** Things drawn in a panel: a snowball, a puddle, falling snow. */
export interface PanelExtra { kind: 'snowball' | 'puddle' | 'flakes'; x: number; y: number; s: number }
export interface Panel {
  pics: PanelPic[];
  ground: 'grass' | 'snow' | 'soil';
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
];

// ───────────────────────── Semne și simboluri ─────────────────────────

/** Signs drawn as vector shapes (clr-pages.ts signOps); every other sign is a Twemoji picture. */
export const DRAWN_SIGNS = ['stop', 'crossing', 'hospital', 'metro', 'exit', 'pharmacy', 'electric'] as const;
export type DrawnSign = (typeof DRAWN_SIGNS)[number];

/** Clasa pregătitoare and clasa I: join the sign with its meaning. [sign, meaning as printed]. */
export const SIGN_MATCH_SETS: [string, string][][] = [
  // CP: „Simboluri uzuale din universul apropiat: metrou, intrare, ieșire, spital, trecere de pietoni etc.” (capitals)
  [['stop', 'OPREȘTE!'], ['crossing', 'TRECERE DE PIETONI'], ['hospital', 'SPITAL'], ['🚾', 'TOALETĂ'], ['exit', 'IEȘIRE'], ['metro', 'METROU']],
  // clasa I: symbols of the familiar world that carry a simple message
  [['♻️', 'Reciclare'], ['🚭', 'Fumatul interzis'], ['electric', 'Pericol: curent electric!'], ['pharmacy', 'Farmacie'], ['🚸', 'Atenție, copii!'], ['⛔', 'Accesul interzis']],
];

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
];

// ───────────────────────── Citește mesajul (clasa a II-a) ─────────────────────────

export interface MessageQuestion { q: string; options: [string, string, string]; answer: number }
export interface MessageSet {
  kind: 'invitatie' | 'afis' | 'bilet';
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
