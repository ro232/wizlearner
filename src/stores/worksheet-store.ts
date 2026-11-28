import { create } from 'zustand';
import { OPEN_ACCESS } from '@/lib/open-access';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { WorksheetConfig, DEFAULT_CONFIG, Tier, LessonConfig, ContentCategory, LetterMode, FontStyle, Script, LetterSize, Difficulty, GuideColor, BackgroundPattern, Alphabet } from '@/types';
import { ALPHABETS, normalizeKey } from '@/lib/glyphs/data';
import { MAX_WORDS, cleanWord, itemFitsCategory, sanitizeConfig } from './sanitize-config';
import { clampRows, isRowCategory, pruneRowsByItem } from '@/lib/worksheet/item-rows';
import { isGroupItem, itemInMode } from '@/lib/worksheet/letter-groups';
import {
  LESSON_DEFAULT_COUNTS, LESSON_DEFAULT_COUNTS_CURSIVE, LESSON_MAX_WORDS, clampLessonCount, cleanLessonSentence, cleanLessonWord,
  hasLessonLetter, type LessonSection,
} from '@/lib/worksheet/lesson';

interface WorksheetState {
  config: WorksheetConfig;
  tier: Tier;
  language: 'en' | 'ro';
  /**
   * Where the traced name row was when the name field was emptied (select all, type again):
   * the row comes back in the same place with the next name typed. Never stored.
   */
  nameSlot: number | null;

  // Actions
  setCategory: (category: ContentCategory) => void;
  setMathRange: (range: number) => void;
  setMathCarry: (carry: 'without' | 'with' | 'mixed') => void;
  setMathTable: (table: number) => void;
  setMathClock: (step: 'hour' | 'half' | 'quarter' | 'five') => void;
  setTraceDensity: (density: 'sparse' | 'normal' | 'dense') => void;
  newMathSet: () => void;
  /** „Altă variantă”: the next variant of the games on the sheet (worksheet/variant.ts); `first` goes back to the first one. */
  newVariant: (first?: boolean) => void;
  toggleMathAnswers: () => void;
  toggleEvaluation: () => void;
  /** An evaluation with or without its answers page (the class set is printed without it). */
  toggleEvaluationAnswers: () => void;
  setAlphabet: (alphabet: Alphabet) => void;
  setLetterMode: (mode: LetterMode) => void;
  toggleItem: (item: string) => void;
  addItems: (items: string[]) => void;
  removeAllItems: () => void;
  addCustomWord: (word: string) => void;
  /** Several words at once (a ready-made list), in order, skipping the ones already there, up to MAX_WORDS. */
  addCustomWords: (words: string[]) => void;
  removeCustomWord: (word: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setFontStyle: (style: FontStyle) => void;
  setScript: (script: Script) => void;
  setLetterSize: (size: LetterSize) => void;
  setVisibility: (value: number) => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  setGuideColor: (color: GuideColor) => void;
  setRowsPerPage: (rows: number) => void;
  /** „Toate la fel”: the same number of rows for every item (the items' own counts are dropped). */
  setRepetitionsPerItem: (reps: number) => void;
  /** Rows for one chosen item (1–10); the others keep theirs. */
  setItemRows: (item: string, rows: number) => void;
  toggleGuideLines: () => void;
  toggleArrows: () => void;
  toggleStartDots: () => void;
  toggleEmoji: () => void;
  toggleReward: () => void;
  toggleFullPage: () => void;
  toggleLeftHanded: () => void;
  toggleFillPage: () => void;
  /** „Rând liber după cuvânt”. */
  toggleWordCopyRow: () => void;
  /** „Umple rândul”. */
  toggleWordFillRow: () => void;
  /** „Lecția literei” on (the first chosen letter stays, the others go) or off (the sheet of letters as before). */
  setLessonMode: (on: boolean) => void;
  /** The letter or group of the lesson, with its words (unset: chosen by the lesson panel when its lists load). */
  setLessonItem: (item: string, words?: string[]) => void;
  setLessonCount: (section: LessonSection, n: number) => void;
  setLessonSentence: (text: string) => void;
  setLessonWords: (words: string[]) => void;
  /** A word of the lesson on or off (added at the end, at most LESSON_MAX_WORDS). */
  toggleLessonWord: (word: string) => void;
  setChildName: (name: string) => void;
  setCustomTitle: (title: string) => void;
  setSchoolName: (name: string) => void;
  setCurriculumLevel: (level: WorksheetConfig['curriculumLevel'] | null) => void;
  resetConfig: () => void;
  setTier: (tier: Tier) => void;
  setLanguage: (lang: 'en' | 'ro') => void;
}

/**
 * localStorage that never throws (private windows, blocked site data, server rendering):
 * remembering the last sheet is a convenience, never a requirement.
 */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

const STORAGE_KEY = 'wizlearner-last-sheet';

/**
 * Is there a sheet kept in this browser (even an emptied one)? The generator shows its example
 * sheet only to someone who has none: what a person made, or cleared on purpose, is never replaced.
 */
export function hasStoredSheet(): boolean {
  return safeStorage.getItem(STORAGE_KEY) !== null;
}

export const useWorksheetStore = create<WorksheetState>()(persist((set) => ({
  config: { ...DEFAULT_CONFIG },
  tier: OPEN_ACCESS ? 'full' : 'free',
  language: 'en',
  nameSlot: null,

  setCategory: (category) => set((state) => {
    // an evaluation is a way of printing math or game items: another category starts as an ordinary sheet
    const config = pruneRowsByItem({ ...state.config, category, selectedItems: [] });
    delete config.evaluation;
    delete config.evaluationAnswers;
    delete config.lesson;
    return { config };
  }),
  setMathRange: (mathRange) => set((state) => ({ config: { ...state.config, mathRange } })),
  setMathCarry: (mathCarry) => set((state) => ({ config: { ...state.config, mathCarry } })),
  setMathTable: (mathTable) => set((state) => ({ config: { ...state.config, mathTable } })),
  setMathClock: (mathClock) => set((state) => ({ config: { ...state.config, mathClock } })),
  setTraceDensity: (traceDensity) => set((state) => ({ config: { ...state.config, traceDensity } })),
  newMathSet: () => set((state) => ({ config: { ...state.config, mathSeed: (state.config.mathSeed ?? 1) + 1 } })),
  newVariant: (first) => set((state) => {
    const config = { ...state.config };
    const next = first ? 1 : (typeof config.variantSeed === 'number' && config.variantSeed >= 1 && config.variantSeed < 999_999 ? Math.round(config.variantSeed) : 1) + 1;
    if (next > 1) config.variantSeed = next;
    else delete config.variantSeed;
    return { config };
  }),
  toggleMathAnswers: () => set((state) => ({ config: { ...state.config, mathAnswers: !state.config.mathAnswers } })),
  toggleEvaluation: () => set((state) => ({ config: { ...state.config, evaluation: !state.config.evaluation } })),
  toggleEvaluationAnswers: () =>
    set((state) => {
      const { evaluationAnswers, ...config } = state.config;
      return { config: evaluationAnswers === false ? config : { ...config, evaluationAnswers: false } };
    }),
  setAlphabet: (alphabet) => set((state) => {
    // Keep only the letters that exist in the newly chosen alphabet.
    const allowed = new Set(ALPHABETS[alphabet]);
    // the groups of letters (ce, chi …) are Romanian only
    const selectedItems = state.config.category === 'letters'
      ? state.config.selectedItems.filter((item) => allowed.has(normalizeKey(item)[0].toUpperCase()) && (alphabet === 'ro' || !isGroupItem(item)))
      : state.config.selectedItems;
    const config = pruneRowsByItem({ ...state.config, alphabet, selectedItems });
    // „Lecția literei” is a Romanian lesson (syllables, words, sentences)
    if (alphabet === 'en') delete config.lesson;
    return { config };
  }),
  setLetterMode: (mode) => set((state) => {
    // a lesson keeps its letter, written in the new mode („M” → „m”, „CHE” → „che”)
    if (state.config.lesson && state.config.category === 'letters') {
      return { config: { ...state.config, letterMode: mode, selectedItems: state.config.selectedItems.slice(0, 1).map((i) => itemInMode(i, mode)) } };
    }
    return { config: pruneRowsByItem({ ...state.config, letterMode: mode, selectedItems: [] }) };
  }),
  // Only what the category on screen can draw gets on the sheet ("add" is an exercise, not letters).
  toggleItem: (item) => set((state) => {
    const { selectedItems, category } = state.config;
    // taken off the sheet, the item loses its own count of rows: put back, it starts from the count for all
    if (selectedItems.includes(item)) return { config: pruneRowsByItem({ ...state.config, selectedItems: selectedItems.filter((i) => i !== item) }) };
    if (!itemFitsCategory(item, category)) return state;
    return { config: { ...state.config, selectedItems: [...selectedItems, item] } };
  }),
  addItems: (items) => set((state) => ({
    config: {
      ...state.config,
      selectedItems: Array.from(new Set([...state.config.selectedItems, ...items.filter((i) => itemFitsCategory(i, state.config.category))])),
    }
  })),
  removeAllItems: () => set((state) => ({
    config: pruneRowsByItem({ ...state.config, selectedItems: [] })
  })),
  // A word or name becomes its own tracing row (the whole word), not a list of letters.
  // Words are traced on letter sheets: coming from Cifre, Forme, Matematică … the sheet becomes a
  // letter sheet and what was chosen there stays behind (it used to be traced as "add", "circle").
  addCustomWord: (word) => set((state) => {
    const clean = cleanWord(word);
    const c = state.config;
    if (!clean) return state;
    const known = c.customWords.some((w) => cleanWord(w) === clean);
    if (known && c.category === 'letters') return state;
    // a sheet holds at most MAX_WORDS words (as sanitizeConfig keeps them)
    if (!known && c.customWords.length >= MAX_WORDS) return state;
    return {
      nameSlot: null,
      config: {
        ...c,
        category: 'letters',
        selectedItems: c.category === 'letters' ? c.selectedItems : [],
        customWords: known ? c.customWords : [...c.customWords, clean],
        ...(c.category === 'letters' && c.rowsByItem ? { rowsByItem: c.rowsByItem } : {}),
      },
    };
  }),
  addCustomWords: (words) => set((state) => {
    const c = state.config;
    const have = new Set(c.customWords.map(cleanWord));
    const added: string[] = [];
    for (const word of words) {
      const clean = cleanWord(word);
      if (!clean || have.has(clean) || clean.length > 80) continue;
      if (c.customWords.length + added.length >= MAX_WORDS) break;
      have.add(clean);
      added.push(clean);
    }
    if (!added.length && c.category === 'letters') return state;
    return {
      nameSlot: null,
      config: {
        ...c,
        category: 'letters',
        selectedItems: c.category === 'letters' ? c.selectedItems : [],
        customWords: [...c.customWords, ...added],
        ...(c.category === 'letters' && c.rowsByItem ? { rowsByItem: c.rowsByItem } : {}),
      },
    };
  }),
  removeCustomWord: (word) => set((state) => ({
    nameSlot: null,
    config: { ...state.config, customWords: state.config.customWords.filter((w) => w !== word) }
  })),
  setDifficulty: (difficulty) => set((state) => {
    const presets: Record<string, Partial<WorksheetConfig>> = {
      beginner: { fontStyle: 'dashed', tracingVisibility: 8, letterSize: 'large', rowsPerPage: 4 },
      intermediate: { fontStyle: 'dotted', tracingVisibility: 5, letterSize: 'medium', rowsPerPage: 6 },
      advanced: { fontStyle: 'dotted', tracingVisibility: 3, letterSize: 'small', rowsPerPage: 8 },
    };
    return { config: { ...state.config, difficulty, ...presets[difficulty] } };
  }),
  setFontStyle: (fontStyle) => set((state) => ({ config: { ...state.config, fontStyle } })),
  // The old "cursive" trace style meant handwriting too: going back to print resets it.
  setScript: (script) =>
    set((state) => {
      const c = state.config;
      // Handwriting is taught with small letters joined: all-capitals would come out as separate capitals.
      if (script === 'cursive' && c.letterMode === 'uppercase') {
        const pair = (i: string) => (i.length === 1 || isGroupItem(i) ? itemInMode(i, 'paired') : i);
        const selectedItems = c.category === 'letters' ? c.selectedItems.map(pair) : c.selectedItems;
        // the letters' own counts follow them („A” becomes „Aa”)
        const rowsByItem = c.rowsByItem && c.category === 'letters' ? Object.fromEntries(Object.entries(c.rowsByItem).map(([i, n]) => [pair(i), n])) : c.rowsByItem;
        return { config: pruneRowsByItem({ ...c, script, letterMode: 'paired' as const, selectedItems, ...(rowsByItem ? { rowsByItem } : {}) }) };
      }
      return { config: { ...c, script, ...(script === 'print' && c.fontStyle === 'cursive' ? { fontStyle: 'dashed' as const } : {}) } };
    }),
  setLetterSize: (letterSize) => set((state) => ({ config: { ...state.config, letterSize } })),
  setVisibility: (tracingVisibility) => set((state) => ({ config: { ...state.config, tracingVisibility } })),
  setBackgroundPattern: (backgroundPattern) => set((state) => ({ config: { ...state.config, backgroundPattern } })),
  setGuideColor: (guideColor) => set((state) => ({ config: { ...state.config, guideColor } })),
  setRowsPerPage: (rowsPerPage) => set((state) => ({ config: { ...state.config, rowsPerPage } })),
  setRepetitionsPerItem: (reps) => set((state) => {
    const { rowsByItem: _own, ...config } = state.config;
    void _own;
    return { config: { ...config, repetitionsPerItem: clampRows(reps) } };
  }),
  setItemRows: (item, rows) => set((state) => {
    const c = state.config;
    if (!isRowCategory(c.category) || !c.selectedItems.includes(item)) return state;
    return { config: { ...c, rowsByItem: { ...c.rowsByItem, [item]: clampRows(rows) } } };
  }),
  toggleGuideLines: () => set((state) => ({ config: { ...state.config, showGuideLines: !state.config.showGuideLines } })),
  toggleArrows: () => set((state) => ({ config: { ...state.config, showDirectionalArrows: !state.config.showDirectionalArrows } })),
  toggleStartDots: () => set((state) => ({ config: { ...state.config, showStartDots: !state.config.showStartDots } })),
  toggleEmoji: () => set((state) => ({ config: { ...state.config, showLetterIcons: !state.config.showLetterIcons } })),
  toggleReward: () => set((state) => ({ config: { ...state.config, showRewardSection: !state.config.showRewardSection } })),
  toggleFullPage: () => set((state) => ({ config: { ...state.config, fullPageMode: !state.config.fullPageMode } })),
  toggleLeftHanded: () => set((state) => ({ config: { ...state.config, leftHandedMode: !state.config.leftHandedMode } })),
  toggleFillPage: () => set((state) => ({ config: { ...state.config, fillPage: state.config.fillPage === false } })),
  // off = the field is removed, so a sheet without the option stays exactly as it was saved
  toggleWordCopyRow: () => set((state) => {
    const { wordCopyRow, ...config } = state.config;
    return { config: wordCopyRow ? config : { ...config, wordCopyRow: true } };
  }),
  toggleWordFillRow: () => set((state) => {
    const { wordFillRow, ...config } = state.config;
    return { config: wordFillRow ? config : { ...config, wordFillRow: true } };
  }),
  setLessonMode: (on) => set((state) => {
    const c = state.config;
    if (!on) {
      const { lesson: _off, ...config } = c;
      void _off;
      return { config };
    }
    if (c.lesson) return state;
    const counts = { ...(c.script === 'cursive' || c.fontStyle === 'cursive' ? LESSON_DEFAULT_COUNTS_CURSIVE : LESSON_DEFAULT_COUNTS) };
    const { rowsByItem: _own, ...rest } = c;
    void _own;
    // the first chosen letter (or group) becomes the lesson's; its words come with the lesson panel
    return { config: { ...rest, category: 'letters', selectedItems: c.category === 'letters' ? c.selectedItems.slice(0, 1) : [], lesson: { counts } } };
  }),
  setLessonItem: (item, words) => set((state) => {
    const c = state.config;
    if (!c.lesson || c.category !== 'letters' || !itemFitsCategory(item, 'letters')) return state;
    const lesson: LessonConfig = { counts: c.lesson.counts };
    const clean = words?.map(cleanLessonWord).filter(Boolean);
    if (clean) lesson.words = Array.from(new Set(clean)).slice(0, LESSON_MAX_WORDS);
    // the teacher's sentence stays while it has the new letter too
    if (c.lesson.sentence && hasLessonLetter(c.lesson.sentence, item)) lesson.sentence = c.lesson.sentence;
    return { config: { ...c, selectedItems: [item], lesson } };
  }),
  setLessonCount: (section, n) => set((state) => {
    const c = state.config;
    if (!c.lesson) return state;
    return { config: { ...c, lesson: { ...c.lesson, counts: { ...c.lesson.counts, [section]: clampLessonCount(n) } } } };
  }),
  setLessonSentence: (text) => set((state) => {
    const c = state.config;
    if (!c.lesson) return state;
    // typed as it comes (spaces kept while typing); the sheet and every copy that leaves the page are cleaned
    const sentence = text.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 80);
    const { sentence: _old, ...lesson } = c.lesson;
    void _old;
    return { config: { ...c, lesson: cleanLessonSentence(sentence) ? { ...lesson, sentence } : lesson } };
  }),
  setLessonWords: (words) => set((state) => {
    const c = state.config;
    if (!c.lesson) return state;
    const clean = Array.from(new Set(words.map(cleanLessonWord).filter(Boolean))).slice(0, LESSON_MAX_WORDS);
    return { config: { ...c, lesson: { ...c.lesson, words: clean } } };
  }),
  toggleLessonWord: (word) => set((state) => {
    const c = state.config;
    const clean = cleanLessonWord(word);
    if (!c.lesson || !clean) return state;
    const have = c.lesson.words ?? [];
    const words = have.includes(clean) ? have.filter((w) => w !== clean) : have.length >= LESSON_MAX_WORDS ? have : [...have, clean];
    return { config: { ...c, lesson: { ...c.lesson, words } } };
  }),
  setCurriculumLevel: (level) =>
    set((state) => {
      const config = { ...state.config };
      if (level) config.curriculumLevel = level;
      else delete config.curriculumLevel;
      return { config };
    }),
  // The name in the header. When it is also a traced row („Trasează-l”), the row follows every
  // edit: correcting "Stefanut" to "Ștefănuț" replaces the row instead of leaving the old one behind.
  setChildName: (childName) => set((state) => {
    const c = state.config;
    const prev = cleanWord(c.childName);
    const next = cleanWord(childName);
    let customWords = c.customWords;
    let nameSlot = state.nameSlot;
    const at = prev ? customWords.findIndex((w) => cleanWord(w) === prev) : -1;
    if (at >= 0 && next !== prev) {
      const others = customWords.filter((w, i) => i !== at && cleanWord(w) !== next);
      const slot = Math.min(at, others.length);
      customWords = next ? [...others.slice(0, slot), next, ...others.slice(slot)] : others;
      nameSlot = next ? null : at;
    } else if (at < 0 && !prev && next && nameSlot !== null) {
      if (!customWords.some((w) => cleanWord(w) === next)) {
        const slot = Math.min(nameSlot, customWords.length);
        customWords = [...customWords.slice(0, slot), next, ...customWords.slice(slot)];
      }
      nameSlot = null;
    }
    // one space between the parts of a name, as the traced row has it ("Ana  Maria" would not match its row)
    return { nameSlot, config: { ...c, childName: childName.replace(/\s+/g, ' '), customWords } };
  }),
  setCustomTitle: (customTitle) => set((state) => ({ config: { ...state.config, customTitle } })),
  setSchoolName: (schoolName) => set((state) => ({ config: { ...state.config, schoolName } })),
  resetConfig: () => set({ nameSlot: null, config: { ...DEFAULT_CONFIG } }),
  setTier: (tier) => set({ tier: OPEN_ACCESS ? 'full' : tier }),
  setLanguage: (language) => set({ language }),
}), {
  name: STORAGE_KEY,
  version: 2,
  storage: createJSONStorage(() => safeStorage),
  // Only the sheet is remembered, in this browser. The plan comes from the account, never from storage.
  partialize: (state) => ({ config: state.config }),
  // Whatever an older version (or anything else) left in storage is read through sanitizeConfig:
  // unknown values fall back to the defaults instead of breaking the page at every visit.
  migrate: (persisted) => ({ config: sanitizeConfig((persisted as { config?: unknown } | null | undefined)?.config) }),
  merge: (persisted, current) => {
    const stored = persisted && typeof persisted === 'object' ? (persisted as { config?: unknown }).config : undefined;
    return { ...current, config: stored === undefined ? current.config : sanitizeConfig(stored) };
  },
  // Rehydrated once after the first render (see StoreHydration), so server and client HTML match.
  skipHydration: true,
}));

/**
 * Other parts of the site hand a whole sheet to the generator with `setState({ config })`:
 * a ready-made start, a free sheet page, a project or a history row opened from the account.
 * Those come from outside this file — some from the server, saved long ago — so every one is
 * read through sanitizeConfig here, in one place, before it reaches the pages that draw it.
 */
const rawSetState = useWorksheetStore.setState;
useWorksheetStore.setState = ((partial: Parameters<typeof rawSetState>[0], replace?: boolean) => {
  const guarded = (state: WorksheetState) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    if (!next || typeof next !== 'object' || !('config' in next) || next.config === state.config) return next;
    return { ...next, nameSlot: null, config: sanitizeConfig(next.config) };
  };
  return (rawSetState as (p: unknown, r?: boolean) => void)(guarded, replace);
}) as typeof rawSetState;
