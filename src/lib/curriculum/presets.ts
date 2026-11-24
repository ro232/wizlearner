/**
 * The sheets the generator can make, as ready-made starting points, and which curriculum
 * competences each one covers in each class. Used by the „Fișe pe programă” pages: for every
 * competence of a class they list the sheets that practise it (computed with the same mapping
 * that prints the code on the sheet, so a page never promises a code the sheet will not print).
 */
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { PROGRAMMES, type CompetenceRef, type ProgrammeId, type SpecificCompetence } from './index';
import { sheetCompetences, type SchoolLevel } from './sheet';

export interface SheetPreset {
  id: string;
  title: string;
  /** One line: what the child does on it. */
  text: string;
  /** The generator settings it opens with (the class is added by the link). */
  config: Partial<WorksheetConfig>;
  /** Only these classes list it (unset: every class whose codes it prints). */
  levels?: SchoolLevel[];
  /** Settings that differ by class (merged over `config`). */
  byLevel?: Partial<Record<SchoolLevel, Partial<WorksheetConfig>>>;
  /** An „Evaluare” (config.evaluation): listed apart on the class page, not under each competence. */
  evaluation?: boolean;
}

/** The free items are used where possible, so anyone can try the sheet straight away. */
export const SHEET_PRESETS: SheetPreset[] = [
  { id: 'litere-tipar', title: 'Litere de tipar de trasat', text: 'Litera, apoi rânduri de urmărit și de scris singur.', config: { category: 'letters', selectedItems: ['A', 'B', 'C'], letterMode: 'uppercase', script: 'print' } },
  { id: 'litere-perechi', title: 'Litere mari și mici de tipar', text: 'Aa, Bb, Cc: litera mare și cea mică pe același rând.', config: { category: 'letters', selectedItems: ['Aa', 'Bb', 'Cc'], letterMode: 'paired', script: 'print' } },
  { id: 'litere-mana', title: 'Litere de mână', text: 'Scrisul de mână de la școală, pe liniatură tip I.', config: { category: 'letters', selectedItems: ['Aa', 'Bb', 'Cc'], letterMode: 'paired', script: 'cursive' } },
  { id: 'grafisme', title: 'Elemente grafice', text: 'Linii, zigzag, valuri: mâna se pregătește pentru litere.', config: { category: 'prewrite', selectedItems: ['vertical', 'zigzag', 'waves'] } },
  { id: 'cifre', title: 'Cifre de trasat', text: 'Cifrele cu ordinea liniilor, de urmărit și de scris.', config: { category: 'numbers', selectedItems: ['1', '2', '3'] } },
  { id: 'forme', title: 'Forme geometrice de trasat', text: 'Cerc, pătrat, triunghi, dreptunghi.', config: { category: 'shapes', selectedItems: ['circle', 'square', 'triangle', 'rectangle'] } },
  { id: 'mate-compara', title: 'Compară numerele', text: 'Pune semnul potrivit: <, > sau =.', config: { category: 'math', selectedItems: ['cmp'] } },
  { id: 'mate-adunari', title: 'Adunări', text: 'Adunări cu rezultatul în concentrul clasei.', config: { category: 'math', selectedItems: ['add'] } },
  { id: 'mate-scaderi', title: 'Scăderi', text: 'Scăderi fără rezultat negativ.', config: { category: 'math', selectedItems: ['sub'] } },
  { id: 'mate-imagini', title: 'Adunări cu imagini', text: 'Numără obiectele desenate și scrie suma.', config: { category: 'math', selectedItems: ['addpic'] } },
  { id: 'mate-lipsa', title: 'Numărul care lipsește', text: 'Află termenul necunoscut.', config: { category: 'math', selectedItems: ['missing'] } },
  { id: 'mate-sir', title: 'Completează șirul', text: 'Numerele în ordine, cu golurile de completat.', config: { category: 'math', selectedItems: ['seq'] } },
  { id: 'mate-vecini', title: 'Vecinii numerelor', text: 'Numărul dinainte și cel de după.', config: { category: 'math', selectedItems: ['nbr'] } },
  { id: 'mate-bani', title: 'Banii', text: 'Numără, compară și schimbă bancnote de 1 leu, 5 lei, 10 lei; la clasa a II-a și de 100, 200, 500 de lei.', config: { category: 'math', selectedItems: ['money'] } },
  { id: 'mate-probleme', title: 'Probleme cu imagini', text: 'Probleme scurte de adunare și scădere, cu obiectele desenate.', config: { category: 'math', selectedItems: ['problems'] } },
  { id: 'mate-adunari-31', title: 'Adunări 0–31', text: 'Adaugi 1–5 unități, fără și cu trecere peste ordin.', config: { category: 'math', selectedItems: ['add'], mathRange: 31 }, levels: ['CP'] },
  { id: 'gaseste-litera', title: 'Găsește litera', text: 'Colorează litera căutată printre celelalte.', config: { category: 'games', selectedItems: ['find:A'] } },
  { id: 'numara', title: 'Numără și scrie', text: 'Numără obiectele și scrie numărul.', config: { category: 'games', selectedItems: ['count:5'] } },
  { id: 'uneste-punctele', title: 'Unește punctele', text: 'Unește punctele în ordinea numerelor.', config: { category: 'games', selectedItems: ['dots:star'] } },
  // „Sunete și silabe”
  { id: 'sunetul-initial', title: 'Sunetul de la început', text: 'Încercuiește imaginile care încep cu sunetul dat.', config: { category: 'games', selectedItems: ['sound:A'] } },
  { id: 'primul-sunet', title: 'Primul sunet', text: 'Scrie sub imagine litera cu care începe cuvântul.', config: { category: 'games', selectedItems: ['first:1'] } },
  { id: 'cate-silabe', title: 'Câte silabe are cuvântul?', text: 'Colorează câte o bulină pentru fiecare silabă.', config: { category: 'games', selectedItems: ['syl:1'] } },
  { id: 'desparte-silabe', title: 'Desparte în silabe', text: 'Urmărește silabele, apoi scrie-le singur în căsuțe.', config: { category: 'games', selectedItems: ['split:1'] } },
  // Sortare, grupare, orientare în spațiu
  { id: 'sorteaza', title: 'Sortează', text: 'Unește fiecare imagine cu grupa ei: fructe sau legume.', config: { category: 'games', selectedItems: ['sort:1'] }, levels: ['presc', 'CP'] },
  { id: 'intrusul', title: 'Ce nu se potrivește?', text: 'Taie imaginea care nu face parte din grupă.', config: { category: 'games', selectedItems: ['odd:1'] }, levels: ['presc'] },
  { id: 'grupeaza-numara', title: 'Grupează și numără', text: 'Numără fiecare fel de fruct și scrie numărul în tabel.', config: { category: 'games', selectedItems: ['group:1'] }, levels: ['presc', 'CP'] },
  { id: 'orientare', title: 'Unde se află?', text: 'Pe masă, sub masă, deasupra, în cutie, în stânga: încercuiește.', config: { category: 'games', selectedItems: ['pos:1'] }, levels: ['CP', 'I'] },
  // „Citire și scriere”: the set written for each class (a set prints its code only in its class)
  { id: 'citire-uneste', title: 'Unește cuvântul cu imaginea', text: 'Citește cuvântul și unește-l cu imaginea lui.', config: { category: 'games', selectedItems: ['read:match:1'] }, byLevel: { I: { selectedItems: ['read:match:4'] } }, levels: ['CP', 'I'] },
  { id: 'citire-litera-lipsa', title: 'Ce literă lipsește?', text: 'Scrie litera care lipsește din numele imaginii.', config: { category: 'games', selectedItems: ['read:gap:1'] }, byLevel: { I: { selectedItems: ['read:gap:3'] }, II: { selectedItems: ['read:gap:5'] } }, levels: ['CP', 'I', 'II'] },
  { id: 'citire-deseneaza', title: 'Citește și desenează', text: 'Citește „un nor”, „doi nori” și desenează în căsuță.', config: { category: 'games', selectedItems: ['read:draw:1'] }, byLevel: { I: { selectedItems: ['read:draw:4'] } }, levels: ['CP', 'I'] },
  { id: 'citire-completeaza', title: 'Completează propoziția', text: 'Alege cuvântul potrivit și scrie-l pe linie.', config: { category: 'games', selectedItems: ['read:fill:1'] }, levels: ['I'] },
  { id: 'citire-ordoneaza', title: 'Ordonează cuvintele', text: 'Așază cuvintele în ordine și scrie propoziția de mână.', config: { category: 'games', selectedItems: ['read:order:1'] }, byLevel: { II: { selectedItems: ['read:order:4'] } }, levels: ['I', 'II'] },
  { id: 'citire-copiaza', title: 'Copiază', text: 'Cuvinte de tipar la pregătitoare; propoziții de mână, pe liniatura caietului, la clasa I și a II-a.', config: { category: 'games', selectedItems: ['read:copy:1'] }, byLevel: { I: { selectedItems: ['read:copy:3'] }, II: { selectedItems: ['read:copy:5'] } }, levels: ['CP', 'I', 'II'] },
  { id: 'citire-text', title: 'Citește și răspunde', text: 'Un text scurt și trei întrebări despre el.', config: { category: 'games', selectedItems: ['read:text:1'] }, byLevel: { II: { selectedItems: ['read:text:4'] } }, levels: ['I', 'II'] },
  // Înmulțire și împărțire, ceasul, calendarul, măsurări, figuri (multiply.ts … figures.ts)
  { id: 'mate-grupe', title: 'Grupe egale', text: '3 grupe a câte 4: 4 + 4 + 4; la clasa a II-a și 3 · 4.', config: { category: 'math', selectedItems: ['groups'] }, levels: ['CP', 'I', 'II'] },
  { id: 'mate-inmultiri', title: 'Înmulțiri', text: 'Tabla înmulțirii: una aleasă (2–10) sau toate amestecate.', config: { category: 'math', selectedItems: ['mul'] }, levels: ['II', 'III'] },
  { id: 'mate-impartiri', title: 'Împărțiri', text: 'Împărțiri exacte din tabla împărțirii, numere până la 100.', config: { category: 'math', selectedItems: ['div'] }, levels: ['II', 'III'] },
  { id: 'mate-factor-lipsa', title: 'Numărul lipsă la înmulțire și împărțire', text: '3 · □ = 12, □ : 4 = 5.', config: { category: 'math', selectedItems: ['mulmiss'] }, levels: ['II', 'III'] },
  {
    id: 'mate-ceas', title: 'Cât este ceasul?', text: 'Citește ora pe ceas și scrie-o: ora fixă și jumătatea; la clasa a II-a și sferturi, minute.',
    config: { category: 'math', selectedItems: ['clock'] }, levels: ['I', 'II', 'III'], byLevel: { I: { mathClock: 'half' }, II: { mathClock: 'five' }, III: { mathClock: 'five' } },
  },
  {
    id: 'mate-ceas-acele', title: 'Desenează acele ceasului', text: 'Ora scrisă sub ceas, acele de desenat.',
    config: { category: 'math', selectedItems: ['clockdraw'] }, levels: ['I', 'II', 'III'], byLevel: { I: { mathClock: 'half' }, II: { mathClock: 'five' }, III: { mathClock: 'five' } },
  },
  { id: 'mate-saptamana', title: 'Zilele săptămânii', text: 'Zilele în ordine, ziua de după și cea dinainte, ieri și mâine.', config: { category: 'math', selectedItems: ['week'] }, levels: ['CP', 'I', 'II'] },
  { id: 'mate-luni', title: 'Lunile anului și anotimpurile', text: 'Lunile și anotimpurile în ordine, anotimpul fiecărei luni.', config: { category: 'math', selectedItems: ['months'] }, levels: ['I', 'II'] },
  { id: 'mate-calendar', title: 'Calendarul lunii', text: 'Citește calendarul: ziua săptămânii, poimâine, alaltăieri.', config: { category: 'math', selectedItems: ['calmonth'] }, levels: ['II'] },
  { id: 'mate-lungimi', title: 'Măsoară cu cuburi sau agrafe', text: 'Câte unități are fiecare obiect; cel mai lung, cel mai scurt.', config: { category: 'math', selectedItems: ['length'] }, levels: ['presc', 'CP', 'I', 'II'] },
  { id: 'mate-balanta', title: 'Mai greu, mai ușor', text: 'Balanța coboară spre obiectul mai greu: încercuiește.', config: { category: 'math', selectedItems: ['mass'] }, levels: ['presc', 'II'] },
  { id: 'mate-rigla', title: 'Măsoară cu rigla', text: 'Lungimi în centimetri pe riglă, linii de desenat.', config: { category: 'math', selectedItems: ['ruler'] }, levels: ['I', 'II'] },
  { id: 'mate-unitati', title: 'Unități de măsură', text: 'Metrul, centimetrul, litrul, kilogramul; instrumente; 1 m = 100 cm.', config: { category: 'math', selectedItems: ['units'] }, levels: ['II'] },
  { id: 'mate-figuri', title: 'Figuri geometrice în desen', text: 'Numără pătratele, dreptunghiurile, triunghiurile și cercurile.', config: { category: 'math', selectedItems: ['figures'] }, levels: ['presc', 'CP', 'I'] },
  // Fișe distractive și „Explorarea mediului” (fun-pages.ts, explore-pages.ts): set 1 of each, free
  { id: 'coloreaza-dupa-cod', title: 'Colorează după cod', text: 'Un desen cu numere de la 1 la 5: fiecare parte cu culoarea numărului ei.', config: { category: 'games', selectedItems: ['color:1'] }, levels: ['presc'] },
  { id: 'calculeaza-coloreaza', title: 'Calculează și colorează', text: 'Adunări și scăderi cu rezultatul 1–5: fiecare parte cu culoarea rezultatului.', config: { category: 'games', selectedItems: ['colsum:1'] }, levels: ['CP'] },
  { id: 'urmareste-linia', title: 'Urmărește linia', text: 'Linii punctate de la imagine la imagine, de urmărit cu creionul.', config: { category: 'games', selectedItems: ['trace:1'] }, levels: ['presc', 'CP'] },
  // no behaviour or competence names these three (sheet.ts prints no code): listed only on /fise-de-lucru
  { id: 'labirint', title: 'Labirint', text: 'Un singur drum de la imagine la imagine, în 6 × 6, 9 × 9 sau 12 × 12 căsuțe.', config: { category: 'games', selectedItems: ['maze:1'] }, levels: ['presc'] },
  { id: 'gaseste-diferentele', title: 'Găsește diferențele', text: 'Aceeași imagine de două ori; în a doua se schimbă 3–5 lucruri.', config: { category: 'games', selectedItems: ['diff:1'] }, levels: ['presc'] },
  { id: 'gaseste-umbra', title: 'Găsește umbra', text: 'Șase imagini și umbrele lor: unește fiecare imagine cu umbra ei.', config: { category: 'games', selectedItems: ['shadow:1'] }, levels: ['presc'] },
  { id: 'partile-plantei', title: 'Părțile plantei', text: 'Rădăcină, tulpină, frunză, floare, fruct: scrie sau lipește cuvântul în căsuță.', config: { category: 'games', selectedItems: ['plant:1'] }, levels: ['presc', 'CP'] },
  { id: 'partile-corpului', title: 'Părțile corpului', text: 'Cap, gât, trunchi, mâini, picioare: scrie sau lipește cuvântul în căsuță.', config: { category: 'games', selectedItems: ['body:1'] }, levels: ['presc', 'CP'] },
  { id: 'simturile', title: 'Simțurile', text: 'Unește ochiul, urechea, nasul, limba și mâna cu simțul lor.', config: { category: 'games', selectedItems: ['senses:1'] }, levels: ['presc', 'CP'] },
  { id: 'cine-unde-traieste', title: 'Cine unde trăiește?', text: 'În pădure, la fermă sau în apă: încercuiește locul fiecărui animal.', config: { category: 'games', selectedItems: ['home:1'] }, levels: ['presc', 'CP'] },
  { id: 'cum-se-deplaseaza', title: 'Cum se deplasează?', text: 'Zboară, înoată, merge sau se târăște: încercuiește.', config: { category: 'games', selectedItems: ['move:1'] }, levels: ['presc', 'CP'] },
  { id: 'mediile-de-viata', title: 'Mediile de viață', text: 'Pădurea, deșertul, Polul Nord, Polul Sud, Marea Neagră: un X în tabel pentru fiecare animal.', config: { category: 'games', selectedItems: ['habitat:1'] }, levels: ['II'] },
  { id: 'puiul-cui-este', title: 'Puiul cui este?', text: 'Vaca și vițelul, oaia și mielul, calul și mânzul: unește.', config: { category: 'games', selectedItems: ['baby:1'] }, levels: ['presc'] },
  { id: 'anotimpurile', title: 'Anotimpurile', text: 'Încercuiește anotimpul fiecărei imagini: primăvara, vara, toamna, iarna.', config: { category: 'games', selectedItems: ['season:1'] }, levels: ['presc', 'CP'] },
  { id: 'vremea', title: 'Vremea', text: 'Soare, nori, ploaie, ninsoare, vânt, fulger: unește semnul cu numele lui.', config: { category: 'games', selectedItems: ['weather:1'] }, levels: ['presc', 'CP'] },
  { id: 'ce-iei-cu-tine', title: 'Ce iei cu tine?', text: 'Dacă plouă, iei umbrela: unește vremea cu ce îți trebuie.', config: { category: 'games', selectedItems: ['wear:1'] }, levels: ['presc', 'CP'] },
  { id: 'apa-solida-lichida', title: 'Apa: solidă sau lichidă?', text: 'Gheață, zăpadă, ploaie, valuri: încercuiește cum este apa.', config: { category: 'games', selectedItems: ['water:1'] }, levels: ['I'] },
  { id: 'ce-se-intampla-cu-apa', title: 'Ce se întâmplă cu apa?', text: 'Se topește, îngheață, fierbe sau se evaporă: citește și încercuiește.', config: { category: 'games', selectedItems: ['melt:1'] }, levels: ['I'] },
  // The sheets that fill the gaps of the programme (clr-pages.ts, mem-pages.ts): the free set of each class
  { id: 'povestea-in-imagini', title: 'Povestea în imagini', text: 'Patru imagini de pus în ordine, titlul potrivit de încercuit, sfârșitul de desenat.', config: { category: 'games', selectedItems: ['story:1'] }, levels: ['CP'] },
  {
    id: 'semne-simboluri', title: 'Semne și simboluri', text: 'Trecerea de pietoni, spitalul, ieșirea, reciclarea: unește semnul cu ce înseamnă; la clasa a II-a, ce faci când îl vezi.',
    config: { category: 'games', selectedItems: ['sign:1'] }, byLevel: { I: { selectedItems: ['sign:2'] }, II: { selectedItems: ['sign:3'] } }, levels: ['CP', 'I', 'II'],
  },
  { id: 'scriu-un-mesaj', title: 'Felicitarea, biletul, invitația', text: 'Un mesaj de completat cu litere de tipar: numele prietenului, locul, semnătura.', config: { category: 'games', selectedItems: ['note:1'] }, levels: ['CP'] },
  { id: 'citeste-mesajul', title: 'Citește mesajul', text: 'O invitație, un afiș, un bilet și patru întrebări despre fiecare.', config: { category: 'games', selectedItems: ['msg:1'] }, levels: ['II'] },
  { id: 'unde-este-scris', title: 'Unde este ceva scris?', text: 'Douăsprezece cartonașe: încercuiește-le pe cele cu litere, nu pe cele cu desene sau forme.', config: { category: 'games', selectedItems: ['written:1'] }, levels: ['presc'] },
  {
    id: 'termenii-operatiilor', title: 'Termenii operațiilor', text: 'Suma, diferența, totalul și semnele +, −, =; la clasa I termenii, < și >; la clasa a II-a descăzutul, scăzătorul, produsul, câtul.',
    config: { category: 'games', selectedItems: ['terms:1'] }, byLevel: { I: { selectedItems: ['terms:3'] }, II: { selectedItems: ['terms:5'] } }, levels: ['CP', 'I', 'II'],
  },
  { id: 'formeaza-numarul', title: 'Formează numărul', text: 'Sute, zeci, unități desenate; numere până la 1000 scrise cu cifre și cu litere.', config: { category: 'games', selectedItems: ['place:1'] }, levels: ['II'] },
  { id: 'coordonate', title: 'Coordonate', text: 'Un tabel cu coloanele A–E și rândurile 1–5: ce se află în B3, unde este pisica, desenează în D2.', config: { category: 'games', selectedItems: ['coord:1'] }, levels: ['II', 'III', 'IV'] },
  { id: 'laturi-varfuri', title: 'Laturi, vârfuri, axa de simetrie', text: 'Câte laturi și câte vârfuri are figura; este linia o axă de simetrie?', config: { category: 'games', selectedItems: ['sides:1'] }, levels: ['II', 'III'] },
  { id: 'corpuri-geometrice', title: 'Corpuri geometrice', text: 'Cub, cuboid, cilindru, sferă, con: numele, obiectele cu aceeași formă, fețe și vârfuri.', config: { category: 'games', selectedItems: ['solid:1'] }, levels: ['II'] },
  {
    id: 'modele-regularitati', title: 'Modele și regularități', text: 'Ce urmează în șir, numere după o regulă, o problemă; la clasa a II-a regula scrisă și figuri care cresc.',
    config: { category: 'games', selectedItems: ['regular:1'] }, byLevel: { II: { selectedItems: ['regular:3'] }, III: { selectedItems: ['sir:1'] }, IV: { selectedItems: ['sir:2'] } }, levels: ['I', 'II', 'III', 'IV'],
  },
  { id: 'sortare-doua-criterii', title: 'Sortează după două criterii', text: 'Un tabel cu forma și mărimea: scrie numărul fiecărei imagini în căsuța ei.', config: { category: 'games', selectedItems: ['sort2:1'] }, levels: ['I', 'II'] },
  { id: 'plan-de-lucru', title: 'Plan de lucru', text: 'Pașii unui experiment de pus în ordine; adevărat sau fals, cu „și”, „sau”, „nu”.', config: { category: 'games', selectedItems: ['plan:1'] }, levels: ['II'] },
  { id: 'ce-se-intampla-daca', title: 'Ce se întâmplă dacă…?', text: 'Unește „dacă…” cu „atunci…” și scrie urmarea: magnetul, becul, gheața.', config: { category: 'games', selectedItems: ['cause:1'] }, levels: ['II'] },
  { id: 'forme-in-jurul-nostru', title: 'Forme în jurul nostru', text: 'Ceasul, ușa, felia de pizza, fereastra: încercuiește cercul, pătratul, triunghiul sau dreptunghiul.', config: { category: 'games', selectedItems: ['around:1'] }, levels: ['presc', 'CP', 'I'] },
  { id: 'pictograma', title: 'Pictograma', text: 'Numără fructele din imagine, colorează câte o căsuță pentru fiecare; din care sunt cele mai multe?', config: { category: 'games', selectedItems: ['pict:1'] }, levels: ['presc'] },
  { id: 'mai-repede-mai-cald', title: 'Mai repede, mai cald…', text: 'Cine merge mai repede, ce este mai cald, ce a fost mai întâi: încercuiește.', config: { category: 'games', selectedItems: ['more:1'] }, levels: ['presc'] },
  // Evaluări: the items of the class's programme as a short test, with the answers page (evaluation.ts)
  {
    id: 'evaluare-mate', title: 'Evaluare la matematică', text: 'Comparare, adunări și scăderi, probleme cu imagini, bani (la clasa a II-a: înmulțiri și ceasul); cu răspunsuri și calificative orientative.',
    config: { category: 'math', selectedItems: ['cmp', 'mix', 'problems', 'money'], evaluation: true }, levels: ['CP', 'I', 'II'], evaluation: true,
    // clasa a II-a: 0–1000, „Adunarea și scăderea în concentrul 0 – 1000, fără trecere peste ordin”; the
    // missing number instead of money
    // clasa a II-a also: the tables (II 1.5) and the clock with quarters and minutes (II 6.2)
    byLevel: { II: { selectedItems: ['cmp', 'mix', 'missing', 'mul', 'clock', 'problems'], mathCarry: 'without', mathClock: 'five' } },
  },
  {
    id: 'evaluare-clr', title: 'Evaluare: sunete și silabe', text: 'Sunetul de la început, primul sunet, câte silabe, despărțirea în silabe; cu răspunsuri și calificative orientative.',
    config: { category: 'games', selectedItems: ['sound:C', 'first:1', 'syl:1', 'split:1'], evaluation: true }, levels: ['CP', 'I'], evaluation: true,
    // clasa pregătitoare reads the capitals first; clasa I the small letters too
    byLevel: { I: { letterMode: 'lowercase' } },
  },
  {
    id: 'evaluare-gradinita', title: 'Evaluare la grădiniță', text: 'Sortează, numără, ce nu se potrivește, sunetul de la început; cu răspunsuri și fișă de observare.',
    config: { category: 'games', selectedItems: ['sort:1', 'count:5', 'odd:1', 'sound:A'], evaluation: true }, levels: ['presc'], evaluation: true,
  },
  {
    id: 'evaluare-citire', title: 'Evaluare: citire și scriere', text: 'Unește cuvântul cu imaginea, litera care lipsește, completează propoziția, un text cu întrebări; cu răspunsuri și calificative orientative.',
    config: { category: 'games', selectedItems: ['read:match:4', 'read:gap:3', 'read:fill:1', 'read:text:1'], evaluation: true }, levels: ['I', 'II'], evaluation: true,
    // clasa a II-a: its own sets (the sentences put in order instead of the pictures to join)
    byLevel: { II: { selectedItems: ['read:gap:5', 'read:order:4', 'read:fill:4', 'read:text:4'] } },
  },
  // Clasa a III-a și a IV-a, Matematică (m34.ts): the first set of each class, free; the class picks its set
  { id: 'numerele-naturale', title: 'Numerele naturale', text: 'Scrise cu cifre și cu litere, mii, sute, zeci, unități; compară și ordonează (până la 10 000, la clasa a IV-a până la 1 000 000).', config: { category: 'games', selectedItems: ['nr:1'] }, byLevel: { IV: { selectedItems: ['nr:3'] } }, levels: ['III', 'IV'] },
  { id: 'cifre-romane', title: 'Cifrele romane', text: 'I, V, X la clasa a III-a; L, C, D, M la clasa a IV-a: scrie, citește, încercuiește scrierea corectă.', config: { category: 'games', selectedItems: ['rom:1'] }, byLevel: { IV: { selectedItems: ['rom:3'] } }, levels: ['III', 'IV'] },
  { id: 'rotunjire', title: 'Rotunjirea numerelor', text: 'La zeci, sute, mii (la clasa a IV-a și la zeci și sute de mii), cu semnul ≈.', config: { category: 'games', selectedItems: ['rot:1'] }, byLevel: { IV: { selectedItems: ['rot:3'] } }, levels: ['III', 'IV'] },
  { id: 'ordinea-operatiilor', title: 'Ordinea efectuării operațiilor', text: 'Înmulțirea înaintea adunării, parantezele rotunde; la clasa a IV-a și cele pătrate; adevărat sau fals.', config: { category: 'games', selectedItems: ['ops:1'] }, byLevel: { IV: { selectedItems: ['ops:3'] } }, levels: ['III', 'IV'] },
  { id: 'inmultire-in-coloana', title: 'Înmulțirea în coloană', text: 'Cu 10, 100, 1000 în minte; în coloană, pe pătrățele: cu o cifră și cu două (la clasa a IV-a factori de trei cifre).', config: { category: 'games', selectedItems: ['inm:1'] }, byLevel: { IV: { selectedItems: ['inm:3'] } }, levels: ['III', 'IV'] },
  { id: 'impartire-34', title: 'Împărțirea', text: 'Clasa a III-a: tabla împărțirii și numere de două cifre la o cifră; clasa a IV-a: cu rest, la o cifră și la două.', config: { category: 'games', selectedItems: ['inm:2'] }, byLevel: { IV: { selectedItems: ['inm:4'] } }, levels: ['III', 'IV'] },
  { id: 'probleme-34', title: 'Probleme', text: 'Cu două operații („cu … mai mult”, „de … ori”); la clasa a IV-a metoda grafică, mersul invers, comparația; o problemă de compus.', config: { category: 'games', selectedItems: ['prob:1'] }, byLevel: { IV: { selectedItems: ['prob:3'] } }, levels: ['III', 'IV'] },
  { id: 'fractii-34', title: 'Fracții', text: 'Partea colorată, numărătorul și numitorul (clasa a III-a); subunitare, echiunitare, supraunitare, adunări (clasa a IV-a).', config: { category: 'games', selectedItems: ['fr:1'] }, byLevel: { IV: { selectedItems: ['fr:3'] } }, levels: ['III', 'IV'] },
  { id: 'fractii-34-2', title: 'Fracții: comparare, sutimi, procente', text: 'Compară, ordonează, adună fracții cu același numitor (clasa a III-a); sutimi, 25 %, 50 %, 75 % (clasa a IV-a).', config: { category: 'games', selectedItems: ['fr:2'] }, byLevel: { IV: { selectedItems: ['fr:4'] } }, levels: ['III', 'IV'] },
  { id: 'perimetrul', title: 'Perimetrul', text: 'Pătrat, dreptunghi, triunghi cu laturile scrise, probleme; la clasa a IV-a romb, paralelogram și aria pe pătrățele de 1 cm.', config: { category: 'games', selectedItems: ['per:1'] }, byLevel: { IV: { selectedItems: ['per:2'] } }, levels: ['III', 'IV'] },
  { id: 'linii-unghiuri', title: 'Linii, unghiuri, poligoane', text: 'Dreaptă, semidreaptă, segment, unghiul drept (clasa a III-a); unghiuri ascuțite și obtuze, drepte paralele și perpendiculare (clasa a IV-a).', config: { category: 'games', selectedItems: ['geo:1'] }, byLevel: { IV: { selectedItems: ['geo:2'] } }, levels: ['III', 'IV'] },
  { id: 'unitati-masura-34', title: 'Unități de măsură', text: 'Unitatea potrivită, calcule fără transformări, instrumente (clasa a III-a); transformări de lungime, masă, capacitate (clasa a IV-a).', config: { category: 'games', selectedItems: ['mas:1'] }, byLevel: { IV: { selectedItems: ['mas:3'] } }, levels: ['III', 'IV'] },
  { id: 'timp-bani-34', title: 'Timpul și banii', text: 'Ziua, săptămâna, anul, leul și banul, euro (clasa a III-a); intervale de timp și transformări (clasa a IV-a).', config: { category: 'games', selectedItems: ['mas:2'] }, byLevel: { IV: { selectedItems: ['mas:4'] } }, levels: ['III', 'IV'] },
  { id: 'tabele-grafice', title: 'Tabele și grafice', text: 'Tabelul și graficul cu bare de desenat (clasa a III-a); grafice cu bare și liniare de citit (clasa a IV-a).', config: { category: 'games', selectedItems: ['date:1'] }, byLevel: { IV: { selectedItems: ['date:2'] } }, levels: ['III', 'IV'] },
  // Clasa a III-a și a IV-a, Limba și literatura română (r34.ts)
  { id: 'citeste-intelege', title: 'Citește și înțelege', text: 'O poveste scrisă pentru fișă și întrebări pe două pagini: detalii, adevărat sau fals, ordinea întâmplărilor, părerea ta.', config: { category: 'games', selectedItems: ['lect:1'] }, byLevel: { IV: { selectedItems: ['lect:4'] } }, levels: ['III', 'IV'] },
  { id: 'text-informativ', title: 'Text informativ', text: 'Albinele (clasa a III-a), Delta Dunării (clasa a IV-a): informații de găsit, cuvinte-cheie, o concluzie.', config: { category: 'games', selectedItems: ['lect:3'] }, byLevel: { IV: { selectedItems: ['lect:6'] } }, levels: ['III', 'IV'] },
  { id: 'asculta-raspunde', title: 'Ascultă și răspunde', text: 'Învățătorul citește povestea (pagina lui e separată), elevii răspund: detalii, sensul unui cuvânt, adevărat sau fals.', config: { category: 'games', selectedItems: ['aud:1'] }, byLevel: { IV: { selectedItems: ['aud:2'] } }, levels: ['III', 'IV'] },
  { id: 'partile-de-vorbire', title: 'Părțile de vorbire', text: 'Substantiv, adjectiv, pronume, verb, dintr-un text scurt; numărul, timpul; la clasa a IV-a și greșeli de acord de corectat.', config: { category: 'games', selectedItems: ['parti:1'] }, byLevel: { IV: { selectedItems: ['parti:3'] } }, levels: ['III', 'IV'] },
  { id: 'ortograme', title: 'Ortograme', text: 's-a / sa, s-au / sau, i-a / ia, i-au / iau: forma potrivită în propoziție; la clasa a IV-a și greșeli de găsit și corectat.', config: { category: 'games', selectedItems: ['orto:1'] }, byLevel: { IV: { selectedItems: ['orto:3'] } }, levels: ['III', 'IV'] },
  { id: 'semne-de-punctuatie', title: 'Semnele de punctuație', text: 'Punctul, semnul întrebării și al exclamării, virgula, două puncte, linia de dialog; un dialog de scris corect.', config: { category: 'games', selectedItems: ['punct:1'] }, byLevel: { IV: { selectedItems: ['punct:2'] } }, levels: ['III', 'IV'] },
  { id: 'compunere', title: 'Compunere cu plan', text: 'Clasa a III-a: o întâmplare trăită; clasa a IV-a: portretul unui personaj. Planul, apoi rândurile caietului.', config: { category: 'games', selectedItems: ['comp:1'] }, byLevel: { IV: { selectedItems: ['comp:3'] } }, levels: ['III', 'IV'] },
  { id: 'compunere-2', title: 'Altă compunere cu plan', text: 'Clasa a III-a: descrierea animalului preferat, cu întrebări; clasa a IV-a: o poveste cu început dat.', config: { category: 'games', selectedItems: ['comp:2'] }, byLevel: { IV: { selectedItems: ['comp:4'] } }, levels: ['III', 'IV'] },
  { id: 'texte-functionale', title: 'Invitația, scrisoarea', text: 'Clasa a III-a: invitația, cu desen; clasa a IV-a: scrisoarea, cu toate părțile ei.', config: { category: 'games', selectedItems: ['func:1'] }, byLevel: { IV: { selectedItems: ['func:3'] } }, levels: ['III', 'IV'] },
  { id: 'texte-functionale-2', title: 'Afișul, anunțul, biletul', text: 'Clasa a III-a: afișul unei expoziții; clasa a IV-a: un anunț și un bilet.', config: { category: 'games', selectedItems: ['func:2'] }, byLevel: { IV: { selectedItems: ['func:4'] } }, levels: ['III', 'IV'] },
  { id: 'dictare', title: 'Dictare', text: 'Propoziții cu goluri pentru cuvintele dictate (ortograme, â, î) și rânduri pentru propozițiile întregi; textul, pe pagina de răspunsuri.', config: { category: 'games', selectedItems: ['dict:1'] }, byLevel: { IV: { selectedItems: ['dict:2'] } }, levels: ['III', 'IV'] },
  { id: 'fisa-de-lectura', title: 'Fișa de lectură', text: 'Fișa cărții citite (clasa a III-a), jurnalul de lectură pe o săptămână (clasa a IV-a).', config: { category: 'games', selectedItems: ['carte:1'] }, byLevel: { IV: { selectedItems: ['carte:2'] } }, levels: ['III', 'IV'] },
  // no specific competence names synonyms and antonyms (sheet.ts prints no code): listed on the generator and /fise-de-lucru
  { id: 'sinonime-antonime', title: 'Sinonime, antonime, omonime', text: 'Cuvinte cu înțeles asemănător sau opus și cuvinte cu mai multe înțelesuri, în propoziții.', config: { category: 'games', selectedItems: ['voc:1'] }, byLevel: { IV: { selectedItems: ['voc:2'] } }, levels: ['III', 'IV'] },
  // Evaluări pentru clasa a III-a și a IV-a: a few exercises of each topic (evaluation.ts, m34-pages / r34-pages eval blocks)
  {
    id: 'evaluare-mate-34', title: 'Evaluare la matematică', text: 'Numere, cifre romane, rotunjire, ordinea operațiilor, înmulțire, fracții, o problemă; cu răspunsuri și calificative orientative.',
    config: { category: 'games', selectedItems: ['nr:1', 'rom:1', 'rot:1', 'ops:1', 'inm:1', 'fr:1', 'prob:1'], evaluation: true }, levels: ['III', 'IV'], evaluation: true,
    byLevel: { IV: { selectedItems: ['nr:3', 'rom:3', 'rot:3', 'ops:3', 'inm:3', 'fr:3', 'prob:3'] } },
  },
  {
    id: 'evaluare-romana-34', title: 'Evaluare la limba română', text: 'Un text cu întrebări, ortograme, părțile de vorbire, punctuația; cu răspunsuri și calificative orientative.',
    config: { category: 'games', selectedItems: ['lect:1', 'orto:1', 'parti:1', 'punct:1'], evaluation: true }, levels: ['III', 'IV'], evaluation: true,
    byLevel: { IV: { selectedItems: ['lect:4', 'orto:3', 'parti:3', 'punct:2'] } },
  },
  // Arte vizuale și abilități practice, Dezvoltare personală, limba engleză (subjects-pages.ts): set 1 of each, free
  { id: 'decupeaza-lipeste', title: 'Decupează și lipește', text: 'Piesele unei case, de decupat pe linia punctată și de lipit pe desen.', config: { category: 'games', selectedItems: ['cut:1'] }, levels: ['CP', 'I'] },
  { id: 'linii-puncte', title: 'Linii și puncte', text: 'Un fular în fâșii: fiecare fâșie cu linia sau punctele arătate lângă ea.', config: { category: 'games', selectedItems: ['lines:1'] }, levels: ['CP', 'I'] },
  // no competence names these two (sheet.ts prints no code): listed only on the generator and /fise-de-lucru
  { id: 'simetrie', title: 'Simetrie', text: 'Jumătate de desen pe pătrățele: copilul colorează cealaltă jumătate, ca în oglindă.', config: { category: 'games', selectedItems: ['sym:1'] }, levels: ['CP', 'I', 'II'] },
  { id: 'deseneaza-dupa-model', title: 'Desenează după model', text: 'Un desen pe puncte și aceleași puncte goale dedesubt.', config: { category: 'games', selectedItems: ['model:1'] }, levels: ['CP', 'I', 'II'] },
  { id: 'emotiile', title: 'Emoțiile', text: 'Bucurie, tristețe, frică, furie: încercuiește emoția fiecărei fețe.', config: { category: 'games', selectedItems: ['feel:1'] }, levels: ['CP', 'I'] },
  { id: 'despre-mine', title: 'Despre mine', text: 'Numele, vârsta, ochii, părul și lucrurile preferate: de completat, colorat și desenat.', config: { category: 'games', selectedItems: ['me:1'] }, levels: ['CP', 'I'] },
  { id: 'obiecte-igiena', title: 'Obiectele de igienă', text: 'Periuța, săpunul, dușul: încercuiește-le printre alte obiecte.', config: { category: 'games', selectedItems: ['hyg:1'] }, levels: ['CP'] },
  { id: 'obiceiuri-sanatoase', title: 'Obiceiuri sănătoase', text: 'Mă spăl pe mâini înainte de masă: e bine sau nu e bine?', config: { category: 'games', selectedItems: ['habit:1'] }, levels: ['I'] },
  { id: 'meserii-unelte', title: 'Meserii și unelte', text: 'Bucătarul și tigaia, pompierul și stingătorul: unește.', config: { category: 'games', selectedItems: ['job:1'] }, levels: ['I'] },
  { id: 'la-ce-folosesc-meseriile', title: 'La ce folosesc meseriile?', text: 'Medicul ne îngrijește, pompierul stinge incendiile: unește.', config: { category: 'games', selectedItems: ['jobuse:1'] }, levels: ['II'] },
  { id: 'reguli-in-clasa', title: 'Reguli în clasă', text: 'Ridic mâna, îmi aștept rândul: e bine sau nu e bine?', config: { category: 'games', selectedItems: ['rules:1'] }, levels: ['CP'] },
  { id: 'engleza-cuvinte', title: 'Cuvinte în engleză', text: 'Dog, cat, fish: unește imaginea cu cuvântul în limba engleză.', config: { category: 'games', selectedItems: ['en:1'] }, levels: ['CP', 'I', 'II'] },
];

/** The number range a class works in, for the math sheets it opens (programme contents). */
const MATH_RANGE: Record<SchoolLevel, number> = { presc: 10, CP: 10, I: 100, II: 1000, III: 10000, IV: 1000000 };

/** The full generator settings of a preset for a class. */
export function presetConfig(preset: SheetPreset, level: SchoolLevel): WorksheetConfig {
  return {
    ...DEFAULT_CONFIG,
    ...preset.config,
    ...(preset.config.category === 'math' ? { mathRange: MATH_RANGE[level] } : {}),
    ...(preset.config.mathRange ? { mathRange: preset.config.mathRange } : {}),
    ...preset.byLevel?.[level],
    customWords: [],
    curriculumLevel: level,
  };
}

/** The class pages: address, title, and the programmes they show. */
export interface ClassPage {
  slug: string;
  level: SchoolLevel;
  title: string;
  /** e.g. „la clasa pregătitoare” */
  at: string;
  programmes: ProgrammeId[];
}

export const CLASS_PAGES: ClassPage[] = [
  { slug: 'gradinita', level: 'presc', title: 'Grădiniță', at: 'la grădiniță', programmes: ['et-presc'] },
  { slug: 'clasa-pregatitoare', level: 'CP', title: 'Clasa pregătitoare', at: 'la clasa pregătitoare', programmes: ['clr-p-ii', 'mem-p-ii', 'avap-p-ii', 'dp-p-ii', 'lm-p-ii'] },
  { slug: 'clasa-1', level: 'I', title: 'Clasa I', at: 'la clasa I', programmes: ['clr-p-ii', 'mem-p-ii', 'avap-p-ii', 'dp-p-ii', 'lm-p-ii'] },
  { slug: 'clasa-2', level: 'II', title: 'Clasa a II-a', at: 'la clasa a II-a', programmes: ['clr-p-ii', 'mem-p-ii', 'avap-p-ii', 'dp-p-ii', 'lm-p-ii'] },
  // OMEN 5003/2014: Limba și literatura română, Matematică (the other subjects of III–IV are not in the data yet)
  { slug: 'clasa-3', level: 'III', title: 'Clasa a III-a', at: 'la clasa a III-a', programmes: ['llr-iii-iv', 'mate-iii-iv'] },
  { slug: 'clasa-4', level: 'IV', title: 'Clasa a IV-a', at: 'la clasa a IV-a', programmes: ['llr-iii-iv', 'mate-iii-iv'] },
];

/**
 * The programmes counted in the headline of a class page („Avem fișe pentru X din Y”): the preschool
 * curriculum, limba română and matematică (CP–II: clr, mem; III–IV: llr, mate), whose competences are largely practised on paper.
 * Arte vizuale și abilități practice, Dezvoltare personală and limba modernă are learnt mostly by
 * making things, playing, moving and talking, so only a few of their competences can have a sheet:
 * their groups show their own count, and the page says why they are counted apart.
 */
export const HEADLINE_PROGRAMMES: readonly ProgrammeId[] = ['et-presc', 'clr-p-ii', 'mem-p-ii', 'llr-iii-iv', 'mate-iii-iv'];

/** One line under the title of a group that is counted apart (see HEADLINE_PROGRAMMES). */
const GROUP_NOTES: Partial<Record<ProgrammeId, string>> = {
  'avap-p-ii': 'Se lucrează mai ales cu materiale: desen, pictură, modelaj, colaj. Avem fișe doar pentru ce se poate face pe hârtie.',
  'dp-p-ii': 'Se lucrează mai ales prin joc, discuție și activități în grup. Fișele sprijină câteva dintre ele.',
  'lm-p-ii': 'O singură programă pentru orice limbă modernă; fișele noastre sunt în limba engleză. Se lucrează mai ales oral.',
};

export function classPage(slug: string): ClassPage | undefined {
  return CLASS_PAGES.find((c) => c.slug === slug);
}

/** The level code of the data for a class ("3-6" for preschool). */
function dataLevel(level: SchoolLevel): string {
  return level === 'presc' ? '3-6' : level;
}

export interface CompetenceCoverage {
  programme: ProgrammeId;
  competence: SpecificCompetence;
  /** The code as teachers write it: „4.1”, or „D.3.4” in preschool. */
  code: string;
  presets: SheetPreset[];
}

/** One group per programme (preschool: per domain), in the programme's order. */
export interface CoverageGroup {
  title: string;
  items: CompetenceCoverage[];
  programme: ProgrammeId;
  /** Counted in the headline of the class page (HEADLINE_PROGRAMMES); the others show their own count. */
  headline: boolean;
  /** Why the group is counted apart, for the groups that are. */
  note?: string;
}

const sameRef = (a: CompetenceRef, b: SpecificCompetence, programme: ProgrammeId) =>
  a.programme === programme && a.code === b.code && (programme !== 'et-presc' || a.domain === b.domain);

/**
 * Every specific competence of a class with the sheets that practise it. Preschool shows
 * only domains D (language, pre-reading and pre-writing, mother-tongue variant) and E
 * (cognitive development, numbers and shapes): the others are not worksheet matters.
 */
export function classCoverage(page: ClassPage): CoverageGroup[] {
  const covered = SHEET_PRESETS.filter((p) => !p.evaluation && (!p.levels || p.levels.includes(page.level))).map((p) => ({ preset: p, refs: sheetCompetences(presetConfig(p, page.level), page.level) }));
  const groups: CoverageGroup[] = [];
  for (const id of page.programmes) {
    const prog = PROGRAMMES[id];
    const competences = prog.specificCompetences.filter(
      (c) => c.level === dataLevel(page.level) && (id !== 'et-presc' || (c.kind === 'comportament' && (c.domain === 'D' ? c.variant === 'a' : c.domain === 'E'))),
    );
    const item = (c: SpecificCompetence): CompetenceCoverage => ({
      programme: id,
      competence: c,
      code: id === 'et-presc' ? `${c.domain}.${c.code}` : c.code,
      presets: covered.filter((x) => x.refs.some((r) => sameRef(r, c, id))).map((x) => x.preset),
    });
    if (id === 'et-presc') {
      for (const d of ['D', 'E']) {
        const domain = prog.generalCompetences.find((g) => g.code === d);
        groups.push({ title: `${d}. ${sentenceCase(domain?.text ?? d)}`, items: competences.filter((c) => c.domain === d).map(item), programme: id, headline: true });
      }
    } else {
      const headline = HEADLINE_PROGRAMMES.includes(id);
      groups.push({ title: prog.subject, items: competences.map(item), programme: id, headline, ...(headline ? {} : { note: GROUP_NOTES[id] }) });
    }
  }
  return groups;
}

/** The competences counted in the headline „Avem fișe pentru X din Y” (see HEADLINE_PROGRAMMES). */
export function headlineItems(page: ClassPage): CompetenceCoverage[] {
  return classCoverage(page).filter((g) => g.headline).flatMap((g) => g.items);
}

/** „X din Y” of a list of competences: how many have a sheet, of how many. */
export function coverageCount(items: CompetenceCoverage[]): { covered: number; total: number } {
  return { covered: items.filter((i) => i.presets.length).length, total: items.length };
}

/** The evaluations of a class, with the codes they print (as teachers write them: „1.2”, „D.3.2”). */
export function classEvaluations(page: ClassPage): { preset: SheetPreset; codes: string[] }[] {
  return SHEET_PRESETS.filter((p) => p.evaluation && p.levels?.includes(page.level)).map((preset) => ({
    preset,
    codes: sheetCompetences(presetConfig(preset, page.level), page.level).map((r) => (r.programme === 'et-presc' ? `${r.domain}.${r.code}` : r.code)),
  }));
}

/** „DEZVOLTAREA COGNITIVĂ ȘI…” → „Dezvoltarea cognitivă și…” (the document prints domains in capitals). */
function sentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase('ro');
  return lower.charAt(0).toLocaleUpperCase('ro') + lower.slice(1);
}

/** The generator link for a preset in a class: the generator opens with these settings. */
export function presetHref(preset: SheetPreset, level: SchoolLevel): string {
  return `/generator?fisa=${encodeURIComponent(preset.id)}&clasa=${level}`;
}

export function presetById(id: string): SheetPreset | undefined {
  return SHEET_PRESETS.find((p) => p.id === id);
}
