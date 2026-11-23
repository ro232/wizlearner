/**
 * Words for the phonological-awareness sheets („Sunete și silabe”): the sound a word starts
 * with, how many syllables it has, and how it splits into syllables.
 *
 * Every word was picked so that a child can name its picture without hesitating and the
 * answer is not open to discussion:
 * - common, concrete nouns with one usual name for the picture (no „câine/cățel”, no
 *   „cocoș” whose picture reads as a hen, no plurals pictured as one object);
 * - the first letter is the first sound: no word starts with ce/ci/ge/gi/che/chi/ghe/ghi,
 *   with a diphthong (ea, ia, ie, oa), with x, w, y, k, q, or with h before a consonant;
 * - no hiatus/diphthong doubt in the syllables: vowel sequences are left out, except
 *   a-vi-on and do-vleac, whose split DOOM 3 gives explicitly;
 * - the split is written out by hand following the DOOM 3 rules (one consonant goes to the
 *   next syllable: ca-să; two are split: car-te, unless the second is l or r after
 *   b c d f g h p t v: ca-pră, ri-glă, do-vleac; of three, the first stays: cas-tra-ve-te,
 *   um-bre-lă; ch/gh count as one consonant: re-chin, în-ghe-ța-tă). It is never computed.
 *
 * Checked twice (a second derivation from the rules, then against the dictionaries: dexonline
 * DOOM 3 „desp.” notes and the syllable boundaries of the Wiktionary pronunciations); see
 * src/lib/__tests__/phonology.test.ts. The pictures are Twemoji keys drawn by hints/icons.
 */

export interface PhonoWord {
  word: string;
  /** The syllables, joined they give the word exactly. */
  syllables: string[];
  /** The first sound, written as its capital letter ("A", "Î", "Ș"). */
  initial: string;
  /** Picture key (emoji) in src/lib/hints/icons.json. */
  picture: string;
}

// word, syllables split by "-", first sound (as its capital letter), picture
const RAW: [string, string, string, string][] = [
  ['ac', 'ac', 'A', '🪡'],
  ['albină', 'al-bi-nă', 'A', '🐝'],
  ['ancoră', 'an-co-ră', 'A', '⚓'],
  ['ambulanță', 'am-bu-lan-ță', 'A', '🚑'],
  ['arici', 'a-rici', 'A', '🦔'],
  ['ananas', 'a-na-nas', 'A', '🍍'],
  ['avion', 'a-vi-on', 'A', '✈️'],
  ['bec', 'bec', 'B', '💡'],
  ['brad', 'brad', 'B', '🎄'],
  ['balon', 'ba-lon', 'B', '🎈'],
  ['banană', 'ba-na-nă', 'B', '🍌'],
  ['balenă', 'ba-le-nă', 'B', '🐋'],
  ['bufniță', 'buf-ni-ță', 'B', '🦉'],
  ['burete', 'bu-re-te', 'B', '🧽'],
  ['busolă', 'bu-so-lă', 'B', '🧭'],
  ['bicicletă', 'bi-ci-cle-tă', 'B', '🚲'],
  ['cal', 'cal', 'C', '🐴'],
  ['cort', 'cort', 'C', '⛺'],
  ['coș', 'coș', 'C', '🧺'],
  ['clovn', 'clovn', 'C', '🤡'],
  ['casă', 'ca-să', 'C', '🏠'],
  ['castel', 'cas-tel', 'C', '🏰'],
  ['carte', 'car-te', 'C', '📖'],
  ['cuțit', 'cu-țit', 'C', '🔪'],
  ['cactus', 'cac-tus', 'C', '🌵'],
  ['cartof', 'car-tof', 'C', '🥔'],
  ['cangur', 'can-gur', 'C', '🦘'],
  ['capră', 'ca-pră', 'C', '🐐'],
  ['cadă', 'ca-dă', 'C', '🛁'],
  ['cupă', 'cu-pă', 'C', '🏆'],
  ['căpșună', 'căp-șu-nă', 'C', '🍓'],
  ['cămilă', 'că-mi-lă', 'C', '🐫'],
  ['crocodil', 'cro-co-dil', 'C', '🐊'],
  ['castravete', 'cas-tra-ve-te', 'C', '🥒'],
  ['duș', 'duș', 'D', '🚿'],
  ['delfin', 'del-fin', 'D', '🐬'],
  ['dinte', 'din-te', 'D', '🦷'],
  ['dovleac', 'do-vleac', 'D', '🎃'],
  ['elefant', 'e-le-fant', 'E', '🐘'],
  ['elicopter', 'e-li-cop-ter', 'E', '🚁'],
  ['foc', 'foc', 'F', '🔥'],
  ['fulg', 'fulg', 'F', '❄️'],
  ['frunză', 'frun-ză', 'F', '🍁'],
  ['focă', 'fo-că', 'F', '🦭'],
  ['fular', 'fu-lar', 'F', '🧣'],
  ['fulger', 'ful-ger', 'F', '⚡'],
  ['fluture', 'flu-tu-re', 'F', '🦋'],
  ['furnică', 'fur-ni-că', 'F', '🐜'],
  ['fantomă', 'fan-to-mă', 'F', '👻'],
  ['gărgăriță', 'găr-gă-ri-ță', 'G', '🐞'],
  ['hartă', 'har-tă', 'H', '🗺️'],
  ['hipopotam', 'hi-po-po-tam', 'H', '🦛'],
  ['inel', 'i-nel', 'I', '💍'],
  ['inimă', 'i-ni-mă', 'I', '❤️'],
  ['insulă', 'in-su-lă', 'I', '🏝️'],
  ['înghețată', 'în-ghe-ța-tă', 'Î', '🍦'],
  ['lup', 'lup', 'L', '🐺'],
  ['lacăt', 'la-căt', 'L', '🔒'],
  ['limbă', 'lim-bă', 'L', '👅'],
  ['lupă', 'lu-pă', 'L', '🔍'],
  ['lună', 'lu-nă', 'L', '🌙'],
  ['lebădă', 'le-bă-dă', 'L', '🦢'],
  ['lingură', 'lin-gu-ră', 'L', '🥄'],
  ['lumânare', 'lu-mâ-na-re', 'L', '🕯️'],
  ['măr', 'măr', 'M', '🍎'],
  ['melc', 'melc', 'M', '🐌'],
  ['minge', 'min-ge', 'M', '⚽'],
  ['morcov', 'mor-cov', 'M', '🥕'],
  ['mână', 'mâ-nă', 'M', '✋'],
  ['magnet', 'mag-net', 'M', '🧲'],
  ['munte', 'mun-te', 'M', '⛰️'],
  ['mătură', 'mă-tu-ră', 'M', '🧹'],
  ['mașină', 'ma-și-nă', 'M', '🚗'],
  ['microfon', 'mi-cro-fon', 'M', '🎤'],
  ['nor', 'nor', 'N', '☁️'],
  ['os', 'os', 'O', '🦴'],
  ['oglindă', 'o-glin-dă', 'O', '🪞'],
  ['porc', 'porc', 'P', '🐷'],
  ['pat', 'pat', 'P', '🛏️'],
  ['plic', 'plic', 'P', '✉️'],
  ['pară', 'pa-ră', 'P', '🍐'],
  ['porumb', 'po-rumb', 'P', '🌽'],
  ['panda', 'pan-da', 'P', '🐼'],
  ['pește', 'peș-te', 'P', '🐟'],
  ['pantof', 'pan-tof', 'P', '👞'],
  ['pisică', 'pi-si-că', 'P', '🐱'],
  ['papagal', 'pa-pa-gal', 'P', '🦜'],
  ['pepene', 'pe-pe-ne', 'P', '🍉'],
  ['pensulă', 'pen-su-lă', 'P', '🖌️'],
  ['portocală', 'por-to-ca-lă', 'P', '🍊'],
  ['parașută', 'pa-ra-șu-tă', 'P', '🪂'],
  ['rechin', 're-chin', 'R', '🦈'],
  ['rață', 'ra-ță', 'R', '🦆'],
  ['riglă', 'ri-glă', 'R', '📏'],
  ['robot', 'ro-bot', 'R', '🤖'],
  ['rinocer', 'ri-no-cer', 'R', '🦏'],
  ['rachetă', 'ra-che-tă', 'R', '🚀'],
  ['suc', 'suc', 'S', '🧃'],
  ['săpun', 'să-pun', 'S', '🧼'],
  ['scară', 'sca-ră', 'S', '🪜'],
  ['semafor', 'se-ma-for', 'S', '🚦'],
  ['șarpe', 'șar-pe', 'Ș', '🐍'],
  ['șosete', 'șo-se-te', 'Ș', '🧦'],
  ['tort', 'tort', 'T', '🎂'],
  ['tren', 'tren', 'T', '🚂'],
  ['tigru', 'ti-gru', 'T', '🐯'],
  ['topor', 'to-por', 'T', '🪓'],
  ['tobă', 'to-bă', 'T', '🥁'],
  ['tractor', 'trac-tor', 'T', '🚜'],
  ['trompetă', 'trom-pe-tă', 'T', '🎺'],
  ['telefon', 'te-le-fon', 'T', '📱'],
  ['trandafir', 'tran-da-fir', 'T', '🌹'],
  ['televizor', 'te-le-vi-zor', 'T', '📺'],
  ['trotinetă', 'tro-ti-ne-tă', 'T', '🛴'],
  ['urs', 'urs', 'U', '🐻'],
  ['ușă', 'u-șă', 'U', '🚪'],
  ['umbrelă', 'um-bre-lă', 'U', '☂️'],
  ['ureche', 'u-re-che', 'U', '👂'],
  ['unicorn', 'u-ni-corn', 'U', '🦄'],
  ['val', 'val', 'V', '🌊'],
  ['vulpe', 'vul-pe', 'V', '🦊'],
  ['vacă', 'va-că', 'V', '🐄'],
  ['vulcan', 'vul-can', 'V', '🌋'],
  ['veveriță', 've-ve-ri-ță', 'V', '🐿️'],
  ['zar', 'zar', 'Z', '🎲'],
  ['zebră', 'ze-bră', 'Z', '🦓'],
];

export const PHONO_WORDS: PhonoWord[] = RAW.map(([word, split, initial, picture]) => ({ word, syllables: split.split('-'), initial, picture }));
