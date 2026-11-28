/**
 * Ready-made word lists for „Cuvinte de trasat” (generator → Conținut → „Liste de cuvinte”).
 * Simple, concrete words for grădiniță and clasa pregătitoare, in small letters (the sheet writes
 * them in the letter mode chosen), with ș/ț written with the comma below.
 *
 * Loaded only when the lists are opened (dynamic import from word-lists.tsx), so no other page
 * carries them. Checked by src/lib/__tests__/word-lists.test.ts.
 */

export interface WordList {
  /** The letter (as in the alphabet grid: „A”, „Ș”) or the theme's id. */
  id: string;
  /** What the list is called in the generator. */
  title: string;
  words: readonly string[];
  /**
   * Words in which the letter is somewhere (Ă, Â, Q, W, X, Y: hardly any Romanian word starts with
   * them). Unset: every word starts with the letter.
   */
  inside?: boolean;
}

/** The 31 letters of the Romanian alphabet, each with its words. */
export const LETTER_LISTS: readonly WordList[] = [
  { id: 'A', title: 'Litera A', words: ['albină', 'avion', 'apă', 'ac', 'arici', 'ață', 'ardei', 'autobuz', 'ancoră', 'alună', 'acvariu', 'ananas'] },
  { id: 'Ă', title: 'Litera Ă', inside: true, words: ['măr', 'casă', 'vacă', 'rață', 'mătură', 'cămașă', 'pălărie', 'broască', 'băiat', 'fată', 'păpușă', 'lăbuță'] },
  { id: 'Â', title: 'Litera Â', inside: true, words: ['mână', 'câine', 'pâine', 'lână', 'gâscă', 'cântec', 'râu', 'vânt', 'fântână', 'rândunică', 'cârtiță'] },
  { id: 'B', title: 'Litera B', words: ['balon', 'banană', 'barcă', 'bec', 'brad', 'broască', 'bluză', 'bunică', 'buburuză', 'biscuit', 'bicicletă', 'burete'] },
  { id: 'C', title: 'Litera C', words: ['casă', 'cal', 'cană', 'carte', 'ceas', 'cireașă', 'ciupercă', 'creion', 'cub', 'cutie', 'copac', 'căciulă'] },
  { id: 'D', title: 'Litera D', words: ['dinte', 'deget', 'dulap', 'dovleac', 'delfin', 'dop', 'desen', 'drum', 'dans', 'dulceață'] },
  { id: 'E', title: 'Litera E', words: ['elefant', 'elev', 'elicopter', 'ecran', 'etaj', 'echipă', 'eșarfă', 'evantai', 'erou', 'ecou'] },
  { id: 'F', title: 'Litera F', words: ['floare', 'fluture', 'frunză', 'fular', 'fată', 'fereastră', 'farfurie', 'furculiță', 'fragă', 'fruct', 'fluier', 'foarfecă'] },
  { id: 'G', title: 'Litera G', words: ['gard', 'găină', 'gâscă', 'girafă', 'ghiozdan', 'ghindă', 'grădină', 'gumă', 'ghete', 'gutuie', 'gem', 'glob'] },
  { id: 'H', title: 'Litera H', words: ['haină', 'hartă', 'hârtie', 'hamac', 'hamster', 'hipopotam', 'horă', 'hambar', 'hotel'] },
  { id: 'I', title: 'Litera I', words: ['iarbă', 'iepure', 'ied', 'iarnă', 'inimă', 'insulă', 'iglu', 'iaurt', 'inel', 'iaz'] },
  { id: 'Î', title: 'Litera Î', words: ['înghețată', 'înot', 'înotător', 'împărat', 'împărăteasă', 'învățătoare', 'încălțăminte', 'încăpere', 'întrebare'] },
  { id: 'J', title: 'Litera J', words: ['joc', 'jucărie', 'jeleu', 'jachetă', 'jaguar', 'jumătate', 'jder', 'jurnal'] },
  { id: 'K', title: 'Litera K', words: ['koala', 'kiwi', 'karate', 'kimono', 'kilogram', 'kilometru', 'ketchup', 'karaoke'] },
  { id: 'L', title: 'Litera L', words: ['lună', 'lalea', 'leu', 'lămâie', 'lapte', 'lingură', 'lup', 'lac', 'lebădă', 'lampă', 'lopată', 'legume'] },
  { id: 'M', title: 'Litera M', words: ['mamă', 'măr', 'minge', 'mașină', 'masă', 'melc', 'morcov', 'munte', 'mare', 'mănuși', 'mătură', 'miere'] },
  { id: 'N', title: 'Litera N', words: ['nas', 'nor', 'nucă', 'nap', 'nisip', 'ninsoare', 'nasture', 'noapte', 'nufăr', 'nepot'] },
  { id: 'O', title: 'Litera O', words: ['oaie', 'ou', 'ochi', 'oală', 'om', 'ochelari', 'orez', 'oraș', 'oglindă', 'omidă', 'os'] },
  { id: 'P', title: 'Litera P', words: ['pisică', 'pom', 'pâine', 'pară', 'pește', 'păpușă', 'pantof', 'pat', 'pernă', 'pix', 'ploaie', 'pui'] },
  { id: 'Q', title: 'Litera Q', inside: true, words: ['quiz', 'squash', 'quad'] },
  { id: 'R', title: 'Litera R', words: ['rață', 'rac', 'roată', 'roșie', 'rochie', 'rinocer', 'ridiche', 'rucsac', 'raft', 'ren', 'robot', 'râu'] },
  { id: 'S', title: 'Litera S', words: ['soare', 'sanie', 'stea', 'scaun', 'săpun', 'struguri', 'salată', 'sticlă', 'soră', 'sat', 'semafor', 'sare'] },
  { id: 'Ș', title: 'Litera Ș', words: ['școală', 'șoarece', 'șarpe', 'șosete', 'șal', 'șapcă', 'șurub', 'șină', 'șervețel', 'șorț', 'șotron', 'șoim'] },
  { id: 'T', title: 'Litera T', words: ['tată', 'tren', 'telefon', 'trandafir', 'tobă', 'tigru', 'tort', 'tablă', 'trotinetă', 'tractor', 'toamnă', 'turn'] },
  { id: 'Ț', title: 'Litera Ț', words: ['țestoasă', 'țânțar', 'țurțur', 'țelină', 'țiglă', 'țap', 'țintă', 'țeavă', 'țară'] },
  { id: 'U', title: 'Litera U', words: ['urs', 'umbrelă', 'unghie', 'ureche', 'unt', 'ușă', 'unicorn', 'undiță', 'uliu', 'unchi'] },
  { id: 'V', title: 'Litera V', words: ['vacă', 'vulpe', 'vapor', 'vază', 'vioară', 'veveriță', 'varză', 'vrabie', 'vultur', 'vagon', 'val', 'vară'] },
  { id: 'W', title: 'Litera W', inside: true, words: ['weekend', 'windsurf', 'wok', 'wigwam', 'kiwi', 'bowling'] },
  { id: 'X', title: 'Litera X', inside: true, words: ['xilofon', 'taxi', 'saxofon', 'boxă', 'excavator', 'extraterestru', 'mixer', 'pix'] },
  { id: 'Y', title: 'Litera Y', inside: true, words: ['yoga', 'yo-yo', 'hobby', 'rugby'] },
  { id: 'Z', title: 'Litera Z', words: ['zebră', 'zmeu', 'zar', 'zăpadă', 'zahăr', 'zid', 'zână', 'zmeură', 'ziar', 'zambilă', 'zi', 'zâmbet'] },
];

/**
 * „Grupuri de litere”: ce, ci, ge, gi, che, chi, ghe, ghi (clasa pregătitoare, clasa I). Every word has
 * its group (not always at the start: arici, ureche, unghie).
 */
export const GROUP_LISTS: readonly WordList[] = [
  { id: 'ce', title: 'Grupul ce', words: ['ceas', 'cer', 'ceapă', 'cerc', 'ceai', 'cercel', 'ceață', 'cerneală', 'dulceață', 'rece'] },
  { id: 'ci', title: 'Grupul ci', words: ['cireș', 'cireașă', 'ciocan', 'cioară', 'ciorap', 'ciupercă', 'cinci', 'cizme', 'arici', 'ciocolată'] },
  { id: 'ge', title: 'Grupul ge', words: ['gem', 'geam', 'geantă', 'ger', 'genunchi', 'îngeraș', 'mărgele', 'degete', 'fulger'] },
  { id: 'gi', title: 'Grupul gi', words: ['girafă', 'gimnastică', 'regină', 'pagină', 'fragi', 'mingi', 'magician', 'argint', 'magie'] },
  { id: 'che', title: 'Grupul che', words: ['cheie', 'chec', 'ureche', 'ochelari', 'pereche', 'ridiche', 'chenar', 'buchet', 'veche'] },
  { id: 'chi', title: 'Grupul chi', words: ['chitară', 'ochi', 'rochie', 'unchi', 'chiflă', 'chioșc', 'urechi', 'chipiu', 'chiuvetă', 'genunchi'] },
  { id: 'ghe', title: 'Grupul ghe', words: ['gheață', 'gheată', 'ghete', 'ghem', 'gheară', 'ghepard', 'ghețar', 'înghețată'] },
  { id: 'ghi', title: 'Grupul ghi', words: ['ghindă', 'ghiocel', 'ghiozdan', 'unghie', 'ghimpe', 'ghidon', 'ghicitoare', 'ghirlandă', 'ghiveci'] },
];

/** Themes of the programme for grădiniță and clasa pregătitoare. */
export const THEME_LISTS: readonly WordList[] = [
  { id: 'toamna', title: 'Toamna', words: ['frunză', 'ploaie', 'umbrelă', 'struguri', 'dovleac', 'măr', 'pară', 'nucă', 'ghindă', 'castană', 'ciupercă', 'vânt', 'nor', 'gutuie'] },
  { id: 'iarna', title: 'Iarna', words: ['zăpadă', 'fulg', 'sanie', 'schiuri', 'patine', 'om de zăpadă', 'căciulă', 'fular', 'mănuși', 'gheață', 'țurțur', 'brad', 'ninsoare'] },
  { id: 'primavara', title: 'Primăvara', words: ['ghiocel', 'lalea', 'zambilă', 'mugur', 'floare', 'iarbă', 'fluture', 'albină', 'rândunică', 'barză', 'soare', 'ploaie', 'cuib', 'mieluț', 'viorea'] },
  { id: 'vara', title: 'Vara', words: ['soare', 'mare', 'nisip', 'plajă', 'scoică', 'pălărie', 'ochelari', 'înghețată', 'minge', 'val', 'cireașă', 'pepene', 'vacanță', 'căpșună', 'cort'] },
  { id: 'familia', title: 'Familia', words: ['mamă', 'tată', 'frate', 'soră', 'bunic', 'bunică', 'bebeluș', 'unchi', 'mătușă', 'văr', 'verișoară', 'nepot', 'casă', 'familie'] },
  { id: 'corpul', title: 'Corpul omenesc', words: ['cap', 'păr', 'ochi', 'nas', 'gură', 'ureche', 'mână', 'deget', 'picior', 'genunchi', 'umăr', 'dinte', 'limbă', 'gât', 'cot'] },
  { id: 'animale-domestice', title: 'Animale domestice', words: ['câine', 'pisică', 'vacă', 'cal', 'oaie', 'capră', 'porc', 'găină', 'cocoș', 'rață', 'gâscă', 'curcan', 'iepure', 'măgar', 'pui'] },
  { id: 'animale-salbatice', title: 'Animale sălbatice', words: ['urs', 'lup', 'vulpe', 'bufniță', 'veveriță', 'arici', 'căprioară', 'mistreț', 'leu', 'tigru', 'elefant', 'girafă', 'zebră', 'maimuță', 'crocodil'] },
  { id: 'fructe', title: 'Fructe', words: ['măr', 'pară', 'prună', 'cireașă', 'căpșună', 'banană', 'portocală', 'lămâie', 'struguri', 'piersică', 'caisă', 'pepene', 'gutuie', 'kiwi', 'ananas'] },
  { id: 'legume', title: 'Legume', words: ['morcov', 'cartof', 'roșie', 'castravete', 'ceapă', 'usturoi', 'ardei', 'varză', 'dovleac', 'mazăre', 'fasole', 'ridiche', 'vânătă', 'țelină', 'salată'] },
  { id: 'scoala', title: 'Școala și grădinița', words: ['carte', 'caiet', 'creion', 'ghiozdan', 'penar', 'gumă', 'riglă', 'tablă', 'bancă', 'cretă', 'pensulă', 'foarfecă', 'lipici', 'acuarele', 'învățătoare'] },
  { id: 'transport', title: 'Mijloace de transport', words: ['mașină', 'autobuz', 'tren', 'avion', 'vapor', 'bicicletă', 'tramvai', 'metrou', 'barcă', 'elicopter', 'camion', 'tractor', 'trotinetă', 'taxi', 'rachetă'] },
  { id: 'meserii', title: 'Meserii', words: ['doctor', 'bucătar', 'brutar', 'pompier', 'polițist', 'poștaș', 'croitor', 'pilot', 'șofer', 'fermier', 'pictor', 'frizer', 'vânzător', 'constructor', 'veterinar'] },
  { id: 'culori', title: 'Culori', words: ['roșu', 'galben', 'albastru', 'verde', 'portocaliu', 'mov', 'roz', 'alb', 'negru', 'maro', 'gri', 'auriu'] },
];
