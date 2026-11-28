'use client';

import { SCHOOL_LEVELS, sheetCompetenceLabel } from '@/lib/curriculum/sheet';
import { ForeignLettersNote } from '@/components/worksheet/foreign-letters-note';
import React, { useRef, useState } from 'react';
import { useTypedBeforeHydration } from '@/hooks/use-typed-before-hydration';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { useRoleStore } from '@/stores/role-store';
import { CATEGORY_TABS, NUMBERS, SHAPES, SHAPE_LABELS, THEME } from '@/lib/constants';
import { isItemAllowed } from '@/lib/access';
import { isWordAllowed } from '@/lib/worksheet/layout';
import { uppercaseLetters, lowercaseLetters, pairedLetters, hintFor } from '@/lib/glyphs/data';
import { PATTERN_IDS, PATTERN_ICONS, PATTERN_LABELS, isPatternId } from '@/lib/glyphs/patterns';
import { COUNT_RANGES, DOT_SHAPES, DOT_SHAPE_LABELS, activityLabel } from '@/lib/worksheet/activities';
import { fold } from '@/lib/catalog/search';
import { PHONO_KIND_TITLES, phonologyItems } from '@/lib/worksheet/phonology-pages';
import { SORTING_KIND_TITLES, sortingItems, sortingShortLabel } from '@/lib/worksheet/sorting-pages';
import { READ_KIND_TITLES, readingItems, readingShortLabel } from '@/lib/worksheet/reading-pages';
import { FUN_KIND_TITLES, funItems, funShortLabel } from '@/lib/worksheet/fun-pages';
import { exploreItems, exploreShortLabel } from '@/lib/worksheet/explore-pages';
import { SUBJECT_KIND_TITLES, subjectItems, subjectShortLabel } from '@/lib/worksheet/subjects-pages';
import { CLR_KIND_TITLES, clrItems, clrShortLabel } from '@/lib/worksheet/clr-pages';
import { MEM_KIND_TITLES, memItems, memShortLabel } from '@/lib/worksheet/mem-pages';
import { M34_KIND_TITLES, m34Items, m34ShortLabel } from '@/lib/worksheet/m34-pages';
import { R34_KIND_TITLES, r34Items, r34ShortLabel } from '@/lib/worksheet/r34-pages';
import { readingSetLevel } from '@/lib/worksheet/reading';
import { Button } from '@/components/ui/button';
import { MathPicker } from './math-picker';
import { AnswerOptions } from './answer-options';
import { TraceStylePicker } from './trace-style-picker';
import { Lock, RotateCcw, Plus, X, ChevronDown, UserRound } from 'lucide-react';
import { isCursive } from '@/lib/worksheet/layout';
import { MAX_WORDS, cleanWord } from '@/stores/sanitize-config';
import { alese } from './plural';
import { ItemRows } from './item-rows';
import { WordLists, WordOptions } from './word-lists';
import dynamic from 'next/dynamic';
import { groupItems, groupOf } from '@/lib/worksheet/letter-groups';
import { GROUP_HINTS } from '@/lib/worksheet/lesson-text';

// „Lecția literei”: loaded when a lesson is first opened (most sheets are free letters)
const LessonPanel = dynamic(() => import('./lesson-panel').then((m) => m.LessonPanel), {
  ssr: false,
  loading: () => <p className="text-xs text-slate-500" aria-live="polite">Se încarcă lecția…</p>,
});

/** The groups of „Jocuri” written for clasa a III-a and a IV-a (r34-pages.ts, m34-pages.ts). */
const UPPER_GROUP = /^(Limba română|Matematică): /;

interface GeneratorControlsProps {
  onShowPaywall: () => void;
  /** Pages of the sheet as the preview has it (for „Ies N pagini”). */
  pages?: number;
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">{children}</span>
      {right}
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`p-2 rounded-lg border transition-all text-center ${active ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
    >
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, onChange, left, right }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; left: string; right: string }) {
  return (
    <div>
      <SectionLabel right={<span className="text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-0.5">{value}</span>}>{label}</SectionLabel>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
      <div className="flex justify-between text-xs text-slate-500"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}

type GroupId = 'continut' | 'nivel' | 'aspect' | 'avansat';

/**
 * One of the four groups of settings (Conținut, Nivel, Aspect, Avansat): a heading that opens and
 * closes what is under it. A native <details>, so it works with the keyboard and before the
 * page's scripts have loaded; its state is kept in React so the defaults can depend on the role.
 */
function SettingsGroup({ id, title, hint, open, onToggle, children }: { id: GroupId; title: string; hint: string; open: boolean; onToggle: (id: GroupId, open: boolean) => void; children: React.ReactNode }) {
  return (
    <details data-group={id} open={open} onToggle={(e) => onToggle(id, e.currentTarget.open)} className="group/set rounded-xl border border-slate-200 open:border-slate-300">
      <summary className="flex min-h-12 cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-4 py-2 hover:bg-slate-50 [&::-webkit-details-marker]:hidden list-none">
        <span className="min-w-0">
          <span className="text-base font-bold text-slate-900">{title}</span>
          <span className="ml-2 text-xs text-slate-600 group-open/set:hidden">{hint}</span>
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-700 transition-transform group-open/set:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-5 px-4 pb-4 pt-2">{children}</div>
    </details>
  );
}

export function GeneratorControls({ onShowPaywall, pages }: GeneratorControlsProps) {
  const {
    config, tier, setCategory, setAlphabet, setLetterMode, toggleItem, addItems, removeAllItems,
    addCustomWord, removeCustomWord, setDifficulty, setScript, setLetterSize, setVisibility,
    setBackgroundPattern, setGuideColor, setRowsPerPage, toggleGuideLines,
    toggleArrows, toggleStartDots, toggleEmoji, toggleReward, toggleFullPage, toggleLeftHanded,
    toggleFillPage, setChildName, resetConfig, setCurriculumLevel, setLessonMode, setLessonItem,
  } = useWorksheetStore();

  // The four groups of settings. „Avansat” starts closed; for a parent „Nivel” too (fewer decisions
  // on the first screen). What the visitor opens or closes by hand wins over these defaults.
  const parent = useRoleStore((s) => s.role) === 'parinte';
  const [toggled, setToggled] = useState<Partial<Record<GroupId, boolean>>>({});
  const isOpen = (id: GroupId) => toggled[id] ?? (id === 'avansat' ? false : id === 'nivel' ? !parent : true);
  const toggleGroup = (id: GroupId, open: boolean) => setToggled((t) => (t[id] === open ? t : { ...t, [id]: open }));

  const [wordInput, setWordInput] = useState('');
  // the long groups of sets (citire, mediu, comunicare) show a few sets until „Arată toate” is pressed
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  // „Jocuri”: what is typed above the groups keeps only the sets whose name fits (diacritics do not matter)
  const [setFilter, setSetFilter] = useState('');
  const wanted = fold(setFilter).trim();
  const wordRef = useRef<HTMLInputElement>(null);
  useTypedBeforeHydration(wordRef, setWordInput);
  const alphabet = config.alphabet ?? 'ro';
  const cursive = isCursive(config);

  const allItems: string[] = (() => {
    switch (config.category) {
      case 'letters':
        return config.letterMode === 'lowercase' ? lowercaseLetters(alphabet) : config.letterMode === 'paired' ? pairedLetters(alphabet) : uppercaseLetters(alphabet);
      case 'numbers':
        return [...NUMBERS];
      case 'shapes':
        return [...SHAPES];
      case 'prewrite':
        return [...PATTERN_IDS];
      case 'games':
        return [...uppercaseLetters(alphabet).map((l) => `find:${l}`), ...COUNT_RANGES, ...DOT_SHAPES.map((d) => `dots:${d}`), ...phonologyItems(), ...sortingItems(), ...readingItems(), ...funItems(), ...exploreItems(), ...clrItems(), ...memItems(), ...subjectItems(), ...r34Items(), ...m34Items()];
      default:
        return [];
    }
  })();

  const isFree = (item: string) => isItemAllowed(item, config.category, tier);
  const upper = config.curriculumLevel === 'III' || config.curriculumLevel === 'IV';
  const usable = allItems.filter(isFree);
  // „Lecția literei” (lesson-panel.tsx): one letter or group, the sheet built in four parts
  const lesson = config.category === 'letters' && !!config.lesson;
  // „Grupuri de litere”: ce, ci, ge, gi, che, chi, ghe, ghi (Romanian alphabet), in the letter mode of the sheet
  const groups = config.category === 'letters' && alphabet === 'ro' ? groupItems(config.letterMode) : [];

  const handleItemClick = (item: string) => {
    if (!isFree(item)) onShowPaywall();
    else if (lesson) {
      if (config.selectedItems[0] !== item) setLessonItem(item);
    } else toggleItem(item);
  };

  const addWord = (word: string, isName = false) => {
    const w = word.trim();
    if (!w) return;
    if (!isName && !isWordAllowed(w, tier)) {
      onShowPaywall();
      return;
    }
    addCustomWord(w);
  };

  // The same comparison the store uses, so "Ştefan" (typed with a cedilla) counts as its row "Ștefan".
  const cleanName = cleanWord(config.childName);
  const nameAdded = !!cleanName && config.customWords.some((w) => cleanWord(w) === cleanName);
  // Math and game pages draw themselves: no traced words there, so no „Trasează-l” either.
  const wordsFit = config.category !== 'games' && config.category !== 'math' && !lesson;
  // exerciții, jocuri: „1 ales”; litere, cifre, forme: „1 aleasă”
  const pickedGender = config.category === 'prewrite' || config.category === 'games' || config.category === 'math' ? 'n' : 'f';
  // The example in the box must be one the visitor can really trace: on the free plan that means
  // words made of A–E (with Ă, Â); „MAMA” there led straight to the plans window.
  const wordExample = tier === 'free' ? (alphabet === 'ro' ? 'ex. BEC, ac' : 'e.g. BED, cab') : alphabet === 'ro' ? 'ex. MAMA, toamna' : 'e.g. CAT';
  // letters, numbers, shapes and patterns are traced; math and games draw their own pages
  const traced = config.category !== 'games' && config.category !== 'math';
  const pickTitle = lesson ? 'Alege litera lecției' : { letters: 'Alege literele', numbers: 'Alege cifrele', shapes: 'Alege formele', prewrite: 'Alege exercițiile', math: 'Matematică', games: 'Alege jocurile' }[config.category as 'letters'] ?? 'Alege';

  return (
    <div className="w-full bg-white rounded-2xl border border-line p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-900">Fișa ta</h2>
        <Button variant="outline" size="sm" onClick={resetConfig} className="h-9 gap-1.5 text-xs" title="Pornește de la zero">
          <RotateCcw className="w-3.5 h-3.5" /> De la zero
        </Button>
      </div>

      {/* Conținut: what is on the sheet */}
      <SettingsGroup id="continut" title="Conținut" hint="ce exersăm, numele copilului" open={isOpen('continut')} onToggle={toggleGroup}>
      {/* 1. What we practise */}
      <div>
        <SectionLabel>Ce exersăm</SectionLabel>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CATEGORY_TABS.map((tab) => {
            const active = config.category === tab.id;
            const color = THEME.categories[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                aria-pressed={active}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 ${active ? '' : 'border-slate-200 hover:border-slate-300'}`}
                style={active ? { borderColor: color, backgroundColor: `${color}15` } : {}}
              >
                <span className="text-xl" aria-hidden>{tab.icon}</span>
                <span className="text-xs font-medium text-center leading-tight text-slate-700">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {config.category === 'letters' && (
        <div>
          <SectionLabel>Scris</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <Choice active={!cursive} onClick={() => setScript('print')}><div className="text-sm font-bold">Ab · de tipar</div><div className="text-[11px] text-slate-500">grădiniță, pregătitoare</div></Choice>
            <Choice active={cursive} onClick={() => setScript('cursive')}><div className="text-sm font-bold italic">Ab · de mână</div><div className="text-[11px] text-slate-500">clasa I, scris legat</div></Choice>
          </div>
        </div>
      )}
      {config.category === 'letters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <SectionLabel>Alfabet</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={alphabet === 'ro'} onClick={() => setAlphabet('ro')}><div className="text-sm font-bold">Română</div><div className="text-[11px] text-slate-500">cu Ă Â Î Ș Ț</div></Choice>
              <Choice active={alphabet === 'en'} onClick={() => setAlphabet('en')}><div className="text-sm font-bold">Engleză</div><div className="text-[11px] text-slate-500">A–Z</div></Choice>
            </div>
          </div>
          <div>
            <SectionLabel>Litere</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <Choice active={config.letterMode === 'uppercase'} onClick={() => setLetterMode('uppercase')}><div className="text-sm font-bold">A B</div><div className="text-[11px] text-slate-500">mari</div></Choice>
              <Choice active={config.letterMode === 'lowercase'} onClick={() => setLetterMode('lowercase')}><div className="text-sm font-bold">a b</div><div className="text-[11px] text-slate-500">mici</div></Choice>
              <Choice active={config.letterMode === 'paired'} onClick={() => setLetterMode('paired')}><div className="text-sm font-bold">Aa</div><div className="text-[11px] text-slate-500">perechi</div></Choice>
            </div>
          </div>
        </div>
      )}

      {config.category === 'letters' && alphabet === 'ro' && (
        <div data-sheet-kind>
          <SectionLabel>Fișa</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <Choice active={!lesson} onClick={() => setLessonMode(false)}>
              <div className="text-sm font-bold">Litere la alegere</div>
              <div className="text-[11px] text-slate-500">{parent ? 'câte litere vrei, rând după rând' : 'una sau mai multe, rând după rând'}</div>
            </Choice>
            <Choice active={lesson} onClick={() => setLessonMode(true)}>
              <div className="text-sm font-bold">Lecția literei</div>
              <div className="text-[11px] text-slate-500">{parent ? 'o literă: silabe, cuvinte, propoziție' : 'litera, silabe, cuvinte, propoziție'}</div>
            </Choice>
          </div>
        </div>
      )}

      {/* 2. Which items */}
      <div>
        <SectionLabel right={<span className="text-xs text-slate-500">{alese(config.selectedItems.length, pickedGender)}</span>}>{pickTitle}</SectionLabel>
        {config.category === 'math' ? (
          <MathPicker onShowPaywall={onShowPaywall} />
        ) : config.category === 'games' ? (
          <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label htmlFor="set-filter" className="sr-only">Caută un set după nume</label>
              <input id="set-filter" type="search" value={setFilter} onChange={(e) => setSetFilter(e.target.value.slice(0, 40))} placeholder="Caută un set: silabe, toamnă, labirint…" autoComplete="off"
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-500 focus:border-blue-500" />
            </div>
            {[
              { title: 'Găsește litera', text: 'O grilă de litere: copilul o colorează pe cea cerută.', items: allItems.filter((i) => i.startsWith('find:')), cols: 'grid-cols-8 sm:grid-cols-11', show: (i: string) => i.slice(5) },
              { title: 'Numără și scrie', text: 'Imagini de numărat și căsuța pentru număr.', items: [...COUNT_RANGES] as string[], cols: 'grid-cols-2', show: (i: string) => `1–${i.slice(6)}` },
              { title: 'Unește punctele', text: 'Puncte numerotate care se transformă într-un desen.', items: DOT_SHAPES.map((d) => `dots:${d}`), cols: 'grid-cols-3 sm:grid-cols-6', show: (i: string) => DOT_SHAPE_LABELS[i.slice(5) as keyof typeof DOT_SHAPE_LABELS] },
              // „Sunete și silabe” (phonology-pages.ts)
              { title: `Sunete și silabe: ${PHONO_KIND_TITLES.sound.toLocaleLowerCase('ro')}`, text: 'Imagini de încercuit: cele care încep cu sunetul ales.', items: allItems.filter((i) => i.startsWith('sound:')), cols: 'grid-cols-7', show: (i: string) => i.slice(6) },
              { title: `Sunete și silabe: ${PHONO_KIND_TITLES.first.toLocaleLowerCase('ro')}`, text: 'Sub fiecare imagine, litera cu care începe cuvântul. Seturi diferite de imagini.', items: allItems.filter((i) => i.startsWith('first:')), cols: 'grid-cols-6', show: (i: string) => i.slice(6) },
              { title: `Sunete și silabe: ${PHONO_KIND_TITLES.syl.toLocaleLowerCase('ro')}`, text: 'Cuvinte de 1–4 silabe: o bulină colorată pentru fiecare silabă. Seturi diferite de cuvinte.', items: allItems.filter((i) => i.startsWith('syl:')), cols: 'grid-cols-6', show: (i: string) => i.slice(4) },
              { title: `Sunete și silabe: ${PHONO_KIND_TITLES.split.toLocaleLowerCase('ro')}`, text: 'Silabele de urmărit, apoi de scris în căsuțe (clasa pregătitoare, clasa I). Seturi diferite de cuvinte.', items: allItems.filter((i) => i.startsWith('split:')), cols: 'grid-cols-6', show: (i: string) => i.slice(6) },
              // Sortare, grupare, orientare în spațiu (sorting-pages.ts)
              { title: SORTING_KIND_TITLES.sort, text: 'Imagini de unit cu grupa lor: după fel, mărime sau formă.', items: allItems.filter((i) => i.startsWith('sort:')), cols: 'grid-cols-2 sm:grid-cols-3', show: sortingShortLabel },
              { title: SORTING_KIND_TITLES.odd, text: 'Rânduri de câte patru imagini: copilul o taie pe cea din altă grupă. Seturile 4–6 sunt mai grele.', items: allItems.filter((i) => i.startsWith('odd:')), cols: 'grid-cols-6', show: sortingShortLabel },
              { title: SORTING_KIND_TITLES.group, text: 'Imagini amestecate (fructe, legume, animale domestice sau sălbatice, transport, jucării): copilul numără fiecare fel și scrie numărul în tabel.', items: allItems.filter((i) => i.startsWith('group:')), cols: 'grid-cols-2 sm:grid-cols-3', show: sortingShortLabel },
              { title: SORTING_KIND_TITLES.pos, text: 'Pe, sub, deasupra, în, stânga, dreapta: o scenă cu masa și cutia, o grilă de 3 × 3 cu întrebări, ori desene după indicații.', items: allItems.filter((i) => i.startsWith('pos:')), cols: 'grid-cols-2 sm:grid-cols-3', show: sortingShortLabel },
              // „Citire și scriere” (reading-pages.ts): the sets of each class, CP = clasa pregătitoare
              ...([
                ['match', 'Șase cuvinte și șase imagini: copilul le unește cu o linie (CP = clasa pregătitoare).'],
                ['gap', 'Cuvântul sub imagine, cu o literă lipsă și trei litere din care alege (CP = clasa pregătitoare).'],
                ['draw', 'Câte o expresie scurtă („doi nori”) deasupra fiecărei căsuțe de desenat (CP = clasa pregătitoare).'],
                ['fill', 'Propoziții cu un cuvânt lipsă și trei cuvinte din care alege (clasa I, a II-a).'],
                ['order', 'Cuvintele unei propoziții amestecate, apoi rândul pe care o scrie (clasa I, a II-a).'],
                ['copy', 'Cuvinte de tipar (CP = clasa pregătitoare) sau propoziții de scris de mână, pe liniatura caietului.'],
                ['text', 'Un text scurt și întrebări cu răspuns de încercuit (clasa I, a II-a).'],
              ] as const).map(([kind, text]) => ({ title: `Citire și scriere: ${READ_KIND_TITLES[kind].toLocaleLowerCase('ro')}`, text, items: allItems.filter((i) => i.startsWith(`read:${kind}:`)), cols: 'grid-cols-3 sm:grid-cols-6', show: readingShortLabel, fold: true })),
              // Fișe distractive (fun-pages.ts)
              ...([
                ['color', 'Un desen cu numere de la 1 la 5 și culorile lor, cu numele culorii (merge și la imprimarea alb-negru).'],
                ['colsum', 'Aceleași desene, cu adunări și scăderi cu rezultatul 1–5 în loc de numere (clasa pregătitoare).'],
                ['maze', 'Un singur drum de la o imagine la alta: 6 × 6, 9 × 9 sau 12 × 12 căsuțe; drumul, pe pagina de răspunsuri.'],
                ['diff', 'Aceeași imagine de două ori, a doua cu 3–5 diferențe, și câte un cerc de colorat pentru fiecare.'],
                ['trace', 'Linii punctate de urmărit de la o imagine la alta: drepte, valuri, zigzag, cupe și castel, bucle.'],
                ['shadow', 'Șase imagini și umbrele lor, amestecate: copilul le unește.'],
              ] as const).map(([kind, text]) => ({ title: FUN_KIND_TITLES[kind], text, items: allItems.filter((i) => i.startsWith(`${kind}:`)), cols: 'grid-cols-2 sm:grid-cols-3', show: funShortLabel })),
              // „Explorarea mediului” (explore-pages.ts)
              ...([
                ['corpul și plantele', 'Părțile plantei, ale copacului și ale lalelei, ale corpului și ale feței (cuvinte de scris sau de lipit), organele, simțurile, hrana sănătoasă.', ['plant:', 'body:', 'senses:', 'food:']],
                ['animalele', 'Unde trăiesc, cum se deplasează, puii lor; tabelul mediilor de viață pentru clasa a II-a.', ['home:', 'habitat:', 'move:', 'baby:']],
                ['ființe vii', 'Ce este viu, cum cresc (de la ou la găină, de la sămânță la dovleac), cu ce este acoperit corpul, ce mănâncă, domestic sau sălbatic.', ['alive:', 'cycle:', 'cover:', 'eat:', 'tame:']],
                ['anotimpurile și vremea', 'Anotimpul fiecărei imagini, ce se întâmplă în fiecare anotimp, semnele vremii, „dacă plouă, iei umbrela”.', ['season:', 'weather:', 'wear:']],
                ['apa', 'Unde este apă, apa solidă sau lichidă, ce se întâmplă cu ea (se topește, îngheață, fierbe, se evaporă), circuitul apei în natură.', ['water:', 'melt:']],
                ['materiale și reciclare', 'Lemn, metal, plastic sau sticlă; unde aruncăm fiecare lucru; cum avem grijă de natură.', ['mat:', 'recycle:']],
                ['ziua, noaptea și spațiul', 'Ziua sau noaptea, părțile zilei; Pământul, Soarele și Luna; planetele.', ['day:', 'space:']],
                ['observ și notez', 'Calendarul vremii pe o săptămână sau pe o lună și jurnalul unei plante: de completat zi de zi, fără răspunsuri.', ['obs:']],
              ] as const).map(([title, text, kinds]) => ({ title: `Explorarea mediului: ${title}`, text, items: allItems.filter((i) => kinds.some((k) => i.startsWith(k))), cols: 'grid-cols-2 sm:grid-cols-3', show: exploreShortLabel, fold: true })),
              // Arte vizuale și abilități practice, Dezvoltare personală, limba engleză (subjects-pages.ts)
              ...([
                ['Arte vizuale', 'sym', 'Jumătate de desen pe pătrățele, cealaltă jumătate de colorat ca în oglindă; desenul complet, pe pagina de răspunsuri.'],
                ['Arte vizuale', 'model', 'Un desen pe puncte și aceleași puncte goale dedesubt, de unit la fel.'],
                ['Arte vizuale', 'cut', 'Conturul unei case sau al unui robot și piesele lui colorate, de decupat pe linia punctată și de lipit.'],
                ['Arte vizuale', 'lines', 'Un fular sau un brad în fâșii: fiecare fâșie cu linia sau punctele arătate lângă ea.'],
                ['Dezvoltare personală', 'feel', 'Bucurie, tristețe, frică, furie: emoția fiecărei fețe, apoi „Cum se simte?” în situații de zi cu zi.'],
                ['Dezvoltare personală', 'me', 'Numele, vârsta, ochii, părul, lucrurile preferate: de completat, colorat și desenat.'],
                ['Dezvoltare personală', 'hyg', 'Obiectele de igienă personală, de încercuit printre alte obiecte (clasa pregătitoare).'],
                ['Dezvoltare personală', 'habit', 'Obiceiuri de igienă: e bine sau nu e bine? (clasa I).'],
                ['Dezvoltare personală', 'job', 'Meseria și unealta ei, de unit (clasa I).'],
                ['Dezvoltare personală', 'jobuse', 'Meseria și ce face pentru ceilalți, de unit (clasa a II-a).'],
                ['Dezvoltare personală', 'rules', 'Reguli de comunicare în clasă: e bine sau nu e bine? (clasa pregătitoare).'],
                ['Limba engleză', 'en', 'Imaginea și cuvântul în limba engleză, de unit: animals, colours, numbers.'],
              ] as const).map(([subject, kind, text]) => ({ title: `${subject}: ${SUBJECT_KIND_TITLES[kind].toLocaleLowerCase('ro')}`, text, items: allItems.filter((i) => i.startsWith(`${kind}:`)), cols: 'grid-cols-2 sm:grid-cols-3', show: subjectShortLabel })),
              // Comunicare: povestea, semne, mesaje (clr-pages.ts)
              ...([
                ['story', 'Patru imagini în altă ordine: copilul scrie 1, 2, 3, 4, încercuiește titlul, desenează sfârșitul (clasa pregătitoare).'],
                ['sign', 'Semne de circulație, de la școală, de pe ambalaje, de reciclare, avertizări de vreme: unește semnul cu ce înseamnă sau alege ce faci când îl vezi (CP = clasa pregătitoare).'],
                ['note', 'Felicitarea, biletul, invitația, mulțumirea, lista de cumpărături, afișul, rețeta: mesajul de completat cu litere de tipar (clasa pregătitoare).'],
                ['msg', 'O invitație, un afiș, un bilet, un anunț, o rețetă, un program și patru întrebări cu răspuns de încercuit (clasa a II-a).'],
                ['listen', 'Adultul citește povestea de pe pagina lui; copilul încercuiește imaginea (clasa pregătitoare) sau răspunsul a, b, c (clasa I, a II-a). Două pagini.'],
                ['book', 'Fișa cărții citite și jurnalul de lectură: titlul, personajele, desenul, părerea (CP = clasa pregătitoare).'],
                ['written', 'Cartonașe cu litere și cartonașe cu desene sau forme: copilul le încercuiește pe cele scrise (grădiniță).'],
              ] as const).map(([kind, text]) => ({ title: `Comunicare: ${CLR_KIND_TITLES[kind].toLocaleLowerCase('ro')}`, text, items: allItems.filter((i) => i.startsWith(`${kind}:`)), cols: 'grid-cols-2 sm:grid-cols-3', show: clrShortLabel, fold: true })),
              // Matematică și explorare: termeni, numere, figuri, regularități, date, experimente (mem-pages.ts)
              ...([
                ['terms', 'Sumă, diferență, total, semnele; la clasa I termenii; la clasa a II-a descăzut, scăzător, produs, cât.'],
                ['place', 'Sute, zeci și unități desenate; numere până la 1000 cu cifre și cu litere (clasa a II-a).'],
                ['coord', 'Un tabel cu coloanele A–E și rândurile 1–5: ce este în B3, unde este pisica, ce desenezi în D2 (clasa a II-a).'],
                ['sides', 'Laturile și vârfurile figurilor; axa de simetrie, DA sau NU (clasa a II-a).'],
                ['solid', 'Cub, cuboid, cilindru, sferă, con: numele, obiecte cu aceeași formă, fețe și vârfuri (clasa a II-a).'],
                ['regular', 'Șiruri de imagini și de numere după o regulă, figuri care cresc, o problemă (clasa I, a II-a).'],
                ['sort2', 'Un tabel cu două criterii: forma și mărimea, unde merge și dacă are motor (clasa I, a II-a).'],
                ['plan', 'Pașii unui experiment de pus în ordine; adevărat sau fals cu „și”, „sau”, „nu” (clasa a II-a).'],
                ['cause', '„Dacă…, atunci…”: unește și scrie urmarea (clasa a II-a).'],
                ['around', 'Ce formă au obiectele din jur: cerc, pătrat, triunghi, dreptunghi.'],
                ['pict', 'Numără, colorează câte o căsuță pentru fiecare, apoi spune din care sunt mai multe (grădiniță).'],
                ['more', 'Mai repede, mai cald, mai sus, mai întâi: încercuiește imaginea (grădiniță).'],
              ] as const).map(([kind, text]) => ({ title: `Matematică și explorare: ${MEM_KIND_TITLES[kind].toLocaleLowerCase('ro')}`, text, items: allItems.filter((i) => i.startsWith(`${kind}:`)), cols: 'grid-cols-2 sm:grid-cols-3', show: memShortLabel })),
              // Limba și literatura română, clasa a III-a și a IV-a (r34-pages.ts)
              ...([
                ['lect', 'Un text scris pentru fișă (poveste sau text informativ) și întrebări pe două pagini: detalii, adevărat/fals, ordinea, părerea ta.'],
                ['aud', 'Învățătorul citește povestea de pe pagina lui; elevii răspund pe fișă: detalii, sensul unui cuvânt, adevărat/fals.'],
                ['parti', 'Substantiv, adjectiv, pronume personal, verb, dintr-un text scurt; numărul, timpul, subiectul și predicatul.'],
                ['orto', 's-a/sa, s-au/sau, i-a/ia, i-au/iau, l-a/la, v-a/va, ce-a/cea, ce-i/cei, s-ar/sar, n-ai/nai, ne-am/neam.'],
                ['punct', 'Punctul, semnul întrebării, al exclamării, virgula, două puncte și linia de dialog.'],
                ['voc', 'Cuvinte cu înțeles asemănător, opus și cuvinte cu mai multe înțelesuri (fără cod din programă).'],
                ['comp', 'Planul compunerii și rândurile caietului: întâmplare, descriere, portret, poveste cu început dat.'],
                ['func', 'Invitația, afișul, scrisoarea, anunțul și biletul, de completat pe formular.'],
                ['dict', 'Propoziții cu goluri pentru cuvintele dictate și rânduri pentru propozițiile întregi.'],
                ['carte', 'Fișa cărții citite și jurnalul de lectură.'],
              ] as const).map(([kind, text]) => ({ title: `Limba română: ${R34_KIND_TITLES[kind].toLocaleLowerCase('ro')}`, text, items: allItems.filter((i) => i.startsWith(`${kind}:`)), cols: 'grid-cols-2 sm:grid-cols-3', show: r34ShortLabel })),
              // Matematică, clasa a III-a și a IV-a (m34-pages.ts)
              ...([
                ['nr', 'Numere până la 10 000 și până la 1 000 000: cu cifre și litere, compară, ordonează.'],
                ['rom', 'I, V, X (clasa a III-a); L, C, D, M (clasa a IV-a).'],
                ['rot', 'La zeci, sute, mii; la clasa a IV-a și la zeci și sute de mii.'],
                ['ops', 'Ordinea efectuării operațiilor, paranteze rotunde și pătrate.'],
                ['inm', 'Înmulțirea și împărțirea în coloană, pe pătrățele; împărțirea cu rest.'],
                ['prob', 'Probleme cu două operații, metoda grafică, mersul invers, comparația; o problemă de compus.'],
                ['fr', 'Fracții: părți colorate, comparare, adunare și scădere, sutimi și procente.'],
                ['per', 'Perimetrul pătratului, dreptunghiului, triunghiului; aria pe pătrățele de 1 cm.'],
                ['geo', 'Dreaptă, semidreaptă, segment; unghiuri drepte, ascuțite, obtuze; paralele și perpendiculare.'],
                ['mas', 'Unități de măsură: alegere, calcule, transformări; timpul și banii (lei, euro).'],
                ['date', 'Tabelul și graficul cu bare de desenat; grafice cu bare și liniare de citit.'],
                ['sir', 'Șiruri după o regulă: continuă, găsește regula, inventează una.'],
              ] as const).map(([kind, text]) => ({ title: `Matematică: ${M34_KIND_TITLES[kind].toLocaleLowerCase('ro')}`, text, items: allItems.filter((i) => i.startsWith(`${kind}:`)), cols: 'grid-cols-2 sm:grid-cols-3', show: m34ShortLabel })),
            ]
              // clasa a III-a / a IV-a chosen: their sheets first, the long list of the younger classes after them
              .sort((a, b) => (upper ? Number(UPPER_GROUP.test(b.title)) - Number(UPPER_GROUP.test(a.title)) : 0))
              .map((group) => {
                // a long group: the free sets and the chosen ones stay in sight, with the first sets, six in all; the rest after „Arată toate”
                // typed in the box above: only the sets whose name fits, all of them in sight
                const found = wanted ? group.items.filter((i) => fold(`${group.title} ${group.show(i)} ${activityLabel(i)}`).includes(wanted)) : null;
                if (found && !found.length) return null;
                const folds = !found && 'fold' in group && group.items.length > 9;
                const open = !folds || openGroups.includes(group.title);
                const kept = group.items.filter((i) => isFree(i) || config.selectedItems.includes(i));
                const lead = group.items.filter((i) => !kept.includes(i)).slice(0, Math.max(0, 6 - kept.length));
                const shown = found ?? (open ? group.items : group.items.filter((i) => kept.includes(i) || lead.includes(i)));
                return (
              <div key={group.title}>
                <div className="font-bold text-ink">{group.title}</div>
                <div className="text-xs text-slate-600 mb-2">{group.text} O pagină pentru fiecare.</div>
                <div className={`grid gap-1.5 ${group.cols}`}>
                  {shown.map((item) => {
                    const free = isFree(item);
                    const selected = config.selectedItems.includes(item);
                    return (
                      <button key={item} type="button" onClick={() => handleItemClick(item)} aria-pressed={selected}
                        aria-label={`${group.title}: ${group.show(item)}${free ? '' : ' (varianta completă)'}`}
                        className={`relative min-h-[2.5rem] px-1 rounded-lg border text-sm font-bold ${selected ? 'border-blue-500 bg-blue-50 text-blue-700' : free ? 'border-slate-300 bg-white text-slate-700 hover:border-blue-300' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>
                        {group.show(item)}
                        {!free && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
                {folds && (
                  <button type="button" aria-expanded={open}
                    onClick={() => setOpenGroups((g) => (open ? g.filter((t) => t !== group.title) : [...g, group.title]))}
                    className="mt-1.5 min-h-[2.5rem] px-2 text-sm font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900">
                    {open ? 'Arată mai puține' : `Arată toate cele ${group.items.length}${group.items.length % 100 >= 20 ? ' de' : ''} seturi`}
                  </button>
                )}
              </div>
                );
              })}
            {/* nothing fits: this line is then the second child, right after the box (the groups above render nothing) */}
            {wanted && (
              <p data-no-sets className="hidden [&:nth-child(2)]:block text-sm text-slate-700">
                Niciun set cu acest nume aici. <a href={`/cauta?q=${encodeURIComponent(setFilter.trim())}`} className="font-bold text-blue-700 underline underline-offset-2">Caută în toate fișele</a>
              </p>
            )}
          </div>
        ) : (
        <div className={`grid gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 ${config.category === 'prewrite' || config.category === 'shapes' ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-6 sm:grid-cols-7 lg:grid-cols-8'}`}>
          {allItems.map((item) => {
            const free = isFree(item);
            const selected = config.selectedItems.includes(item);
            const hint = config.category === 'letters' && config.showLetterIcons ? hintFor(item, alphabet) : undefined;
            const label = isPatternId(item) ? PATTERN_LABELS[alphabet][item] : config.category === 'shapes' ? SHAPE_LABELS[item] ?? item : item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handleItemClick(item)}
                aria-pressed={selected}
                aria-label={free ? label : `${label} (varianta completă)`}
                className={`relative min-h-[3rem] p-1 rounded-lg border transition-all flex flex-col items-center justify-center text-sm font-bold ${
                  selected ? 'border-blue-500 bg-blue-50 text-blue-700' : free ? 'border-slate-300 bg-white text-slate-700 hover:border-blue-300' : 'border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                {hint && <span className="text-[11px] leading-none mb-0.5" aria-hidden>{hint.emoji}</span>}
                {isPatternId(item) ? (
                  <>
                    <span className="text-base leading-none" aria-hidden>{PATTERN_ICONS[item]}</span>
                    <span className="text-[10px] font-medium leading-tight text-center mt-1">{label}</span>
                  </>
                ) : config.category === 'shapes' ? (
                  <span className="text-[11px] font-medium">{label}</span>
                ) : (
                  <span>{item}</span>
                )}
                {!free && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
              </button>
            );
          })}
        </div>
        )}
        {groups.length > 0 && (
          <div className="mt-2" data-letter-groups>
            <div className="mb-1 text-xs font-semibold text-slate-700">Grupuri de litere</div>
            <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 sm:grid-cols-8">
              {groups.map((item) => {
                const free = isFree(item);
                const selected = config.selectedItems.includes(item);
                const g = groupOf(item);
                const hint = config.showLetterIcons && g ? GROUP_HINTS[g] : undefined;
                return (
                  <button key={item} type="button" onClick={() => handleItemClick(item)} aria-pressed={selected}
                    aria-label={`Grupul ${item}${free ? '' : ' (varianta completă)'}`}
                    className={`relative min-h-[3rem] p-1 rounded-lg border transition-all flex flex-col items-center justify-center text-sm font-bold ${
                      selected ? 'border-blue-500 bg-blue-50 text-blue-700' : free ? 'border-slate-300 bg-white text-slate-700 hover:border-blue-300' : 'border-slate-200 bg-slate-100 text-slate-400'
                    }`}>
                    {hint && <span className="text-[11px] leading-none mb-0.5" aria-hidden>{hint.emoji}</span>}
                    <span>{item}</span>
                    {!free && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className={`flex gap-2 mt-2 ${lesson ? 'hidden' : ''}`}>
          <Button size="sm" variant="outline" onClick={() => addItems(usable)} className="flex-1 text-xs">
            {tier === 'free' ? `Adaugă toate gratuite (${usable.length})` : `Adaugă toate (${usable.length})`}
          </Button>
          <Button size="sm" variant="outline" onClick={removeAllItems} className="flex-1 text-xs" disabled={config.selectedItems.length === 0}>
            Golește
          </Button>
        </div>
        {(config.category === 'math' || config.category === 'games') && (
          <div className="mt-3">
            <AnswerOptions />
          </div>
        )}
        {config.category === 'games' && config.selectedItems.some((i) => i.startsWith('read:copy:') && readingSetLevel(i) !== 'CP') && (
          <div className="mt-3">
            <SectionLabel>Modelul de copiat</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={config.script !== 'cursive'} onClick={() => setScript('print')}><div className="text-sm font-bold">Ab · de tipar</div><div className="text-[11px] text-slate-500">copilul transcrie de mână</div></Choice>
              <Choice active={config.script === 'cursive'} onClick={() => setScript('cursive')}><div className="text-sm font-bold italic">Ab · de mână</div><div className="text-[11px] text-slate-500">copilul copiază</div></Choice>
            </div>
          </div>
        )}
      </div>

      {/* 2b. How many rows each chosen item gets (traced categories only); a lesson counts its rows by part */}
      {traced && (lesson ? <LessonPanel pages={pages} onShowPaywall={onShowPaywall} /> : <ItemRows pages={pages} />)}

      {/* 3. Child's name and words */}
      <div className="rounded-xl border border-line bg-paper p-4 space-y-3">
        <div>
          <label htmlFor="child-name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            <UserRound className="w-3.5 h-3.5" aria-hidden /> Numele copilului
          </label>
          <div className="flex gap-2">
            <input
              id="child-name"
              type="text"
              value={config.childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="ex. Ștefan"
              autoComplete="off"
              className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {wordsFit && (
              <Button size="sm" variant="outline" className="h-10 text-xs whitespace-nowrap" disabled={!cleanName || nameAdded} onClick={() => addWord(config.childName, true)}>
                {nameAdded ? 'Adăugat' : 'Trasează-l'}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {wordsFit ? 'Apare în antetul fișei. Cu „Trasează-l” devine și rând de scris.' : 'Apare în antetul fișei.'}
          </p>
          <ForeignLettersNote text={config.childName} className="mt-1.5" />
        </div>
        {/* Games draw their own page, a lesson has its own words: no extra words to trace there. */}
        <div className={wordsFit ? undefined : 'hidden'}>
          <label htmlFor="custom-word" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Cuvinte de trasat</label>
          <div className="flex gap-2">
            <input
              ref={wordRef}
              id="custom-word"
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addWord(wordInput);
                  setWordInput('');
                }
              }}
              placeholder={wordExample}
              autoComplete="off"
              className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" onClick={() => { addWord(wordInput); setWordInput(''); }} className="h-10 w-10 p-0" aria-label="Adaugă cuvântul">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tier === 'free' && (
            <p className="text-[11px] text-slate-500 mt-1">Gratuit: cuvinte din literele A–E (și Ă, Â), ca BEC sau AC. Numele copilului se trasează întreg.</p>
          )}
          {config.customWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {config.customWords.map((word) => (
                <button key={word} type="button" onClick={() => removeCustomWord(word)} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-red-400 hover:bg-red-50" aria-label={`Scoate ${word}`}>
                  {word} <X className="w-3 h-3" aria-hidden />
                </button>
              ))}
            </div>
          )}
          {config.customWords.length >= MAX_WORDS && (
            <p className="mt-1.5 text-[11px] font-semibold text-amber-700" data-word-max>Fișa are {MAX_WORDS} de cuvinte, cât încap. Scoate câteva ca să adaugi altele.</p>
          )}
          <WordOptions />
          <WordLists onShowPaywall={onShowPaywall} />
        </div>
      </div>

      </SettingsGroup>

      {/* Nivel: how much help the child gets, and the class */}
      <SettingsGroup id="nivel" title="Nivel" hint="cât ajutor primește copilul, clasa" open={isOpen('nivel')} onToggle={toggleGroup}>
        {/* (the level is not used by the games) */}
        <div className={traced ? undefined : 'hidden'}>
          <SectionLabel>Cât ajutor primește</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['beginner', '🌱', 'Început', 'cu mult ajutor'],
              ['intermediate', '🌿', 'Mijlociu', 'ajutor parțial'],
              ['advanced', '🌳', 'Avansat', 'mai mult singur'],
            ] as const).map(([d, icon, label, sub]) => (
              <Choice key={d} active={config.difficulty === d} onClick={() => setDifficulty(d)}>
                <div className="text-lg" aria-hidden>{icon}</div>
                <div className="text-xs font-semibold">{label}</div>
                <div className="text-[10px] text-slate-500">{sub}</div>
              </Choice>
            ))}
          </div>
        </div>
        <div>
          {/* a parent chooses the child's class; the school words (the competence, the programme) are for teachers */}
          <SectionLabel>{parent ? 'Clasa copilului' : 'Competența din programă'}</SectionLabel>
          <label htmlFor="curriculum-level" className="sr-only">{parent ? 'Clasa pentru care este fișa' : 'Clasa pentru care se tipărește competența'}</label>
          <select id="curriculum-level" value={config.curriculumLevel ?? ''}
            onChange={(e) => setCurriculumLevel((e.target.value || null) as typeof config.curriculumLevel | null)}
            className="w-full min-h-11 px-3 border border-slate-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{parent ? 'Nu o tipări pe fișă' : 'Nu o tipări'}</option>
            {SCHOOL_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          {parent ? (
            <p className="mt-1.5 text-xs text-slate-500">Alegi clasa, iar jos, pe fiecare pagină, se tipărește ce se exersează la școală cu fișa aceasta.</p>
          ) : (
            <>
              {config.curriculumLevel && (
                <p className="mt-1.5 text-xs text-slate-600" data-competence-label>
                  {sheetCompetenceLabel(config, config.curriculumLevel) ?? 'Fișa aceasta nu se potrivește cu o competență din programa clasei alese, așa că nu tipărim niciun cod.'}
                </p>
              )}
              {!config.curriculumLevel && <p className="mt-1.5 text-xs text-slate-500">Alegi clasa, iar codul competenței se tipărește jos, pe fiecare pagină: util pentru portofoliu și planificare.</p>}
              <a href="/programa" className="mt-1 inline-block text-xs font-bold text-blue-700 underline">Toate competențele clasei, cu fișele lor</a>
              <a href="/planificare" className="mt-1 block text-xs font-bold text-blue-700 underline">Planificarea calendaristică 2026–2027</a>
            </>
          )}
        </div>
      </SettingsGroup>

      {/* Aspect: how the page and the letters look */}
      <SettingsGroup id="aspect" title="Aspect" hint="literele de trasat, mărimea, fundalul" open={isOpen('aspect')} onToggle={toggleGroup}>
        {/* how the letters to trace look (shown, not named) */}
        <div className={traced ? undefined : 'hidden'}>
          <SectionLabel>Cum arată literele de trasat</SectionLabel>
          <TraceStylePicker />
        </div>
        <div>
          <SectionLabel>Mărimea literelor</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {([['small', 'Mici', 14], ['medium', 'Medii', 18], ['large', 'Mari', 22]] as const).map(([v, l, px]) => (
              <Choice key={v} active={config.letterSize === v} onClick={() => setLetterSize(v)}>
                <div className="font-bold" style={{ fontSize: px }}>A</div>
                <div className="text-[11px]">{l}</div>
              </Choice>
            ))}
          </div>
        </div>
        <Slider label="Cât de vizibil e modelul" value={config.tracingVisibility} min={1} max={10} onChange={setVisibility} left="abia se vede" right="foarte clar" />
        <div>
          <SectionLabel>Fundal</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {([['guides', 'Liniatură'], ['dictando', 'Dictando'], ['patratele', 'Pătrățele'], ['lines', 'Linii'], ['grid', 'Grilă'], ['blank', 'Alb']] as const).map(([v, l]) => (
              <Choice key={v} active={config.backgroundPattern === v} onClick={() => setBackgroundPattern(v)}><span className="text-xs">{l}</span></Choice>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Culoarea liniilor</SectionLabel>
          <div className="flex gap-3">
            {([['blue', '#29B6E8', 'albastru'], ['gray', '#9CA3AF', 'gri'], ['green', '#10B981', 'verde'], ['orange', '#F97316', 'portocaliu'], ['purple', '#A855F7', 'mov']] as const).map(([c, hex, name]) => (
              <button key={c} type="button" onClick={() => setGuideColor(c)} aria-label={`Linii ${name}`} aria-pressed={config.guideColor === c}
                className={`w-8 h-8 rounded-full border transition-all ${config.guideColor === c ? 'border-slate-900 scale-110' : 'border-slate-300'}`} style={{ backgroundColor: hex }} />
            ))}
          </div>
        </div>
      </SettingsGroup>

      {/* Avansat: rows per page and the switches; closed until asked for (the rows of each item are under the picker) */}
      <SettingsGroup id="avansat" title="Avansat" hint="rânduri, săgeți, antet, stângaci" open={isOpen('avansat')} onToggle={toggleGroup}>
        <Slider label="Rânduri pe pagină" value={config.rowsPerPage} min={3} max={8} onChange={setRowsPerPage} left="3" right="8" />
        <div className="space-y-1 pt-3 border-t border-slate-200">
          {([
            ['Imagini lângă litere', config.showLetterIcons, toggleEmoji],
            ['Săgeți de direcție', config.showDirectionalArrows, toggleArrows],
            ['Puncte de start numerotate', config.showStartDots !== false, toggleStartDots],
            ['Liniatură', config.showGuideLines, toggleGuideLines],
            ['Umple pagina cu repetiții', config.fillPage !== false, toggleFillPage],
            [config.evaluation ? 'Rândul de autoevaluare' : 'Stelele de recompensă', config.showRewardSection, toggleReward],
            ['Fără antet (doar rânduri)', config.fullPageMode, toggleFullPage],
            ['Pentru stângaci', config.leftHandedMode, toggleLeftHanded],
          ] as [string, boolean, () => void][]).map(([label, checked, onChange]) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-slate-300 cursor-pointer" />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </SettingsGroup>
    </div>
  );
}
