export const THEME = {
  primary: '#2E5C8A',
  accent: '#E8913A',
  success: '#2D8B5C',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  categories: {
    letters: '#2563EB',
    numbers: '#059669',
    shapes: '#7C3AED',
    math: '#EA580C',
    games: '#DC2626',
    templates: '#0D9488',
    prewrite: '#0891B2',
    wordsearch: '#6366F1',
  },
} as const;

export const EMOJI_MAP: Record<string, string> = {
  A: '🍎', B: '⚽', C: '🐱', D: '🐶', E: '🥚', F: '🐟', G: '🍇', H: '🏠',
  I: '🍦', J: '🧃', K: '🪁', L: '🍋', M: '🌙', N: '🥜', O: '🍊', P: '🖊️',
  Q: '👸', R: '🌈', S: '⭐', T: '🌳', U: '☂️', V: '🎻', W: '🐋', X: '✖️',
  Y: '🧶', Z: '⚡',
};

export const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const PAIRED_LETTERS = UPPERCASE_LETTERS.map((l, i) => `${l}${LOWERCASE_LETTERS[i]}`);
export const NUMBERS = Array.from({ length: 20 }, (_, i) => String(i + 1));
export const SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'oval', 'diamond', 'star', 'heart', 'hexagon', 'pentagon'];

export const FREE_LIMITS = {
  letters: ['A', 'B', 'C', 'D', 'E'],
  numbers: ['1', '2', '3', '4', '5'],
  shapes: ['circle', 'square', 'triangle'],
  maxDownloadsPerDay: 2,
  maxCloudSave: 0,
  templates: 2,
} as const;

export const STARTER_LIMITS = {
  letters: UPPERCASE_LETTERS,
  numbers: NUMBERS,
  shapes: SHAPES,
  maxDownloadsPerDay: Infinity,
  maxCloudSave: 20,
  templates: 10,
} as const;

export const CATEGORY_TABS = [
  { id: 'letters' as const, label: 'Aa Letters', icon: '✏️' },
  { id: 'numbers' as const, label: '123', icon: '🔢' },
  { id: 'shapes' as const, label: 'Shapes', icon: '◆' },
  { id: 'prewrite' as const, label: 'Pre-Write', icon: '〰', locked: true, minTier: 'full' as const },
  { id: 'math' as const, label: 'Math', icon: '🧮', locked: true, minTier: 'full' as const },
  { id: 'games' as const, label: 'Games', icon: '🎮', locked: true, minTier: 'full' as const },
  { id: 'wordsearch' as const, label: 'Word Search', icon: '🔍', locked: true, minTier: 'full' as const },
  { id: 'templates' as const, label: 'Templates', icon: '✨' },
];