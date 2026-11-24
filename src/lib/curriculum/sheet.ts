/**
 * Which curriculum competences a sheet practises, for the class the teacher picks.
 *
 * The mapping is deliberately conservative: a sheet gets a code only when the official text
 * of the competence plainly describes what the child does on it. When nothing fits (print
 * letters in clasa a II-a, numbers beyond 0–31 in clasa pregătitoare…) the sheet gets no
 * label at all rather than a loose one — a wrong code on a teacher's sheet is worse than none.
 */
import type { WorksheetConfig } from '@/types';
import { findCompetence, type CompetenceRef, type Level, type ProgrammeId } from './index';
import { readingSetLevel } from '@/lib/worksheet/reading';

/** The class picked in the generator. "presc" = grădiniță. */
export type SchoolLevel = 'presc' | 'CP' | 'I' | 'II';

export const SCHOOL_LEVELS: { id: SchoolLevel; label: string }[] = [
  { id: 'presc', label: 'Grădiniță' },
  { id: 'CP', label: 'Clasa pregătitoare' },
  { id: 'I', label: 'Clasa I' },
  { id: 'II', label: 'Clasa a II-a' },
];

const CLR = 'clr-p-ii' as const;
const MEM = 'mem-p-ii' as const;
const AVAP = 'avap-p-ii' as const;
const DP = 'dp-p-ii' as const;
const LM = 'lm-p-ii' as const;

function school(programme: ProgrammeId, level: Exclude<SchoolLevel, 'presc'>, code: string): CompetenceRef {
  return { programme, level, code };
}
function presc(domain: 'D' | 'E', code: string): CompetenceRef {
  return { programme: 'et-presc', level: '3-6', domain, code };
}

type Rule = Partial<Record<SchoolLevel, CompetenceRef | CompetenceRef[] | null>>;

/** Tracing letters, words and names. */
function lettersRule(config: WorksheetConfig, level: SchoolLevel): CompetenceRef | null {
  const cursive = config.script === 'cursive' || config.fontStyle === 'cursive';
  if (level === 'presc') return cursive ? null : presc('D', '3.4');
  // CP traces print letters („Desenarea literelor de tipar”); handwriting letters start in clasa I
  if (level === 'CP') return cursive ? null : school(CLR, 'CP', '4.1'); // „Trasarea elementelor grafice și a contururilor literelor”
  if (level === 'I') return cursive ? school(CLR, 'I', '4.1') : null; // „Scrierea literelor de mână”
  // clasa a II-a: „Scrierea unor mesaje” — a traced word or name is not a message, so no code
  return null;
}

const RULES: Record<string, Rule> = {
  // digits 0–9 are below clasa a II-a („numerelor până la 1000”)
  numbers: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.1'), I: school(MEM, 'I', '1.1') },
  // E 2.2 „…informații despre mărime, formă…”; CP/I 2.2 name only pătrat, triunghi, dreptunghi, cerc (see BASIC_SHAPES)
  shapes: { presc: presc('E', '2.2'), CP: school(MEM, 'CP', '2.2'), I: school(MEM, 'I', '2.2') },
  prewrite: { presc: presc('D', '3.4'), CP: school(CLR, 'CP', '4.1') },
  // math exercises
  // the signs <, >, = belong to school (MEM I 1.6), not to preschool
  cmp: { CP: school(MEM, 'CP', '1.2'), I: school(MEM, 'I', '1.2'), II: school(MEM, 'II', '1.2') },
  add: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  sub: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  mix: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  addpic: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4') },
  missing: { CP: school(MEM, 'CP', '1.4'), I: school(MEM, 'I', '1.4'), II: school(MEM, 'II', '1.4') },
  seq: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.3'), I: school(MEM, 'I', '1.3'), II: school(MEM, 'II', '1.3') },
  nbr: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.3'), I: school(MEM, 'I', '1.3'), II: school(MEM, 'II', '1.3') },
  // „Bani”: count, compare, pay, exchange notes of 1, 5, 10 (and 50; 100, 200, 500 in 0–1000) lei.
  // CP 6.3 „Realizarea unor schimburi echivalente valoric folosind reprezentări neconvenționale în
  // probleme-joc simple de tip venituri-cheltuieli, cu numere din concentrul 0-31” (contents: „Leul
  // (bancnotele de 1 leu, 5 lei, 10 lei)”); I 6.3 the same „…cu numere din concentrul 0-100”.
  // II 6.3 „Realizarea unor schimburi echivalente valoric prin reprezentări convenționale standard și
  // nonstandard și prin utilizarea banilor în probleme-joc simple de tip venituri-cheltuieli, cu numere
  // din concentrul 0-1000” (contents: „Leul: bancnote de 200 de lei, 500 de lei”): only the 0–1000
  // sheet, which draws those notes (see MONEY_II); euro is not drawn.
  money: { CP: school(MEM, 'CP', '6.3'), I: school(MEM, 'I', '6.3'), II: school(MEM, 'II', '6.3') },
  // „Probleme cu imagini” (problems.ts): one operation, two from 0–100 up (a ± b ± c).
  // CP 5.2 „Rezolvarea de probleme în care intervin operații de adunare sau scădere cu 1-5 unități în
  // concentrul 0-31, cu ajutorul obiectelor” (up to 0–31 the second number is always 1–5; 0–20 and
  // 0–100 are not, see CP_OPERATIONS); I 5.2 „Rezolvarea de probleme simple în care intervin operații
  // de adunare sau scădere în concentrul 0-100, cu sprijin în obiecte, imagini sau reprezentări
  // schematice”; II 5.2 „Rezolvarea de probleme de tipul a±b=x; a±b±c=x în concentrul 0-1000; …”.
  // Preschool: no behaviour of domain E is about solving word problems (E.2.5 is sorting data): no code.
  problems: { CP: school(MEM, 'CP', '5.2'), I: school(MEM, 'I', '5.2'), II: school(MEM, 'II', '5.2') },
  // games
  // finding a letter is not phonetic (D 3.2): it is an element of writing (D 3.4)
  find: { presc: presc('D', '3.4') },
  count: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.1') },
  // the dot pictures go past 10 dots: beyond preschool counting
  dots: { CP: school(MEM, 'CP', '1.3') },
  // „Sunete și silabe” (phonology-pages.ts): the child names the picture and listens to it.
  // D 3.2 „Discriminează/diferențiează fonetic cuvinte, silabe, sunete și asociază sunete cu litere”;
  // CLR CP 1.3 „Identificarea sunetului inițial și/ sau final dintr-un cuvânt, a silabelor și a cuvintelor
  // din propoziții rostite clar și rar”; CLR I 1.3 „Identificarea unor sunete, silabe, cuvinte în enunțuri
  // rostite cu claritate”. Not CP 4.1: tracing a syllable is not „trasarea elementelor grafice” as such.
  sound: { presc: presc('D', '3.2'), CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  first: { presc: presc('D', '3.2'), CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  syl: { presc: presc('D', '3.2'), CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  // writing the syllables is school work, not preschool
  split: { CP: school(CLR, 'CP', '1.3'), I: school(CLR, 'I', '1.3') },
  // Sorting, grouping, orientation (sorting-pages.ts).
  // E 2.4 „Efectuează operații de seriere, grupare, clasificare, măsurare a obiectelor”; MEM CP 5.1
  // „Sortarea/clasificarea unor obiecte/ materiale etc., pe baza unui criteriu dat” (the group boxes give
  // the criterion). Not I 5.1 („…pe baza a două criterii”): every sheet sorts by one criterion.
  sort: { presc: presc('E', '2.4'), CP: school(MEM, 'CP', '5.1') },
  // the odd one out is classifying (E 2.4), but the criterion is not given: not CP 5.1 „…criteriu dat”
  odd: { presc: presc('E', '2.4') },
  // counting each kind (E 2.1, CP 1.1 „Recunoașterea și scrierea numerelor în concentrul 0-31”) after
  // grouping the pictures by kind (E 2.4, CP 5.1); counts of 2–8 are below clasa I / a II-a
  group: { presc: [presc('E', '2.1'), presc('E', '2.4')], CP: [school(MEM, 'CP', '1.1'), school(MEM, 'CP', '5.1')] },
  // MEM 2.1 CP „Orientarea și mișcarea în spațiu în raport cu repere/direcții precizate, folosind sintagme de
  // tipul: în, pe, deasupra, dedesubt, lângă, în fața, în spatele, sus, jos, stânga, dreapta…”, I „…în raport
  // cu repere/direcții date…”. Not II 2.1 (coordinates in a reference system), nor a preschool behaviour
  // (A 2.2 „Se orientează în spațiu pe baza simțurilor” is about the senses, not a worksheet).
  pos: { CP: school(MEM, 'CP', '2.1'), I: school(MEM, 'I', '2.1') },
  // „Citire și scriere” (reading-pages.ts): the key is "read:<kind>:<class of the set>" (see ruleKeys), so a
  // set prints a code only in the class it is written for (a clasa I text gets nothing in clasa a II-a).
  // CP 3.1 „Recunoașterea unor cuvinte uzuale, din universul apropiat, scrise cu litere mari și mici de tipar”
  // (contents: „Citirea cuvintelor pe etichete asociate unor imagini sau obiecte”); I 3.1 „Citirea unor
  // cuvinte și propoziții scurte, scrise cu litere de tipar sau de mână”.
  'read:match:CP': { CP: school(CLR, 'CP', '3.1') },
  'read:match:I': { I: school(CLR, 'I', '3.1') },
  'read:draw:CP': { CP: school(CLR, 'CP', '3.1') },
  'read:draw:I': { I: school(CLR, 'I', '3.1') },
  'read:fill:I': { I: school(CLR, 'I', '3.1') },
  // the missing letter: the child names the picture and finds the sound, as on „Primul sunet”. CP 1.3
  // „Identificarea sunetului inițial și/ sau final dintr-un cuvânt…” (the CP sets leave out only the first
  // or the last letter); I 1.3 „Identificarea unor sunete, silabe, cuvinte în enunțuri rostite cu claritate”;
  // II 1.3 „Identificarea sunetelor și silabelor în cuvinte și a cuvintelor în enunțuri rostite cu claritate”.
  'read:gap:CP': { CP: school(CLR, 'CP', '1.3') },
  'read:gap:I': { I: school(CLR, 'I', '1.3') },
  'read:gap:II': { II: school(CLR, 'II', '1.3') },
  // the sentence put in order and written on the row: I 4.2 „Redactarea unor mesaje scurte, formate din
  // cuvinte scrise cu litere de mână…”; II 4.2 „Redactarea unor mesaje simple, cu respectarea convențiilor de
  // bază” (the capital at the start and the full stop the sheet asks for)
  'read:order:I': { I: school(CLR, 'I', '4.2') },
  'read:order:II': { II: school(CLR, 'II', '4.2') },
  // copying: CP 4.1 „Trasarea elementelor grafice și a contururilor literelor…” (print letters, contents
  // „Desenarea literelor de tipar”); I 4.1 „Scrierea literelor de mână” (the sentences are written in
  // handwriting on the tip I ruling); II 4.1 „Scrierea unor mesaje, în diverse contexte de comunicare”
  // (contents: „Copieri (texte de maxim 50 de cuvinte)”, „Transcrieri…”)
  'read:copy:CP': { CP: school(CLR, 'CP', '4.1') },
  'read:copy:I': { I: school(CLR, 'I', '4.1') },
  'read:copy:II': { II: school(CLR, 'II', '4.1') },
  // a short text and questions on it: I 3.2 „Identificarea mesajului unui scurt text care prezintă întâmplări,
  // fenomene, evenimente familiare”; II 3.2 „Identificarea mesajului unui text în care se relatează
  // întâmplări, fenomene din universul cunoscut”. Sentences to complete in clasa a II-a get no code: II 3.1
  // „Citirea unor mesaje scrise, întâlnite în mediul cunoscut” is about the messages around the child.
  'read:text:I': { I: school(CLR, 'I', '3.2') },
  'read:text:II': { II: school(CLR, 'II', '3.2') },
  // ── the other math topics (multiply.ts, clock.ts, calendar-pages.ts, measure.ts, fractions.ts, figures.ts)
  // „Grupe egale”: CP 1.5 „Efectuarea de adunări repetate/ scăderi repetate prin numărare și reprezentări
  // obiectuale în concentrul 0-31”, I 1.5 the same „…în concentrul 0-100”; in 0–1000 the sheet also writes the
  // product: II 1.5 „Efectuarea de înmulțiri și împărțiri în concentrul 0-1000 prin adunări/scăderi repetate”
  // (see GROUPS_II).
  groups: { CP: school(MEM, 'CP', '1.5'), I: school(MEM, 'I', '1.5'), II: school(MEM, 'II', '1.5') },
  // the tables: II 1.5 (contents: „Înmulțirea în concentrul 0-100”, „Împărțirea cu rest 0 în concentrul 0-100”);
  // multiplication is not in CP or clasa I
  mul: { II: school(MEM, 'II', '1.5') },
  div: { II: school(MEM, 'II', '1.5') },
  mulmiss: { II: school(MEM, 'II', '1.5') },
  // the clock, under the time contents of 6.2: I „Utilizarea unor unități de măsură pentru determinarea și
  // compararea duratelor unor activități cotidiene” (contents „Ora (ora fixă, jumătatea de oră)”: only those
  // steps, see CLOCK_I); II „Utilizarea unor unități de măsură pentru determinarea, compararea și ordonarea
  // duratelor unor evenimente variate” („Ora (1 oră = 60 de minute; 5 minute; jumătatea de oră, sfertul de
  // oră)”, „Instrumente de măsură: ceasul”). No clock in the CP contents.
  clock: { I: school(MEM, 'I', '6.2'), II: school(MEM, 'II', '6.2') },
  clockdraw: { I: school(MEM, 'I', '6.2'), II: school(MEM, 'II', '6.2') },
  // the week: CP 6.2 „Utilizarea unor unități de măsură pentru determinarea/ estimarea duratelor unor
  // evenimente familiare” (contents „Ziua, săptămâna, luna: denumire, ordonare”), I 6.2, II 6.2 (as above;
  // II contents „Ziua (ieri, alaltăieri, mâine, poimâine), săptămâna, luna, anul (calendarul)”)
  week: { CP: school(MEM, 'CP', '6.2'), I: school(MEM, 'I', '6.2'), II: school(MEM, 'II', '6.2') },
  // months and seasons: the sheet asks the season of a month, „Anotimpurile: lunile corespunzătoare” is in
  // the II contents (CP has only „Anotimpurile: denumire, ordonare”): I 6.2 („…luna, anul: durată;
  // Anotimpurile: durată”) and II 6.2, not CP
  months: { I: school(MEM, 'I', '6.2'), II: school(MEM, 'II', '6.2') },
  // a month's calendar: II („…anul (calendarul)”) only
  calmonth: { II: school(MEM, 'II', '6.2') },
  // lengths in cubes or paper clips: CP 6.1 „Utilizarea unor măsuri neconvenționale pentru determinarea și
  // compararea lungimilor”, I 6.1 „…compararea capacităților și a lungimilor”, II 6.1 „…compararea maselor,
  // lungimilor și capacităților”; preschool E 2.2 „Demonstrează familiarizarea cu informații despre mărime,
  // formă, greutate, înălțime, lungime, volum” and E 2.4 „Efectuează operații de seriere, grupare, clasificare,
  // măsurare a obiectelor”
  length: { presc: [presc('E', '2.2'), presc('E', '2.4')], CP: school(MEM, 'CP', '6.1'), I: school(MEM, 'I', '6.1'), II: school(MEM, 'II', '6.1') },
  // heavier / lighter on a balance: masses are only in II 6.1 (CP and I have no „Masă” contents) and in
  // preschool E 2.2 („…greutate…”)
  mass: { presc: presc('E', '2.2'), II: school(MEM, 'II', '6.1') },
  // centimetres on a ruler: I 6.4 „Identificarea unităților de măsură uzuale pentru lungime, capacitate
  // (centimetrul, litrul) și a unor instrumente adecvate” (contents „Instrumente de măsură: rigla”), II 6.4
  // „Identificarea și utilizarea unităților de măsură uzuale pentru lungime, capacitate, masă (metrul,
  // centimetrul, litrul, mililitrul, kilogramul, gramul) și a unor instrumente adecvate”
  ruler: { I: school(MEM, 'I', '6.4'), II: school(MEM, 'II', '6.4') },
  // m, cm, l, ml, kg, g and their instruments, 1 m = 100 cm …: II 6.4 only (clasa I has only cm and l)
  units: { II: school(MEM, 'II', '6.4') },
  // „Jumătate și sfert” (II contents „Fracții: ½ (jumătate/doime), ¼ (sfert/pătrime)”): no specific
  // competence of clasa a II-a names fractions, so no code
  frac: {},
  // shapes found in a picture: CP 2.2 „Identificarea unor forme geometrice plane (pătrat, triunghi, dreptunghi,
  // cerc)…”, I 2.2 „Recunoașterea unor figuri și corpuri geometrice în mediul apropiat și în reprezentări plane
  // accesibile (incluzând desene, reproduceri de artă, reprezentări schematice)”, preschool E 2.2 („…formă…”);
  // not II 2.2 (characteristics of the shapes, not counting them)
  figures: { presc: presc('E', '2.2'), CP: school(MEM, 'CP', '2.2'), I: school(MEM, 'I', '2.2') },
  // ── the fun preschool sheets (fun-pages.ts). „Colorează după cod”: the digits 1–5, E 2.1 „Demonstrează
  // familiarizarea cu conceptul de număr și cu numerația”, CP 1.1 „Recunoașterea și scrierea numerelor în
  // concentrul 0-31” (as „Numără și scrie”). With the exercises (result 1–5, second number 1–5): CP 1.4
  // „Efectuarea de adunări și scăderi în concentrul 0-31, prin adăugarea /extragerea a 1-5 elemente dintr-o
  // mulțime dată”; not preschool (no behaviour names operations, as for the math sheets).
  color: { presc: presc('E', '2.1'), CP: school(MEM, 'CP', '1.1') },
  colsum: { CP: school(MEM, 'CP', '1.4') },
  // the dashed lines from picture to picture are pre-writing, as the „Elemente grafice” sheets: D 3.4
  // „Asimilează unele elemente ale scrisului…”, CLR CP 4.1 „Trasarea elementelor grafice și a contururilor
  // literelor, folosind resurse variate”. The maze, the differences and the shadows: no behaviour or competence
  // names them, so no code.
  trace: { presc: presc('D', '3.4'), CP: school(CLR, 'CP', '4.1') },
  // ── „Explorarea mediului” (explore-pages.ts). Preschool E 3.2 „Identifică și valorifică unele caracteristici
  // ale lumii vii, ale Pământului și Spațiului”: the parts of a plant and of the body, the senses, where animals
  // live, how they move, their young. CP contents „Plante și animale: Părți componente”, „Corpul omenesc: Părți
  // componente și rolul lor; Simțurile”: the parts written in the boxes of the drawing are CP 4.1 „Formularea unor
  // observații asupra mediului apropiat folosind limbajul comun, reprezentări prin desene și operatorii logici
  // „și”, „nu”” (the I and II contents are other: skeleton and organs, health).
  plant: { presc: presc('E', '3.2'), CP: school(MEM, 'CP', '4.1') },
  body: { presc: presc('E', '3.2'), CP: school(MEM, 'CP', '4.1') },
  senses: { presc: presc('E', '3.2'), CP: school(MEM, 'CP', '4.1') },
  // where it lives, how it moves: sorting by the criterion the choices give, as „Sortează” (CP 5.1 „Sortarea/
  // clasificarea unor obiecte/ materiale etc., pe baza unui criteriu dat”). The table of clasa a II-a (contents
  // „Medii de viață: lacul/iazul/balta, pădurea, Delta Dunării, Marea Neagră, deșertul, Polul Nord, Polul Sud”):
  // II 5.1 „Sortarea, clasificarea și înregistrarea prin desene și tabele a unor date din mediul cunoscut”.
  home: { presc: presc('E', '3.2'), CP: school(MEM, 'CP', '5.1') },
  move: { presc: presc('E', '3.2'), CP: school(MEM, 'CP', '5.1') },
  habitat: { II: school(MEM, 'II', '5.1') },
  // the names of the young (vițel, mânz, ied…) are words to learn: D 2.3 „Demonstrează extinderea progresivă a
  // vocabularului”, and E 3.2; no CP–II contents name the young
  baby: { presc: [presc('D', '2.3'), presc('E', '3.2')] },
  // the seasons: E 1.1 „Identifică elementele caracterisice ale unor fenomene/relații din mediul apropiat”; CP 3.1
  // „Descrierea unor fenomene/procese/ structuri repetitive simple din mediul apropiat, în scopul identificării
  // unor regularități” (the seasons come back every year, each with its signs)
  season: { presc: presc('E', '1.1'), CP: school(MEM, 'CP', '3.1') },
  // the weather symbols and their names (CP contents „Fenomene ale naturii: ploaie, ninsoare, vânt, fulger,
  // tunet”): E 1.1, CP 4.1 (the symbols are „reprezentări prin desene”, the names „limbajul comun”)
  weather: { presc: presc('E', '1.1'), CP: school(MEM, 'CP', '4.1') },
  // „dacă plouă, atunci iei umbrela”: CP 4.2 „Identificarea relațiilor de tipul „dacă... atunci…” între două
  // evenimente succesive”; E 1.4 „Identifică posibile răspunsuri/soluții la întrebări, situații - problemă și
  // provocări din viața proprie și a grupului de colegi”
  wear: { presc: presc('E', '1.4'), CP: school(MEM, 'CP', '4.2') },
  // water (clasa I contents „Transformări ale apei: solidificare, topire, evaporare, fierbere, condensare”):
  // solid or liquid, I 4.1 „Formularea rezultatelor unor observații, folosind câțiva termeni științifici,
  // reprezentări prin desene și operatorii logici „și”, „sau”, „nu””; what happens to it, I 4.2
  // „Identificarea unor consecințe ale unor acțiuni, fenomene, procese simple”
  water: { I: school(MEM, 'I', '4.1') },
  melt: { I: school(MEM, 'I', '4.2') },
  // ── Arte vizuale și abilități practice (subjects-pages.ts). „Decupează și lipește”: pieces cut along their
  // outline and glued on the picture. CP 2.3 „Realizarea de aplicații/compoziții/obiecte/ construcții simple, pe
  // baza interesului direct” (contents, Colaj: „mototolire, rupere, tăiere, decupare după contur, îndoire,
  // răsucire, lipire”); I 2.3 „Realizarea de obiecte/construcții/folosind materiale ușor de prelucrat și tehnici
  // accesibile” (Colaj: „…tăiere, decupare după contur…”). Not II: its Colaj techniques are „îndoirea, împletirea,
  // origami, tangram”, no cutting out.
  cut: { CP: school(AVAP, 'CP', '2.3'), I: school(AVAP, 'I', '2.3') },
  // „Linii și puncte”: each stripe with the kind of line or point shown next to it. CP 1.2 „Identificarea liniei,
  // a punctului, a culorii și a formei în ipostaze familiare, în spațiul înconjurător”, I 1.2 „Identificarea
  // liniei, a punctului, a culorii și a formei în contexte cunoscute” (contents, Desen: „linia, punctul, forma”).
  // Not II 1.2 („…în opere de artă”).
  lines: { CP: school(AVAP, 'CP', '1.2'), I: school(AVAP, 'I', '1.2') },
  // „Simetrie” and „Desenează după model”: no AVAP competence or content names symmetry or copying a drawing
  // (the axis of symmetry is a MEM II content of plane figures, not of drawings), so no code.
  sym: {},
  model: {},
  // ── Dezvoltare personală. The faces and „Cum se simte?”: CP 2.1 „Recunoașterea emoțiilor de bază în situații
  // simple, familiare” (contents „Emoții de bază denumite prin cuvinte (bucurie, tristețe, frică, furie)…”);
  // I 2.1 „Asocierea emoțiilor de bază cu elemente simple de limbaj nonverbal și paraverbal” (contents „…elemente
  // simple de limbaj nonverbal (expresii faciale, postură)…”). Not II 2.1 („Exprimarea emoțiilor…”).
  feel: { CP: school(DP, 'CP', '2.1'), I: school(DP, 'I', '2.1') },
  // „Despre mine”: CP 1.1 „Identificarea unor trăsături personale elementare” (contents „Cine sunt eu? Trăsături
  // fizice”), I 1.1 „Prezentarea unor trăsături personale elementare, în contexte variate”.
  me: { CP: school(DP, 'CP', '1.1'), I: school(DP, 'I', '1.1') },
  // the objects of hygiene: CP 1.2 „Identificarea unor obiecte și activități simple de igienă personală”
  hyg: { CP: school(DP, 'CP', '1.2') },
  // good and not good habits: I 1.2 „Identificarea unor reguli de igienă personală”. Not II 1.3 („Respectarea…”:
  // a sheet cannot show that a rule is kept).
  habit: { I: school(DP, 'I', '1.2') },
  // a job and its tool: I 3.3 „Explorarea unor meserii cunoscute sau preferate” (contents „Meserii cunoscute:
  // denumire, activități principale, unelte și instrumente, loc de desfășurare”)
  job: { I: school(DP, 'I', '3.3') },
  // what a job does for the others: II 3.3 „Prezentarea utilității unor meserii/profesii cunoscute” (contents „La ce
  // folosesc meseriile? Utilitatea socială a meseriilor: produse realizate, beneficii pentru sine și pentru comunitate”)
  jobuse: { II: school(DP, 'II', '3.3') },
  // the class rules: CP 2.2 „Identificarea regulilor de comunicare în activitatea școlară”
  rules: { CP: school(DP, 'CP', '2.2') },
  // ── Comunicare în limba modernă 1 (engleză): a picture and its written English word. 3.1 „Manifestarea
  // curiozității pentru decodarea unor mesaje scrise simple și scurte din universul imediat” (the same text in CP,
  // I and II; learning activities CP „reperarea etichetelor și asocierea lor cu imaginea”, I „asocierea
  // etichetelor cu imaginea”). Not 1.2 (that is listening).
  en: { CP: school(LM, 'CP', '3.1'), I: school(LM, 'I', '3.1'), II: school(LM, 'II', '3.1') },
  // ── the sheets that fill the gaps of the programme: „Comunicare” (clr-pages.ts). A key "kind:n" holds the
  // rule of one set (see ruleKeys), for the kinds whose sets are written for different classes.
  // „Povestea în imagini”: CLR CP 3.2 „Identificarea semnificației unei/ unor imagini care prezintă întâmplări,
  // fenomene, evenimente familiare” (contents: „Povestirea după imagini”, „Ordonarea propozițiilor pe baza unui
  // suport intuitiv”). Not I 3.2 or II 3.2: those are the message of a written text.
  story: { CP: school(CLR, 'CP', '3.2') },
  // „Semne și simboluri”: CP 3.3 „Identificarea semnificației unor simboluri care transmit mesaje de necesitate
  // imediată, din universul familiar” (contents: „Simboluri uzuale din universul apropiat: metrou, intrare, ieșire,
  // spital, trecere de pietoni etc.”); I 3.3 „Identificarea semnificației unor simboluri din universul familiar,
  // care transmit mesaje simple”; II 3.3 „Identificarea semnificației unor simboluri, în contexte cunoscute” (set 3:
  // each sign in a context, „La teatru vezi acest semn…”)
  'sign:1': { CP: school(CLR, 'CP', '3.3'), I: school(CLR, 'I', '3.3') },
  'sign:2': { I: school(CLR, 'I', '3.3') },
  'sign:3': { II: school(CLR, 'II', '3.3') },
  // the card to complete (felicitarea, biletul, invitația): CP 4.2 „Redactarea unor mesaje simple, în contexte
  // uzuale de comunicare” (contents: „Felicitarea”, „Biletul”); in capitals, so not I 4.2 („…cu litere de mână…”)
  note: { CP: school(CLR, 'CP', '4.2') },
  // an invitation, a poster, a note with questions: II 3.1 „Citirea unor mesaje scrise, întâlnite în mediul
  // cunoscut” (contents of clasa a II-a: „Biletul…”, „Felicitarea”, „Afișul”)
  msg: { II: school(CLR, 'II', '3.1') },
  // the cards with and without writing: D 3.3 „Identifică prezența mesajului scris, apreciază și valorifică mesajul
  // scris în activitățile curente”
  written: { presc: presc('D', '3.3') },
  // ── „Matematică și explorarea mediului” (mem-pages.ts). „Termenii operațiilor”, the set of each class:
  // CP 1.6 „Utilizarea unor denumiri și simboluri matematice (sumă, total, diferență, =, +. -) în rezolvarea și/sau
  // compunerea de probleme”; I 1.6 „…(termen, sumă, total, diferență, <, >, =, +. -)…”; II 1.6 „…(sumă, total,
  // termenii unei sume, diferență, rest, descăzut, scăzător, produs, factorii unui produs, cât, deîmpărțit,
  // împărțitor, <, >, =, +, -, ·, :)…”
  'terms:1': { CP: school(MEM, 'CP', '1.6') },
  'terms:2': { CP: school(MEM, 'CP', '1.6') },
  'terms:3': { I: school(MEM, 'I', '1.6') },
  'terms:4': { I: school(MEM, 'I', '1.6') },
  'terms:5': { II: school(MEM, 'II', '1.6') },
  'terms:6': { II: school(MEM, 'II', '1.6') },
  // hundreds, tens and units, the numbers in digits and in words: II 1.1 „Scrierea, citirea și formarea numerelor
  // până la 1000” (contents: „…recunoaștere, formare, citire, scriere, (cu cifre și litere)…”)
  place: { II: school(MEM, 'II', '1.1') },
  // the grid A–E × 1–5: II 2.1 „Localizarea unor obiecte prin stabilirea unor coordonate în raport cu un sistem de
  // referință dat, folosind sintagmele învățate”
  coord: { II: school(MEM, 'II', '2.1') },
  // sides, vertices, the axis of symmetry; the faces and vertices of the solids: II 2.2 „Evidențierea unor
  // caracteristici simple specifice formelor geometrice plane și corpurilor geometrice identificate în diferite
  // contexte” (contents: „Pătrat, dreptunghi, triunghi, cerc, semicerc: axa de simetrie”, „Cub, cuboid, cilindru,
  // sferă, con…”). Not I 2.2: the cone is not in the clasa I contents.
  sides: { II: school(MEM, 'II', '2.2') },
  solid: { II: school(MEM, 'II', '2.2') },
  // patterns and regularities: I 3.1 „Rezolvarea de probleme prin observarea unor regularități din mediul
  // apropiat”; II 3.1 „Rezolvarea de probleme în cadrul unor investigații, prin observarea și generalizarea unor
  // modele sau regularități din mediul apropiat” (the rule written, the figures that grow)
  'regular:1': { I: school(MEM, 'I', '3.1') },
  'regular:2': { I: school(MEM, 'I', '3.1') },
  'regular:3': { II: school(MEM, 'II', '3.1') },
  'regular:4': { II: school(MEM, 'II', '3.1') },
  // the table of two criteria: I 5.1 „Sortarea și clasificarea unor date din mediul apropiat pe baza a două
  // criterii”; II 5.1 „Sortarea, clasificarea și înregistrarea prin desene și tabele a unor date din mediul cunoscut”
  sort2: { I: school(MEM, 'I', '5.1'), II: school(MEM, 'II', '5.1') },
  // the steps of an experiment and the statements with „și”, „sau”, „nu”: II 4.1 „Descrierea unui plan de lucru
  // folosind câțiva termeni științifici, reprezentări prin desene și operatorii logici „ și”, „sau”, „nu””
  plan: { II: school(MEM, 'II', '4.1') },
  // „dacă…, atunci…” and the consequence written: II 4.2 „Formularea unor consecințe rezultate în urma observării
  // unor relații, fenomene, procese simple” (magnets, electricity, sound: clasa a II-a contents)
  cause: { II: school(MEM, 'II', '4.2') },
  // the shape of everyday objects: E 2.3 „Identifică și numește formele obiectelor din mediul înconjurător”; CP 2.2
  // „Identificarea unor forme geometrice plane (pătrat, triunghi, dreptunghi, cerc)… în obiecte manipulate de copii
  // și în mediul înconjurător”; I 2.2 „Recunoașterea unor figuri și corpuri geometrice în mediul apropiat…”
  around: { presc: presc('E', '2.3'), CP: school(MEM, 'CP', '2.2'), I: school(MEM, 'I', '2.2') },
  // count each kind, colour the pictogram, the most and the fewest: E 2.5 „Rezolvă situații-problemă, pornind de
  // la sortarea și reprezentarea unor date”
  pict: { presc: presc('E', '2.5') },
  // faster, warmer, louder, first: E 1.2 „Compară experiențe, acțiuni, evenimente, fenomene/relații din mediul
  // apropiat”. No sheet for E 3.1 („Evidențiează caracteristicile unor obiecte localizate în spațiul
  // înconjurător”): it asks for real objects observed in the room, not pictures.
  more: { presc: presc('E', '1.2') },
};

/** Topics whose sheet does not depend on the number range (only „groups” does): the range never takes their code away. */
const RANGE_FREE = new Set(['mul', 'div', 'mulmiss', 'clock', 'clockdraw', 'week', 'months', 'calmonth', 'length', 'mass', 'ruler', 'units', 'frac', 'figures']);
/** Clasa I: „Ora (ora fixă, jumătatea de oră)”: clocks with quarters or minutes are clasa a II-a. */
const CLOCK_I = new Set(['hour', 'half']);
/** „Grupe egale” writes the multiplication only in 0–1000 (multiply.ts groupsWithProduct): II 1.5 only there. */
const GROUPS_II = 1000;

/** The largest number each class works with, per the programme's contents. */
const NUMBER_LIMIT: Record<SchoolLevel, number> = { presc: 10, CP: 31, I: 100, II: 1000 };

function ruleKeys(config: WorksheetConfig): string[] {
  if (config.category === 'math') return config.selectedItems;
  // "kind:n" when one set has its own rule (sign:1, terms:3 …), else the kind
  if (config.category === 'games') return config.selectedItems.map((i) => (readingSetLevel(i) ? `${i.split(':').slice(0, 2).join(':')}:${readingSetLevel(i)}` : i in RULES ? i : i.split(':')[0]));
  return [config.category];
}

/**
 * The competences of this sheet for the given class: unique, all from one programme, all
 * existing in the programme data. Empty when nothing fits.
 */
/** The four plane shapes the programme names for CP and clasa I. */
const BASIC_SHAPES = new Set(['circle', 'square', 'triangle', 'rectangle']);
/** CP additions and subtractions add or take away 1–5 elements: only the 0–10 sheets fit. */
const CP_OPERATIONS = new Set(['add', 'sub', 'mix', 'addpic', 'missing', 'problems']);
/**
 * Clasa a II-a, 0–1000: „Adunarea și scăderea în concentrul 0 – 1000, fără trecere peste ordin”
 * (contents of II 1.4). These sheets carry in 0–1000 when „cu” or „amestecat” is chosen: then no
 * II code (carrying with hundreds is clasa a III-a, 0–10 000). Unset is „fără” (math.ts defaultCarry).
 */
const II_OPERATIONS = new Set(['add', 'sub', 'mix', 'missing']);
/** II 6.3 only for the money sheet of 0–1000 (the one with 200 and 500 de lei). */
const MONEY_II = 1000;

export function sheetCompetences(config: WorksheetConfig, level: SchoolLevel | undefined | null): CompetenceRef[] {
  if (!level) return [];
  // numbers beyond the class: no code, except for the topics that do not use the range
  const overRange = config.category === 'math' && (config.mathRange ?? 10) > NUMBER_LIMIT[level];
  if (overRange && !config.selectedItems.some((i) => RANGE_FREE.has(i))) return [];
  if (config.category === 'shapes' && level !== 'presc' && !config.selectedItems.every((s) => BASIC_SHAPES.has(s))) return [];
  const refs: CompetenceRef[] = [];
  if (config.category === 'letters') {
    const r = lettersRule(config, level);
    if (r) refs.push(r);
  } else {
    for (const key of ruleKeys(config)) {
      // …except 0–31, where one term is always 1–5 (math.ts): CP 1.4 „Efectuarea de adunări și
      // scăderi în concentrul 0-31, prin adăugarea /extragerea a 1-5 elemente dintr-o mulțime dată”
      const cpOperations31 = level === 'CP' && config.mathRange === 31;
      if (level === 'CP' && CP_OPERATIONS.has(key) && (config.mathRange ?? 10) > 10 && !cpOperations31) continue;
      if (level === 'II' && II_OPERATIONS.has(key) && config.mathRange === 1000 && (config.mathCarry ?? 'without') !== 'without') continue;
      if (level === 'II' && key === 'money' && config.mathRange !== MONEY_II) continue;
      if (overRange && !RANGE_FREE.has(key)) continue;
      if (level === 'I' && (key === 'clock' || key === 'clockdraw') && !CLOCK_I.has(config.mathClock ?? 'half')) continue;
      if (level === 'II' && key === 'groups' && config.mathRange !== GROUPS_II) continue;
      const r = RULES[key]?.[level];
      if (r) refs.push(...(Array.isArray(r) ? r : [r]));
    }
  }
  const seen = new Set<string>();
  const unique = refs.filter((r) => {
    const k = `${r.programme}|${r.domain ?? ''}|${r.code}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return Boolean(findCompetence(r));
  });
  // one programme per label: keep the programme of the first match
  return unique.filter((r) => r.programme === unique[0]?.programme).sort((a, b) => `${a.domain ?? ''}${a.code}`.localeCompare(`${b.domain ?? ''}${b.code}`, 'ro', { numeric: true }));
}

const SUBJECT: Record<ProgrammeId, string> = {
  'et-presc': 'Curriculum pentru educație timpurie',
  'clr-p-ii': 'Comunicare în limba română',
  'mem-p-ii': 'Matematică și explorarea mediului',
  'llr-iii-iv': 'Limba și literatura română',
  'mate-iii-iv': 'Matematică',
  'avap-p-ii': 'Arte vizuale și abilități practice',
  'dp-p-ii': 'Dezvoltare personală',
  'lm-p-ii': 'Comunicare în limba modernă 1',
};
const LEVEL_NAME: Record<Level, string> = {
  '3-6': 'nivel preșcolar',
  CP: 'clasa pregătitoare',
  I: 'clasa I',
  II: 'clasa a II-a',
  III: 'clasa a III-a',
  IV: 'clasa a IV-a',
};

/**
 * The line printed on the sheet: „Competența specifică 4.1 · Comunicare în limba română, clasa pregătitoare”,
 * „Competențele specifice 1.2, 1.4 · …”, „Comportament vizat D.3.4 · Curriculum pentru educație timpurie,
 * nivel preșcolar”. Null when nothing fits.
 */
export function sheetCompetenceLabel(config: WorksheetConfig, level: SchoolLevel | undefined | null): string | null {
  const refs = sheetCompetences(config, level);
  if (!refs.length) return null;
  const first = refs[0];
  const where = `${SUBJECT[first.programme]}, ${LEVEL_NAME[first.level]}`;
  if (first.programme === 'et-presc') {
    // as teachers write it in their plans: „Comportament vizat D.3.4”
    const codes = refs.map((r) => `${r.domain}.${r.code}`).join(', ');
    return `${refs.length === 1 ? 'Comportament vizat' : 'Comportamente vizate'} ${codes} · ${where}`;
  }
  // „specifică”: never mistaken for general competence 4
  const codes = refs.map((r) => r.code).join(', ');
  return `${refs.length === 1 ? 'Competența specifică' : 'Competențele specifice'} ${codes} · ${where}`;
}
