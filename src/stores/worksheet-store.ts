import { create } from 'zustand';
import { WorksheetConfig, DEFAULT_CONFIG, Tier, ContentCategory, LetterMode, FontStyle, LetterSize, Difficulty, GuideColor, BackgroundPattern, Alphabet } from '@/types';
import { ALPHABETS, lettersOfWord, normalizeKey } from '@/lib/glyphs/data';

interface WorksheetState {
  config: WorksheetConfig;
  tier: Tier;
  language: 'en' | 'ro';

  // Actions
  setCategory: (category: ContentCategory) => void;
  setAlphabet: (alphabet: Alphabet) => void;
  setLetterMode: (mode: LetterMode) => void;
  toggleItem: (item: string) => void;
  addItems: (items: string[]) => void;
  removeAllItems: () => void;
  addCustomWord: (word: string) => void;
  removeCustomWord: (word: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setFontStyle: (style: FontStyle) => void;
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
  setChildName: (name: string) => void;
  setCustomTitle: (title: string) => void;
  setSchoolName: (name: string) => void;
  resetConfig: () => void;
  setTier: (tier: Tier) => void;
  setLanguage: (lang: 'en' | 'ro') => void;
}

export const useWorksheetStore = create<WorksheetState>((set) => ({
  config: { ...DEFAULT_CONFIG },
  tier: 'free',
  language: 'en',

  setCategory: (category) => set((state) => ({
    config: { ...state.config, category, selectedItems: [] }
  })),
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
  toggleItem: (item) => set((state) => ({
    config: {
      ...state.config,
      selectedItems: state.config.selectedItems.includes(item)
        ? state.config.selectedItems.filter((i) => i !== item)
        : [...state.config.selectedItems, item],
    }
  })),
  addItems: (items) => set((state) => ({
    config: {
      ...state.config,
      selectedItems: Array.from(new Set([...state.config.selectedItems, ...items])),
    }
  })),
  removeAllItems: () => set((state) => ({
    config: { ...state.config, selectedItems: [] }
  })),
  addCustomWord: (word) => set((state) => ({
    config: {
      ...state.config,
      customWords: state.config.customWords.includes(word) ? state.config.customWords : [...state.config.customWords, word],
      selectedItems: Array.from(new Set([
        ...state.config.selectedItems,
        ...lettersOfWord(word, state.config.letterMode),
      ])),
    }
  })),
  removeCustomWord: (word) => set((state) => ({
    config: { ...state.config, customWords: state.config.customWords.filter((w) => w !== word) }
  })),
  setDifficulty: (difficulty) => set((state) => {
    const presets: Record<string, Partial<WorksheetConfig>> = {
      beginner: { fontStyle: 'dashed', tracingVisibility: 8, letterSize: 'large', rowsPerPage: 4 },
      intermediate: { fontStyle: 'dotted', tracingVisibility: 5, letterSize: 'medium', rowsPerPage: 6 },
      advanced: { fontStyle: 'outline', tracingVisibility: 3, letterSize: 'small', rowsPerPage: 8 },
    };
    return { config: { ...state.config, difficulty, ...presets[difficulty] } };
  }),
  setFontStyle: (fontStyle) => set((state) => ({ config: { ...state.config, fontStyle } })),
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
  setChildName: (childName) => set((state) => ({ config: { ...state.config, childName } })),
  setCustomTitle: (customTitle) => set((state) => ({ config: { ...state.config, customTitle } })),
  setSchoolName: (schoolName) => set((state) => ({ config: { ...state.config, schoolName } })),
  resetConfig: () => set({ config: { ...DEFAULT_CONFIG } }),
  setTier: (tier) => set({ tier }),
  setLanguage: (language) => set({ language }),
}));
