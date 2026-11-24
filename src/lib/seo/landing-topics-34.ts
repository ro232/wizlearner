import type { SchoolLevel } from '@/lib/curriculum/sheet';
import type { Ctx, Topic, TopicPreset } from './landing-topics';

/**
 * The topics of the „Fișe de lucru” landing pages that exist only in clasa a III-a and a IV-a (programmes llr-iii-iv and
 * mate-iii-iv, OMEN 5003/2014). The copy is written by hand for each class, as in landing-topics.ts; a class without its
 * text throws, so a test catches a page without copy.
 */

function by<T>(c: Ctx, texts: Partial<Record<SchoolLevel | 'default', T>>): T {
  const t = texts[c.level] ?? texts.default;
  if (t === undefined) throw new Error(`no text for ${c.level}`);
  return t;
}
const p = (id: string, ...levels: SchoolLevel[]): TopicPreset => (levels.length ? { id, levels } : { id });
const UPPER: SchoolLevel[] = ['III', 'IV'];

export const TOPICS_34: Topic[] = [
  // ───────────────────────── Matematică ─────────────────────────
  {
    slug: 'numerele-naturale',
    phrase: (l) => (l === 'III' ? 'Fișe numere până la 10 000' : 'Fișe numere până la 1 000 000'),
    label: 'Numerele naturale',
    area: 'mem',
    levels: UPPER,
    presets: [p('numerele-naturale')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Numere de patru cifre: scrise cu cifre și cu litere, descompuse în mii, sute, zeci și unități, comparate și ordonate.',
        IV: 'Numere de până la șase cifre: clasa unităților și clasa miilor, scriere cu cifre și cu litere, comparare și ordonare.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, concentrul se lărgește la 0–10 000. Copilul formează, citește și scrie numere de patru cifre, înțelege că 4 052 are 4 mii, 0 sute, 5 zeci și 2 unități și compară numere care încep cu aceleași cifre, unde trebuie să se uite atent la ordinul următor.',
          IV: 'La clasa a IV-a, numerele ajung până la un milion. Copilul citește și scrie numere de șase cifre, grupate câte trei (456 789), recunoaște cifra zecilor de mii sau a sutelor de mii și ordonează numere apropiate, cum sunt 547 648 și 517 864.',
        }),
        'Fișa are cinci cerințe: numere scrise cu litere de trecut în cifre, numere în cifre de scris cu litere, valoarea cifrelor, perechi de comparat cu <, > sau = și un șir de ordonat. Numerele scrise cu litere urmează forma din dicționar: „două mii”, „douăzeci și una de mii”, „o sută de mii”.',
        by(c, {
          III: 'Pentru exersare în plus există și fișele de comparare, de adunări și de scăderi în concentrul 0–10 000, din același generator. Cifrele romane și rotunjirea au fișe separate.',
          IV: 'Din generator poți face și comparări, adunări și scăderi în concentrul 0–1 000 000, cu numerele scrise mare, câte un exercițiu pe rând, ca să încapă șase cifre fără să se înghesuie.',
        }),
        'Pagina cu răspunsuri, pe care o bifezi în generator, are numerele scrise corect, inclusiv forma cu litere, ca părintele să poată verifica fără să numere cu creionul.',
      ],
      description: by(c, {
        III: 'Fișă cu numere până la 10 000 pentru clasa a III-a: scriere cu cifre și litere, mii, sute, zeci, comparare și ordonare. PDF cu răspunsuri.',
        IV: 'Fișă cu numere până la un milion pentru clasa a IV-a: scriere cu cifre și litere, valoarea cifrelor, comparare, ordonare. PDF cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Cum se scriu corect numerele mari cu litere?',
          a: 'Miile se numără la feminin: „o mie”, „două mii”, „douăsprezece mii”, „douăzeci și una de mii”. După 20, „de” apare înaintea cuvântului „mii” când numărul nu se termină în 01–19: „treizeci de mii”, dar „o sută cincisprezece mii”. Fișa nu cere formele în care manualele diferă.',
        },
      ],
    }),
  },
  {
    slug: 'cifre-romane',
    phrase: 'Fișe cifre romane',
    label: 'Cifre romane',
    area: 'mem',
    levels: UPPER,
    presets: [p('cifre-romane')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Cifrele romane I, V și X: numere de la 1 la 39 de scris, de citit și de calculat.',
        IV: 'Toate cifrele romane, I, V, X, L, C, D, M: numere mari, ani și secole.',
      }),
      body: [
        by(c, {
          III: 'Programa clasei a III-a cere formarea, citirea și scrierea numerelor cu cifrele romane I, V și X. Pe fișă, copilul trece numere din cifre arabe în cifre romane și invers, recunoaște scrierea corectă (IV, nu IIII) și face adunări mici, cu rezultatul scris tot roman.',
          IV: 'La clasa a IV-a se adaugă L, C, D și M. Copilul scrie numere ca 49, 90, 400 sau 1999, citește numere ca MCMXC și află că anii și secolele se scriu des cu cifre romane, pe clădiri, în cărți sau pe ceasuri.',
        }),
        'Regula de bază e scrisă sus, pe fișă: o cifră mai mică așezată în fața uneia mai mari se scade (IX = 9), după ea se adună (XI = 11), și nicio cifră nu se repetă de mai mult de trei ori. Exercițiul „încercuiește scrierea corectă” pune față în față greșeala tipică și forma bună.',
        'Fișa se face în 15–20 de minute și merge bine ca recapitulare înainte de o lucrare. Butonul „Alte exerciții” nu schimbă setul; pentru alte numere alegi al doilea set al clasei din lista de fișe.',
      ],
      description: by(c, {
        III: 'Fișă cu cifre romane pentru clasa a III-a: I, V, X, numere de la 1 la 39 de scris, citit și adunat. PDF de printat, cu competența 2.1 și răspunsuri.',
        IV: 'Fișă cu cifre romane pentru clasa a IV-a: I, V, X, L, C, D, M, numere mari, ani și secole. PDF de printat, cu competența din programă și răspunsuri.',
      }),
      faq: [
        {
          q: 'Ce cifre romane se învață în fiecare clasă?',
          a: 'La clasa a III-a, programa cere I, V și X; la clasa a IV-a, toate cele șapte: I, V, X, L, C, D, M. De aceea fișa clasei a III-a merge doar până la 39 (XXXIX).',
        },
      ],
    }),
  },
  {
    slug: 'rotunjirea-numerelor',
    phrase: 'Fișe rotunjirea numerelor',
    label: 'Rotunjirea numerelor',
    area: 'mem',
    levels: UPPER,
    presets: [p('rotunjire')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Rotunjirea la zeci, la sute și la mii, cu numere de patru cifre.',
        IV: 'Rotunjirea numerelor de șase cifre: la sute, la mii, la zeci și la sute de mii.',
      }),
      body: [
        by(c, {
          III: 'Rotunjirea apare în programa clasei a III-a lângă formarea, compararea și ordonarea numerelor până la 10 000. Copilul învață să spună „cam câte”: 4 387 rotunjit la sute este 4 400, pentru că e mai aproape de 4 400 decât de 4 300.',
          IV: 'La clasa a IV-a, rotunjirea se face cu numere până la un milion, la ordinele mari. Un oraș cu 347 812 locuitori are „cam 350 000”, rotunjit la zeci de mii; fișa pune aceeași întrebare în exerciții scurte și într-o problemă.',
        }),
        'Pe fișă sunt trei grupe de exerciții, câte una pentru fiecare ordin, apoi alegeri între cei doi vecini rotunzi (4 300 sau 4 400?) și o propoziție din viața de zi cu zi. Semnul ≈, „aproximativ egal”, apare lângă fiecare exercițiu, ca în manual.',
        'Regula este cea din școală: te uiți la cifra din dreapta ordinului la care rotunjești; 0–4 rămâne, 5–9 crește cu 1. Fișa are și cazul de la jumătate (4 350 la sute), care se rotunjește în sus și pe care copiii îl greșesc cel mai des.',
      ],
      description: by(c, {
        III: 'Fișă de rotunjire pentru clasa a III-a: numere până la 10 000 rotunjite la zeci, sute și mii, cu semnul ≈. PDF de printat, cu pagină de răspunsuri.',
        IV: 'Fișă de rotunjire pentru clasa a IV-a: numere de șase cifre rotunjite la sute, mii, zeci și sute de mii. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'De ce codul tipărit este 2.2, „Compararea numerelor naturale”?',
          a: 'Programa pune rotunjirea între conținuturile despre numere, dar nicio competență specifică nu o numește. Cel mai aproape este compararea: ca să rotunjești, compari numărul cu cei doi vecini rotunzi. Dacă în planificarea ta o legi de altă competență, o treci acolo.',
        },
      ],
    }),
  },
  {
    slug: 'ordinea-operatiilor',
    phrase: 'Fișe ordinea efectuării operațiilor',
    label: 'Ordinea operațiilor',
    area: 'mem',
    levels: UPPER,
    presets: [p('ordinea-operatiilor')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Înmulțirea și împărțirea înaintea adunării și scăderii; parantezele rotunde.',
        IV: 'Exerciții cu paranteze rotunde și pătrate, în ordinea corectă a operațiilor.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, copilul află că 24 + 6 · 3 nu înseamnă 30 · 3. Programa cere ordinea efectuării operațiilor și folosirea parantezelor rotunde, cu înmulțiri din tabla înmulțirii și împărțiri exacte, așa că fiecare pas se poate face în minte.',
          IV: 'La clasa a IV-a, exercițiile au și paranteze pătrate: întâi cele rotunde, apoi cele pătrate, apoi înmulțirile și împărțirile, la sfârșit adunările și scăderile. Numerele sunt mai mari, iar rezultatul rămâne număr natural la fiecare pas.',
        }),
        'Fișa începe cu exerciții fără paranteze, continuă cu paranteze și se încheie cu „adevărat sau fals”: unele rezultate sunt calculate corect, altele de la stânga la dreapta, greșeala cea mai des întâlnită. Copilul trebuie să-și dea seama care sunt bune.',
        by(c, {
          III: 'Ultima cerință îl pune pe copil să scrie el exercițiul după un enunț („la 10 adaugă produsul numerelor 2 și 5”), legătura dintre cuvinte și paranteze care ajută mai târziu la probleme.',
          IV: 'E bine ca fișa să vină după ce exercițiile au fost lucrate la tablă pas cu pas, subliniind operația care se face prima. Pagina cu răspunsuri dă rezultatul final; pașii îi verifici pe caiet.',
        }),
      ],
      description: by(c, {
        III: 'Fișă cu ordinea efectuării operațiilor pentru clasa a III-a: înmulțiri înaintea adunărilor, paranteze rotunde, adevărat sau fals. PDF cu răspunsuri.',
        IV: 'Fișă cu ordinea efectuării operațiilor pentru clasa a IV-a: paranteze rotunde și pătrate, numere mari, adevărat sau fals. PDF cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Rezultatele sunt mereu numere naturale?',
          a: 'Da. Generatorul alege numerele astfel încât fiecare scădere să dea un număr pozitiv și fiecare împărțire să fie exactă, ca la clasă. Dacă vrei alte exerciții, alegi celălalt set al clasei.',
        },
      ],
    }),
  },
  {
    slug: 'inmultirea-in-coloana',
    phrase: 'Fișe înmulțirea în coloană',
    label: 'Înmulțirea în coloană',
    area: 'mem',
    levels: UPPER,
    presets: [p('inmultire-in-coloana')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Înmulțiri cu 10 și 100, cu un factor de o cifră și cu factori de două cifre, pe pătrățele.',
        IV: 'Înmulțiri cu 10, 100, 1000 și înmulțiri în coloană cu factori de până la trei cifre.',
      }),
      body: [
        by(c, {
          III: 'Programa clasei a III-a duce înmulțirea dincolo de tablă: un număr înmulțit cu 10 sau 100, un număr de mai multe cifre înmulțit cu unul de o cifră și înmulțiri cu factori de două cifre, cu rezultatul cel mult 10 000. Fișa le are pe toate, în această ordine.',
          IV: 'La clasa a IV-a, factorii au cel mult trei cifre, iar produsul poate ajunge aproape de un milion. Copilul înmulțește în minte cu 10, 100, 1 000, lucrează în coloană 345 · 27 sau 512 · 304 și folosește proprietățile înmulțirii ca să calculeze ușor 25 · 47 · 4.',
        }),
        'Exercițiile în coloană au, fiecare, un câmp de pătrățele de 5 mm, ca în caietul de matematică, ca cifrele să stea una sub alta. Rezultatele sunt pe pagina cu răspunsuri; așezarea calculului o verifici direct pe fișă.',
        'Fișa e bună după lecția despre înmulțirea în coloană, ca exercițiu individual. Pentru tabla înmulțirii propriu-zisă, la clasa a III-a, folosește fișele „Înmulțiri”, cu o tablă aleasă sau toate amestecate.',
      ],
      description: by(c, {
        III: 'Fișă de înmulțire pentru clasa a III-a: cu 10 și 100, cu un factor de o cifră, cu două cifre, în coloană, pe pătrățele. PDF cu răspunsuri.',
        IV: 'Fișă de înmulțire pentru clasa a IV-a: cu 10, 100, 1000, în coloană cu factori de trei cifre, grupări care ușurează calculul. PDF cu răspunsuri.',
      }),
      faq: [
        {
          q: 'De ce sunt pătrățele sub exerciții?',
          a: 'Înmulțirea în coloană cere cifrele aliniate: unitățile sub unități, zecile sub zeci. Pătrățelele de 5 mm sunt ca cele din caietul de matematică, așa că elevul lucrează pe fișă la fel ca în caiet.',
        },
      ],
    }),
  },
  {
    slug: 'fractii',
    phrase: 'Fișe fracții',
    label: 'Fracții',
    area: 'mem',
    levels: UPPER,
    presets: [p('fractii-34'), p('fractii-34-2')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Doimi, treimi, … zecimi: partea colorată, numărătorul și numitorul, compararea și adunarea fracțiilor cu același numitor.',
        IV: 'Fracții subunitare, echiunitare, supraunitare, sutimi și procente (25 %, 50 %, 75 %).',
      }),
      body: [
        by(c, {
          III: 'Fracțiile apar la clasa a III-a ca diviziuni ale unui întreg: o pizza tăiată în opt felii egale, din care s-au mâncat trei, înseamnă trei optimi. Programa cere fracții cu numitorul cel mult 10, reprezentări prin desene, termenii fracției și compararea fracțiilor cu același numitor.',
          IV: 'La clasa a IV-a, fracțiile pot fi și mai mari decât un întreg (supraunitare), se compară și când au același numărător, se adună și se scad cu același numitor, iar sutimile pregătesc scrierea procentuală: 25 % este 25 de sutimi, adică un sfert.',
        }),
        'Toate fracțiile de pe fișe sunt scrise ca la tablă, cu numărătorul deasupra liniei de fracție și numitorul dedesubt, iar căsuțele de completat au aceeași formă. Figurile (cercuri, benzi, pătrate de 10 × 10) sunt împărțite în părți egale, iar partea colorată se citește ușor și la imprimarea alb-negru.',
        by(c, {
          III: 'A doua fișă a clasei trece la comparare, ordonare și adunări de tipul 3/7 + 2/7, plus o mică problemă cu felii de pizza. Ambele au pagină de răspunsuri.',
          IV: 'A doua fișă a clasei este despre sutimi și procente: pătrate cu 100 de pătrățele, fracții scrise cu litere („treizeci și șapte de sutimi”) și legătura dintre 50 % și o doime.',
        }),
      ],
      description: by(c, {
        III: 'Fișe cu fracții pentru clasa a III-a: partea colorată, numărător și numitor, comparare, adunare cu același numitor. PDF de printat, cu răspunsuri.',
        IV: 'Fișe cu fracții pentru clasa a IV-a: subunitare, echiunitare, supraunitare, adunări, sutimi și procente 25 %, 50 %, 75 %. PDF cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Fișa are și „fracția dintr-un număr”?',
          a: 'Nu. Programa în vigoare pentru clasele a III-a și a IV-a nu are aflarea unei fracții dintr-un număr printre conținuturi; fișele rămân la ce cere programa: reprezentare, comparare, adunare și scădere cu același numitor, sutimi și procente.',
        },
      ],
    }),
  },
  {
    slug: 'perimetrul',
    phrase: 'Fișe perimetrul',
    label: 'Perimetrul',
    area: 'mem',
    levels: UPPER,
    presets: [p('perimetrul')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Perimetrul pătratului, dreptunghiului și triunghiului, din desene și din probleme.',
        IV: 'Perimetrul rombului, paralelogramului și triunghiului; latura aflată din perimetru; aria pe pătrățele de 1 cm.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, perimetrul este „drumul din jurul figurii”: suma lungimilor tuturor laturilor. Copilul adună laturile unui pătrat, ale unui dreptunghi și ale unui triunghi desenate, apoi rezolvă două probleme: gardul unui teren pătrat și marginea unei grădini dreptunghiulare.',
          IV: 'La clasa a IV-a, figurile sunt mai multe (romb, paralelogram), iar perimetrul se folosește și invers: dacă un pătrat are perimetrul de 36 cm, latura lui are 9 cm. Programa adaugă aria, estimată pe o rețea de pătrate cu latura de 1 cm, iar fișa o are pe pătrățele adevărate de 1 cm.',
        }),
        'Pe figuri sunt scrise lungimile laturilor, iar sub fiecare e un rând pentru calcul: „P = …”. Problemele au spațiu de lucru pe pătrățele, ca în caietul de matematică, iar pe pagina cu răspunsuri e scris tot calculul, nu doar rezultatul.',
        'Merge bine după o oră în care copiii au măsurat cu rigla marginile băncii sau ale caietului. La final, cine termină repede poate desena pe pătrățele o figură cu perimetrul dat.',
      ],
      description: by(c, {
        III: 'Fișă cu perimetrul pentru clasa a III-a: pătrat, dreptunghi, triunghi cu laturile scrise și două probleme. PDF de printat, cu calculul în răspunsuri.',
        IV: 'Fișă cu perimetrul și aria pentru clasa a IV-a: romb, paralelogram, latura din perimetru, aria pe pătrățele de 1 cm. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Pătrățelele de pe fișă au chiar 1 cm?',
          a: 'Da, dacă tipărești la mărimea reală (100 %, fără „potrivire în pagină”). Atunci copilul poate verifica cu rigla că latura fiecărui pătrățel are 1 cm, cum cere programa la arie.',
        },
      ],
    }),
  },
  {
    slug: 'geometrie',
    phrase: 'Fișe geometrie',
    label: 'Geometrie',
    area: 'mem',
    levels: UPPER,
    presets: [p('linii-unghiuri'), p('laturi-varfuri', 'III'), p('coordonate')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Dreaptă, semidreaptă, segment, linie frântă și curbă; laturile și unghiurile poligoanelor; coordonate.',
        IV: 'Unghiuri drepte, ascuțite și obtuze, drepte paralele și perpendiculare, poligoane, coordonate.',
      }),
      body: [
        by(c, {
          III: 'Elementele intuitive de geometrie ale clasei a III-a sunt punctul, linia dreaptă, frântă și curbă, semidreapta, segmentul, unghiul, pătratul, dreptunghiul, triunghiul, cercul și axa de simetrie. Fișele le iau pe rând: copilul numește liniile desenate, numără laturi, vârfuri și unghiuri și găsește unghiurile drepte.',
          IV: 'La clasa a IV-a, copilul deosebește unghiurile drepte de cele ascuțite și obtuze, recunoaște dreptele paralele și perpendiculare și numește poligoane noi: rombul și paralelogramul. Pe fișă, unghiurile sunt desenate în poziții diferite, nu doar „drept în colț”, ca să fie recunoscute cu adevărat.',
        }),
        'Desenele sunt simple și mari, cu linii groase, ca să se vadă bine și la imprimarea alb-negru. Pentru unghiuri, un colț de caiet sau o foaie îndoită ajută copilul să verifice dacă un unghi e drept.',
        by(c, {
          III: 'Tot aici sunt „Laturi, vârfuri, axa de simetrie” și „Coordonate”, un tabel cu coloanele A–E și rândurile 1–5, care exersează localizarea într-o rețea, conținut al clasei a III-a.',
          IV: 'Fișa „Coordonate”, un tabel A–E × 1–5 în care se caută și se desenează obiecte, pregătește citirea hărților și a planurilor, care apar la clasa a IV-a.',
        }),
      ],
      description: by(c, {
        III: 'Fișe de geometrie pentru clasa a III-a: dreaptă, semidreaptă, segment, unghiuri drepte, poligoane și coordonate. PDF de printat, cu răspunsuri.',
        IV: 'Fișe de geometrie pentru clasa a IV-a: unghiuri drepte, ascuțite, obtuze, drepte paralele și perpendiculare, poligoane, coordonate. PDF de printat.',
      }),
      faq: [
        {
          q: 'Cum deosebește copilul un unghi drept de unul ascuțit?',
          a: 'Cu un „echer” făcut din hârtie: o foaie îndoită de două ori are un colț drept. Pus peste unghi, arată dacă unghiul e la fel (drept), mai mic (ascuțit) sau mai mare (obtuz).',
        },
      ],
    }),
  },
  {
    slug: 'tabele-si-grafice',
    phrase: 'Fișe tabele și grafice',
    label: 'Tabele și grafice',
    area: 'mem',
    levels: UPPER,
    presets: [p('tabele-grafice')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Un tabel cu date din clasă și graficul cu bare pe care copilul îl desenează singur.',
        IV: 'Grafice cu bare și grafice liniare de citit, cu întrebări de comparare și de calcul.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, programa cere înregistrarea în tabele a unor date din viața de zi cu zi și construirea graficelor cu bare. Pe fișă, copilul citește câte cărți au citit cinci colegi, colorează atâtea pătrățele câte cărți are fiecare și răspunde cine a citit cel mai mult și câte cărți au citit toți.',
          IV: 'La clasa a IV-a, datele se organizează și se reprezintă grafic, iar graficul liniar se adaugă celui cu bare. Copilul citește câte bilete s-au vândut în fiecare zi la un teatru de păpuși și cum a crescut temperatura într-o zi de primăvară, apoi calculează diferențe și totaluri.',
        }),
        'Axele au gradații clare, din 1 în 1 sau din 10 în 10, iar barele sunt late, ca valorile să se citească fără rigla. Întrebările cer și o operație (suma, diferența), așa că fișa leagă statistica de calcul.',
        'Ca activitate în plus, clasa poate strânge propriile date (fructul preferat, cum vin elevii la școală) și le poate trece pe tablă în același fel de tabel și grafic.',
      ],
      description: by(c, {
        III: 'Fișă cu tabele și grafice pentru clasa a III-a: date din tabel, graficul cu bare de desenat, întrebări cu calcul. PDF de printat, cu competența 5.2.',
        IV: 'Fișă cu grafice pentru clasa a IV-a: grafic cu bare și grafic liniar, valori de citit, diferențe, totaluri. PDF de printat, cu competența 5.2.',
      }),
      faq: [
        {
          q: 'Copilul desenează el graficul?',
          a: by(c, {
            III: 'Da. La clasa a III-a graficul cu bare e gol: copilul colorează pătrățelele după tabel, apoi răspunde la întrebări.',
            IV: 'La clasa a IV-a graficele sunt desenate, iar accentul cade pe citirea și interpretarea lor; pentru construire poți folosi fișa clasei a III-a ca recapitulare.',
          }),
        },
      ],
    }),
  },
  // ───────────────────────── Limba și literatura română ─────────────────────────
  {
    slug: 'intelegerea-textului',
    phrase: 'Fișe înțelegerea textului',
    label: 'Înțelegerea textului',
    area: 'clr',
    levels: UPPER,
    presets: [p('citeste-intelege'), p('text-informativ'), p('asculta-raspunde')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Texte scurte scrise pentru fișă, narative și informative, cu întrebări pe două pagini.',
        IV: 'Texte narative și informative, cu întrebări de înțelegere, concluzii și legături cu experiența elevului.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, programa cere extragerea informațiilor de detaliu dintr-un text, o părere despre personaje, un răspuns emoțional la ce ai citit și găsirea cuvintelor-cheie. Fișa „Citește și înțelege” are o poveste („Ghiozdanul uitat”), întrebări cu variante, adevărat sau fals, ordinea întâmplărilor și două întrebări deschise.',
          IV: 'La clasa a IV-a, întrebările merg mai departe: ce concluzie se poate trage din text, ce înseamnă o expresie în contextul ei, ce propoziție din text îți susține părerea și dacă ți s-a întâmplat ceva asemănător. Povestea „Podul de peste pârâu” și textul despre Delta Dunării sunt scrise anume pentru aceste fișe.',
        }),
        'Toate textele sunt originale, nu copiate din manuale, iar fiecare întrebare cu variante are un singur răspuns corect, găsit în text sau dedus din el. Prima pagină are textul și întrebările de detaliu; a doua, întrebările care cer gândire și rândurile pentru răspuns, pe liniatura caietului clasei.',
        by(c, {
          III: '„Ascultă și răspunde” este pentru lectura cu voce tare: textul e pe o pagină separată, pentru învățător, iar elevii primesc doar întrebările, inclusiv una despre sensul unui cuvânt din poveste.',
          IV: '„Ascultă și răspunde” are textul pe pagina învățătorului și întrebări de deducție pentru elevi („De ce credeți că…?”), după programa de receptare a mesajelor orale.',
        }),
      ],
      description: by(c, {
        III: 'Fișe de înțelegere a textului pentru clasa a III-a: povești și texte informative originale, întrebări, adevărat sau fals, ordinea întâmplărilor. PDF.',
        IV: 'Fișe de înțelegere a textului pentru clasa a IV-a: texte originale, concluzii, sensul expresiilor, opinia susținută din text. PDF cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Textele sunt luate din manuale?',
          a: 'Nu. Toate textele sunt scrise pentru aceste fișe, cu vocabularul și lungimea potrivite clasei, ca să le poți folosi liber la clasă, la teme sau la evaluare.',
        },
      ],
    }),
  },
  {
    slug: 'partile-de-vorbire',
    phrase: 'Fișe părțile de vorbire',
    label: 'Părțile de vorbire',
    area: 'clr',
    levels: UPPER,
    presets: [p('partile-de-vorbire')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Substantivul, adjectivul, pronumele personal și verbul, recunoscute într-un text scurt.',
        IV: 'Părțile de vorbire și acordul dintre ele: greșeli de găsit și de corectat.',
      }),
      body: [
        by(c, {
          III: 'Programa clasei a III-a cere „intuirea” claselor de cuvinte, fără definiții: copilul recunoaște substantivul, adjectivul, pronumele personal și verbul după întrebări (cine? ce? cum este? ce face?). Fișa pornește de la un text de patru propoziții, „În grădină”, din care copilul sortează cuvintele într-un tabel.',
          IV: 'La clasa a IV-a, aceleași clase de cuvinte se folosesc ca să descoperi greșelile: „Copiii merge la muzeu” sau „Moara este veche și frumoși”. Programa cere sesizarea abaterilor din textele citite în vederea corectării lor, iar fișa pune elevul să rescrie propoziția corect.',
        }),
        'Pe lângă tabelul de sortat, fișa are pronume care țin locul unui substantiv, pluralul și timpul verbului (ieri, azi, mâine), iar a doua fișă a clasei lucrează subiectul și predicatul. Pe pagina cu răspunsuri sunt cuvintele fiecărei coloane și propozițiile corectate.',
        'Fișele se potrivesc după ce clasa a discutat oral un text și a pus întrebările de mai sus. Pentru recapitulare, merge și ca lucru în perechi: unul citește cuvântul, celălalt spune ce parte de vorbire este.',
      ],
      description: by(c, {
        III: 'Fișe cu părțile de vorbire pentru clasa a III-a: substantiv, adjectiv, pronume personal, verb, dintr-un text scurt; plural și timp. PDF cu răspunsuri.',
        IV: 'Fișe cu părțile de vorbire pentru clasa a IV-a: sortare, subiect și predicat, greșeli de acord de corectat. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Fișa are și numeralul?',
          a: 'Nu. Programa pentru clasele a III-a și a IV-a numește doar substantivul, adjectivul calificativ, pronumele personal și verbul, ca „intuire”, fără definiții. Numeralul vine mai târziu, la gimnaziu.',
        },
      ],
    }),
  },
  {
    slug: 'ortograme',
    phrase: 'Fișe ortograme',
    label: 'Ortograme',
    area: 'clr',
    levels: UPPER,
    presets: [p('ortograme')],
    copy: (c) => ({
      lead: by(c, {
        III: 's-a sau sa, s-au sau sau, i-a sau ia, i-au sau iau: forma potrivită în propoziție.',
        IV: 'Ortograme de recunoscut și de corectat: s-a, s-au, i-a, i-au, l-a, v-a, s-ar, n-ai, ne-am.',
      }),
      body: [
        by(c, {
          III: 'Ortogramele sunt cuvinte care se pronunță la fel, dar se scriu diferit: „s-a dus” și „cartea sa”. La clasa a III-a, programa cere aplicarea regulilor de ortografie în redactarea de text, iar fișa le exersează în propoziții scurte, în care doar una dintre forme se potrivește.',
          IV: 'La clasa a IV-a, accentul cade pe recunoașterea și corectarea greșelilor de ortografie. Pe fișă, fiecare propoziție din a doua cerință are o greșeală tipică („Sa făcut frig”), pe care elevul o găsește și o scrie corect.',
        }),
        'Fiecare propoziție a fost scrisă astfel încât să aibă un singur răspuns: verbul care urmează („s-au jucat”) sau sensul („vrei mere sau pere?”) exclude cealaltă formă. Variantele sunt așezate o dată în stânga, o dată în dreapta, ca răspunsul corect să nu fie mereu în același loc.',
        'Explicația scurtă din antet („s-a, s-au: urmează un verb; sau = ori”) poate fi citită împreună înainte de lucru. A doua fișă a clasei are alte perechi: l-a și la, v-a și va, ce-a și cea, ce-i și cei, respectiv s-ar și sar, n-ai și nai, ne-am și neam.',
      ],
      description: by(c, {
        III: 'Fișe cu ortograme pentru clasa a III-a: s-a / sa, s-au / sau, i-a / ia, i-au / iau, l-a / la, în propoziții cu un singur răspuns. PDF cu răspunsuri.',
        IV: 'Fișe cu ortograme pentru clasa a IV-a: alege forma corectă, apoi găsește și corectează greșelile; s-ar, n-ai, ne-am. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Ortogramele apar în programă?',
          a: 'Programa nu le numește ca listă; cere, la clasa a III-a, aplicarea regulilor de ortografie în redactarea de text, iar la clasa a IV-a recunoașterea și remedierea greșelilor de ortografie. De aceea pe fișă se tipărește competența 4.1 a clasei.',
        },
      ],
    }),
  },
  {
    slug: 'semne-de-punctuatie',
    phrase: 'Fișe semne de punctuație',
    label: 'Semne de punctuație',
    area: 'clr',
    levels: UPPER,
    presets: [p('semne-de-punctuatie')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Punctul, semnul întrebării, semnul exclamării, virgula, două puncte și linia de dialog.',
        IV: 'Semnele de punctuație de pus și de corectat, plus un dialog de scris corect.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, copilul alege semnul de la sfârșitul propoziției după intonație: întrebare, mirare sau o simplă constatare. Fișa continuă cu virgula din enumerare și din adresare („Andrei, vino!”), cu două puncte înaintea unei enumerări și se încheie cu un dialog de rescris pe rânduri.',
          IV: 'La clasa a IV-a, elevul pune semnele care lipsesc într-un mic dialog cu linia de dialog și două puncte, apoi găsește greșelile de punctuație din trei propoziții și le rescrie. La final, transformă un text fără semne într-un dialog corect.',
        }),
        'Căsuțele pentru semne sunt mici și așezate exact unde trebuie semnul, ca elevul să se concentreze pe alegere, nu pe căutare. Pe pagina cu răspunsuri sunt semnele, în ordine, și dialogul scris corect, rând cu rând.',
        'Fișa se potrivește după citirea unui text cu dialog: elevii observă întâi semnele în carte, apoi le folosesc ei. Rândurile de scris au liniatura caietului clasei: tip II la clasa a III-a, dictando la clasa a IV-a.',
      ],
      description: by(c, {
        III: 'Fișă cu semnele de punctuație pentru clasa a III-a: punct, semnul întrebării și al exclamării, virgula, două puncte, dialog. PDF cu răspunsuri.',
        IV: 'Fișă cu semnele de punctuație pentru clasa a IV-a: semne de pus, greșeli de corectat, dialog de rescris corect. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'Pe ce liniatură scriu elevii dialogul?',
          a: 'La clasa a III-a, pe rânduri ca în caietul tip II (cu liniile pentru literele mari și pentru codițe); la clasa a IV-a, pe linii dictando, ca în caietul pe care îl folosesc de obicei.',
        },
      ],
    }),
  },
  {
    slug: 'compunere',
    phrase: 'Fișe compunere',
    label: 'Compunere',
    area: 'clr',
    levels: UPPER,
    presets: [p('compunere'), p('compunere-2')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Compuneri cu plan: o întâmplare trăită și descrierea unui animal, pe rânduri tip II.',
        IV: 'Portretul unui personaj și o poveste cu început dat, cu plan simplu, pe rânduri dictando.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, programa cere povestirea pe scurt a unei întâmplări trăite sau imaginate și o scurtă descriere pornind de la întrebări de sprijin. Prima fișă are planul cu început, cuprins și încheiere pentru „O întâmplare din vacanță”, a doua întrebările care duc la descrierea animalului preferat.',
          IV: 'La clasa a IV-a, descrierea devine portret: un personaj dintr-o carte sau dintr-un film, cu trăsături fizice, trăsături morale dovedite prin fapte și părerea elevului. A doua fișă propune o poveste care pornește de la o cutie găsită în pod și cere folosirea dialogului.',
        }),
        'Fiecare fișă are sus planul, cu întrebări scurte pentru fiecare parte, apoi rânduri până la capătul paginii, pe liniatura obișnuită a clasei. Cuvintele de legătură („într-o zi, deodată, apoi, în cele din urmă”) sau adjectivele potrivite sunt scrise ca ajutor, nu ca model de copiat.',
        'Compunerile nu au răspuns unic, așa că fișa nu are pagină cu răspunsuri. Pentru evaluare, planul tipărit poate deveni chiar grila: are compunerea început, cuprins și încheiere? Răspunde la întrebările planului?',
      ],
      description: by(c, {
        III: 'Fișe de compunere pentru clasa a III-a: plan cu început, cuprins, încheiere, întâmplare trăită, descriere, rânduri tip II. PDF de printat.',
        IV: 'Fișe de compunere pentru clasa a IV-a: portretul unui personaj și o poveste cu început dat, cu plan simplu și rânduri dictando. PDF de printat.',
      }),
      faq: [
        {
          q: 'Pot pune numele elevului pe fișa de compunere?',
          a: 'Da. Numele scris în generator apare în antet, pe rândul „Nume”. Titlul compunerii îl scrie elevul pe primul rând, la mijloc, cum se face în caiet.',
        },
      ],
    }),
  },
  {
    slug: 'texte-functionale',
    phrase: 'Fișe texte funcționale',
    label: 'Texte funcționale',
    area: 'clr',
    levels: UPPER,
    presets: [p('texte-functionale'), p('texte-functionale-2')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Invitația și afișul, de completat pe un formular, cu loc pentru desen.',
        IV: 'Scrisoarea, anunțul și biletul, cu toate părțile lor, pe rânduri dictando.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, programa cere texte funcționale simple care îmbină cuvintele cu desenul: „limbaj vizual și verbal”. De aceea invitația are un spațiu pentru desen (baloane, tort), iar afișul pentru expoziția clasei începe cu desenul care trebuie să atragă privirea, apoi cu titlul, locul și data.',
          IV: 'La clasa a IV-a, textele funcționale sunt scurte, pe hârtie sau în format digital. Scrisoarea are pe formular toate părțile ei: localitatea și data, formula de adresare, cuprinsul, formula de încheiere și semnătura; a doua fișă are un anunț și un bilet pentru părinți.',
        }),
        'Formularele sunt desenate ca o carte poștală sau ca o foaie de scrisoare, cu etichete scurte pentru fiecare parte. Așa elevul vede structura textului înainte să scrie și nu uită nicio parte; mai târziu, același text îl scrie singur, fără formular.',
        'Fișele nu au răspunsuri unice; pe pagină, jos, e scris doar codul competenței. Un exercițiu bun după: elevii își schimbă invitațiile sau scrisorile între ei și verifică dacă au toate părțile.',
      ],
      description: by(c, {
        III: 'Fișe cu texte funcționale pentru clasa a III-a: invitația și afișul, pe formular, cu text și desen. PDF de printat, cu competența 4.2 pe fișă.',
        IV: 'Fișe cu texte funcționale pentru clasa a IV-a: scrisoarea cu toate părțile ei, anunțul și biletul. PDF de printat, cu competența 4.2 pe fișă.',
      }),
      faq: [
        {
          q: 'Ce texte funcționale se lucrează în fiecare clasă?',
          a: by(c, {
            III: 'Programa clasei a III-a dă ca exemple afișul, fluturașul, tabelul, cartea poștală și invitația; fișele au invitația și afișul, cele care cer și desen.',
            IV: 'Programa clasei a IV-a adaugă harta, planul simplu al unui traseu, mesajul text și emailul; fișele au scrisoarea, anunțul și biletul, cele mai folosite la clasă.',
          }),
        },
      ],
    }),
  },
  {
    slug: 'dictare',
    phrase: 'Fișe dictare',
    label: 'Dictare',
    area: 'clr',
    levels: UPPER,
    presets: [p('dictare')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Propoziții cu goluri pentru cuvintele dictate și rânduri tip II pentru propozițiile întregi.',
        IV: 'Dictare cu ortograme, â și î, cuvinte cu ghe, ghi, che, chi și rânduri dictando.',
      }),
      body: [
        by(c, {
          III: 'Dictarea pe fișă are două părți. În prima, elevul vede propozițiile și scrie doar cuvintele care lipsesc, cele grele: ortograme („s-a”, „i-a”), cuvinte cu â și î sau cu grupurile ce, ci, ghi. În a doua, scrie două propoziții întregi, pe rânduri ca în caietul tip II.',
          IV: 'La clasa a IV-a, propozițiile dictate au mai multe capcane: ortograme („ne-a”, „v-a”, „s-au”), linia de dialog, cuvinte ca „ghiocei” sau „lăcrămioare”. Prima parte cere doar cuvintele lipsă, a doua două propoziții întregi, pe rânduri dictando.',
        }),
        'Textul dictării e pe pagina cu răspunsuri, cu cuvintele lipsă în ordine, ca învățătorul sau părintele să-l citească de acolo. Fiecare propoziție se citește întreagă, de două ori, apoi încă o dată la verificare.',
        'Fișa ajută și copiii care scriu încet: nu trebuie să țină pasul cu tot textul, ci se concentrează pe cuvintele unde se greșește. La a doua dictare, aceiași copii pot încerca propozițiile întregi.',
      ],
      description: by(c, {
        III: 'Fișă de dictare pentru clasa a III-a: propoziții cu goluri pentru ortograme și cuvinte grele, rânduri tip II. Textul, pe pagina de răspunsuri. PDF.',
        IV: 'Fișă de dictare pentru clasa a IV-a: ortograme, linia de dialog, cuvinte grele, rânduri dictando. Textul dictării, pe pagina de răspunsuri. PDF.',
      }),
      faq: [
        {
          q: 'Unde găsesc textul pe care îl dictez?',
          a: 'Pe pagina cu răspunsuri: bifezi în generator „Pagină cu răspunsuri la final” și o primești după fișă. Elevii primesc doar prima pagină.',
        },
      ],
    }),
  },
  {
    slug: 'fisa-de-lectura',
    phrase: 'Fișa de lectură',
    label: 'Fișa de lectură',
    area: 'clr',
    levels: UPPER,
    presets: [p('fisa-de-lectura')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Fișa cărții citite: titlu, autor, personaje, ce ți-a plăcut, recomandarea și stelele tale.',
        IV: 'Jurnalul de lectură pe o săptămână și recomandarea unei cărți pentru colegi.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, programa cere aprecierea valorii cărților: elevul spune ce i-a plăcut și dacă ar recomanda cartea. Fișa cărții citite are rânduri pentru titlu, autor, personajele principale și locul acțiunii, două rânduri pentru ce i-a plăcut, un DA sau NU la recomandare și cinci stele de colorat.',
          IV: 'La clasa a IV-a, programa vorbește despre interesul pentru lectura literară și de informare. Jurnalul de lectură are un tabel pe șapte zile: ce a citit elevul, câte pagini și dacă i-a plăcut, apoi ce a aflat nou și ce carte ar recomanda.',
        }),
        'Fișele se păstrează în portofoliu: la sfârșitul semestrului, elevul vede câte cărți a citit, iar învățătorul are o imagine clară a lecturilor clasei. Pot fi folosite și la ora de lectură, pentru prezentarea unei cărți în fața colegilor.',
        'Nu au răspunsuri corecte, așa că nu au pagină cu răspunsuri; pe fiecare se tipărește competența 3.6 a clasei, utilă în planificarea orelor de lectură.',
      ],
      description: by(c, {
        III: 'Fișa de lectură pentru clasa a III-a: titlu, autor, personaje, ce mi-a plăcut, recomandare și stele de colorat. PDF de printat, pentru portofoliu.',
        IV: 'Jurnal de lectură pentru clasa a IV-a: un tabel pe o săptămână, ce am aflat nou și cartea recomandată colegilor. PDF de printat, cu competența 3.6.',
      }),
      faq: [
        {
          q: 'Pot folosi fișa pentru orice carte?',
          a: 'Da. Fișa nu e legată de o carte anume: elevul o completează pentru orice poveste, roman sau carte de informare citită, de la biblioteca clasei sau de acasă.',
        },
      ],
    }),
  },
  {
    slug: 'sinonime-antonime',
    phrase: 'Fișe sinonime și antonime',
    label: 'Sinonime și antonime',
    area: 'clr',
    levels: UPPER,
    codeless: true,
    presets: [p('sinonime-antonime')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Cuvinte cu înțeles asemănător, cuvinte cu înțeles opus și cuvinte cu mai multe înțelesuri.',
        IV: 'Sinonime potrivite în context, antonime care schimbă sensul propoziției, omonime.',
      }),
      body: [
        by(c, {
          III: 'La clasa a III-a, copilul își îmbogățește vocabularul jucându-se cu înțelesul cuvintelor: „harnic” înseamnă cam același lucru cu „muncitor”, „mare” e opusul lui „mic”, iar „broasca” poate fi animalul din lac sau încuietoarea ușii. Fișa are toate trei, în propoziții scurte.',
          IV: 'La clasa a IV-a, sinonimele se aleg după context: „Dan a sosit primul” poate deveni „Dan a ajuns primul”. Antonimele schimbă sensul întregii propoziții, iar omonimele, ca „lac” sau „leu”, se înțeleg doar din propoziția în care apar.',
        }),
        'La exercițiile cu sinonime sunt acceptate mai multe răspunsuri, iar pagina cu răspunsuri le dă pe cele mai potrivite. Ultima cerință îl pune pe elev să scrie el propoziții, pe liniatura clasei.',
        'Fișa e potrivită ca exercițiu de vocabular după citirea unui text: elevii caută în text cuvinte pentru care pot găsi sinonime și antonime, apoi lucrează fișa.',
      ],
      description: by(c, {
        III: 'Fișă cu sinonime, antonime și omonime pentru clasa a III-a: cuvinte cu înțeles asemănător sau opus, în propoziții. PDF de printat, cu răspunsuri.',
        IV: 'Fișă cu sinonime, antonime și omonime pentru clasa a IV-a: alegerea după context, sensul propoziției, omonime. PDF de printat, cu răspunsuri.',
      }),
      faq: [
        {
          q: 'La sinonime e un singur răspuns corect?',
          a: 'Nu întotdeauna. „Bucuroși” poate fi înlocuit cu „veseli” sau cu „fericiți”; pe pagina cu răspunsuri sunt trecute variantele cele mai potrivite, iar orice cuvânt cu același înțeles, care se potrivește în propoziție, e bun.',
        },
      ],
    }),
  },
  // ───────────────────────── Evaluare ─────────────────────────
  {
    slug: 'evaluare-limba-romana',
    phrase: 'Evaluare limba română',
    label: 'Evaluare la limba română',
    area: 'eval',
    levels: UPPER,
    presets: [p('evaluare-romana-34')],
    copy: (c) => ({
      lead: by(c, {
        III: 'Un text cu întrebări, ortograme, părțile de vorbire și punctuația, pe 2–3 pagini, cu calificative orientative.',
        IV: 'Lectură, ortograme de corectat, părțile de vorbire și punctuația, cu răspunsuri și calificative orientative.',
      }),
      body: [
        by(c, {
          III: 'Evaluarea pentru clasa a III-a are patru itemi, luați din fișele clasei: textul „Ghiozdanul uitat” cu întrebări și adevărat sau fals, ortograme de ales, cuvinte de sortat în substantive, adjective și verbe și semnele de la sfârșitul propoziției.',
          IV: 'Evaluarea pentru clasa a IV-a pornește de la textul „Podul de peste pârâu” și continuă cu ortograme, un tabel cu patru părți de vorbire și semnele de punctuație într-un dialog. Fiecare item are punctajul scris lângă cerință.',
        }),
        'Antetul spune disciplina și clasa, are rând pentru nume și dată, iar ultima pagină se încheie cu autoevaluarea elevului. Pagina cu răspunsuri, pentru cadrul didactic, are toate răspunsurile item cu item și un tabel orientativ de calificative după numărul de răspunsuri corecte.',
        'Calificativul final îl stabilește învățătorul, după descriptorii de performanță; tabelul doar ajută la o primă împărțire. Pe fiecare pagină se tipărește competența itemilor de pe ea.',
      ],
      description: by(c, {
        III: 'Evaluare la limba română pentru clasa a III-a: text cu întrebări, ortograme, părțile de vorbire, punctuație; răspunsuri și calificative. PDF.',
        IV: 'Evaluare la limba română pentru clasa a IV-a: lectură, ortograme, părțile de vorbire, punctuație; răspunsuri și calificative orientative. PDF.',
      }),
      faq: [
        {
          q: 'Pot schimba itemii evaluării?',
          a: 'Da. Din generator adaugi sau scoți fișe (de exemplu altă lectură sau al doilea set de ortograme) și păstrezi bifa „Evaluare”: fiecare fișă devine un item cu câteva exerciții.',
        },
      ],
    }),
  },
];
