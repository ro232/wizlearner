import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { WorksheetConfig, DEFAULT_CONFIG, Tier, ContentCategory, LetterMode, FontStyle, Script, LetterSize, Difficulty, GuideColor, BackgroundPattern, Alphabet } from '@/types';
import { ALPHABETS, normalizeKey } from '@/lib/glyphs/data';
import { cleanWord, itemFitsCategory, sanitizeConfig } from './sanitize-config';

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
  setTraceDensity: (density: 'sparse' | 'normal' | 'dense') => void;
  newMathSet: () => void;
  toggleMathAnswers: () => void;
  setAlphabet: (alphabet: Alphabet) => void;
  setLetterMode: (mode: LetterMode) => void;
  toggleItem: (item: string) => void;
  addItems: (items: string[]) => void;
  removeAllItems: () => void;
  addCustomWord: (word: string) => void;
  removeCustomWord: (word: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setFontStyle: (style: FontStyle) => void;
  setScript: (script: Script) => void;
  setLetterSize: (size: LetterSize) => void;
  setVisibility: (value: number) => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  setGuideColor: (color: GuideColor) => void;
  setRowsPerPage: (rows: number) => void;
  setRepetitionsPerItem: (reps: number) => void;
  toggleGuideLines: () => void;
  toggleArrows: () => void;
  toggleStartDots: () => void;
  toggleEmoji: () => void;
  toggleReward: () => void;
  toggleFullPage: () => void;
  toggleLeftHanded: () => void;
  toggleFillPage: () => void;
  setChildName: (name: string) => void;
  setCustomTitle: (title: string) => void;
  setSchoolName: (name: string) => void;
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

export const useWorksheetStore = create<WorksheetState>()(persist((set) => ({
  config: { ...DEFAULT_CONFIG },
  tier: 'free',
  language: 'en',
  nameSlot: null,

  setCategory: (category) => set((state) => ({
    config: { ...state.config, category, selectedItems: [] }
  })),
  setMathRange: (mathRange) => set((state) => ({ config: { ...state.config, mathRange } })),
  setTraceDensity: (traceDensity) => set((state) => ({ config: { ...state.config, traceDensity } })),
  newMathSet: () => set((state) => ({ config: { ...state.config, mathSeed: (state.config.mathSeed ?? 1) + 1 } })),
  toggleMathAnswers: () => set((state) => ({ config: { ...state.config, mathAnswers: !state.config.mathAnswers } })),
  setAlphabet: (alphabet) => set((state) => {
    // Keep only the letters that exist in the newly chosen alphabet.
    const allowed = new Set(ALPHABETS[alphabet]);
    const selectedItems = state.config.category === 'letters'
      ? state.config.selectedItems.filter((item) => allowed.has(normalizeKey(item)[0].toUpperCase()))
      : state.config.selectedItems;
    return { config: { ...state.config, alphabet, selectedItems } };
  }),
  setLetterMode: (mode) => set((state) => ({
    config: { ...state.config, letterMode: mode, selectedItems: [] }
  })),
  // Only what the category on screen can draw gets on the sheet ("add" is an exercise, not letters).
  toggleItem: (item) => set((state) => {
    const { selectedItems, category } = state.config;
    if (selectedItems.includes(item)) return { config: { ...state.config, selectedItems: selectedItems.filter((i) => i !== item) } };
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
    config: { ...state.config, selectedItems: [] }
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
    return {
      nameSlot: null,
      config: {
        ...c,
        category: 'letters',
        selectedItems: c.category === 'letters' ? c.selectedItems : [],
        customWords: known ? c.customWords : [...c.customWords, clean],
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
        const selectedItems = c.category === 'letters' ? c.selectedItems.map((i) => (i.length === 1 ? `${i.toUpperCase()}${i.toLowerCase()}` : i)) : c.selectedItems;
        return { config: { ...c, script, letterMode: 'paired', selectedItems } };
      }
      return { config: { ...c, script, ...(script === 'print' && c.fontStyle === 'cursive' ? { fontStyle: 'dashed' as const } : {}) } };
    }),
  setLetterSize: (letterSize) => set((state) => ({ config: { ...state.config, letterSize } })),
  setVisibility: (tracingVisibility) => set((state) => ({ config: { ...state.config, tracingVisibility } })),
  setBackgroundPattern: (backgroundPattern) => set((state) => ({ config: { ...state.config, backgroundPattern } })),
  setGuideColor: (guideColor) => set((state) => ({ config: { ...state.config, guideColor } })),
  setRowsPerPage: (rowsPerPage) => set((state) => ({ config: { ...state.config, rowsPerPage } })),
  setRepetitionsPerItem: (repetitionsPerItem) => set((state) => ({ config: { ...state.config, repetitionsPerItem } })),
  toggleGuideLines: () => set((state) => ({ config: { ...state.config, showGuideLines: !state.config.showGuideLines } })),
  toggleArrows: () => set((state) => ({ config: { ...state.config, showDirectionalArrows: !state.config.showDirectionalArrows } })),
  toggleStartDots: () => set((state) => ({ config: { ...state.config, showStartDots: !state.config.showStartDots } })),
  toggleEmoji: () => set((state) => ({ config: { ...state.config, showLetterIcons: !state.config.showLetterIcons } })),
  toggleReward: () => set((state) => ({ config: { ...state.config, showRewardSection: !state.config.showRewardSection } })),
  toggleFullPage: () => set((state) => ({ config: { ...state.config, fullPageMode: !state.config.fullPageMode } })),
  toggleLeftHanded: () => set((state) => ({ config: { ...state.config, leftHandedMode: !state.config.leftHandedMode } })),
  toggleFillPage: () => set((state) => ({ config: { ...state.config, fillPage: state.config.fillPage === false } })),
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
  setTier: (tier) => set({ tier }),
  setLanguage: (language) => set({ language }),
}), {
  name: 'wizlearner-last-sheet',
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
